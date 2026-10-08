"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import ToastProvider from "@/components/toast-provider";
import {
  LayoutDashboard,
  HelpCircle,
  FileText,
  FolderOpen,
  Users,
  Key,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  User,
  BarChart3,
  Upload,
  List,
  Brain,
  History,
  ChevronDown,
  LucideIcon,
  GraduationCap,
  Search,
  Bell,
  Settings2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href?: string;
  icon?: LucideIcon;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { name: "Tổng quan", href: "/admin", icon: BarChart3 },
  { name: "Thẩm định giáo án (AI)", href: "/admin/lesson-plans/evaluate", icon: Brain },
  { name: "Ngân hàng câu hỏi", href: "/admin/questions", icon: HelpCircle },
  { name: "Ngân hàng đề thi", href: "/admin/exams", icon: FileText },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Tuyển dụng", href: "/admin/recruitment", icon: BookOpen },
  { name: "Người dùng", href: "/admin/users", icon: Users },
  { name: "License", href: "/admin/licenses", icon: Key },
  { name: "Góp ý", href: "/admin/feedback", icon: MessageSquare },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Giáo án"]);

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    );
  };

  const isMenuExpanded = (menuName: string) => expandedMenus.includes(menuName);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Mobile Header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--kraft)] -ml-2"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5 text-[var(--foreground)]" />
        </button>

        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--primary)] shadow-[var(--shadow-paper)]">
            <GraduationCap className="h-4 w-4 text-[var(--foreground-inverted)]" />
          </div>
          <span className="font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Admin</span>
        </Link>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)]">
          <span className="text-[var(--primary)] text-sm font-semibold">
            {session.user.name?.charAt(0).toUpperCase() || "A"}
          </span>
        </div>
      </header>

      {/* Mobile Menu Overlay - Education Workspace Style */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="absolute inset-y-0 left-0 w-72 bg-[var(--kraft)] shadow-[var(--shadow-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brand */}
            <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
              <Link href="/admin" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--primary)] text-[var(--foreground-inverted)] shadow-[var(--shadow-paper)]">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Bàn Giáo Viên</span>
                  <span className="block text-[10px] text-[var(--muted)]">Admin Panel</span>
                </div>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--surface)] -mr-2"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5 text-[var(--foreground)]" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <div className="space-y-0.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = item.children && item.children.length > 0;
                  const active = item.href ? isActive(item.href) : false;
                  const isExpanded = isMenuExpanded(item.name);

                  if (hasChildren) {
                    return (
                      <div key={item.name}>
                        <button
                          onClick={() => toggleMenu(item.name)}
                          className={cn(
                            "flex items-center justify-between w-full gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors",
                            active
                              ? "bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-paper)] border border-[var(--border)]"
                              : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                            <span>{item.name}</span>
                          </div>
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                        </button>
                        {isExpanded && (
                          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-[var(--border)] pl-3">
                            {item.children!.map((child) => {
                              const ChildIcon = child.icon;
                              const childActive = isActive(child.href!);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href!}
                                  className={cn(
                                    "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                                    childActive
                                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                      : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                                  )}
                                >
                                  {ChildIcon && <ChildIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                                  <span>{child.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href!}
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-paper)] border border-[var(--border)]"
                          : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="my-4 border-t border-[var(--border)]" />

              <div className="space-y-0.5">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard học viên</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
                >
                  <User className="h-4 w-4" />
                  <span>Hồ sơ cá nhân</span>
                </Link>
              </div>
            </nav>

            <div className="border-t border-[var(--border)] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-sm font-semibold border border-[var(--primary)]/20">
                  {session.user.name?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-[var(--muted)] truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <LogoutButton />
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar - Education Workspace Style (Kraft) */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-[var(--border)] bg-[var(--kraft)] transition-all duration-200",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
        style={{
          backgroundImage: 'linear-gradient(180deg, color-mix(in srgb, var(--paper-edge) 8%, transparent), transparent 120px)',
        }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary)] text-[var(--foreground-inverted)] shadow-[var(--shadow-paper)]">
              <GraduationCap className="h-4 w-4" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <span className="text-sm font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>Bàn Giáo Viên</span>
                <span className="block text-[10px] text-[var(--muted)]">Admin</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const active = item.href ? isActive(item.href) : false;
              const isExpanded = isMenuExpanded(item.name);

              if (hasChildren) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={cn(
                        "flex items-center justify-between w-full gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-paper)] border border-[var(--border)]"
                          : "text-[var(--foreground)] hover:bg-[var(--kraft)]"
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <div className="flex items-center gap-3">
                        {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                        {!sidebarCollapsed && <span>{item.name}</span>}
                      </div>
                      {!sidebarCollapsed && (
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                      )}
                    </button>
                    {!sidebarCollapsed && isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-[var(--border)] pl-3">
                        {item.children!.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isActive(child.href!);
                          return (
                            <Link
                              key={child.href}
                              href={child.href!}
                              className={cn(
                                "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                                childActive
                                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                  : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                              )}
                            >
                              {ChildIcon && <ChildIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href!}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-paper)] border border-[var(--border)]"
                      : "text-[var(--foreground)] hover:bg-[var(--kraft)]"
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>

          <div className="my-4 border-t border-[var(--border)]" />

          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--kraft)]"
              title={sidebarCollapsed ? "Dashboard" : undefined}
            >
              <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Dashboard học viên</span>}
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--kraft)]"
              title={sidebarCollapsed ? "Hồ sơ" : undefined}
            >
              <User className="h-4 w-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Hồ sơ cá nhân</span>}
            </Link>
          </div>
        </nav>

        {/* User Footer */}
        <div className="border-t border-[var(--border)] p-3">
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center gap-3 px-2 py-2 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-sm font-semibold border border-[var(--primary)]/20">
                  {session.user.name?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-[var(--muted)] truncate">
                    Quản trị viên
                  </p>
                </div>
              </div>
              <LogoutButton />
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-sm font-semibold border border-[var(--primary)]/20">
                {session.user.name?.charAt(0).toUpperCase() || "A"}
              </div>
              <button
                onClick={() => {
                  const confirm = window.confirm("Đăng xuất?");
                  if (confirm) {
                    window.location.href = "/api/auth/signout";
                  }
                }}
                className="rounded-[var(--radius-sm)] p-2 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-16 -right-3 z-10 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-paper)] hover:bg-[var(--kraft)]"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3 text-[var(--muted)]" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-[var(--muted)]" />
          )}
        </button>
      </aside>

      {/* Main Content - Education Workspace Topbar */}
      {(() => {
        const isEvaluatePage = pathname?.startsWith("/admin/lesson-plans/evaluate");
        return (
          <main className={cn(
            "flex-1",
            isEvaluatePage ? "h-screen overflow-hidden flex flex-col pt-14 lg:pt-0" : "overflow-y-auto pt-14 lg:pt-0"
          )}>
            {!isEvaluatePage && (
              <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:px-6">
                {/* Breadcrumb / Search */}
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center gap-2 text-sm text-[var(--muted)]">
                    <span>Admin</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-[var(--foreground)] font-medium">
                      {navigation.find(n => n.href && isActive(n.href))?.name || 'Tổng quan'}
                    </span>
                  </div>
                </div>

                {/* Search */}
                <div className="hidden lg:flex items-center gap-2 h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-paper)] min-w-[280px]">
                  <Search className="h-4 w-4 text-[var(--muted)]" />
                  <input
                    type="search"
                    placeholder="Tìm kiếm..."
                    className="flex-1 border-0 outline-0 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
                  />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                  <button className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--kraft)] hover:text-[var(--foreground)] transition-colors">
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[var(--danger)] rounded-full border border-[var(--surface)]"></span>
                  </button>
                  <button className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--kraft)] hover:text-[var(--foreground)] transition-colors">
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>
              </header>
            )}

            <div className={cn(
              isEvaluatePage ? "flex-1 h-full w-full overflow-hidden p-0" : "p-4 lg:p-6 min-h-full w-full"
            )}>
              {children}
            </div>
          </main>
        );
      })()}
      <ToastProvider />
    </div>
  );
}
