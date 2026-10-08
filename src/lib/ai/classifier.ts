// Semantic Classifier

import { BeekOneClient } from './client';
import { SemanticLabel, SemanticLabelType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `Bạn là chuyên gia phân loại nội dung giáo án.
Nhiệm vụ: Phân loại từng đoạn văn theo nhãn ngữ nghĩa.
Nguyên tắc:
1. Trả về JSON hợp lệ, không có markdown code block
2. Mỗi đoạn phải có nhãn
3. Chỉ sử dụng các nhãn được liệt kê`;

const LABELS_LIST = [
  'SECTION_HEADER (tiêu đề phần)',
  'OBJECTIVE (mục tiêu bài học)',
  'LEARNING_OUTCOME (yêu cầu cần đạt)',
  'TEACHER_ACTION (hoạt động của giáo viên)',
  'STUDENT_ACTION (hoạt động của học sinh)',
  'TEACHING_MATERIAL (đồ dùng dạy học)',
  'QUESTION (câu hỏi)',
  'ASSESSMENT (đánh giá)',
  'PRODUCT (sản phẩm)',
  'INSTRUCTION (hướng dẫn)',
  'INTRODUCTION (mở bài)',
  'CONCLUSION (kết luận)',
  'HOMEWORK (bài tập về nhà)',
  'NOTE (ghi chú)',
  'UNKNOWN (không xác định)',
].join('\n');

export interface ClassifierInput {
  id: string;
  text: string;
  page: number;
  type?: string;
}

export interface ClassifierResult {
  id: string;
  label: SemanticLabelType;
  confidence: number;
}

function buildPrompt(paragraphs: ClassifierInput[]): string {
  const paragraphsText = paragraphs
    .map((p) => `${p.id}: ${p.text}`)
    .join('\n\n');

  return `Phân loại ${paragraphs.length} đoạn trong giáo án.

Labels BẮT BUỘC:
${LABELS_LIST}

Trả về JSON theo format:
{"labels": [{"id": "p_0001", "label": "SECTION_HEADER", "confidence": 0.95}, ...]}

Dưới đây là các đoạn:
${paragraphsText}`;
}

function parseResponse(
  response: string,
  inputIds: Set<string>
): { labels: ClassifierResult[]; errors: string[] } {
  const labels: ClassifierResult[] = [];
  const errors: string[] = [];

  let jsonStr = response.trim();

  // Remove markdown code block if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  // Try to extract JSON object
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!objMatch) {
    errors.push('No JSON object found in response');
    return { labels, errors };
  }

  try {
    const parsed = JSON.parse(objMatch[0]);

    if (!parsed.labels || !Array.isArray(parsed.labels)) {
      errors.push('Response missing "labels" array');
      return { labels, errors };
    }

    for (const item of parsed.labels) {
      if (!item.id || !item.label) {
        errors.push(`Invalid label item: ${JSON.stringify(item)}`);
        continue;
      }

      if (!inputIds.has(item.id)) {
        errors.push(`Unknown id: ${item.id}`);
        continue;
      }

      labels.push({
        id: item.id,
        label: item.label as SemanticLabelType,
        confidence: item.confidence ?? 0.5,
      });
    }
  } catch (e) {
    errors.push(`JSON parse error: ${(e as Error).message}`);
  }

  return { labels, errors };
}

export async function classifyParagraphs(
  client: BeekOneClient,
  paragraphs: ClassifierInput[],
  batchSize: number = 30
): Promise<SemanticLabel[]> {
  const allLabels: SemanticLabel[] = [];
  const inputIds = new Set(paragraphs.map((p) => p.id));

  // Process in batches
  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(paragraphs.length / batchSize);

    console.log(`[Classifier] Processing batch ${batchNum}/${totalBatches}`);

    const prompt = buildPrompt(batch);
    const result = await client.chat(prompt, SYSTEM_PROMPT, {
      temperature: 0.2,
      maxTokens: 4096,
    });

    if (!result.success || !result.data) {
      console.error(`[Classifier] Batch ${batchNum} failed:`, result.error);

      // Fallback: assign UNKNOWN to all items in batch
      for (const p of batch) {
        allLabels.push({
          id: uuidv4(),
          targetId: p.id,
          targetType: 'paragraph',
          label: 'UNKNOWN',
          confidence: 0,
          source: 'ai',
        });
      }
      continue;
    }

    const { labels, errors } = parseResponse(result.data, inputIds);

    if (errors.length > 0) {
      console.warn(`[Classifier] Batch ${batchNum} parse warnings:`, errors);
    }

    for (const label of labels) {
      allLabels.push({
        id: uuidv4(),
        targetId: label.id,
        targetType: 'paragraph',
        label: label.label,
        confidence: label.confidence,
        source: 'ai',
      });
    }

    // Handle missing labels (fallback to UNKNOWN)
    const processedIds = new Set(labels.map((l) => l.id));
    for (const p of batch) {
      if (!processedIds.has(p.id)) {
        allLabels.push({
          id: uuidv4(),
          targetId: p.id,
          targetType: 'paragraph',
          label: 'UNKNOWN',
          confidence: 0,
          source: 'ai',
        });
      }
    }
  }

  return allLabels;
}

export function classifyParagraphHeuristic(
  text: string,
  type?: string
): { label: SemanticLabelType; confidence: number } {
  const lower = text.toLowerCase().trim();

  if (type?.startsWith('heading') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/i.test(text)) {
    return { label: 'SECTION_HEADER', confidence: 0.9 };
  }
  if (/^hoạt động\s*\d*[:\-]/i.test(lower) || /^hoat dong\s*\d*[:\-]/i.test(lower)) {
    return { label: 'SECTION_HEADER', confidence: 0.85 };
  }
  if (
    /^(mục tiêu|yêu cầu cần đạt|chuẩn kiến thức|kiến thức|kỹ năng|thái độ|kien thuc|ky nang|thai do|năng lực|phẩm chất)/i.test(
      lower
    ) ||
    /(mục tiêu|yêu cầu cần đạt):/i.test(lower)
  ) {
    return { label: 'OBJECTIVE', confidence: 0.85 };
  }
  if (
    /^(gv|giáo viên|thầy|cô)\s*[:\-]/i.test(lower) ||
    /giáo viên (hướng dẫn|yêu cầu|nhận xét|cho|gọi|gợi ý)/i.test(lower)
  ) {
    return { label: 'TEACHER_ACTION', confidence: 0.85 };
  }
  if (
    /^(hs|học sinh)\s*[:\-]/i.test(lower) ||
    /học sinh (lắng nghe|thực hiện|thảo luận|làm việc|báo cáo|trả lời|quan sát)/i.test(lower)
  ) {
    return { label: 'STUDENT_ACTION', confidence: 0.85 };
  }
  if (
    /^(chuẩn bị|đồ dùng|thiết bị|học liệu|phương tiện)/i.test(lower) ||
    /(bảng phụ|máy chiếu|phiếu học tập|tranh ảnh|vở bài tập)/i.test(lower)
  ) {
    return { label: 'TEACHING_MATERIAL', confidence: 0.8 };
  }
  if (/^(sản phẩm|kết quả cần đạt|đáp án)/i.test(lower)) {
    return { label: 'PRODUCT', confidence: 0.8 };
  }
  if (/^(đánh giá|kiểm tra|tiêu chí)/i.test(lower)) {
    return { label: 'ASSESSMENT', confidence: 0.8 };
  }
  if (/^(bài tập về nhà|vận dụng|dặn dò|về nhà)/i.test(lower)) {
    return { label: 'HOMEWORK', confidence: 0.8 };
  }
  if (lower.endsWith('?') || /^(câu hỏi|hỏi:)/i.test(lower)) {
    return { label: 'QUESTION', confidence: 0.75 };
  }
  if (/^(khởi động|mở đầu)/i.test(lower)) {
    return { label: 'INTRODUCTION', confidence: 0.8 };
  }

  return { label: 'UNKNOWN', confidence: 0.3 };
}

export function classifyParagraphsHeuristic(paragraphs: ClassifierInput[]): SemanticLabel[] {
  return paragraphs.map((p) => {
    const { label, confidence } = classifyParagraphHeuristic(p.text, p.type);
    return {
      id: uuidv4(),
      targetId: p.id,
      targetType: 'paragraph' as const,
      label,
      confidence,
      source: 'heuristic' as const,
    };
  });
}
