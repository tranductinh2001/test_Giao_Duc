/**
 * Review Context Builder Types
 *
 * Phase 3: Types for Review Context Builder
 */

// ============================================
// INPUT TYPES
// ============================================

export interface DocumentParagraph {
  id?: string;
  text: string;
  headingLevel?: number;
  numbering?: string;
}

export interface DocumentSection {
  code: string;
  title: string;
  paragraphs: DocumentParagraph[];
  order: number;
}

export interface DocumentStructure {
  title: string;
  sections: DocumentSection[];
  metadata?: Record<string, unknown>;
}

// ============================================
// MAPPING RESULT TYPES
// ============================================

export interface MappingMatch {
  activityId: string;
  activityCode: string;
  activityTitle: string;
  confidence: number;
  matchedBy: string[];
  isUnknown: boolean;
}

export interface SectionMappingResult {
  sectionCode: string;
  sectionTitle: string;
  matchedActivities: MappingMatch[];
}

export interface MappingResult {
  lessonPlanId: string;
  bookId?: string;
  gradeId?: string;
  subjectId?: string;
  lessonId?: string;
  sectionResults: SectionMappingResult[];
  unknownActivities: MappingMatch[];
  overallConfidence: number;
}

// ============================================
// LESSON KNOWLEDGE TYPES
// ============================================

export interface LessonKnowledge {
  sectionId: string;
  sectionCode: string;
  sectionName: string;
  activities: LessonActivityKnowledge[];
}

export interface LessonActivityKnowledge {
  activityId: string;
  activityCode: string;
  title: string;
  summary?: string;
  teachingIntent?: string;
  knowledge?: string;
  keywords: string[];
  expectedTeacherActions?: string;
  expectedStudentActions?: string;
  expectedOutcome?: string;
  estimatedMinutes?: number;
}

// ============================================
// TEMPLATE & RULES TYPES
// ============================================

export interface TemplateSection {
  code: string;
  name: string;
  required: boolean;
  order: number;
}

export interface Template {
  id: string;
  name: string;
  sections: TemplateSection[];
}

export interface Rule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  priority: number; // 1-10, higher = more important
  checkType: RuleCheckType;
  pattern?: string;
  message?: string;
  suggestions?: string[];
}

export enum RuleCategory {
  STRUCTURE = "STRUCTURE",
  CONTENT = "CONTENT",
  PEDAGOGY = "PEDAGOGY",
  FORMAT = "FORMAT",
  LANGUAGE = "LANGUAGE",
}

export enum RuleSeverity {
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFO = "INFO",
}

export enum RuleCheckType {
  HEADING = "HEADING",
  NUMBERING = "NUMBERING",
  FORMAT = "FORMAT",
  ORDER = "ORDER",
  STYLE = "STYLE",
}

// ============================================
// REVIEW CONTEXT TYPES
// ============================================

export interface ActivityReviewContext {
  activityId: string;
  activityCode: string;
  activityTitle: string;
  sectionCode: string;
  sectionName: string;
  paragraphs: DocumentParagraph[];
  knowledge?: string;
  teachingIntent?: string;
  expectedTeacherActions?: string;
  expectedStudentActions?: string;
  expectedOutcome?: string;
  rules: Rule[];
  confidence: number;
  matchedBy: string[];
}

// ============================================
// PAYLOAD TYPES
// ============================================

export interface ActivityPayload {
  activityId: string;
  activityCode: string;
  activityTitle: string;
  sectionName: string;
  content: {
    paragraphs: string[];
    knowledge?: string;
    teachingIntent?: string;
    expectedTeacherActions?: string;
    expectedStudentActions?: string;
    expectedOutcome?: string;
  };
  rules: RulePayload[];
  metadata: {
    confidence: number;
    matchedBy: string[];
    chunkIndex?: number;
    totalChunks?: number;
  };
}

export interface RulePayload {
  code: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  priority: number;
  message?: string;
  suggestions?: string[];
}

export interface ActivityChunk {
  chunkIndex: number;
  totalChunks: number;
  paragraphs: string[];
  rules: RulePayload[];
  metadata: {
    confidence: number;
    matchedBy: string[];
  };
}

// ============================================
// REVIEW JOB TYPES
// ============================================

export interface ReviewJob {
  jobId: string;
  lessonPlanId: string;
  activities: ActivityReviewContext[];
  createdAt: Date;
}

export interface ActivityReviewData {
  activityId: string;
  activityCode: string;
  activityTitle: string;
  sectionName: string;
  chunks: ActivityChunk[];
  originalParagraphs: string[];
  estimatedTokens: number;
  characterCount: number;
}

export interface ReviewJobOutput {
  job: ReviewJob;
  activities: ActivityReviewData[];
  statistics: ReviewStatistics;
}

export interface ReviewStatistics {
  activityCount: number;
  chunkCount: number;
  totalEstimatedTokens: number;
  averageChunkSize: number;
  totalCharacterCount: number;
  rulesApplied: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  unknownCount: number;
}

// ============================================
// CONFIGURATION
// ============================================

export interface ReviewContextConfig {
  maxTokensPerChunk: number;
  maxCharactersPerChunk: number;
  chunkOverlap: number;
  minChunkSize: number;
  confidenceThresholdHigh: number;
  confidenceThresholdMedium: number;
  enableOptimization: boolean;
  enableChunking: boolean;
}

export const DEFAULT_REVIEW_CONTEXT_CONFIG: ReviewContextConfig = {
  maxTokensPerChunk: 4000,
  maxCharactersPerChunk: 15000,
  chunkOverlap: 200,
  minChunkSize: 500,
  confidenceThresholdHigh: 80,
  confidenceThresholdMedium: 50,
  enableOptimization: true,
  enableChunking: true,
};

// ============================================
// PAYLOAD STATISTICS
// ============================================

export interface PayloadStatistics {
  activityId: string;
  estimatedTokens: number;
  characterCount: number;
  chunkCount: number;
  isChunked: boolean;
}

export interface OverallPayloadStatistics {
  totalActivities: number;
  totalChunks: number;
  totalEstimatedTokens: number;
  totalCharacterCount: number;
  averageTokensPerActivity: number;
  averageCharactersPerActivity: number;
  payloadSizeKB: number;
}
