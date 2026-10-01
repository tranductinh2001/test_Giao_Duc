/**
 * Document Editor Workflow Service
 *
 * Phase 7.1: Production-ready DocumentEditor
 * Handles all workflow-related API calls
 */

import {
  WorkflowProgressStep,
  WorkflowState,
  WorkflowStepProgress,
  StartReviewRequest,
  StartReviewResponse,
  GetProgressResponse,
} from "@/components/document-editor/types";

const API_BASE = "/api/workflow";

/**
 * Start review workflow for a lesson plan
 */
export async function startReview(request: StartReviewRequest): Promise<StartReviewResponse> {
  const response = await fetch(`${API_BASE}/start-review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to start review");
  }

  return {
    success: data.success,
    sessionId: data.sessionId,
    status: data.status as WorkflowProgressStep,
  };
}

/**
 * Get workflow progress for a session
 */
export async function getProgress(sessionId: string): Promise<GetProgressResponse> {
  const response = await fetch(`${API_BASE}/${sessionId}/progress`);

  if (!response.ok) {
    throw new Error("Failed to get workflow progress");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to get progress");
  }

  return {
    sessionId: data.sessionId,
    status: data.status as WorkflowProgressStep,
    progress: data.progress,
    currentStep: data.currentStep,
    message: data.message,
    steps: data.steps,
    error: data.error,
  };
}

/**
 * Poll workflow progress at intervals
 */
export function createWorkflowPoller(
  sessionId: string,
  onProgress: (progress: GetProgressResponse) => void,
  onComplete: (response: GetProgressResponse) => void,
  onError: (error: Error) => void,
  intervalMs: number = 2000
): () => void {
  let isRunning = true;

  const poll = async () => {
    if (!isRunning) return;

    try {
      const progress = await getProgress(sessionId);
      onProgress(progress);

      if (progress.status === WorkflowProgressStep.COMPLETED) {
        onComplete(progress);
        isRunning = false;
      } else if (progress.status === WorkflowProgressStep.FAILED) {
        onError(new Error(progress.error || "Workflow failed"));
        isRunning = false;
      } else {
        // Continue polling
        setTimeout(poll, intervalMs);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Unknown error"));
    }
  };

  // Start polling
  setTimeout(poll, intervalMs);

  // Return stop function
  return () => {
    isRunning = false;
  };
}

/**
 * Cancel workflow
 */
export async function cancelWorkflow(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${sessionId}/cancel`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to cancel workflow");
  }
}

/**
 * Get step progress map
 */
export const STEP_PROGRESS_MAP: Record<WorkflowProgressStep, number> = {
  [WorkflowProgressStep.UPLOADED]: 5,
  [WorkflowProgressStep.PARSING]: 25,
  [WorkflowProgressStep.MAPPING]: 50,
  [WorkflowProgressStep.BUILDING_CONTEXT]: 70,
  [WorkflowProgressStep.AI_REVIEWING]: 90,
  [WorkflowProgressStep.COMPLETED]: 100,
  [WorkflowProgressStep.FAILED]: 0,
};

/**
 * Get step label map
 */
export const STEP_LABELS: Record<WorkflowProgressStep, string> = {
  [WorkflowProgressStep.UPLOADED]: "Tải tài liệu",
  [WorkflowProgressStep.PARSING]: "Đang phân tích",
  [WorkflowProgressStep.MAPPING]: "Đang ánh xạ",
  [WorkflowProgressStep.BUILDING_CONTEXT]: "Đang xây dựng ngữ cảnh",
  [WorkflowProgressStep.AI_REVIEWING]: "Đang AI review",
  [WorkflowProgressStep.COMPLETED]: "Hoàn thành",
  [WorkflowProgressStep.FAILED]: "Thất bại",
};

/**
 * Get initial workflow state
 */
export function getInitialWorkflowState(): WorkflowState {
  return {
    sessionId: null,
    status: WorkflowProgressStep.UPLOADED,
    progress: 0,
    currentStep: "Chờ xử lý",
    message: "Sẵn sàng",
    steps: [],
    startedAt: null,
    completedAt: null,
    error: null,
  };
}
