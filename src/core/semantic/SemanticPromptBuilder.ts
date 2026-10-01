/**
 * SemanticPromptBuilder Module
 *
 * Builds prompts for semantic labeling.
 * CRITICAL: Prompts must ask for paragraph INDEXES, NOT rewritten content.
 * AI must NEVER rewrite, summarize, merge, or modify original content.
 */

import { Paragraph, Activity, Section } from './DocumentIR';
import { SEMANTIC_TYPES, SemanticTypeId, getAllSemanticTypes } from './SemanticOntology';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * Semantic Prompt Builder Config
 */
export interface SemanticPromptConfig {
  includeExamples?: boolean;
  maxParagraphsPerActivity?: number;
  language?: 'vi' | 'en';
}

/**
 * Build semantic extraction prompt
 */
export function buildSemanticPrompt(
  paragraphs: Paragraph[],
  activity: Activity,
  config: SemanticPromptConfig = {}
): { system: string; user: string } {
  const {
    includeExamples = true,
    maxParagraphsPerActivity = 20,
    language = 'vi'
  } = config;

  // Get paragraphs for this activity
  const activityParagraphs = paragraphs
    .filter(p => activity.paragraphIds.includes(p.id))
    .slice(0, maxParagraphsPerActivity);

  logger.info(`[SemanticPromptBuilder] Building prompt for ${activityParagraphs.length} paragraphs`);

  const systemPrompt = buildSystemPrompt(language, includeExamples);
  const userPrompt = buildUserPrompt(paragraphs, activity, activityParagraphs, language);

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Build system prompt
 */
function buildSystemPrompt(language: 'vi' | 'en', includeExamples: boolean): string {
  const typeList = getAllSemanticTypes()
    .filter(t => t.id !== 'UNKNOWN')
    .map(t => `- ${t.id}: ${t.nameVi}`)
    .join('\n');

  const examples = includeExamples
    ? `

VÍ DỤ:
Input: "[0] GV hướng dẫn HS đọc bài"
Output: {"paragraphIndexes": [0], "type": "TEACHER_ACTION"}

Input: "[1] HS thảo luận nhóm đôi"
Output: {"paragraphIndexes": [1], "type": "STUDENT_ACTION"}`
    : '';

  return `Bạn là chuyên gia PHÂN TÍCH NGỮ NGHĨA CHO GIÁO ÁN VIỆT NAM.

NHIỆM VỤ: Đánh nhãn ngữ nghĩa cho từng đoạn văn - CHỈ trả về INDEX, KHÔNG viết lại nội dung.

QUAN TRỌNG:
- Chỉ trả về INDEX của các đoạn văn (số trong ngoặc vuông [])
- KHÔNG viết lại hay tóm tắt nội dung
- KHÔNG thay đổi hay bổ sung nội dung
- Giữ nguyên 100% nội dung gốc

CÁC LOẠI NGỮ NGHĨA:
${typeList}

QUY TẮC PHÂN LOẠI:
${getClassificationRules()}

OUTPUT JSON:
{
  "activityId": "id hoạt động",
  "activityTitle": "tên hoạt động",
  "labels": [
    {
      "paragraphIndex": 0,
      "type": "TEACHER_ACTION",
      "confidence": 0.95
    }
  ]
}
${examples}

Trả về JSON hợp lệ, KHÔNG markdown, KHÔNG giải thích.`;
}

/**
 * Build user prompt with paragraphs
 */
function buildUserPrompt(
  allParagraphs: Paragraph[],
  activity: Activity,
  activityParagraphs: Paragraph[],
  language: 'vi' | 'en'
): string {
  const paragraphsList = activityParagraphs
    .map((p, idx) => `[${idx}] ${p.content}`)
    .join('\n\n');

  return `PHÂN TÍCH NGỮ NGHĨA CHO HOẠT ĐỘNG: ${activity.title}

DANH SÁCH ĐOẠN VĂN:
${paragraphsList}

NHIỆM VỤ:
- Đọc từng đoạn văn ở trên
- Xác định loại ngữ nghĩa cho mỗi đoạn
- Trả về INDEX (số trong ngoặc vuông []) và LOẠI

TRẢ VỀ JSON (CHỈ INDEX, KHÔNG TEXT):
{
  "activityId": "${activity.id}",
  "activityTitle": "${activity.title}",
  "labels": [
    {
      "paragraphIndex": số,
      "type": "LOẠI",
      "confidence": 0.0-1.0
    }
  ]
}

Đánh nhãn cho TẤT CẢ các đoạn văn.`;
}

/**
 * Get classification rules for each type
 */
function getClassificationRules(): string {
  return `
TEACHER_ACTION: Hành động của GV (bắt đầu bằng "GV:", "Giáo viên:", "Cho HS:", "Hướng dẫn:", "Yêu cầu:", "Hỏi:", "Trình bày:", "Nhận xét:", "Tuyên dương:")
STUDENT_ACTION: Hành động của HS (bắt đầu bằng "HS:", "Học sinh:", "Làm:", "Thực hiện:", "Trả lời:", "Đọc:", "Viết:", "Thảo luận:")
TEACHING_MATERIAL: Học liệu (SGK, máy chiếu, video, hình ảnh, đồ dùng, bài giảng, slide)
LEARNING_OUTCOME: Kết quả học tập ("HS có thể...", "Yêu cầu cần đạt", "Mục tiêu")
QUESTION: Câu hỏi (chứa dấu ?, bắt đầu "Câu hỏi:", "Hỏi:")
ASSESSMENT: Đánh giá ("Nhận xét", "Tuyên dương", "Đánh giá", "Kiểm tra")
SECTION_HEADER: Tiêu đề (hoạt động, phần, mục, I., II., 1., 2., Khởi động, Luyện tập...)
PRODUCT: Sản phẩm HS cần tạo (bài làm, vở bài tập, bản vẽ, trình bày)
OBJECTIVE: Mục tiêu bài học
INSTRUCTION: Hướng dẫn thực hiện ("Cách", "Hướng dẫn", "Thực hiện theo")
UNKNOWN: Không xác định được`;
}

/**
 * Build batch semantic prompt for multiple activities
 */
export function buildBatchSemanticPrompt(
  paragraphs: Paragraph[],
  activities: Activity[],
  config: SemanticPromptConfig = {}
): { system: string; user: string } {
  const systemPrompt = buildSystemPrompt(config.language || 'vi', config.includeExamples ?? true);

  let userPrompt = `PHÂN TÍCH NGỮ NGHĨA CHO NHIỀU HOẠT ĐỘNG\n`;
  userPrompt += `Tổng cộng: ${activities.length} hoạt động, ${paragraphs.length} đoạn văn\n\n`;

  activities.forEach((activity, actIdx) => {
    const activityParagraphs = paragraphs.filter(p => activity.paragraphIds.includes(p.id));

    userPrompt += `=== HOẠT ĐỘNG ${actIdx + 1}: ${activity.title} ===\n`;
    userPrompt += `Paragraphs: [${activity.paragraphIds.join(', ')}]\n\n`;

    activityParagraphs.forEach((p, pIdx) => {
      userPrompt += `[${pIdx}] ${p.content}\n`;
    });

    userPrompt += '\n';
  });

  userPrompt += `\nTRẢ VỀ JSON:
{
  "activities": [
    {
      "activityId": "a0",
      "activityTitle": "tên",
      "labels": [{"paragraphIndex": 0, "type": "TEACHER_ACTION", "confidence": 0.9}]
    }
  ]
}`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Build prompt for single paragraph classification
 */
export function buildSingleParagraphPrompt(
  paragraph: Paragraph,
  contextParagraphs: Paragraph[] = []
): { system: string; user: string } {
  const systemPrompt = `Bạn là chuyên gia phân loại nội dung giáo án.

TRẢ VỀ JSON:
{
  "paragraphIndex": số,
  "type": "LOẠI_NGỮ_NGHĨA",
  "confidence": 0.0-1.0
}`;

  let userPrompt = `Phân loại đoạn văn:\n`;
  userPrompt += `[0] ${paragraph.content}\n\n`;

  if (contextParagraphs.length > 0) {
    userPrompt += `Ngữ cảnh (các đoạn liên quan):\n`;
    contextParagraphs.forEach((p, idx) => {
      userPrompt += `[${idx + 1}] ${p.content}\n`;
    });
  }

  return { system: systemPrompt, user: userPrompt };
}
