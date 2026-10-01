/**
 * Professional Document Editor - Main Container
 *
 * Desktop application-like layout with:
 * - Top application bar
 * - Ribbon toolbar
 * - Document workspace (A4 pages)
 * - Left sidebar (outline)
 * - Right sidebar (AI review)
 * - Status bar
 */

"use client";

import { useState } from "react";
import { useEditor } from "./EditorContext";
import { DocumentPage } from "./DocumentPage";
import { EditorToolbar } from "./EditorToolbar";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorSidebar } from "./EditorSidebar";
import {
  FileText,
  Menu,
  X,
  Upload,
} from "lucide-react";

export function DocumentEditor() {
  const { state } = useEditor();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  const sections = state.document.root.content.filter(
    (node) => node.type === "section"
  );

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f5] overflow-hidden">
      {/* Application Bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
        <button
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Toggle outline"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">
            Lesson Plan Editor
          </span>
        </div>

        <div className="flex-1" />

        <div className="text-sm text-gray-600">
          {state.isDirty && (
            <span className="text-orange-600 mr-3">● Unsaved changes</span>
          )}
          {!state.isEditable && (
            <span className="text-gray-500">Read Only</span>
          )}
        </div>
      </div>

      {/* Ribbon Toolbar */}
      <EditorToolbar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Document Outline */}
        {leftSidebarOpen && (
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-sm text-gray-900">
                Document Outline
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sections.length > 0 ? (
                <div className="space-y-2">
                  {sections.map((section: any, index: number) => (
                    <button
                      key={section.id}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors text-sm"
                    >
                      <div className="font-medium text-gray-900 truncate">
                        {section.attrs?.title || `Section ${index + 1}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {section.attrs?.sectionType || "content"}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  No sections yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document Workspace */}
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full py-12 px-8">
            {sections.length > 0 ? (
              <div className="max-w-[210mm] mx-auto space-y-6">
                {/* A4 Pages */}
                {sections.map((section: any) => (
                  <DocumentPage key={section.id} section={section} />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="max-w-[210mm] mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-16">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-50 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Lesson Plan Editor
                    </h2>
                    <p className="text-gray-600 mb-8">
                      Drop a document here or open an existing lesson plan
                    </p>
                    <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      <Upload className="w-5 h-5" />
                      Upload Document
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - AI Review */}
        {rightSidebarOpen && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-900">
                Document Review
              </h3>
              <button
                onClick={() => setRightSidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  No review available
                </p>
                <p className="text-xs text-gray-500">
                  AI suggestions will appear here
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <EditorStatusBar />
    </div>
  );
}
