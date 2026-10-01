/**
 * AI Suggestion Engine Types
 *
 * Phase 8: Types for AI Suggestion Engine
 */

// ============================================
// ENUMS
// ============================================

export enum SuggestionStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  CONFLICT = "CONFLICT",
  EXPIRED = "EXPIRED",
}

export enum PatchOperation {
  REPLACE = "replace",
  INSERT_BEFORE = "insertBefore",
  INSERT_AFTER = "insertAfter",
  DELETE = "delete",
  SPLIT_PARAGRAPH = "splitParagraph",
  MERGE_PARAGRAPH = "mergeParagraph",
}

export enum SuggestionGroupBy {
  SECTION = "SECTION",
  ACTIVITY = "ACTIVITY",
  SEVERITY = "SEVERITY",
  RULE = "RULE",
}

export enum ConflictType {
  CONTENT_CHANGED = "CONTENT_CHANGED",
  PARAGRAPH_DELETED = "PARAGRAPH_DELETED",
  PARAGRAPH_MOVED = "PARAGRAPH_MOVED",
  PARAGRAPH_SPLIT = "PARAGRAPH_SPLIT",
  PARAGRAPH_MERGED = "PARAGRAPH_MERGED",
}

// ============================================
// CORE TYPES
// ============================================

export interface ParagraphRef {
  paragraphId: string;
  activityId: string;
  sectionId: string;
  index: number;
  text: string;
}

export interface RuleRef {
  ruleId: string;
  ruleName: string;
  category: string;
  severity: "ERROR" | "WARNING" | "INFO";
  priority: number;
}

// ============================================
// SUGGESTION TYPES
// ============================================

export interface Suggestion {
  suggestionId: string;
  sessionId: string;
  reviewId: string;

  // References
  paragraphId: string;
  activityId: string;
  activityTitle: string;
  sectionId: string;
  sectionTitle: string;

  // Rule that triggered this suggestion
  rule: RuleRef;

  // Patch details
  operation: PatchOperation;
  oldText: string;
  newText: string;
  reason: string;
  confidence: number;

  // Metadata
  createdAt: Date;
  expiresAt?: Date;

  // Status
  status: SuggestionStatus;
}

// ============================================
// PATCH TYPES
// ============================================

export interface Patch {
  patchId: string;
  suggestionId: string;
  sessionId: string;

  // Target
  paragraphId: string;
  activityId: string;
  sectionId: string;

  // Rule reference
  ruleId: string;
  ruleName: string;

  // Operation
  operation: PatchOperation;
  oldText: string;
  newText: string;

  // Reason
  reason: string;
  confidence: number;

  // Status
  status: SuggestionStatus;

  // Timestamps
  createdAt: Date;
  appliedAt?: Date;
  rejectedAt?: Date;
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PatchValidationResult extends ValidationResult {
  patch: Patch;
  isValid: boolean;
  canApply: boolean;
}

// ============================================
// CONFLICT TYPES
// ============================================

export interface Conflict {
  conflictId: string;
  patchId: string;
  sessionId: string;

  // Conflict details
  type: ConflictType;
  description: string;

  // Original expected state
  expectedParagraphId: string;
  expectedText: string;

  // Current state (after user edit)
  currentParagraphId?: string;
  currentText?: string;

  // Resolution
  resolved: boolean;
  resolution?: "REAPPLIED" | "DISCARDED" | "REGENERATED";

  createdAt: Date;
  resolvedAt?: Date;
}

// ============================================
// GROUPING TYPES
// ============================================

export interface SuggestionGroup {
  key: string;
  label: string;
  type: "section" | "activity" | "severity" | "rule";
  suggestions: Suggestion[];
  count: number;
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface SuggestionStatistics {
  sessionId: string;
  totalSuggestions: number;
  accepted: number;
  rejected: number;
  pending: number;
  conflicts: number;

  // By severity
  errorCount: number;
  warningCount: number;
  infoCount: number;

  // By rule
  rulesTriggered: Map<string, number>;

  // Processing
  averageConfidence: number;
  generatedAt: Date;
}

// ============================================
// INPUT TYPES
// ============================================

export interface SuggestionEngineInput {
  sessionId: string;
  reviewId: string;

  // From Review Context
  activities: ActivityInput[];

  // From Review Result
  issues: ReviewIssueInput[];

  // Rules
  rules: RuleRef[];
}

export interface ActivityInput {
  activityId: string;
  activityCode: string;
  activityTitle: string;
  sectionId: string;
  sectionTitle: string;
  paragraphs: ParagraphInput[];
}

export interface ParagraphInput {
  paragraphId: string;
  index: number;
  text: string;
  headingLevel?: number;
  numbering?: string;
}

export interface ReviewIssueInput {
  issueId: string;
  ruleId: string;
  activityId: string;
  paragraphIndex?: number;
  title: string;
  description: string;
  reason: string;
  severity: "ERROR" | "WARNING" | "INFO";
  confidence: number;
  suggestions?: string[];
}

// ============================================
// OUTPUT TYPES
// ============================================

export interface SuggestionEngineOutput {
  sessionId: string;
  reviewId: string;
  suggestions: Suggestion[];
  statistics: SuggestionStatistics;
  conflicts: Conflict[];
  generatedAt: Date;
}

// ============================================
// CONFIG TYPES
// ============================================

export interface SuggestionEngineConfig {
  enableConflictDetection: boolean;
  conflictCheckInterval: number; // ms
  suggestionExpirationDays: number;
  maxSuggestionsPerActivity: number;
  minConfidenceThreshold: number;
}

export const DEFAULT_SUGGESTION_ENGINE_CONFIG: SuggestionEngineConfig = {
  enableConflictDetection: true,
  conflictCheckInterval: 5000,
  suggestionExpirationDays: 30,
  maxSuggestionsPerActivity: 20,
  minConfidenceThreshold: 0.5,
};
