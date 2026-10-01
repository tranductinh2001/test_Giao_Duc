/**
 * Editor Container Component
 *
 * Phase 7.1: Production-ready DocumentEditor
 * Wraps Syncfusion DocumentEditor with proper configuration
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

interface EditorContainerProps {
  fileUrl: string | null;
  isReadOnly?: boolean;
  onEditorReady: (editor: DocumentEditorComponent) => void;
  onContentChange?: () => void;
}

export function EditorContainer({
  fileUrl,
  isReadOnly = false,
  onEditorReady,
  onContentChange,
}: EditorContainerProps) {
  const editorRef = useRef<DocumentEditorComponent>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Load document when fileUrl changes
  useEffect(() => {
    if (!editorRef.current || !fileUrl) return;

    const loadDocument = async () => {
      try {
        setIsEditorReady(false);
        const response = await fetch(fileUrl);
        const blob = await response.blob();

        // Convert blob to base64 for Syncfusion
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(",")[1] || base64;
          editorRef.current!.open(base64Data);
          setIsEditorReady(true);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error loading document:", error);
      }
    };

    loadDocument();
  }, [fileUrl]);

  // Notify parent when editor is ready
  useEffect(() => {
    if (editorRef.current && isEditorReady) {
      onEditorReady(editorRef.current);
    }
  }, [isEditorReady, onEditorReady]);

  // Handle content change
  const handleContentChange = useCallback(() => {
    if (onContentChange) {
      onContentChange();
    }
  }, [onContentChange]);

  // No file loaded
  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">Chưa có tài liệu</p>
          <p className="text-sm">Tải lên giáo án để bắt đầu</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      <DocumentEditorComponent
        ref={editorRef}
        style={{ width: "100%", height: "100%" }}
        isReadOnly={isReadOnly}
        enablePrint={false}
        enableSearch={true}
        enableSelection={true}
        enableEditor={!isReadOnly}
        enableEditorHistory={!isReadOnly}
        documentEditorSettings={{
          showRuler: false,
        }}
        contentChange={handleContentChange}
      />
    </div>
  );
}

export default EditorContainer;
