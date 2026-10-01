"use client";

import {
  BookOpen,
  Target,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface TeachingMethodAnalysis {
  currentMethod: {
    name: string;
    description: string;
    confidence: number;
  };
  recommendedMethods: Array<{
    name: string;
    reason: string;
    advantages: string[];
    disadvantages: string[];
    suitabilityScore: number;
  }>;
  alternativeMethods: Array<{
    name: string;
    reason: string;
  }>;
  pedagogyScore: number;
  overallRecommendation: string;
}

interface TeachingMethodPanelProps {
  analysis: TeachingMethodAnalysis | null;
  loading?: boolean;
  onMethodClick?: (methodName: string) => void;
}

export default function TeachingMethodPanel({
  analysis,
  loading,
  onMethodClick,
}: TeachingMethodPanelProps) {
  if (loading) {
    return (
      <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="text-primary">📚</span>
            Phương pháp giảng dạy
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Đang phân tích...
          </p>
        </div>
        <div className="p-4 space-y-4">
          <div className="h-20 bg-muted animate-pulse rounded-lg" />
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="text-primary">📚</span>
            Phương pháp giảng dạy
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Chưa có dữ liệu phân tích
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chạy AI Review để phân tích phương pháp giảng dạy</p>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="text-primary">📚</span>
          Phương pháp giảng dạy
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Đánh giá sự phù hợp của phương pháp
        </p>
      </div>

      {/* Pedagogy Score */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="text-center">
          <div className={`text-4xl font-bold ${getScoreColor(analysis.pedagogyScore)} mb-1`}>
            {analysis.pedagogyScore.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">Điểm số phương pháp</div>
          <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getScoreBg(analysis.pedagogyScore)} ${getScoreColor(analysis.pedagogyScore)}`}>
            <Sparkles className="w-3 h-3" />
            {analysis.pedagogyScore >= 80 ? "Tốt" : analysis.pedagogyScore >= 60 ? "Trung bình" : "Cần cải thiện"}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Current Method */}
        {analysis.currentMethod && analysis.currentMethod.name && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              Phương pháp hiện tại
            </h3>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="font-medium text-blue-700 dark:text-blue-300">
                {analysis.currentMethod.name}
              </div>
              {analysis.currentMethod.description && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {analysis.currentMethod.description}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-blue-500">
                <span>Độ tin tưởng:</span>
                <span className="font-medium">{analysis.currentMethod.confidence.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Methods */}
        {analysis.recommendedMethods && analysis.recommendedMethods.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-green-500" />
              Phương pháp đề xuất
            </h3>
            <div className="space-y-2">
              {analysis.recommendedMethods.map((method, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  onClick={() => onMethodClick?.(method.name)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-700 dark:text-green-300">
                      {method.name}
                    </span>
                    <span className={`text-xs font-medium ${getScoreColor(method.suitabilityScore)}`}>
                      {method.suitabilityScore.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {method.reason}
                  </p>
                  {method.advantages.length > 0 && (
                    <div className="mt-2 flex items-start gap-1">
                      <ThumbsUp className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-green-600 dark:text-green-400 line-clamp-2">
                        {method.advantages.slice(0, 2).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternative Methods */}
        {analysis.alternativeMethods && analysis.alternativeMethods.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-amber-500" />
              Phương pháp thay thế
            </h3>
            <div className="space-y-2">
              {analysis.alternativeMethods.map((method, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  <div className="font-medium text-amber-700 dark:text-amber-300">
                    {method.name}
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {method.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall Recommendation */}
        {analysis.overallRecommendation && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Khuyến nghị tổng thể
            </h3>
            <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-foreground">
                {analysis.overallRecommendation}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
