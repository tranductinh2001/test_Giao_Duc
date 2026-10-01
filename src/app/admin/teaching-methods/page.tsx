"use client";

import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/button";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  ListOrdered,
  ThumbsUp,
  ThumbsDown,
  FileText,
  CheckCircle,
  Circle,
  Tag,
  Filter,
  TrendingUp,
} from "lucide-react";

interface TeachingMethod {
  id: string;
  code: string;
  name: string;
  description: string | null;
  objectives: string | null;
  process: string | null;
  advantages: string | null;
  limitations: string | null;
  conditions: string | null;
  examples: string | null;
  keywords: string | null;
  indicators: string | null;
  criteria: string | null;
  improvementSuggestions: string | null;
  isActive: boolean;
  sortOrder: number;
  gradeLevelMethods?: { gradeCode: string }[];
  subjectMethods?: { subjectCode: string }[];
  activityTypeMethods?: { activityType: string }[];
}

interface FormData {
  code: string;
  name: string;
  description: string;
  objectives: string;
  process: string;
  advantages: string;
  limitations: string;
  conditions: string;
  examples: string;
  keywords: string;
  indicators: string;
  criteria: string;
  improvementSuggestions: string;
  gradeLevels: string[];
  subjects: string[];
  activities: string[];
}

const emptyForm: FormData = {
  code: "",
  name: "",
  description: "",
  objectives: "",
  process: "",
  advantages: "",
  limitations: "",
  conditions: "",
  examples: "",
  keywords: "",
  indicators: "",
  criteria: "",
  improvementSuggestions: "",
  gradeLevels: [],
  subjects: [],
  activities: [],
};

// Vietnamese grade levels
const GRADE_LEVELS = [
  { code: "1", name: "Lớp 1" },
  { code: "2", name: "Lớp 2" },
  { code: "3", name: "Lớp 3" },
  { code: "4", name: "Lớp 4" },
  { code: "5", name: "Lớp 5" },
  { code: "6", name: "Lớp 6" },
  { code: "7", name: "Lớp 7" },
  { code: "8", name: "Lớp 8" },
  { code: "9", name: "Lớp 9" },
  { code: "10", name: "Lớp 10" },
  { code: "11", name: "Lớp 11" },
  { code: "12", name: "Lớp 12" },
];

// Common subjects
const SUBJECTS = [
  { code: "TOAN", name: "Toán" },
  { code: "TIENG_VIET", name: "Tiếng Việt" },
  { code: "TIENG_ANH", name: "Tiếng Anh" },
  { code: "KHOA_HOC", name: "Khoa học" },
  { code: "TU_NHIEN", name: "Tự nhiên và Xã hội" },
  { code: "LICH_SU", name: "Lịch sử" },
  { code: "DIA_LY", name: "Địa lý" },
  { code: "GIAI_TICH", name: "Giải tích" },
  { code: "HINH_HOC", name: "Hình học" },
  { code: "HOA_HOC", name: "Hóa học" },
  { code: "SINH_HOC", name: "Sinh học" },
  { code: "VAT_LY", name: "Vật lý" },
  { code: "GDCD", name: "Giáo dục công dân" },
  { code: "NGHE_THUAT", name: "Nghệ thuật" },
  { code: "AM_NHAC", name: "Âm nhạc" },
  { code: "THE_CHAT", name: "Thể chất" },
  { code: "TIN_HOC", name: "Tin học" },
  { code: "CONG_NGHE", name: "Công nghệ" },
];

// Activity types matching lesson plan activities
const ACTIVITY_TYPES = [
  { code: "KHAM_PHA", name: "Khám phá" },
  { code: "LUYEN_TAP", name: "Luyện tập" },
  { code: "UNG_DUNG", name: "Ứng dụng" },
  { code: "MO_RONG", name: "Mở rộng" },
  { code: "KHOI_DONG", name: "Khởi động" },
  { code: "CHUYEN_TIEP", name: "Chuyển tiếp" },
  { code: "DANH_GIA", name: "Đánh giá" },
  { code: "TOM_TAT", name: "Tóm tắt" },
];

export default function TeachingMethodsPage() {
  const [methods, setMethods] = useState<TeachingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teaching-methods?relations=true");
      const data = await res.json();
      if (data.success) {
        setMethods(data.data);
      } else {
        setError(data.message || "Không thể tải dữ liệu");
      }
    } catch {
      setError("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const filteredMethods = methods.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description?.toLowerCase().includes(search.toLowerCase()) ||
      m.keywords?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setError("Mã phương pháp không được để trống");
      return;
    }
    if (!formData.name.trim()) {
      setError("Tên phương pháp không được để trống");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingId
        ? `/api/admin/teaching-methods/${editingId}`
        : "/api/admin/teaching-methods";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(editingId ? "Đã cập nhật phương pháp" : "Đã thêm phương pháp mới");
        setShowForm(false);
        setEditingId(null);
        setFormData(emptyForm);
        loadMethods();
      } else {
        setError(data.message || "Lỗi khi lưu");
      }
    } catch {
      setError("Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (method: TeachingMethod) => {
    setEditingId(method.id);
    setFormData({
      code: method.code || "",
      name: method.name,
      description: method.description || "",
      objectives: method.objectives || "",
      process: method.process || "",
      advantages: method.advantages || "",
      limitations: method.limitations || "",
      conditions: method.conditions || "",
      examples: method.examples || "",
      keywords: method.keywords || "",
      indicators: method.indicators || "",
      criteria: method.criteria || "",
      improvementSuggestions: method.improvementSuggestions || "",
      gradeLevels: method.gradeLevelMethods?.map((g) => g.gradeCode) || [],
      subjects: method.subjectMethods?.map((s) => s.subjectCode) || [],
      activities: method.activityTypeMethods?.map((a) => a.activityType) || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phương pháp này?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/teaching-methods/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setMessage(data.message || "Đã xóa phương pháp");
        loadMethods();
      } else {
        setError(data.message || "Lỗi khi xóa");
      }
    } catch {
      setError("Lỗi khi xóa");
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/admin/teaching-methods/export");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phuong-phap-giang-day-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage("Đã xuất file thành công");
    } catch {
      setError("Lỗi khi xuất file");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    const formDataImport = new FormData();
    formDataImport.append("file", file);

    try {
      const res = await fetch("/api/admin/teaching-methods/import", {
        method: "POST",
        body: formDataImport,
      });
      const data = await res.json();

      if (data.success) {
        setMessage(data.message || "Import thành công");
        loadMethods();
      } else {
        setError(data.message || "Lỗi khi import");
      }
    } catch {
      setError("Lỗi khi import");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleActive = async (method: TeachingMethod) => {
    try {
      await fetch(`/api/admin/teaching-methods/${method.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !method.isActive }),
      });
      loadMethods();
    } catch {
      setError("Lỗi khi cập nhật trạng thái");
    }
  };

  const toggleGradeLevel = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      gradeLevels: prev.gradeLevels.includes(code)
        ? prev.gradeLevels.filter((g) => g !== code)
        : [...prev.gradeLevels, code],
    }));
  };

  const toggleSubject = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(code)
        ? prev.subjects.filter((s) => s !== code)
        : [...prev.subjects, code],
    }));
  };

  const toggleActivity = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      activities: prev.activities.includes(code)
        ? prev.activities.filter((a) => a !== code)
        : [...prev.activities, code],
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Phương pháp giảng dạy
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Quản lý các phương pháp giảng dạy cho AI Review
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingId(null);
                  setFormData(emptyForm);
                  setShowForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Thêm mới
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm kiếm phương pháp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Error/Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
            {message}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Đang tải...</div>
          ) : filteredMethods.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              {search ? "Không tìm thấy phương pháp nào" : "Chưa có phương pháp nào"}
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {filteredMethods.map((method) => (
                <div
                  key={method.id}
                  className={`p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors ${
                    !method.isActive ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === method.id ? null : method.id)
                      }
                      className="mt-1 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-600 rounded"
                    >
                      {expandedId === method.id ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                          {method.name}
                        </h3>
                        <button
                          onClick={() => toggleActive(method)}
                          className={`p-1 rounded ${
                            method.isActive
                              ? "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                              : "text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600"
                          }`}
                          title={method.isActive ? "Đang hoạt động" : "Không hoạt động"}
                        >
                          {method.isActive ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {method.description && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {method.description}
                        </p>
                      )}
                      {/* Tags for grade/subject/activity */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {method.gradeLevelMethods?.slice(0, 3).map((g) => (
                          <span
                            key={g.gradeCode}
                            className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                          >
                            {g.gradeCode}
                          </span>
                        ))}
                        {method.subjectMethods?.slice(0, 2).map((s) => (
                          <span
                            key={s.subjectCode}
                            className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded"
                          >
                            {s.subjectCode}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(method)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(method.id)}
                        disabled={deletingId === method.id}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === method.id && (
                    <div className="mt-4 pl-8 grid gap-4 text-sm">
                      {method.code && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">Mã: </span>
                          <code className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 rounded text-xs font-mono">{method.code}</code>
                        </div>
                      )}

                      {method.description && (
                        <div className="flex gap-2">
                          <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Mô tả: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.description}</span>
                          </div>
                        </div>
                      )}

                      {method.objectives && (
                        <div className="flex gap-2">
                          <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Mục tiêu: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.objectives}</span>
                          </div>
                        </div>
                      )}
                      {method.process && (
                        <div className="flex gap-2">
                          <ListOrdered className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Quy trình: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.process}</span>
                          </div>
                        </div>
                      )}
                      {method.advantages && (
                        <div className="flex gap-2">
                          <ThumbsUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Ưu điểm: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.advantages}</span>
                          </div>
                        </div>
                      )}
                      {method.limitations && (
                        <div className="flex gap-2">
                          <ThumbsDown className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Hạn chế: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.limitations}</span>
                          </div>
                        </div>
                      )}
                      {method.conditions && (
                        <div className="flex gap-2">
                          <Lightbulb className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Điều kiện: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.conditions}</span>
                          </div>
                        </div>
                      )}
                      {method.examples && (
                        <div className="flex gap-2">
                          <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Ví dụ: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.examples}</span>
                          </div>
                        </div>
                      )}
                      {method.keywords && (
                        <div className="flex gap-2">
                          <Tag className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Từ khóa: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.keywords}</span>
                          </div>
                        </div>
                      )}
                      {method.indicators && (
                        <div className="flex gap-2">
                          <Filter className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Dấu hiệu nhận diện: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.indicators}</span>
                          </div>
                        </div>
                      )}
                      {method.criteria && (
                        <div className="flex gap-2">
                          <CheckCircle className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Tiêu chí đánh giá: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.criteria}</span>
                          </div>
                        </div>
                      )}
                      {method.improvementSuggestions && (
                        <div className="flex gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Gợi ý cải thiện: </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{method.improvementSuggestions}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white dark:bg-zinc-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 bg-white dark:bg-zinc-800 z-10">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {editingId ? "Sửa phương pháp" : "Thêm phương pháp mới"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Mã và Tên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Mã phương pháp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: PROBLEM_BASED"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Tên phương pháp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Phương pháp dạy học tích cực"
                  />
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Mô tả tổng quan
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mô tả tổng quan về phương pháp"
                />
              </div>

              {/* Mục tiêu */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Mục tiêu
                </label>
                <textarea
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mục tiêu cần đạt được khi áp dụng phương pháp"
                />
              </div>

              {/* Quy trình */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Quy trình thực hiện
                </label>
                <textarea
                  value={formData.process}
                  onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Các bước thực hiện phương pháp"
                />
              </div>

              {/* Ưu điểm và Hạn chế */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Ưu điểm
                  </label>
                  <textarea
                    value={formData.advantages}
                    onChange={(e) => setFormData({ ...formData, advantages: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Những điểm mạnh của phương pháp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Hạn chế
                  </label>
                  <textarea
                    value={formData.limitations}
                    onChange={(e) => setFormData({ ...formData, limitations: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Những điểm cần lưu ý, hạn chế"
                  />
                </div>
              </div>

              {/* Điều kiện */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Điều kiện áp dụng
                </label>
                <textarea
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Điều kiện cần có để áp dụng phương pháp"
                />
              </div>

              {/* Ví dụ */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Ví dụ minh họa
                </label>
                <textarea
                  value={formData.examples}
                  onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Các ví dụ cụ thể về việc áp dụng phương pháp"
                />
              </div>

              {/* AI Fields Section */}
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                  Trường dữ liệu cho AI Review
                </h3>

                {/* Từ khóa */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Từ khóa nhận diện
                  </label>
                  <textarea
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Từ khóa để AI nhận diện phương pháp này (phân cách bằng dấu phẩy)"
                  />
                </div>

                {/* Dấu hiệu nhận diện */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Dấu hiệu nhận diện
                  </label>
                  <textarea
                    value={formData.indicators}
                    onChange={(e) => setFormData({ ...formData, indicators: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Các dấu hiệu để nhận biết phương pháp đang được sử dụng"
                  />
                </div>

                {/* Tiêu chí đánh giá */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Tiêu chí đánh giá
                  </label>
                  <textarea
                    value={formData.criteria}
                    onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tiêu chí để đánh giá việc áp dụng phương pháp"
                  />
                </div>

                {/* Gợi ý cải thiện */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Gợi ý cải thiện
                  </label>
                  <textarea
                    value={formData.improvementSuggestions}
                    onChange={(e) => setFormData({ ...formData, improvementSuggestions: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Gợi ý để cải thiện việc áp dụng phương pháp"
                  />
                </div>
              </div>

              {/* AI Auto-selection Section */}
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                  Liên kết để AI tự động chọn phương pháp
                </h3>

                {/* Cấp học */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Cấp học áp dụng
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GRADE_LEVELS.map((grade) => (
                      <button
                        key={grade.code}
                        type="button"
                        onClick={() => toggleGradeLevel(grade.code)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          formData.gradeLevels.includes(grade.code)
                            ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-blue-300 dark:hover:border-blue-700"
                        }`}
                      >
                        {grade.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Môn học */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Môn học áp dụng
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map((subject) => (
                      <button
                        key={subject.code}
                        type="button"
                        onClick={() => toggleSubject(subject.code)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          formData.subjects.includes(subject.code)
                            ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-green-300 dark:hover:border-green-700"
                        }`}
                      >
                        {subject.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hoạt động */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Hoạt động phù hợp
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVITY_TYPES.map((activity) => (
                      <button
                        key={activity.code}
                        type="button"
                        onClick={() => toggleActivity(activity.code)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          formData.activities.includes(activity.code)
                            ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-purple-300 dark:hover:border-purple-700"
                        }`}
                      >
                        {activity.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
