/**
 * Payload Builder Service
 *
 * Phase 3: Creates JSON payloads from Review Context
 */

import type {
  ActivityReviewContext,
  ActivityPayload,
  ActivityChunk,
  ReviewContextConfig,
  RulePayload,
} from "../types";
import { ChunkService } from "./ChunkService";
import { StatisticsService } from "./StatisticsService";

export interface PayloadResult {
  payloads: ActivityPayload[];
  statistics: {
    totalActivities: number;
    totalChunks: number;
    totalEstimatedTokens: number;
    totalCharacterCount: number;
    averageTokensPerActivity: number;
    payloadSizeKB: number;
  };
}

export interface ActivityPayloadResult {
  activityId: string;
  payloads: ActivityPayload[];
  estimatedTokens: number;
  characterCount: number;
  chunkCount: number;
}

export class PayloadBuilder {
  private config: ReviewContextConfig;
  private chunkService: ChunkService;
  private statisticsService: StatisticsService;

  constructor(config: Partial<ReviewContextConfig> = {}) {
    this.config = {
      maxTokensPerChunk: config.maxTokensPerChunk ?? 4000,
      maxCharactersPerChunk: config.maxCharactersPerChunk ?? 15000,
      chunkOverlap: config.chunkOverlap ?? 200,
      minChunkSize: config.minChunkSize ?? 500,
      confidenceThresholdHigh: config.confidenceThresholdHigh ?? 80,
      confidenceThresholdMedium: config.confidenceThresholdMedium ?? 50,
      enableOptimization: config.enableOptimization ?? true,
      enableChunking: config.enableChunking ?? true,
    };

    this.chunkService = new ChunkService(this.config);
    this.statisticsService = new StatisticsService();
  }

  /**
   * Build payloads from review contexts
   */
  buildPayloads(contexts: ActivityReviewContext[]): PayloadResult {
    const allPayloads: ActivityPayload[] = [];
    let totalTokens = 0;
    let totalChars = 0;

    for (const context of contexts) {
      // Chunk the context
      const chunks = this.chunkService.chunk(context);

      // Create payload for each chunk
      for (const chunk of chunks) {
        const payload = this.createPayload(context, chunk);
        allPayloads.push(payload);

        totalTokens += this.statisticsService.estimateChunkTokens(chunk);
        totalChars += chunk.paragraphs.join("\n\n").length;
      }
    }

    return {
      payloads: allPayloads,
      statistics: {
        totalActivities: contexts.length,
        totalChunks: allPayloads.length,
        totalEstimatedTokens: totalTokens,
        totalCharacterCount: totalChars,
        averageTokensPerActivity: contexts.length > 0 ? Math.round(totalTokens / contexts.length) : 0,
        payloadSizeKB: Math.round((totalTokens * 4 / 1024) * 100) / 100,
      },
    };
  }

  /**
   * Build payload for a single activity
   */
  buildActivityPayload(context: ActivityReviewContext): ActivityPayloadResult {
    const chunks = this.chunkService.chunk(context);
    const payloads: ActivityPayload[] = [];

    let totalTokens = 0;
    let totalChars = 0;

    for (const chunk of chunks) {
      const payload = this.createPayload(context, chunk);
      payloads.push(payload);

      totalTokens += this.statisticsService.estimateChunkTokens(chunk);
      totalChars += chunk.paragraphs.join("\n\n").length;
    }

    return {
      activityId: context.activityId,
      payloads,
      estimatedTokens: totalTokens,
      characterCount: totalChars,
      chunkCount: chunks.length,
    };
  }

  /**
   * Create payload from context and chunk
   */
  private createPayload(context: ActivityReviewContext, chunk: ActivityChunk): ActivityPayload {
    return {
      activityId: context.activityId,
      activityCode: context.activityCode,
      activityTitle: context.activityTitle,
      sectionName: context.sectionName,
      content: {
        paragraphs: chunk.paragraphs,
        knowledge: context.knowledge,
        teachingIntent: context.teachingIntent,
        expectedTeacherActions: context.expectedTeacherActions,
        expectedStudentActions: context.expectedStudentActions,
        expectedOutcome: context.expectedOutcome,
      },
      rules: this.convertRulesToPayload(chunk.rules),
      metadata: {
        confidence: context.confidence,
        matchedBy: context.matchedBy,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
      },
    };
  }

  /**
   * Convert rules to payload format
   */
  private convertRulesToPayload(rules: RulePayload[]): RulePayload[] {
    // Sort by priority (highest first)
    return [...rules].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Convert context to JSON string
   */
  toJSON(contexts: ActivityReviewContext[]): string {
    const result = this.buildPayloads(contexts);
    return JSON.stringify(result, null, 2);
  }

  /**
   * Convert single context to JSON
   */
  toJSONSingle(context: ActivityReviewContext): string {
    const result = this.buildActivityPayload(context);
    return JSON.stringify(result, null, 2);
  }

  /**
   * Validate payload size
   */
  validatePayloadSize(contexts: ActivityReviewContext[], maxTokens: number): {
    isValid: boolean;
    exceedsBy: number;
    recommendedChunks: number;
  } {
    const result = this.buildPayloads(contexts);
    const totalTokens = result.statistics.totalEstimatedTokens;

    if (totalTokens <= maxTokens) {
      return {
        isValid: true,
        exceedsBy: 0,
        recommendedChunks: 1,
      };
    }

    // Calculate recommended chunks
    const recommendedChunks = Math.ceil(totalTokens / maxTokens);

    return {
      isValid: false,
      exceedsBy: totalTokens - maxTokens,
      recommendedChunks,
    };
  }

  /**
   * Split payloads if too large
   */
  splitIfNeeded(contexts: ActivityReviewContext[], maxTokens: number): ActivityPayload[] {
    const result = this.buildPayloads(contexts);

    if (result.statistics.totalEstimatedTokens <= maxTokens) {
      return result.payloads;
    }

    // Already chunked, return all chunks
    return result.payloads;
  }

  /**
   * Get payload for specific activity
   */
  getPayloadForActivity(
    contexts: ActivityReviewContext[],
    activityId: string
  ): ActivityPayload | null {
    const context = contexts.find((c) => c.activityId === activityId);
    if (!context) return null;

    const result = this.buildActivityPayload(context);
    return result.payloads[0] || null;
  }
}

export const payloadBuilder = new PayloadBuilder();
