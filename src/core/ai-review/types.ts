/**
 * AI Review Engine Types
 *
 * Phase 4: Types for AI Review Engine
 */

// ============================================
// ENUMS
// ============================================

export enum ReviewStatus {
  PENDING = "PENDING",
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum IssueSeverity {
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFO = "INFO",
}

export enum ReviewScoreLevel {
  EXCELLENT = "EXCELLENT",   // >= 90
  GOOD = "GOOD",             // >= 80
  NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT", // >= 60
  FAIL = "FAIL",             // < 60
}

export enum GeminiModel {
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_3_FLASH = "gemini-3-flash",
  GEMINI_3_5_FLASH = "gemini-3.5-flash",
  GEMINI_3_1_PRO = "gemini-3.1-pro",
}

export enum QueueStatus {
  IDLE = "IDLE",
  PROCESSING = "PROCESSING",
  PAUSED = "PAUSED",
}

// ============================================
// INPUT/OUTPUT TYPES
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
  category: string;
  severity: string;
  priority: number;
  message?: string;
  suggestions?: string[];
}

// ============================================
// REVIEW RESULT TYPES
// ============================================

export interface ReviewIssue {
  ruleId: string;
  title: string;
  description: string;
  reason: string;
  severity: IssueSeverity;
  paragraphIndex?: number;
  activityId: string;
  confidence: number;
  suggestions?: string[];
}

export interface ActivityReviewResult {
  activityId: string;
  activityCode: string;
  activityTitle: string;
  score: number;
  scoreLevel: ReviewScoreLevel;
  passed: boolean;
  issues: ReviewIssue[];
  reviewTime: number; // milliseconds
  tokensUsed?: number;
}

export interface ReviewSession {
  sessionId: string;
  lessonPlanId: string;
  status: ReviewStatus;
  activities: ActivityReviewResult[];
  startedAt: Date;
  completedAt?: Date;
  totalTokens?: number;
  estimatedCost?: number;
}

// ============================================
// QUEUE TYPES
// ============================================

export interface ReviewJob {
  jobId: string;
  sessionId: string;
  activityId: string;
  payload: ActivityPayload;
  status: ReviewStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: ActivityReviewResult;
}

export interface QueueConfig {
  maxConcurrent: number;
  retryDelay: number;
  maxRetries: number;
  timeout: number;
  enableRetry: boolean;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrent: 3,
  retryDelay: 1000,
  maxRetries: 3,
  timeout: 30000,
  enableRetry: true,
};

// ============================================
// GEMINI CONFIG
// ============================================

export interface GeminiConfig {
  model: GeminiModel;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
}

export const DEFAULT_GEMINI_CONFIG: GeminiConfig = {
  model: GeminiModel.GEMINI_3_5_FLASH,
  maxTokens: 8192,
  temperature: 0.1,
  topP: 0.95,
  topK: 40,
};

// ============================================
// SCORE CONFIG
// ============================================

export interface ScoreConfig {
  excellentThreshold: number;
  goodThreshold: number;
  needsImprovementThreshold: number;
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  excellentThreshold: 90,
  goodThreshold: 80,
  needsImprovementThreshold: 60,
};

// ============================================
// REVIEW ENGINE CONFIG
// ============================================

export interface AIReviewEngineConfig {
  gemini: GeminiConfig;
  queue: QueueConfig;
  score: ScoreConfig;
  enableCache: boolean;
  cacheTTL: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

export const DEFAULT_REVIEW_ENGINE_CONFIG: AIReviewEngineConfig = {
  gemini: DEFAULT_GEMINI_CONFIG,
  queue: DEFAULT_QUEUE_CONFIG,
  score: DEFAULT_SCORE_CONFIG,
  enableCache: true,
  cacheTTL: 3600000,
  logLevel: "info",
};

// ============================================
// CACHE TYPES
// ============================================

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
}

// ============================================
// LOGGING TYPES
// ============================================

export interface ReviewLog {
  id: string;
  sessionId: string;
  activityId: string;
  timestamp: Date;
  type: "prompt" | "response" | "retry" | "error" | "info";
  message: string;
  data?: Record<string, unknown>;
  latency?: number;
  tokens?: number;
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface ReviewStatistics {
  sessionId: string;
  totalActivities: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  averageScore: number;
  totalReviewTime: number;
  averageReviewTime: number;
  totalTokens: number;
  estimatedCost: number;
  cacheHits: number;
  cacheMisses: number;
  retries: number;
  failedActivities: string[];
}

// ============================================
// VALIDATOR TYPES
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ReviewResponseSchema {
  activityId: string;
  score: number;
  passed: boolean;
  comments?: string;
  issues: Array<{
    ruleId: string;
    title: string;
    description: string;
    reason: string;
    severity: "ERROR" | "WARNING" | "INFO";
    paragraphIndex?: number;
    suggestions?: string[];
  }>;
}
