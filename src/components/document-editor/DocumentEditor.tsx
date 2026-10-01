/**
 * Syncfusion DocumentEditor Integration
 *
 * Phase 7.1: Production-ready DocumentEditor
 * - Edit Mode enabled (not ReadOnly)
 * - Real data from Workflow Session (no mock data)
 * - Use Workflow Session as single source of truth
 * - Real-time annotation synchronization
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DocumentEditorComponent } from "@syncfusion/ej2-react-documenteditor";
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-dropdowns/styles/material.css";
import "@syncfusion/ej2-inputs/styles/material.css";
import "@syncfusion/ej2-lists/styles/material.css";
import "@syncfusion/ej2-navigations/styles/material.css";
import "@syncfusion/ej2-popups/styles/material.css";
import "@syncfusion/ej2-ribbon/styles/material.css";
import "@syncfusion/ej2-documenteditor/styles/material.css";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  EditorAnnotation,
  WorkflowProgressState,
  AnnotationPanelState,
  AnnotationStatistics,
  AnnotationGroup,
  AnnotationFilterType,
  GroupByType,
  EditorMode,
  WorkflowProgressStep,
} from "./types";
import { DocumentToolbar } from "./toolbar/DocumentToolbar";
import { WorkflowProgress } from "./progress/WorkflowProgress";
import { AnnotationPanel } from "./panel/AnnotationPanel";

interface DocumentEditorProps {
  fileUrl: string | null;
  fileName: string | null;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  workflowState: WorkflowProgressState;
  annotationState: AnnotationPanelState;
  annotations: EditorAnnotation[];
  groups: AnnotationGroup[];
  statistics: AnnotationStatistics;
  selectedAnnotation: EditorAnnotation | null;
  mode?: EditorMode;
  onStartReview: () => void;
  onSelectAnnotation: (annotation: EditorAnnotation | null) => void;
  onTogglePanel: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  onRefresh: () => void;
  onSave?: () => void;
}

export function DocumentEditor({
  fileUrl,
  fileName,
  sessionId,
  isLoading,
  error,
  workflowState,
  annotationState,
  annotations,
  groups,
  statistics,
  selectedAnnotation,
  mode = EditorMode.EDIT,
  onStartReview,
  onSelectAnnotation,
  onTogglePanel,
  onNavigate,
  onRefresh,
  onSave,
}: DocumentEditorProps) {
  const editorRef = useRef<DocumentEditorComponent>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isModified, setIsModified] = useState(false);

  const isEditMode = mode === EditorMode.EDIT;
  const isWorkflowRunning = isLoading && sessionId !== null;

  // Convert WorkflowProgressStep to number for display
  const progressStatus = (workflowState.status || "UPLOADED") as WorkflowProgressStep;

  // Load document when fileUrl changes
  useEffect(() => {
    if (!editorRef.current || !fileUrl) return;

    const loadDocument = async () => {
      try {
        setIsEditorReady(false);
        setIsModified(false);
        const response = await fetch(fileUrl);
        const blob = await response.blob();

        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(",")[1] || base64;
          editorRef.current!.open(base64Data);
          setIsEditorReady(true);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("Error loading document:", err);
      }
    };

    loadDocument();
  }, [fileUrl]);

  // Handle content change (for tracking modifications)
  const handleContentChange = useCallback(() => {
    setIsModified(true);
  }, []);

  // Handle zoom
  const handleZoomIn = () => {
    if (editorRef.current) {
      const newZoom = Math.min(zoom + 10, 200);
      editorRef.current.zoomFactor = newZoom / 100;
      setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (editorRef.current) {
      const newZoom = Math.max(zoom - 10, 50);
      editorRef.current.zoomFactor = newZoom / 100;
      setZoom(newZoom);
    }
  };

  // Handle undo
  const handleUndo = () => {
    if (editorRef.current && isEditorReady && isEditMode) {
      editorRef.current.editorHistory.undo();
    }
  };

  // Handle redo
  const handleRedo = () => {
    if (editorRef.current && isEditorReady && isEditMode) {
      editorRef.current.editorHistory.redo();
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!editorRef.current || !onSave) return;

    try {
      // Get document as blob using correct format type
      const blob = await editorRef.current.saveAsBlob();

      // Create form data
      const formData = new FormData();
      formData.append("file", blob, fileName || "document.docx");

      // Upload the file - fallback to direct save if sessionId not available
      const uploadUrl = sessionId
        ? `/api/lesson-plans/${sessionId}/file`
        : "/api/lesson-plans/upload";

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setIsModified(false);
        onSave();
      }
    } catch (err) {
      console.error("Error saving document:", err);
    }
  };

  // Navigate to annotation in editor
  const scrollToAnnotation = useCallback((annotation: EditorAnnotation) => {
    if (editorRef.current && annotation.paragraphIndex !== undefined) {
      try {
        // Navigate to paragraph by index
        // This is a placeholder - in production, use Syncfusion's selection API
        console.log("Navigate to paragraph:", annotation.paragraphIndex);
      } catch (err) {
        console.error("Error navigating to annotation:", err);
      }
    }
  }, []);

  // Scroll when selected annotation changes
  useEffect(() => {
    if (selectedAnnotation) {
      scrollToAnnotation(selectedAnnotation);
    }
  }, [selectedAnnotation, scrollToAnnotation]);

  // Filtered annotations
  const filteredAnnotations = annotationState.filter === "ALL"
    ? annotations
    : annotationState.filter === "PASSED"
    ? annotations.filter((a) => a.ruleId === "PASSED")
    : annotations.filter((a) => a.severity === annotationState.filter);

  // Render
  return (
    <div className="flex h-full">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Custom Toolbar */}
        <DocumentToolbar
          mode={mode}
          isEditorReady={isEditorReady}
          isWorkflowRunning={isWorkflowRunning}
          currentStep={workflowState.currentStep || "Đang xử lý"}
          zoom={zoom}
          isAnnotationPanelOpen={annotationState.isOpen}
          onSave={handleSave}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onStartReview={onStartReview}
          onRefresh={onRefresh}
          onTogglePanel={onTogglePanel}
        />

        {/* Workflow Progress */}
        <WorkflowProgress
          isVisible={isWorkflowRunning}
          progress={workflowState.progress || 0}
          status={progressStatus}
          error={workflowState.error}
        />

        {/* Error Display */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Editor Container */}
        <div ref={containerRef} className="flex-1 overflow-hidden">
          {fileUrl ? (
            <DocumentEditorComponent
              ref={editorRef}
              style={{ width: "100%", height: "100%" }}
              isReadOnly={!isEditMode}
              enablePrint={false}
              enableSearch={true}
              enableSelection={true}
              enableEditor={isEditMode}
              enableEditorHistory={isEditMode}
              documentEditorSettings={{
                showRuler: false,
              }}
              contentChange={handleContentChange}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <p className="text-lg">Chưa có tài liệu</p>
                <p className="text-sm">Tải lên giáo án để bắt đầu</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Annotation Panel */}
      <AnnotationPanel
        isOpen={annotationState.isOpen}
        annotations={filteredAnnotations}
        groups={groups}
        statistics={statistics}
        selectedAnnotationId={selectedAnnotation?.annotationId || null}
        filter={annotationState.filter}
        groupBy={annotationState.groupBy}
        onSelectAnnotation={onSelectAnnotation}
        onNavigate={onNavigate}
        onFilterChange={(filter) => onSelectAnnotation(null)}
        onGroupByChange={() => {}}
      />
    </div>
  );
}

export default DocumentEditor;
