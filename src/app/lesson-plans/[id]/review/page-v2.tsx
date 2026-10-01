/**
 * New Review Page with Editor V2
 *
 * Replaces old FullDocumentViewer with new editor architecture
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

export default function ReviewPageV2() {
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

  // Convert API data to document model when sections/annotations change
  useEffect(() => {
    if (sections.length > 0) {
      const doc = sectionsToDocument(sections, annotations, "Lesson Plan");
      setLessonDocument(doc);
      console.log("[ReviewV2] Document created:", doc);
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
        console.log("[ReviewV2] Fetched sections:", data.data.length);
        setSections(data.data);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast.error("Failed to fetch sections");
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
        console.log("[ReviewV2] Fetched annotations:", data.data.length);
        setAnnotations(data.data);
      }
    } catch (error) {
      console.error("Error fetching annotations:", error);
      toast.error("Failed to fetch annotations");
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
      const a = document.createElement("a");
      a.href = url;
      a.download = `lesson-plan-${id}-reviewed.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Document exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export document");
    } finally {
      setExporting(false);
    }
  };

  const handleSave = (doc: DocumentRootNode) => {
    console.log("[ReviewV2] Save requested:", doc);
    toast.success("Saved! (Integration pending)");
    // TODO: Implement save to API
  };

  const handleUpdate = (doc: DocumentRootNode) => {
    console.log("[ReviewV2] Document updated");
    // Auto-update annotations if needed
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!lessonDocument) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No document found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/lesson-plans/${id}`}>
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Document Review
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Using Editor V2 Architecture
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleExport}
                disabled={exporting}
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? "Exporting..." : "Export DOCX"}
              </Button>
            </div>
          </div>

          {/* Review Summary */}
          {reviewResult && (
            <div className="mt-4 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Score:</span>
                <span className="font-semibold text-lg text-foreground">
                  {reviewResult.overallScore}/100
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">Issues:</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-medium">
                  {reviewResult.criticalIssues} Critical
                </span>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-medium">
                  {reviewResult.errorIssues} Error
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-medium">
                  {reviewResult.warningIssues} Warning
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                  {reviewResult.infoIssues} Info
                </span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mt-4 flex items-center gap-4">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 border rounded-md text-sm"
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
              className="px-3 py-1.5 border rounded-md text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <div className="ml-auto text-sm text-muted-foreground">
              {annotations.length} annotations
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-lg shadow-lg border p-8">
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

        {/* Info Badge */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                ✨ New Editor V2 Architecture
              </h3>
              <p className="text-sm text-blue-800">
                This page now uses the new immutable document model with full undo/redo support.
                Annotations are rendered as comment marks on the text.
              </p>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">Ctrl+Z</kbd> - Undo</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">Ctrl+Shift+Z</kbd> - Redo</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">Ctrl+S</kbd> - Save</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
