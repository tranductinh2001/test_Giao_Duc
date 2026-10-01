/**
 * Audit Reporter
 *
 * Sinh báo cáo audit sau mỗi lần chạy parser.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentIR } from './DocumentIRPipeline';
import { ValidationResult } from './DocumentValidator';
import { ComparisonResult } from './DocumentComparator';

export interface AuditConfig {
  outputDir: string;
  runId: string;
}

export interface AuditReport {
  runId: string;
  timestamp: string;
  metadata: {
    sourceFile: string;
    totalPages: number;
    processingTimeMs: number;
  };
  coverage: {
    totalParagraphs: number;
    mappedParagraphs: number;
    coveragePercent: number;
  };
  accuracy: {
    correctLabels: number;
    totalLabels: number;
    accuracyPercent: number;
  };
  semantic: {
    distribution: Record<string, number>;
    unknownPercent: number;
  };
  missingParagraphs: string[];
  wrongLabels: Array<{
    paragraphId: string;
    expected: string;
    actual: string;
  }>;
  topErrors: Array<{
    errorCode: string;
    count: number;
  }>;
  recommendations: string[];
}

/**
 * Audit Reporter
 */
export class AuditReporter {
  private config: AuditConfig;

  constructor(config: AuditConfig) {
    this.config = config;
  }

  /**
   * Generate audit report
   */
  generate(
    docIR: DocumentIR,
    validation: ValidationResult,
    comparison: ComparisonResult,
    expectedLabels?: Map<string, string>
  ): AuditReport {
    const distribution = this.getSemanticDistribution(docIR);
    const unknownPercent = this.getUnknownPercent(docIR);
    const missingParagraphs = this.findMissingParagraphs(docIR);
    const wrongLabels = this.findWrongLabels(docIR, expectedLabels);
    const topErrors = this.getTopErrors(validation);
    const recommendations = this.generateRecommendations(
      docIR,
      validation,
      unknownPercent
    );

    const report: AuditReport = {
      runId: this.config.runId,
      timestamp: new Date().toISOString(),
      metadata: {
        sourceFile: docIR.metadata?.sourceFile || 'unknown',
        totalPages: docIR.metadata?.totalPages || 1,
        processingTimeMs: docIR.metadata?.processingTimeMs || 0,
      },
      coverage: {
        totalParagraphs: docIR.paragraphs?.length || 0,
        mappedParagraphs: docIR.semanticLabels?.length || 0,
        coveragePercent: (docIR.semanticLabels?.length || 0) / (docIR.paragraphs?.length || 1) * 100,
      },
      accuracy: expectedLabels
        ? this.calculateAccuracy(docIR, expectedLabels)
        : { correctLabels: 0, totalLabels: 0, accuracyPercent: 0 },
      semantic: {
        distribution,
        unknownPercent,
      },
      missingParagraphs,
      wrongLabels,
      topErrors,
      recommendations,
    };

    return report;
  }

  /**
   * Save audit report
   */
  save(report: AuditReport): void {
    // Ensure output directory
    const runDir = path.join(this.config.outputDir, this.config.runId);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    // Save JSON
    const jsonPath = path.join(runDir, 'audit_report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

    // Save Markdown
    const mdPath = path.join(runDir, 'AUDIT_REPORT.md');
    const mdContent = this.generateMarkdown(report);
    fs.writeFileSync(mdPath, mdContent, 'utf-8');

    console.log(`[Audit] Saved to ${runDir}`);
  }

  /**
   * Get semantic distribution
   */
  private getSemanticDistribution(docIR: DocumentIR): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const label of docIR.semanticLabels || []) {
      distribution[label.type] = (distribution[label.type] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Get unknown percent
   */
  private getUnknownPercent(docIR: DocumentIR): number {
    const total = docIR.semanticLabels?.length || 0;
    if (total === 0) return 0;

    const unknown = docIR.semanticLabels?.filter(l => l.type === 'UNKNOWN').length || 0;
    return (unknown / total) * 100;
  }

  /**
   * Find missing paragraphs
   */
  private findMissingParagraphs(docIR: DocumentIR): string[] {
    const missing: string[] = [];
    const labeledIds = new Set(docIR.semanticLabels?.map(l => l.paragraphId) || []);

    for (const para of docIR.paragraphs || []) {
      if (!labeledIds.has(para.id)) {
        missing.push(para.id);
      }
    }

    return missing;
  }

  /**
   * Find wrong labels
   */
  private findWrongLabels(
    docIR: DocumentIR,
    expectedLabels?: Map<string, string>
  ): Array<{ paragraphId: string; expected: string; actual: string }> {
    if (!expectedLabels) return [];

    const wrong: Array<{ paragraphId: string; expected: string; actual: string }> = [];

    for (const label of docIR.semanticLabels || []) {
      const expected = expectedLabels.get(label.paragraphId);
      if (expected && expected !== label.type) {
        wrong.push({
          paragraphId: label.paragraphId,
          expected,
          actual: label.type,
        });
      }
    }

    return wrong;
  }

  /**
   * Get top errors
   */
  private getTopErrors(validation: ValidationResult): Array<{ errorCode: string; count: number }> {
    const errorCounts: Record<string, number> = {};

    for (const error of validation.errors) {
      errorCounts[error.code] = (errorCounts[error.code] || 0) + 1;
    }

    return Object.entries(errorCounts)
      .map(([code, count]) => ({ errorCode: code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Calculate accuracy
   */
  private calculateAccuracy(
    docIR: DocumentIR,
    expectedLabels: Map<string, string>
  ): { correctLabels: number; totalLabels: number; accuracyPercent: number } {
    let correct = 0;
    let total = 0;

    for (const label of docIR.semanticLabels || []) {
      total++;
      const expected = expectedLabels.get(label.paragraphId);
      if (expected === label.type) {
        correct++;
      }
    }

    return {
      correctLabels: correct,
      totalLabels: total,
      accuracyPercent: total > 0 ? (correct / total) * 100 : 0,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    docIR: DocumentIR,
    validation: ValidationResult,
    unknownPercent: number
  ): string[] {
    const recommendations: string[] = [];

    // Coverage check
    const coveragePercent = (docIR.semanticLabels?.length || 0) / (docIR.paragraphs?.length || 1) * 100;
    if (coveragePercent < 95) {
      recommendations.push('Tăng coverage - nhiều paragraphs chưa được gán nhãn');
    }

    // Unknown check
    if (unknownPercent > 10) {
      recommendations.push('Giảm unknown rate - cải thiện prompt để nhận diện tốt hơn');
    }

    // Empty semantic check
    if ((docIR.semanticLabels?.length || 0) === 0) {
      recommendations.push('Semantic labels trống - kiểm tra AI call');
    }

    // Validation errors
    if (validation.errors.length > 0) {
      recommendations.push(`Có ${validation.errors.length} lỗi validation - xem chi tiết`);
    }

    return recommendations;
  }

  /**
   * Generate markdown report
   */
  private generateMarkdown(report: AuditReport): string {
    const lines: string[] = [];

    lines.push('# AUDIT REPORT');
    lines.push('');
    lines.push(`**Run ID:** ${report.runId}`);
    lines.push(`**Timestamp:** ${report.timestamp}`);
    lines.push('');

    lines.push('## Metadata');
    lines.push('');
    lines.push(`- Source File: ${report.metadata.sourceFile}`);
    lines.push(`- Total Pages: ${report.metadata.totalPages}`);
    lines.push(`- Processing Time: ${report.metadata.processingTimeMs}ms`);
    lines.push('');

    lines.push('## Coverage');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Paragraphs | ${report.coverage.totalParagraphs} |`);
    lines.push(`| Mapped Paragraphs | ${report.coverage.mappedParagraphs} |`);
    lines.push(`| Coverage | ${report.coverage.coveragePercent.toFixed(1)}% |`);
    lines.push('');

    lines.push('## Semantic Distribution');
    lines.push('');
    for (const [type, count] of Object.entries(report.semantic.distribution)) {
      lines.push(`- ${type}: ${count}`);
    }
    lines.push(`- Unknown: ${report.semantic.unknownPercent.toFixed(1)}%`);
    lines.push('');

    if (report.missingParagraphs.length > 0) {
      lines.push('## Missing Paragraphs');
      lines.push('');
      lines.push(`${report.missingParagraphs.length} paragraphs not labeled`);
      lines.push('');
    }

    if (report.topErrors.length > 0) {
      lines.push('## Top Errors');
      lines.push('');
      for (const error of report.topErrors) {
        lines.push(`- ${error.errorCode}: ${error.count}`);
      }
      lines.push('');
    }

    if (report.recommendations.length > 0) {
      lines.push('## Recommendations');
      lines.push('');
      for (const rec of report.recommendations) {
        lines.push(`- ${rec}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Create audit reporter
 */
export function createAuditReporter(runId: string, outputDir: string = './outputs/audit'): AuditReporter {
  return new AuditReporter({ runId, outputDir });
}
