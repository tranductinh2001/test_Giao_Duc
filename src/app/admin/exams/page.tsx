"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import {
  FileText,
  Plus,
  Inbox,
  ArrowLeft,
  Pencil,
  Trash2,
  Search,
  Filter,
  Clock,
  HelpCircle,
  MoreVertical,
  X
} from "lucide-react";
import EditExamModal from "@/components/admin/EditExamModal";
import { CountingNumber } from "@/components/motion";
import { cn } from "@/lib/utils";

interface CategoryOption {
  id: string;
  name: string;
  questionCount: number;
}

interface ExamListItem {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  _count: { examQuestions: number };
}

export default function AdminExamsPage() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
  const [categoryId, setCategoryId] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamListItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId),
    [categories, categoryId]
  );

  useEffect(() => {
    let ignore = false;

    Promise.all([
      fetch("/api/admin/categories?flat=true").then((res) => res.json()),
      fetch("/api/exams").then((res) => res.json()),
    ])
      .then(([categoryData, examData]) => {
        if (ignore) return;

        if (categoryData.success) {
          setCategories(categoryData.data);
          setCategoryId(categoryData.data[0]?.id || "");
        }

        if (examData.success) {
          setExams(examData.data);
        }
      })
      .catch(() => {
        if (!ignore) setError("Không thể tải dữ liệu đề thi.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const refreshExams = async () => {
    const res = await fetch("/api/exams");
    const data = await res.json();
    if (data.success) setExams(data.data);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!categoryId) {
      setError("Vui lòng chọn danh mục để sinh đề.");
      return;
    }

    if (questionCount < 5) {
      setError("Số câu hỏi tối thiểu là 5 câu.");
      return;
    }

    if (questionCount > 100) {
      setError("Số câu hỏi tối đa là 100 câu.");
      return;
    }

    if (selectedCategory && questionCount > selectedCategory.questionCount) {
      setError(`Danh mục chỉ có ${selectedCategory.questionCount} câu. Vui lòng giảm số câu hoặc chọn danh mục khác.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description.trim() || null,
          timeLimit: timeLimitMinutes * 60,
          matrix: [{ categoryId, count: questionCount }],
          categoryId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Không thể tạo đề thi.");
        return;
      }

      setTitle("");
      setDescription("");
      setQuestionCount(20);
      setMessage("Đã tạo đề thi mới.");
      setShowForm(false);
      await refreshExams();
    } catch {
      setError("Không thể gửi yêu cầu tạo đề thi.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (exam: ExamListItem) => {
    setSelectedExam(exam);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa đề thi này?")) return;

    try {
      const res = await fetch(`/api/admin/exams/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setMessage("Đã xóa đề thi");
        await refreshExams();
      } else {
        setError(data.message || "Không thể xóa");
      }
    } catch {
      setError("Lỗi khi xóa đề thi");
    }
  };

  const filteredExams = exams.filter((exam) =>
    exam.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors lg:hidden"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Quản Lý Đề Thi
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {exams.length} đề thi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tổng quan
          </Link>
          <Button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tạo đề mới</span>
          </Button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-6 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Tạo Đề Mới</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Tiêu Đề
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Đề thi thử số 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Mô Tả
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Mô tả ngắn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Danh Mục
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.questionCount} câu)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Số Câu
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Phút
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={saving}
                isLoading={saving}
                className="w-full"
              >
                Tạo đề thi
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Form */}
      <div className="hidden lg:block rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Tạo Đề Mới</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Tiêu Đề</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="Đề thi thử số 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Mô Tả</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="Mô tả ngắn"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Danh Mục</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.questionCount} câu)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Số Câu</label>
              <input
                type="number"
                min={5}
                max={100}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Phút</label>
              <input
                type="number"
                min={1}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>
          <Button type="submit" disabled={saving} isLoading={saving}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo đề thi
          </Button>
        </form>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Tìm kiếm đề thi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>
      </div>

      {/* Exam List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
            <Inbox className="h-8 w-8 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {searchQuery ? "Không tìm thấy đề thi" : "Chưa có đề thi nào"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="group rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="mb-3">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                  {exam.title}
                </h3>
                {exam.description && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {exam.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {exam._count.examQuestions} câu
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  {Math.round(exam.timeLimit / 60)} phút
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(exam)}
                  className="flex-1 min-w-[80px]"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Sửa</span>
                  <span className="sm:hidden">✏️</span>
                </Button>
                <Link href={`/exam/${exam.id}`} className="flex-1 min-w-[80px]">
                  <Button variant="secondary" size="sm" className="w-full">
                    Xem
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(exam.id)}
                  className="min-w-[44px] flex-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <EditExamModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedExam(null);
        }}
        onSuccess={refreshExams}
        exam={selectedExam}
      />
    </div>
  );
}
