"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useDebounce } from "use-debounce";
import Button from "@/components/ui/button";
import {
  HelpCircle,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  Search,
  X,
  Download,
  Upload,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";

interface Choice {
  id?: string;
  content: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  content: string;
  explanation: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  categoryId: string;
  category: { name: string };
  choices: Choice[];
}

const difficultyConfig = {
  EASY: { label: "Dễ", color: "emerald", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  MEDIUM: { label: "Trung bình", color: "amber", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  HARD: { label: "Khó", color: "red", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [categoryId, setCategoryId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState("20");
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteCategoryId, setBulkDeleteCategoryId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [formContent, setFormContent] = useState("");
  const [formExplanation, setFormExplanation] = useState("");
  const [formDifficulty, setFormDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formChoices, setFormChoices] = useState<Choice[]>([
    { content: "", isCorrect: true },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
  ]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit,
      });
      if (debouncedSearch.trim()) params.append("search", debouncedSearch);
      if (categoryId) params.append("categoryId", categoryId);
      if (difficulty) params.append("difficulty", difficulty);

      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setQuestions(data.data.items);
        setTotalPages(data.data.meta.totalPages);
        setTotalCount(data.data.meta.total);
      } else {
        setError(data.message || "Không thể tải danh sách câu hỏi");
      }
    } catch {
      setError("Lỗi kết nối đến máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories?flat=true");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
        if (data.data.length > 0 && !formCategoryId) {
          setFormCategoryId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [page, limit, categoryId, difficulty, debouncedSearch]);

  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.append("search", debouncedSearch);
    if (categoryId) params.append("categoryId", categoryId);
    if (difficulty) params.append("difficulty", difficulty);
    window.open(`/api/admin/questions/export?${params.toString()}`);
  };

  const openAddModal = () => {
    setEditingQuestion(null);
    setFormContent("");
    setFormExplanation("");
    setFormDifficulty("MEDIUM");
    setFormCategoryId(categories[0]?.id || "");
    setFormChoices([
      { content: "", isCorrect: true },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
      { content: "", isCorrect: false },
    ]);
    setShowForm(true);
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    setFormContent(q.content.replace(/<br\s*\/?>/gi, "\n"));
    setFormExplanation(q.explanation?.replace(/<br\s*\/?>/gi, "\n") || "");
    setFormDifficulty(q.difficulty);
    setFormCategoryId(q.categoryId);
    setFormChoices(q.choices.map((c) => ({ content: c.content, isCorrect: c.isCorrect })));
    setShowForm(true);
  };

  const handleChoiceChange = (idx: number, content: string) => {
    const updated = [...formChoices];
    updated[idx].content = content;
    setFormChoices(updated);
  };

  const handleSetCorrect = (idx: number) => {
    const updated = formChoices.map((c, i) => ({ ...c, isCorrect: i === idx }));
    setFormChoices(updated);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formContent.trim()) {
      setError("Vui lòng nhập nội dung câu hỏi");
      return;
    }
    if (!formCategoryId) {
      setError("Vui lòng chọn chuyên mục");
      return;
    }
    if (formChoices.some((c) => !c.content.trim())) {
      setError("Vui lòng điền nội dung cho tất cả 4 phương án");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        content: formContent.trim().replace(/\n/g, "<br/>"),
        explanation: formExplanation.trim() ? formExplanation.trim().replace(/\n/g, "<br/>") : null,
        difficulty: formDifficulty,
        categoryId: formCategoryId,
        choices: formChoices.map((c) => ({
          content: c.content.trim(),
          isCorrect: c.isCorrect,
        })),
      };

      const url = editingQuestion ? `/api/admin/questions/${editingQuestion.id}` : "/api/admin/questions";
      const method = editingQuestion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(editingQuestion ? "Đã cập nhật câu hỏi" : "Đã tạo câu hỏi mới");
        setShowForm(false);
        fetchQuestions();
      } else {
        setError(data.message || "Có lỗi xảy ra");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa câu hỏi này?")) return;

    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage("Đã xóa câu hỏi");
        fetchQuestions();
      } else {
        setError(data.message || "Lỗi xóa câu hỏi");
      }
    } catch {
      setError("Không thể gửi yêu cầu xóa");
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteCategoryId) {
      setError("Vui lòng chọn chuyên mục cần xóa");
      return;
    }

    const categoryName = categories.find((c) => c.id === bulkDeleteCategoryId)?.name || "";
    if (!confirm(`Bạn sẽ xóa TẤT CẢ câu hỏi trong "${categoryName}". Hành động này KHÔNG THỂ HOÀN TÁC.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/questions/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: bulkDeleteCategoryId }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`Đã xóa ${data.data.deletedCount} câu hỏi`);
        setShowBulkDeleteModal(false);
        fetchQuestions();
      } else {
        setError(data.message || "Có lỗi xảy ra");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setActionLoading(false);
    }
  };

  const activeFilters = [categoryId, difficulty].filter(Boolean).length;

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
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Ngân Hàng Câu Hỏi
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {totalCount} câu hỏi
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

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={openAddModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Thêm câu hỏi</span>
        </Button>
        <Link href="/admin/questions/import">
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
        </Link>
        <Button variant="outline" onClick={handleExportExcel} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Xuất Excel</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowBulkDeleteModal(true)}
          className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Xóa theo chuyên mục</span>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Tìm kiếm câu hỏi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden relative"
        >
          <Filter className="w-4 h-4" />
          Bộ lọc
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {activeFilters}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${showFilters || activeFilters > 0 ? 'block' : 'hidden sm:grid'} p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900`}>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Chuyên mục</label>
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Tất cả</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Độ khó</label>
          <select
            value={difficulty}
            onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Tất cả</option>
            <option value="EASY">Dễ</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HARD">Khó</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Hiển thị</label>
          <select
            value={limit}
            onChange={(e) => { setLimit(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="10">10 / trang</option>
            <option value="20">20 / trang</option>
            <option value="50">50 / trang</option>
            <option value="100">100 / trang</option>
          </select>
        </div>
        {activeFilters > 0 && (
          <div className="col-span-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCategoryId(""); setDifficulty(""); setPage(1); }}
              className="text-zinc-500"
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </div>

      {/* Questions Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
            <HelpCircle className="h-8 w-8 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {search ? "Không tìm thấy câu hỏi" : "Chưa có câu hỏi nào"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((q) => {
            const diffConfig = difficultyConfig[q.difficulty];
            return (
              <div
                key={q.id}
                className="group rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${diffConfig.bg} ${diffConfig.text}`}>
                    {q.difficulty === "EASY" && <CheckCircle className="w-3 h-3" />}
                    {q.difficulty === "HARD" && <AlertTriangle className="w-3 h-3" />}
                    {diffConfig.label}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {q.category?.name}
                  </span>
                </div>

                {/* Question Content */}
                <div
                  className="text-sm text-zinc-900 dark:text-zinc-100 mb-4 line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: q.content }}
                />

                {/* Choices Preview */}
                <div className="space-y-1.5 mb-4">
                  {q.choices.slice(0, 2).map((c, idx) => (
                    <div key={idx} className={`flex items-start gap-2 text-xs ${c.isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
                      <span className="line-clamp-1">{c.content}</span>
                      {c.isCorrect && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
                    </div>
                  ))}
                  {q.choices.length > 2 && (
                    <div className="text-xs text-zinc-400 pl-5">+{q.choices.length - 2} phương án khác</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(q)}
                    className="flex-1 min-w-[80px]"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Sửa</span>
                    <span className="sm:hidden">✏️</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(q.id)}
                    className="min-w-[44px] flex-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Trang {page}/{totalPages} • {totalCount} câu hỏi
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((v) => Math.max(v - 1, 1))}
            >
              ← Trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((v) => Math.min(v + 1, totalPages))}
            >
              Sau →
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-6 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {editingQuestion ? "Sửa Câu Hỏi" : "Tạo Câu Hỏi Mới"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nội dung câu hỏi</label>
                <textarea
                  required
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Nhập câu hỏi trắc nghiệm..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Phương án trả lời</label>
                <div className="space-y-2">
                  {formChoices.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetCorrect(idx)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          c.isCorrect
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-zinc-300 hover:border-zinc-400"
                        }`}
                      >
                        {c.isCorrect && <CheckCircle className="w-3 h-3" />}
                      </button>
                      <input
                        type="text"
                        required
                        value={c.content}
                        onChange={(e) => handleChoiceChange(idx, e.target.value)}
                        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                        placeholder={`Phương án ${String.fromCharCode(65 + idx)}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2">Nhấn vào nút tròn để chọn đáp án đúng</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Chuyên mục</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Độ khó</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="EASY">Dễ</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HARD">Khó</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Giải thích (tùy chọn)</label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Giải thích đáp án..."
                />
              </div>

              <Button type="submit" disabled={actionLoading} isLoading={actionLoading} className="w-full">
                {editingQuestion ? "Lưu thay đổi" : "Tạo câu hỏi"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 hidden lg:flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {editingQuestion ? "Sửa Câu Hỏi" : "Tạo Câu Hỏi Mới"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nội dung câu hỏi</label>
                <textarea
                  required
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Nhập câu hỏi trắc nghiệm..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Phương án trả lời</label>
                <div className="space-y-2">
                  {formChoices.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSetCorrect(idx)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          c.isCorrect
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-zinc-300 hover:border-zinc-400"
                        }`}
                      >
                        {c.isCorrect && <CheckCircle className="w-4 h-4" />}
                      </button>
                      <span className="font-mono font-bold text-sm text-zinc-500 w-4">{String.fromCharCode(65 + idx)}.</span>
                      <input
                        type="text"
                        required
                        value={c.content}
                        onChange={(e) => handleChoiceChange(idx, e.target.value)}
                        className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                        placeholder={`Phương án ${String.fromCharCode(65 + idx)}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2">Nhấn vào nút tròn để chọn đáp án đúng</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Chuyên mục</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Độ khó</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="EASY">Dễ</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HARD">Khó</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Giải thích (tùy chọn)</label>
                <textarea
                  rows={3}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Giải thích đáp án đúng..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)} className="flex-1">
                  Hủy
                </Button>
                <Button type="submit" disabled={actionLoading} isLoading={actionLoading} className="flex-1">
                  {editingQuestion ? "Lưu thay đổi" : "Tạo câu hỏi"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Xóa Câu Hỏi Theo Chuyên Mục
              </h2>
              <button onClick={() => setShowBulkDeleteModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 mb-4">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Hành động này sẽ xóa <strong>TẤT CẢ câu hỏi</strong> trong chuyên mục đã chọn và <strong>KHÔNG THỂ HOÀN TÁC</strong>.</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Chọn chuyên mục</label>
              <select
                value={bulkDeleteCategoryId}
                onChange={(e) => setBulkDeleteCategoryId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">-- Chọn chuyên mục --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowBulkDeleteModal(false)} className="flex-1">
                Hủy
              </Button>
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                disabled={actionLoading || !bulkDeleteCategoryId}
                isLoading={actionLoading}
                className="flex-1"
              >
                Xóa toàn bộ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
