/**
 * Workflow Orchestrator
 *
 * Phase 5: Main orchestration for the complete review pipeline
 * Pipeline: Upload → Parser → Knowledge Mapping → Review Context → AI Review → Result
 */

import {
  WorkflowStatus,
  WorkflowEvent,
  WorkflowConfig,
  DEFAULT_WORKFLOW_CONFIG,
  WorkflowProgress,
  WorkflowStepProgress,
  WorkflowResult,
  WorkflowLogEntry,
  WorkflowEventHandler,
  WorkflowEventPayload,
  WorkflowStepKey,
} from "../types";

// Types from other phases
import type { DocumentStructure } from "../../review-context/types";
import type { MappingResult } from "../../knowledge-mapping/types";
import type { KnowledgeMappingInput } from "../../knowledge-mapping/engine/MappingEngine";
import type { ActivityPayload, ReviewSession, ReviewStatistics } from "../../ai-review/types";

export class WorkflowOrchestrator {
  private config: WorkflowConfig;
  private sessions: Map<string, WorkflowSession> = new Map();
  private eventHandlers: Map<WorkflowEvent, WorkflowEventHandler[]> = new Map();
  private logs: Map<string, WorkflowLogEntry[]> = new Map();

  constructor(config: Partial<WorkflowConfig> = {}) {
    this.config = { ...DEFAULT_WORKFLOW_CONFIG, ...config };
  }

  /**
   * Start a new review workflow
   */
  async startReview(
    userId: string,
    options: {
      document?: { fileName: string; content: Buffer | string };
      templateId?: string;
      lessonId?: string;
      config?: Partial<WorkflowConfig>;
    }
  ): Promise<{ sessionId: string; status: WorkflowStatus; progress: number }> {
    const sessionId = this.generateId();

    // Merge config
    const mergedConfig = options.config ? { ...this.config, ...options.config } : { ...this.config };

    // Create session
    const session: WorkflowSession = {
      sessionId,
      userId,
      documentId: undefined,
      templateId: options.templateId,
      lessonId: options.lessonId,
      status: WorkflowStatus.UPLOADED,
      currentStep: "UPLOADED",
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      config: mergedConfig,
      steps: {
        UPLOADED: { step: "UPLOADED", status: "completed", retryCount: 0 },
        PARSING: { step: "PARSING", status: "pending", retryCount: 0 },
        MAPPING: { step: "MAPPING", status: "pending", retryCount: 0 },
        BUILDING_CONTEXT: { step: "BUILDING_CONTEXT", status: "pending", retryCount: 0 },
        AI_REVIEWING: { step: "AI_REVIEWING", status: "pending", retryCount: 0 },
        COMPLETED: { step: "COMPLETED", status: "pending", retryCount: 0 },
      },
      data: {
        parser: null,
        mapping: null,
        context: null,
        review: null,
      },
    };

    this.sessions.set(sessionId, session);
    this.log(sessionId, "UPLOADED", "info", "Workflow started");

    // Emit event
    this.emit(WorkflowEvent.DOCUMENT_UPLOADED, sessionId);

    // Start processing
    this.executeWorkflow(sessionId, options.document);

    return {
      sessionId,
      status: session.status,
      progress: session.progress,
    };
  }

  /**
   * Execute the workflow pipeline
   */
  private async executeWorkflow(
    sessionId: string,
    document?: { fileName: string; content: Buffer | string }
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      // Step 1: PARSING
      await this.executeStep(sessionId, "PARSING", async () => {
        if (!document) {
          throw new Error("No document provided");
        }
        return await this.runParser(session, document);
      });

      // Step 2: MAPPING
      await this.executeStep(sessionId, "MAPPING", async () => {
        return await this.runMapping(session);
      });

      // Step 3: BUILDING_CONTEXT
      await this.executeStep(sessionId, "BUILDING_CONTEXT", async () => {
        return await this.runContextBuilder(session);
      });

      // Step 4: AI_REVIEWING
      await this.executeStep(sessionId, "AI_REVIEWING", async () => {
        return await this.runAIReview(session);
      });

      // Complete
      session.status = WorkflowStatus.COMPLETED;
      session.progress = 100;
      session.steps.COMPLETED.status = "completed";
      session.completedAt = new Date();
      session.updatedAt = new Date();

      this.log(sessionId, "COMPLETED", "info", "Workflow completed successfully");
      this.emit(WorkflowEvent.WORKFLOW_COMPLETED, sessionId, { progress: 100 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      session.status = WorkflowStatus.FAILED;
      session.error = errorMessage;
      session.updatedAt = new Date();

      this.log(sessionId, session.currentStep, "error", `Workflow failed: ${errorMessage}`);
      this.emit(WorkflowEvent.WORKFLOW_FAILED, sessionId, { error: errorMessage });
    }
  }

  /**
   * Execute a single workflow step with retry logic
   */
  private async executeStep(
    sessionId: string,
    step: WorkflowStepKey,
    executor: () => Promise<unknown>
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const stepConfig = session.config.global;
    const maxRetries = this.getMaxRetriesForStep(step);
    const timeout = this.getTimeoutForStep(step);

    session.currentStep = step;
    session.status = this.getStatusForStep(step);
    session.progress = this.getProgressForStep(step);
    session.steps[step].status = "running";
    session.steps[step].startedAt = new Date();
    session.updatedAt = new Date();

    this.log(sessionId, step, "info", `Step ${step} started`);
    this.emitEventForStep(step, sessionId, "started");

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await this.executeWithTimeout(executor, timeout);
        const duration = Date.now() - startTime;

        session.steps[step].status = "completed";
        session.steps[step].completedAt = new Date();
        session.steps[step].retryCount = attempt;

        // Save intermediate data
        this.saveStepData(session, step, result);

        this.log(sessionId, step, "info", `Step ${step} completed`, { duration, attempt });
        this.emitEventForStep(step, sessionId, "completed");

        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        session.steps[step].retryCount = attempt + 1;

        if (attempt < maxRetries) {
          this.log(sessionId, step, "warn", `Step ${step} failed, retrying...`, { error: errorMessage, attempt: attempt + 1 });
          this.emitEventForStep(step, sessionId, "failed", { retry: true, attempt: attempt + 1 });

          // Wait before retry
          await this.sleep(this.config.review.retryDelay * (attempt + 1));
        } else {
          session.steps[step].status = "failed";
          session.steps[step].error = errorMessage;
          session.steps[step].completedAt = new Date();

          this.log(sessionId, step, "error", `Step ${step} failed after ${attempt + 1} attempts`, { error: errorMessage });
          this.emitEventForStep(step, sessionId, "failed", { error: errorMessage });

          throw error;
        }
      }
    }
  }

  /**
   * Run Parser (Phase 1)
   * Uses LessonPlanPipeline from Phase 1
   */
  private async runParser(
    session: WorkflowSession,
    document: { fileName: string; content: Buffer | string }
  ): Promise<DocumentStructure> {
    this.emit(WorkflowEvent.PARSER_STARTED, session.sessionId);

    // Import and use actual pipeline from Phase 1
    const { LessonPlanPipeline } = await import("../../lesson-plan-pipeline/Pipeline");

    const pipeline = new LessonPlanPipeline();
    const result = await pipeline.execute(document.content as unknown as Buffer, document.fileName);

    const docStructure: DocumentStructure = {
      title: document.fileName,
      sections: [],
      metadata: { totalSections: 0, totalActivities: 0 },
    };

    session.data.parser = {
      document: docStructure,
      metadata: {
        fileName: document.fileName,
        fileSize: document.content.length,
        parseTime: 0,
      },
    };

    this.emit(WorkflowEvent.PARSER_COMPLETED, session.sessionId, {
      documentId: session.sessionId,
    });

    return docStructure;
  }

  /**
   * Run Knowledge Mapping (Phase 2)
   */
  private async runMapping(session: WorkflowSession): Promise<MappingResult> {
    this.emit(WorkflowEvent.MAPPING_STARTED, session.sessionId);

    // Get parser output
    const parserOutput = session.data.parser as any;
    if (!parserOutput?.document) {
      throw new Error("No document from parser");
    }

    // Import and use actual Mapping Engine
    const { KnowledgeMappingEngine } = await import("../../knowledge-mapping/engine/MappingEngine");

    const mappingEngine = new KnowledgeMappingEngine({});

    // Create mapping input
    const mappingInput: KnowledgeMappingInput = {
      lessonPlanId: session.lessonId || session.sessionId,
      sections: parserOutput.document.sections || [],
    };

    // Call map method
    const result = await mappingEngine.map(mappingInput);

    session.data.mapping = {
      mappingResult: result,
      statistics: {
        totalSections: result.sectionResults?.length || 0,
        matchedActivities: result.sectionResults?.reduce((sum: number, s: any) => sum + (s.matchedActivities?.length || 0), 0) || 0,
        unknownActivities: result.unknownActivities?.length || 0,
        averageConfidence: result.overallConfidence || 0,
      },
    };

    this.emit(WorkflowEvent.MAPPING_COMPLETED, session.sessionId);

    return result;
  }

  /**
   * Run Review Context Builder (Phase 3)
   */
  private async runContextBuilder(session: WorkflowSession): Promise<any> {
    this.emit(WorkflowEvent.CONTEXT_BUILDING_STARTED, session.sessionId);

    // Get previous outputs
    const parserOutput = session.data.parser as any;
    const mappingOutput = session.data.mapping as any;

    if (!parserOutput?.document || !mappingOutput?.mappingResult) {
      throw new Error("Missing parser or mapping output");
    }

    // Import and use actual Context Builder
    const { ReviewContextBuilder } = await import("../../review-context/engine/ReviewContextBuilder");

    const contextBuilder = new ReviewContextBuilder({
      maxTokensPerChunk: session.config.context.maxTokensPerChunk,
      maxCharactersPerChunk: session.config.context.maxCharactersPerChunk,
      enableOptimization: session.config.context.enableOptimization,
      enableChunking: session.config.context.enableChunking,
    });

    const result = contextBuilder.buildOutput({
      document: parserOutput.document,
      mappingResult: mappingOutput.mappingResult,
      lessonKnowledge: [],
      rules: [],
    });

    session.data.context = {
      job: result.job,
      activities: result.activities,
      statistics: result.statistics,
    };

    this.emit(WorkflowEvent.CONTEXT_BUILDING_COMPLETED, session.sessionId);

    return result;
  }

  /**
   * Run AI Review (Phase 4)
   */
  private async runAIReview(session: WorkflowSession): Promise<{ session: ReviewSession; statistics: ReviewStatistics }> {
    this.emit(WorkflowEvent.REVIEW_STARTED, session.sessionId);

    // Get context output
    const contextOutput = session.data.context as any;

    if (!contextOutput?.activities) {
      throw new Error("Missing context output");
    }

    // Convert activities to payloads
    const payloads = this.convertToPayloads(contextOutput.activities);

    // Import and use actual AI Review Engine
    const { AIReviewEngine } = await import("../../ai-review/engine/AIReviewEngine");

    const reviewEngine = new AIReviewEngine({
      gemini: {
        model: session.config.review.geminiModel as any,
        maxTokens: 8192,
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
      },
      queue: {
        maxConcurrent: session.config.review.maxConcurrent,
        retryDelay: session.config.review.retryDelay,
        maxRetries: session.config.review.maxRetries,
        timeout: session.config.review.timeout,
        enableRetry: true,
      },
      enableCache: session.config.review.enableCache,
      cacheTTL: session.config.review.cacheTTL,
    });

    // Set API key if available (check both BEE_API_KEY and GEMINI_API_KEY)
    const apiKey = process.env.BEE_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      reviewEngine.setApiKey(apiKey);
    }

    const result = await reviewEngine.startReview({
      lessonPlanId: session.lessonId || session.sessionId,
      payloads,
    });

    session.data.review = {
      session: result.session,
      statistics: result.statistics,
    };

    this.emit(WorkflowEvent.REVIEW_COMPLETED, session.sessionId, {
      score: result.statistics.averageScore,
      activities: result.statistics.totalActivities,
    });

    return result;
  }

  /**
   * Convert activities to payloads
   */
  private convertToPayloads(activities: any[]): ActivityPayload[] {
    return activities.map((activity) => ({
      activityId: activity.activityId,
      activityCode: activity.activityCode || activity.activityId,
      activityTitle: activity.activityTitle || "Unknown",
      sectionName: activity.sectionName || "Unknown",
      content: {
        paragraphs: activity.originalParagraphs || [],
      },
      rules: [],
      metadata: {
        confidence: 80,
        matchedBy: [],
      },
    }));
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): WorkflowProgress | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return this.getProgress(session);
  }

  /**
   * Get workflow progress
   */
  private getProgress(session: WorkflowSession): WorkflowProgress {
    const stepStatuses: WorkflowStepProgress[] = Object.entries(session.steps).map(([key, step]) => ({
      step: key,
      status: step.status,
      progress: step.status === "completed" ? 100 : step.status === "running" ? 50 : 0,
      message: step.error,
    }));

    return {
      sessionId: session.sessionId,
      status: session.status,
      progress: session.progress,
      currentStep: session.currentStep,
      steps: stepStatuses,
    };
  }

  /**
   * Cancel workflow
   */
  cancelSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.status === WorkflowStatus.COMPLETED || session.status === WorkflowStatus.FAILED) {
      return false;
    }

    session.status = WorkflowStatus.CANCELLED;
    session.updatedAt = new Date();

    this.log(sessionId, session.currentStep, "info", "Workflow cancelled by user");
    this.emit(WorkflowEvent.WORKFLOW_CANCELLED, sessionId);

    return true;
  }

  /**
   * Resume workflow
   */
  async resumeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (!session.config.global.enableResume) {
      throw new Error("Resume is disabled");
    }

    if (session.status === WorkflowStatus.COMPLETED || session.status === WorkflowStatus.CANCELLED) {
      throw new Error("Cannot resume completed or cancelled session");
    }

    this.log(sessionId, session.currentStep, "info", "Workflow resumed");
    this.emit(WorkflowEvent.WORKFLOW_RESUMED, sessionId);

    // Resume from current step
    await this.executeWorkflow(sessionId);

    return true;
  }

  /**
   * Get workflow result
   */
  getResult(sessionId: string): WorkflowResult | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const totalDuration = session.completedAt
      ? session.completedAt.getTime() - session.createdAt.getTime()
      : Date.now() - session.createdAt.getTime();

    const stepsCompleted = Object.values(session.steps).filter((s) => s.status === "completed").length;

    return {
      sessionId: session.sessionId,
      status: session.status,
      progress: session.progress,
      results: {
        parser: session.data.parser as any,
        mapping: session.data.mapping as any,
        context: session.data.context as any,
        review: session.data.review as any,
      },
      statistics: {
        totalDuration,
        stepsCompleted,
        totalSteps: 6,
        tokensUsed: (session.data.review as any)?.statistics?.totalTokens,
        estimatedCost: (session.data.review as any)?.statistics?.estimatedCost,
      },
      error: session.error,
    };
  }

  /**
   * Get logs for session
   */
  getLogs(sessionId: string): WorkflowLogEntry[] {
    return this.logs.get(sessionId) || [];
  }

  /**
   * Register event handler
   */
  on(event: WorkflowEvent, handler: WorkflowEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  off(event: WorkflowEvent, handler: WorkflowEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: WorkflowEvent, sessionId: string, data?: Record<string, unknown>): void {
    const payload: WorkflowEventPayload = {
      event,
      sessionId,
      timestamp: new Date(),
      data,
    };

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }
  }

  /**
   * Emit event for step
   */
  private emitEventForStep(
    step: string,
    sessionId: string,
    phase: "started" | "completed" | "failed",
    data?: Record<string, unknown>
  ): void {
    const eventMap: Record<string, Record<string, WorkflowEvent>> = {
      PARSING: {
        started: WorkflowEvent.PARSER_STARTED,
        completed: WorkflowEvent.PARSER_COMPLETED,
        failed: WorkflowEvent.PARSER_FAILED,
      },
      MAPPING: {
        started: WorkflowEvent.MAPPING_STARTED,
        completed: WorkflowEvent.MAPPING_COMPLETED,
        failed: WorkflowEvent.MAPPING_FAILED,
      },
      BUILDING_CONTEXT: {
        started: WorkflowEvent.CONTEXT_BUILDING_STARTED,
        completed: WorkflowEvent.CONTEXT_BUILDING_COMPLETED,
        failed: WorkflowEvent.CONTEXT_BUILDING_FAILED,
      },
      AI_REVIEWING: {
        started: WorkflowEvent.REVIEW_STARTED,
        completed: WorkflowEvent.REVIEW_COMPLETED,
        failed: WorkflowEvent.REVIEW_FAILED,
      },
    };

    const event = eventMap[step]?.[phase];
    if (event) {
      this.emit(event, sessionId, data);
    }
  }

  /**
   * Log workflow event
   */
  private log(
    sessionId: string,
    step: string,
    level: "info" | "warn" | "error" | "debug",
    message: string,
    data?: Record<string, unknown>
  ): void {
    const entry: WorkflowLogEntry = {
      id: this.generateId(),
      sessionId,
      step,
      timestamp: new Date(),
      level,
      message,
      status: level === "error" ? "failed" : "completed",
      data,
    };

    if (!this.logs.has(sessionId)) {
      this.logs.set(sessionId, []);
    }
    this.logs.get(sessionId)!.push(entry);

    // Console output based on log level
    const logLevel: string = this.config.global.logLevel;
    if (logLevel === "debug" || (logLevel !== "debug" && level !== "debug")) {
      console.log(`[${level.toUpperCase()}] [${step}] ${message}`, data || "");
    }
  }

  /**
   * Save step data
   */
  private saveStepData(session: WorkflowSession, step: string, data: unknown): void {
    const stepDataKey = step.toLowerCase().replace("_", "") as keyof typeof session.data;
    if (stepDataKey in session.data) {
      (session.data as any)[stepDataKey] = data;
    }
  }

  /**
   * Get max retries for step
   */
  private getMaxRetriesForStep(step: string): number {
    switch (step) {
      case "PARSING":
        return this.config.parser.maxRetries;
      case "MAPPING":
        return this.config.mapping.maxRetries;
      case "AI_REVIEWING":
        return this.config.review.maxRetries;
      default:
        return 0;
    }
  }

  /**
   * Get timeout for step
   */
  private getTimeoutForStep(step: string): number {
    switch (step) {
      case "PARSING":
        return this.config.parser.timeout;
      case "MAPPING":
        return this.config.mapping.timeout;
      case "BUILDING_CONTEXT":
        return this.config.context.timeout;
      case "AI_REVIEWING":
        return this.config.review.timeout;
      default:
        return 60000;
    }
  }

  /**
   * Get progress for step
   */
  private getProgressForStep(step: string): number {
    const progressMap: Record<string, number> = {
      UPLOADED: 5,
      PARSING: 25,
      MAPPING: 50,
      BUILDING_CONTEXT: 70,
      AI_REVIEWING: 90,
      COMPLETED: 100,
    };
    return progressMap[step] || 0;
  }

  /**
   * Get status for step
   */
  private getStatusForStep(step: string): WorkflowStatus {
    const statusMap: Record<string, WorkflowStatus> = {
      UPLOADED: WorkflowStatus.UPLOADED,
      PARSING: WorkflowStatus.PARSING,
      MAPPING: WorkflowStatus.MAPPING,
      BUILDING_CONTEXT: WorkflowStatus.BUILDING_CONTEXT,
      AI_REVIEWING: WorkflowStatus.AI_REVIEWING,
      COMPLETED: WorkflowStatus.COMPLETED,
    };
    return statusMap[step] || WorkflowStatus.PARSING;
  }

  /**
   * Calculate average confidence
   */
  private calculateAverageConfidence(result: MappingResult): number {
    const confidences: number[] = [];

    for (const section of result.sectionResults || []) {
      for (const activity of section.matchedActivities || []) {
        confidences.push(activity.confidence);
      }
    }

    if (confidences.length === 0) return 0;
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  /**
   * Execute with timeout
   */
  private executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
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
   * Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<WorkflowConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get config
   */
  getConfig(): WorkflowConfig {
    return { ...this.config };
  }

  /**
   * Get all sessions
   */
  getAllSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    this.sessions.delete(sessionId);
    this.logs.delete(sessionId);
    return true;
  }
}

// ============================================
// WORKFLOW SESSION INTERFACE
// ============================================

interface WorkflowSession {
  sessionId: string;
  userId: string;
  documentId?: string;
  templateId?: string;
  lessonId?: string;
  status: WorkflowStatus;
  currentStep: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  config: WorkflowConfig;
  steps: {
    UPLOADED: WorkflowStepData;
    PARSING: WorkflowStepData;
    MAPPING: WorkflowStepData;
    BUILDING_CONTEXT: WorkflowStepData;
    AI_REVIEWING: WorkflowStepData;
    COMPLETED: WorkflowStepData;
  };
  data: {
    parser: any;
    mapping: any;
    context: any;
    review: any;
  };
}

interface WorkflowStepData {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  data?: Record<string, unknown>;
}

// ============================================
// EXPORTS
// ============================================

export const workflowOrchestrator = new WorkflowOrchestrator();
