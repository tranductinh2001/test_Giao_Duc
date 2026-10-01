"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  History,
  FileText,
  Calendar,
  User,
  Brain,
  Search,
  ArrowUpDown,
  CheckCircle,
  X,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";

interface ReviewHistoryItem {
  id: string;
  lessonPlanId: string;
  lessonPlanTitle: string;
  actionType: string;
  score: number | null;
  issues: number;
  aiModel: string | null;
  circularCode: string | null;
  circularVersion: number | null;
  templateCode: string | null;
  templateVersion: number | null;
  executionTime: number | null;
  teachingMethodScore: number | null;
  teachingMethodAnalysis: {
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
  } | null;
  createdAt: string;
  performer: {
    name: string | null;
    email: string;
  };
}

interface ReviewDetail {
  id: string;
  lessonPlanId: string;
  lessonPlanTitle: string;
  overallScore: number | null;
  totalIssues: number;
  criticalIssues: number;
  errorIssues: number;
  warningIssues: number;
  infoIssues: number;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  teachingMethodAnalysis: {
    currentMethod: { name: string; description: string; confidence: number };
    recommendedMethods: Array<{ name: string; reason: string; suitabilityScore: number }>;
    pedagogyScore: number;
    overallRecommendation: string;
  } | null;
  annotations: {
    id: string;
    severity: string;
    message: string;
    suggestion: string | null;
    status: string;
    sectionTitle: string | null;
  }[];
}

function ReviewHistoryContent() {
  const searchParams = useSearchParams();
  const lessonPlanId = searchParams.get("lessonPlanId");

  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<ReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const url = lessonPlanId
        ? `/api/lesson-plans/${lessonPlanId}/review-history`
        : "/api/lesson-plans/review-history";

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Không thể tải lịch sử review");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewDetail = async (lessonPlanId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/lesson-plans/${lessonPlanId}/review-data`);
      const data = await res.json();

      if (data.success) {
        // Find the lessonPlanTitle from history
        const historyItem = history.find(h => h.lessonPlanId === lessonPlanId);
        setSelectedReview({
          id: data.data.id,
          lessonPlanId: data.data.lessonPlanId,
          lessonPlanTitle: historyItem?.lessonPlanTitle || "",
          overallScore: data.data.overallScore,
          totalIssues: data.data.totalIssues,
          criticalIssues: data.data.criticalIssues,
          errorIssues: data.data.errorIssues,
          warningIssues: data.data.warningIssues,
          infoIssues: data.data.infoIssues,
          status: data.data.status,
          reviewedBy: data.data.reviewedBy,
          reviewedAt: data.data.reviewedAt,
          teachingMethodAnalysis: data.data.teachingMethodAnalysis,
          annotations: data.data.annotations.map((a: any) => ({
            id: a.id,
            severity: a.severity,
            message: a.message,
            suggestion: a.suggestion,
            status: a.status,
            sectionTitle: a.sectionTitle,
          })),
        });
      }
    } catch (error) {
      console.error("Error fetching review detail:", error);
      toast.error("Không thể tải chi tiết review");
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !item.lessonPlanTitle?.toLowerCase().includes(query) &&
        !item.circularCode?.toLowerCase().includes(query) &&
        !item.templateCode?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortBy === "newest" ? dateB - dateA : dateA - dateB;
  });

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-zinc-400";
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500";
      case "ERROR":
        return "bg-orange-500";
      case "WARNING":
        return "bg-yellow-500";
      case "INFO":
        return "bg-blue-500";
      default:
        return "bg-zinc-500";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/lesson-plans">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-[var(--foreground)]">
                Lịch sử Review
              </h1>
              <p className="text-sm text-[var(--muted)]">
                Xem lại các lần review giáo án đã thực hiện
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4 flex gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <Input
                placeholder="Tìm kiếm theo tên, văn bản, mẫu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="oldest">Cũ nhất</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-[var(--primary)] border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-[var(--muted)]">Đang tải...</p>
          </div>
        ) : sortedHistory.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 mx-auto text-[var(--muted)]" />
            <h3 className="mt-4 text-lg font-medium text-[var(--foreground)]">
              Chưa có lịch sử review
            </h3>
            <p className="mt-2 text-[var(--muted)]">
              Các lần review sẽ hiển thị tại đây sau khi bạn thực hiện review giáo án
            </p>
            <Link href="/lesson-plans">
              <Button className="mt-4">Danh sách giáo án</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedHistory.map((item) => (
              <div
                key={item.id}
                className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--primary)] transition-colors cursor-pointer"
                onClick={() => fetchReviewDetail(item.lessonPlanId)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--primary)]" />
                      <h3 className="font-medium text-[var(--foreground)] truncate">
                        {item.lessonPlanTitle || "Giáo án không xác định"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[var(--muted)]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.performer?.name || item.performer?.email || "Unknown"}
                      </div>
                      {item.aiModel && (
                        <div className="flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          {item.aiModel}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                        {item.score !== null ? Math.round(item.score) : "-"}
                      </div>
                      <div className="text-xs text-[var(--muted)]">Điểm</div>
                    </div>

                    {item.teachingMethodScore !== null && (
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(item.teachingMethodScore)}`}>
                          {Math.round(item.teachingMethodScore)}
                        </div>
                        <div className="text-xs text-[var(--muted)]">PPGD</div>
                      </div>
                    )}

                    <div className="text-center">
                      <div className="text-2xl font-bold text-[var(--foreground)]">
                        {item.issues}
                      </div>
                      <div className="text-xs text-[var(--muted)]">Vấn đề</div>
                    </div>

                    <div className="text-right text-xs text-[var(--muted)]">
                      {item.circularCode && (
                        <div>
                          <span className="font-medium">{item.circularCode}</span>
                          {item.circularVersion && ` v${item.circularVersion}`}
                        </div>
                      )}
                      {item.templateCode && (
                        <div>
                          <span className="font-medium">{item.templateCode}</span>
                          {item.templateVersion && ` v${item.templateVersion}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Chi tiết Review</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-[var(--primary)] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : selectedReview ? (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6">
                <div className="bg-[var(--kraft)] rounded-lg p-4">
                  <h3 className="font-semibold text-lg">
                    {selectedReview.lessonPlanTitle}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[var(--muted)]">
                    <span>
                      Ngày review:{" "}
                      {selectedReview.reviewedAt
                        ? new Date(selectedReview.reviewedAt).toLocaleDateString("vi-VN")
                        : "N/A"}
                    </span>
                    <span>Trạng thái: {selectedReview.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(selectedReview.overallScore)}`}>
                      {selectedReview.overallScore !== null
                        ? Math.round(selectedReview.overallScore)
                        : "-"}
                    </div>
                    <div className="text-sm text-[var(--muted)]">Điểm tổng</div>
                  </div>
                  <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 text-center">
                    <div className="text-3xl font-bold text-red-500">
                      {selectedReview.criticalIssues}
                    </div>
                    <div className="text-sm text-[var(--muted)]">Critical</div>
                  </div>
                  <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 text-center">
                    <div className="text-3xl font-bold text-orange-500">
                      {selectedReview.errorIssues}
                    </div>
                    <div className="text-sm text-[var(--muted)]">Error</div>
                  </div>
                  <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-500">
                      {selectedReview.warningIssues}
                    </div>
                    <div className="text-sm text-[var(--muted)]">Warning</div>
                  </div>
                  <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4 text-center">
                    <div className="text-3xl font-bold text-blue-500">
                      {selectedReview.infoIssues}
                    </div>
                    <div className="text-sm text-[var(--muted)]">Info</div>
                  </div>
                </div>

                {/* Teaching Method Analysis in History Detail */}
                {selectedReview.teachingMethodAnalysis && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      Phân tích phương pháp giảng dạy
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-purple-600 dark:text-purple-400">Phương pháp hiện tại:</span>
                        <p className="font-medium">{selectedReview.teachingMethodAnalysis.currentMethod.name}</p>
                      </div>
                      <div>
                        <span className="text-purple-600 dark:text-purple-400">Điểm sư phạm:</span>
                        <p className={`font-bold ${
                          selectedReview.teachingMethodAnalysis.pedagogyScore >= 80 ? "text-green-500" :
                          selectedReview.teachingMethodAnalysis.pedagogyScore >= 60 ? "text-yellow-500" : "text-red-500"
                        }`}>
                          {selectedReview.teachingMethodAnalysis.pedagogyScore.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    {selectedReview.teachingMethodAnalysis.recommendedMethods.length > 0 && (
                      <div className="mt-3">
                        <span className="text-purple-600 dark:text-purple-400 text-sm">Phương pháp đề xuất:</span>
                        <ul className="mt-1 space-y-1">
                          {selectedReview.teachingMethodAnalysis.recommendedMethods.slice(0, 3).map((m, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <Sparkles className="w-3 h-3 text-green-500 flex-shrink-0" />
                              <span>{m.name}</span>
                              <span className="text-purple-400">({m.suitabilityScore.toFixed(0)}%)</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedReview.teachingMethodAnalysis.overallRecommendation && (
                      <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                        <span className="text-purple-600 dark:text-purple-400 text-sm">Khuyến nghị:</span>
                        <p className="text-sm mt-1">{selectedReview.teachingMethodAnalysis.overallRecommendation}</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-3">Nhận xét và đề xuất</h4>
                  {selectedReview.annotations.length === 0 ? (
                    <p className="text-[var(--muted)]">Không có nhận xét nào</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedReview.annotations.map((ann) => (
                        <div
                          key={ann.id}
                          className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(ann.severity)}`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    ann.severity === "CRITICAL"
                                      ? "bg-red-100 text-red-700"
                                      : ann.severity === "ERROR"
                                      ? "bg-orange-100 text-orange-700"
                                      : ann.severity === "WARNING"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {ann.severity}
                                </span>
                                {ann.sectionTitle && (
                                  <span className="text-xs text-[var(--muted)]">
                                    {ann.sectionTitle}
                                  </span>
                                )}
                                {ann.status === "ACCEPTED" && (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                                {ann.status === "REJECTED" && (
                                  <X className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                              <p className="mt-2 text-sm">{ann.message}</p>
                              {ann.suggestion && (
                                <div className="mt-2 p-2 bg-[var(--primary-soft)] rounded text-sm">
                                  <span className="font-medium text-[var(--primary)]">Đề xuất: </span>
                                  {ann.suggestion}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReviewHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    }>
      <ReviewHistoryContent />
    </Suspense>
  );
}
