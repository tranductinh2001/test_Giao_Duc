/**
 * VisionParser Module
 *
 * Responsible for extracting document structure ONLY:
 * - Pages
 * - Paragraphs
 * - Sections
 *
 * Does NOT do semantic labeling - that's Semantic AI's job.
 *
 * Input: Raw document (PDF/DOCX) or Vision AI response
 * Output: DocumentIR.paragraphs + DocumentIR.sections
 */

import {
  DocumentIR,
  Paragraph,
  Section,
  Activity,
  SectionType,
  ActivityType,
  createParagraph,
  createSection,
  createActivity,
  createEmptyDocumentIR
} from './DocumentIR';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * Vision Parser Result
 */
export interface VisionParseResult {
  success: boolean;
  paragraphs: Paragraph[];
  sections: Section[];
  activities: Activity[];
  metadata: {
    totalPages: number;
    totalParagraphs: number;
    model?: string;
  };
  rawResponse?: any;
  error?: string;
}

/**
 * Default Vision Prompt for document structure extraction
 */
export const VISION_EXTRACTION_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích tài liệu giáo án Việt Nam.

NHIỆM VỤ: Trích xuất CẤU TRÚC tài liệu - KHÔNG phân tích ngữ nghĩa.

OUTPUT (CHỈ JSON):
{
  "metadata": {
    "totalPages": number,
    "language": "vi"
  },
  "paragraphs": [
    {
      "id": "p0",
      "content": "nội dung đoạn văn",
      "pageNumber": 1,
      "lineNumber": 1
    }
  ],
  "sections": [
    {
      "id": "s0",
      "title": "Tiêu đề phần",
      "type": "OBJECTIVE|MATERIALS|ACTIVITIES|INTRODUCTION|LEARNING|PRACTICE|CONSOLIDATION|HOMEWORK|OTHER",
      "paragraphIds": ["p0", "p1"],
      "order": 0
    }
  ],
  "activities": [
    {
      "id": "a0",
      "title": "Tên hoạt động",
      "type": "WARM_UP|PRESENTATION|EXPLORATION|GUIDED_PRACTICE|INDEPENDENT_PRACTICE|APPLICATION|CONSOLIDATION|EXTENSION|EVALUATION|HOMEWORK|OTHER",
      "paragraphIds": ["p2", "p3"],
      "order": 0,
      "duration": "5 phút"
    }
  ]
}

QUAN TRỌNG:
- Chỉ trích xuất cấu trúc
- KHÔNG viết lại hay tóm tắt nội dung
- Giữ nguyên 100% nội dung gốc
- Phát hiện các section: Mục tiêu, Đồ dùng, Hoạt động, v.v.
- Phát hiện các hoạt động: Khởi động, Luyện tập, v.v.`;

export const VISION_EXTRACTION_USER_PROMPT = `Phân tích tài liệu giáo án này và trả về JSON cấu trúc.

Trả về JSON hợp lệ, KHÔNG markdown, KHÔNG giải thích.`;

/**
 * Parse Vision AI response to extract document structure
 */
export function parseVisionResponse(
  aiResponse: string,
  model?: string
): VisionParseResult {
  logger.info('[VisionParser] Parsing Vision AI response...');

  try {
    // Step 1: Clean markdown
    let cleaned = aiResponse.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    // Step 2: Parse JSON
    const parsed = JSON.parse(cleaned);

    // Step 3: Extract paragraphs
    const paragraphs: Paragraph[] = [];
    if (Array.isArray(parsed.paragraphs)) {
      parsed.paragraphs.forEach((p: any, idx: number) => {
        paragraphs.push(createParagraph(
          p.content || '',
          idx,
          p.pageNumber || 1,
          p.lineNumber || idx + 1
        ));
      });
    }

    // Step 4: Extract sections
    const sections: Section[] = [];
    if (Array.isArray(parsed.sections)) {
      parsed.sections.forEach((s: any, idx: number) => {
        const section = createSection(
          s.title || '',
          normalizeSectionType(s.type),
          s.paragraphIds || [],
          idx
        );
        sections.push(section);
      });
    }

    // Step 5: Extract activities
    const activities: Activity[] = [];
    if (Array.isArray(parsed.activities)) {
      parsed.activities.forEach((a: any, idx: number) => {
        const activity = createActivity(
          a.title || '',
          normalizeActivityType(a.type),
          a.paragraphIds || [],
          idx,
          a.duration
        );
        activities.push(activity);
      });
    }

    // Log results
    logger.info(`[VisionParser] Extracted ${paragraphs.length} paragraphs`);
    logger.info(`[VisionParser] Extracted ${sections.length} sections`);
    logger.info(`[VisionParser] Extracted ${activities.length} activities`);

    return {
      success: true,
      paragraphs,
      sections,
      activities,
      metadata: {
        totalPages: parsed.metadata?.totalPages || 1,
        totalParagraphs: paragraphs.length,
        model
      },
      rawResponse: parsed
    };

  } catch (error: any) {
    logger.error(`[VisionParser] Parse error: ${error.message}`);
    return {
      success: false,
      paragraphs: [],
      sections: [],
      activities: [],
      metadata: { totalPages: 0, totalParagraphs: 0 },
      error: error.message
    };
  }
}

/**
 * Normalize section type
 */
function normalizeSectionType(type: string | undefined): SectionType {
  if (!type) return 'OTHER';

  const normalized = type.toUpperCase();
  const validTypes: SectionType[] = [
    'OBJECTIVE', 'MATERIALS', 'ACTIVITIES', 'INTRODUCTION',
    'LEARNING', 'PRACTICE', 'APPLICATION', 'CONSOLIDATION',
    'HOMEWORK', 'EVALUATION', 'OTHER'
  ];

  return validTypes.includes(normalized as SectionType) ? normalized as SectionType : 'OTHER';
}

/**
 * Normalize activity type
 */
function normalizeActivityType(type: string | undefined): ActivityType {
  if (!type) return 'OTHER';

  const normalized = type.toUpperCase();
  const validTypes: ActivityType[] = [
    'WARM_UP', 'PRESENTATION', 'EXPLORATION', 'GUIDED_PRACTICE',
    'INDEPENDENT_PRACTICE', 'APPLICATION', 'CONSOLIDATION',
    'EXTENSION', 'EVALUATION', 'HOMEWORK', 'OTHER'
  ];

  return validTypes.includes(normalized as ActivityType) ? normalized as ActivityType : 'OTHER';
}

/**
 * Build Vision Extraction Prompt
 */
export function buildVisionPrompt(documentContent?: string): {
  system: string;
  user: string;
} {
  return {
    system: VISION_EXTRACTION_SYSTEM_PROMPT,
    user: documentContent
      ? `${VISION_EXTRACTION_USER_PROMPT}\n\nTài liệu:\n${documentContent.slice(0, 10000)}`
      : VISION_EXTRACTION_USER_PROMPT
  };
}

/**
 * Convert VisionParseResult to DocumentIR
 */
export function toDocumentIR(
  visionResult: VisionParseResult,
  sourceFile: string,
  sourceType: 'pdf' | 'docx' | 'text',
  processingTimeMs: number
): DocumentIR {
  const docIR = createEmptyDocumentIR();

  // Set metadata
  docIR.metadata = {
    sourceFile,
    sourceType,
    totalPages: visionResult.metadata.totalPages,
    totalParagraphs: visionResult.paragraphs.length,
    processingTimeMs,
    extractedAt: new Date().toISOString()
  };

  // Set content
  docIR.paragraphs = visionResult.paragraphs;
  docIR.sections = visionResult.sections;
  docIR.activities = visionResult.activities;

  // Store artifacts
  docIR.artifacts.visionRaw = visionResult.rawResponse;

  return docIR;
}

/**
 * Validate Vision Result
 */
export function validateVisionResult(result: VisionParseResult): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.success) {
    errors.push(`Vision parsing failed: ${result.error}`);
  }

  if (result.paragraphs.length === 0) {
    errors.push('No paragraphs extracted');
  }

  if (result.sections.length === 0) {
    warnings.push('No sections detected');
  }

  if (result.activities.length === 0) {
    warnings.push('No activities detected');
  }

  // Check for orphaned paragraphs
  const sectionParagraphIds = new Set(
    result.sections.flatMap(s => s.paragraphIds)
  );
  const activityParagraphIds = new Set(
    result.activities.flatMap(a => a.paragraphIds)
  );
  const allStructuredIds = new Set([...sectionParagraphIds, ...activityParagraphIds]);

  const orphanCount = result.paragraphs.filter(
    p => !allStructuredIds.has(p.id)
  ).length;

  if (orphanCount > result.paragraphs.length * 0.5) {
    warnings.push(`${orphanCount} paragraphs not linked to any section/activity`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
