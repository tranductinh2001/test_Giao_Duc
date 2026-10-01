"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import Link from "next/link";
import { gsap } from "gsap";
import { FileText, Target, ChevronDown } from "lucide-react";

interface QuickActionItem {
  label: string;
  subLabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
}

const QUICK_ITEMS: QuickActionItem[] = [
  { label: "Làm đề", subLabel: "Thi thử online", href: "/dashboard/exams", icon: FileText, bgColor: "#3b82f6" },
  { label: "Luyện tập", subLabel: "Luyện theo chủ đề", href: "/practice", icon: Target, bgColor: "#10b981" },
];

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [buttonPos, setButtonPos] = useState({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      setShowDropdown(true);
    }
    setIsOpen(!isOpen);
  };

  // Get button position for portal
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPos({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [isOpen]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        const dropdown = document.getElementById("quick-actions-dropdown");
        if (dropdown && !dropdown.contains(e.target as Node)) {
          setIsOpen(false);
        }
      }
    };
    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  // GSAP Animation - ReactBits bubble style
  useEffect(() => {
    if (!mounted || !showDropdown || !dropdownRef.current) return;

    const items = itemRefs.current.filter(Boolean);
    if (!items.length) return;

    // Initial state
    gsap.set(items, { scale: 0, opacity: 0, transformOrigin: "50% 50%" });

    // Animate items with stagger - ReactBits style
    items.forEach((item, i) => {
      if (!item) return;
      const tl = gsap.timeline({ delay: i * 0.1 });
      tl.to(item, {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: "back.out(1.7)"
      });
    });

    return () => {
      gsap.killTweensOf(items);
    };
  }, [showDropdown, mounted]);

  // Close animation
  useEffect(() => {
    if (mounted && !isOpen && showDropdown) {
      const items = itemRefs.current.filter(Boolean);
      if (!items.length) return;

      gsap.to(items, {
        scale: 0,
        opacity: 0,
        duration: 0.2,
        ease: "power3.in",
        stagger: 0.05,
        onComplete: () => {
          setShowDropdown(false);
        }
      });
    }
  }, [isOpen, showDropdown, mounted]);

  const dropdownPortal = (
    <div
      id="quick-actions-dropdown"
      ref={dropdownRef}
      className="fixed w-52 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-[99999]"
      style={{
        top: buttonPos.top,
        left: buttonPos.left,
        display: showDropdown ? "block" : "none"
      }}
    >
      <div className="py-2 bg-white dark:bg-zinc-800">
        {QUICK_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              ref={el => { itemRefs.current[idx] = el; }}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-xl hover:scale-[1.02] transition-transform"
              style={{
                background: item.bgColor,
                color: "#ffffff"
              }}
            >
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">{item.label}</div>
                <div className="text-xs" style={{ opacity: 0.8 }}>{item.subLabel}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-[var(--foreground-inverted)] text-xs font-bold shadow-md hover:shadow-lg hover:brightness-110 transition-all active:scale-95"
        aria-label={isOpen ? "Đóng" : "Học ngay"}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
        </svg>
        <span className="whitespace-nowrap">Học ngay</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Render dropdown via Portal */}
      {mounted && ReactDOM.createPortal(dropdownPortal, document.body)}
    </div>
  );
}
