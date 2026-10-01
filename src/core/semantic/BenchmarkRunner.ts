/**
 * Benchmark Runner
 *
 * Chạy benchmark cho DocumentIR Pipeline.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentIR, runDocumentIRPipeline } from './DocumentIRPipeline';
import { DocumentIRValidator, createDocumentValidator } from './DocumentValidator';
import { DocumentIRComparator, createDocumentComparator } from './DocumentComparator';

export interface BenchmarkConfig {
  datasetDir: string;
  outputDir: string;
  maxSamples: number;
  temperature: number;
}

export interface BenchmarkResult {
  lessonId: string;
  filename: string;
  success: boolean;
  coverage: number;
  accuracy: number;
  unknown: number;
  latencyMs: number;
  tokens: number;
  cost: number;
  errors: string[];
  warnings: string[];
}

export interface BenchmarkReport {
  version: string;
  createdAt: string;
  config: BenchmarkConfig;
  summary: {
    totalSamples: number;
    successfulSamples: number;
    failedSamples: number;
    averageCoverage: number;
    averageAccuracy: number;
    averageUnknown: number;
    averageLatencyMs: number;
    averageTokens: number;
    averageCost: number;
  };
  results: BenchmarkResult[];
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  datasetDir: './golden',
  outputDir: './outputs/benchmark',
  maxSamples: 10,
  temperature: 0.1,
};

/**
 * Benchmark Runner
 */
export class BenchmarkRunner {
  private config: BenchmarkConfig;
  private validator: DocumentIRValidator;
  private comparator: DocumentIRComparator;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validator = createDocumentValidator();
    this.comparator = createDocumentComparator();
  }

  /**
   * Run benchmark on all golden samples
   */
  async run(aiClient: any): Promise<BenchmarkReport> {
    console.log(`\n${'='.repeat(60)}`);
    console.log('BENCHMARK RUNNER');
    console.log('='.repeat(60));

    const startTime = Date.now();

    // Load golden dataset
    const goldenFiles = this.listGoldenFiles();
    const samples = goldenFiles.slice(0, this.config.maxSamples);

    console.log(`Found ${goldenFiles.length} golden files`);
    console.log(`Running benchmark on ${samples.length} samples`);

    const results: BenchmarkResult[] = [];

    for (let i = 0; i < samples.length; i++) {
      const file = samples[i];
      console.log(`\n[${i + 1}/${samples.length}] Processing: ${file}`);

      const result = await this.runOnFile(file, aiClient);
      results.push(result);
    }

    // Build summary
    const summary = this.buildSummary(results);

    const report: BenchmarkReport = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      config: this.config,
      summary,
      results,
    };

    // Save report
    this.saveReport(report);

    console.log(`\n${'='.repeat(60)}`);
    console.log('BENCHMARK COMPLETE');
    console.log(`Total time: ${Date.now() - startTime}ms`);
    console.log(`Success: ${summary.successfulSamples}/${summary.totalSamples}`);
    console.log(`Avg Coverage: ${summary.averageCoverage.toFixed(1)}%`);
    console.log(`Avg Unknown: ${summary.averageUnknown.toFixed(1)}%`);
    console.log('='.repeat(60));

    return report;
  }

  /**
   * Run benchmark on single file
   */
  async runOnFile(filename: string, aiClient: any): Promise<BenchmarkResult> {
    const startTime = Date.now();

    try {
      // Load file
      const filepath = path.join(this.config.datasetDir, filename);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

      // Run pipeline
      const docIR = await this.runPipeline(data, aiClient);

      // Validate
      const validation = this.validator.validate(docIR);

      // Compare
      const comparison = this.comparator.compare(data, docIR);

      const latencyMs = Date.now() - startTime;

      return {
        lessonId: docIR.metadata?.sourceFile || filename,
        filename,
        success: validation.valid,
        coverage: validation.metrics.paragraph.mappingPercent,
        accuracy: 0, // Would need golden labels to calculate
        unknown: validation.metrics.semantic.unknowns,
        latencyMs,
        tokens: 0, // Would need to track from AI client
        cost: 0, // Would need to calculate from tokens
        errors: validation.errors.map(e => e.code),
        warnings: validation.warnings.map(w => w.code),
      };
    } catch (error: any) {
      return {
        lessonId: filename,
        filename,
        success: false,
        coverage: 0,
        accuracy: 0,
        unknown: 0,
        latencyMs: Date.now() - startTime,
        tokens: 0,
        cost: 0,
        errors: [error.message],
        warnings: [],
      };
    }
  }

  /**
   * Run pipeline on data
   */
  private async runPipeline(data: any, aiClient: any): Promise<DocumentIR> {
    // Create output dir with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(this.config.outputDir, timestamp);

    return runDocumentIRPipeline(
      data,
      data.filename || 'benchmark',
      aiClient,
      { outputDir, debug: true }
    );
  }

  /**
   * List golden files
   */
  private listGoldenFiles(): string[] {
    if (!fs.existsSync(this.config.datasetDir)) {
      return [];
    }

    return fs.readdirSync(this.config.datasetDir)
      .filter(f => f.endsWith('.json') && f !== 'index.json');
  }

  /**
   * Build summary
   */
  private buildSummary(results: BenchmarkResult[]): BenchmarkReport['summary'] {
    const total = results.length;
    const successful = results.filter(r => r.success).length;

    const avgCoverage = results.reduce((sum, r) => sum + r.coverage, 0) / total;
    const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / total;
    const avgUnknown = results.reduce((sum, r) => sum + r.unknown, 0) / total;
    const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / total;
    const avgTokens = results.reduce((sum, r) => sum + r.tokens, 0) / total;
    const avgCost = results.reduce((sum, r) => sum + r.cost, 0) / total;

    return {
      totalSamples: total,
      successfulSamples: successful,
      failedSamples: total - successful,
      averageCoverage: avgCoverage,
      averageAccuracy: avgAccuracy,
      averageUnknown: avgUnknown,
      averageLatencyMs: avgLatency,
      averageTokens: avgTokens,
      averageCost: avgCost,
    };
  }

  /**
   * Save report
   */
  private saveReport(report: BenchmarkReport): void {
    // Ensure output directory
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark_${timestamp}.json`;
    const filepath = path.join(this.config.outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n[Report saved] ${filepath}`);

    // Also save markdown report
    const mdFilename = `benchmark_${timestamp}.md`;
    const mdFilepath = path.join(this.config.outputDir, mdFilename);
    const mdContent = this.generateMarkdownReport(report);
    fs.writeFileSync(mdFilepath, mdContent, 'utf-8');
    console.log(`[Report saved] ${mdFilepath}`);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(report: BenchmarkReport): string {
    const lines: string[] = [];

    lines.push('# Benchmark Report');
    lines.push('');
    lines.push(`**Created:** ${report.createdAt}`);
    lines.push(`**Version:** ${report.version}`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Samples | ${report.summary.totalSamples} |`);
    lines.push(`| Successful | ${report.summary.successfulSamples} |`);
    lines.push(`| Failed | ${report.summary.failedSamples} |`);
    lines.push(`| Avg Coverage | ${report.summary.averageCoverage.toFixed(1)}% |`);
    lines.push(`| Avg Accuracy | ${report.summary.averageAccuracy.toFixed(1)}% |`);
    lines.push(`| Avg Unknown | ${report.summary.averageUnknown.toFixed(1)}% |`);
    lines.push(`| Avg Latency | ${report.summary.averageLatencyMs.toFixed(0)}ms |`);
    lines.push(`| Avg Tokens | ${report.summary.averageTokens.toFixed(0)} |`);
    lines.push(`| Avg Cost | $${report.summary.averageCost.toFixed(4)} |`);
    lines.push('');

    lines.push('## Results');
    lines.push('');
    lines.push('| Lesson | Coverage | Unknown | Latency | Status |');
    lines.push('|--------|----------|---------|---------|--------|');

    for (const result of report.results) {
      const status = result.success ? '✅' : '❌';
      lines.push(`| ${result.filename} | ${result.coverage.toFixed(1)}% | ${result.unknown} | ${result.latencyMs}ms | ${status} |`);
    }

    return lines.join('\n');
  }
}

/**
 * Create benchmark runner
 */
export function createBenchmarkRunner(config?: Partial<BenchmarkConfig>): BenchmarkRunner {
  return new BenchmarkRunner(config);
}
