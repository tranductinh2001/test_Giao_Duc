/**
 * Document Editor Integration Types
 *
 * Phase 7.1: Production-ready DocumentEditor
 */

// ============================================
// ENUMS
// ============================================

export enum EditorMode {
  VIEW = "view",
  EDIT = "edit",
  REVIEW = "review",
}

export enum WorkflowProgressStep {
  UPLOADED = "UPLOADED",
  PARSING = "PARSING",
  MAPPING = "MAPPING",
  BUILDING_CONTEXT = "BUILDING_CONTEXT",
  AI_REVIEWING = "AI_REVIEWING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

// ============================================
// DOCUMENT STATE (Separated)
// ============================================

export interface DocumentState {
  documentId: string | null;
  sessionId: string | null;
  lessonPlanId: string | null;
  fileName: string | null;
  fileUrl: string | null;
  isModified: boolean;
  lastSaved: Date | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// WORKFLOW STATE (Separated)
// ============================================

export interface WorkflowState {
  sessionId: string | null;
  status: WorkflowProgressStep;
  progress: number;
  currentStep: string;
  message: string;
  steps: WorkflowStepProgress[];
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

export interface WorkflowStepProgress {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  message?: string;
}

// ============================================
// ANNOTATION STATE (Separated)
// ============================================

export interface AnnotationAnchor {
  paragraphId: string;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  textHash: string;
}

export interface EditorAnnotation {
  annotationId: string;
  activityId: string;
  activityCode: string;
  activityTitle: string;
  sectionId: string;
  sectionName: string;
  paragraphIndex: number;
  anchor?: AnnotationAnchor;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  ruleId: string;
  ruleName: string;
  title: string;
  description: string;
  reason: string;
  suggestions: string[];
  confidence: number;
  status: "OPEN" | "REVIEWED" | "DISMISSED" | "FIXED";
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationState {
  annotations: EditorAnnotation[];
  groups: AnnotationGroup[];
  statistics: AnnotationStatistics;
  selectedAnnotationId: string | null;
  filter: AnnotationFilterType;
  groupBy: GroupByType;
  isLoading: boolean;
  error: string | null;
}

export interface AnnotationGroup {
  key: string;
  label: string;
  type: "section" | "activity" | "severity" | "rule";
  annotations: EditorAnnotation[];
  count: number;
}

export interface AnnotationStatistics {
  totalAnnotations: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  passed: number;
}

export type AnnotationFilterType = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "PASSED";
export type GroupByType = "NONE" | "SECTION" | "ACTIVITY" | "SEVERITY" | "RULE";

// ============================================
// UI STATE (Separated)
// ============================================

export interface UIState {
  mode: EditorMode;
  isAnnotationPanelOpen: boolean;
  isWorkflowPanelOpen: boolean;
  zoom: number;
}

// ============================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================

// Editor State alias for backward compatibility
export interface DocumentEditorState extends DocumentState {
  mode: EditorMode;
}

// Workflow progress state alias for backward compatibility
export interface WorkflowProgressState {
  status: WorkflowProgressStep;
  progress: number;
  currentStep: string;
  message: string;
  steps: WorkflowStepProgress[];
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
}

// Annotation panel state alias for backward compatibility
export interface AnnotationPanelState {
  isOpen: boolean;
  selectedAnnotation: EditorAnnotation | null;
  filter: AnnotationFilterType;
  groupBy: GroupByType;
}

// ============================================
// API REQUEST/RESPONSE
// ============================================

export interface StartReviewRequest {
  lessonPlanId: string;
  sessionId: string;
}

export interface StartReviewResponse {
  success: boolean;
  sessionId: string;
  status: WorkflowProgressStep;
}

export interface GetProgressResponse {
  sessionId: string;
  status: WorkflowProgressStep;
  progress: number;
  currentStep: string;
  message: string;
  steps: WorkflowStepProgress[];
  error?: string;
}

export interface GetAnnotationsResponse {
  sessionId: string;
  annotations: EditorAnnotation[];
  statistics: AnnotationStatistics;
  groups: AnnotationGroup[];
}

export interface UpdateAnnotationStatusRequest {
  annotationId: string;
  status: "OPEN" | "REVIEWED" | "DISMISSED" | "FIXED";
}

export interface UpdateAnnotationStatusResponse {
  success: boolean;
  annotation: EditorAnnotation;
}
