/**
 * Lesson Plan Pipeline - Types
 *
 * Phase 1: Pipeline types for parsing and structure detection
 */

// ============================================
// PARAGRAPH TYPES
// ============================================

export interface ParsedParagraph {
  paragraphIndex: number;
  text: string;
  headingLevel: number | null;
  style: string | null;
  pageNumber: number | null;
  rawStyle: string | null;
}

// ============================================
// ACTIVITY TYPES
// ============================================

export interface DetectedActivity {
  activityIndex: number;
  title: string;
  paragraphs: ParsedParagraph[];
  confidence: number;
  detectionMethod: "heading" | "keyword" | "numbering" | "template" | "fallback";
  matchedPattern?: string;
}

// ============================================
// SECTION TYPES
// ============================================

export interface DetectedSection {
  sectionIndex: number;
  sectionCode: string;       // From template (e.g., "OBJECTIVE", "PREPARATION")
  sectionTitle: string;       // Original title from document
  activities: DetectedActivity[];
  confidence: number;
  isUnknown: boolean;         // true if confidence < threshold
  detectionMethod: "heading" | "keyword" | "numbering" | "template" | "fallback";
  matchedAlias?: string;     // Which alias matched
  matchedPattern?: string;   // Which pattern matched
}

// ============================================
// DOCUMENT TYPES
// ============================================

export interface ParsedDocument {
  documentId?: string;
  rawText: string;
  totalParagraphs: number;
  sections: DetectedSection[];
  overallConfidence: number;
  method: "template" | "heuristic" | "hybrid";
  parseTime: number;
}

// ============================================
// TEMPLATE TYPES (from Database)
// ============================================

export interface TemplateSection {
  id: string;
  templateId: string;
  code: string;
  name: string;
  order: number;
  isRequired: boolean;
  isRepeatable: boolean;
  headingLevel: number | null;
}

export interface SectionAlias {
  id: string;
  sectionId: string;
  alias: string;
  order: number;
  confidence: number;
}

export interface ParserRule {
  id: string;
  templateId: string;
  sectionId: string;
  type: "KEYWORD" | "REGEX" | "FUZZY";
  pattern: string;
  priority: number;
  ignoreCase: boolean;
  ignoreAccent: boolean;
  ignoreSpace: boolean;
  normalizeText: boolean;
  fuzzyThreshold: number | null;
  aliases: string[];
  isActive: boolean;
  confidence: number;
}

// ============================================
// PIPELINE CONFIGURATION
// ============================================

export interface PipelineConfig {
  templateId?: string;
  useTemplate: boolean;
  confidenceThreshold: number;
  enableActivityDetection: boolean;
  enableFuzzyMatching: boolean;
  fuzzyThreshold: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  templateId: undefined,
  useTemplate: true,
  confidenceThreshold: 50, // 50% threshold
  enableActivityDetection: true,
  enableFuzzyMatching: true,
  fuzzyThreshold: 0.8,
};

// ============================================
// PIPELINE RESULT
// ============================================

export interface PipelineResult {
  success: boolean;
  document?: ParsedDocument;
  error?: string;
  errors: string[];
  warnings: string[];
}

// ============================================
// SECTION TEMPLATE (Admin configured)
// ============================================

export interface SectionTemplate {
  id: string;
  code: string;
  name: string;
  order: number;
  isRequired: boolean;
  aliases: SectionAlias[];
  parserRules: ParserRule[];
}
