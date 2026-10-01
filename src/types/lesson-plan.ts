// Lesson Plan Review Module Types
// Auto-generated from Prisma schema

export type LessonPlanStatus =
  | "UPLOADED"
  | "PARSING"
  | "PARSED"
  | "REVIEWING"
  | "REVIEWED"
  | "EDITING"
  | "COMPLETED"
  | "FAILED";

export type SectionType =
  | "HEADER"
  | "OBJECTIVES"
  | "PREPARATION"
  | "TEACHING_EQUIPMENT"
  | "LEARNING_MATERIALS"
  | "WARM_UP"
  | "KNOWLEDGE_FORMATION"
  | "PRACTICE"
  | "APPLICATION"
  | "EVALUATION"
  | "HOMEWORK"
  | "TEACHING_PROCESS"
  | "APPENDIX"
  | "OTHER";

export type ContentType = "TEXT" | "TABLE" | "LIST" | "IMAGE";

export type ReviewStatus = "DRAFT" | "COMPLETED" | "ACCEPTED" | "REJECTED";

export type AnnotationType =
  | "COMMENT"
  | "WARNING"
  | "SUGGESTION"
  | "ERROR"
  | "IMPROVEMENT";

export type Severity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type AnnotationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "RESOLVED";

export type AIRequestType = "PARSE" | "REVIEW" | "ANNOTATE" | "SUGGEST";

export type AIRequestStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CACHED";

export type ExportFormat = "DOCX" | "PDF";

export type ReviewActionType =
  | "CREATED"
  | "PARSED"
  | "REVIEWED"
  | "EDITED"
  | "ANNOTATION_ADDED"
  | "ANNOTATION_ACCEPTED"
  | "ANNOTATION_REJECTED"
  | "EXPORTED"
  | "COMPLETED"
  | "FAILED";

// API Request/Response types

export interface UploadLessonPlanRequest {
  title?: string;
  subject?: string;
  gradeLevel?: string;
  schoolYear?: string;
}

export interface StartReviewRequest {
  ruleSetId?: string;
  forceReview?: boolean;
}

export interface UpdateSectionRequest {
  content: string;
  changeNote?: string;
}

export interface AcceptAnnotationRequest {
  reason?: string;
}

export interface RejectAnnotationRequest {
  reason: string;
}

export interface ExportRequest {
  format: ExportFormat;
  includeAnnotations?: boolean;
  includeTrackChanges?: boolean;
}

export interface CreateRuleSetRequest {
  name: string;
  description?: string;
  code: string;
  version?: string;
  scope?: string;
}

export interface CreateRuleRequest {
  ruleCode: string;
  ruleName: string;
  description?: string;
  category?: string;
  severity?: Severity;
  priority?: number;
  applicableSections?: string[];
  aiPrompt: string;
  validationCriteria?: Record<string, any>;
  correctExamples?: string;
  incorrectExamples?: string;
}

// Response types

export interface LessonPlanResponse {
  id: string;
  userId: string;
  title: string;
  subject?: string;
  gradeLevel?: string;
  schoolYear?: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  status: LessonPlanStatus;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  reviewSummary?: ReviewSummary;
}

export interface ReviewSummary {
  reviewResultId: string;
  ruleSetCode: string;
  ruleSetName: string;
  overallScore?: number;
  totalIssues: number;
  criticalIssues: number;
  errorIssues: number;
  warningIssues: number;
  reviewStatus: ReviewStatus;
  reviewedAt?: string;
}

export interface SectionResponse {
  id: string;
  lessonPlanId: string;
  versionNumber: number;
  sectionType: string;
  sectionTitle?: string;
  sectionOrder: number;
  contentType: ContentType;
  rawContent: string;
  parsedContent?: Record<string, any>;
  wordCount?: number;
  charCount?: number;
  annotationCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewResultResponse {
  id: string;
  lessonPlanId: string;
  ruleSetId: string | null;
  ruleSetName: string | null;
  ruleSetCode: string | null;
  overallScore?: number;
  issueSummary: {
    total: number;
    critical: number;
    error: number;
    warning: number;
    info: number;
  };
  strengths: string[];
  weaknesses: string[];
  missingContent: string[];
  suggestions: string[];
  status: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  sectionReviews: SectionReviewSummary[];
}

export interface SectionReviewSummary {
  sectionId: string;
  sectionTitle?: string;
  sectionType: string;
  annotationCount: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
}

export interface AnnotationResponse {
  id: string;
  reviewResultId: string;
  sectionId: string;
  ruleId?: string;
  ruleCode?: string;
  ruleName?: string;
  annotationType: AnnotationType;
  severity: Severity;
  position: {
    startPosition: number;
    endPosition: number;
  };
  highlightedText?: string;
  message: string;
  explanation?: string;
  suggestion?: string;
  proposedContent?: string;
  status: AnnotationStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ReviewStatusResponse {
  status: LessonPlanStatus;
  progress: number;
  currentSection?: string;
  processedSections: number;
  totalSections: number;
  message?: string;
}

export interface ExportStatusResponse {
  exportId: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  downloadUrl?: string;
  error?: string;
}

export interface RuleSetResponse {
  id: string;
  name: string;
  description?: string;
  code: string;
  version: string;
  scope?: string;
  isActive: boolean;
  isDefault: boolean;
  ruleCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RuleResponse {
  id: string;
  ruleSetId: string;
  ruleCode: string;
  ruleName: string;
  description?: string;
  category?: string;
  severity: Severity;
  priority: number;
  applicableSections?: string[];
  aiPrompt: string;
  validationCriteria?: Record<string, any>;
  correctExamples?: string;
  incorrectExamples?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Gemini AI types

export interface GeminiReviewAnalysis {
  sectionAnalysis: {
    hasRequiredComponents: boolean;
    missingComponents: string[];
    structureScore: number;
    contentScore: number;
    formatScore: number;
  };
  findings: GeminiFinding[];
  strengths: string[];
  weaknesses: string[];
  overallAssessment: string;
  overallScore: number;
}

export interface GeminiFinding {
  ruleCode: string;
  severity: Severity;
  position: {
    startChar: number;
    endChar: number;
  };
  highlightedText: string;
  issue: string;
  explanation: string;
  suggestion: string;
  proposedContent?: string;
}

// Utility types

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}
