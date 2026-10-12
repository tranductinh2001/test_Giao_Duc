"use client";

import { signOut } from "next-auth/react";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Target, FileText, BarChart3, User, Users, HelpCircle, ClipboardList, FolderOpen, Key, Menu, X, LogOut, Brain } from "lucide-react";

interface MobileNavProps {
  userName: string;
  userRole: "ADMIN" | "TEACHER" | "LEARNER";
}

export default function MobileNav({ userName, userRole }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const learnerLinks = [
    { href: "/dashboard", label: "Tổng quan", icon: Home },
    { href: "/dashboard/exams", label: "Thi thử", icon: Target },
    { href: "/practice", label: "Luyện tập", icon: FileText },
    { href: "/dashboard/insights", label: "Báo cáo", icon: BarChart3 },
    { href: "/profile", label: "Hồ sơ", icon: User },
  ];

  const adminLinks = [
    { href: "/admin", label: "Tổng quan", icon: BarChart3 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/questions", label: "Questions", icon: HelpCircle },
    { href: "/admin/exams", label: "Exams", icon: ClipboardList },
    { href: "/admin/categories", label: "Categories", icon: FolderOpen },
    { href: "/admin/licenses", label: "Licenses", icon: Key },
  ];

  const teacherLinks = [
    { href: "/admin", label: "Tổng quan", icon: BarChart3 },
    { href: "/admin/lesson-plans/evaluate", label: "Thẩm định GA (AI)", icon: Brain },
    { href: "/admin/questions", label: "Questions", icon: HelpCircle },
    { href: "/admin/exams", label: "Exams", icon: ClipboardList },
    { href: "/admin/categories", label: "Categories", icon: FolderOpen },
    { href: "/admin/users", label: "Users", icon: Users },
  ];

  const links = userRole === "ADMIN" ? adminLinks : userRole === "TEACHER" ? teacherLinks : learnerLinks;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated hover:brightness-110 transition-transform duration-200 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-action-manipulation"
        aria-label={isOpen ? 'Đóng menu' : 'Mở menu'}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {isOpen ? (
          <X className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Menu className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--overlay)] backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          role="button"
          aria-label="Đóng menu"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transform rounded-t-3xl border-t border-border bg-card backdrop-blur-xl transition-transform duration-300 lg:hidden ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="p-6">
          {/* User info */}
          <div className="mb-6 rounded-xl border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Xin Chào,</p>
            <p className="text-lg font-semibold text-foreground">{userName}</p>
            <span className="mt-2 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">
              {userRole === "ADMIN" ? "Quản Trị Viên" : userRole === "TEACHER" ? "Nhân Viên" : "Học Viên"}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-subtle"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="mt-6 pt-6 border-t border-border">
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut({ callbackUrl: "/login", redirect: true });
                } catch {
                  window.location.href = "/login";
                }
              }}
              className="w-full rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive transition-colors duration-200 hover:bg-destructive/20 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive touch-action-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              Đăng Xuất
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
