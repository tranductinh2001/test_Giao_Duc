/**
 * useDocumentEditor Hook
 *
 * Phase 7: Syncfusion DocumentEditor Integration
 * Manages document loading, workflow, and annotations
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  DocumentEditorState,
  WorkflowProgressState,
  EditorAnnotation,
  AnnotationPanelState,
  WorkflowProgressStep,
  AnnotationFilterType,
  GroupByType,
  AnnotationGroup,
  AnnotationStatistics,
  StartReviewRequest,
  GetProgressResponse,
  GetAnnotationsResponse,
  EditorMode,
} from "@/components/document-editor/types";

const POLLING_INTERVAL = 2000; // 2 seconds

export interface UseDocumentEditorReturn {
  // State
  editorState: DocumentEditorState;
  workflowState: WorkflowProgressState;
  annotationState: AnnotationPanelState;
  annotations: EditorAnnotation[];
  groups: AnnotationGroup[];
  statistics: AnnotationStatistics;

  // Getters
  sessionId: string | null;
  mode: EditorMode;
  isEditMode: boolean;

  // Actions
  loadDocument: (lessonPlanId: string) => Promise<void>;
  startReview: () => Promise<void>;
  stopPolling: () => void;
  selectAnnotation: (annotation: EditorAnnotation | null) => void;
  toggleAnnotationPanel: () => void;
  setAnnotationFilter: (filter: AnnotationFilterType) => void;
  setGroupBy: (groupBy: GroupByType) => void;
  navigateAnnotation: (direction: "prev" | "next") => void;
  refreshAnnotations: () => Promise<void>;
  setEditorMode: (mode: EditorMode) => void;
}

export function useDocumentEditor(): UseDocumentEditorReturn {
  // Editor State
  const [editorState, setEditorState] = useState<DocumentEditorState>({
    documentId: null,
    sessionId: null,
    lessonPlanId: null,
    fileName: null,
    fileUrl: null,
    isModified: false,
    lastSaved: null,
    mode: EditorMode.VIEW,
    isLoading: false,
    error: null,
  });

  // Workflow State
  const [workflowState, setWorkflowState] = useState<WorkflowProgressState>({
    status: WorkflowProgressStep.UPLOADED,
    progress: 0,
    currentStep: "Chờ xử lý",
    message: "Sẵn sàng",
    steps: [],
    startedAt: null,
    completedAt: null,
    error: null,
  });

  // Annotation State
  const [annotationState, setAnnotationState] = useState<AnnotationPanelState>({
    isOpen: false,
    selectedAnnotation: null,
    filter: "ALL",
    groupBy: "SECTION",
  });

  // Data
  const [annotations, setAnnotations] = useState<EditorAnnotation[]>([]);
  const [groups, setGroups] = useState<AnnotationGroup[]>([]);
  const [statistics, setStatistics] = useState<AnnotationStatistics>({
    totalAnnotations: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    passed: 0,
  });

  // Polling ref
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef<number>(-1);

  // ==================== ACTIONS ====================

  /**
   * Load document from lesson plan
   */
  const loadDocument = useCallback(async (lessonPlanId: string) => {
    setEditorState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch lesson plan details
      const res = await fetch(`/api/lesson-plans/${lessonPlanId}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Không thể tải giáo án");
      }

      const lessonPlan = data.data;

      // Get file URL
      const fileUrl = lessonPlan.fileUrl || `/api/lesson-plans/${lessonPlanId}/file`;

      setEditorState({
        documentId: null,
        sessionId: null,
        lessonPlanId,
        fileName: lessonPlan.title || "document.docx",
        fileUrl,
        isModified: false,
        lastSaved: null,
        mode: EditorMode.VIEW,
        isLoading: false,
        error: null,
      });

      // Reset workflow state
      setWorkflowState({
        status: WorkflowProgressStep.UPLOADED,
        progress: 0,
        currentStep: "Chờ xử lý",
        message: "Tải tài liệu thành công",
        steps: [],
        startedAt: null,
        completedAt: null,
        error: null,
      });

      // Reset annotations
      setAnnotations([]);
      setGroups([]);
      setStatistics({
        totalAnnotations: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        passed: 0,
      });

    } catch (error: any) {
      setEditorState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Lỗi khi tải tài liệu",
      }));
    }
  }, []);

  /**
   * Start review workflow
   */
  const startReview = useCallback(async () => {
    if (!editorState.lessonPlanId) return;

    setEditorState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const request: StartReviewRequest = {
        lessonPlanId: editorState.lessonPlanId,
        sessionId: editorState.sessionId || "",
      };

      const res = await fetch("/api/workflow/start-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Không thể bắt đầu review");
      }

      const sessionId = data.sessionId;

      setEditorState((prev) => ({
        ...prev,
        sessionId,
        isLoading: false,
      }));

      // Start polling for progress
      setWorkflowState({
        status: WorkflowProgressStep.PARSING,
        progress: 5,
        currentStep: "Đang bắt đầu",
        message: "Khởi động workflow...",
        steps: [],
        startedAt: new Date(),
        completedAt: null,
        error: null,
      });

      startPolling(sessionId);

    } catch (error: any) {
      setEditorState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Lỗi khi bắt đầu review",
      }));
    }
  }, [editorState.lessonPlanId, editorState.sessionId]);

  /**
   * Start polling for workflow progress
   */
  const startPolling = useCallback((sessionId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/workflow/${sessionId}/progress`);
        const data: GetProgressResponse = await res.json();

        if (data.status === WorkflowProgressStep.COMPLETED) {
          // Workflow completed - fetch annotations
          setWorkflowState({
            status: WorkflowProgressStep.COMPLETED,
            progress: 100,
            currentStep: "Hoàn thành",
            message: "Review hoàn tất!",
            steps: data.steps || [],
            startedAt: workflowState.startedAt,
            completedAt: new Date(),
            error: null,
          });

          // Stop polling and fetch annotations
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          await refreshAnnotations();
        } else if (data.status === WorkflowProgressStep.FAILED) {
          // Workflow failed
          setWorkflowState((prev) => ({
            ...prev,
            status: WorkflowProgressStep.FAILED,
            progress: prev.progress,
            currentStep: "Lỗi",
            message: data.error || "Workflow thất bại",
            error: data.error || "Workflow thất bại",
          }));

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setEditorState((prev) => ({
            ...prev,
            isLoading: false,
          }));
        } else {
          // Update progress
          const stepMessages: Record<string, string> = {
            UPLOADED: "Tải tài liệu",
            PARSING: "Đang phân tích tài liệu",
            MAPPING: "Đang ánh xạ hoạt động",
            BUILDING_CONTEXT: "Đang xây dựng ngữ cảnh",
            AI_REVIEWING: "Đang AI review",
          };

          setWorkflowState((prev) => ({
            ...prev,
            status: data.status,
            progress: data.progress,
            currentStep: stepMessages[data.status] || data.currentStep,
            message: data.message,
            steps: data.steps || [],
          }));

          // Fetch annotations in real-time during AI_REVIEWING
          if (data.status === WorkflowProgressStep.AI_REVIEWING) {
            await refreshAnnotations();
          }
        }

        setEditorState((prev) => ({
          ...prev,
          isLoading: data.status !== WorkflowProgressStep.COMPLETED && data.status !== WorkflowProgressStep.FAILED,
        }));

      } catch (error) {
        console.error("Polling error:", error);
      }
    }, POLLING_INTERVAL);
  }, [workflowState.startedAt]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  /**
   * Refresh annotations
   */
  const refreshAnnotations = useCallback(async () => {
    if (!editorState.sessionId) return;

    try {
      const res = await fetch(`/api/workflow/${editorState.sessionId}/annotations`);
      const data: GetAnnotationsResponse = await res.json();

      if (data.annotations) {
        setAnnotations(data.annotations);
        setGroups(data.groups || []);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error("Error fetching annotations:", error);
    }
  }, [editorState.sessionId]);

  /**
   * Select annotation
   */
  const selectAnnotation = useCallback((annotation: EditorAnnotation | null) => {
    setAnnotationState((prev) => ({
      ...prev,
      selectedAnnotation: annotation,
    }));

    if (annotation) {
      const index = annotations.findIndex((a) => a.annotationId === annotation.annotationId);
      currentIndexRef.current = index;
    }
  }, [annotations]);

  /**
   * Toggle annotation panel
   */
  const toggleAnnotationPanel = useCallback(() => {
    setAnnotationState((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
    }));
  }, []);

  /**
   * Set annotation filter
   */
  const setAnnotationFilter = useCallback((filter: AnnotationFilterType) => {
    setAnnotationState((prev) => ({
      ...prev,
      filter,
    }));
  }, []);

  /**
   * Set group by
   */
  const setGroupBy = useCallback((groupBy: GroupByType) => {
    setAnnotationState((prev) => ({
      ...prev,
      groupBy,
    }));
  }, []);

  /**
   * Navigate annotation
   */
  const navigateAnnotation = useCallback((direction: "prev" | "next") => {
    if (annotations.length === 0) return;

    let newIndex: number;
    if (direction === "next") {
      newIndex = currentIndexRef.current + 1;
      if (newIndex >= annotations.length) {
        newIndex = 0;
      }
    } else {
      newIndex = currentIndexRef.current - 1;
      if (newIndex < 0) {
        newIndex = annotations.length - 1;
      }
    }

    currentIndexRef.current = newIndex;
    selectAnnotation(annotations[newIndex]);
  }, [annotations, selectAnnotation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Computed values
  const sessionId = editorState.sessionId;
  const mode = editorState.mode;
  const isEditMode = mode === EditorMode.EDIT;

  // Set editor mode
  const setEditorMode = useCallback((newMode: EditorMode) => {
    setEditorState((prev) => ({
      ...prev,
      mode: newMode,
    }));
  }, []);

  return {
    editorState,
    workflowState,
    annotationState,
    annotations,
    groups,
    statistics,
    sessionId,
    mode,
    isEditMode,
    loadDocument,
    startReview,
    stopPolling,
    selectAnnotation,
    toggleAnnotationPanel,
    setAnnotationFilter,
    setGroupBy,
    navigateAnnotation,
    refreshAnnotations,
    setEditorMode,
  };
}
