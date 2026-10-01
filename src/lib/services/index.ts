/**
 * Services Index - Unified Service Exports
 *
 * All business logic services should be exported from here.
 * This is the single source of truth for service imports.
 */

// Core Services
export { CircularService, circularService } from './CircularService';
export { RuleService, ruleService } from './RuleService';
export { PromptService, promptService } from './PromptService';
export { TemplateService, templateService } from './TemplateService';
export { LessonReviewService, lessonReviewService } from './LessonReviewService';

// Re-export types for convenience
export type {
  CreateCircularInput,
  UpdateCircularInput,
  CircularWithVersions,
  CircularVersion,
} from './CircularService';

export type {
  CreateContentRuleInput,
  CreateStructureRuleInput,
  CreateParserRuleInput,
  CreateFixRuleInput,
  ContentRule,
  StructureRule,
  ParserRule,
  FixRule,
} from './RuleService';

export type {
  PromptInput,
  PromptVariableInput,
  Prompt,
  PromptWithUsage,
} from './PromptService';

export type {
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateSectionInput,
  TemplateSection,
  TemplateWithSections,
} from './TemplateService';

export type {
  StartReviewInput,
  ReviewOptionsInput,
  ReviewSession,
  ReviewResult,
  ReviewSuggestion,
  ReviewAnnotation,
} from './LessonReviewService';
