// POST /api/analyze - Multi-Stage Pedagogical Evaluation
// Stage 1: Semantic Classification & Section Detection
// Stage 2: Dual Dispatch (CV 5512 & CV 2345) 100-Point Rubric & Targeted Section Evaluation
// Stage 3: Standard Rules & Accurate Multi-Page Coordinate Mapping

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { DocumentIR, Paragraph, Activity } from '@/types/document';
import { Review, RubricEvaluation } from '@/types/review';
import { Annotation } from '@/types/annotation';
import { Rule } from '@/types/rule';
import { SemanticLabel } from '@/types/ai';
import { getBeekOneClient } from '@/lib/ai/client';
import { classifyParagraphs, classifyParagraphsHeuristic } from '@/lib/ai/classifier';
import { generateReview } from '@/lib/ai/reviewer';
import { resolveTarget } from '@/lib/coordinate/mapper';
import { getEnabledRules } from '@/lib/rules/registry';
import { evaluateAllRules, findActivityProcessAnchor, findLastActivityAnchor, findMaterialAnchor, findObjectiveAnchor } from '@/lib/rules/evaluator';
import {
  EvaluationPolicyConfig,
  DEFAULT_EVALUATION_POLICY,
} from '@/types/section-config';
import { detectLessonPlanSections } from '@/lib/pdf-parser/section-detector';
import {
  evaluateSectionsWithPolicy,
  SectionEvaluationResult,
} from '@/lib/ai/targeted-evaluator';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập để thực hiện thẩm định giáo án' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { document, options, policyConfig } = body as {
      document: DocumentIR;
      options?: {
        classify?: boolean;
        review?: boolean;
        rules?: Rule[];
      };
      policyConfig?: EvaluationPolicyConfig;
    };

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document is required' },
        { status: 400 }
      );
    }

    const {
      classify = true,
      review = true,
      rules = getEnabledRules(),
    } = options || {};

    const effectivePolicy: EvaluationPolicyConfig = policyConfig || DEFAULT_EVALUATION_POLICY;
    const errors: string[] = [];

    logger.info('Starting analysis with targeted policy', {
      documentId: document.documentId,
      policyId: effectivePolicy.policyId,
      dispatchType: effectivePolicy.dispatchType,
    });

    // Step 1: Semantic Classification
    let semanticLabels: SemanticLabel[] = [];
    if (classify) {
      logger.info('Classifying paragraphs');
      const paragraphInputs = document.paragraphs.map((p) => ({
        id: p.id,
        text: p.text,
        page: p.page,
        type: p.type,
      }));

      try {
        const client = getBeekOneClient();
        semanticLabels = await classifyParagraphs(client, paragraphInputs);
        logger.info(`Classified ${semanticLabels.length} paragraphs via AI`);
      } catch (error) {
        logger.warn('AI classification unavailable or failed, using heuristic classifier', error);
        errors.push(`AI Classification: ${(error as Error).message}`);
        // Smart Heuristic Fallback
        semanticLabels = classifyParagraphsHeuristic(paragraphInputs);
        logger.info(`Classified ${semanticLabels.length} paragraphs via heuristic rules`);
      }
    }

    // Step 2: Stage 1 - Holistic Multi-Page Section Detection & Segmentation
    logger.info('Stage 1: Detecting lesson plan sections based on policy');
    const detectedSections = detectLessonPlanSections(document, effectivePolicy.sections);
    const detectedCount = detectedSections.filter((s) => s.isDetected).length;
    logger.info(`Detected ${detectedCount}/${detectedSections.length} sections in lesson plan`);

    // Step 3: Comprehensive 100-Point Rubric & Targeted Section Evaluation
    let reviews: Review[] = [];
    let sectionResults: SectionEvaluationResult[] = [];
    let rubricResult: any = null;

    if (review) {
      logger.info('Stage 2: Comprehensive Rubric Evaluation & Section Assessment');
      const client = getBeekOneClient();

      // Part A: Global 100-Point Rubric Evaluation with Dispatch Support
      try {
        const reviewContext = {
          document,
          paragraphs: document.paragraphs,
          tables: document.tables || [],
          activities: document.activities || [],
          semanticLabels,
        };

        const globalReviewRes = await generateReview(
          client,
          reviewContext,
          rules,
          undefined,
          effectivePolicy.dispatchType
        );

        rubricResult = {
          totalScore: globalReviewRes.totalScore,
          maxTotalScore: globalReviewRes.maxTotalScore || 100,
          grade: globalReviewRes.grade,
          categoryScores: globalReviewRes.categoryScores,
          strengths: globalReviewRes.strengths,
          weaknesses: globalReviewRes.weaknesses,
          suggestions: globalReviewRes.suggestions,
        };

        if (globalReviewRes.reviews && globalReviewRes.reviews.length > 0) {
          reviews.push(...globalReviewRes.reviews);
        }
        logger.info(`Global rubric evaluated: ${rubricResult.totalScore}/100, Grade: ${rubricResult.grade}`);
      } catch (err) {
        logger.warn('Global rubric evaluation exception, using fallback', err);
        errors.push(`Rubric: ${(err as Error).message}`);
      }

      // Part B: Targeted Section Evaluation according to policy
      try {
        const targetedRes = await evaluateSectionsWithPolicy(
          document,
          detectedSections,
          effectivePolicy,
          client
        );

        sectionResults = targetedRes.sectionResults;
        if (targetedRes.reviews.length > 0) {
          reviews.push(...targetedRes.reviews);
        }
        if (targetedRes.errors.length > 0) {
          errors.push(...targetedRes.errors);
        }
        logger.info(`Targeted section evaluator produced ${targetedRes.reviews.length} reviews`);
      } catch (error) {
        logger.warn('Targeted AI evaluation error, falling back to rules', error);
        errors.push(`Targeted AI Evaluation: ${(error as Error).message}`);
      }

      // Part C: Always run standard rule engine to guarantee criteria are evaluated
      logger.info('Running pedagogical rule engine evaluation');
      const ruleResults = evaluateAllRules(document, semanticLabels, rules);
      for (const res of ruleResults) {
        for (const issue of res.issues) {
          const isDuplicate = reviews.some(
            (r) => r.ruleId === res.ruleId && r.targetId === issue.targetId
          );
          if (!isDuplicate) {
            reviews.push({
              reviewId: `rev_${uuidv4().substring(0, 8)}`,
              ruleId: res.ruleId,
              targetId: issue.targetId,
              targetType: issue.targetType,
              severity: issue.severity,
              type: issue.type,
              message: issue.message,
              suggestion: issue.suggestion,
              quote: issue.quote,
              errorDetail: issue.errorDetail,
              suggestionExample: issue.suggestionExample,
              confidence: 0.95,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
      logger.info(`Combined total of ${reviews.length} pedagogical reviews (Rubric + Sections + Rules)`);
    }

    // Step 4: Map reviews to annotations with accurate multi-page paragraph targeting
    const annotations: Annotation[] = [];
    const activityAnchorId = findActivityProcessAnchor(document);
    const materialAnchorId = findMaterialAnchor(document);
    const objectiveAnchorId = findObjectiveAnchor(document);

    for (const r of reviews) {
      let directP = document.paragraphs.find((p) => p.id === r.targetId);

      // Check if target is erroneously pinned to lesson title (p_0001 / first paragraph) for content reviews
      const isFirstTitlePara = directP && (directP.id === 'p_0001' || directP === document.paragraphs[0]);
      const isSpecificContentReview =
        /thiết bị|đồ dùng|học liệu|chuẩn bị|hoạt động|khởi động|khám phá|luyện tập|vận dụng|yêu cầu cần đạt|mục tiêu/i.test(
          `${r.message || ''} ${r.ruleId || ''}`
        );

      if (!directP || (isFirstTitlePara && isSpecificContentReview)) {
        const smartMatch = findBestMatchingParagraph(r, document);
        if (smartMatch) {
          directP = smartMatch;
          r.targetId = smartMatch.id;
        } else if (isFirstTitlePara && isSpecificContentReview) {
          // If smartMatch couldn't find exact match, use dedicated safe anchor
          const isMat = /thiết bị|đồ dùng|học liệu|chuẩn bị/i.test(`${r.message || ''} ${r.ruleId || ''}`);
          const isAct = /hoạt động|khởi động|khám phá|luyện tập|vận dụng/i.test(`${r.message || ''} ${r.ruleId || ''}`);
          const safeId = isMat ? materialAnchorId : isAct ? activityAnchorId : objectiveAnchorId;
          const safeP = document.paragraphs.find((p) => p.id === safeId);
          if (safeP) {
            directP = safeP;
            r.targetId = safeP.id;
          }
        }
      }

      if (!r.quote && directP && directP.text) {
        r.quote = directP.text.length > 220 ? directP.text.substring(0, 217) + '...' : directP.text;
      }

      let resolved = resolveTarget(r.targetId, document);

      if (!resolved.found || !resolved.page || !resolved.bbox) {
        // Fallback targeting: NEVER fallback activity or equipment issues to lesson title (p_0001)!
        const isActivityRelated =
          /hoat_dong|khoi_dong|kham_pha|luyen_tap|van_dung|gv_action|hs_action|activity|time/i.test(r.ruleId || '') ||
          /hoạt động|tiến trình|khởi động|khám phá|luyện tập|vận dụng|giáo viên|học sinh|thời gian/i.test(r.message || '');

        const isMaterialRelated =
          /thiet_bi|phuong_tien|material|thiết bị|học liệu|đồ dùng|chuẩn bị/i.test(r.ruleId || '') ||
          /thiết bị|học liệu|đồ dùng|chuẩn bị/i.test(r.message || '');

        const safeFallbackP = isMaterialRelated
          ? (document.paragraphs.find((p) => p.id === materialAnchorId) ||
             document.paragraphs.find((p) => /đồ dùng|thiết bị|học liệu|chuẩn bị/i.test(p.text)) ||
             document.paragraphs[1] || document.paragraphs[0])
          : isActivityRelated
          ? (document.paragraphs.find((p) => p.id === activityAnchorId) ||
             document.paragraphs.find((p) => p.page >= 2) ||
             document.paragraphs[document.paragraphs.length - 1])
          : (document.paragraphs.find((p) => p.id === objectiveAnchorId) ||
             document.paragraphs[1] || document.paragraphs[0]);

        const targetP = directP || findBestMatchingParagraph(r, document) || safeFallbackP;

        if (targetP) {
          if (!r.quote && targetP.text) {
            r.quote = targetP.text.length > 220 ? targetP.text.substring(0, 217) + '...' : targetP.text;
          }
          resolved = {
            found: true,
            page: targetP.page,
            bbox: targetP.bbox,
            type: 'paragraph',
            element: targetP,
          };
          r.targetId = targetP.id;
        } else if (document.pages.length > 0) {
          const firstPage = document.pages[0];
          resolved = {
            found: true,
            page: firstPage.pageNumber,
            bbox: {
              x: 50,
              y: 50,
              width: firstPage.width - 100,
              height: 60,
            },
            type: 'paragraph',
          };
        } else {
          continue;
        }
      }

      if (!resolved.page || !resolved.bbox) {
        continue;
      }

      const dispatchLabel = effectivePolicy.dispatchType === 'CV_2345' ? 'CV 2345' : 'CV 5512';
      const annotation: Annotation = {
        annotationId: `ann_${uuidv4().substring(0, 8)}`,
        type: 'highlight',
        reviewId: r.reviewId,
        targetId: r.targetId,
        targetType: r.targetType || 'paragraph',
        page: resolved.page,
        bbox: resolved.bbox,
        color: getSeverityColor(r.severity),
        opacity: 0.35,
        comments: [
          {
            id: `comment_${uuidv4().substring(0, 8)}`,
            author: `Chuyên gia Thẩm định AI (${dispatchLabel})`,
            content: r.message,
            createdAt: new Date().toISOString(),
          },
        ],
        resolved: false,
      };

      annotations.push(annotation);
    }

    logger.info('Analysis completed', {
      semanticLabels: semanticLabels.length,
      reviews: reviews.length,
      annotations: annotations.length,
      errors: errors.length,
    });

    const finalTotalScore = rubricResult?.totalScore ?? (sectionResults.length > 0 ? sectionResults.reduce((acc, s) => acc + s.score, 0) : 80);
    const finalMaxTotalScore = rubricResult?.maxTotalScore ?? 100;
    const finalGrade = rubricResult?.grade ?? (finalTotalScore >= 85 ? 'A' : finalTotalScore >= 70 ? 'B' : finalTotalScore >= 55 ? 'C' : 'D');

    return NextResponse.json({
      success: true,
      semanticLabels,
      reviews,
      annotations,
      rubricResult,
      totalScore: finalTotalScore,
      maxTotalScore: finalMaxTotalScore,
      grade: finalGrade,
      categoryScores: rubricResult?.categoryScores || {},
      strengths: rubricResult?.strengths || [],
      weaknesses: rubricResult?.weaknesses || [],
      suggestions: rubricResult?.suggestions || [],
      detectedSections: detectedSections.map((s) => ({
        key: s.key,
        title: s.title,
        matchedTitle: s.matchedTitle,
        isDetected: s.isDetected,
        paragraphCount: s.paragraphs.length,
        activityCount: s.activities.length,
        startPage: s.startPage,
        endPage: s.endPage,
      })),
      sectionResults,
      policyConfig: effectivePolicy,
      errors,
    });
  } catch (error) {
    logger.error('Analysis failed', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    );
  }
}

function getSeverityColor(severity: Review['severity']): string {
  switch (severity) {
    case 'INFO':
      return '#E3F2FD';
    case 'WARNING':
      return '#FFF3E0';
    case 'ERROR':
      return '#FFEBEE';
    case 'CRITICAL':
      return '#FFCDD2';
    default:
      return '#FFF9C4';
  }
}

function findBestMatchingParagraph(review: Review, document: DocumentIR) {
  const allP = document.paragraphs;
  if (!allP || allP.length === 0) return null;

  // 1. If review has a quote, find paragraph with closest match
  if (review.quote && review.quote.trim().length > 10) {
    const cleanQuote = review.quote.trim().toLowerCase().substring(0, 35);
    const matched = allP.find((p) => p.text && p.text.toLowerCase().includes(cleanQuote));
    if (matched) return matched;
  }

  // 2. Keyword scan from ruleId, message, and suggestion
  const textToScan = `${review.ruleId || ''} ${review.message || ''} ${review.suggestion || ''}`.toLowerCase();

  // Khởi động / Mở đầu
  if (textToScan.includes('khởi động') || textToScan.includes('mở đầu') || textToScan.includes('khoi_dong')) {
    const p = allP.find((p) => /khởi động|mở đầu|tạo tâm thế|tình huống xuất phát/i.test(p.text));
    if (p) return p;
  }
  // Khám phá / Hình thành kiến thức
  if (
    textToScan.includes('khám phá') ||
    textToScan.includes('hình thành kiến thức') ||
    textToScan.includes('hinh_thanh_kien_thuc')
  ) {
    const p = allP.find((p) => /khám phá|hình thành kiến thức|kiến thức mới|bài học mới/i.test(p.text));
    if (p) return p;
  }
  // Luyện tập / Thực hành
  if (textToScan.includes('luyện tập') || textToScan.includes('thực hành') || textToScan.includes('luyen_tap')) {
    const p = allP.find((p) => /luyện tập|thực hành|bài tập 1|bài 1|bài tập/i.test(p.text));
    if (p) return p;
  }
  // Vận dụng / Mở rộng
  if (textToScan.includes('vận dụng') || textToScan.includes('mở rộng') || textToScan.includes('van_dung')) {
    const p = allP.find((p) => /vận dụng|trải nghiệm|liên hệ thực tế|mở rộng/i.test(p.text));
    if (p) return p;
  }
  // Điều chỉnh sau bài dạy
  if (textToScan.includes('điều chỉnh') || textToScan.includes('rút kinh nghiệm')) {
    const p = allP.find((p) => /điều chỉnh sau bài dạy|rút kinh nghiệm/i.test(p.text));
    if (p) return p;
  }
  // Phẩm chất
  if (textToScan.includes('phẩm chất') || textToScan.includes('thái độ')) {
    const p = allP.find((p) => /phẩm chất|chăm chỉ|trung thực|trách nhiệm|nhân ái/i.test(p.text));
    if (p) return p;
  }
  // Năng lực
  if (textToScan.includes('năng lực') || textToScan.includes('kỹ năng')) {
    const p = allP.find((p) => /năng lực|giao tiếp|hợp tác|tự chủ|tự học|giải quyết vấn đề/i.test(p.text));
    if (p) return p;
  }
  // Mục tiêu
  if (textToScan.includes('mục tiêu') || textToScan.includes('yêu cầu cần đạt')) {
    const p = allP.find((p) => /mục tiêu|yêu cầu cần đạt/i.test(p.text));
    if (p) return p;
  }
  // Hoạt động học sinh
  if (textToScan.includes('học sinh') || textToScan.includes('hoạt động hs') || textToScan.includes('thực hiện')) {
    const p = allP.find((p) => /học sinh:|hs:|thảo luận nhóm|thực hiện nhiệm vụ/i.test(p.text));
    if (p) return p;
  }
  // Thiết bị dạy học / Đồ dùng dạy học
  if (
    textToScan.includes('thiết bị') ||
    textToScan.includes('học liệu') ||
    textToScan.includes('đồ dùng') ||
    textToScan.includes('thiet_bi') ||
    textToScan.includes('chuẩn bị')
  ) {
    const p =
      allP.find((p) =>
        /^(?:II\.|2\.|B\.|II\/|II\s*[-–—:]|PHẦN\s*II\.?)?\s*(?:đồ dùng dạy(?:\s*và)?\s*học|thiết bị dạy học|chuẩn bị của giáo viên|chuẩn bị của gv|thiết bị và học liệu|phương tiện dạy học|chuẩn bị thiết bị)/i.test(
          p.text.trim()
        ) ||
        /đồ dùng dạy học|thiết bị dạy học|chuẩn bị của giáo viên|đồ dùng dạy và học|thiết bị và học liệu|phương tiện dạy học/i.test(
          p.text
        )
      ) ||
      allP.find((p) =>
        /(?:giáo viên|gv):.*(?:máy chiếu|sgk|phiếu|tranh|bảng|tivi|thẻ từ|dụng cụ|học liệu)/i.test(p.text)
      ) ||
      allP.find((p) =>
        /máy chiếu|phiếu học tập|học liệu|bảng phụ|đồ dùng trực quan/i.test(p.text)
      );
    if (p) return p;
  }

  return null;
}
