"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BubbleMenu from "./BubbleMenu";
import QuickActions from "./QuickActions";
import NotificationTicker from "./dashboard/NotificationTicker";
import { GraduationCap, Key, Wallet, FileText, Target, History, BarChart3, Upload, ChevronDown, List, Brain, Search, Bell, Settings, ChevronRight } from "lucide-react";

interface UserNavbarProps {
  userName?: string;
  userRole?: string;
}

export default function UserNavbar({ userName, userRole }: UserNavbarProps) {
  const pathname = usePathname();

  const mainNavItems = [
    { href: "/dashboard/exams", label: "Làm đề", icon: FileText },
    { href: "/practice", label: "Luyện tập", icon: Target },
    { href: "/dashboard/exams/history", label: "Lịch sử", icon: History },
    { href: "/dashboard/insights", label: "Báo cáo", icon: BarChart3 },
  ];

  const isTeacher = userRole === "TEACHER" || userRole === "ADMIN";

  const lessonPlansItems = [
    { href: "/lesson-plans/upload", label: "Tải lên giáo án", icon: Upload },
    { href: "/lesson-plans", label: "Danh sách giáo án", icon: List },
    { href: "/lesson-plans/review", label: "Review Workspace", icon: Brain },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Main Navbar - Education Workspace Style */}
      <nav className="sticky top-0 z-[100] w-full border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-6">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 flex-shrink-0"
            title="Về Dashboard"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--primary)] text-[var(--foreground-inverted)] shadow-[var(--shadow-paper)]">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>VCGo</span>
              <span className="text-[10px] text-[var(--muted)]">Education</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    isActive(item.href)
                      ? "bg-[var(--primary-soft)] text-[var(--primary)] font-semibold shadow-[var(--shadow-paper)] border border-[var(--border)]"
                      : "text-[var(--foreground)] hover:bg-[var(--kraft)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {isTeacher && (
              <div className="relative group">
                <button
                  className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    pathname.startsWith("/lesson-plans")
                      ? "bg-[var(--primary-soft)] text-[var(--primary)] font-semibold shadow-[var(--shadow-paper)] border border-[var(--border)]"
                      : "text-[var(--foreground)] hover:bg-[var(--kraft)]"
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  <span>Giáo án</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--surface)] rounded-[var(--radius-sm)] shadow-[var(--shadow-lift)] border border-[var(--border)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                  {lessonPlansItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors first:rounded-t-[var(--radius-sm)] last:rounded-b-[var(--radius-sm)] ${
                          isActive(item.href)
                            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                            : "text-[var(--foreground)] hover:bg-[var(--kraft)]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/license"
              className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium bg-[var(--warning-soft)] text-[var(--warning)] hover:bg-[var(--warning-soft)]/80 transition-colors border border-[var(--border)]"
            >
              <Key className="h-4 w-4" />
              <span>Kích hoạt Key</span>
            </Link>
            <Link
              href="/recharge"
              className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium bg-[var(--primary)] text-[var(--foreground-inverted)] hover:bg-[var(--primary-hover)] transition-colors"
            >
              <Wallet className="h-4 w-4" />
              <span>Nạp tiền</span>
            </Link>
          </div>

          {/* Right side - Search & Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 h-9 px-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-paper)] min-w-[200px]">
              <Search className="h-4 w-4 text-[var(--muted)]" />
              <input
                type="search"
                placeholder="Tìm kiếm..."
                className="flex-1 border-0 outline-0 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
              />
            </div>

            <button className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--kraft)] hover:text-[var(--foreground)] transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[var(--danger)] rounded-full border border-[var(--surface)]"></span>
            </button>

            {userName && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--foreground)]">{userName}</p>
                  {userRole === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
                    >
                      Admin Panel
                    </Link>
                  )}
                </div>
                <Link
                  href="/profile"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary-soft-hover)] transition-colors border border-[var(--primary)]/20"
                >
                  {getInitials(userName)}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile */}
          <div className="flex lg:hidden items-center gap-2">
            <QuickActions />
            <BubbleMenu userName={userName} />
          </div>
        </div>
      </nav>

      <NotificationTicker />
    </>
  );
}
