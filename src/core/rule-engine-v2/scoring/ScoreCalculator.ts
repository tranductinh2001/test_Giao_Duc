/**
 * Score Calculator
 *
 * Calculate scores based on issues and rules
 */

import type {
  ScoringRule,
  ScoreReport,
  StructureIssue,
  ContentIssue,
  ScoreBreakdown,
  IssuesSummary,
  PenaltyDetail,
} from '../types';

export class ScoreCalculator {
  private rules: ScoringRule[];
  private maxScore: number;

  constructor(rules: ScoringRule[], maxScore: number = 100) {
    this.rules = rules.filter((r) => r.isActive);
    this.maxScore = maxScore;
  }

  /**
   * Calculate score from issues
   */
  calculate(
    structureIssues: StructureIssue[],
    contentIssues: ContentIssue[]
  ): ScoreReport {
    // Calculate penalties from issue penaltyScore (not from scoring rules)
    // This ensures content issues with penaltyScore are properly counted
    const structurePenalties = this.calculatePenaltiesFromIssues(structureIssues);
    const contentPenalties = this.calculatePenaltiesFromIssues(contentIssues);

    const formatPenalties = this.calculateFormatPenalties(structureIssues);

    // Total penalties
    const totalStructurePenalty = Object.values(structurePenalties).reduce(
      (sum, p) => sum + p.total,
      0
    );
    const totalContentPenalty = Object.values(contentPenalties).reduce(
      (sum, p) => sum + p.total,
      0
    );
    const totalFormatPenalty = Object.values(formatPenalties).reduce(
      (sum, p) => sum + p.total,
      0
    );

    // Calculate breakdown scores
    const structureScore = Math.max(
      0,
      (this.maxScore * 0.3) - totalStructurePenalty
    );
    const contentScore = Math.max(0, (this.maxScore * 0.5) - totalContentPenalty);
    const formatScore = Math.max(0, (this.maxScore * 0.2) - totalFormatPenalty);

    const totalScore = Math.max(0, structureScore + contentScore + formatScore);
    const percentage = (totalScore / this.maxScore) * 100;

    // Issues summary
    const issuesSummary = this.summarizeIssues(structureIssues, contentIssues);

    // Penalties applied
    const penaltiesApplied = this.mergePenalties(
      structurePenalties,
      contentPenalties,
      formatPenalties
    );

    return {
      totalScore: Math.round(totalScore * 10) / 10,
      maxScore: this.maxScore,
      percentage: Math.round(percentage * 10) / 10,
      breakdown: {
        structure: Math.round(structureScore * 10) / 10,
        content: Math.round(contentScore * 10) / 10,
        format: Math.round(formatScore * 10) / 10,
      },
      issuesSummary,
      penaltiesApplied,
    };
  }

  /**
   * Calculate penalties directly from issue penaltyScore
   * This uses the issue's own penaltyScore rather than looking up scoring rules
   */
  private calculatePenaltiesFromIssues(
    issues: Array<{ ruleCode: string; severity: string; penaltyScore?: number }>
  ): Record<string, { penalty: number; count: number; total: number }> {
    const penalties: Record<string, { penalty: number; count: number; total: number }> = {};

    for (const issue of issues) {
      // Use issue's own penaltyScore, default to severity-based penalty
      const penalty = issue.penaltyScore || this.getSeverityPenalty(issue.severity);

      if (!penalties[issue.ruleCode]) {
        penalties[issue.ruleCode] = { penalty, count: 0, total: 0 };
      }

      penalties[issue.ruleCode].count++;
      penalties[issue.ruleCode].total += penalty;
    }

    return penalties;
  }

  /**
   * Get default penalty based on severity
   */
  private getSeverityPenalty(severity: string): number {
    switch (severity) {
      case 'CRITICAL': return 20;
      case 'ERROR': return 15;
      case 'WARNING': return 10;
      case 'INFO': return 5;
      default: return 10;
    }
  }

  /**
   * Calculate penalties for issues
   */
  private calculatePenalties(
    issues: Array<{ code: string; severity: string }>
  ): Record<string, { penalty: number; count: number; total: number }> {
    const penalties: Record<string, { penalty: number; count: number; total: number }> =
      {};

    for (const issue of issues) {
      const rule = this.rules.find(
        (r) => r.issueType === issue.code && r.severity === issue.severity
      );

      if (rule) {
        if (!penalties[issue.code]) {
          penalties[issue.code] = {
            penalty: rule.penalty,
            count: 0,
            total: 0,
          };
        }

        penalties[issue.code].count++;
        penalties[issue.code].total += rule.penalty;
      }
    }

    return penalties;
  }

  /**
   * Calculate format-specific penalties
   */
  private calculateFormatPenalties(
    structureIssues: StructureIssue[]
  ): Record<string, { penalty: number; count: number; total: number }> {
    const formatIssues = structureIssues.filter((i) =>
      ['HEADING', 'NUMBERING', 'FORMAT', 'STYLE'].some((type) =>
        i.ruleCode.includes(type.toLowerCase())
      )
    );

    return this.calculatePenalties(
      formatIssues.map((i) => ({ code: i.ruleCode, severity: i.severity }))
    );
  }

  /**
   * Summarize issues by severity
   */
  private summarizeIssues(
    structureIssues: StructureIssue[],
    contentIssues: ContentIssue[]
  ): IssuesSummary {
    const allIssues = [...structureIssues, ...contentIssues];

    return {
      errors: allIssues.filter((i) => i.severity === 'ERROR').length,
      warnings: allIssues.filter((i) => i.severity === 'WARNING').length,
      info: allIssues.filter((i) => i.severity === 'INFO').length,
    };
  }

  /**
   * Merge all penalties
   */
  private mergePenalties(
    ...penaltyMaps: Array<
      Record<string, { penalty: number; count: number; total: number }>
    >
  ): PenaltyDetail[] {
    const merged: Record<string, { penalty: number; count: number }> = {};

    for (const map of penaltyMaps) {
      for (const [code, data] of Object.entries(map)) {
        if (!merged[code]) {
          merged[code] = { penalty: data.total, count: data.count };
        } else {
          merged[code].penalty += data.total;
          merged[code].count += data.count;
        }
      }
    }

    return Object.entries(merged)
      .map(([code, data]) => ({
        ruleCode: code,
        penalty: data.penalty,
        count: data.count,
      }))
      .sort((a, b) => b.penalty - a.penalty);
  }

  /**
   * Calculate score for a specific section
   */
  calculateSectionScore(
    sectionIssues: Array<StructureIssue | ContentIssue>
  ): number {
    const penalties = sectionIssues.reduce((sum, issue) => sum + issue.penaltyScore, 0);
    return Math.max(0, this.maxScore - penalties);
  }
}
