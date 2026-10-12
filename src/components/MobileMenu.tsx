"use client";

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { FileText, Target, History, BarChart3, Megaphone, MessageSquare, HelpCircle, GraduationCap, Key, Wallet, X, LogOut, Sun, Moon } from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userRole?: string;
}

export default function MobileMenu({ isOpen, onClose, userName, userRole }: MobileMenuProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(savedTheme || systemTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const mainNavItems = [
    { href: "/dashboard/exams", label: "Làm đề", icon: FileText },
    { href: "/practice", label: "Luyện tập", icon: Target },
    { href: "/dashboard/exams/history", label: "Lịch sử", icon: History },
    { href: "/dashboard/insights", label: "Báo cáo", icon: BarChart3 },
  ];

  const secondaryNavItems = [
    { href: "/recruitment", label: "Tuyển dụng", icon: Megaphone },
    { href: "/feedback", label: "Góp ý", icon: MessageSquare },
    { href: "/faq", label: "Trợ giúp", icon: HelpCircle },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (typeof window === "undefined" || !isOpen) return null;

  const menuContent = (
    <div className="fixed inset-0 z-[99999]">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <div
        className="absolute top-0 right-0 bottom-0 w-[300px] max-w-[85vw] bg-[var(--surface)] shadow-2xl flex flex-col transition-transform duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Menu điều hướng"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--primary)]">
              <GraduationCap className="w-5 h-5 text-[var(--foreground-inverted)]" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {userName || "Người dùng"}
              </p>
              <p className="text-xs text-[var(--muted)]">Chào bạn!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-lg bg-[var(--kraft)] hover:bg-[var(--border)] transition-colors"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Theme Toggle - sticky at top */}
          {mounted && (
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--kraft)] sticky top-0 z-10">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--kraft)] transition-colors"
                aria-label="Chuyển đổi giao diện"
              >
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
                </span>
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-[var(--muted)]" />
                )}
              </button>
            </div>
          )}

          {/* Main Navigation */}
          <div className="px-4 py-4 bg-[var(--surface)]">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Menu chính
            </p>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                      active
                        ? "bg-[var(--primary)] text-[var(--foreground-inverted)]"
                        : "text-[var(--foreground)] hover:bg-[var(--kraft)]"
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <p className="mt-6 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Khác
            </p>
            <nav className="space-y-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[var(--foreground)] hover:bg-[var(--kraft)] transition-colors"
                  >
                    <Icon className="w-5 h-5" strokeWidth={2} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Actions - Key buttons */}
            <div className="mt-6 space-y-2 border-t border-[var(--border)] pt-4">
              <Link
                href="/licenses/activate"
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--border)] hover:bg-[var(--warning-soft)]/80 transition-colors"
              >
                <Key className="w-4 h-4" />
                <span>Kích hoạt Key</span>
              </Link>
              <Link
                href="/payment"
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-[var(--success)] text-[var(--foreground-inverted)] hover:bg-[var(--success)]/90 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                <span>Nạp tiền</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Fixed Footer - Profile & Logout */}
        <div className="flex-shrink-0 px-4 py-4 space-y-1 border-t border-[var(--border)] bg-[var(--surface)]">
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[var(--foreground)] hover:bg-[var(--kraft)] transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--foreground-inverted)] font-bold text-sm">
              {userName?.charAt(0).toUpperCase() || "U"}
            </div>
            <span>Hồ sơ của tôi</span>
          </Link>

          {userRole === "ADMIN" && (
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-soft)] flex items-center justify-center">
                <span className="text-xs font-bold">A</span>
              </div>
              <span>Admin Panel</span>
            </Link>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-2"
          >
            <LogOut className="w-5 h-5" strokeWidth={2} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(menuContent, document.body);
}
