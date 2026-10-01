/**
 * DocumentIR - Document Intermediate Representation
 *
 * Canonical internal representation for lesson plan documents.
 * This is the core data structure that flows through the pipeline:
 *
 * RAW DOCUMENT
 *    ↓
 * VisionParser → DocumentIR.paragraphs + DocumentIR.sections
 *    ↓
 * SemanticPromptBuilder → uses DocumentIR.paragraphs
 *    ↓
 * SemanticResponseParser → adds DocumentIR.semanticLabels
 *    ↓
 * SemanticMapper → creates DocumentIR.semanticTree
 *    ↓
 * SchemaValidator → validates DocumentIR
 *    ↓
 * COVERAGE VALIDATOR → checks coverage
 *    ↓
 * FINAL DocumentIR
 */

import { SemanticTypeId } from './SemanticOntology';

/**
 * Paragraph - smallest unit of content
 */
export interface Paragraph {
  id: string;           // Unique ID: "p0", "p1", ...
  content: string;       // Original text content (NEVER modified)
  pageNumber: number;    // Page number in document
  lineNumber: number;    // Line number on page
  order: number;         // Global order across document
}

/**
 * Section - structural grouping
 */
export interface Section {
  id: string;            // Unique ID: "s0", "s1", ...
  title: string;         // Section title
  type: SectionType;     // Section type
  paragraphIds: string[]; // IDs of paragraphs in this section
  order: number;         // Order in document
  startParagraphOrder: number;
  endParagraphOrder: number;
}

/**
 * Section types
 */
export type SectionType =
  | 'OBJECTIVE'           // Mục tiêu
  | 'MATERIALS'            // Đồ dùng dạy học
  | 'ACTIVITIES'          // Các hoạt động
  | 'INTRODUCTION'        // Hoạt động khởi động
  | 'LEARNING'            // Hoạt động học tập
  | 'PRACTICE'            // Luyện tập
  | 'APPLICATION'         // Vận dụng
  | 'CONSOLIDATION'       // Củng cố
  | 'HOMEWORK'           // Về nhà
  | 'EVALUATION'          // Đánh giá
  | 'OTHER';              // Other

/**
 * Activity - a learning activity
 */
export interface Activity {
  id: string;             // Unique ID: "a0", "a1", ...
  title: string;         // Activity title
  type: ActivityType;    // Activity type
  paragraphIds: string[]; // IDs of paragraphs in this activity
  order: number;         // Order in document
  duration?: string;     // Duration: "5 phút", "10 phút"
  startParagraphOrder: number;
  endParagraphOrder: number;
}

/**
 * Activity types
 */
export type ActivityType =
  | 'WARM_UP'             // Khởi động
  | 'PRESENTATION'        // Giới thiệu bài mới
  | 'EXPLORATION'         // Khám phá
  | 'GUIDED_PRACTICE'     // Luyện tập có hướng dẫn
  | 'INDEPENDENT_PRACTICE' // Luyện tập độc lập
  | 'APPLICATION'         // Vận dụng
  | 'CONSOLIDATION'       // Củng cố
  | 'EXTENSION'          // Mở rộng
  | 'EVALUATION'          // Đánh giá
  | 'HOMEWORK'           // Về nhà
  | 'OTHER';

/**
 * Semantic Label for a paragraph
 */
export interface SemanticLabel {
  paragraphId: string;
  paragraphIndex: number;  // Index in the paragraph array
  type: SemanticTypeId;
  confidence: number;     // 0-1
  reason?: string;        // Why this label was assigned
}

/**
 * Semantic Tree - hierarchical semantic structure
 */
export interface SemanticTree {
  sections: {
    sectionId: string;
    sectionTitle: string;
    activities: {
      activityId: string;
      activityTitle: string;
      labels: SemanticLabel[];
    }[];
  }[];
}

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'MISSING_REQUIRED' | 'INVALID_TYPE' | 'OUT_OF_RANGE' | 'PARSE_ERROR';
  message: string;
  location?: string;
}

export interface ValidationWarning {
  type: 'LOW_COVERAGE' | 'MISSING_OPTIONAL' | 'AMBIGUOUS';
  message: string;
  location?: string;
}

/**
 * Coverage Report
 */
export interface CoverageReport {
  totalParagraphs: number;
  labeledParagraphs: number;
  unlabeledParagraphs: number;
  coveragePercent: number;
  typeDistribution: Record<SemanticTypeId, number>;
  unlabeledIndexes: number[];
}

/**
 * DocumentIR - Main Interface
 */
export interface DocumentIR {
  // Metadata
  metadata: DocumentIRMetadata;

  // Content (from Vision AI)
  paragraphs: Paragraph[];
  sections: Section[];
  activities: Activity[];

  // Semantic Analysis (from Semantic AI)
  semanticLabels: SemanticLabel[];
  semanticTree: SemanticTree;

  // Validation
  validation: ValidationResult;
  coverage: CoverageReport;

  // Debug artifacts (persisted for debugging)
  artifacts: DocumentIRArtifacts;
}

export interface DocumentIRMetadata {
  sourceFile: string;
  sourceType: 'pdf' | 'docx' | 'text';
  totalPages: number;
  totalParagraphs: number;
  processingTimeMs: number;
  visionModel?: string;
  semanticModel?: string;
  extractedAt: string;
}

/**
 * Debug artifacts - persisted for debugging
 */
export interface DocumentIRArtifacts {
  visionRaw: any;           // Raw Vision AI response
  visionPrompt: string;     // Vision prompt used
  semanticPrompt: string;    // Semantic prompt used
  semanticRaw: string;       // Raw Semantic AI response
  mappingResult: any;        // Mapping result
  validationReport: any;     // Validation report
}

/**
 * Create empty DocumentIR
 */
export function createEmptyDocumentIR(): DocumentIR {
  return {
    metadata: {
      sourceFile: '',
      sourceType: 'text',
      totalPages: 0,
      totalParagraphs: 0,
      processingTimeMs: 0,
      extractedAt: new Date().toISOString()
    },
    paragraphs: [],
    sections: [],
    activities: [],
    semanticLabels: [],
    semanticTree: { sections: [] },
    validation: { isValid: true, errors: [], warnings: [] },
    coverage: {
      totalParagraphs: 0,
      labeledParagraphs: 0,
      unlabeledParagraphs: 0,
      coveragePercent: 0,
      typeDistribution: {} as Record<SemanticTypeId, number>,
      unlabeledIndexes: []
    },
    artifacts: {
      visionRaw: null,
      visionPrompt: '',
      semanticPrompt: '',
      semanticRaw: '',
      mappingResult: null,
      validationReport: null
    }
  };
}

/**
 * Create Paragraph from content
 */
export function createParagraph(
  content: string,
  order: number,
  pageNumber: number = 1,
  lineNumber: number = 1
): Paragraph {
  return {
    id: `p${order}`,
    content,
    pageNumber,
    lineNumber,
    order
  };
}

/**
 * Create Section
 */
export function createSection(
  title: string,
  type: SectionType,
  paragraphIds: string[],
  order: number
): Section {
  const paragraphOrders = paragraphIds.map(id => parseInt(id.replace('p', '')));
  return {
    id: `s${order}`,
    title,
    type,
    paragraphIds,
    order,
    startParagraphOrder: Math.min(...paragraphOrders),
    endParagraphOrder: Math.max(...paragraphOrders)
  };
}

/**
 * Create Activity
 */
export function createActivity(
  title: string,
  type: ActivityType,
  paragraphIds: string[],
  order: number,
  duration?: string
): Activity {
  const paragraphOrders = paragraphIds.map(id => parseInt(id.replace('p', '')));
  return {
    id: `a${order}`,
    title,
    type,
    paragraphIds,
    order,
    duration,
    startParagraphOrder: Math.min(...paragraphOrders),
    endParagraphOrder: Math.max(...paragraphOrders)
  };
}

/**
 * Create Semantic Label
 */
export function createSemanticLabel(
  paragraphId: string,
  paragraphIndex: number,
  type: SemanticTypeId,
  confidence: number = 1.0,
  reason?: string
): SemanticLabel {
  return {
    paragraphId,
    paragraphIndex,
    type,
    confidence,
    reason
  };
}
