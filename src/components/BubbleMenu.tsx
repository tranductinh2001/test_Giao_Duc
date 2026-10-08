"use client";

import React, { useEffect, useRef, useState, CSSProperties } from "react";
import ReactDOM from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { FileText, Target, History, BarChart3, Megaphone, MessageSquare, HelpCircle, LogOut, Sun, Moon, X, Wallet, Key, User, Sparkles } from "lucide-react";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ariaLabel?: string;
  bgColor: string;
  textColor?: string;
};

const MENU_ITEMS: MenuItem[] = [
  { label: "Lịch sử", href: "/dashboard/exams/history", icon: History, bgColor: "#8b5cf6" },
  { label: "Báo cáo", href: "/dashboard/insights", icon: BarChart3, bgColor: "#f59e0b" },
  { label: "Tuyển dụng", href: "/recruitment", icon: Megaphone, bgColor: "#ec4899" },
  { label: "Góp ý", href: "/feedback", icon: MessageSquare, bgColor: "#06b6d4" },
  { label: "Trợ giúp", href: "/faq", icon: HelpCircle, bgColor: "#6366f1" },
];

interface BubbleMenuProps {
  userName?: string;
}

export default function BubbleMenu({ userName }: BubbleMenuProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const menuLinesRef = useRef<HTMLSpanElement[]>([]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const handleToggle = () => {
    const nextState = !isMenuOpen;
    if (nextState) setShowOverlay(true);
    setIsMenuOpen(nextState);
  };

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // GSAP Animation
  useEffect(() => {
    const overlay = overlayRef.current;
    const buttons = buttonRefs.current.filter(Boolean);
    const header = headerRef.current;
    const footer = footerRef.current;
    const closeBtn = closeBtnRef.current;
    const menuLines = menuLinesRef.current.filter(Boolean);

    if (!overlay) return;

    if (isMenuOpen) {
      gsap.set(overlay, { display: "flex" });

      // Animate hamburger to X
      if (menuLines[0]) gsap.to(menuLines[0], { y: 5, rotation: 45, duration: 0.3, ease: "power2.out" });
      if (menuLines[1]) gsap.to(menuLines[1], { y: -5, rotation: -45, duration: 0.3, ease: "power2.out" });
      if (menuLines[2]) gsap.to(menuLines[2], { scale: 0, duration: 0.2 });

      // Initial states
      gsap.set(buttons, { scale: 0, opacity: 0, y: 20, transformOrigin: "50% 50%" });
      gsap.set([header, footer], { y: 20, autoAlpha: 0 });
      gsap.set(closeBtn, { scale: 0, rotation: -90, transformOrigin: "50% 50%" });

      // Animate header
      gsap.to(header, { y: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out" });
      gsap.to(closeBtn, { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(1.7)", delay: 0.1 });
      gsap.to(footer, { y: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out", delay: 0.15 });

      // Animate buttons with stagger
      buttons.forEach((btn, i) => {
        if (!btn) return;
        const tl = gsap.timeline({ delay: i * 0.08 + 0.2 });
        tl.to(btn, {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "back.out(1.5)"
        });
      });
    } else if (showOverlay) {
      const menuLines = menuLinesRef.current.filter(Boolean);

      gsap.killTweensOf([...buttonRefs.current.filter(Boolean), header, footer, closeBtn, ...menuLines]);

      // Animate hamburger back
      if (menuLines[0]) gsap.to(menuLines[0], { y: 0, rotation: 0, duration: 0.3, ease: "power2.in" });
      if (menuLines[1]) gsap.to(menuLines[1], { y: 0, rotation: 0, duration: 0.3, ease: "power2.in" });
      if (menuLines[2]) gsap.to(menuLines[2], { scale: 1, duration: 0.3 });

      // Close animation
      gsap.to([header, footer, closeBtn], {
        scale: 0,
        autoAlpha: 0,
        duration: 0.2,
        ease: "power3.in"
      });

      gsap.to(buttonRefs.current.filter(Boolean), {
        scale: 0,
        opacity: 0,
        duration: 0.25,
        ease: "power3.in",
        stagger: 0.04,
        onComplete: () => {
          gsap.set(overlay, { display: "none" });
          setShowOverlay(false);
        }
      });
    }
  }, [isMenuOpen, showOverlay]);

  const menuOverlay = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999999] flex flex-col overflow-y-auto"
      style={{
        background: isDark ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.98)",
        backdropFilter: "blur(20px)",
        display: "none"
      }}
    >
      {/* Header */}
      <div
        ref={headerRef}
        className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
          >
            {userName?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-semibold text-[var(--foreground)]">{userName || "Người dùng"}</p>
            <p className="text-xs text-[var(--muted)]">Chào bạn!</p>
          </div>
        </div>
        <button
          ref={closeBtnRef}
          onClick={() => setIsMenuOpen(false)}
          className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <X className="w-5 h-5 text-[var(--muted)]" />
        </button>
      </div>

      {/* Quick Access */}
      <div className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Truy cập nhanh</p>
        <div className="flex gap-2">
          <Link
            href="/dashboard/exams"
            onClick={() => setIsMenuOpen(false)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm bg-[var(--primary)] text-[var(--foreground-inverted)]"
          >
            <FileText className="w-4 h-4" />
            <span>Làm đề</span>
          </Link>
          <Link
            href="/practice"
            onClick={() => setIsMenuOpen(false)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm bg-[var(--success)] text-[var(--foreground-inverted)]"
          >
            <Target className="w-4 h-4" />
            <span>Luyện tập</span>
          </Link>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 py-4 px-4">
        <div className="grid grid-cols-1 gap-2">
          {MENU_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={idx}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                ref={el => { buttonRefs.current[idx] = el; }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.01]"
                style={{
                  background: active ? item.bgColor : (isDark ? "#27272a" : "#f4f4f5"),
                  color: active ? "#ffffff" : (isDark ? "#e4e4e7" : "#18181b"),
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: active ? "rgba(255,255,255,0.2)" : item.bgColor }}
                >
                  <span style={{ color: active ? "#fff" : item.bgColor }}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
                <span className="font-medium text-sm">{item.label}</span>
                {item.href === "/recruitment" && (
                  <Sparkles className="w-3.5 h-3.5 ml-auto text-amber-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div ref={footerRef} className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        <div className="flex gap-2">
          <Link
            href="/licenses/activate"
            onClick={() => setIsMenuOpen(false)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#000" }}
          >
            <Key className="w-4 h-4" />
            <span>Kích hoạt Key</span>
          </Link>
          <Link
            href="/payment"
            onClick={() => setIsMenuOpen(false)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff" }}
          >
            <Wallet className="w-4 h-4" />
            <span>Nạp tiền</span>
          </Link>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              setIsDark(!isDark);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-sm bg-[var(--kraft)] text-[var(--foreground)]"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Sáng" : "Tối"}</span>
          </button>
          <Link
            href="/profile"
            onClick={() => setIsMenuOpen(false)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-sm bg-[var(--kraft)] text-[var(--foreground)]"
          >
            <User className="w-4 h-4" />
            <span>Hồ sơ</span>
          </Link>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            <span>Thoát</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Hamburger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-xl transition-all active:scale-95"
        aria-label="Menu"
        aria-pressed={isMenuOpen}
      >
        <div className="relative w-5 h-4">
          <span
            ref={el => { if (el) menuLinesRef.current[0] = el; }}
            className="absolute left-0 top-0 w-full h-0.5 bg-zinc-700 dark:bg-zinc-300 rounded-full"
            style={{ transform: isMenuOpen ? "translateY(5px) rotate(45deg)" : "translateY(0)" }}
          />
          <span
            ref={el => { if (el) menuLinesRef.current[1] = el; }}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-zinc-700 dark:bg-zinc-300 rounded-full"
            style={{ transform: isMenuOpen ? "translateY(-5px) rotate(-45deg)" : "translateY(-50%)" }}
          />
          <span
            ref={el => { if (el) menuLinesRef.current[2] = el; }}
            className="absolute left-0 bottom-0 w-full h-0.5 bg-zinc-700 dark:bg-zinc-300 rounded-full"
            style={{ transform: isMenuOpen ? "scale(0)" : "scale(1)", opacity: isMenuOpen ? 0 : 1 }}
          />
        </div>
      </button>

      {/* Render via Portal */}
      {mounted && showOverlay && ReactDOM.createPortal(menuOverlay, document.body)}
    </>
  );
}
