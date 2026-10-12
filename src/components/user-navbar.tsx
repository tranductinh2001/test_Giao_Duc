"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  GraduationCap,
  FileText,
  Target,
  History,
  BarChart3,
  Bell,
  Coins,
  Home,
  Sparkles,
  ChevronDown,
  Settings,
  LogOut,
  Zap,
  Shield,
  Menu,
  X,
  User,
  BookOpen,
  Brain,
} from "lucide-react";

interface UserNavbarProps {
  userName?: string;
  userRole?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function UserNavbar({ userName, userRole }: UserNavbarProps) {
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      setShowUserMenu(false);
      setShowMobileMenu(false);
      await signOut({ callbackUrl: "/login", redirect: true });
    } catch (err) {
      console.error("SignOut error:", err);
      window.location.href = "/login";
    }
  };
  const [scrolled, setScrolled] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const mainNavItems: NavItem[] = [
    { href: "/dashboard", label: "Trang chủ", icon: Home },
    { href: "/dashboard/exams", label: "Làm đề", icon: FileText },
    { href: "/practice", label: "Luyện tập", icon: Target },
    { href: "/dashboard/exams/history", label: "Lịch sử", icon: History },
  ];

  const secondaryNavItems: NavItem[] = [
    { href: "/dashboard/insights", label: "Báo cáo", icon: BarChart3 },
    { href: "/payment", label: "Gói cước & Nạp tiền", icon: Coins },
  ];

  const isStaffOrAdmin = userRole === "TEACHER" || userRole === "ADMIN";

  const extraNavItems: NavItem[] = [
    ...(isStaffOrAdmin ? [{ href: "/lesson-plans/review", label: "Thẩm định giáo án (AI)", icon: Brain }] : []),
    { href: "/licenses/activate", label: "Kích hoạt Key", icon: Shield },
  ];

  const isAdmin = userRole === "ADMIN";

  const allSecondaryItems = [
    ...secondaryNavItems,
    ...extraNavItems,
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const NavLink = ({
    item,
    className = "",
    showIcon = true,
  }: {
    item: NavItem;
    className?: string;
    showIcon?: boolean;
  }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`
          group flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
          transition-all duration-200 whitespace-nowrap
          ${active
            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--kraft)]"
          }
          ${className}
        `}
      >
        {showIcon && <Icon className="h-4 w-4 opacity-80 flex-shrink-0" />}
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <nav
        className={`
          sticky top-0 z-[100] w-full border-b transition-all duration-300
          ${scrolled
            ? "bg-card/95 backdrop-blur-md border-border shadow-md"
            : "bg-card border-transparent"
          }
        `}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">

            {/* Logo Section */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 flex-shrink-0 group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-[var(--foreground-inverted)] shadow-lg transition-transform group-hover:scale-105 group-hover:shadow-xl">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span
                className="text-xl font-bold tracking-tight text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                VCGo
              </span>
            </Link>

            {/* Center Navigation - Desktop */}
            <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {/* Main Nav */}
              <div className="flex items-center gap-0.5">
                {mainNavItems.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>

              {/* Divider */}
              <div className="mx-2 h-6 w-px bg-[var(--border)]" />

              {/* Secondary Nav with Dropdown */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${showMoreMenu
                      ? "bg-[var(--kraft)] text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--kraft)]"
                    }
                  `}
                >
                  <span>Thêm</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${showMoreMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {showMoreMenu && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[var(--surface)] rounded-xl shadow-xl border border-[var(--border)] z-50 py-2 animate-fade">
                    {allSecondaryItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setShowMoreMenu(false)}
                          className={`
                            flex items-center gap-3 px-4 py-2.5 mx-2 text-sm rounded-lg
                            transition-colors
                            ${isActive(item.href)
                              ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                              : "text-[var(--foreground)] hover:bg-[var(--kraft)]"
                            }
                          `}
                        >
                          <Icon className="h-4 w-4 opacity-70" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}

                    {/* Admin Panel Link */}
                    {isStaffOrAdmin && (
                      <>
                        <div className="my-2 border-t border-[var(--border)]" />
                        <Link
                          href="/admin"
                          onClick={() => setShowMoreMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 mx-2 text-sm rounded-lg text-[var(--foreground)] hover:bg-[var(--kraft)] transition-colors"
                        >
                          <Shield className="h-4 w-4 opacity-70 text-[var(--primary)]" />
                          <span className="font-medium">Quản trị</span>
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Spacer for centering */}
            <div className="hidden lg:block flex-1" />

            {/* Right Actions - Desktop */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">

              {/* Notifications */}
              <button className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--kraft)] hover:text-[var(--foreground)] transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--danger)] rounded-full animate-pulse" />
              </button>

              {/* Quick Payment Button */}
              <Link
                href="/payment"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--warning-soft)] text-[var(--warning)] hover:bg-[var(--warning)]/20 transition-colors"
              >
                <Coins className="h-4 w-4" />
                <span className="text-sm font-medium">Gói cước</span>
              </Link>

              {/* User Profile Dropdown */}
              {userName && (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--kraft)] transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-sm font-bold border-2 border-[var(--primary)]/20 shadow-sm hover:border-[var(--primary)]/40 transition-colors">
                      {getInitials(userName)}
                    </div>
                    <span className="text-sm font-medium text-[var(--foreground)] max-w-[120px] truncate">
                      {userName}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-2 w-60 bg-[var(--surface)] rounded-xl shadow-xl border border-[var(--border)] z-50 py-2 animate-fade">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-[var(--border)]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-sm font-bold border-2 border-[var(--primary)]/20">
                            {getInitials(userName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                              {userName}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                              <Zap className="h-3 w-3 text-[var(--warning)]" />
                              <span className="capitalize">{userRole?.toLowerCase()}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 mx-2 text-sm rounded-lg text-[var(--foreground)] hover:bg-[var(--kraft)] transition-colors"
                        >
                          <User className="h-4 w-4 opacity-70" />
                          <span>Hồ sơ</span>
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 mx-2 text-sm rounded-lg text-[var(--foreground)] hover:bg-[var(--kraft)] transition-colors"
                        >
                          <Settings className="h-4 w-4 opacity-70" />
                          <span>Cài đặt</span>
                        </Link>

                        {isStaffOrAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 mx-2 text-sm rounded-lg text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors"
                          >
                            <Shield className="h-4 w-4" />
                            <span>Quản trị</span>
                          </Link>
                        )}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-[var(--border)] pt-1 pb-1 mt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="flex items-center gap-3 px-4 py-2.5 mx-2 text-sm rounded-lg text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors w-full disabled:opacity-50 text-left"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>{loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-2">
              {/* Mobile Notifications */}
              <button className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--kraft)] hover:text-[var(--foreground)] transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--danger)] rounded-full animate-pulse" />
              </button>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--kraft)] transition-colors"
              >
                {showMobileMenu ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-[var(--surface)] shadow-2xl z-[100] lg:hidden overflow-y-auto animate-slide-in-right">
            {/* Menu Header */}
            <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-[var(--foreground-inverted)] shadow-lg">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
                      VCGo
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">Xin chào, {userName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--kraft)] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* User Info Card */}
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--kraft)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-base font-bold border-2 border-[var(--primary)]/20">
                  {getInitials(userName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] capitalize">
                    {userRole?.toLowerCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="p-3">
              {/* Main Nav */}
              <div className="mb-3">
                <p className="px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Menu chính
                </p>
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMobileMenu(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                        transition-colors mb-1
                        ${active
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                          : "text-[var(--foreground)] hover:bg-[var(--kraft)]"
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 opacity-80" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Secondary Nav */}
              <div className="mb-3">
                <p className="px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Tiện ích
                </p>
                {allSecondaryItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--foreground)] hover:bg-[var(--kraft)] transition-colors mb-1"
                    >
                      <Icon className="h-5 w-5 opacity-70" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Admin Link */}
              {isStaffOrAdmin && (
                <div className="mb-3">
                  <p className="px-3 py-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                    Quản trị
                  </p>
                  <Link
                    href="/admin"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--primary)] bg-[var(--primary-soft)] hover:bg-[var(--primary-soft)]/70 transition-colors mb-1"
                  >
                    <Shield className="h-5 w-5" />
                    <span>Admin Panel</span>
                  </Link>
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t border-[var(--border)] pt-3 mt-3">
                <Link
                  href="/payment"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--warning)] bg-[var(--warning-soft)] hover:bg-[var(--warning-soft)]/70 transition-colors mb-1"
                >
                  <Coins className="h-5 w-5" />
                  <span>Gói cước & Nạp tiền</span>
                </Link>
              </div>
            </nav>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] p-4">
              <div className="flex gap-2">
                <Link
                  href="/profile"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-[var(--foreground)] bg-[var(--kraft)] hover:bg-[var(--kraft)]/80 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Hồ sơ</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-[var(--danger)] bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)]/70 transition-colors disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{loggingOut ? "Đang thoát..." : "Đăng xuất"}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
