/**
 * AI Review Engine
 *
 * Phase 4: Main orchestration for AI-based review
 * Pipeline: ReviewContextBuilder → Review Queue → Prompt Builder → Gemini → JSON Validator → Review Result
 */

import {
  ActivityPayload,
  ReviewJob,
  ActivityReviewResult,
  ReviewSession,
  ReviewStatistics,
  AIReviewEngineConfig,
  QueueStatus,
  ReviewStatus,
  CacheEntry,
  DEFAULT_REVIEW_ENGINE_CONFIG,
  ReviewScoreLevel,
} from "../types";
import { PromptBuilder } from "../services/PromptBuilder";
import { GeminiClient } from "../services/GeminiClient";
import { ReviewQueue } from "../services/ReviewQueue";
import { JSONValidator } from "../services/JSONValidator";

export interface ReviewEngineInput {
  lessonPlanId: string;
  payloads: ActivityPayload[];
}

export interface ReviewEngineResult {
  session: ReviewSession;
  statistics: ReviewStatistics;
}

export class AIReviewEngine {
  private config: AIReviewEngineConfig;
  private promptBuilder: PromptBuilder;
  private geminiClient: GeminiClient;
  private reviewQueue: ReviewQueue;
  private jsonValidator: JSONValidator;
  private cache: Map<string, CacheEntry<ActivityReviewResult>> = new Map();
  private logs: Array<{
    id: string;
    sessionId: string;
    activityId: string;
    timestamp: Date;
    type: string;
    message: string;
    data?: Record<string, unknown>;
    latency?: number;
    tokens?: number;
  }> = [];

  constructor(config: Partial<AIReviewEngineConfig> = {}) {
    this.config = { ...DEFAULT_REVIEW_ENGINE_CONFIG, ...config };
    this.promptBuilder = new PromptBuilder();
    this.geminiClient = new GeminiClient(this.config.gemini);
    this.reviewQueue = new ReviewQueue(this.config.queue);
    this.jsonValidator = new JSONValidator();

    this.setupQueueProcessor();
  }

  /**
   * Set up queue processor
   */
  private setupQueueProcessor(): void {
    this.reviewQueue.setProcessor(async (job) => {
      return this.processActivity(job.payload, job.sessionId);
    });
  }

  /**
   * Start review session
   */
  async startReview(input: ReviewEngineInput): Promise<ReviewEngineResult> {
    const sessionId = this.generateId();

    this.log(sessionId, "info", `Starting review session for lesson plan ${input.lessonPlanId}`);

    // Create session
    const session: ReviewSession = {
      sessionId,
      lessonPlanId: input.lessonPlanId,
      status: ReviewStatus.PROCESSING,
      activities: [],
      startedAt: new Date(),
    };

    // Check cache and filter payloads
    const { cached, toReview } = this.filterCachedPayloads(input.payloads);

    this.log(sessionId, "info", `${cached.length} cached, ${toReview.length} to review`);

    // Process cached results
    for (const result of cached) {
      session.activities.push(result);
    }

    // Create jobs for queue
    const jobs: ReviewJob[] = toReview.map((payload) => ({
      jobId: this.generateId(),
      sessionId,
      activityId: payload.activityId,
      payload,
      status: ReviewStatus.PENDING,
      retryCount: 0,
      maxRetries: this.config.queue.maxRetries,
      createdAt: new Date(),
    }));

    // Enqueue jobs
    this.reviewQueue.enqueueMany(jobs);

    // Wait for completion
    await this.waitForCompletion(sessionId);

    // Get all results
    const allJobs = this.reviewQueue.getAllJobs().filter((j) => j.sessionId === sessionId);
    for (const job of allJobs) {
      if (job.result) {
        session.activities.push(job.result);
      }
    }

    // Complete session
    session.status = ReviewStatus.COMPLETED;
    session.completedAt = new Date();

    // Calculate statistics
    const statistics = this.calculateStatistics(session, cached.length);

    this.log(sessionId, "info", `Review completed. Score: ${statistics.averageScore.toFixed(1)}`);

    return { session, statistics };
  }

  /**
   * Process single activity
   */
  private async processActivity(
    payload: ActivityPayload,
    sessionId: string
  ): Promise<ActivityReviewResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(payload);

    // Check cache
    if (this.config.enableCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.log(sessionId, "info", `Cache hit for ${payload.activityId}`);
        return cached;
      }
    }

    this.log(sessionId, "prompt", `Generating prompt for ${payload.activityId}`);

    // Build prompt
    const prompt = this.promptBuilder.buildPrompt(payload);
    const systemPrompt = this.promptBuilder.buildSystemPrompt();

    // Call Gemini
    this.log(sessionId, "info", `Calling Gemini for ${payload.activityId}`);

    const geminiResult = await this.geminiClient.generateContent(prompt, systemPrompt);

    if (!geminiResult.success) {
      this.log(sessionId, "error", `Gemini error: ${geminiResult.error}`);
      throw new Error(geminiResult.error);
    }

    this.log(sessionId, "response", `Received response for ${payload.activityId}`, {
      latency: geminiResult.latency,
      tokens: geminiResult.tokensUsed,
    });

    // Validate JSON
    const validationResult = this.jsonValidator.validate(geminiResult.content!, payload.activityId);

    if (!validationResult.valid) {
      const errorMsg = validationResult.errors.join(", ");
      this.log(sessionId, "error", `Validation error: ${errorMsg}`);
      throw new Error(`Validation failed: ${errorMsg}`);
    }

    if (!validationResult.result) {
      throw new Error("No result after validation");
    }

    // Update result with metadata
    const result: ActivityReviewResult = {
      ...validationResult.result,
      activityCode: payload.activityCode,
      activityTitle: payload.activityTitle,
      reviewTime: Date.now() - startTime,
      tokensUsed: geminiResult.tokensUsed,
    };

    // Cache result
    if (this.config.enableCache) {
      this.setToCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Filter cached payloads
   */
  private filterCachedPayloads(
    payloads: ActivityPayload[]
  ): { cached: ActivityReviewResult[]; toReview: ActivityPayload[] } {
    const cached: ActivityReviewResult[] = [];
    const toReview: ActivityPayload[] = [];

    for (const payload of payloads) {
      const cacheKey = this.getCacheKey(payload);

      if (this.config.enableCache) {
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
          cached.push(cachedResult);
          continue;
        }
      }

      toReview.push(payload);
    }

    return { cached, toReview };
  }

  /**
   * Get cache key
   */
  private getCacheKey(payload: ActivityPayload): string {
    const content = JSON.stringify({
      code: payload.activityCode,
      paragraphs: payload.content.paragraphs,
      rules: payload.rules.map((r) => r.code),
    });
    return this.hashString(content);
  }

  /**
   * Simple hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): ActivityReviewResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set cache
   */
  private setToCache(key: string, value: ActivityReviewResult): void {
    const entry: CacheEntry<ActivityReviewResult> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL,
    };
    this.cache.set(key, entry);
  }

  /**
   * Wait for queue completion
   */
  private async waitForCompletion(sessionId: string): Promise<void> {
    while (true) {
      const status = this.reviewQueue.getStatus();
      const currentJob = this.reviewQueue.getCurrentJob();

      // Check if all jobs for this session are done
      const sessionJobs = this.reviewQueue.getAllJobs().filter((j) => j.sessionId === sessionId);
      const allDone = sessionJobs.every(
        (j) => j.status === ReviewStatus.COMPLETED || j.status === ReviewStatus.FAILED
      );

      if (allDone || (status === QueueStatus.IDLE && sessionJobs.length > 0)) {
        break;
      }

      await this.sleep(100);
    }
  }

  /**
   * Calculate statistics
   */
  private calculateStatistics(session: ReviewSession, cacheHits: number): ReviewStatistics {
    const activities = session.activities;

    let totalScore = 0;
    let passedCount = 0;
    let warningCount = 0;
    let failedCount = 0;
    let totalReviewTime = 0;
    let totalTokens = 0;
    const failedActivities: string[] = [];

    for (const activity of activities) {
      totalScore += activity.score;
      totalReviewTime += activity.reviewTime;
      totalTokens += activity.tokensUsed || 0;

      if (activity.passed) {
        passedCount++;
      } else if (activity.issues.some((i) => i.severity === "ERROR")) {
        failedCount++;
      } else {
        warningCount++;
      }

      if (!activity.passed) {
        failedActivities.push(activity.activityId);
      }
    }

    const totalActivities = activities.length;
    const averageScore = totalActivities > 0 ? totalScore / totalActivities : 0;
    const averageReviewTime = totalActivities > 0 ? totalReviewTime / totalActivities : 0;

    // Estimate cost
    const estimatedCost = this.geminiClient.calculateCost(totalTokens, totalTokens * 0.5);

    return {
      sessionId: session.sessionId,
      totalActivities,
      passedCount,
      warningCount,
      failedCount,
      averageScore,
      totalReviewTime,
      averageReviewTime,
      totalTokens,
      estimatedCost,
      cacheHits,
      cacheMisses: totalActivities - cacheHits,
      retries: 0, // Would need to track in queue
      failedActivities,
    };
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Log message
   */
  private log(
    sessionId: string,
    type: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const logLevel = this.config.logLevel;
    const isDebugMode = logLevel === "debug";
    if (isDebugMode || (!isDebugMode && type !== "prompt")) {
      const entry = {
        id: this.generateId(),
        sessionId,
        activityId: "",
        timestamp: new Date(),
        type,
        message,
        data,
      };
      this.logs.push(entry);

      // Keep only last 1000 logs
      if (this.logs.length > 1000) {
        this.logs = this.logs.slice(-1000);
      }

      // Console output based on level
      if (this.config.logLevel === "debug" || type === "error") {
        console.log(`[${type.toUpperCase()}] ${message}`, data || "");
      }
    }
  }

  /**
   * Get logs
   */
  getLogs(sessionId?: string): typeof this.logs {
    if (sessionId) {
      return this.logs.filter((l) => l.sessionId === sessionId);
    }
    return this.logs;
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get queue status
   */
  getQueueStatus(): QueueStatus {
    return this.reviewQueue.getStatus();
  }

  /**
   * Pause review
   */
  pause(): void {
    this.reviewQueue.pause();
  }

  /**
   * Resume review
   */
  resume(): void {
    this.reviewQueue.resume();
  }

  /**
   * Cancel session
   */
  cancelSession(sessionId: string): void {
    const jobs = this.reviewQueue.getAllJobs().filter((j) => j.sessionId === sessionId);
    for (const job of jobs) {
      this.reviewQueue.cancelJob(job.jobId);
    }
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<AIReviewEngineConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.gemini) {
      this.geminiClient.updateConfig(config.gemini);
    }
    if (config.queue) {
      this.reviewQueue.updateConfig(config.queue);
    }
  }

  /**
   * Get config
   */
  getConfig(): AIReviewEngineConfig {
    return { ...this.config };
  }

  /**
   * Set API key
   */
  setApiKey(key: string): void {
    this.geminiClient.setApiKey(key);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const aiReviewEngine = new AIReviewEngine();
