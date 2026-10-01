"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileText, Plus, Search, ChevronLeft, ChevronRight, BookOpen, Loader2, Trash2, Check, X } from "lucide-react";
import Button from "@/components/ui/button";
import type { LessonPlanResponse, LessonPlanStatus } from "@/types/lesson-plan";

interface DeleteInfo {
  id: string;
  title: string;
  createdAt: string;
  reviewCount: number;
}

export default function LessonPlansPage() {
  const [lessonPlans, setLessonPlans] = useState<LessonPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    status?: LessonPlanStatus;
    subject?: string;
  }>({});
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<DeleteInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk delete state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteInfo, setBulkDeleteInfo] = useState<{ count: number; totalReviews: number } | null>(null);

  useEffect(() => {
    fetchLessonPlans();
  }, [filter, page]);

  // Fetch lesson plans
  const fetchLessonPlans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });

      if (filter.status) params.append("status", filter.status);
      if (filter.subject) params.append("subject", filter.subject);

      const res = await fetch(`/api/lesson-plans?${params}`);
      const data = await res.json();

      if (data.success) {
        setLessonPlans(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching lesson plans:", error);
    } finally {
      setLoading(false);
    }
  };

  // Selection handlers
  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(lessonPlans.map((p) => p.id)));
    }
    setSelectAll(!selectAll);
  }, [lessonPlans, selectAll]);

  // Single delete
  const handleDeleteClick = async (id: string) => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/delete-info`);
      const data = await res.json();
      if (data.success) {
        setDeleteInfo(data.data);
        setDeleteDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching delete info:", error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteInfo) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/lesson-plans/${deleteInfo.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDeleteDialogOpen(false);
        setDeleteInfo(null);
        fetchLessonPlans();
      }
    } catch (error) {
      console.error("Error deleting lesson plan:", error);
    } finally {
      setDeleting(false);
    }
  };

  // Bulk delete
  const handleBulkDeleteClick = async () => {
    try {
      const res = await fetch("/api/lesson-plans/bulk-delete-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonPlanIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setBulkDeleteInfo({ count: data.data.count, totalReviews: data.data.totalReviews });
        setBulkDeleteDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching bulk delete info:", error);
    }
  };

  const confirmBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/lesson-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", lessonPlanIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setBulkDeleteDialogOpen(false);
        setSelectedIds(new Set());
        setSelectAll(false);
        fetchLessonPlans();
      }
    } catch (error) {
      console.error("Error bulk deleting lesson plans:", error);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: LessonPlanStatus) => {
    const badges: Record<LessonPlanStatus, string> = {
      UPLOADED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
      PARSING: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      PARSED: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      REVIEWING: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      REVIEWED: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      EDITING: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      FAILED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    };

    const labels: Record<LessonPlanStatus, string> = {
      UPLOADED: "Đã tải",
      PARSING: "Đang phân tích",
      PARSED: "Đã phân tích",
      REVIEWING: "Đang review",
      REVIEWED: "Đã review",
      EDITING: "Đang sửa",
      COMPLETED: "Hoàn thành",
      FAILED: "Lỗi",
    };

    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg whitespace-nowrap ${badges[status]}`}>
        {status === "COMPLETED" && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
        {labels[status]}
      </span>
    );
  };

  const statusOptions = [
    { value: undefined, label: "Tất cả" },
    { value: "UPLOADED" as LessonPlanStatus, label: "Đã tải" },
    { value: "PARSING" as LessonPlanStatus, label: "Đang phân tích" },
    { value: "REVIEWING" as LessonPlanStatus, label: "Review" },
    { value: "COMPLETED" as LessonPlanStatus, label: "Hoàn thành" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50">
        <div className="px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Back Button */}
            <Link
              href="/admin"
              className="flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </Link>

            {/* Title */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  Quản Lý Giáo Án
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                  Upload và review với AI
                </p>
              </div>
            </div>

            {/* Upload Button */}
            <Link
              href="/lesson-plans/upload"
              className="flex items-center justify-center gap-1.5 sm:gap-2 font-semibold h-9 sm:h-10 px-3 sm:px-4 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors flex-shrink-0 min-w-[80px] sm:min-w-[auto]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Search & Filters */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Tìm kiếm giáo án..."
                className="w-full h-10 sm:h-11 pl-10 pr-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                value={filter.subject || ""}
                onChange={(e) => setFilter({ ...filter, subject: e.target.value || undefined })}
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {statusOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setFilter({ ...filter, status: opt.value })}
                  className={`flex-shrink-0 min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    filter.status === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Toolbar */}
          {selectedIds.size > 0 && (
            <div className="bg-blue-600 text-white px-4 py-3 rounded-xl flex items-center justify-between gap-3 shadow-lg">
              <span className="text-sm font-medium">
                Đã chọn {selectedIds.size} giáo án
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedIds(new Set());
                    setSelectAll(false);
                  }}
                  className="text-sm px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 transition-colors"
                >
                  Bỏ chọn
                </button>
                <button
                  onClick={handleBulkDeleteClick}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa
                </button>
              </div>
            </div>
          )}

          {/* Results Count */}
          {!loading && lessonPlans.length > 0 && (
            <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 px-1 flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{lessonPlans.length} giáo án</span>
              </label>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          )}

          {/* Empty State */}
          {!loading && lessonPlans.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-4">
                Chưa có giáo án nào
              </p>
              <Link href="/lesson-plans/upload">
                <Button>Upload giáo án đầu tiên</Button>
              </Link>
            </div>
          )}

          {/* Lesson Plans List */}
          {!loading && lessonPlans.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              {lessonPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`group bg-white dark:bg-zinc-900 border rounded-xl p-3 sm:p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all ${
                    selectedIds.has(plan.id) ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(plan.id)}
                        onChange={() => handleSelectOne(plan.id)}
                        className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Content */}
                    <Link href={`/lesson-plans/${plan.id}`} className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 flex-1 min-w-0">
                          {plan.title}
                        </h3>
                        {getStatusBadge(plan.status)}
                      </div>

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {plan.subject && (
                          <span>
                            <span className="font-medium">Môn:</span> {plan.subject}
                          </span>
                        )}
                        {plan.gradeLevel && (
                          <span>
                            <span className="font-medium">Lớp:</span> {plan.gradeLevel}
                          </span>
                        )}
                        <span>
                          {new Date(plan.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>

                      {/* Review Summary */}
                      {plan.reviewSummary && (
                        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2 sm:gap-3 text-xs">
                            <span className="text-zinc-500">Điểm:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                              {plan.reviewSummary.overallScore?.toFixed(1) || "N/A"}
                            </span>
                            {plan.reviewSummary.criticalIssues > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium">
                                {plan.reviewSummary.criticalIssues} Critical
                              </span>
                            )}
                            {plan.reviewSummary.warningIssues > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                {plan.reviewSummary.warningIssues} Warning
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </Link>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteClick(plan.id);
                      }}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                      title="Xóa giáo án"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="h-9"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Trước</span>
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`min-w-[44px] min-h-[44px] px-2 rounded-lg text-xs font-medium transition-colors ${
                      page === i
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="h-9"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Single Delete Confirmation Dialog */}
      {deleteDialogOpen && deleteInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteDialogOpen(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Xóa giáo án
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Hành động này không thể hoàn tác
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Tên giáo án:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 text-right max-w-[200px] truncate">
                  {deleteInfo.title}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Ngày tạo:</span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {new Date(deleteInfo.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Số lần review:</span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {deleteInfo.reviewCount}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {bulkDeleteDialogOpen && bulkDeleteInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !deleting && setBulkDeleteDialogOpen(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Xóa {bulkDeleteInfo.count} giáo án
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Hành động này không thể hoàn tác
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Số giáo án:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {bulkDeleteInfo.count}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Tổng số review:</span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {bulkDeleteInfo.totalReviews}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setBulkDeleteDialogOpen(false)}
                disabled={deleting}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={confirmBulkDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa ({bulkDeleteInfo.count})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
