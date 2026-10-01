"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import {
  MessageSquare,
  Filter,
  Inbox,
  ArrowLeft,
  Mail,
  User,
  X,
  Send,
  CheckCircle,
  Clock,
  Eye,
  Trash2
} from "lucide-react";

interface Feedback {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

const STATUS_OPTIONS = ["PENDING", "REVIEWING", "RESOLVED", "DISMISSED"];
const statusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  PENDING: { label: "Chờ xử lý", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", icon: Clock },
  REVIEWING: { label: "Đang xem xét", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", icon: Eye },
  RESOLVED: { label: "Đã giải quyết", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle },
  DISMISSED: { label: "Đã bỏ qua", bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-500", icon: Trash2 },
};

const CATEGORY_LABELS: Record<string, string> = {
  Bug: "Báo lỗi",
  Suggestion: "Đề xuất",
  Question: "Câu hỏi",
  Other: "Khác",
};

const categoryBg: Record<string, string> = {
  Bug: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  Suggestion: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  Question: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  Other: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
};

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const url = filter === "ALL" ? "/api/feedback" : `/api/feedback?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setFeedbacks(data.data);
    } catch (err) {
      setError("Lỗi khi tải góp ý");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [filter]);

  const handleUpdate = async () => {
    if (!editingFeedback) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/feedback/${editingFeedback.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminNote }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Đã cập nhật góp ý");
        setEditingFeedback(null);
        fetchFeedbacks();
      } else {
        setError(data.message || "Lỗi khi cập nhật");
      }
    } catch {
      setError("Lỗi khi cập nhật");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (fb: Feedback) => {
    setEditingFeedback(fb);
    setAdminNote(fb.adminNote || "");
    setNewStatus(fb.status);
  };

  const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = feedbacks.filter(f => f.status === s).length;
    return acc;
  }, {} as Record<string, number>);

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
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Quản Lý Góp Ý
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {feedbacks.length} góp ý
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

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "ALL"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          }`}
        >
          Tất cả
        </button>
        {STATUS_OPTIONS.map((s) => {
          const config = statusConfig[s];
          const Icon = config.icon;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === s
                  ? `${config.bg} ${config.text}`
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{config.label}</span>
              {statusCounts[s] > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                  {statusCounts[s]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
            <Inbox className="h-8 w-8 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Không có góp ý nào
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => {
            const status = statusConfig[fb.status];
            const StatusIcon = status.icon;
            const isExpanded = expandedId === fb.id;

            return (
              <div
                key={fb.id}
                className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${categoryBg[fb.category] || categoryBg.Other}`}>
                          {CATEGORY_LABELS[fb.category] || fb.category}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${status.bg} ${status.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {fb.subject}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                        {fb.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-zinc-400 hidden sm:block">
                        {new Date(fb.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {fb.user.name}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[180px] sm:max-w-none">{fb.user.email}</span>
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-800/50">
                    {fb.adminNote && (
                      <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Phản hồi từ Admin:
                        </p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{fb.adminNote}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,2fr,auto] gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Trạng thái</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{statusConfig[s].label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Phản hồi</label>
                        <textarea
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          placeholder="Nhập phản hồi cho người dùng..."
                          rows={2}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openEdit(fb); }}
                          disabled={saving}
                          isLoading={saving}
                        >
                          <Send className="w-4 h-4 mr-1.5" />
                          Gửi
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
