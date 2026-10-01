/**
 * Editor Context
 *
 * React context for editor state
 */

"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { EditorCore } from "@/core/editor/EditorCore";
import type { EditorState, EditorConfig } from "@/core/editor/EditorCore";
import type { DocumentRootNode } from "@/core/document/types";
import { createDocument } from "@/core/document/nodes/factory";

// ============================================================================
// Context Types
// ============================================================================

interface EditorContextValue {
  editor: EditorCore;
  state: EditorState;
  refresh: () => void;
}

// ============================================================================
// Context
// ============================================================================

const EditorContext = createContext<EditorContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface EditorProviderProps {
  children: ReactNode;
  initialDocument?: DocumentRootNode;
  config?: EditorConfig;
}

export function EditorProvider({
  children,
  initialDocument,
  config = {},
}: EditorProviderProps) {
  // Create editor instance
  const [editor] = useState(() => {
    const doc = initialDocument || createDocument([], { title: "New Document" });
    return new EditorCore(doc, config);
  });

  // Track state updates
  const [state, setState] = useState<EditorState>(editor.getState());

  // Refresh state
  const refresh = useCallback(() => {
    setState(editor.getState());
  }, [editor]);

  // Subscribe to editor events
  useEffect(() => {
    const unsubscribe = editor.on("update", () => {
      refresh();
    });

    return () => {
      unsubscribe();
    };
  }, [editor, refresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editor.destroy();
    };
  }, [editor]);

  const value: EditorContextValue = {
    editor,
    state,
    refresh,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);

  if (!context) {
    throw new Error("useEditor must be used within EditorProvider");
  }

  return context;
}

// ============================================================================
// Hooks for specific state
// ============================================================================

export function useEditorState(): EditorState {
  const { state } = useEditor();
  return state;
}

export function useDocument() {
  const { state } = useEditor();
  return state.document;
}

export function useSelection() {
  const { state } = useEditor();
  return state.selection;
}

export function useEditorFocus() {
  const { state } = useEditor();
  return state.isFocused;
}

export function useEditorEditable() {
  const { state } = useEditor();
  return state.isEditable;
}

export function useEditorDirty() {
  const { state } = useEditor();
  return state.isDirty;
}
