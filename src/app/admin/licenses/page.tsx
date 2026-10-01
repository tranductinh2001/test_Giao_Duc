"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import {
  Key,
  Plus,
  Ticket,
  ArrowLeft,
  Pencil,
  Trash2,
  X,
  Copy,
  CheckCircle,
  Clock,
  Ban,
  AlertTriangle
} from "lucide-react";

interface LicenseRow {
  id: string;
  code: string;
  durationDays: number;
  status: "UNUSED" | "ACTIVATED" | "EXPIRED" | "REVOKED";
  activatedAt: string | null;
  activatedBy?: { name: string; email: string } | null;
  createdAt: string;
}

const statusConfig = {
  UNUSED: { label: "Chưa dùng", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", icon: Ticket },
  ACTIVATED: { label: "Đã kích hoạt", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle },
  EXPIRED: { label: "Hết hạn", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", icon: Clock },
  REVOKED: { label: "Đã thu hồi", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", icon: Ban },
};

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState<LicenseRow | null>(null);
  const [durationDays, setDurationDays] = useState(90);
  const [count, setCount] = useState(10);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLicenses = async () => {
    const res = await fetch("/api/admin/licenses");
    const data = await res.json();
    if (data.success) {
      setLicenses(data.data);
    }
  };

  useEffect(() => {
    loadLicenses().finally(() => setLoading(false));
  }, []);

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays, count }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Đã sinh ${count} license mới`);
        setShowForm(false);
        await loadLicenses();
      } else {
        setError(data.message || "Không thể sinh license");
      }
    } catch {
      setError("Lỗi khi sinh license");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLicense = async () => {
    if (!editingLicense) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/licenses/${editingLicense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays: editingLicense.durationDays }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Đã cập nhật license");
        setEditingLicense(null);
        await loadLicenses();
      } else {
        setError(data.message || "Không thể cập nhật");
      }
    } catch {
      setError("Lỗi khi cập nhật");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa license này?")) return;
    try {
      const res = await fetch(`/api/admin/licenses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage("Đã xóa license");
        await loadLicenses();
      } else {
        setError(data.message || "Không thể xóa");
      }
    } catch {
      setError("Lỗi khi xóa");
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setMessage("Đã copy mã license");
  };

  const unusedCount = licenses.filter(l => l.status === "UNUSED").length;
  const activatedCount = licenses.filter(l => l.status === "ACTIVATED").length;

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
            <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Quản Lý License
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {unusedCount} chưa dùng • {activatedCount} đã kích hoạt
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
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Sinh mã mới
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

      {/* License Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : licenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
            <Ticket className="h-8 w-8 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-4">
            Chưa có license nào
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Sinh license đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {licenses.map((license) => {
            const status = statusConfig[license.status];
            const StatusIcon = status.icon;
            return (
              <div
                key={license.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${status.bg} ${status.text}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => copyToClipboard(license.code)}
                      className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Copy mã"
                    >
                      <Copy className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(license.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2 truncate">
                  {license.code}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Thời hạn</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{license.durationDays} ngày</span>
                  </div>
                  {license.activatedBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Người dùng</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">{license.activatedBy.email}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile Generate Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-6 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Sinh License Mới</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Số ngày</label>
                <input
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <p className="text-xs text-zinc-500 mt-1">Phổ biến: 30, 90, 180, 365 ngày</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Số lượng</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <p className="text-xs text-zinc-500 mt-1">Tối đa 100 mã / lần</p>
              </div>
              <Button type="submit" disabled={saving} isLoading={saving} className="w-full">
                Sinh {count} license
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Generate Form */}
      <div className="hidden lg:block rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Sinh Mã Mới
        </h2>
        <form onSubmit={handleGenerate} className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Số ngày</label>
            <input
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-32 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Số lượng</label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-32 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <Button type="submit" disabled={saving} isLoading={saving}>
            <Plus className="w-4 h-4 mr-2" />
            Sinh license
          </Button>
        </form>
      </div>

      {/* Edit Modal */}
      {editingLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Chỉnh Sửa License</h2>
              <button onClick={() => setEditingLicense(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Mã License</label>
                <input
                  type="text"
                  value={editingLicense.code}
                  disabled
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-mono bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Số ngày</label>
                <input
                  type="number"
                  min={1}
                  value={editingLicense.durationDays}
                  onChange={(e) => setEditingLicense({ ...editingLicense, durationDays: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="secondary" onClick={() => setEditingLicense(null)} className="flex-1">
                  Hủy
                </Button>
                <Button onClick={handleUpdateLicense} disabled={saving} isLoading={saving} className="flex-1">
                  Lưu
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
