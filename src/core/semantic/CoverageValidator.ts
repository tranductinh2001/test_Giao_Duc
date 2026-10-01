/**
 * CoverageValidator Module
 *
 * Validates that all paragraphs have been labeled.
 * Provides coverage statistics.
 */

import { DocumentIR, SemanticLabel, SemanticTypeId, CoverageReport } from './DocumentIR';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * Coverage Validation Result
 */
export interface CoverageValidationResult {
  isValid: boolean;
  coverage: CoverageReport;
  issues: CoverageIssue[];
}

export interface CoverageIssue {
  type: 'UNLABELED_PARAGRAPHS' | 'LOW_COVERAGE' | 'UNBALANCED_TYPES' | 'MISSING_TYPES';
  message: string;
  paragraphIds?: string[];
  details?: any;
}

/**
 * Calculate coverage report
 */
export function calculateCoverage(
  labels: SemanticLabel[],
  paragraphs: { id: string }[]
): CoverageReport {
  logger.info(`[CoverageValidator] Calculating coverage for ${paragraphs.length} paragraphs`);

  const totalParagraphs = paragraphs.length;
  const labeledParagraphIds = new Set(labels.map(l => l.paragraphId));
  const labeledParagraphs = labeledParagraphIds.size;
  const unlabeledParagraphs = totalParagraphs - labeledParagraphs;

  // Calculate coverage percentage
  const coveragePercent = totalParagraphs > 0
    ? Math.round((labeledParagraphs / totalParagraphs) * 100)
    : 0;

  // Calculate type distribution
  const typeDistribution: Record<SemanticTypeId, number> = {} as Record<SemanticTypeId, number>;
  const typeParagraphIds: Record<SemanticTypeId, string[]> = {} as Record<SemanticTypeId, string[]>;

  labels.forEach(label => {
    typeDistribution[label.type] = (typeDistribution[label.type] || 0) + 1;
    if (!typeParagraphIds[label.type]) {
      typeParagraphIds[label.type] = [];
    }
    typeParagraphIds[label.type].push(label.paragraphId);
  });

  // Get unlabeled paragraph IDs
  const unlabeledIds: string[] = [];
  paragraphs.forEach(p => {
    if (!labeledParagraphIds.has(p.id)) {
      unlabeledIds.push(p.id);
    }
  });

  const report: CoverageReport = {
    totalParagraphs,
    labeledParagraphs,
    unlabeledParagraphs,
    coveragePercent,
    typeDistribution,
    unlabeledIndexes: unlabeledIds.map(id => parseInt(id.replace('p', '')))
  };

  logger.info(`[CoverageValidator] Coverage: ${coveragePercent}% (${labeledParagraphs}/${totalParagraphs})`);

  return report;
}

/**
 * Validate coverage
 */
export function validateCoverage(
  coverage: CoverageReport,
  minCoveragePercent: number = 80
): CoverageValidationResult {
  const issues: CoverageIssue[] = [];

  logger.info(`[CoverageValidator] Validating coverage (min: ${minCoveragePercent}%)`);

  // Check for unlabeled paragraphs
  if (coverage.unlabeledParagraphs > 0) {
    issues.push({
      type: 'UNLABELED_PARAGRAPHS',
      message: `${coverage.unlabeledParagraphs} paragraphs are not labeled`,
      paragraphIds: coverage.unlabeledIndexes.map(i => `p${i}`)
    });
  }

  // Check coverage percentage
  if (coverage.coveragePercent < minCoveragePercent) {
    issues.push({
      type: 'LOW_COVERAGE',
      message: `Coverage ${coverage.coveragePercent}% is below minimum ${minCoveragePercent}%`
    });
  }

  // Check for missing types
  const requiredTypes: SemanticTypeId[] = [
    'TEACHER_ACTION',
    'STUDENT_ACTION',
    'LEARNING_OUTCOME'
  ];

  const missingTypes = requiredTypes.filter(t => !coverage.typeDistribution[t]);

  if (missingTypes.length > 0) {
    issues.push({
      type: 'MISSING_TYPES',
      message: `Missing required types: ${missingTypes.join(', ')}`
    });
  }

  // Check type balance
  const typeCounts = Object.values(coverage.typeDistribution);
  const maxCount = Math.max(...typeCounts, 1);
  const minCount = Math.min(...typeCounts.filter(c => c > 0), maxCount);

  if (minCount < maxCount * 0.1) {
    issues.push({
      type: 'UNBALANCED_TYPES',
      message: 'Type distribution is very unbalanced'
    });
  }

  const isValid = issues.filter(i => i.type === 'UNLABELED_PARAGRAPHS' || i.type === 'LOW_COVERAGE').length === 0;

  logger.info(`[CoverageValidator] Validation: ${isValid ? 'PASSED' : 'FAILED'}`);

  return {
    isValid,
    coverage,
    issues
  };
}

/**
 * Get coverage for specific semantic types
 */
export function getCoverageByType(
  labels: SemanticLabel[],
  type: SemanticTypeId
): { count: number; paragraphIds: string[] } {
  const typeLabels = labels.filter(l => l.type === type);

  return {
    count: typeLabels.length,
    paragraphIds: typeLabels.map(l => l.paragraphId)
  };
}

/**
 * Get paragraphs that should be labeled but aren't
 */
export function getUnlabeledParagraphs(
  labels: SemanticLabel[],
  paragraphs: { id: string }[]
): string[] {
  const labeledIds = new Set(labels.map(l => l.paragraphId));

  return paragraphs
    .filter(p => !labeledIds.has(p.id))
    .map(p => p.id);
}

/**
 * Suggest additional labels for unlabeled paragraphs
 */
export function suggestLabelsForUnlabeled(
  labels: SemanticLabel[],
  unlabeledParagraphIds: string[]
): { paragraphId: string; suggestedType: SemanticTypeId; confidence: number }[] {
  // Simple heuristic: look at nearby paragraphs
  const suggestions: { paragraphId: string; suggestedType: SemanticTypeId; confidence: number }[] = [];

  unlabeledParagraphIds.forEach(id => {
    const idx = parseInt(id.replace('p', ''));

    // Find nearest labeled paragraph
    let nearestLabel: SemanticLabel | null = null;
    let minDistance = Infinity;

    labels.forEach(label => {
      const labelIdx = parseInt(label.paragraphId.replace('p', ''));
      const distance = Math.abs(idx - labelIdx);

      if (distance < minDistance) {
        minDistance = distance;
        nearestLabel = label;
      }
    });

    // Suggest same type as nearest neighbor
    if (nearestLabel && minDistance <= 3) {
      suggestions.push({
        paragraphId: id,
        suggestedType: nearestLabel.type,
        confidence: 1 - (minDistance / 10) // Decreases with distance
      });
    }
  });

  return suggestions;
}

/**
 * Print coverage summary
 */
export function printCoverageSummary(coverage: CoverageReport): string {
  let summary = `\n=== COVERAGE SUMMARY ===\n`;
  summary += `Total Paragraphs: ${coverage.totalParagraphs}\n`;
  summary += `Labeled: ${coverage.labeledParagraphs} (${coverage.coveragePercent}%)\n`;
  summary += `Unlabeled: ${coverage.unlabeledParagraphs}\n\n`;
  summary += `Type Distribution:\n`;

  const sortedTypes = Object.entries(coverage.typeDistribution)
    .sort((a, b) => b[1] - a[1]);

  for (const [type, count] of sortedTypes) {
    const percent = coverage.totalParagraphs > 0
      ? Math.round((count / coverage.totalParagraphs) * 100)
      : 0;
    summary += `  ${type}: ${count} (${percent}%)\n`;
  }

  return summary;
}
