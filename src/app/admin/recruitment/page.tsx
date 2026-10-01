"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import {
  Briefcase,
  Plus,
  Inbox,
  ArrowLeft,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  Upload,
  Download,
  Building2,
  BookOpen,
  Target,
  Search,
  X,
  CheckCircle,
  XCircle,
  Users,
  ChevronDown
} from "lucide-react";

interface Recruitment {
  id: string;
  title: string;
  field: string | null;
  recruitmentType: string | null;
  status: string;
  recruitmentYear: number | null;
  province: string;
  district: string | null;
  ward: string | null;
  organization: string;
  applicationAddress: string | null;
  totalQuota: number;
  quotaDetails: any;
  round1Format: string | null;
  round2Format: string | null;
  applicationStartDate: string | null;
  applicationEndDate: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Đang tuyển", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  { value: "UPCOMING", label: "Sắp mở", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  { value: "CLOSED", label: "Đã đóng", bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-500" },
];

const FIELD_OPTIONS = ["Giáo dục", "Y tế", "Văn hóa", "Khoa học", "Kỹ thuật", "Hành chính", "Tài chính", "Xây dựng", "Nông nghiệp", "Giao thông"];
const TYPE_OPTIONS = ["Viên chức", "Công chức", "Hợp đồng", "Lao động phổ thông"];
const FORMAT_OPTIONS = ["Trắc nghiệm", "Tự luận", "Trắc nghiệm + Tự luận", "Phỏng vấn", "Thực hành", "Nghiên cứu hồ sơ"];

const emptyForm = {
  title: "",
  field: "",
  recruitmentType: "",
  status: "OPEN",
  recruitmentYear: new Date().getFullYear(),
  province: "",
  district: "",
  ward: "",
  organization: "",
  applicationAddress: "",
  totalQuota: 1,
  quotaDetails: "",
  round1Format: "",
  round2Format: "",
  applicationStartDate: "",
  applicationEndDate: "",
  notes: "",
};

export default function AdminRecruitmentPage() {
  const [posts, setPosts] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/admin/recruitment");
      const data = await res.json();
      if (data.success) setPosts(data.data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.title || formData.title.trim().length < 5) errors.title = "Tiêu đề phải có ít nhất 5 ký tự";
    if (!formData.province?.trim()) errors.province = "Tỉnh/Thành phố không được để trống";
    if (!formData.organization?.trim()) errors.organization = "Đơn vị tuyển dụng không được để trống";
    if (!formData.totalQuota || parseInt(formData.totalQuota.toString()) < 1) errors.totalQuota = "Tổng chỉ tiêu phải lớn hơn 0";
    if (formData.applicationStartDate && formData.applicationEndDate && new Date(formData.applicationStartDate) > new Date(formData.applicationEndDate)) {
      errors.applicationEndDate = "Ngày kết thúc phải sau ngày bắt đầu";
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    setError(null);
    setMessage(null);
    if (Object.keys(errors).length > 0) {
      setError("Vui lòng kiểm tra lại thông tin");
      return;
    }

    const prepareData = () => ({
      title: formData.title.trim(),
      field: formData.field?.trim() || null,
      recruitmentType: formData.recruitmentType?.trim() || null,
      status: formData.status,
      recruitmentYear: formData.recruitmentYear ? parseInt(formData.recruitmentYear.toString()) : null,
      province: formData.province.trim(),
      district: formData.district?.trim() || null,
      ward: formData.ward?.trim() || null,
      organization: formData.organization.trim(),
      applicationAddress: formData.applicationAddress?.trim() || null,
      totalQuota: parseInt(formData.totalQuota.toString()) || 1,
      quotaDetails: formData.quotaDetails?.trim() || null,
      round1Format: formData.round1Format?.trim() || null,
      round2Format: formData.round2Format?.trim() || null,
      applicationStartDate: formData.applicationStartDate || null,
      applicationEndDate: formData.applicationEndDate || null,
      notes: formData.notes?.trim() || null,
    });

    try {
      const url = editingId ? `/api/admin/recruitment/${editingId}` : "/api/admin/recruitment";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepareData()),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(editingId ? "Cập nhật thành công" : "Tạo tin mới thành công");
        setShowForm(false);
        setEditingId(null);
        setFormData(emptyForm);
        setFormErrors({});
        fetchPosts();
      } else {
        setError(data.message || "Dữ liệu không hợp lệ");
      }
    } catch {
      setError("Lỗi kết nối");
    }
  };

  const handleEdit = (post: Recruitment) => {
    setFormData({
      title: post.title,
      field: post.field || "",
      recruitmentType: post.recruitmentType || "",
      status: post.status,
      recruitmentYear: post.recruitmentYear || new Date().getFullYear(),
      province: post.province,
      district: post.district || "",
      ward: post.ward || "",
      organization: post.organization,
      applicationAddress: post.applicationAddress || "",
      totalQuota: post.totalQuota,
      quotaDetails: post.quotaDetails ? (typeof post.quotaDetails === "string" ? post.quotaDetails : JSON.stringify(post.quotaDetails, null, 2)) : "",
      round1Format: post.round1Format || "",
      round2Format: post.round2Format || "",
      applicationStartDate: post.applicationStartDate ? post.applicationStartDate.split("T")[0] : "",
      applicationEndDate: post.applicationEndDate ? post.applicationEndDate.split("T")[0] : "",
      notes: post.notes || "",
    });
    setEditingId(post.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa tin tuyển dụng này?")) return;
    try {
      const res = await fetch(`/api/admin/recruitment/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage("Đã xóa tin tuyển dụng");
        fetchPosts();
      }
    } catch {
      setError("Lỗi kết nối");
    }
  };

  const toggleActive = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const res = await fetch(`/api/admin/recruitment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(newStatus === "OPEN" ? "Đã mở tin tuyển dụng" : "Đã đóng tin tuyển dụng");
        fetchPosts();
      }
    } catch {
      setError("Lỗi kết nối");
    }
  };

  const handleDownloadTemplate = () => {
    window.open("/api/admin/recruitment/template", "_blank");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      const res = await fetch("/api/admin/recruitment/import", { method: "POST", body: formDataUpload });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || "Import thành công");
        fetchPosts();
      } else {
        setError(data.message || "Import thất bại");
      }
    } catch {
      setError("Lỗi khi import file");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.province.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const FieldError = ({ field }: { field: string }) =>
    formErrors[field] ? <p className="text-xs text-red-500 mt-1">{formErrors[field]}</p> : null;

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
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Quản Lý Tuyển Dụng
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {posts.length} tin tuyển dụng
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tổng quan
          </Link>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Mẫu</span>
          </Button>
          <label htmlFor="excel-import" className="cursor-pointer">
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{importing ? "..." : "Import"}</span>
            </div>
          </label>
          <input id="excel-import" type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" disabled={importing} />
          <Button onClick={() => { setShowForm(true); setEditingId(null); setFormData(emptyForm); setFormErrors({}); }} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Tạo mới
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm tin tuyển dụng..."
          className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
            <Inbox className="h-8 w-8 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {searchTerm ? "Không tìm thấy kết quả" : "Chưa có tin tuyển dụng nào"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const statusConfig = STATUS_OPTIONS.find(s => s.value === post.status) || STATUS_OPTIONS[2];
            return (
              <div key={post.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                      {post.field && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          <BookOpen className="w-3 h-3" />
                          {post.field}
                        </span>
                      )}
                      {post.recruitmentType && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                          <Target className="w-3 h-3" />
                          {post.recruitmentType}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {post.title}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex-shrink-0">
                    <Users className="w-3 h-3" />
                    {post.totalQuota}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{post.organization}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{post.province}{post.district && `, ${post.district}`}{post.ward && `, ${post.ward}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-500 text-xs">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {post.applicationStartDate ? new Date(post.applicationStartDate).toLocaleDateString("vi-VN") : "..."} — {new Date(post.applicationEndDate).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(post.id, post.status)} className="flex-1 min-w-[80px]">
                    {post.status === "OPEN" ? <XCircle className="w-4 h-4 mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                    <span className="hidden sm:inline">{post.status === "OPEN" ? "Đóng" : "Mở"}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(post)} className="flex-1 min-w-[80px]">
                    <Pencil className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Sửa</span>
                    <span className="sm:hidden">✏️</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(post.id)} className="flex-1 min-w-[80px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Xóa</span>
                    <span className="sm:hidden">🗑️</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowForm(false); setEditingId(null); setFormData(emptyForm); }} />
          <div className="absolute inset-x-0 bottom-0 max-h-[95vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-zinc-900">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {editingId ? "Chỉnh Sửa Tin" : "Tạo Tin Mới"}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-5">
              {Object.keys(formErrors).length > 0 && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Vui lòng kiểm tra lại:</p>
                  <ul className="text-xs text-red-500 space-y-0.5">
                    {Object.values(formErrors).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="VD: Tuyển dụng viên chức ngành Giáo dục năm 2026"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <FieldError field="title" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Lĩnh vực</label>
                  <select
                    value={formData.field}
                    onChange={(e) => updateField("field", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="">-- Chọn --</option>
                    {FIELD_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Loại</label>
                  <select
                    value={formData.recruitmentType}
                    onChange={(e) => updateField("recruitmentType", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="">-- Chọn --</option>
                    {TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Năm</label>
                  <input
                    type="number"
                    value={formData.recruitmentYear}
                    onChange={(e) => updateField("recruitmentYear", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Tỉnh/TP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.province}
                  onChange={(e) => updateField("province", e.target.value)}
                  placeholder="Hà Nội"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <FieldError field="province" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Quận/Huyện</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => updateField("district", e.target.value)}
                    placeholder="Cầu Giấy"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Phường/Xã</label>
                  <input
                    type="text"
                    value={formData.ward}
                    onChange={(e) => updateField("ward", e.target.value)}
                    placeholder="Dịch Vọng"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Đơn vị <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.organization}
                  onChange={(e) => updateField("organization", e.target.value)}
                  placeholder="Sở Giáo dục và Đào tạo"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <FieldError field="organization" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Chỉ tiêu <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.totalQuota}
                  onChange={(e) => updateField("totalQuota", e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <FieldError field="totalQuota" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Hình thức V1</label>
                  <select
                    value={formData.round1Format}
                    onChange={(e) => updateField("round1Format", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="">-- Chọn --</option>
                    {FORMAT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Hình thức V2</label>
                  <select
                    value={formData.round2Format}
                    onChange={(e) => updateField("round2Format", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="">-- Chọn --</option>
                    {FORMAT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formData.applicationStartDate}
                    onChange={(e) => updateField("applicationStartDate", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={formData.applicationEndDate}
                    onChange={(e) => updateField("applicationEndDate", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <FieldError field="applicationEndDate" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={2}
                  placeholder="Thông tin bổ sung..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-zinc-900 pb-2">
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1">
                  Hủy
                </Button>
                <Button type="submit" className="flex-1">
                  {editingId ? "Cập nhật" : "Tạo tin"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Form */}
      <div className="hidden lg:block rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          {editingId ? <><Pencil className="w-5 h-5 text-blue-600" /> Chỉnh Sửa Tin Tuyển Dụng</> : <><Plus className="w-5 h-5 text-blue-600" /> Tạo Tin Tuyển Dụng Mới</>}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Thông Tin Cơ Bản</h3>
            <div className="grid gap-4 grid-cols-2">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Tiêu đề <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.title} onChange={(e) => updateField("title", e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800" />
                <FieldError field="title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Lĩnh vực</label>
                <select value={formData.field} onChange={(e) => updateField("field", e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800">
                  <option value="">-- Chọn --</option>
                  {FIELD_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Loại tuyển dụng</label>
                <select value={formData.recruitmentType} onChange={(e) => updateField("recruitmentType", e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800">
                  <option value="">-- Chọn --</option>
                  {TYPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Năm tuyển dụng</label>
                <input type="number" value={formData.recruitmentYear} onChange={(e) => updateField("recruitmentYear", e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Trạng thái</label>
                <select value={formData.status} onChange={(e) => updateField("status", e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800">
                  {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Địa Điểm</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Tỉnh/TP <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.province} onChange={(e) => updateField("province", e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Quận/Huyện</label>
                <input type="text" value={formData.district} onChange={(e) => updateField("district", e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Phường/Xã</label>
                <input type="text" value={formData.ward} onChange={(e) => updateField("ward", e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Đơn Vị & Chỉ Tiêu</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Đơn vị tuyển dụng <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.organization} onChange={(e) => updateField("organization", e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Tổng chỉ tiêu <span className="text-red-500">*</span></label>
                <input type="number" required min={1} value={formData.totalQuota} onChange={(e) => updateField("totalQuota", e.target.value)} className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              {editingId ? "Cập nhật" : "Tạo tin tuyển dụng"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setFormData(emptyForm); }}>
                Hủy
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
