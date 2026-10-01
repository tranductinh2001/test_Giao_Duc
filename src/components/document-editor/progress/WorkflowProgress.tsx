/**
 * Workflow Progress Component
 *
 * Phase 7.1: Production-ready DocumentEditor
 * Shows workflow progress with step indicators
 */

"use client";

import { cn } from "@/lib/utils";
import { WorkflowProgressStep } from "../types";

interface WorkflowProgressProps {
  isVisible: boolean;
  progress: number;
  status: WorkflowProgressStep;
  error?: string | null;
}

// Step labels
const STEP_LABELS: Record<WorkflowProgressStep, string> = {
  [WorkflowProgressStep.UPLOADED]: "Tải tài liệu",
  [WorkflowProgressStep.PARSING]: "Đang phân tích",
  [WorkflowProgressStep.MAPPING]: "Đang ánh xạ",
  [WorkflowProgressStep.BUILDING_CONTEXT]: "Đang xây dựng ngữ cảnh",
  [WorkflowProgressStep.AI_REVIEWING]: "Đang AI review",
  [WorkflowProgressStep.COMPLETED]: "Hoàn thành",
  [WorkflowProgressStep.FAILED]: "Thất bại",
};

// Step progress values
const STEP_PROGRESS: Record<WorkflowProgressStep, number> = {
  [WorkflowProgressStep.UPLOADED]: 5,
  [WorkflowProgressStep.PARSING]: 25,
  [WorkflowProgressStep.MAPPING]: 50,
  [WorkflowProgressStep.BUILDING_CONTEXT]: 70,
  [WorkflowProgressStep.AI_REVIEWING]: 90,
  [WorkflowProgressStep.COMPLETED]: 100,
  [WorkflowProgressStep.FAILED]: 0,
};

export function WorkflowProgress({
  isVisible,
  progress,
  status,
  error,
}: WorkflowProgressProps) {
  if (!isVisible) return null;

  const isCompleted = status === WorkflowProgressStep.COMPLETED;
  const isFailed = status === WorkflowProgressStep.FAILED;

  return (
    <div className="px-4 py-2 bg-muted/30 border-b border-border">
      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500",
              isCompleted && "bg-green-500",
              isFailed && "bg-destructive",
              !isCompleted && !isFailed && "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={cn(
          "text-sm font-medium min-w-[3rem] text-right",
          isCompleted && "text-green-600",
          isFailed && "text-destructive",
          !isCompleted && !isFailed && "text-primary"
        )}>
          {progress}%
        </span>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-4 text-xs">
        {Object.entries(STEP_LABELS).map(([key, label]) => {
          const stepKey = key as WorkflowProgressStep;
          const stepProgress = STEP_PROGRESS[stepKey];
          const isStepCompleted = stepProgress <= progress;
          const isStepCurrent = status === stepKey;

          return (
            <div
              key={key}
              className={cn(
                "flex items-center gap-1",
                isStepCompleted && !isFailed && "text-primary",
                isStepCurrent && !isFailed && "font-medium",
                isFailed && stepKey !== WorkflowProgressStep.FAILED && "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isStepCompleted && !isFailed && "bg-primary",
                  isStepCurrent && !isFailed && "bg-primary animate-pulse",
                  isFailed && stepKey === WorkflowProgressStep.FAILED && "bg-destructive",
                  !isStepCompleted && !isStepCurrent && !isFailed && "bg-muted"
                )}
              />
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

export default WorkflowProgress;
