/**
 * Background Queue Service
 * Manages async jobs with states: pending, running, paused, completed, failed, retry, cancel, resume
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type QueueStatus =
  | "PENDING"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "RETRY"
  | "CANCELLED";

export type JobType =
  | "TEXTBOOK_INDEX"
  | "TEXTBOOK_EXTRACT"
  | "OCR_PROCESS"
  | "LESSON_PLAN_PROCESS"
  | "WORKFLOW_EXECUTE";

export interface QueueJob {
  id: string;
  type: JobType;
  status: QueueStatus;
  payload: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  progress: number;
  priority: number;
  retryCount: number;
  maxRetries: number;
  startedAt?: Date;
  completedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueStats {
  total: number;
  pending: number;
  running: number;
  paused: number;
  completed: number;
  failed: number;
  retry: number;
  cancelled: number;
}

/**
 * Create a new background job
 */
export async function createJob(
  type: JobType,
  payload: Record<string, any>,
  options: {
    priority?: number;
    maxRetries?: number;
    scheduledAt?: Date;
  } = {}
): Promise<string> {
  const { priority = 0, maxRetries = 3, scheduledAt } = options;

  const job = await prisma.textbookQueueJob.create({
    data: {
      id: crypto.randomUUID(),
      type,
      status: "PENDING",
      payload,
      progress: 0,
      priority,
      retryCount: 0,
      maxRetries,
      scheduledAt,
    },
  });

  return job.id;
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string): Promise<QueueJob | null> {
  const job = await prisma.textbookQueueJob.findUnique({
    where: { id: jobId },
  });

  return job as QueueJob | null;
}

/**
 * Get next pending job
 */
export async function getNextJob(types?: JobType[]): Promise<QueueJob | null> {
  const where: any = {
    status: { in: ["PENDING", "RETRY"] },
  };

  if (types && types.length > 0) {
    where.type = { in: types };
  }

  // Check scheduled jobs
  where.OR = [
    { scheduledAt: null },
    { scheduledAt: { lte: new Date() } },
  ];

  const job = await prisma.textbookQueueJob.findFirst({
    where,
    orderBy: [
      { priority: "desc" },
      { createdAt: "asc" },
    ],
  });

  return job as QueueJob | null;
}

/**
 * Start processing a job (mark as RUNNING)
 */
export async function startJob(jobId: string): Promise<void> {
  await prisma.textbookQueueJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  progress: number,
  result?: Record<string, any>
): Promise<void> {
  await prisma.textbookQueueJob.update({
    where: { id: jobId },
    data: {
      progress,
      ...(result && { result }),
      updatedAt: new Date(),
    },
  });
}

/**
 * Complete a job successfully
 */
export async function completeJob(
  jobId: string,
  result: Record<string, any>
): Promise<void> {
  await prisma.textbookQueueJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      progress: 100,
      result,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Fail a job
 */
export async function failJob(
  jobId: string,
  error: string,
  options: { shouldRetry?: boolean } = {}
): Promise<{ shouldRetry: boolean; retryCount: number }> {
  const job = await prisma.textbookQueueJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return { shouldRetry: false, retryCount: 0 };
  }

  const { shouldRetry: retry = false } = options;
  const canRetry = retry && job.retryCount < job.maxRetries;

  await prisma.textbookQueueJob.update({
    where: { id: jobId },
    data: {
      status: canRetry ? "RETRY" : "FAILED",
      error,
      retryCount: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  return { shouldRetry: canRetry, retryCount: job.retryCount + 1 };
}

/**
 * Pause a running job
 */
export async function pauseJob(jobId: string): Promise<void> {
  await prisma.textbookQueueJob.update({
    where: { id: jobId },
    data: {
      status: "PAUSED",
      updatedAt: new Date(),
    },
  });
}

/**
 * Resume a paused job
 */
export async function resumeJob(jobId: string): Promise<void> {
  await prisma.textbookQueueJob.update({
    where: { id: jobId },
    data: {
      status: "PENDING",
      updatedAt: new Date(),
    },
  });
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<void> {
  await prisma.textbookQueueJob.update({
    where: { id: jobId },
    data: {
      status: "CANCELLED",
      updatedAt: new Date(),
    },
  });
}

/**
 * Get queue statistics
 */
export async function getQueueStats(types?: JobType[]): Promise<QueueStats> {
  const where: any = {};

  if (types && types.length > 0) {
    where.type = { in: types };
  }

  const [total, pending, running, paused, completed, failed, retry, cancelled] =
    await Promise.all([
      prisma.textbookQueueJob.count({ where }),
      prisma.textbookQueueJob.count({ where: { ...where, status: "PENDING" } }),
      prisma.textbookQueueJob.count({ where: { ...where, status: "RUNNING" } }),
      prisma.textbookQueueJob.count({ where: { ...where, status: "PAUSED" } }),
      prisma.textbookQueueJob.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.textbookQueueJob.count({ where: { ...where, status: "FAILED" } }),
      prisma.textbookQueueJob.count({ where: { ...where, status: "RETRY" } }),
      prisma.textbookQueueJob.count({ where: { ...where, status: "CANCELLED" } }),
    ]);

  return {
    total,
    pending,
    running,
    paused,
    completed,
    failed,
    retry,
    cancelled,
  };
}

/**
 * Get jobs by status
 */
export async function getJobs(
  status: QueueStatus | QueueStatus[],
  options: {
    type?: JobType[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<QueueJob[]> {
  const { type, limit = 50, offset = 0 } = options;

  const where: any = {
    status: Array.isArray(status) ? { in: status } : status,
  };

  if (type) {
    where.type = { in: type };
  }

  const jobs = await prisma.textbookQueueJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return jobs as QueueJob[];
}

/**
 * Clear completed/failed jobs older than specified days
 */
export async function clearOldJobs(daysOld: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const result = await prisma.textbookQueueJob.deleteMany({
    where: {
      status: { in: ["COMPLETED", "FAILED", "CANCELLED"] },
      updatedAt: { lt: cutoff },
    },
  });

  return result.count;
}

/**
 * Process queue - main worker loop
 * Call this periodically to process jobs
 */
export async function processQueue(
  types: JobType[] = [],
  processor: (job: QueueJob) => Promise<void>
): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  while (true) {
    const job = await getNextJob(types);

    if (!job) {
      break;
    }

    try {
      await startJob(job.id);
      await processor(job);
      await completeJob(job.id, { processedAt: new Date().toISOString() });
      processed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Job ${job.id}: ${errorMessage}`);

      const { shouldRetry } = await failJob(job.id, errorMessage, { shouldRetry: true });

      if (!shouldRetry) {
        failed++;
      }
    }
  }

  return { processed, failed, errors };
}
