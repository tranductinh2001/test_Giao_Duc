/**
 * Pipeline Runner
 *
 * Orchestrates DocumentIR Pipeline với validation, benchmark và audit.
 * Lưu tất cả artifacts sau mỗi lần chạy.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentIR, runDocumentIRPipeline, PipelineConfig } from './DocumentIRPipeline';
import { DocumentNormalizer, createDocumentNormalizer } from './DocumentNormalizer';
import { DocumentIRValidator, createDocumentValidator, ValidationResult } from './DocumentValidator';
import { DocumentIRComparator, createDocumentComparator, ComparisonResult } from './DocumentComparator';
import { createAuditReporter, AuditReporter } from './AuditReporter';

export interface PipelineRunnerConfig {
  outputDir: string;
  debug: boolean;
  temperature: number;
  maxTokens: number;
  enableNormalization: boolean;
  enableValidation: boolean;
  enableComparison: boolean;
  enableAudit: boolean;
}

export interface PipelineRunResult {
  runId: string;
  success: boolean;
  timestamp: string;
  sourceFile: string;
  documentIR: DocumentIR;
  normalization?: any;
  validation: ValidationResult;
  comparison: ComparisonResult;
  artifacts: Artifacts;
}

export interface Artifacts {
  layout?: any;
  tables?: any;
  paragraphs?: any;
  activities?: any;
  semanticPrompt?: any;
  semanticResponse?: any;
  mapping?: any;
  validation?: any;
  comparison?: any;
  documentIR?: any;
  auditReport?: any;
}

const DEFAULT_CONFIG: PipelineRunnerConfig = {
  outputDir: './outputs/document-ir',
  debug: true,
  temperature: 0.1,
  maxTokens: 4000,
  enableNormalization: true,
  enableValidation: true,
  enableComparison: true,
  enableAudit: true,
};

/**
 * Pipeline Runner
 */
export class PipelineRunner {
  private config: PipelineRunnerConfig;
  private normalizer: DocumentNormalizer;
  private validator: DocumentIRValidator;
  private comparator: DocumentIRComparator;

  constructor(config: Partial<PipelineRunnerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.normalizer = createDocumentNormalizer();
    this.validator = createDocumentValidator();
    this.comparator = createDocumentComparator();
  }

  /**
   * Run complete pipeline với tất cả artifacts
   */
  async run(
    visionData: any,
    sourceFile: string,
    aiClient: any
  ): Promise<PipelineRunResult> {
    const runId = this.generateRunId();
    const timestamp = new Date().toISOString();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`PIPELINE RUN: ${runId}`);
    console.log(`Source: ${sourceFile}`);
    console.log('='.repeat(60));

    // Create run directory
    const runDir = path.join(this.config.outputDir, runId);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    const artifacts: Artifacts = {};
    let documentIR: DocumentIR;
    let normalization: any;
    let validation: ValidationResult;
    let comparison: ComparisonResult;

    try {
      // PHASE 0: Save raw input
      this.saveArtifact(runDir, 'vision_input.json', visionData);

      // PHASE 1: Normalization
      if (this.config.enableNormalization) {
        console.log('\n[Phase 1] Normalization');
        normalization = this.runNormalization(visionData);
        this.saveArtifact(runDir, 'normalization.json', normalization);
      }

      // PHASE 2-6: DocumentIR Pipeline
      console.log('\n[Phase 2-6] DocumentIR Pipeline');
      documentIR = await this.runDocumentIRPipeline(visionData, sourceFile, aiClient);

      // PHASE 7: Validation
      if (this.config.enableValidation) {
        console.log('\n[Phase 7] Validation');
        validation = this.validator.validate(documentIR);
        this.saveArtifact(runDir, 'validation.json', validation);

        // Log validation results
        if (validation.errors.length > 0) {
          console.log(`  ❌ Errors: ${validation.errors.length}`);
          for (const error of validation.errors) {
            console.log(`    - ${error.code}: ${error.message}`);
          }
        }
        if (validation.warnings.length > 0) {
          console.log(`  ⚠️ Warnings: ${validation.warnings.length}`);
        }
      } else {
        validation = {
          valid: true,
          stage: 'skip',
          errors: [],
          warnings: [],
          metrics: this.validator.buildMetrics(documentIR),
        };
      }

      // PHASE 8: Comparison
      if (this.config.enableComparison) {
        console.log('\n[Phase 8] Comparison');
        comparison = this.comparator.compare(visionData, documentIR);
        this.saveArtifact(runDir, 'comparison.json', comparison);

        if (!comparison.valid) {
          console.log(`  ❌ Data loss detected: ${comparison.missing.length} stages`);
        }
      } else {
        comparison = {
          valid: true,
          stage: 'skip',
          missing: [],
          metrics: this.comparator.compare(visionData, documentIR).metrics,
        };
      }

      // PHASE 9: Audit Report
      if (this.config.enableAudit) {
        console.log('\n[Phase 9] Audit Report');
        const auditReporter = createAuditReporter(runId, this.config.outputDir);
        const auditReport = auditReporter.generate(documentIR, validation, comparison);
        auditReporter.save(auditReport);
        artifacts.auditReport = auditReport;
      }

      // Save all artifacts
      artifacts.layout = documentIR.layout;
      artifacts.tables = documentIR.tables;
      artifacts.paragraphs = documentIR.paragraphs;
      artifacts.activities = documentIR.activities;
      artifacts.mapping = { sections: documentIR.sections, semanticLabels: documentIR.semanticLabels };
      artifacts.validation = validation;
      artifacts.comparison = comparison;
      artifacts.documentIR = documentIR;

      // Save final documentIR
      this.saveArtifact(runDir, 'document_ir.json', documentIR);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`PIPELINE COMPLETE: ${runId}`);
      console.log(`Status: ${validation.valid ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Coverage: ${validation.metrics.paragraph.mappingPercent.toFixed(1)}%`);
      console.log(`Output: ${runDir}`);
      console.log('='.repeat(60));

      return {
        runId,
        success: validation.valid,
        timestamp,
        sourceFile,
        documentIR,
        normalization,
        validation,
        comparison,
        artifacts,
      };

    } catch (error: any) {
      console.error(`\n❌ Pipeline failed: ${error.message}`);

      // Save error
      this.saveArtifact(runDir, 'error.json', {
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Run normalization
   */
  private runNormalization(visionData: any): any {
    // Normalize paragraphs
    const paragraphs = visionData?.pages?.flatMap((p: any) => p.elements || []) || [];
    const normalizedParagraphs = this.normalizer.normalizeParagraphs(paragraphs);

    // Normalize tables
    const tables = visionData?.tables || [];
    const normalizedTables = this.normalizer.normalizeTables(tables);

    return {
      paragraphs: normalizedParagraphs,
      tables: normalizedTables,
      summary: {
        totalParagraphs: normalizedParagraphs.length,
        normalizedParagraphs: normalizedParagraphs.filter(p => p.normalized).length,
      },
    };
  }

  /**
   * Run DocumentIR Pipeline
   */
  private async runDocumentIRPipeline(
    visionData: any,
    sourceFile: string,
    aiClient: any
  ): Promise<DocumentIR> {
    return runDocumentIRPipeline(
      visionData,
      sourceFile,
      aiClient,
      {
        outputDir: this.config.outputDir,
        debug: this.config.debug,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      }
    );
  }

  /**
   * Save artifact
   */
  private saveArtifact(runDir: string, filename: string, data: any): void {
    const filepath = path.join(runDir, filename);
    try {
      if (typeof data === 'string') {
        fs.writeFileSync(filepath, data, 'utf-8');
      } else {
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
      }
      console.log(`  [Saved] ${filename}`);
    } catch (error: any) {
      console.error(`  [Error] ${filename}: ${error.message}`);
    }
  }

  /**
   * Generate unique run ID
   */
  private generateRunId(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toISOString().slice(11, 19).replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 6);
    return `run_${date}_${time}_${random}`;
  }
}

/**
 * Create pipeline runner
 */
export function createPipelineRunner(config?: Partial<PipelineRunnerConfig>): PipelineRunner {
  return new PipelineRunner(config);
}
