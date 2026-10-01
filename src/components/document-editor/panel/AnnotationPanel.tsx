/**
 * Annotation Panel Component
 *
 * Phase 7.1: Production-ready DocumentEditor
 * Shows annotations with filtering, grouping, and navigation
 */

"use client";

import { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ListChecks,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  EditorAnnotation,
  AnnotationStatistics,
  AnnotationFilterType,
  GroupByType,
  AnnotationGroup,
} from "../types";
import { getSeverityColor } from "@/services/document-editor/annotationService";

interface AnnotationPanelProps {
  isOpen: boolean;
  annotations: EditorAnnotation[];
  groups: AnnotationGroup[];
  statistics: AnnotationStatistics;
  selectedAnnotationId: string | null;
  filter: AnnotationFilterType;
  groupBy: GroupByType;
  onSelectAnnotation: (annotation: EditorAnnotation | null) => void;
  onNavigate: (direction: "prev" | "next") => void;
  onFilterChange: (filter: AnnotationFilterType) => void;
  onGroupByChange: (groupBy: GroupByType) => void;
}

export function AnnotationPanel({
  isOpen,
  annotations,
  groups,
  statistics,
  selectedAnnotationId,
  filter,
  groupBy,
  onSelectAnnotation,
  onNavigate,
  onFilterChange,
  onGroupByChange,
}: AnnotationPanelProps) {
  // Filter annotations
  const filteredAnnotations = useMemo(() => {
    if (filter === "ALL") return annotations;
    if (filter === "PASSED") return annotations.filter((a) => a.ruleId === "PASSED");
    return annotations.filter((a) => a.severity === filter);
  }, [annotations, filter]);

  // Get selected annotation
  const selectedAnnotation = useMemo(() => {
    if (!selectedAnnotationId) return null;
    return annotations.find((a) => a.annotationId === selectedAnnotationId) || null;
  }, [annotations, selectedAnnotationId]);

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <XCircle className="w-4 h-4" />;
      case "HIGH":
      case "MEDIUM":
      case "LOW":
        return <AlertCircle className="w-4 h-4" />;
      case "PASSED":
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold">Danh sách lỗi</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("prev")}
            disabled={annotations.length === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {selectedAnnotationId
              ? `${annotations.findIndex((a) => a.annotationId === selectedAnnotationId) + 1}/${annotations.length}`
              : "0/0"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("next")}
            disabled={annotations.length === 0}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="px-4 py-2 border-b border-border bg-muted/30">
        <div className="grid grid-cols-5 gap-1 text-center text-xs">
          <div className="flex flex-col items-center">
            <span className="font-bold text-red-600">{statistics.critical}</span>
            <span className="text-muted-foreground">Lỗi</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-orange-600">{statistics.high}</span>
            <span className="text-muted-foreground">Cao</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-yellow-600">{statistics.medium}</span>
            <span className="text-muted-foreground">TB</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-blue-600">{statistics.low}</span>
            <span className="text-muted-foreground">Thấp</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-green-600">{statistics.passed}</span>
            <span className="text-muted-foreground">Đạt</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-border space-y-2">
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as AnnotationFilterType)}
          className="w-full text-sm bg-background border border-border rounded px-2 py-1"
        >
          <option value="ALL">Tất cả ({statistics.totalAnnotations})</option>
          <option value="CRITICAL">Lỗi nghiêm trọng ({statistics.critical})</option>
          <option value="HIGH">Cao ({statistics.high})</option>
          <option value="MEDIUM">Trung bình ({statistics.medium})</option>
          <option value="LOW">Thấp ({statistics.low})</option>
          <option value="PASSED">Đạt ({statistics.passed})</option>
        </select>

        <select
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as GroupByType)}
          className="w-full text-sm bg-background border border-border rounded px-2 py-1"
        >
          <option value="NONE">Không nhóm</option>
          <option value="SECTION">Theo phần</option>
          <option value="ACTIVITY">Theo hoạt động</option>
          <option value="SEVERITY">Theo mức độ</option>
          <option value="RULE">Theo quy tắc</option>
        </select>
      </div>

      {/* Annotation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAnnotations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Không có lỗi nào</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredAnnotations.map((annotation) => (
              <button
                key={annotation.annotationId}
                onClick={() => onSelectAnnotation(annotation)}
                className={cn(
                  "w-full text-left p-3 hover:bg-muted/50 transition-colors",
                  selectedAnnotationId === annotation.annotationId &&
                    "bg-primary/10 border-l-2 border-primary"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className={cn("mt-0.5", getSeverityColor(annotation.severity))}>
                    {getSeverityIcon(annotation.severity)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {annotation.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {annotation.activityCode} - {annotation.activityTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {annotation.ruleName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {annotation.confidence}% confidence
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Annotation Details */}
      {selectedAnnotation && (
        <div className="border-t border-border p-4 bg-muted/30 max-h-[40%] overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(getSeverityColor(selectedAnnotation.severity))}>
              {getSeverityIcon(selectedAnnotation.severity)}
            </span>
            <span className="font-medium text-sm">{selectedAnnotation.title}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Hoạt động: </span>
              <span>{selectedAnnotation.activityCode} - {selectedAnnotation.activityTitle}</span>
            </div>

            <div>
              <span className="text-muted-foreground">Section: </span>
              <span>{selectedAnnotation.sectionName}</span>
            </div>

            <div>
              <span className="text-muted-foreground">Quy tắc: </span>
              <span>{selectedAnnotation.ruleName}</span>
            </div>

            <div>
              <span className="text-muted-foreground">Mô tả: </span>
              <span>{selectedAnnotation.description}</span>
            </div>

            <div>
              <span className="text-muted-foreground">Lý do: </span>
              <span>{selectedAnnotation.reason}</span>
            </div>

            {selectedAnnotation.suggestions.length > 0 && (
              <div>
                <span className="text-muted-foreground">Gợi ý: </span>
                <ul className="list-disc list-inside mt-1">
                  {selectedAnnotation.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <span className="text-muted-foreground">Độ tin cậy: </span>
              <span>{selectedAnnotation.confidence}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnnotationPanel;
