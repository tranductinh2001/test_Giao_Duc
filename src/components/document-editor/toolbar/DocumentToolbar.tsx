/**
 * Document Toolbar Component
 *
 * Phase 7.1: Production-ready DocumentEditor
 * Custom toolbar with save, undo, redo, zoom, and action buttons
 */

"use client";

import {
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Play,
  RefreshCw,
  PanelRightClose,
  PanelRightOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorMode } from "../types";

interface DocumentToolbarProps {
  mode: EditorMode;
  isEditorReady: boolean;
  isWorkflowRunning: boolean;
  currentStep: string;
  zoom: number;
  isAnnotationPanelOpen: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onStartReview: () => void;
  onRefresh: () => void;
  onTogglePanel: () => void;
}

export function DocumentToolbar({
  mode,
  isEditorReady,
  isWorkflowRunning,
  currentStep,
  zoom,
  isAnnotationPanelOpen,
  onSave,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onStartReview,
  onRefresh,
  onTogglePanel,
}: DocumentToolbarProps) {
  const isEditMode = mode === EditorMode.EDIT;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
      <div className="flex items-center gap-2">
        {/* Save */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={!isEditorReady || !isEditMode}
          className="gap-2"
          title="Lưu tài liệu"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Lưu</span>
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Undo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!isEditorReady || !isEditMode}
          title="Hoàn tác"
        >
          <Undo2 className="w-4 h-4" />
        </Button>

        {/* Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!isEditorReady || !isEditMode}
          title="Làm lại"
        >
          <Redo2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Zoom Out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          disabled={!isEditorReady || zoom <= 50}
          title="Thu nhỏ"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        {/* Zoom Level */}
        <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
          {zoom}%
        </span>

        {/* Zoom In */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          disabled={!isEditorReady || zoom >= 200}
          title="Phóng to"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Workflow Running Indicator */}
        {isWorkflowRunning && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-primary">
              {currentStep}
            </span>
          </div>
        )}

        {/* Review Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onStartReview}
          disabled={isWorkflowRunning || !isEditorReady}
          className="gap-2"
          title="Bắt đầu phân tích"
        >
          <Play className="w-4 h-4" />
          <span>Phân tích</span>
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="gap-2"
          title="Làm mới"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        {/* Toggle Panel */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePanel}
          className="gap-2"
          title={isAnnotationPanelOpen ? "Ẩn panel" : "Hiện panel"}
        >
          {isAnnotationPanelOpen ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default DocumentToolbar;
