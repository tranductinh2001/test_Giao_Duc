/**
 * Word Editor Page
 *
 * Phase 7: Syncfusion DocumentEditor Integration
 * Opens DOCX directly in Syncfusion DocumentEditor
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { DocumentEditor } from "@/components/document-editor";
import { useDocumentEditor } from "@/hooks/useDocumentEditor";
import { Button } from "@/components/ui/button";

export default function WordEditorPage() {
  const params = useParams();
  const router = useRouter();
  const lessonPlanId = params.id as string;

  const {
    editorState,
    workflowState,
    annotationState,
    annotations,
    groups,
    statistics,
    sessionId,
    mode,
    loadDocument,
    startReview,
    stopPolling,
    selectAnnotation,
    toggleAnnotationPanel,
    setAnnotationFilter,
    setGroupBy,
    navigateAnnotation,
    refreshAnnotations,
  } = useDocumentEditor();

  // Load document on mount
  useEffect(() => {
    if (lessonPlanId) {
      loadDocument(lessonPlanId);
    }

    return () => {
      stopPolling();
    };
  }, [lessonPlanId]);

  // Show loading while fetching lesson plan
  if (editorState.isLoading && !editorState.fileUrl) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Đang tải tài liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-2 sm:px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2 sm:gap-4 w-full">
          <Link href={`/lesson-plans/${lessonPlanId}`}>
            <Button variant="ghost" size="sm" className="min-h-[40px]">
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Quay lại</span>
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate">
              {editorState.fileName || "Document Editor"}
            </h1>
            {editorState.lessonPlanId && (
              <p className="text-xs text-muted-foreground truncate">
                ID: {editorState.lessonPlanId}
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {workflowState.status === "COMPLETED" && (
            <span className="px-2 sm:px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              Hoàn thành
            </span>
          )}
          {workflowState.status === "FAILED" && (
            <span className="px-2 sm:px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              Thất bại
            </span>
          )}
          {workflowState.status === "AI_REVIEWING" && (
            <span className="px-2 sm:px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Đang phân tích</span>
            </span>
          )}
        </div>
      </div>

      {/* Document Editor */}
      <div className="flex-1 overflow-hidden">
        <DocumentEditor
          fileUrl={editorState.fileUrl}
          fileName={editorState.fileName}
          sessionId={sessionId}
          isLoading={editorState.isLoading}
          error={editorState.error}
          workflowState={{
            status: workflowState.status as any,
            progress: workflowState.progress,
            currentStep: workflowState.currentStep,
            message: workflowState.message,
            steps: workflowState.steps,
            startedAt: workflowState.startedAt,
            completedAt: workflowState.completedAt,
            error: workflowState.error,
          }}
          annotationState={annotationState}
          annotations={annotations}
          groups={groups}
          statistics={statistics}
          selectedAnnotation={annotationState.selectedAnnotation}
          mode={mode}
          onStartReview={startReview}
          onSelectAnnotation={selectAnnotation}
          onTogglePanel={toggleAnnotationPanel}
          onNavigate={navigateAnnotation}
          onRefresh={refreshAnnotations}
        />
      </div>
    </div>
  );
}
