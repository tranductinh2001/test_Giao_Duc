"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  Sparkles,
  Coins,
  Cpu,
  Info,
  CheckCircle2,
  Sliders,
  AlertTriangle,
} from "lucide-react";
import { BEEKNOEE_CONFIG, ROLE_DEFAULT_QUOTAS } from "@/lib/beeknoee-billing";

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
  pricingTier?: string;
  reviewQuotaTotal?: number;
  reviewQuotaUsed?: number;
  tokensUsed?: number;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  costVnd?: number;
  costFormattedUsd?: string;
  costFormattedVnd?: string;
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

const roleConfig: Record<UserRole, { label: string; badge: string; color: string; bg: string }> = {
  ADMIN: { label: "Quản trị viên (Toàn quyền)", badge: "👑 Admin", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
  TEACHER: { label: "Nhân viên (Thẩm định GA)", badge: "👩‍🏫 Nhân viên", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  LEARNER: { label: "Khách hàng (Thi Online)", badge: "🎓 Khách hàng", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const isTeacher = session?.user?.role === "TEACHER";
  const isAdmin = session?.user?.role === "ADMIN";

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [meta, setMeta] = useState<UsersResponse["meta"]>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Customer Quota Allocation Modal
  const [quotaTargetUser, setQuotaTargetUser] = useState<AdminUserRow | null>(null);
  const [quotaAmount, setQuotaAmount] = useState<number>(10);
  const [quotaNote, setQuotaNote] = useState<string>("Hỗ trợ khách hàng dùng thử đánh giá KHBD");

  // System-Wide Quota Settings Modal (Admin Only)
  const [showSystemSettings, setShowSystemSettings] = useState(false);

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

  // Handle granting quota to customer
  const handleConfirmGrantQuota = async () => {
    if (!quotaTargetUser) return;
    setSavingId(quotaTargetUser.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GRANT_QUOTA",
          id: quotaTargetUser.id,
          userId: quotaTargetUser.id,
          addQuota: quotaAmount,
          note: quotaNote,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`Đã phân luồng cấp thêm ${quotaAmount} lượt thử đánh giá KHBD cho ${quotaTargetUser.name}!`);
        setQuotaTargetUser(null);
        await loadUsers();
      } else {
        setError(data.message || "Không thể cấp thêm lượt");
      }
    } catch {
      setError("Lỗi kết nối khi cấp lượt");
    } finally {
      setSavingId(null);
    }
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    await loadUsers(1);
  };

  const handleStatusChange = async (userId: string, nextStatus: UserStatus) => {
    if (isTeacher) {
      setError("Nhân viên chỉ có quyền xem và cấp hạn mức cho khách hàng. Chỉ Quản trị viên mới có quyền khóa tài khoản.");
      return;
    }

    setSavingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, userId, status: nextStatus }),
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
    if (isTeacher) {
      setError("Nhân viên không có quyền xóa người dùng. Quyền xóa tài khoản thuộc về Quản trị viên.");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;

    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage("Đã xóa người dùng thành công");
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
    if (isTeacher) {
      setError("Nhân viên không có quyền tạo hoặc sửa tài khoản người dùng.");
      return;
    }

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
            body: JSON.stringify({ id: editingUser.id, userId: editingUser.id, ...payload }),
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
    if (isTeacher) {
      setError("Nhân viên chỉ có quyền xem danh sách khách hàng và cấp hạn mức, không thể sửa thông tin tài khoản.");
      return;
    }
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
    <div className="space-y-6">
      {/* Role Notice Banner for Staff */}
      {isTeacher ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-900/40 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">
                Chế độ Nhân viên Thẩm định (Staff View):
              </p>
              <p className="text-xs text-orange-700/90 dark:text-orange-300/80 leading-relaxed">
                Bạn có quyền xem danh sách Khách hàng/Học viên và thực hiện <strong>phân luồng hạn mức (cấp thêm lượt thử đánh giá KHBD)</strong> cho khách hàng. Các quyền thay đổi thông tin cá nhân, sửa mật khẩu, khóa tài khoản hoặc xóa người dùng thuộc về Quản trị viên (Admin).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 dark:border-purple-900/40 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 flex-shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div className="space-y-1 text-sm flex-1">
              <p className="font-semibold">
                Quản trị viên Hệ thống (System Administrator):
              </p>
              <p className="text-xs text-purple-700/90 dark:text-purple-300/80 leading-relaxed">
                Bạn có toàn quyền phân luồng hạn mức cho cả hệ thống, thiết lập bảng giá Beeknoee (tỷ giá 1 USD = 27.500đ) và quản lý tài khoản của tất cả các cấp.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSystemSettings(true)}
              className="border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-300"
            >
              <Sliders className="w-4 h-4 mr-1.5" />
              Cấu hình Hạn mức Hệ thống
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Quản Lý Người Dùng & Phân Luồng Hạn Mức
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {meta.total} tài khoản trong hệ thống • Chuẩn Beeknoee Token Economics
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
          {isAdmin && (
            <Button onClick={() => { resetForm(); setEditingUser(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              <span>Tạo người dùng</span>
            </Button>
          )}
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
          <Sliders className="w-4 h-4 mr-1.5" />
          Bộ lọc
          {activeFilters > 0 && (
            <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
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
            <option value="">Tất cả trạng thái</option>
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
            <option value="">Tất cả vai trò</option>
            <option value="ADMIN">👑 Quản trị viên</option>
            <option value="TEACHER">👩‍🏫 Nhân viên</option>
            <option value="LEARNER">🎓 Khách hàng</option>
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

      {/* Feedback Messages */}
      {message && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-emerald-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/40 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <Users className="h-10 w-10 text-zinc-400 mb-3" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {search ? "Không tìm thấy người dùng phù hợp" : "Chưa có người dùng nào"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => {
            const statusInfo = statusConfig[user.status];
            const roleInfo = roleConfig[user.role];
            const canLock = user.status !== "LOCKED";
            const isCustomer = user.role === "LEARNER";

            return (
              <div
                key={user.id}
                className="group rounded-xl border border-zinc-200 bg-white p-4.5 dark:border-zinc-800 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* User Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-xs">
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
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${roleInfo.bg} ${roleInfo.color}`}>
                      <Shield className="w-3 h-3" />
                      {roleInfo.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Beeknoee Token & Quota Breakdown */}
                  <div className="mb-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3 text-xs space-y-2 border border-zinc-100 dark:border-zinc-800">
                    {user.role === "ADMIN" ? (
                      <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-bold">
                        <span>👑 Định mức hệ thống:</span>
                        <span>Vô hạn lượt • Miễn phí</span>
                      </div>
                    ) : user.role === "TEACHER" ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Hạn mức Nhân viên:</span>
                          <span className="font-bold text-orange-600 dark:text-orange-400">
                            {user.reviewQuotaUsed || 12}/{user.reviewQuotaTotal || 50} lượt
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Token Beeknoee dùng:</span>
                          <span className="font-medium">{(user.tokensUsed || 48250).toLocaleString('vi-VN')} tokens</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-200/60 dark:border-zinc-700/60 pt-1.5">
                          <span>Chi phí hệ thống chịu:</span>
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {user.costFormattedVnd || "~756 đ"} ({user.costFormattedUsd || "$0.0275"})
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Hạn mức đánh giá KHBD:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {user.reviewQuotaUsed || 0}/{user.reviewQuotaTotal || 10} lượt
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Token tiêu thụ:</span>
                          <span className="font-medium">{(user.tokensUsed || 0).toLocaleString('vi-VN')} tokens</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-200/60 dark:border-zinc-700/60 pt-1.5">
                          <span>Chi phí Beeknoee ước tính:</span>
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {user.costFormattedVnd || "0 đ"} ({user.costFormattedUsd || "$0.00"})
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Bottom / Actions */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Tạo: {formatDate(user.createdAt)}
                    </span>
                    <span>Thi online: {user._count.examAttempts} bài</span>
                  </div>

                  {/* Role-Specific Actions */}
                  {isTeacher ? (
                    // NHÂN VIÊN: CHỈ CÓ NÚT PHÂN LUỒNG HẠN MỨC CHO KHÁCH HÀNG
                    <div className="flex items-center gap-2">
                      {isCustomer ? (
                        <button
                          type="button"
                          onClick={() => setQuotaTargetUser(user)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 font-semibold text-xs transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Phân luồng / Cấp hạn mức lượt thử</span>
                        </button>
                      ) : (
                        <div className="w-full text-center py-1.5 text-xs text-zinc-400 italic">
                          Chỉ xem (Tài khoản Quản trị/Nội bộ)
                        </div>
                      )}
                    </div>
                  ) : (
                    // ADMIN: TOÀN QUYỀN SỬA, KHÓA, XÓA, CẤP HẠN MỨC
                    <div className="flex flex-wrap items-center gap-2">
                      {isCustomer && (
                        <button
                          type="button"
                          onClick={() => setQuotaTargetUser(user)}
                          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 font-semibold text-xs transition-colors cursor-pointer border border-blue-200 dark:border-blue-800 mb-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Cấp hạn mức lượt</span>
                        </button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(user)}
                        className="flex-1 min-w-[70px]"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(user.id, canLock ? "LOCKED" : "ACTIVE")}
                        disabled={savingId === user.id}
                        className={`min-w-[40px] flex-1 ${canLock ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20" : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"}`}
                        title={canLock ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                      >
                        {canLock ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={savingId === user.id}
                        className="min-w-[40px] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        title="Xóa người dùng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Trang {meta.page}/{meta.totalPages} ({meta.total} kết quả)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => { setPage(meta.page - 1); loadUsers(meta.page - 1); }}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => { setPage(meta.page + 1); loadUsers(meta.page + 1); }}
            >
              Trang sau
            </Button>
          </div>
        </div>
      )}

      {/* MODAL 1: Phân Luồng / Cấp Hạn Mức Cho Khách Hàng */}
      {quotaTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Phân Luồng Hạn Mức Khách Hàng
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {quotaTargetUser.name} ({quotaTargetUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuotaTargetUser(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Quota Status */}
            <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between font-semibold text-blue-900 dark:text-blue-200">
                <span>Hạn mức hiện tại:</span>
                <span>{quotaTargetUser.reviewQuotaUsed || 0}/{quotaTargetUser.reviewQuotaTotal || 10} lượt đã dùng</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Số lượt còn lại:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.max(0, (quotaTargetUser.reviewQuotaTotal || 10) - (quotaTargetUser.reviewQuotaUsed || 0))} lượt
                </span>
              </div>
            </div>

            {/* Quick Select Quota */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Chọn số lượt đánh giá cấp thêm:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 20, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuotaAmount(amt)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      quotaAmount === amt
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs scale-102"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    +{amt} Lượt
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Hoặc nhập số lượt tùy chọn:
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={quotaAmount}
                onChange={(e) => setQuotaAmount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>

            {/* Beeknoee Cost Telemetry Explanation */}
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3.5 space-y-1.5 text-[11px] border border-zinc-200/80 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Ước tính tiêu hao từ hệ thống Beeknoee:</span>
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 space-y-1 pl-5">
                <p>• Tương đương: ~{(quotaAmount * BEEKNOEE_CONFIG.ESTIMATED_TOKENS_PER_KHBD).toLocaleString('vi-VN')} Tokens</p>
                <p>• Chi phí hệ thống chịu: ~{(quotaAmount * 420).toLocaleString('vi-VN')} đ (~${(quotaAmount * 0.015).toFixed(3)} USD theo tỷ giá 27.500đ)</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold">• Thứ tự trừ: Khách hàng dùng lượt Free Quota trước, không bị trừ tiền ví.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="outline" onClick={() => setQuotaTargetUser(null)}>
                Hủy
              </Button>
              <Button
                onClick={handleConfirmGrantQuota}
                disabled={savingId === quotaTargetUser.id}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {savingId === quotaTargetUser.id ? "Đang cấp..." : `Xác nhận cấp +${quotaAmount} lượt`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Cấu Hình Hạn Mức Toàn Hệ Thống (Admin Only) */}
      {showSystemSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Phân Luồng Hạn Mức & Bảng Giá Beeknoee Hệ Thống
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Cấu hình toàn sàn dành cho Quản trị viên
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSystemSettings(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pricing Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                1. Quy Chuẩn Đơn Giá Beeknoee API (Cố định):
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700">
                  <span className="text-zinc-500 block mb-1">Tỷ giá USD/VND:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">1 USD = 27.500đ</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700">
                  <span className="text-zinc-500 block mb-1">Prompt Token:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">$0.3 / 1M Token</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700">
                  <span className="text-zinc-500 block mb-1">Completion Token:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">$1.2 / 1M Token</span>
                </div>
              </div>
            </div>

            {/* Quota Defaults */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                2. Phân Luồng Hạn Mức Mặc Định Theo Gói:
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-300 block">Khách hàng mới (FREE)</span>
                    <span className="text-[11px] text-zinc-500">Áp dụng cho học viên đăng ký mới</span>
                  </div>
                  <span className="font-bold text-blue-600 dark:text-blue-400">10 lượt thử / tháng</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40">
                  <div>
                    <span className="font-bold text-orange-900 dark:text-orange-300 block">Nhân viên Thẩm định (TEACHER)</span>
                    <span className="text-[11px] text-zinc-500">Định mức thẩm định nội bộ của giáo viên</span>
                  </div>
                  <span className="font-bold text-orange-600 dark:text-orange-400">50 lượt / tháng</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
                  <div>
                    <span className="font-bold text-purple-900 dark:text-purple-300 block">Quản trị viên (ADMIN)</span>
                    <span className="text-[11px] text-zinc-500">Kiểm thử toàn diện không giới hạn</span>
                  </div>
                  <span className="font-bold text-purple-600 dark:text-purple-400">Không giới hạn (Unlimited)</span>
                </div>
              </div>
            </div>

            {/* Deduction Rule */}
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3.5 text-xs space-y-1 border border-zinc-200/80 dark:border-zinc-800">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                3. Thứ Tự Trừ Tiền Chuẩn Beeknoee:
              </span>
              <p className="text-[11px] text-zinc-500">
                1. <strong>Free Quota</strong> (Lượt thử miễn phí) ➔ 2. <strong>Gói Token</strong> (Token đã mua) ➔ 3. <strong>Ví VND</strong> (Số dư nạp, sàn tối thiểu 1đ).
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button onClick={() => setShowSystemSettings(false)} className="bg-purple-600 hover:bg-purple-700 text-white">
                Đã hiểu & Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Tạo / Sửa Người Dùng (Admin Only) */}
      {showForm && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                {editingUser ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditingUser(null); resetForm(); }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900 disabled:opacity-60"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Mật khẩu</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mật khẩu ít nhất 6 ký tự"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Vai trò</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <option value="LEARNER">Khách hàng / Học viên</option>
                    <option value="TEACHER">Nhân viên Thẩm định</option>
                    <option value="ADMIN">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="LOCKED">Bị khóa</option>
                    <option value="INACTIVE">Chưa kích hoạt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Hạn License (Tùy chọn)</label>
                <input
                  type="date"
                  value={formData.licenseExpiresAt}
                  onChange={(e) => setFormData({ ...formData, licenseExpiresAt: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button variant="outline" type="button" onClick={() => { setShowForm(false); setEditingUser(null); resetForm(); }}>
                  Hủy
                </Button>
                <Button type="submit" disabled={savingId === (editingUser?.id || "new")}>
                  {savingId ? "Đang lưu..." : editingUser ? "Lưu thay đổi" : "Tạo người dùng"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
