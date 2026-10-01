/**
 * Workflow Orchestrator Types
 *
 * Phase 5: Types for connecting all phases into unified pipeline
 */

// ============================================
// ENUMS
// ============================================

export enum WorkflowStatus {
  UPLOADED = "UPLOADED",
  PARSING = "PARSING",
  MAPPING = "MAPPING",
  BUILDING_CONTEXT = "BUILDING_CONTEXT",
  AI_REVIEWING = "AI_REVIEWING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  PAUSED = "PAUSED",
}

export enum WorkflowEvent {
  DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED",
  PARSER_STARTED = "PARSER_STARTED",
  PARSER_COMPLETED = "PARSER_COMPLETED",
  PARSER_FAILED = "PARSER_FAILED",
  MAPPING_STARTED = "MAPPING_STARTED",
  MAPPING_COMPLETED = "MAPPING_COMPLETED",
  MAPPING_FAILED = "MAPPING_FAILED",
  CONTEXT_BUILDING_STARTED = "CONTEXT_BUILDING_STARTED",
  CONTEXT_BUILDING_COMPLETED = "CONTEXT_BUILDING_COMPLETED",
  CONTEXT_BUILDING_FAILED = "CONTEXT_BUILDING_FAILED",
  REVIEW_STARTED = "REVIEW_STARTED",
  REVIEW_COMPLETED = "REVIEW_COMPLETED",
  REVIEW_FAILED = "REVIEW_FAILED",
  WORKFLOW_COMPLETED = "WORKFLOW_COMPLETED",
  WORKFLOW_FAILED = "WORKFLOW_FAILED",
  WORKFLOW_CANCELLED = "WORKFLOW_CANCELLED",
  WORKFLOW_RESUMED = "WORKFLOW_RESUMED",
  WORKFLOW_PAUSED = "WORKFLOW_PAUSED",
}

// Step keys for workflow
export type WorkflowStepKey = "UPLOADED" | "PARSING" | "MAPPING" | "BUILDING_CONTEXT" | "AI_REVIEWING" | "COMPLETED";

// ============================================
// INTERFACES
// ============================================

export interface DocumentSession {
  sessionId: string;
  userId: string;
  documentId?: string;
  templateId?: string;
  lessonId?: string;
  status: WorkflowStatus;
  currentStep: WorkflowStep;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface WorkflowStep {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  data?: Record<string, unknown>;
}

export interface WorkflowProgress {
  sessionId: string;
  status: WorkflowStatus;
  progress: number;
  currentStep: string;
  steps: WorkflowStepProgress[];
}

export interface WorkflowStepProgress {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  message?: string;
}

// ============================================
// PIPELINE DATA
// ============================================

export interface ParserOutput {
  document: unknown; // DocumentStructure from Phase 1
  metadata: {
    fileName: string;
    fileSize: number;
    parseTime: number;
  };
}

export interface MappingOutput {
  mappingResult: unknown; // MappingResult from Phase 2
  statistics: {
    totalSections: number;
    matchedActivities: number;
    unknownActivities: number;
    averageConfidence: number;
  };
}

export interface ContextOutput {
  job: unknown; // ReviewJob from Phase 3
  activities: unknown[]; // ActivityReviewData[]
  statistics: {
    totalActivities: number;
    totalChunks: number;
    estimatedTokens: number;
  };
}

export interface ReviewOutput {
  session: unknown; // ReviewSession from Phase 4
  statistics: unknown; // ReviewStatistics from Phase 4
}

// ============================================
// WORKFLOW RESULT
// ============================================

export interface WorkflowResult {
  sessionId: string;
  status: WorkflowStatus;
  progress: number;
  results: {
    parser?: ParserOutput;
    mapping?: MappingOutput;
    context?: ContextOutput;
    review?: ReviewOutput;
  };
  statistics: {
    totalDuration: number;
    stepsCompleted: number;
    totalSteps: number;
    tokensUsed?: number;
    estimatedCost?: number;
  };
  error?: string;
}

// ============================================
// CONFIG
// ============================================

export interface WorkflowConfig {
  // Parser config
  parser: {
    maxFileSize: number;
    allowedExtensions: string[];
    timeout: number;
    enableRetry: boolean;
    maxRetries: number;
  };

  // Mapping config
  mapping: {
    confidenceThresholdHigh: number;
    confidenceThresholdMedium: number;
    enableCache: boolean;
    timeout: number;
    enableRetry: boolean;
    maxRetries: number;
  };

  // Context config
  context: {
    maxTokensPerChunk: number;
    maxCharactersPerChunk: number;
    enableOptimization: boolean;
    enableChunking: boolean;
    timeout: number;
  };

  // AI Review config
  review: {
    geminiModel: string;
    maxConcurrent: number;
    retryDelay: number;
    maxRetries: number;
    timeout: number;
    enableCache: boolean;
    cacheTTL: number;
  };

  // Global config
  global: {
    enableResume: boolean;
    logLevel: "debug" | "info" | "warn" | "error";
    saveIntermediateResults: boolean;
  };
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  parser: {
    maxFileSize: 30 * 1024 * 1024, // 30MB - uses DOC limit from file-validator
    allowedExtensions: [".docx", ".doc"],
    timeout: 60000,
    enableRetry: true,
    maxRetries: 3,
  },
  mapping: {
    confidenceThresholdHigh: 80,
    confidenceThresholdMedium: 50,
    enableCache: true,
    timeout: 120000,
    enableRetry: true,
    maxRetries: 3,
  },
  context: {
    maxTokensPerChunk: 4000,
    maxCharactersPerChunk: 15000,
    enableOptimization: true,
    enableChunking: true,
    timeout: 30000,
  },
  review: {
    geminiModel: "gemini-3.5-flash",
    maxConcurrent: 3,
    retryDelay: 1000,
    maxRetries: 3,
    timeout: 30000,
    enableCache: true,
    cacheTTL: 3600000,
  },
  global: {
    enableResume: true,
    logLevel: "info",
    saveIntermediateResults: true,
  },
};

// ============================================
// EVENT SYSTEM
// ============================================

export type WorkflowEventHandler = (event: WorkflowEventPayload) => void;

export interface WorkflowEventPayload {
  event: WorkflowEvent;
  sessionId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================
// LOGGING
// ============================================

export interface WorkflowLogEntry {
  id: string;
  sessionId: string;
  step: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  duration?: number;
  status: "started" | "completed" | "failed";
  error?: string;
  data?: Record<string, unknown>;
  tokens?: number;
  cost?: number;
}

// ============================================
// API TYPES
// ============================================

export interface StartReviewRequest {
  userId: string;
  document?: {
    fileName: string;
    content: Buffer | string;
  };
  templateId?: string;
  lessonId?: string;
  config?: Partial<WorkflowConfig>;
}

export interface StartReviewResponse {
  sessionId: string;
  status: WorkflowStatus;
  progress: number;
}

export interface SessionStatusResponse {
  sessionId: string;
  status: WorkflowStatus;
  progress: number;
  currentStep: string;
  steps: WorkflowStepProgress[];
  results?: {
    parser?: ParserOutput;
    mapping?: MappingOutput;
    context?: ContextOutput;
    review?: ReviewOutput;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ResumeResponse {
  sessionId: string;
  status: WorkflowStatus;
  message: string;
}
