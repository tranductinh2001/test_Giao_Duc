/**
 * Review Layout - Google Docs/Word Review Experience
 * 3-panel: Left (Sections), Center (Document), Right (AI Review)
 */
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Check,
  X,
  Download,
  RefreshCw,
  Lightbulb,
  Scale,
  TrendingUp,
  MessageSquare,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface ReviewLayoutProps {
  lessonPlanId: string;
  sections: Section[];
  annotations: Annotation[];
  reviewResult: ReviewResult | null;
  onAnnotationAction?: (annotationId: string, action: "accept" | "reject") => void;
  onExport?: (includeAnnotations: boolean) => void;
  onRefresh?: () => void;
}

const severityConfig = {
  CRITICAL: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300", badge: "bg-red-600 text-white", icon: XCircle },
  ERROR: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", badge: "bg-red-500 text-white", icon: AlertCircle },
  WARNING: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", badge: "bg-yellow-500 text-white", icon: AlertTriangle },
  INFO: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "bg-blue-500 text-white", icon: Info },
};

function getSeverityConfig(severity: string) {
  return severityConfig[severity as keyof typeof severityConfig] || severityConfig.INFO;
}

export default function ReviewLayout({
  lessonPlanId,
  sections,
  annotations,
  reviewResult,
  onAnnotationAction,
  onExport,
  onRefresh,
}: ReviewLayoutProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showResolved, setShowResolved] = useState(true);

  useEffect(function initSections() {
    if (sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
      const ids = new Set<string>();
      sections.forEach(function addId(s) { ids.add(s.id); });
      setExpandedSections(ids);
    }
  }, [sections, selectedSectionId]);

  const filteredAnnotations = useMemo(function filterAnnotations() {
    return annotations.filter(function matchesFilter(a) {
      if (!showResolved && a.status !== "PENDING") return false;
      if (severityFilter !== "ALL" && a.severity !== severityFilter) return false;
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      return true;
    });
  }, [annotations, severityFilter, statusFilter, showResolved]);

  const stats = useMemo(function computeStats() {
    const critical = annotations.filter(function isCritical(a) {
      return a.severity === "CRITICAL" || a.severity === "ERROR";
    }).length;
    const warning = annotations.filter(function isWarning(a) {
      return a.severity === "WARNING";
    }).length;
    const info = annotations.filter(function isInfo(a) {
      return a.severity === "INFO";
    }).length;
    const passed = sections.length - (critical + warning + info);
    return { critical, warning, info, passed, total: annotations.length };
  }, [annotations, sections]);

  const scrollToAnnotation = useCallback(function scrollTo(id: string) {
    const el = document.getElementById("annotation-" + id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(function syncAnnotationSelection() {
    if (selectedAnnotationId) {
      const ann = annotations.find(function find(a) { return a.id === selectedAnnotationId; });
      if (ann) {
        setSelectedSectionId(ann.sectionId);
        setTimeout(function delayedScroll() { scrollToAnnotation(ann.id); }, 100);
      }
    }
  }, [selectedAnnotationId, annotations, scrollToAnnotation]);

  function handleSectionClick(id: string) {
    setSelectedSectionId(id);
  }

  function handleSectionToggle(id: string) {
    setExpandedSections(function toggle(prev) {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">AI Review</h2>
          {reviewResult && (
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{reviewResult.overallScore.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Điểm</div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm">
                {reviewResult.criticalIssues > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <XCircle className="w-4 h-4" />
                    {reviewResult.criticalIssues}
                  </span>
                )}
                {reviewResult.warningIssues > 0 && (
                  <span className="flex items-center gap-1 text-yellow-600 font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    {reviewResult.warningIssues}
                  </span>
                )}
                {reviewResult.infoIssues > 0 && (
                  <span className="flex items-center gap-1 text-blue-600 font-medium">
                    <Info className="w-4 h-4" />
                    {reviewResult.infoIssues}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={function exportClick() { onExport(true); }}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT - Sections */}
        <div className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-3 border-b border-border">
            <h3 className="font-semibold text-sm">Sections ({sections.length})</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-2">
              {sections.map(function renderSection(section) {
                const sectionAnns = annotations.filter(function filterBySection(a) { return a.sectionId === section.id; });
                const errCount = sectionAnns.filter(function isErr(a) { return a.severity === "CRITICAL" || a.severity === "ERROR"; }).length;
                const warnCount = sectionAnns.filter(function isWarn(a) { return a.severity === "WARNING"; }).length;
                const infoCount = sectionAnns.filter(function isInfo(a) { return a.severity === "INFO"; }).length;
                return (
                  <div key={section.id} className="border-b border-border/50">
                    <button
                      onClick={function onClick() { handleSectionClick(section.id); }}
                      className={cn(
                        "w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors",
                        selectedSectionId === section.id && "bg-primary/10 border-l-2 border-l-primary"
                      )}
                    >
                      <button
                        onClick={function onToggle(e: React.MouseEvent) { e.stopPropagation(); handleSectionToggle(section.id); }}
                        className="p-0.5 hover:bg-muted rounded"
                      >
                        {expandedSections.has(section.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{section.sectionTitle || section.sectionType}</p>
                        <p className="text-xs text-muted-foreground truncate">{section.sectionType}</p>
                      </div>
                      {sectionAnns.length > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {errCount > 0 && <span className="w-5 h-5 flex items-center justify-center bg-red-100 text-red-700 text-xs rounded-full font-medium">{errCount}</span>}
                          {warnCount > 0 && <span className="w-5 h-5 flex items-center justify-center bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">{warnCount}</span>}
                          {infoCount > 0 && <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{infoCount}</span>}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* CENTER - Document */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
            {sections.map(function renderDocSection(section) {
              const sectionAnns = annotations.filter(function filterBySection(a) { return a.sectionId === section.id; });
              return (
                <div
                  key={section.id}
                  id={"section-" + section.id}
                  className={cn("mb-6 transition-opacity", selectedSectionId === section.id ? "opacity-100" : "opacity-60")}
                >
                  {section.sectionTitle && (
                    <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">{section.sectionTitle}</h3>
                  )}
                  <DocumentContent
                    content={section.rawContent}
                    annotations={sectionAnns}
                    selectedAnnotationId={selectedAnnotationId}
                    onAnnotationClick={setSelectedAnnotationId}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT - AI Review */}
        <div className="w-80 border-l border-border bg-card flex flex-col">
          {/* Filters */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">AI Review ({filteredAnnotations.length})</h3>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={showResolved} onChange={function onCheck(e) { setShowResolved(e.target.checked); }} className="rounded" />
                Hiện đã xử lý
              </label>
            </div>
            <select
              value={severityFilter}
              onChange={function onChange(e) { setSeverityFilter(e.target.value); }}
              className="w-full text-sm border rounded px-2 py-1.5"
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="CRITICAL">Nghiêm trọng</option>
              <option value="ERROR">Lỗi</option>
              <option value="WARNING">Cảnh báo</option>
              <option value="INFO">Gợi ý</option>
            </select>
            <select
              value={statusFilter}
              onChange={function onChange(e) { setStatusFilter(e.target.value); }}
              className="w-full text-sm border rounded px-2 py-1.5"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xử lý</option>
              <option value="ACCEPTED">Đã chấp nhận</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>
          </div>

          {/* Stats */}
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="flex flex-col items-center"><span className="font-bold text-red-600">{stats.critical}</span><span className="text-muted-foreground">Lỗi</span></div>
              <div className="flex flex-col items-center"><span className="font-bold text-yellow-600">{stats.warning}</span><span className="text-muted-foreground">Cảnh báo</span></div>
              <div className="flex flex-col items-center"><span className="font-bold text-blue-600">{stats.info}</span><span className="text-muted-foreground">Gợi ý</span></div>
              <div className="flex flex-col items-center"><span className="font-bold text-green-600">{stats.passed}</span><span className="text-muted-foreground">Đạt</span></div>
            </div>
          </div>

          {/* Annotation List */}
          <ScrollArea className="flex-1">
            {filteredAnnotations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Không có vấn đề nào</p>
              </div>
            ) : (
              <div>
                {filteredAnnotations.map(function renderAnn(ann) {
                  const config = getSeverityConfig(ann.severity);
                  const Icon = config.icon;
                  return (
                    <div
                      key={ann.id}
                      onClick={function onClick() { setSelectedAnnotationId(ann.id); }}
                      className={cn(
                        "p-3 border-b border-border cursor-pointer transition-all hover:bg-muted/50",
                        selectedAnnotationId === ann.id && "bg-primary/10 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", config.text)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", config.badge)}>{ann.severity}</span>
                            {ann.status !== "PENDING" && (
                              <span className={cn("text-xs px-1.5 py-0.5 rounded", ann.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                {ann.status === "ACCEPTED" ? "Đã duyệt" : "Đã từ chối"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium mt-1 line-clamp-2">{ann.message}</p>
                          {ann.explanation && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.explanation}</p>}
                          {ann.highlightedText && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono truncate">"{ann.highlightedText}"</div>
                          )}
                          <div className="mt-2 space-y-1">
                            {ann.ruleName && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Scale className="w-3 h-3" /><span>Rule: {ann.ruleName}</span></div>}
                            {ann.confidence !== undefined && <div className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp className="w-3 h-3" /><span>Confidence: {ann.confidence}%</span></div>}
                          </div>
                          {ann.status === "PENDING" && onAnnotationAction && (
                            <div className="flex items-center gap-2 mt-3">
                              <Button size="sm" variant="outline" className="h-7 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100" onClick={function onAccept(e: React.MouseEvent) { e.stopPropagation(); onAnnotationAction(ann.id, "accept"); }}>
                                <Check className="w-3 h-3 mr-1" />Chấp nhận
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100" onClick={function onReject(e: React.MouseEvent) { e.stopPropagation(); onAnnotationAction(ann.id, "reject"); }}>
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

// Document content with inline highlights
function DocumentContent({
  content,
  annotations,
  selectedAnnotationId,
  onAnnotationClick,
}: {
  content: string;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  onAnnotationClick: (id: string) => void;
}) {
  if (annotations.length === 0) {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>;
  }

  const segments: Array<{ text: string; annotation?: Annotation }> = [];
  const sortedAnnotations = [...annotations].sort(function sortByPos(a, b) { return a.startPosition - b.startPosition; });

  let lastIndex = 0;
  sortedAnnotations.forEach(function addSegments(ann) {
    if (ann.startPosition > lastIndex) {
      segments.push({ text: content.slice(lastIndex, ann.startPosition) });
    }
    segments.push({ text: content.slice(ann.startPosition, ann.endPosition), annotation: ann });
    lastIndex = ann.endPosition;
  });
  if (lastIndex < content.length) {
    segments.push({ text: content.slice(lastIndex) });
  }

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map(function renderSegment(seg, idx) {
        if (!seg.annotation) return <span key={idx}>{seg.text}</span>;
        const ann = seg.annotation;
        const config = getSeverityConfig(ann.severity);
        const isSelected = selectedAnnotationId === ann.id;
        return (
          <span key={idx} className="relative inline">
            <span
              id={"annotation-" + ann.id}
              className={cn("cursor-pointer px-0.5 rounded border-b-2 transition-all", config.bg, config.text, config.border, isSelected && "ring-2 ring-primary ring-offset-1")}
              onClick={function onClick() { onAnnotationClick(ann.id); }}
            >
              {seg.text}
            </span>
            {isSelected && (
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
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
