"use client";

import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from "lucide-react";
import { getSeverityLabel, getSeverityColor } from "@/lib/severity-labels";

interface AnalysisSection {
  id: string;
  sectionTitle: string;
  sectionOrder: number;
  status: "pending" | "analyzing" | "complete" | "error";
  score?: number;
  issuesCount?: number;
  criticalCount?: number;
  errorCount?: number;
  warningCount?: number;
}

interface AnalysisIssue {
  id: string;
  sectionId: string;
  sectionTitle: string;
  severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO";
  ruleCode: string;
  message: string;
  position?: { startChar: number; endChar: number };
}

interface AIAnalysisPanelProps {
  overallScore?: number;
  sections: AnalysisSection[];
  issues: AnalysisIssue[];
  analyzing: boolean;
  onIssueClick?: (issue: AnalysisIssue) => void;
}

export default function AIAnalysisPanel({
  overallScore,
  sections,
  issues,
  analyzing,
  onIssueClick,
}: AIAnalysisPanelProps) {
  const totalIssues = issues.length;
  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const errorCount = issues.filter((i) => i.severity === "ERROR").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;
  const infoCount = issues.filter((i) => i.severity === "INFO").length;

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="text-primary">✨</span>
          AI Analysis
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Phân tích và đánh giá giáo án
        </p>
      </div>

      {/* Overall Score */}
      {overallScore !== undefined && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-1">
              {overallScore.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Điểm tổng thể</div>
          </div>
        </div>
      )}

      {/* Issues Summary */}
      {totalIssues > 0 && (
        <div className="p-4 border-b border-border space-y-2">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Tổng hợp vấn đề
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <span className="font-semibold">{criticalCount}</span>
                <span>{getSeverityLabel("CRITICAL")}</span>
              </div>
            )}
            {errorCount > 0 && (
              <div className="flex items-center gap-2 text-orange-600">
                <span className="font-semibold">{errorCount}</span>
                <span>{getSeverityLabel("ERROR")}</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <span className="font-semibold">{warningCount}</span>
                <span>{getSeverityLabel("WARNING")}</span>
              </div>
            )}
            {infoCount > 0 && (
              <div className="flex items-center gap-2 text-blue-600">
                <span className="font-semibold">{infoCount}</span>
                <span>{getSeverityLabel("INFO")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      {analyzing && (
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Tiến trình phân tích
          </h3>
          <div className="space-y-2">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center gap-2 text-xs">
                {section.status === "complete" && (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
                {section.status === "analyzing" && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                )}
                {section.status === "pending" && (
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0" />
                )}
                {section.status === "error" && (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <span
                  className={
                    section.status === "analyzing"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {section.sectionTitle}
                </span>
                {section.status === "complete" && section.issuesCount !== undefined && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {section.issuesCount} vấn đề
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Danh sách vấn đề ({totalIssues})
          </h3>
          {issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              {analyzing ? "Đang phân tích..." : "Chưa có vấn đề nào"}
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => {
                const color = getSeverityColor(issue.severity);
                return (
                  <button
                    key={issue.id}
                    onClick={() => onIssueClick?.(issue)}
                    className={`w-full text-left p-3 rounded-lg border ${color.border} ${color.bg} hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-lg">{color.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground mb-1">
                          {issue.sectionTitle}
                        </div>
                        <div className={`text-xs ${color.text} line-clamp-2`}>
                          {issue.message}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs ${color.badge} px-2 py-0.5 rounded inline-block mt-1`}>
                      {getSeverityLabel(issue.severity)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
