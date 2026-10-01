/**
 * Review Page - Enhanced Version
 * Uses ReviewLayout for Google Docs/Word-like experience
 */

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import ReviewLayout from "@/components/lesson-plans/review/ReviewLayout";

interface Section {
  id: string;
  sectionType: string;
  sectionTitle: string;
  sectionOrder: number;
  rawContent: string;
  annotationCount: number;
}

interface Annotation {
  id: string;
  sectionId: string;
  severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  startPosition: number;
  endPosition: number;
  highlightedText: string;
  message: string;
  explanation: string | null;
  suggestion: string | null;
  proposedContent: string | null;
  ruleId?: string;
  ruleName?: string;
  promptMatched?: string;
  confidence?: number;
  penalty?: number;
}

interface ReviewResult {
  overallScore: number;
  totalIssues: number;
  criticalIssues: number;
  errorIssues: number;
  warningIssues: number;
  infoIssues: number;
}

export default function ReviewPageEnhanced() {
  const params = useParams();
  const id = params.id as string;

  const [sections, setSections] = useState<Section[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(function fetchData() {
    if (id) {
      Promise.all([
        fetchSections(),
        fetchAnnotations(),
        fetchReviewResult(),
      ]).then(function onComplete() {
        setLoading(false);
      });
    }
  }, [id]);

  async function fetchSections() {
    try {
      const res = await fetch("/api/lesson-plans/" + id + "/sections");
      const data = await res.json();
      if (data.success) {
        setSections(data.data);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  }

  async function fetchAnnotations() {
    try {
      const res = await fetch("/api/lesson-plans/" + id + "/annotations");
      const data = await res.json();
      if (data.success) {
        setAnnotations(data.data);
      }
    } catch (error) {
      console.error("Error fetching annotations:", error);
    }
  }

  async function fetchReviewResult() {
    try {
      const res = await fetch("/api/lesson-plans/" + id);
      const data = await res.json();
      if (data.success && data.data.reviewSummary) {
        setReviewResult({
          overallScore: data.data.reviewSummary.overallScore || 0,
          totalIssues: data.data.reviewSummary.totalIssues || 0,
          criticalIssues: data.data.reviewSummary.criticalIssues || 0,
          errorIssues: data.data.reviewSummary.errorIssues || 0,
          warningIssues: data.data.reviewSummary.warningIssues || 0,
          infoIssues: data.data.reviewSummary.infoIssues || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching review result:", error);
    }
  }

  async function handleAnnotationAction(annotationId: string, action: "accept" | "reject") {
    try {
      const res = await fetch(
        "/api/lesson-plans/" + id + "/annotations/" + annotationId + "/" + action,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: action === "reject" ? JSON.stringify({ reason: "Không phù hợp" }) : undefined,
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(action === "accept" ? "Đã chấp nhận" : "Đã từ chối");
        fetchAnnotations();
      } else {
        toast.error(data.message || "Lỗi");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Lỗi");
    }
  }

  async function handleExport(includeAnnotations: boolean) {
    setExporting(true);
    try {
      const res = await fetch("/api/lesson-plans/" + id + "/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeAnnotations }),
      });
      const data = await res.json();
      if (data.success) {
        const link = document.createElement("a");
        link.href = data.data.downloadUrl;
        link.download = data.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Export thành công");
      } else {
        toast.error(data.message || "Lỗi khi export");
      }
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Lỗi khi export");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-foreground mb-2">Chưa có nội dung</h2>
          <p className="text-muted-foreground mb-4">Giáo án chưa được parse hoặc chưa có sections.</p>
          <Link href={"/lesson-plans/" + id}>
            <Button>Quay lại chi tiết giáo án</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReviewLayout
      lessonPlanId={id}
      sections={sections}
      annotations={annotations}
      reviewResult={reviewResult}
      onAnnotationAction={handleAnnotationAction}
      onExport={handleExport}
      onRefresh={function refresh() {
        setLoading(true);
        Promise.all([fetchSections(), fetchAnnotations(), fetchReviewResult()]).then(function() {
          setLoading(false);
        });
      }}
    />
  );
}
