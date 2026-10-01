/**
 * DocumentIRToReviewAdapter
 *
 * Converts DocumentIR to format expected by Review Engine.
 */

import {
  DocumentIR,
  SemanticLabel,
  CoverageReport
} from './DocumentIR';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * Review Engine format
 */
export interface ReviewInput {
  sections: ReviewSection[];
  activities: ReviewActivity[];
  metadata: ReviewMetadata;
  coverage: ReviewCoverage;
}

export interface ReviewSection {
  id: string;
  title: string;
  type: string;
  order: number;
}

export interface ReviewActivity {
  id: string;
  title: string;
  type: string;
  order: number;
  duration?: string;
  paragraphs: ReviewParagraph[];
}

export interface ReviewParagraph {
  id: string;
  content: string;
  semanticType: string;
  confidence: number;
}

export interface ReviewMetadata {
  sourceFile: string;
  totalPages: number;
  totalParagraphs: number;
  processingTimeMs: number;
}

export interface ReviewCoverage {
  total: number;
  labeled: number;
  percent: number;
  typeDistribution: Record<string, number>;
}

/**
 * Convert DocumentIR to Review format
 */
export function documentIRToReview(docIR: DocumentIR): ReviewInput {
  logger.info('[DocumentIRToReviewAdapter] Converting to Review format...');

  // Convert sections
  const sections: ReviewSection[] = docIR.sections.map(s => ({
    id: s.id,
    title: s.title,
    type: s.type,
    order: s.order
  }));

  // Create paragraph index map
  const paragraphMap = new Map<string, number>();
  docIR.paragraphs.forEach((p, idx) => {
    paragraphMap.set(p.id, idx);
  });

  // Convert activities with paragraphs
  const activities: ReviewActivity[] = docIR.activities.map(a => {
    // Get paragraphs for this activity
    const paragraphs: ReviewParagraph[] = a.paragraphIds.map(paraId => {
      const para = docIR.paragraphs.find(p => p.id === paraId);
      const label = docIR.semanticLabels.find(l => l.paragraphId === paraId);

      return {
        id: paraId,
        content: para?.content || '',
        semanticType: label?.type || 'UNKNOWN',
        confidence: label?.confidence || 0
      };
    });

    return {
      id: a.id,
      title: a.title,
      type: a.type,
      order: a.order,
      duration: a.duration,
      paragraphs
    };
  });

  // Convert coverage
  const coverage: ReviewCoverage = {
    total: docIR.coverage.totalParagraphs,
    labeled: docIR.coverage.labeledParagraphs,
    percent: docIR.coverage.coveragePercent,
    typeDistribution: docIR.coverage.typeDistribution as Record<string, number>
  };

  // Convert metadata
  const metadata: ReviewMetadata = {
    sourceFile: docIR.metadata.sourceFile,
    totalPages: docIR.metadata.totalPages,
    totalParagraphs: docIR.coverage.totalParagraphs,
    processingTimeMs: docIR.metadata.processingTimeMs
  };

  return {
    sections,
    activities,
    metadata,
    coverage
  };
}

/**
 * Extract specific semantic type paragraphs
 */
export function getParagraphsByType(
  docIR: DocumentIR,
  type: string
): { paragraph: any; label: SemanticLabel }[] {
  return docIR.semanticLabels
    .filter(l => l.type === type)
    .map(label => {
      const paragraph = docIR.paragraphs.find(p => p.id === label.paragraphId);
      return { paragraph, label };
    })
    .filter(item => item.paragraph !== undefined);
}

/**
 * Get all teacher actions
 */
export function getTeacherActions(docIR: DocumentIR) {
  return getParagraphsByType(docIR, 'TEACHER_ACTION');
}

/**
 * Get all student actions
 */
export function getStudentActions(docIR: DocumentIR) {
  return getParagraphsByType(docIR, 'STUDENT_ACTION');
}

/**
 * Get all learning outcomes
 */
export function getLearningOutcomes(docIR: DocumentIR) {
  return getParagraphsByType(docIR, 'LEARNING_OUTCOME');
}

/**
 * Get all questions
 */
export function getQuestions(docIR: DocumentIR) {
  return getParagraphsByType(docIR, 'QUESTION');
}

/**
 * Get all assessments
 */
export function getAssessments(docIR: DocumentIR) {
  return getParagraphsByType(docIR, 'ASSESSMENT');
}

/**
 * Convert coverage to review format
 */
export function coverageToReview(coverage: CoverageReport): ReviewCoverage {
  return {
    total: coverage.totalParagraphs,
    labeled: coverage.labeledParagraphs,
    percent: coverage.coveragePercent,
    typeDistribution: coverage.typeDistribution as Record<string, number>
  };
}
