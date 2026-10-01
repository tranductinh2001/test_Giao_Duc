/**
 * LessonReviewService - Unified Lesson Review Management
 *
 * Single source of truth for lesson review operations.
 * Wraps WorkflowService for lesson plan reviews.
 */

import { prisma } from '@/lib/prisma';
import { ReviewStatus } from '@prisma/client';
import { z } from 'zod';
import { startWorkflow, WorkflowResult, WorkflowProgress } from '@/lib/workflow-service';
import { logger } from '@/lib/logger';

// ====================
// Validation Schemas
// ====================

export const StartReviewSchema = z.object({
  lessonPlanId: z.string(),
  userId: z.string(),
  templateId: z.string().optional(),
  templateCode: z.string().optional(),
  aiModel: z.string().optional(),
  skipStructureValidation: z.boolean().optional(),
  skipContentReview: z.boolean().optional(),
  textbookBookId: z.string().optional(),
  textbookLessonTitle: z.string().optional(),
});

export const ReviewOptionsSchema = z.object({
  lessonPlanId: z.string(),
  includeSuggestions: z.boolean().default(true),
  includeAnnotations: z.boolean().default(true),
  generateSuggestions: z.boolean().default(true),
  autoFix: z.boolean().default(false),
});

export type StartReviewInput = z.infer<typeof StartReviewSchema>;
export type ReviewOptionsInput = z.infer<typeof ReviewOptionsSchema>;

// ====================
// Types
// ====================

export interface ReviewSession {
  id: string;
  lessonPlanId: string;
  userId: string;
  status: ReviewStatus;
  progress: number;
  currentStep: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
}

export interface ReviewResult {
  sessionId: string;
  lessonPlanId: string;
  status: ReviewStatus;
  overallScore: number;
  structureScore: number;
  contentScore: number;
  suggestions: ReviewSuggestion[];
  annotations: ReviewAnnotation[];
  metrics: {
    totalAiCalls: number;
    totalTokens: number;
    totalCost: number;
    executionTime: number;
  };
  error?: string;
}

export interface ReviewSuggestion {
  id: string;
  sectionCode: string;
  sectionName: string;
  type: 'CONTENT' | 'STRUCTURE' | 'FORMAT' | 'SUGGESTION';
  severity: 'ERROR' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  suggestion: string;
  priority: number;
  autoFixable: boolean;
}

export interface ReviewAnnotation {
  id: string;
  sectionId: string;
  sectionCode: string;
  position: {
    start: number;
    end: number;
  };
  type: 'ERROR' | 'WARNING' | 'SUGGESTION' | 'COMMENT';
  message: string;
  suggestion?: string;
  applied: boolean;
}

// ====================
// Service Class
// ====================

export class LessonReviewService {
  /**
   * Start a new review for a lesson plan
   */
  async startReview(input: StartReviewInput): Promise<string> {
    // Validate lesson plan exists
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: input.lessonPlanId },
    });

    if (!lessonPlan) {
      throw new Error('Lesson plan not found');
    }

    // Validate template if provided
    if (input.templateId) {
      const template = await prisma.rule_templates.findUnique({
        where: { id: input.templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }
    }

    // Start workflow
    const sessionId = await startWorkflow({
      lessonPlanId: input.lessonPlanId,
      userId: input.userId,
      templateId: input.templateId,
      templateCode: input.templateCode,
      aiModel: input.aiModel,
      skipStructureValidation: input.skipStructureValidation,
      skipContentReview: input.skipContentReview,
      textbookBookId: input.textbookBookId,
      textbookLessonTitle: input.textbookLessonTitle,
    });

    logger.logWorkflowStart({
      sessionId,
      workflowId: sessionId,
      lessonPlanId: input.lessonPlanId,
      userId: input.userId,
    });

    return sessionId;
  }

  /**
   * Get review session by ID
   */
  async getSession(sessionId: string): Promise<ReviewSession | null> {
    const session = await prisma.workflowSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return null;

    return {
      id: session.id,
      lessonPlanId: session.lessonPlanId,
      userId: session.userId,
      status: session.status as ReviewStatus,
      progress: session.progress,
      currentStep: session.currentStep,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      errorMessage: session.error,
    };
  }

  /**
   * Get review progress for a lesson plan
   */
  async getProgress(lessonPlanId: string): Promise<WorkflowProgress | null> {
    const session = await prisma.workflowSession.findFirst({
      where: { lessonPlanId },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) return null;

    return {
      sessionId: session.id,
      status: session.status,
      currentStep: session.currentStep,
      progress: session.progress,
      steps: [], // Would need to track individual steps
    };
  }

  /**
   * Get review results for a lesson plan
   */
  async getResults(lessonPlanId: string): Promise<ReviewResult | null> {
    const session = await prisma.workflowSession.findFirst({
      where: { lessonPlanId },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) return null;

    // Get annotations - try to find the model or use empty array
    let annotations: ReviewAnnotation[] = [];
    let suggestions: ReviewSuggestion[] = [];

    try {
      const annots = await prisma.$queryRaw<ReviewAnnotation[]>`
        SELECT * FROM "review_annotations" WHERE "lessonPlanId" = ${lessonPlanId} ORDER BY "createdAt" DESC
      `;
      annotations = annots;
    } catch {
      // Table may not exist
    }

    try {
      const suggs = await prisma.$queryRaw<ReviewSuggestion[]>`
        SELECT * FROM "review_suggestions" WHERE "lessonPlanId" = ${lessonPlanId} ORDER BY priority DESC
      `;
      suggestions = suggs;
    } catch {
      // Table may not exist
    }

    // Extract metrics from result JSON
    let metrics = {
      totalAiCalls: 0,
      totalTokens: 0,
      totalCost: 0,
      executionTime: 0,
    };
    if (session.result && typeof session.result === 'object') {
      const res = session.result as Record<string, any>;
      metrics = {
        totalAiCalls: typeof res.totalAiCalls === 'number' ? res.totalAiCalls : 0,
        totalTokens: typeof res.totalTokens === 'number' ? res.totalTokens : 0,
        totalCost: typeof res.totalCost === 'number' ? res.totalCost : 0,
        executionTime: typeof res.executionTime === 'number' ? res.executionTime : 0,
      };
    }

    return {
      sessionId: session.id,
      lessonPlanId: session.lessonPlanId,
      status: session.status as ReviewStatus,
      overallScore: 0,
      structureScore: 0,
      contentScore: 0,
      suggestions,
      annotations,
      metrics,
      error: session.error || undefined,
    };
  }

  /**
   * Get all review sessions for a lesson plan
   */
  async getSessionsByLessonPlan(lessonPlanId: string): Promise<ReviewSession[]> {
    const sessions = await prisma.workflowSession.findMany({
      where: { lessonPlanId },
      orderBy: { startedAt: 'desc' },
    });

    return sessions.map(s => ({
      id: s.id,
      lessonPlanId: s.lessonPlanId,
      userId: s.userId,
      status: s.status as ReviewStatus,
      progress: s.progress,
      currentStep: s.currentStep,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      errorMessage: s.error,
    }));
  }

  /**
   * Cancel an in-progress review
   */
  async cancelReview(sessionId: string): Promise<void> {
    await prisma.workflowSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        currentStep: 'CANCELLED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Retry a failed review
   */
  async retryReview(sessionId: string): Promise<string> {
    const session = await prisma.workflowSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Review session not found');
    }

    // Start new review with same parameters
    return this.startReview({
      lessonPlanId: session.lessonPlanId,
      userId: session.userId,
    });
  }

  /**
   * Apply a suggestion to the lesson plan
   */
  async applySuggestion(suggestionId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE "review_suggestions" SET "appliedAt" = NOW() WHERE id = ${suggestionId}
      `;
    } catch {
      // Table may not exist
      console.warn('applySuggestion: Table not found');
    }
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string, reason?: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE "review_suggestions" SET "dismissedAt" = NOW(), "dismissReason" = ${reason} WHERE id = ${suggestionId}
      `;
    } catch {
      // Table may not exist
      console.warn('dismissSuggestion: Table not found');
    }
  }

  /**
   * Get review statistics for a user
   */
  async getUserReviewStats(userId: string): Promise<{
    totalReviews: number;
    completedReviews: number;
    failedReviews: number;
    averageScore: number;
    averageExecutionTime: number;
  }> {
    const sessions = await prisma.workflowSession.findMany({
      where: { userId },
    });

    const completed = sessions.filter(s => s.status === 'COMPLETED');
    const failed = sessions.filter(s => s.status === 'FAILED');

    const totalTime = completed.reduce((sum, s) => {
      if (s.startedAt && s.completedAt) {
        return sum + (s.completedAt.getTime() - s.startedAt.getTime());
      }
      return sum;
    }, 0);

    return {
      totalReviews: sessions.length,
      completedReviews: completed.length,
      failedReviews: failed.length,
      averageScore: 0, // TODO: Calculate from review results
      averageExecutionTime: completed.length > 0 ? totalTime / completed.length : 0,
    };
  }

  /**
   * Get pending reviews (for admin/queue)
   */
  async getPendingReviews(limit = 20): Promise<ReviewSession[]> {
    const sessions = await prisma.workflowSession.findMany({
      where: {
        status: { in: ['PENDING', 'PARSING', 'MAPPING', 'BUILDING_CONTEXT', 'AI_REVIEWING', 'GENERATING_SUGGESTIONS'] },
      },
      orderBy: { startedAt: 'asc' },
      take: limit,
    });

    return sessions.map(s => ({
      id: s.id,
      lessonPlanId: s.lessonPlanId,
      userId: s.userId,
      status: s.status as ReviewStatus,
      progress: s.progress,
      currentStep: s.currentStep,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      errorMessage: s.error,
    }));
  }

  /**
   * Get review history with filters
   */
  async getHistory(options: {
    userId?: string;
    lessonPlanId?: string;
    status?: ReviewStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: ReviewSession[]; total: number }> {
    const { userId, lessonPlanId, status, page = 1, limit = 20 } = options;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (lessonPlanId) where.lessonPlanId = lessonPlanId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.workflowSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      prisma.workflowSession.count({ where }),
    ]);

    const mappedData = data.map(s => ({
      id: s.id,
      lessonPlanId: s.lessonPlanId,
      userId: s.userId,
      status: s.status as ReviewStatus,
      progress: s.progress,
      currentStep: s.currentStep,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      errorMessage: s.error,
    }));

    return { data: mappedData, total };
  }
}

// ====================
// Singleton Export
// ====================

export const lessonReviewService = new LessonReviewService();
