// Review Types

import { TargetType } from './annotation';

export type ReviewSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type ReviewType =
  | 'MISSING_REQUIREMENT'
  | 'UNCLEAR_INSTRUCTION'
  | 'INCONSISTENT'
  | 'INCOMPLETE'
  | 'INCORRECT'
  | 'SUGGESTION'
  | 'BEST_PRACTICE'
  | 'COMPLIANCE'
  | 'FORMAT'
  | 'STYLE';

export interface Review {
  reviewId: string;
  ruleId: string;
  targetId: string;
  targetType: TargetType;
  severity: ReviewSeverity;
  type: ReviewType;
  message: string;
  suggestion?: string;
  quote?: string;
  errorDetail?: string;
  suggestionExample?: string;
  confidence: number;
  createdAt: string;
}

export interface ReviewGroup {
  severity: ReviewSeverity;
  count: number;
  reviews: Review[];
}

export interface ReviewSummary {
  totalReviews: number;
  bySeverity: Record<ReviewSeverity, number>;
  byType: Record<ReviewType, number>;
  groups: ReviewGroup[];
}

export interface CategoryScoreDetail {
  name?: string;
  score: number;
  maxScore: number;
  detail: string;
}

export interface RubricEvaluation {
  totalScore: number;
  maxTotalScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | string;
  categoryScores: {
    muc_tieu: CategoryScoreDetail;
    hoat_dong: CategoryScoreDetail;
    gv_action: CategoryScoreDetail;
    hs_action: CategoryScoreDetail;
    phuong_tien: CategoryScoreDetail;
    danh_gia: CategoryScoreDetail;
    [key: string]: CategoryScoreDetail;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

