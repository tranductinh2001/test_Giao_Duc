/**
 * PipelineComparator
 *
 * Runs both old and new pipelines in parallel and compares results.
 */

import { getLogger } from '@/lib/logger';
import { PerformanceMetrics, PipelineComparison, comparePipelines, createEmptyPerformanceMetrics } from './DebugArtifactWriter';
import { createProfiler, PipelineProfiler, PipelineProfilerSummary } from './PipelineProfiler';

const logger = getLogger();

/**
 * Pipeline Result
 */
export interface PipelineResult {
  success: boolean;
  data: any;
  metrics: PerformanceMetrics;
  profiler: PipelineProfilerSummary;
  error?: string;
}

/**
 * Comparator Config
 */
export interface PipelineComparatorConfig {
  runParallel: boolean;
  saveArtifacts: boolean;
  outputDir: string;
  tolerance: {
    coveragePercent: number;
    sectionsCount: number;
    activitiesCount: number;
  };
}

/**
 * Default config
 */
const DEFAULT_CONFIG: PipelineComparatorConfig = {
  runParallel: true,
  saveArtifacts: true,
  outputDir: './outputs/pipeline-comparison',
  tolerance: {
    coveragePercent: 10, // 10% tolerance
    sectionsCount: 0,   // Exact match
    activitiesCount: 1   // +/- 1 tolerance
  }
};

/**
 * Pipeline Comparator
 */
export class PipelineComparator {
  private config: PipelineComparatorConfig;
  private oldPipelineFn: (input: any) => Promise<PipelineResult>;
  private newPipelineFn: (input: any) => Promise<PipelineResult>;

  constructor(
    oldPipelineFn: (input: any) => Promise<PipelineResult>,
    newPipelineFn: (input: any) => Promise<PipelineResult>,
    config: Partial<PipelineComparatorConfig> = {}
  ) {
    this.oldPipelineFn = oldPipelineFn;
    this.newPipelineFn = newPipelineFn;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run comparison
   */
  async compare(input: any): Promise<PipelineComparisonResult> {
    logger.info('[PipelineComparator] Starting comparison...');

    const startTime = Date.now();
    let oldResult: PipelineResult | null = null;
    let newResult: PipelineResult | null = null;

    try {
      // Run pipelines
      if (this.config.runParallel) {
        logger.info('[PipelineComparator] Running both pipelines in parallel...');
        [oldResult, newResult] = await Promise.all([
          this.runOldPipeline(input),
          this.runNewPipeline(input)
        ]);
      } else {
        logger.info('[PipelineComparator] Running pipelines sequentially...');
        oldResult = await this.runOldPipeline(input);
        newResult = await this.runNewPipeline(input);
      }

      // Compare results
      const comparison = this.compareResults(oldResult!, newResult!);

      const duration = Date.now() - startTime;

      logger.info(`[PipelineComparator] Comparison complete in ${duration}ms`);
      logger.info(`[PipelineComparator] Functional parity: ${comparison.functionalParity ? 'YES' : 'NO'}`);

      return {
        success: true,
        comparison,
        oldResult,
        newResult,
        durationMs: duration
      };

    } catch (error: any) {
      logger.error(`[PipelineComparator] Comparison failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        comparison: null,
        oldResult: oldResult || undefined,
        newResult: newResult || undefined,
        durationMs: Date.now() - startTime
      };
    }
  }

  /**
   * Run old pipeline
   */
  private async runOldPipeline(input: any): Promise<PipelineResult> {
    try {
      logger.info('[PipelineComparator] Running OLD pipeline...');
      const result = await this.oldPipelineFn(input);

      const metrics = createEmptyPerformanceMetrics('old');
      metrics.duration.totalMs = result.metrics?.duration?.totalMs || 0;
      metrics.ai.totalTokens = result.metrics?.tokens?.total || 0;
      metrics.ai.promptTokens = result.metrics?.tokens?.prompt || 0;
      metrics.ai.completionTokens = result.metrics?.tokens?.completion || 0;

      return {
        success: result.success,
        data: result.data,
        metrics,
        profiler: createProfiler().getSummary()
      };
    } catch (error: any) {
      logger.error(`[PipelineComparator] Old pipeline failed: ${error.message}`);
      return {
        success: false,
        data: null,
        metrics: createEmptyPerformanceMetrics('old'),
        profiler: createProfiler().getSummary(),
        error: error.message
      };
    }
  }

  /**
   * Run new pipeline
   */
  private async runNewPipeline(input: any): Promise<PipelineResult> {
    try {
      logger.info('[PipelineComparator] Running NEW pipeline...');
      const result = await this.newPipelineFn(input);

      const metrics = createEmptyPerformanceMetrics('new');
      metrics.duration.totalMs = result.metrics?.duration?.totalMs || 0;
      metrics.ai.totalTokens = result.metrics?.tokens?.total || 0;
      metrics.ai.promptTokens = result.metrics?.tokens?.prompt || 0;
      metrics.ai.completionTokens = result.metrics?.tokens?.completion || 0;

      return {
        success: result.success,
        data: result.data,
        metrics,
        profiler: createProfiler().getSummary()
      };
    } catch (error: any) {
      logger.error(`[PipelineComparator] New pipeline failed: ${error.message}`);
      return {
        success: false,
        data: null,
        metrics: createEmptyPerformanceMetrics('new'),
        profiler: createProfiler().getSummary(),
        error: error.message
      };
    }
  }

  /**
   * Compare results
   */
  private compareResults(oldResult: PipelineResult, newResult: PipelineResult): PipelineComparisonResult {
    const oldData = oldResult.data || {};
    const newData = newResult.data || {};

    // Extract metrics
    const oldMetrics = oldResult.metrics;
    const newMetrics = newResult.metrics;

    // Compare sections
    const oldSections = oldData.sections?.length || 0;
    const newSections = newData.sections?.length || 0;
    const sectionsMatch = oldSections === newSections;

    // Compare activities
    const oldActivities = oldData.activities?.length || 0;
    const newActivities = newData.activities?.length || 0;
    const activitiesDiff = Math.abs(oldActivities - newActivities);
    const activitiesMatch = activitiesDiff <= this.config.tolerance.activitiesCount;

    // Compare paragraphs
    const oldParagraphs = oldData.paragraphs?.length || 0;
    const newParagraphs = newData.paragraphs?.length || 0;
    const paragraphsMatch = oldParagraphs === newParagraphs;

    // Compare semantic labels
    const oldLabels = this.countLabels(oldData);
    const newLabels = this.countLabels(newData);
    const labelsMatch = Math.abs(oldLabels - newLabels) <= 5; // 5 tolerance

    // Compare coverage
    const oldCoverage = oldData.coverage?.percent || 0;
    const newCoverage = newData.coverage?.percent || 0;
    const coverageDiff = Math.abs(oldCoverage - newCoverage);
    const coverageMatch = coverageDiff <= this.config.tolerance.coveragePercent;

    // Compare confidence
    const oldConfidence = oldData.confidence || 0;
    const newConfidence = newData.confidence || 0;
    const confidenceMatch = Math.abs(oldConfidence - newConfidence) < 0.1;

    // Compare cost
    const oldCost = oldMetrics.ai.estimatedCost || 0;
    const newCost = newMetrics.ai.estimatedCost || 0;

    // Compare duration
    const oldDuration = oldMetrics.duration.totalMs || 0;
    const newDuration = newMetrics.duration.totalMs || 0;

    // Determine functional parity
    const functionalParity = sectionsMatch && activitiesMatch && paragraphsMatch && coverageMatch;

    const comparison: PipelineComparison = {
      timestamp: new Date().toISOString(),
      oldPipeline: oldMetrics,
      newPipeline: newMetrics,
      sections: { old: oldSections, new: newSections, match: sectionsMatch },
      activities: { old: oldActivities, new: newActivities, match: activitiesMatch },
      paragraphs: { old: oldParagraphs, new: newParagraphs, match: paragraphsMatch },
      semanticLabels: { old: oldLabels, new: newLabels, match: labelsMatch },
      coverage: { old: oldCoverage, new: newCoverage, match: coverageMatch },
      confidence: { old: oldConfidence, new: newConfidence, match: confidenceMatch },
      cost: { old: oldCost, new: newCost, difference: newCost - oldCost },
      duration: { old: oldDuration, new: newDuration, difference: newDuration - oldDuration },
      functionalParity,
      recommendations: this.generateRecommendations(
        sectionsMatch, activitiesMatch, paragraphsMatch,
        labelsMatch, coverageMatch, confidenceMatch
      )
    };

    return {
      success: comparison.functionalParity,
      comparison,
      oldResult,
      newResult,
      durationMs: 0
    };
  }

  /**
   * Count semantic labels
   */
  private countLabels(data: any): number {
    if (!data.activities) return 0;

    let count = 0;
    for (const activity of data.activities) {
      count += activity.teacherActionIndexes?.length || 0;
      count += activity.studentActionIndexes?.length || 0;
      count += activity.teachingMaterialIndexes?.length || 0;
      count += activity.learningOutcomeIndexes?.length || 0;
      count += activity.questionIndexes?.length || 0;
      count += activity.assessmentIndexes?.length || 0;
    }
    return count;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    sectionsMatch: boolean,
    activitiesMatch: boolean,
    paragraphsMatch: boolean,
    labelsMatch: boolean,
    coverageMatch: boolean,
    confidenceMatch: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!sectionsMatch) {
      recommendations.push('Section count differs between pipelines');
    }
    if (!activitiesMatch) {
      recommendations.push('Activity count differs between pipelines');
    }
    if (!paragraphsMatch) {
      recommendations.push('Paragraph count differs between pipelines');
    }
    if (!labelsMatch) {
      recommendations.push('Semantic label count differs between pipelines');
    }
    if (!coverageMatch) {
      recommendations.push('Coverage percentage differs significantly');
    }
    if (!confidenceMatch) {
      recommendations.push('Confidence scores differ significantly');
    }

    if (recommendations.length === 0) {
      recommendations.push('Pipelines are functionally equivalent');
    }

    return recommendations;
  }
}

/**
 * Pipeline Comparison Result
 */
export interface PipelineComparisonResult {
  success: boolean;
  error?: string;
  comparison: PipelineComparison | null;
  oldResult?: PipelineResult;
  newResult?: PipelineResult;
  durationMs: number;
}

/**
 * Create comparator
 */
export function createComparator(
  oldPipelineFn: (input: any) => Promise<PipelineResult>,
  newPipelineFn: (input: any) => Promise<PipelineResult>,
  config?: Partial<PipelineComparatorConfig>
): PipelineComparator {
  return new PipelineComparator(oldPipelineFn, newPipelineFn, config);
}
