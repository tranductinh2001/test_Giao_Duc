// Stage 2: Targeted Chunked AI Evaluator
// Evaluates lesson plan by isolated sections with user-configured criteria and prompts
// Supports both CV 5512 (THCS/THPT) and CV 2345 (Tiểu học)

import { BeekOneClient } from './client';
import { Review, ReviewSeverity, ReviewType } from '@/types/review';
import { DocumentIR } from '@/types/document';
import {
  DetectedSection,
  EvaluationPolicyConfig,
  SectionCriteriaConfig,
} from '@/types/section-config';
import { buildSectionEvaluationPrompt } from '@/lib/pdf-parser/section-detector';
import { findActivityProcessAnchor, findMaterialAnchor, findObjectiveAnchor } from '@/lib/rules/evaluator';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logger';

const TARGETED_SYSTEM_PROMPT = `Bạn là Chuyên gia Thẩm định Sư phạm Cao cấp của Bộ GD&ĐT Việt Nam, am hiểu chuyên sâu Công văn 5512/BGDĐT, Công văn 2345/BGDĐT và Chương trình GDPT 2018.
Nhiệm vụ của bạn là thẩm định CHUYÊN SÂU TỪNG PHẦN CỤ THỂ của giáo án theo bộ tiêu chí và chính sách riêng biệt được giao.
Nguyên tắc:
1. Chỉ đánh giá nội dung của phần được cung cấp, bám sát bộ tiêu chí yêu cầu.
2. Trả về định dạng JSON thuần túy, tuyệt đối không bao quanh bởi văn bản thừa.
3. Sử dụng ĐÚNG mã đoạn (targetId) đã có trong danh sách văn bản của phần này.
4. Trích dẫn đúng nguyên văn câu/đoạn đang có lỗi.
5. Chỉ ra lỗi sư phạm cụ thể và luôn cung cấp đoạn viết lại mẫu hoàn chỉnh.
6. Sử dụng tiếng Việt chuẩn mực, đầy đủ dấu thanh tiếng Việt (sắc, huyền, hỏi, ngã, nặng) và dấu ngữ điệu câu (chấm, phẩy, hỏi, cảm thán); góp ý cụ thể về phát âm và ngữ điệu giảng dạy.`;

export interface SectionEvaluationResult {
  sectionKey: string;
  sectionTitle: string;
  isDetected: boolean;
  score: number;
  maxScore: number;
  grade: string;
  summary: string;
  reviews: Review[];
}

export interface TargetedEvaluationResponse {
  reviews: Review[];
  totalScore: number;
  maxTotalScore: number;
  sectionResults: SectionEvaluationResult[];
  errors: string[];
}

export async function evaluateSectionsWithPolicy(
  document: DocumentIR,
  detectedSections: DetectedSection[],
  policy: EvaluationPolicyConfig,
  client: BeekOneClient
): Promise<TargetedEvaluationResponse> {
  const allReviews: Review[] = [];
  const sectionResults: SectionEvaluationResult[] = [];
  const errors: string[] = [];

  let totalScore = 0;
  let maxTotalScore = 0;

  // Filter only enabled sections
  const activeConfigs = policy.sections.filter((s) => s.enabled);

  // Process all active sections concurrently with timeout protection
  const evaluationPromises = activeConfigs.map(async (config) => {
    const detected = detectedSections.find((d) => d.key === config.key);

    // Case 1: Section is missing from document
    if (!detected || !detected.isDetected || detected.paragraphs.length === 0) {
      logger.warn(`Section missing in document: ${config.title}`);

      const sectionResult: SectionEvaluationResult = {
        sectionKey: String(config.key),
        sectionTitle: config.title,
        isDetected: false,
        score: 0,
        maxScore: config.weight,
        grade: 'CHƯA ĐẠT',
        summary: `Chưa tìm thấy phần "${config.title}" trong kế hoạch bài dạy.`,
        reviews: [],
      };

      const sectionReviews: Review[] = [];
      if (policy.enableMissingSectionWarning) {
        // Crucial: Objectives target objective anchor, Materials target material anchor (never p_0001 / lesson title!),
        // and Activity sections target the activity process anchor (Page 2+ or last page)!
        let targetAnchorId: string;
        if (config.key === 'muc_tieu') {
          targetAnchorId = findObjectiveAnchor(document);
        } else if (config.key === 'thiet_bi') {
          targetAnchorId = findMaterialAnchor(document);
        } else {
          targetAnchorId = findActivityProcessAnchor(document);
        }

        const anchorPara = document.paragraphs.find((p) => p.id === targetAnchorId) || document.paragraphs[0];
        const dispatchLabel = policy.dispatchType === 'CV_2345' ? 'CV 2345' : 'CV 5512';

        const missingReview: Review = {
          reviewId: `rev_missing_${String(config.key)}_${uuidv4().substring(0, 6)}`,
          ruleId: `RULE_MISSING_${String(config.key).toUpperCase()}`,
          targetId: targetAnchorId,
          targetType: 'paragraph',
          severity: 'WARNING',
          type: 'MISSING_REQUIREMENT',
          message: `[THIẾU PHẦN: ${config.shortLabel}] Kế hoạch bài dạy chưa có mục "${config.title}"`,
          quote: anchorPara ? anchorPara.text.substring(0, 150) + '...' : '',
          errorDetail: `Theo cấu trúc chuẩn ${dispatchLabel}, kế hoạch bài dạy cần có mục "${config.title}". Việc thiếu hoàn toàn phần này khiến bài soạn chưa trọn vẹn tiến trình sư phạm.`,
          suggestion: `Bổ sung mục "${config.title}" vào kế hoạch bài dạy với các tiêu chí: ${config.criteriaChecklist.slice(0, 2).join('; ')}.`,
          suggestionExample: `Soạn bổ sung phần "${config.title}" đúng vị trí trong tiến trình dạy học.`,
          confidence: 0.95,
          createdAt: new Date().toISOString(),
        };

        sectionResult.reviews.push(missingReview);
        sectionReviews.push(missingReview);
      }

      return {
        sectionResult,
        reviews: sectionReviews,
        score: 0,
        error: null,
      };
    }

    // Case 2: Section is detected -> Send targeted prompt to AI API with 25s timeout
    logger.info(`Evaluating section "${config.title}" with ${detected.paragraphs.length} paragraphs`);

    try {
      const prompt = buildSectionEvaluationPrompt(detected, config, policy.dispatchType);

      // Wrap in 25-second timeout
      const aiResponsePromise = client.chat(prompt, TARGETED_SYSTEM_PROMPT, {
        temperature: 0.2,
        maxTokens: 4096,
      });

      const timeoutPromise = new Promise<{ success: false; error: { type: 'TIMEOUT'; message: string; retryable: boolean } }>((resolve) =>
        setTimeout(
          () => resolve({ success: false, error: { type: 'TIMEOUT', message: 'Targeted section timeout after 25s', retryable: false } }),
          25000
        )
      );

      const aiResponse = await Promise.race([aiResponsePromise, timeoutPromise]);

      if (!aiResponse.success || !('data' in aiResponse) || !aiResponse.data) {
        throw new Error(aiResponse.error?.message || 'AI API returned empty response');
      }

      const parsedData = parseSectionJsonResponse(aiResponse.data);

      if (!parsedData) {
        throw new Error('Could not parse JSON response from AI');
      }

      const validParagraphIds = new Set(detected.paragraphs.map((p) => p.id));
      const fallbackTargetId =
        detected.headingParagraphId ||
        detected.paragraphs[0]?.id ||
        (config.key === 'thiet_bi'
          ? findMaterialAnchor(document)
          : config.key === 'muc_tieu'
          ? findObjectiveAnchor(document)
          : findActivityProcessAnchor(document));

      const sectionReviews: Review[] = (parsedData.reviews || []).map((r, idx) => {
        let finalTargetId = r.targetId;
        if (!validParagraphIds.has(finalTargetId)) {
          const matchedByQuote = detected.paragraphs.find(
            (p) => r.quote && p.text.toLowerCase().includes(r.quote.trim().toLowerCase().substring(0, 25))
          );
          finalTargetId = matchedByQuote ? matchedByQuote.id : fallbackTargetId;
        }

        return {
          reviewId: `rev_${String(config.key)}_${String(idx + 1).padStart(2, '0')}_${uuidv4().substring(0, 4)}`,
          ruleId: `RULE_${String(config.key).toUpperCase()}`,
          targetId: finalTargetId,
          targetType: 'paragraph',
          severity: normalizeReviewSeverity(r.severity),
          type: normalizeReviewType(r.type),
          message: r.message || `[NHẬN XÉT: ${config.shortLabel}] Vấn đề sư phạm cần cải thiện`,
          quote: r.quote || '',
          errorDetail: r.errorDetail || '',
          suggestion: r.suggestion || '',
          suggestionExample: r.suggestionExample || '',
          confidence: 0.92,
          createdAt: new Date().toISOString(),
        };
      });

      const sectionScore = typeof parsedData.score === 'number' ? parsedData.score : Math.round(config.weight * 0.85);

      const sectionResult: SectionEvaluationResult = {
        sectionKey: String(config.key),
        sectionTitle: config.title,
        isDetected: true,
        score: sectionScore,
        maxScore: config.weight,
        grade: parsedData.grade || (sectionReviews.length === 0 ? 'ĐẠT' : 'CHƯA ĐẠT'),
        summary: parsedData.summary || `Đã thẩm định phần ${config.shortLabel} (${sectionReviews.length} góp ý).`,
        reviews: sectionReviews,
      };

      return {
        sectionResult,
        reviews: sectionReviews,
        score: sectionScore,
        error: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Evaluation error';
      logger.warn(`AI targeted evaluation fallback for ${config.title}: ${msg}`);

      const fallbackScore = Math.round(config.weight * 0.85);
      const sectionResult: SectionEvaluationResult = {
        sectionKey: String(config.key),
        sectionTitle: config.title,
        isDetected: true,
        score: fallbackScore,
        maxScore: config.weight,
        grade: 'ĐẠT',
        summary: `Phần ${config.shortLabel} đã có trong giáo án (${detected.paragraphs.length} đoạn).`,
        reviews: [],
      };

      return {
        sectionResult,
        reviews: [],
        score: fallbackScore,
        error: `${config.shortLabel}: ${msg}`,
      };
    }
  });

  const results = await Promise.all(evaluationPromises);

  for (const item of results) {
    sectionResults.push(item.sectionResult);
    allReviews.push(...item.reviews);
    totalScore += item.score;
    maxTotalScore += item.sectionResult.maxScore;
    if (item.error) {
      errors.push(item.error);
    }
  }

  return {
    reviews: allReviews,
    totalScore,
    maxTotalScore,
    sectionResults,
    errors,
  };
}

interface ParsedSectionOutput {
  sectionKey?: string;
  sectionTitle?: string;
  score?: number;
  maxScore?: number;
  grade?: string;
  summary?: string;
  reviews?: Array<{
    targetId: string;
    severity?: string;
    type?: string;
    message: string;
    quote?: string;
    errorDetail?: string;
    suggestion?: string;
    suggestionExample?: string;
  }>;
}

function parseSectionJsonResponse(rawText: string): ParsedSectionOutput | null {
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/i, '').replace(/\s*```$/, '');
    }

    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(clean);
  } catch (err) {
    logger.warn('Failed to parse section JSON from AI response', err);
    return null;
  }
}

function normalizeReviewSeverity(sev?: string): ReviewSeverity {
  const upper = (sev || '').toUpperCase();
  if (upper === 'ERROR' || upper === 'CRITICAL') return 'ERROR';
  if (upper === 'WARNING') return 'WARNING';
  return 'INFO';
}

function normalizeReviewType(type?: string): ReviewType {
  const upper = (type || '').toUpperCase();
  if (upper === 'MISSING_REQUIREMENT') return 'MISSING_REQUIREMENT';
  if (upper === 'UNCLEAR_INSTRUCTION') return 'UNCLEAR_INSTRUCTION';
  if (upper === 'INCONSISTENT') return 'INCONSISTENT';
  return 'SUGGESTION';
}
