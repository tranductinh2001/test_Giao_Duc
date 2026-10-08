// Rule Types

import { ReviewSeverity, ReviewType } from './review';

export type RulePriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RuleExample {
  input: string;
  expected: string;
  isCorrect: boolean;
}

export interface Rule {
  ruleId: string;
  name: string;
  description: string;
  priority: RulePriority;
  enabled: boolean;
  prompt: string;
  examples?: {
    correct: RuleExample[];
    incorrect: RuleExample[];
  };
  categories?: string[];
  relatedRules?: string[];
}

export interface RuleEvaluationResult {
  ruleId: string;
  pass: boolean;
  score: number;
  maxScore: number;
  issues: RuleIssue[];
  details: string;
}

export interface RuleIssue {
  targetId: string;
  targetType: 'paragraph' | 'table_cell' | 'section' | 'activity';
  severity: ReviewSeverity;
  type: ReviewType;
  message: string;
  suggestion?: string;
  quote?: string;
  errorDetail?: string;
  suggestionExample?: string;
}

export interface RuleRegistry {
  rules: Rule[];
  categories: string[];
  getRule: (ruleId: string) => Rule | undefined;
  getRulesByCategory: (category: string) => Rule[];
  getRulesByPriority: (priority: RulePriority) => Rule[];
  getEnabledRules: () => Rule[];
}

export interface GradingRubric {
  totalPoints: number;
  categories: RubricCategory[];
}

export interface RubricCategory {
  name: string;
  points: number;
  criteria: string[];
  subCategories?: RubricCategory[];
}

export interface GradingResult {
  totalScore: number;
  maxScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categoryScores: {
    [categoryName: string]: {
      score: number;
      maxScore: number;
      detail: string;
    };
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}
