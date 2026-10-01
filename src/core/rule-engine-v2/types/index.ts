/**
 * Rule Engine v2.0 - Core Types
 *
 * Template-driven, rule-based parsing system with AI fallback
 */

// ============================================================================
// Enums
// ============================================================================

export type RuleSeverity = 'ERROR' | 'WARNING' | 'INFO';
export type ParserType = 'KEYWORD' | 'REGEX' | 'FUZZY';
export type StructureCheckType = 'HEADING' | 'NUMBERING' | 'FORMAT' | 'ORDER' | 'STYLE';
export type ContentCheckType = 'PRESENCE' | 'QUALITY' | 'COMPLETENESS';
export type FixType = 'TEMPLATE' | 'AI_ASSISTED' | 'MANUAL';
export type FeedbackType = 'CORRECT' | 'INCORRECT' | 'IMPROVED';

// ============================================================================
// Template Types
// ============================================================================

export interface RuleTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  sections: TemplateSection[];
  parserRules: ParserRule[];
  structureRules: StructureRule[];
  contentRules: ContentRule[];
  fixRules: FixRule[];
  scoringRules: ScoringRule[];
}

export interface TemplateSection {
  id: string;
  templateId: string;
  code: string;
  name: string;
  aliases?: string[];  // Alternative names for section matching
  order: number;
  isRequired: boolean;
  isRepeatable: boolean;
  numberingStyle?: string;
  headingLevel?: number;
}

// ============================================================================
// Rule Types
// ============================================================================

export interface ParserRule {
  id: string;
  templateId: string;
  sectionId: string;
  sectionCode?: string; // Added: CODE from template section (e.g., "MUC_TIEU"), not UUID
  type: ParserType;
  pattern: string;
  priority: number;
  ignoreCase: boolean;
  ignoreAccent: boolean;
  ignoreSpace: boolean;
  normalizeText: boolean;
  fuzzyThreshold?: number;
  aliases: string[];
  isActive: boolean;
  confidence: number;
  learnedFromAI: boolean;
  usageCount: number;
  successCount: number;
}

export interface StructureRule {
  id: string;
  templateId: string;
  sectionId?: string;
  sectionCode?: string; // Added: CODE from template section
  code: string;
  name: string;
  description?: string;
  type: StructureCheckType;
  severity: RuleSeverity;
  expectedValue?: any;
  allowedValues?: any;
  penaltyScore: number;
  errorMessage?: string;
  suggestionText?: string;
  isActive: boolean;
}

export interface ContentRule {
  id: string;
  templateId: string;
  sectionId: string;
  sectionCode?: string; // Added: CODE from template section (e.g., "MUC_TIEU"), not UUID
  code: string;
  name: string;
  description?: string;
  checkType: ContentCheckType;
  severity: RuleSeverity;
  systemPrompt: string;
  userPrompt: string;
  criteria?: any;
  penaltyScore: number;
  useAI: boolean;
  aiModel: string;
  maxTokens?: number;
  temperature?: number;
  isActive: boolean;
}

export interface FixRule {
  id: string;
  templateId: string;
  code: string;
  name: string;
  description?: string;
  issueType: string;
  issueSeverity: RuleSeverity;
  fixType: FixType;
  fixTemplate?: string;
  aiPrompt?: string;
  aiModel?: string;
  instructions?: string;
  autoApply: boolean;
  requiresApproval: boolean;
  isActive: boolean;
}

export interface ScoringRule {
  id: string;
  templateId: string;
  code: string;
  name: string;
  description?: string;
  issueType: string;
  severity: RuleSeverity;
  penalty: number;
  conditions?: any;
  isActive: boolean;
}

// ============================================================================
// Parse Result Types
// ============================================================================

export interface ParsedSection {
  sectionCode: string;
  sectionName: string;
  content: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  matchedBy: {
    ruleId: string;
    ruleType: ParserType;
    pattern: string;
  };
  aiUsed: boolean;
}

export interface ParserResult {
  success: boolean;
  sections: ParsedSection[];
  unmatchedContent: string[];
  aiCallCount: number;
  parseTime: number;
  errors: string[];
}

// ============================================================================
// Validation Result Types
// ============================================================================

export interface StructureIssue {
  id: string;
  ruleId: string;
  ruleCode: string;
  severity: RuleSeverity;
  message: string;
  suggestion: string | null;
  position: {
    sectionId: string;
    line?: number;
  };
  sectionCode?: string; // Added: section code for matching
  penaltyScore: number;
}

export interface ContentIssue {
  id: string;
  ruleId: string;
  ruleCode: string;
  severity: RuleSeverity;
  message: string;
  explanation: string | null;
  suggestion: string | null;
  position: {
    sectionId: string;
    startOffset?: number;
    endOffset?: number;
  };
  sectionCode?: string; // Added: section code for matching
  penaltyScore: number;
  aiGenerated: boolean;
}

export interface ValidationResult {
  success: boolean;
  structureIssues: StructureIssue[];
  contentIssues: ContentIssue[];
  aiCallCount: number;
  validationTime: number;
}

// ============================================================================
// Fix Types
// ============================================================================

export interface FixSuggestion {
  id: string;
  fixRuleId: string;
  issueId: string;
  fixType: FixType;
  content: string | null;
  instructions: string | null;
  autoApply: boolean;
  requiresApproval: boolean;
  confidence: number;
}

export interface FixResult {
  success: boolean;
  appliedFixes: FixSuggestion[];
  rejectedFixes: FixSuggestion[];
  aiCallCount: number;
  fixTime: number;
}

// ============================================================================
// Score Types
// ============================================================================

export interface ScoreBreakdown {
  structure: number;
  content: number;
  format: number;
}

export interface IssuesSummary {
  errors: number;
  warnings: number;
  info: number;
}

export interface PenaltyDetail {
  ruleCode: string;
  penalty: number;
  count: number;
}

export interface ScoreReport {
  totalScore: number;
  maxScore: number;
  percentage: number;
  breakdown: ScoreBreakdown;
  issuesSummary: IssuesSummary;
  penaltiesApplied: PenaltyDetail[];
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface WorkflowConfig {
  templateId: string;
  skipStructureValidation?: boolean;
  skipContentReview?: boolean;
  autoApplyFixes?: boolean;
  aiModel?: string;
  // BrightOne structured data - if provided, use directly instead of re-parsing
  brightoneStructured?: {
    sections: Array<{
      id?: string;
      title?: string;
      type?: string;
      activities?: Array<{
        id?: string;
        title?: string;
        paragraphs?: Array<{ id?: string; content?: string }>;
        tables?: any[];
        images?: any[];
      }>;
    }>;
  };
  // Circular information for dynamic prompts
  circularId?: string;
  circularCode?: string;
  circularVersion?: number;
  subject?: string;
  gradeLevel?: string;
  // Textbook context for lesson-specific review
  textbookContext?: {
    bookId?: string;
    bookName?: string;
    chapterId?: string;
    chapterTitle?: string;
    startPage?: number;
    endPage?: number;
  };
}

export interface WorkflowResult {
  success: boolean;
  template: RuleTemplate;
  parseResult: ParserResult;
  validationResult: ValidationResult;
  fixResult: FixResult;
  scoreReport: ScoreReport;
  totalAiCalls: number;
  totalTime: number;
  errors: string[];
  // Token and cost tracking
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  estimatedCost?: number;
}

// ============================================================================
// AI Detector Types
// ============================================================================

export interface AISectionDetectionRequest {
  text: string;
  context: string;
  expectedSections: TemplateSection[];
}

export interface AISectionDetectionResult {
  sectionCode: string;
  confidence: number;
  reason: string;
  shouldCreateRule: boolean;
}

// ============================================================================
// Learning Types
// ============================================================================

export interface RuleUsageLog {
  ruleType: string;
  ruleId: string;
  lessonPlanId: string;
  sectionId?: string;
  matched: boolean;
  confidence: number;
  aiUsed: boolean;
  executionTime: number;
  userFeedback?: FeedbackType;
  improvedRuleId?: string;
}

export interface RuleLearningData {
  originalRuleId: string;
  newPattern: string;
  confidence: number;
  basedOnAIDetection: boolean;
  userConfirmed: boolean;
}

// ============================================================================
// Text Processing Types
// ============================================================================

export interface NormalizedText {
  original: string;
  normalized: string;
  metadata: {
    lowercased: boolean;
    accentRemoved: boolean;
    spacesNormalized: boolean;
  };
}

export interface TextSegment {
  text: string;
  startIndex: number;
  endIndex: number;
  metadata?: any;
}
