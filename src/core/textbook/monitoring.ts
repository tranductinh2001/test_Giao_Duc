/**
 * Monitoring Dashboard Service
 * Provides cache stats, extract times, costs, and BrightOne requests
 */

import { prisma } from "@/lib/prisma";
import { WorkflowStatus } from "@prisma/client";
import { getCacheStats } from "./cache";
import { getOcrCacheStats } from "./ocr-optimizer";
import { getQueueStats } from "./queue";

export interface DashboardStats {
  timestamp: Date;
  cache: {
    pdfCache: {
      totalEntries: number;
      totalSize: number;
      hitRate: number;
      expiredEntries: number;
    };
    ocrCache: {
      totalEntries: number;
      totalSize: number;
    };
  };
  extraction: {
    totalExtractions: number;
    averageTime: number;
    totalTime: number;
    cacheHitRate: number;
  };
  queue: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  costs: {
    totalBrightOneCalls: number;
    totalTokens: number;
    estimatedCost: number;
    cacheSavings: number;
  };
  textbooks: {
    totalBooks: number;
    indexedBooks: number;
    totalChapters: number;
    booksWithErrors: number;
  };
  workflows: {
    totalWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    averageDuration: number;
  };
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Get cache stats
  const pdfCache = await getCacheStats();
  const ocrCache = await getOcrCacheStats();

  // Get queue stats
  const queueStats = await getQueueStats();

  // Get textbook stats
  const [totalBooks, indexedBooks, totalChapters, booksWithErrors] = await Promise.all([
    prisma.textbookBook.count({ where: { isActive: true } }),
    prisma.textbookBook.count({ where: { isActive: true, tocStatus: "COMPLETED" } }),
    prisma.textbookChapter.count({ where: { isActive: true } }),
    prisma.textbookBook.count({ where: { isActive: true, tocStatus: "FAILED" } }),
  ]);

  // Get workflow stats
  const [totalWorkflows, completedWorkflows, failedWorkflows, completedSessions] = await Promise.all([
    prisma.workflowSession.count(),
    prisma.workflowSession.count({ where: { status: WorkflowStatus.COMPLETED } }),
    prisma.workflowSession.count({ where: { status: WorkflowStatus.FAILED } }),
    prisma.workflowSession.findMany({
      where: { status: WorkflowStatus.COMPLETED, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
    }),
  ]);

  const totalWorkflowTime = completedSessions.reduce((sum, s) => {
    if (s.startedAt && s.completedAt) {
      return sum + (s.completedAt.getTime() - s.startedAt.getTime());
    }
    return sum;
  }, 0);
  const avgWorkflowTime = completedSessions.length > 0 ? totalWorkflowTime / completedSessions.length : 0;

  // Get extraction logs for timing stats
  const extractionLogs = await prisma.textbookIndexJob.findMany({
    where: {
      status: WorkflowStatus.COMPLETED,
      completedAt: { not: null },
    },
    orderBy: { completedAt: "desc" },
    take: 100,
  });

  const extractionTimes = extractionLogs
    .filter(j => j.processedPages && j.completedAt && j.startedAt)
    .map(j => {
      const duration = new Date(j.completedAt!).getTime() - new Date(j.startedAt!).getTime();
      return duration / (j.processedPages ?? 1); // Time per page
    });

  const averageExtractionTime = extractionTimes.length > 0
    ? extractionTimes.reduce((a, b) => a + b, 0) / extractionTimes.length
    : 0;

  // Get token usage from workflow sessions (using result JSON)
  const sessionsWithTokens = await prisma.workflowSession.findMany({
    where: { status: WorkflowStatus.COMPLETED },
    select: { result: true },
  });

  let totalTokens = 0;
  let totalCost = 0;
  for (const session of sessionsWithTokens) {
    if (session.result && typeof session.result === 'object') {
      const res = session.result as Record<string, any>;
      totalTokens += typeof res.totalTokens === 'number' ? res.totalTokens : 0;
      totalCost += typeof res.totalCost === 'number' ? res.totalCost : 0;
    }
  }

  // Calculate cache savings (rough estimate)
  const cacheHitRate = pdfCache.totalEntries > 0
    ? pdfCache.hitRate
    : 0;

  const estimatedBrightOneCalls = completedWorkflows + failedWorkflows;

  return {
    timestamp: new Date(),
    cache: {
      pdfCache: {
        totalEntries: pdfCache.totalEntries,
        totalSize: pdfCache.totalSize,
        hitRate: cacheHitRate,
        expiredEntries: pdfCache.expiredEntries,
      },
      ocrCache: {
        totalEntries: ocrCache.totalEntries,
        totalSize: ocrCache.totalSize,
      },
    },
    extraction: {
      totalExtractions: extractionLogs.length,
      averageTime: Math.round(averageExtractionTime),
      totalTime: extractionLogs.reduce((sum, j) => sum + (j.processedPages || 0), 0),
      cacheHitRate,
    },
    queue: {
      total: queueStats.total,
      pending: queueStats.pending,
      running: queueStats.running,
      completed: queueStats.completed,
      failed: queueStats.failed,
    },
    costs: {
      totalBrightOneCalls: estimatedBrightOneCalls,
      totalTokens,
      estimatedCost: totalCost,
      cacheSavings: Math.round(cacheHitRate * estimatedBrightOneCalls * 0.01 * 100) / 100, // Rough estimate
    },
    textbooks: {
      totalBooks,
      indexedBooks,
      totalChapters,
      booksWithErrors,
    },
    workflows: {
      totalWorkflows,
      completedWorkflows,
      failedWorkflows,
      averageDuration: Math.round(avgWorkflowTime),
    },
  };
}

/**
 * Get performance metrics for a specific time period
 */
export async function getPerformanceMetrics(
  days: number = 7
): Promise<{
  daily: Array<{
    date: string;
    workflows: number;
    avgDuration: number;
    tokens: number;
    cacheHits: number;
  }>;
  summary: {
    totalWorkflows: number;
    avgDuration: number;
    totalTokens: number;
    cacheHitRate: number;
    successRate: number;
  };
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get workflow data
  const workflows = await prisma.workflowSession.findMany({
    where: {
      startedAt: { gte: startDate },
    },
    select: {
      startedAt: true,
      completedAt: true,
      status: true,
      result: true,
    },
    orderBy: { startedAt: "asc" },
  });

  // Group by day
  const dailyMap = new Map<string, {
    workflows: number;
    totalDuration: number;
    tokens: number;
    cacheHits: number;
    success: number;
  }>();

  for (const w of workflows) {
    if (!w.startedAt) continue;
    const date = w.startedAt.toISOString().split("T")[0];
    const existing = dailyMap.get(date) || {
      workflows: 0,
      totalDuration: 0,
      tokens: 0,
      cacheHits: 0,
      success: 0,
    };

    existing.workflows++;
    // Calculate duration from startedAt/completedAt
    if (w.startedAt && w.completedAt) {
      existing.totalDuration += w.completedAt.getTime() - w.startedAt.getTime();
    }
    // Extract tokens from result JSON
    if (w.result && typeof w.result === 'object') {
      const res = w.result as Record<string, any>;
      existing.tokens += typeof res.totalTokens === 'number' ? res.totalTokens : 0;
    }
    if (w.status === "COMPLETED") {
      existing.success++;
    }

    dailyMap.set(date, existing);
  }

  const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    workflows: data.workflows,
    avgDuration: Math.round(data.totalDuration / data.workflows),
    tokens: data.tokens,
    cacheHits: data.cacheHits,
  }));

  const totalWorkflows = workflows.length;
  const completedWorkflows = workflows.filter(w => w.status === "COMPLETED").length;
  const successRate = totalWorkflows > 0 ? completedWorkflows / totalWorkflows : 0;

  const totalTokens = workflows.reduce((sum, w) => {
    if (w.result && typeof w.result === 'object') {
      const res = w.result as Record<string, any>;
      return sum + (typeof res.totalTokens === 'number' ? res.totalTokens : 0);
    }
    return sum;
  }, 0);
  const totalDuration = workflows.reduce((sum, w) => {
    if (w.startedAt && w.completedAt) {
      return sum + (w.completedAt.getTime() - w.startedAt.getTime());
    }
    return sum;
  }, 0);

  return {
    daily,
    summary: {
      totalWorkflows,
      avgDuration: Math.round(totalDuration / totalWorkflows || 0),
      totalTokens,
      cacheHitRate: 0, // Would need separate tracking
      successRate: Math.round(successRate * 100) / 100,
    },
  };
}

/**
 * Get recent activity log
 */
export async function getRecentActivity(
  limit: number = 20
): Promise<Array<{
  id: string;
  type: string;
  status: string;
  description: string;
  timestamp: Date;
  duration?: number;
  details?: Record<string, any>;
}>> {
  const activities: Array<{
    id: string;
    type: string;
    status: string;
    description: string;
    timestamp: Date;
    duration?: number;
    details?: Record<string, any>;
  }> = [];

  // Get recent workflows
  const recentWorkflows = await prisma.workflowSession.findMany({
    take: limit,
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      lessonPlanId: true,
    },
  });

  for (const w of recentWorkflows) {
    if (!w.startedAt) continue;
    activities.push({
      id: w.id,
      type: "WORKFLOW",
      status: w.status,
      description: `Workflow ${w.status.toLowerCase()}`,
      timestamp: w.startedAt,
      duration: w.completedAt && w.startedAt ? w.completedAt.getTime() - w.startedAt.getTime() : undefined,
    });
  }

  // Get recent indexing jobs
  const recentJobs = await prisma.textbookIndexJob.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      completedAt: true,
      bookId: true,
    },
  });

  for (const j of recentJobs) {
    activities.push({
      id: j.id,
      type: "INDEXING",
      status: j.status,
      description: `Indexing ${j.status.toLowerCase()}`,
      timestamp: j.createdAt,
    });
  }

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Get error summary
 */
export async function getErrorSummary(): Promise<{
  workflowErrors: Array<{
    count: number;
    error: string;
  }>;
  indexErrors: Array<{
    bookName: string;
    error: string;
    failedAt: Date;
  }>;
  queueErrors: Array<{
    count: number;
    type: string;
    error: string;
  }>;
}> {
  // Get workflow errors
  const workflowErrors = await prisma.workflowSession.findMany({
    where: {
      status: WorkflowStatus.FAILED,
      error: { not: null },
    },
    select: { error: true },
  });

  const errorCounts = new Map<string, number>();
  for (const e of workflowErrors) {
    const msg = e.error || "Unknown";
    errorCounts.set(msg, (errorCounts.get(msg) || 0) + 1);
  }

  const workflowErrorList = Array.from(errorCounts.entries())
    .map(([error, count]) => ({ count, error }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get index errors with book names
  const indexErrors = await prisma.textbookIndexJob.findMany({
    where: {
      status: WorkflowStatus.FAILED,
      errorMessage: { not: null },
    },
    include: { book: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const indexErrorList = indexErrors.map(j => ({
    bookName: j.book?.name || "Unknown",
    error: j.errorMessage || "Unknown",
    failedAt: j.createdAt,
  }));

  // Queue errors - return empty for now (model not defined in schema)
  const queueErrorList: Array<{ count: number; type: string; error: string }> = [];

  return {
    workflowErrors: workflowErrorList,
    indexErrors: indexErrorList,
    queueErrors: queueErrorList,
  };
}
