/**
 * Workflow API
 *
 * Phase 5: REST API endpoints for workflow orchestration
 */

import {
  WorkflowOrchestrator,
  workflowOrchestrator,
} from "../engine/WorkflowOrchestrator";
import {
  WorkflowStatus,
  WorkflowEvent,
  WorkflowConfig,
  StartReviewRequest,
  StartReviewResponse,
  SessionStatusResponse,
  ResumeResponse,
  WorkflowProgress,
} from "../types";

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Start a new review workflow
 * POST /review/start
 */
export async function startReview(request: StartReviewRequest): Promise<StartReviewResponse> {
  const result = await workflowOrchestrator.startReview(request.userId, {
    document: request.document,
    templateId: request.templateId,
    lessonId: request.lessonId,
    config: request.config,
  });

  return result;
}

/**
 * Get session status
 * GET /review/session/:id
 */
export function getSessionStatus(sessionId: string): SessionStatusResponse | null {
  const progress = workflowOrchestrator.getSession(sessionId);
  if (!progress) return null;

  const result = workflowOrchestrator.getResult(sessionId);

  return {
    sessionId: progress.sessionId,
    status: progress.status,
    progress: progress.progress,
    currentStep: progress.currentStep,
    steps: progress.steps,
    results: result?.results,
    error: result?.error,
    createdAt: new Date(), // Would come from session
    updatedAt: new Date(),
    completedAt: progress.status === WorkflowStatus.COMPLETED ? new Date() : undefined,
  };
}

/**
 * Get workflow progress
 * GET /review/progress/:id
 */
export function getProgress(sessionId: string): WorkflowProgress | null {
  return workflowOrchestrator.getSession(sessionId);
}

/**
 * Cancel workflow
 * POST /review/cancel/:id
 */
export function cancelSession(sessionId: string): boolean {
  return workflowOrchestrator.cancelSession(sessionId);
}

/**
 * Resume workflow
 * POST /review/resume/:id
 */
export async function resumeSession(sessionId: string): Promise<ResumeResponse> {
  const success = await workflowOrchestrator.resumeSession(sessionId);

  if (!success) {
    throw new Error("Failed to resume session");
  }

  const session = workflowOrchestrator.getSession(sessionId);

  return {
    sessionId,
    status: session?.status || WorkflowStatus.PAUSED,
    message: "Workflow resumed successfully",
  };
}

/**
 * Get workflow result
 * GET /review/result/:id
 */
export function getResult(sessionId: string) {
  return workflowOrchestrator.getResult(sessionId);
}

/**
 * Get workflow logs
 * GET /review/logs/:id
 */
export function getLogs(sessionId: string) {
  return workflowOrchestrator.getLogs(sessionId);
}

/**
 * Register event handler
 */
export function onEvent(event: WorkflowEvent, handler: (data: any) => void): void {
  workflowOrchestrator.on(event, handler);
}

/**
 * Unregister event handler
 */
export function offEvent(event: WorkflowEvent, handler: (data: any) => void): void {
  workflowOrchestrator.off(event, handler);
}

/**
 * Update workflow configuration
 */
export function updateConfig(config: Partial<WorkflowConfig>): void {
  workflowOrchestrator.updateConfig(config);
}

/**
 * Get workflow configuration
 */
export function getConfig(): WorkflowConfig {
  return workflowOrchestrator.getConfig();
}

/**
 * Get all sessions
 */
export function getAllSessions(): string[] {
  return workflowOrchestrator.getAllSessions();
}

/**
 * Delete session
 */
export function deleteSession(sessionId: string): boolean {
  return workflowOrchestrator.deleteSession(sessionId);
}

// ============================================
// EXPRESS ROUTER (Optional - for Express.js integration)
// ============================================

/**
 * Create Express router for workflow API
 * Usage: import { createWorkflowRouter } from './api/WorkflowAPI';
 *        app.use('/review', createWorkflowRouter());
 */
export function createWorkflowRouter() {
  // Dynamic import to avoid issues with Express types
  return {
    path: "/review",
    routes: [
      {
        method: "post",
        path: "/start",
        handler: async (req: any, res: any) => {
          try {
            const result = await startReview(req.body);
            res.json(result);
          } catch (error: any) {
            res.status(500).json({ error: error.message });
          }
        },
      },
      {
        method: "get",
        path: "/session/:id",
        handler: (req: any, res: any) => {
          const result = getSessionStatus(req.params.id);
          if (!result) {
            res.status(404).json({ error: "Session not found" });
            return;
          }
          res.json(result);
        },
      },
      {
        method: "get",
        path: "/progress/:id",
        handler: (req: any, res: any) => {
          const result = getProgress(req.params.id);
          if (!result) {
            res.status(404).json({ error: "Session not found" });
            return;
          }
          res.json(result);
        },
      },
      {
        method: "post",
        path: "/cancel/:id",
        handler: (req: any, res: any) => {
          const result = cancelSession(req.params.id);
          res.json({ success: result });
        },
      },
      {
        method: "post",
        path: "/resume/:id",
        handler: async (req: any, res: any) => {
          try {
            const result = await resumeSession(req.params.id);
            res.json(result);
          } catch (error: any) {
            res.status(500).json({ error: error.message });
          }
        },
      },
      {
        method: "get",
        path: "/result/:id",
        handler: (req: any, res: any) => {
          const result = getResult(req.params.id);
          if (!result) {
            res.status(404).json({ error: "Result not found" });
            return;
          }
          res.json(result);
        },
      },
      {
        method: "get",
        path: "/logs/:id",
        handler: (req: any, res: any) => {
          const logs = getLogs(req.params.id);
          res.json(logs);
        },
      },
    ],
  };
}

// ============================================
// NEXT.JS API ROUTE EXAMPLE
// ============================================

/**
 * Example Next.js API Route Handler
 * File: pages/api/review/[id].ts
 */
/*
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      const status = getSessionStatus(id as string);
      if (!status) {
        return res.status(404).json({ error: 'Session not found' });
      }
      return res.status(200).json(status);

    case 'POST':
      const result = cancelSession(id as string);
      return res.status(200).json({ success: result });

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
*/

/**
 * Example Next.js API Route Handler for start
 * File: pages/api/review/start.ts
 */
/*
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await startReview(req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
*/
