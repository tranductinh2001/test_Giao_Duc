"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, ArrowLeft, X, Upload, FileText } from "lucide-react";
import Button from "@/components/ui/button";
import Link from "next/link";

export default function NewCircularPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    type: "GUIDELINE",
    content: "",
    issuedDate: "",
    effectiveDate: "",
    applicableLevel: [] as string[],
    applicableSubjects: [] as string[],
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.title) {
      setError("Vui lòng nhập Mã và Tên công văn");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/admin/circulars/${data.data.id}`);
      } else {
        setError(data.message || "Lỗi khi tạo công văn");
      }
    } catch (error) {
      console.error("Error creating circular:", error);
      setError("Lỗi khi tạo công văn");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/circulars"
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Tạo Công Văn Mới
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Thêm công văn mới vào hệ thống
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Mã Công Văn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="CV958, CV432, THCS2024..."
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">
              Viết hoa, không dấu, không khoảng trắng
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tên Công Văn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Công văn số 958/BGDĐT..."
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
          </div>

          {/* Issue Date & Effective Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Ngày ban hành <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.issuedDate}
                onChange={(e) =>
                  setFormData({ ...formData, issuedDate: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Ngày có hiệu lực
              </label>
              <input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) =>
                  setFormData({ ...formData, effectiveDate: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Loại công văn
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="GUIDELINE">Hướng dẫn</option>
              <option value="CIRCULAR">Công văn</option>
              <option value="DECISION">Quyết định</option>
              <option value="CURRICULUM">Chương trình</option>
            </select>
          </div>

          {/* Applicable Level */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Áp dụng cho cấp học
            </label>
            <div className="flex flex-wrap gap-2">
              {['TIEU_HOC', 'THCS', 'THPT', 'GDTX'].map((level) => (
                <label key={level} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.applicableLevel.includes(level)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, applicableLevel: [...formData.applicableLevel, level] });
                      } else {
                        setFormData({ ...formData, applicableLevel: formData.applicableLevel.filter(l => l !== level) });
                      }
                    }}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-sm">
                    {level === 'TIEU_HOC' ? 'Tiểu học' :
                     level === 'THCS' ? 'THCS' :
                     level === 'THPT' ? 'THPT' : 'GDTX'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nội dung công văn <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Nội dung chi tiết của công văn..."
              rows={6}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 resize-none"
              required
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tóm tắt
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Tóm tắt nội dung công văn..."
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Link href="/admin/circulars" className="flex-1">
            <Button variant="secondary" type="button" className="w-full">
              Hủy
            </Button>
          </Link>
          <Button variant="primary" type="submit" isLoading={loading} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            Tạo Công Văn
          </Button>
        </div>
      </form>

      {/* Help */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Hướng dẫn
        </h3>
        <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5 list-disc list-inside">
          <li>Thêm thông tin công văn (số, ngày ban hành, cơ quan)</li>
          <li>Cấu hình bộ tiêu chí đánh giá</li>
          <li>Thiết lập Prompt AI cho phân tích</li>
          <li>Tạo template xuất file</li>
        </ul>
      </div>
    </div>
  );
}
