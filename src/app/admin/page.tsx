import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  BookOpen,
  FileText,
  FolderTree,
  Users,
  MessageSquare,
  Megaphone,
  BarChart3,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Brain,
  Sparkles
} from "lucide-react";

export const revalidate = 0;

export default async function AdminOverviewPage() {
  let totalQuestions = 0;
  let totalExams = 0;
  let totalCategories = 0;
  let totalUsers = 0;
  let recentUsers: Array<{ id: string; name: string | null; email: string; createdAt: Date; role: string }> = [];

  try {
    [totalQuestions, totalExams, totalCategories, totalUsers, recentUsers] = await Promise.all([
      prisma.question.count(),
      prisma.exam.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, createdAt: true, role: true },
      }),
    ]);
  } catch (error) {
    console.warn("[AdminOverviewPage] Database connection offline or failed:", error);
  }

  const stats = [
    {
      name: "Câu Hỏi",
      value: totalQuestions,
      change: "+12%",
      icon: BookOpen,
      color: "primary",
      href: "/admin/questions",
    },
    {
      name: "Đề Thi",
      value: totalExams,
      change: "+5%",
      icon: FileText,
      color: "secondary",
      href: "/admin/exams",
    },
    {
      name: "Danh Mục",
      value: totalCategories,
      change: "+2",
      icon: FolderTree,
      color: "success",
      href: "/admin/categories",
    },
    {
      name: "Người Dùng",
      value: totalUsers,
      change: "+8%",
      icon: Users,
      color: "warning",
      href: "/admin/users",
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: "bg-[var(--primary-soft)]", text: "text-[var(--primary)]", border: "border-[var(--primary)]/20" },
    secondary: { bg: "bg-[var(--secondary-soft)]", text: "text-[var(--secondary)]", border: "border-[var(--secondary)]/20" },
    success: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]", border: "border-[var(--success)]/20" },
    warning: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]", border: "border-[var(--warning)]/20" },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Tổng Quan
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Theo dõi hoạt động và quản lý hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Clock className="w-4 h-4" />
          <span>Cập nhật: {new Date().toLocaleDateString("vi-VN")}</span>
        </div>
      </div>

      {/* Stats Grid - Paper Card Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = colorMap[stat.color];
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className="group relative paper p-4 hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all"
            >
              <div className="relative">
                <div className={`inline-flex p-2 rounded-[var(--radius-sm)] ${colors.bg} ${colors.text} mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--foreground)] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                      {stat.value.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-[var(--muted)] font-medium mt-0.5">
                      {stat.name}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-[var(--success)]">
                    <TrendingUp className="w-3 h-3" />
                    {stat.change}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions - Card Grid Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Thẩm định giáo án (AI)", href: "/admin/lesson-plans/evaluate", icon: Brain, desc: "Đánh giá chuẩn 5512/2345", color: "primary" },
          { label: "Quản lý câu hỏi", href: "/admin/questions", icon: BookOpen, desc: "Thêm, sửa, xóa", color: "secondary" },
          { label: "Quản lý đề thi", href: "/admin/exams", icon: FileText, desc: "Tạo và chỉnh sửa", color: "success" },
          { label: "Danh mục", href: "/admin/categories", icon: FolderTree, desc: "Phân loại nội dung", color: "primary" },
          { label: "Người dùng", href: "/admin/users", icon: Users, desc: "Tài khoản & quyền", color: "warning" },
        ].map((item) => {
          const Icon = item.icon;
          const colors = colorMap[item.color];
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group paper p-4 flex items-center gap-3 hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] ${colors.bg} transition-colors`}>
                <Icon className={`h-5 w-5 ${colors.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                  {item.label}
                </p>
                <p className="text-xs text-[var(--muted)] truncate">
                  {item.desc}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
            </Link>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users - Paper Card */}
        <div className="paper overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
              Người dùng mới
            </h2>
            <Link
              href="/admin/users"
              className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--kraft)] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-sm font-semibold border border-[var(--primary)]/20">
                      {user.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {user.name || "Chưa có tên"}
                      </p>
                      <p className="text-xs text-[var(--muted)] truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      user.role === "ADMIN"
                        ? "bg-[var(--secondary-soft)] text-[var(--secondary)]"
                        : "bg-[var(--success-soft)] text-[var(--success)]"
                    }`}>
                      {user.role === "ADMIN" ? "Admin" : "User"}
                    </span>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-[var(--muted)]">
                <Users className="w-8 h-8 mb-2" />
                <p className="text-sm">Chưa có người dùng</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links - Paper Card */}
        <div className="paper overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
              Liên kết nhanh
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { label: "Góp ý", href: "/admin/feedback", icon: MessageSquare, color: "success" },
              { label: "Templates", href: "/admin/templates", icon: FileText, color: "secondary" },
              { label: "License", href: "/admin/licenses", icon: CheckCircle, color: "primary" },
              { label: "Cài đặt", href: "/admin/settings", icon: Settings, color: "warning" },
            ].map((item) => {
              const Icon = item.icon;
              const colors = colorMap[item.color];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] p-3 hover:bg-[var(--kraft)] hover:border-[var(--primary)]/30 transition-all"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] ${colors.bg}`}>
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-[var(--border)] p-4">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground-inverted)] hover:bg-[var(--primary-hover)] transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Mở Dashboard Học Viên</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
