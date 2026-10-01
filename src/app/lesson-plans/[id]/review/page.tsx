/**
 * Review Page - Google Docs Style
 * 3-panel layout: Left (Sections), Center (Document), Right (AI Review)
 * Comments attached to paragraphs, not sections
 */

"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Check,
  X,
  Filter,
  RefreshCw,
  MessageSquare,
  Lightbulb,
  Scale,
  TrendingUp,
  CheckCircle,
  Undo,
  Redo,
  Edit3,
  Eye,
  EyeOff,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";

// ============ Types ============

interface Section {
  id: string;
  sectionType: string;
  sectionTitle: string;
  sectionOrder: number;
  rawContent: string;
  annotationCount: number;
  paragraphs?: Paragraph[];
}

interface Paragraph {
  id: string;
  content: string;
  order: number;
  startOffset: number;
  endOffset: number;
}

interface Annotation {
  id: string;
  sectionId: string;
  paragraphId?: string;
  offsetStart?: number;
  offsetEnd?: number;
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
  teachingMethodScore?: number;
  teachingMethodAnalysis?: {
    currentMethod: { name: string; description: string; confidence: number };
    recommendedMethods: Array<{ name: string; reason: string; suitabilityScore: number }>;
    pedagogyScore: number;
    overallRecommendation: string;
    perSectionAnalysis?: Array<{
      sectionId: string;
      sectionTitle: string;
      currentMethod: { name: string };
      pedagogyScore: number;
    }>;
  };
}

// ============ Severity Config ============

const severityConfig = {
  CRITICAL: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    badge: "bg-red-600 text-white",
    icon: XCircle,
    highlight: "bg-red-200",
  },
  ERROR: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    badge: "bg-orange-500 text-white",
    icon: AlertCircle,
    highlight: "bg-orange-100",
  },
  WARNING: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    badge: "bg-yellow-500 text-white",
    icon: AlertTriangle,
    highlight: "bg-yellow-100",
  },
  INFO: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-500 text-white",
    icon: Info,
    highlight: "bg-blue-100",
  },
};

function getSeverityConfig(severity: string) {
  return severityConfig[severity as keyof typeof severityConfig] || severityConfig.INFO;
}

// ============ Main Component ============

export default function ReviewPage() {
  const params = useParams();
  const id = params.id as string;

  // State
  const [sections, setSections] = useState<Section[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // UI State
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [ruleFilter, setRuleFilter] = useState<string>("ALL");
  const [showResolved, setShowResolved] = useState(true);
  const [workflowStatus, setWorkflowStatus] = useState<string>("COMPLETED");
  const [isStreaming, setIsStreaming] = useState(false);

  // Refs
  const paragraphRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const annotationRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ============ Fetch Data ============

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  // Streaming: Poll for workflow status and annotations
  useEffect(() => {
    if (!id || workflowStatus === "COMPLETED" || workflowStatus === "FAILED") return;

    setIsStreaming(true);
    const pollInterval = setInterval(async () => {
      try {
        // Check workflow status
        const res = await fetch(`/api/lesson-plans/${id}`);
        const data = await res.json();
        if (data.success && data.data.workflowSession) {
          const status = data.data.workflowSession.status;
          setWorkflowStatus(status);

          if (status === "COMPLETED" || status === "FAILED") {
            setIsStreaming(false);
            clearInterval(pollInterval);
          }
        }

        // Fetch new annotations (in case of streaming updates)
        await fetchAnnotations();
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [id, workflowStatus]);

  useEffect(() => {
    if (id && !loading) fetchAnnotations();
  }, [severityFilter, statusFilter, id, loading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSections(), fetchAnnotations(), fetchReviewResult()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/sections`);
      const data = await res.json();
      if (data.success) {
        // Build paragraphs from rawContent
        const sectionsWithParagraphs = data.data.map((section: Section) => {
          const paragraphs = buildParagraphs(section.rawContent, section.id);
          return { ...section, paragraphs };
        });
        setSections(sectionsWithParagraphs);
        if (sectionsWithParagraphs.length > 0 && !selectedSectionId) {
          setSelectedSectionId(sectionsWithParagraphs[0].id);
          setExpandedSections(new Set(sectionsWithParagraphs.map((s: Section) => s.id)));
        }
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchAnnotations = async () => {
    try {
      const params = new URLSearchParams();
      if (severityFilter !== "ALL") params.append("severity", severityFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/lesson-plans/${id}/annotations?${params}`);
      const data = await res.json();
      if (data.success) {
        setAnnotations(data.data);
      }
    } catch (error) {
      console.error("Error fetching annotations:", error);
    }
  };

  const fetchReviewResult = async () => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}`);
      const data = await res.json();
      if (data.success && data.data.reviewSummary) {
        setReviewResult({
          overallScore: data.data.reviewSummary.overallScore || 0,
          totalIssues: data.data.reviewSummary.totalIssues || 0,
          criticalIssues: data.data.reviewSummary.criticalIssues || 0,
          errorIssues: data.data.reviewSummary.errorIssues || 0,
          warningIssues: data.data.reviewSummary.warningIssues || 0,
          infoIssues: data.data.reviewSummary.infoIssues || 0,
          teachingMethodScore: data.data.reviewSummary.teachingMethodScore,
          teachingMethodAnalysis: data.data.reviewSummary.teachingMethodAnalysis,
        });
      }
      // Update workflow status
      if (data.data.workflowSession) {
        setWorkflowStatus(data.data.workflowSession.status);
      }
    } catch (error) {
      console.error("Error fetching review result:", error);
    }
  };

  // ============ Helpers ============

  function buildParagraphs(content: string, sectionId: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const lines = content.split("\n");
    let offset = 0;

    lines.forEach((line, index) => {
      if (line.trim()) {
        paragraphs.push({
          id: `${sectionId}-p${index}`,
          content: line,
          order: index,
          startOffset: offset,
          endOffset: offset + line.length,
        });
      }
      offset += line.length + 1; // +1 for newline
    });

    return paragraphs;
  }

  // ============ Actions ============

  const handleAnnotationAction = async (annotationId: string, action: "accept" | "reject" | "resolve") => {
    try {
      const endpoint = action === "resolve" ? "resolve" : action;
      const res = await fetch(
        `/api/lesson-plans/${id}/annotations/${annotationId}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: action === "reject" ? JSON.stringify({ reason: "Không phù hợp" }) : undefined,
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(action === "accept" ? "Đã chấp nhận" : action === "reject" ? "Đã từ chối" : "Đã xử lý");
        fetchAnnotations();
      } else {
        toast.error(data.message || "Lỗi");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Lỗi");
    }
  };

  const handleExport = async (includeAnnotations: boolean) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/lesson-plans/${id}/export`, {
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
  };

  // ============ Computed ============

  const filteredAnnotations = useMemo(() => {
    return annotations.filter((a) => {
      if (!showResolved && a.status !== "PENDING") return false;
      if (severityFilter !== "ALL" && a.severity !== severityFilter) return false;
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (sectionFilter !== "ALL" && a.sectionId !== sectionFilter) return false;
      if (ruleFilter !== "ALL" && a.ruleId !== ruleFilter) return false;
      return true;
    });
  }, [annotations, severityFilter, statusFilter, sectionFilter, ruleFilter, showResolved]);

  const stats = useMemo(() => {
    const critical = annotations.filter((a) => a.severity === "CRITICAL" || a.severity === "ERROR").length;
    const warning = annotations.filter((a) => a.severity === "WARNING").length;
    const info = annotations.filter((a) => a.severity === "INFO").length;
    const pending = annotations.filter((a) => a.status === "PENDING").length;
    const resolved = annotations.filter((a) => a.status !== "PENDING").length;
    return { critical, warning, info, pending, resolved, total: annotations.length };
  }, [annotations]);

  const uniqueRules = useMemo(() => {
    const rules = new Map<string, { id: string; name: string }>();
    annotations.forEach((a) => {
      if (a.ruleId && a.ruleName) {
        rules.set(a.ruleId, { id: a.ruleId, name: a.ruleName });
      }
    });
    return Array.from(rules.values());
  }, [annotations]);

  // ============ Navigation ============

  const scrollToAnnotation = useCallback((annotationId: string) => {
    const el = annotationRefs.current.get(annotationId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const scrollToParagraph = useCallback((paragraphId: string) => {
    const el = paragraphRefs.current.get(paragraphId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Flash effect
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1000);
    }
  }, []);

  // Sync selection
  useEffect(() => {
    if (selectedAnnotationId) {
      const annotation = annotations.find((a) => a.id === selectedAnnotationId);
      if (annotation) {
        setSelectedSectionId(annotation.sectionId);
        setTimeout(() => scrollToAnnotation(annotation.id), 100);
      }
    }
  }, [selectedAnnotationId, annotations, scrollToAnnotation]);

  const handleSectionClick = (sectionId: string) => {
    setSelectedSectionId(sectionId);
  };

  const handleSectionToggle = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleParagraphClick = (paragraphId: string) => {
    // Find annotation at this paragraph
    const annotation = annotations.find((a) => a.paragraphId === paragraphId);
    if (annotation) {
      setSelectedAnnotationId(annotation.id);
    }
  };

  const handleAnnotationClick = (annotationId: string) => {
    setSelectedAnnotationId(annotationId);
    const annotation = annotations.find((a) => a.id === annotationId);
    if (annotation?.paragraphId) {
      scrollToParagraph(annotation.paragraphId);
    }
  };

  // ============ Render ============

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!loading && sections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-foreground mb-2">Chưa có nội dung</h2>
          <p className="text-muted-foreground mb-4">Giáo án chưa được parse hoặc chưa có sections.</p>
          <Link href={`/lesson-plans/${id}`}>
            <Button>Quay lại chi tiết giáo án</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/lesson-plans/${id}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </Link>
          <span className="text-muted-foreground">/</span>
          <h2 className="text-lg font-semibold">AI Review</h2>

          {/* Workflow Status Indicator */}
          {isStreaming && (
            <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              <div className="w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
              <span>Đang phân tích...</span>
            </div>
          )}

          {reviewResult && (
            <div className="flex items-center gap-3 ml-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{reviewResult.overallScore.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Điểm</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm">
                {reviewResult.criticalIssues > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <XCircle className="w-4 h-4" />{reviewResult.criticalIssues}
                  </span>
                )}
                {reviewResult.warningIssues > 0 && (
                  <span className="flex items-center gap-1 text-yellow-600 font-medium">
                    <AlertTriangle className="w-4 h-4" />{reviewResult.warningIssues}
                  </span>
                )}
                {reviewResult.infoIssues > 0 && (
                  <span className="flex items-center gap-1 text-blue-600 font-medium">
                    <Info className="w-4 h-4" />{reviewResult.infoIssues}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport(true)} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Đang export..." : "Export"}
          </Button>
        </div>
      </header>

      {/* 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Sections */}
        <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Sections ({sections.length})
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-2">
              {sections.map((section) => {
                const sectionAnnotations = annotations.filter((a) => a.sectionId === section.id);
                const errorCount = sectionAnnotations.filter((a) => a.severity === "CRITICAL" || a.severity === "ERROR").length;
                const warningCount = sectionAnnotations.filter((a) => a.severity === "WARNING").length;
                const infoCount = sectionAnnotations.filter((a) => a.severity === "INFO").length;
                const isExpanded = expandedSections.has(section.id);

                return (
                  <div key={section.id} className="border-b border-border/50">
                    <div
                      onClick={() => handleSectionClick(section.id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer",
                        selectedSectionId === section.id && "bg-primary/10 border-l-2 border-l-primary"
                      )}
                    >
                      <span
                        onClick={(e) => { e.stopPropagation(); handleSectionToggle(section.id); }}
                        className="p-0.5 hover:bg-muted rounded cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{section.sectionTitle || section.sectionType}</p>
                        <p className="text-xs text-muted-foreground truncate">{section.sectionType}</p>
                      </div>
                      {sectionAnnotations.length > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {errorCount > 0 && <span className="w-5 h-5 flex items-center justify-center bg-red-100 text-red-700 text-xs rounded-full font-medium">{errorCount}</span>}
                          {warningCount > 0 && <span className="w-5 h-5 flex items-center justify-center bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">{warningCount}</span>}
                          {infoCount > 0 && <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{infoCount}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* CENTER PANEL - Document */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
            {sections.map((section) => (
              <div
                key={section.id}
                className={cn("mb-6 transition-opacity", selectedSectionId === section.id ? "opacity-100" : "opacity-60")}
              >
                {section.sectionTitle && (
                  <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">{section.sectionTitle}</h3>
                )}
                <DocumentContent
                  content={section.rawContent}
                  paragraphs={section.paragraphs || []}
                  annotations={annotations.filter((a) => a.sectionId === section.id)}
                  selectedAnnotationId={selectedAnnotationId}
                  hoveredAnnotationId={hoveredAnnotationId}
                  paragraphRefs={paragraphRefs}
                  onParagraphClick={handleParagraphClick}
                  onAnnotationClick={handleAnnotationClick}
                  onAnnotationHover={setHoveredAnnotationId}
                />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL - AI Review */}
        <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
          {/* Filters */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                AI Review ({filteredAnnotations.length})
              </h3>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="rounded"
                />
                Hiện đã xử lý
              </label>
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full text-sm border rounded px-2 py-1.5"
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="CRITICAL">Nghiêm trọng ({stats.critical})</option>
              <option value="ERROR">Lỗi ({stats.critical})</option>
              <option value="WARNING">Cảnh báo ({stats.warning})</option>
              <option value="INFO">Gợi ý ({stats.info})</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-sm border rounded px-2 py-1.5"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xử lý ({stats.pending})</option>
              <option value="ACCEPTED">Đã chấp nhận</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full text-sm border rounded px-2 py-1.5"
            >
              <option value="ALL">Tất cả sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.sectionTitle || s.sectionType}</option>
              ))}
            </select>

            {uniqueRules.length > 0 && (
              <select
                value={ruleFilter}
                onChange={(e) => setRuleFilter(e.target.value)}
                className="w-full text-sm border rounded px-2 py-1.5"
              >
                <option value="ALL">Tất cả rules</option>
                {uniqueRules.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Stats */}
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="flex flex-col items-center"><span className="font-bold text-red-600">{stats.critical}</span><span className="text-muted-foreground">Lỗi</span></div>
              <div className="flex flex-col items-center"><span className="font-bold text-yellow-600">{stats.warning}</span><span className="text-muted-foreground">Cảnh báo</span></div>
              <div className="flex flex-col items-center"><span className="font-bold text-blue-600">{stats.info}</span><span className="text-muted-foreground">Gợi ý</span></div>
              <div className="flex flex-col items-center"><span className="font-bold text-green-600">{stats.resolved}</span><span className="text-muted-foreground">Đã xử lý</span></div>
            </div>
          </div>

          {/* Annotation List */}
          <ScrollArea className="flex-1">
            {filteredAnnotations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Không có vấn đề nào</p>
              </div>
            ) : (
              <div>
                {filteredAnnotations.map((annotation) => {
                  const config = getSeverityConfig(annotation.severity);
                  const Icon = config.icon;
                  return (
                    <div
                      key={annotation.id}
                      ref={(el) => { if (el) annotationRefs.current.set(annotation.id, el); }}
                      onClick={() => handleAnnotationClick(annotation.id)}
                      onMouseEnter={() => setHoveredAnnotationId(annotation.id)}
                      onMouseLeave={() => setHoveredAnnotationId(null)}
                      className={cn(
                        "p-3 border-b border-border cursor-pointer transition-all hover:bg-muted/50",
                        selectedAnnotationId === annotation.id && "bg-primary/10 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", config.text)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", config.badge)}>{annotation.severity}</span>
                            {annotation.status !== "PENDING" && (
                              <span className={cn("text-xs px-1.5 py-0.5 rounded", annotation.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                {annotation.status === "ACCEPTED" ? "Đã duyệt" : "Đã từ chối"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium line-clamp-2">{annotation.message}</p>
                          {annotation.explanation && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{annotation.explanation}</p>}
                          {annotation.highlightedText && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono truncate">"{annotation.highlightedText}"</div>
                          )}
                          <div className="mt-2 space-y-1">
                            {annotation.ruleName && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Scale className="w-3 h-3" /><span className="truncate">Rule: {annotation.ruleName}</span></div>}
                            {annotation.confidence !== undefined && <div className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp className="w-3 h-3" /><span>Confidence: {annotation.confidence}%</span></div>}
                            {annotation.penalty !== undefined && <div className="flex items-center gap-1 text-xs text-muted-foreground"><AlertCircle className="w-3 h-3" /><span>Penalty: -{annotation.penalty}</span></div>}
                          </div>
                          {annotation.status === "PENDING" && (
                            <div className="flex items-center gap-2 mt-3">
                              <Button size="sm" variant="outline" className="h-7 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100" onClick={(e) => { e.stopPropagation(); handleAnnotationAction(annotation.id, "accept"); }}>
                                <Check className="w-3 h-3 mr-1" />Chấp nhận
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); handleAnnotationAction(annotation.id, "reject"); }}>
                                <X className="w-3 h-3 mr-1" />Từ chối
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

// ============ Document Content Component ============

function DocumentContent({
  content,
  paragraphs,
  annotations,
  selectedAnnotationId,
  hoveredAnnotationId,
  paragraphRefs,
  onParagraphClick,
  onAnnotationClick,
  onAnnotationHover,
}: {
  content: string;
  paragraphs: Paragraph[];
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  hoveredAnnotationId: string | null;
  paragraphRefs: React.MutableRefObject<Map<string, HTMLSpanElement>>;
  onParagraphClick: (paragraphId: string) => void;
  onAnnotationClick: (annotationId: string) => void;
  onAnnotationHover: (annotationId: string | null) => void;
}) {
  if (annotations.length === 0) {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>;
  }

  // Build segments with annotations at paragraph level
  const segments: Array<{ text: string; annotation?: Annotation; paragraphId?: string }> = [];

  // Sort annotations by position
  const sortedAnnotations = [...annotations].sort((a, b) => a.startPosition - b.startPosition);

  let lastPos = 0;
  const contentText = content;

  sortedAnnotations.forEach((ann) => {
    // Find paragraph for this annotation
    const paragraph = paragraphs.find((p) => ann.startPosition >= p.startOffset && ann.startPosition < p.endOffset);

    if (ann.startPosition > lastPos) {
      segments.push({ text: contentText.slice(lastPos, ann.startPosition) });
    }

    segments.push({
      text: contentText.slice(ann.startPosition, ann.endPosition),
      annotation: ann,
      paragraphId: paragraph?.id,
    });

    lastPos = ann.endPosition;
  });

  if (lastPos < contentText.length) {
    segments.push({ text: contentText.slice(lastPos) });
  }

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((seg, idx) => {
        if (!seg.annotation) return <span key={idx}>{seg.text}</span>;

        const ann = seg.annotation;
        const config = getSeverityConfig(ann.severity);
        const isSelected = selectedAnnotationId === ann.id;
        const isHovered = hoveredAnnotationId === ann.id;

        return (
          <span
            key={idx}
            ref={(el) => { if (el && seg.paragraphId) paragraphRefs.current.set(seg.paragraphId!, el); }}
            className={cn(
              "relative inline cursor-pointer px-0.5 rounded border-b-2 transition-all",
              config.bg,
              config.text,
              config.border,
              isSelected && "ring-2 ring-primary ring-offset-1",
              isHovered && "opacity-80"
            )}
            onClick={() => seg.paragraphId && onParagraphClick(seg.paragraphId)}
            onMouseEnter={() => onAnnotationHover(ann.id)}
            onMouseLeave={() => onAnnotationHover(null)}
          >
            {seg.text}
            {/* Popup */}
            {(isSelected || isHovered) && (
              <div className={cn("absolute z-20 mt-1 p-3 rounded-lg shadow-lg border w-64", config.bg, config.border)}>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", config.badge)}>{ann.severity}</span>
                </div>
                <p className="text-sm font-medium">{ann.message}</p>
                {ann.explanation && <p className="text-xs text-muted-foreground mt-1">{ann.explanation}</p>}
                {ann.suggestion && (
                  <div className="mt-2 p-2 bg-white/50 rounded text-xs">
                    <Lightbulb className="w-3 h-3 inline mr-1" />
                    {ann.suggestion}
                  </div>
                )}
                {ann.confidence !== undefined && (
                  <p className="text-xs text-muted-foreground mt-2">Confidence: {ann.confidence}%</p>
                )}
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
