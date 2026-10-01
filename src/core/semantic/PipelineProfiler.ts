/**
 * PipelineProfiler
 *
 * Profiles pipeline performance with per-stage timings and AI metrics.
 */

import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * Timing Entry
 */
export interface TimingEntry {
  stage: string;
  startMs: number;
  endMs: number;
  durationMs: number;
}

/**
 * AI Metrics Entry
 */
export interface AIMetricsEntry {
  stage: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCost: number;
}

/**
 * Pipeline Profiler
 */
export class PipelineProfiler {
  private timings: TimingEntry[] = [];
  private aiMetrics: AIMetricsEntry[] = [];
  private stageStack: { stage: string; startMs: number }[] = [];
  private startMs: number;

  constructor() {
    this.startMs = Date.now();
  }

  /**
   * Start a stage
   */
  startStage(stage: string): void {
    this.stageStack.push({
      stage,
      startMs: Date.now()
    });
    logger.info(`[Profiler] Stage started: ${stage}`);
  }

  /**
   * End current stage
   */
  endStage(stage: string): void {
    const entry = this.stageStack.pop();
    if (!entry || entry.stage !== stage) {
      logger.warn(`[Profiler] Stage mismatch: expected ${stage}, got ${entry?.stage}`);
      return;
    }

    const duration = Date.now() - entry.startMs;
    this.timings.push({
      stage,
      startMs: entry.startMs,
      endMs: Date.now(),
      durationMs: duration
    });

    logger.info(`[Profiler] Stage completed: ${stage} (${duration}ms)`);
  }

  /**
   * Record AI metrics
   */
  recordAI(
    stage: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    latencyMs: number
  ): void {
    const cost = this.estimateCost(promptTokens, completionTokens);

    this.aiMetrics.push({
      stage,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
      estimatedCost: cost
    });

    logger.info(`[Profiler] AI metrics: ${stage} - ${promptTokens + completionTokens} tokens, $${cost.toFixed(6)}`);
  }

  /**
   * Estimate cost (approximate Gemini pricing)
   */
  private estimateCost(promptTokens: number, completionTokens: number): number {
    // Approximate Gemini pricing (input: $0.075/million, output: $0.30/million)
    const inputCost = (promptTokens / 1_000_000) * 0.075;
    const outputCost = (completionTokens / 1_000_000) * 0.30;
    return inputCost + outputCost;
  }

  /**
   * Get all timings
   */
  getTimings(): TimingEntry[] {
    return [...this.timings];
  }

  /**
   * Get all AI metrics
   */
  getAIMetrics(): AIMetricsEntry[] {
    return [...this.aiMetrics];
  }

  /**
   * Get total duration
   */
  getTotalDuration(): number {
    return Date.now() - this.startMs;
  }

  /**
   * Get summary
   */
  getSummary(): PipelineProfilerSummary {
    return {
      totalDurationMs: this.getTotalDuration(),
      stages: this.timings.reduce((acc, t) => {
        acc[t.stage] = t.durationMs;
        return acc;
      }, {} as Record<string, number>),
      aiMetrics: {
        totalCalls: this.aiMetrics.length,
        totalTokens: this.aiMetrics.reduce((sum, m) => sum + m.totalTokens, 0),
        totalPromptTokens: this.aiMetrics.reduce((sum, m) => sum + m.promptTokens, 0),
        totalCompletionTokens: this.aiMetrics.reduce((sum, m) => sum + m.completionTokens, 0),
        totalCost: this.aiMetrics.reduce((sum, m) => sum + m.estimatedCost, 0),
        byStage: this.aiMetrics.reduce((acc, m) => {
          if (!acc[m.stage]) {
            acc[m.stage] = { calls: 0, tokens: 0, cost: 0 };
          }
          acc[m.stage].calls++;
          acc[m.stage].tokens += m.totalTokens;
          acc[m.stage].cost += m.estimatedCost;
          return acc;
        }, {} as Record<string, { calls: number; tokens: number; cost: number }>)
      }
    };
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    const summary = this.getSummary();

    console.log('\n=== PIPELINE PROFILER SUMMARY ===');
    console.log(`Total Duration: ${summary.totalDurationMs}ms`);

    console.log('\n--- Stage Timings ---');
    for (const [stage, duration] of Object.entries(summary.stages)) {
      const percent = ((duration / summary.totalDurationMs) * 100).toFixed(1);
      console.log(`  ${stage}: ${duration}ms (${percent}%)`);
    }

    console.log('\n--- AI Metrics ---');
    const ai = summary.aiMetrics;
    console.log(`  Total Calls: ${ai.totalCalls}`);
    console.log(`  Total Tokens: ${ai.totalTokens}`);
    console.log(`  Total Cost: $${ai.totalCost.toFixed(6)}`);

    console.log('\n--- By Stage ---');
    for (const [stage, data] of Object.entries(ai.byStage)) {
      console.log(`  ${stage}:`);
      console.log(`    Calls: ${data.calls}`);
      console.log(`    Tokens: ${data.tokens}`);
      console.log(`    Cost: $${data.cost.toFixed(6)}`);
    }
  }

  /**
   * Reset profiler
   */
  reset(): void {
    this.timings = [];
    this.aiMetrics = [];
    this.stageStack = [];
    this.startMs = Date.now();
  }
}

/**
 * Pipeline Profiler Summary
 */
export interface PipelineProfilerSummary {
  totalDurationMs: number;
  stages: Record<string, number>;
  aiMetrics: {
    totalCalls: number;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalCost: number;
    byStage: Record<string, { calls: number; tokens: number; cost: number }>;
  };
}

/**
 * Create new profiler
 */
export function createProfiler(): PipelineProfiler {
  return new PipelineProfiler();
}
