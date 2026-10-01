"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import {
  Users,
  Search,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  X,
  UserCheck,
  Shield,
  Mail,
  Calendar,
  MoreVertical
} from "lucide-react";

type UserStatus = "ACTIVE" | "LOCKED" | "INACTIVE";
type UserRole = "ADMIN" | "TEACHER" | "LEARNER";

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  licenseExpiresAt: string | null;
  createdAt: string;
  _count: {
    examAttempts: number;
    bookmarks: number;
    wrongAnswers: number;
  };
}

interface UsersResponse {
  items: AdminUserRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const statusConfig: Record<UserStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: "Hoạt động",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: <UserCheck className="w-3.5 h-3.5" />
  },
  LOCKED: {
    label: "Bị khóa",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    icon: <Lock className="w-3.5 h-3.5" />
  },
  INACTIVE: {
    label: "Không kích hoạt",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    icon: <Mail className="w-3.5 h-3.5" />
  },
};

const roleConfig: Record<UserRole, { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Quản trị", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
  TEACHER: { label: "Giáo viên", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  LEARNER: { label: "Học viên", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [meta, setMeta] = useState<UsersResponse["meta"]>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "LEARNER" as UserRole,
    status: "ACTIVE" as UserStatus,
    licenseExpiresAt: "",
  });

  const loadUsers = async (pageValue = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageValue),
        limit: String(meta.limit || 10),
      });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (role) params.set("role", role);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Không thể tải danh sách người dùng");
        return;
      }

      const payload = data.data as UsersResponse;
      setUsers(payload.items);
      setMeta(payload.meta);
    } catch {
      setError("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    await loadUsers(1);
  };

  const handleStatusChange = async (userId: string, nextStatus: UserStatus) => {
    setSavingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(nextStatus === "LOCKED" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
        await loadUsers();
      } else {
        setError(data.message || "Không thể thay đổi trạng thái");
      }
    } catch {
      setError("Lỗi khi thay đổi trạng thái");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;

    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage("Đã xóa người dùng");
        await loadUsers();
      } else {
        setError(data.message || "Không thể xóa người dùng");
      }
    } catch {
      setError("Lỗi khi xóa người dùng");
    } finally {
      setSavingId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingId(editingUser?.id || "new");

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        licenseExpiresAt: formData.licenseExpiresAt || null,
        ...(editingUser ? {} : { password: formData.password }),
      };

      const res = editingUser
        ? await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingUser.id, ...payload }),
          })
        : await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (data.success) {
        setMessage(editingUser ? "Đã cập nhật người dùng" : "Đã tạo người dùng mới");
        setShowForm(false);
        setEditingUser(null);
        resetForm();
        await loadUsers();
      } else {
        setError(data.message || "Không thể lưu người dùng");
      }
    } catch {
      setError("Lỗi khi lưu người dùng");
    } finally {
      setSavingId(null);
    }
  };

  const openEditModal = (user: AdminUserRow) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
      licenseExpiresAt: user.licenseExpiresAt?.split("T")[0] || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "LEARNER",
      status: "ACTIVE",
      licenseExpiresAt: "",
    });
  };

  const activeFilters = [status, role].filter(Boolean).length;

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
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Quản Lý Người Dùng
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {meta.total} người dùng
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
          <Button onClick={() => { resetForm(); setEditingUser(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Tạo người dùng</span>
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>
          <Button type="submit" variant="secondary" className="hidden sm:flex">
            Tìm
          </Button>
        </form>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden relative"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Bộ lọc
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-[var(--foreground-inverted)]">
              {activeFilters}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 ${showFilters || activeFilters > 0 ? 'block' : 'hidden sm:grid'} p-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900`}>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Trạng thái</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); loadUsers(1); }}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Tất cả</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="LOCKED">Bị khóa</option>
            <option value="INACTIVE">Không kích hoạt</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Vai trò</label>
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); loadUsers(1); }}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Tất cả</option>
            <option value="LEARNER">Học viên</option>
            <option value="ADMIN">Quản trị</option>
          </select>
        </div>
        {activeFilters > 0 && (
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStatus(""); setRole(""); setPage(1); loadUsers(1); }}
              className="text-zinc-500"
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </div>

      {/* User List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
            <Users className="h-8 w-8 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {search ? "Không tìm thấy người dùng" : "Chưa có người dùng nào"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => {
            const statusInfo = statusConfig[user.status];
            const roleInfo = roleConfig[user.role];
            const canLock = user.status !== "LOCKED";

            return (
              <div
                key={user.id}
                className="group rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                {/* User Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {user.name || "Chưa có tên"}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${roleInfo.bg} ${roleInfo.color}`}>
                    <Shield className="w-3 h-3" />
                    {roleInfo.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {user._count.examAttempts} bài thi
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(user.licenseExpiresAt)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(user)}
                    className="flex-1 min-w-[80px]"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Sửa</span>
                    <span className="sm:hidden">✏️</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(user.id, canLock ? "LOCKED" : "ACTIVE")}
                    disabled={savingId === user.id}
                    className={`min-w-[44px] flex-1 ${canLock ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20" : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"}`}
                  >
                    {canLock ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={savingId === user.id}
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
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Trang {meta.page}/{meta.totalPages}
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
              disabled={page >= meta.totalPages}
              onClick={() => setPage((v) => Math.min(v + 1, meta.totalPages))}
            >
              Sau →
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[var(--overlay)]" onClick={() => { setShowForm(false); setEditingUser(null); }} />
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-6 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {editingUser ? "Sửa Người Dùng" : "Tạo Người Dùng Mới"}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingUser(null); }}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Tên</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Mật khẩu</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Vai trò</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="LEARNER">Học viên</option>
                    <option value="ADMIN">Quản trị</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="LOCKED">Bị khóa</option>
                    <option value="INACTIVE">Không kích hoạt</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Hạn license</label>
                <input
                  type="date"
                  value={formData.licenseExpiresAt}
                  onChange={(e) => setFormData({ ...formData, licenseExpiresAt: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <Button type="submit" disabled={savingId !== null} isLoading={savingId !== null} className="w-full">
                {editingUser ? "Lưu thay đổi" : "Tạo người dùng"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 hidden lg:flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {editingUser ? "Sửa Người Dùng" : "Tạo Người Dùng Mới"}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingUser(null); }}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Tên</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Mật khẩu</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Vai trò</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="LEARNER">Học viên</option>
                    <option value="ADMIN">Quản trị</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="LOCKED">Bị khóa</option>
                    <option value="INACTIVE">Không kích hoạt</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Hạn license</label>
                <input
                  type="date"
                  value={formData.licenseExpiresAt}
                  onChange={(e) => setFormData({ ...formData, licenseExpiresAt: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditingUser(null); }} className="flex-1">
                  Hủy
                </Button>
                <Button type="submit" disabled={savingId !== null} isLoading={savingId !== null} className="flex-1">
                  {editingUser ? "Lưu thay đổi" : "Tạo người dùng"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
