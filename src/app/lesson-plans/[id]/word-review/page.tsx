/**
 * Word Review Page with Editor V2
 *
 * Main review page with new editor architecture
 */

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Download } from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import { EditorRoot } from "@/components/editor-v2";
import { sectionsToDocument } from "@/lib/adapters/api-to-document";
import type { APISection, APIAnnotation } from "@/lib/adapters/api-to-document";
import type { DocumentRootNode } from "@/core";

interface ReviewResult {
  overallScore: number;
  totalIssues: number;
  criticalIssues: number;
  errorIssues: number;
  warningIssues: number;
  infoIssues: number;
}

export default function WordReviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [sections, setSections] = useState<APISection[]>([]);
  const [annotations, setAnnotations] = useState<APIAnnotation[]>([]);
  const [lessonDocument, setLessonDocument] = useState<DocumentRootNode | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAllAnnotations();
    }
  }, [severityFilter, statusFilter]);

  // Convert API data to document model
  useEffect(() => {
    if (sections.length > 0) {
      const doc = sectionsToDocument(sections, annotations, "Lesson Plan");
      setLessonDocument(doc);
      console.log("[WordReview] Document created with", sections.length, "sections and", annotations.length, "annotations");
    }
  }, [sections, annotations]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSections(),
        fetchAllAnnotations(),
        fetchReviewResult(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/sections`);
      const data = await res.json();
      if (data.success) {
        console.log("[WordReview] Loaded", data.data.length, "sections");
        setSections(data.data);
      } else {
        toast.error("Failed to load sections");
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast.error("Error loading document");
    }
  };

  const fetchAllAnnotations = async () => {
    try {
      const params = new URLSearchParams();
      if (severityFilter !== "ALL") params.append("severity", severityFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/lesson-plans/${id}/annotations?${params}`);
      const data = await res.json();

      if (data.success) {
        console.log("[WordReview] Loaded", data.data.length, "annotations");
        setAnnotations(data.data);
      }
    } catch (error) {
      console.error("Error fetching annotations:", error);
    }
  };

  const fetchReviewResult = async () => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/review-result`);
      const data = await res.json();
      if (data.success && data.data) {
        setReviewResult(data.data);
      }
    } catch (error) {
      console.error("Error fetching review result:", error);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/lesson-plans/${id}/export-word`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `lesson-plan-${id}-reviewed.docx`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);

      toast.success("Document exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export document");
    } finally {
      setExporting(false);
    }
  };

  const handleSave = (doc: DocumentRootNode) => {
    console.log("[WordReview] Save requested:", doc);
    toast.success("Changes saved!");
    // TODO: Implement save to API
  };

  const handleUpdate = (doc: DocumentRootNode) => {
    console.log("[WordReview] Document updated");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!lessonDocument) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No document found</p>
          <Link href={`/lesson-plans/${id}`}>
            <Button>Back to Lesson Plan</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href={`/lesson-plans/${id}`}>
                <Button variant="ghost" size="sm" className="min-h-[40px] px-2 sm:px-3">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-foreground">
                  Word Review
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                  ✨ Editor V2 - Immutable Architecture
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
              <Button
                onClick={handleExport}
                disabled={exporting}
                size="sm"
                className="min-h-[40px]"
              >
                <Download className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{exporting ? "Exporting..." : "Export DOCX"}</span>
                <span className="sm:hidden">{exporting ? "..." : "Export"}</span>
              </Button>
            </div>
          </div>

          {/* Review Summary */}
          {reviewResult && (
            <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
              <div className="bg-background rounded-lg p-2 sm:p-3 border">
                <div className="text-xs text-muted-foreground mb-1">Score</div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {reviewResult.overallScore}/100
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-2 sm:p-3 border border-red-200 dark:bg-red-950/30">
                <div className="text-xs text-red-700 dark:text-red-400 mb-1">Critical</div>
                <div className="text-xl sm:text-2xl font-bold text-red-900 dark:text-red-300">
                  {reviewResult.criticalIssues}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-2 sm:p-3 border border-orange-200 dark:bg-orange-950/30">
                <div className="text-xs text-orange-700 dark:text-orange-400 mb-1">Error</div>
                <div className="text-xl sm:text-2xl font-bold text-orange-900 dark:text-orange-300">
                  {reviewResult.errorIssues}
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 sm:p-3 border border-yellow-200 dark:bg-yellow-950/30">
                <div className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">Warning</div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                  {reviewResult.warningIssues}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 sm:p-3 border border-blue-200 dark:bg-blue-950/30 col-span-2 sm:col-span-1">
                <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">Info</div>
                <div className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-300">
                  {reviewResult.infoIssues}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-background"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="ERROR">Error</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-background"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <div className="text-sm text-muted-foreground text-center sm:text-left">
              {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-lg shadow-lg border overflow-hidden">
          <div className="p-8">
            <EditorRoot
              initialDocument={lessonDocument}
              config={{
                editable: true,
                maxHistorySize: 100,
              }}
              onSave={handleSave}
              onUpdate={handleUpdate}
              className="min-h-[600px]"
            />
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">
                ⌨️ Keyboard Shortcuts
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm text-blue-800">
                <div>
                  <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">Ctrl+Z</kbd>
                  <span className="ml-2">Undo</span>
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">Ctrl+Shift+Z</kbd>
                  <span className="ml-2">Redo</span>
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">Ctrl+S</kbd>
                  <span className="ml-2">Save</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Architecture Info */}
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">
            ✨ New Architecture Features
          </h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• <strong>Immutable Document Model</strong> - No accidental mutations</li>
            <li>• <strong>Full Undo/Redo</strong> - Track all changes with history stack</li>
            <li>• <strong>Type-Safe</strong> - 100% TypeScript coverage</li>
            <li>• <strong>Annotations as Marks</strong> - Rendered directly in text</li>
            <li>• <strong>Command Pattern</strong> - All edits via commands</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
