/**
 * Editor Root Component
 *
 * Main editor container with professional document editor UI
 */

"use client";

import { useEffect, useRef } from "react";
import { EditorProvider, useEditor } from "./EditorContext";
import type { DocumentRootNode } from "@/core/document/types";
import type { EditorConfig } from "@/core/editor/EditorCore";
import { DocumentEditor } from "./DocumentEditor";

// ============================================================================
// Editor Root (with Provider)
// ============================================================================

interface EditorRootProps {
  initialDocument?: DocumentRootNode;
  config?: EditorConfig;
  className?: string;
  onSave?: (document: DocumentRootNode) => void;
  onUpdate?: (document: DocumentRootNode) => void;
}

export function EditorRoot({
  initialDocument,
  config,
  className = "",
  onSave,
  onUpdate,
}: EditorRootProps) {
  return (
    <EditorProvider initialDocument={initialDocument} config={config}>
      <EditorInner className={className} onSave={onSave} onUpdate={onUpdate} />
    </EditorProvider>
  );
}

// ============================================================================
// Editor Inner (with hooks)
// ============================================================================

interface EditorInnerProps {
  className?: string;
  onSave?: (document: DocumentRootNode) => void;
  onUpdate?: (document: DocumentRootNode) => void;
}

function EditorInner({ className, onSave, onUpdate }: EditorInnerProps) {
  const { editor, state } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle save events
  useEffect(() => {
    if (!onSave) return;

    const unsubscribe = editor.on("save", () => {
      onSave(state.document.root);
    });

    return unsubscribe;
  }, [editor, onSave, state.document]);

  // Handle update events
  useEffect(() => {
    if (!onUpdate) return;

    const unsubscribe = editor.on("update", () => {
      onUpdate(state.document.root);
    });

    return unsubscribe;
  }, [editor, onUpdate, state.document]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
        return;
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) ||
        (e.ctrlKey && e.key === "y")
      ) {
        e.preventDefault();
        editor.redo();
        return;
      }

      // Save: Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (onSave) {
          onSave(state.document.root);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, onSave, state.document]);

  return (
    <div ref={containerRef} className={`editor-root-v2 ${className}`}>
      <DocumentEditor />
    </div>
  );
}
