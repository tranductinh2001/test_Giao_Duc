/**
 * Statistics Service
 *
 * Phase 3: Calculates payload statistics
 */

import type {
  ActivityReviewData,
  ActivityChunk,
  ReviewStatistics,
  PayloadStatistics,
  OverallPayloadStatistics,
  ActivityReviewContext,
} from "../types";

export class StatisticsService {
  /**
   * Calculate statistics for review output
   */
  calculateStatistics(
    activities: ActivityReviewData[],
    contexts: ActivityReviewContext[]
  ): ReviewStatistics {
    let totalTokens = 0;
    let totalCharacters = 0;
    let rulesCount = 0;
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;
    let unknown = 0;

    for (const activity of activities) {
      totalTokens += activity.estimatedTokens;
      totalCharacters += activity.characterCount;

      // Count chunks
      for (const chunk of activity.chunks) {
        rulesCount += chunk.rules.length;
      }

      // Count confidence levels
      const confidence = contexts.find((c) => c.activityId === activity.activityId)?.confidence ?? 0;
      if (confidence >= 80) {
        highConfidence++;
      } else if (confidence >= 50) {
        mediumConfidence++;
      } else if (confidence > 0) {
        lowConfidence++;
      } else {
        unknown++;
      }
    }

    const totalChunks = activities.reduce((sum, a) => sum + a.chunks.length, 0);

    return {
      activityCount: activities.length,
      chunkCount: totalChunks,
      totalEstimatedTokens: totalTokens,
      averageChunkSize: totalChunks > 0 ? Math.round(totalTokens / totalChunks) : 0,
      totalCharacterCount: totalCharacters,
      rulesApplied: rulesCount,
      highConfidenceCount: highConfidence,
      mediumConfidenceCount: mediumConfidence,
      lowConfidenceCount: lowConfidence,
      unknownCount: unknown,
    };
  }

  /**
   * Calculate payload statistics for a single activity
   */
  calculateActivityPayloadStats(activity: ActivityReviewData): PayloadStatistics {
    return {
      activityId: activity.activityId,
      estimatedTokens: activity.estimatedTokens,
      characterCount: activity.characterCount,
      chunkCount: activity.chunks.length,
      isChunked: activity.chunks.length > 1,
    };
  }

  /**
   * Calculate overall payload statistics
   */
  calculateOverallPayloadStats(activities: ActivityReviewData[]): OverallPayloadStatistics {
    const totalTokens = activities.reduce((sum, a) => sum + a.estimatedTokens, 0);
    const totalChars = activities.reduce((sum, a) => sum + a.characterCount, 0);
    const totalChunks = activities.reduce((sum, a) => sum + a.chunks.length, 0);

    // Estimate JSON size (rough: tokens * 4 bytes)
    const payloadSizeKB = (totalTokens * 4) / 1024;

    return {
      totalActivities: activities.length,
      totalChunks,
      totalEstimatedTokens: totalTokens,
      totalCharacterCount: totalChars,
      averageTokensPerActivity: activities.length > 0 ? Math.round(totalTokens / activities.length) : 0,
      averageCharactersPerActivity: activities.length > 0 ? Math.round(totalChars / activities.length) : 0,
      payloadSizeKB: Math.round(payloadSizeKB * 100) / 100,
    };
  }

  /**
   * Estimate tokens from text
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English, ~2 for Vietnamese
    // Use average
    return Math.ceil(text.length / 3);
  }

  /**
   * Estimate tokens from chunks
   */
  estimateChunkTokens(chunk: ActivityChunk): number {
    const content = chunk.paragraphs.join("\n\n");
    return this.estimateTokens(content);
  }

  /**
   * Check if payload exceeds threshold
   */
  exceedsThreshold(activities: ActivityReviewData[], maxTokens: number): boolean {
    const total = activities.reduce((sum, a) => sum + a.estimatedTokens, 0);
    return total > maxTokens;
  }

  /**
   * Get activities that need chunking
   */
  getActivitiesNeedingChunking(
    activities: ActivityReviewData[],
    maxTokens: number
  ): string[] {
    return activities
      .filter((a) => a.estimatedTokens > maxTokens)
      .map((a) => a.activityId);
  }
}

export const statisticsService = new StatisticsService();
