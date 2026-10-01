"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Briefcase } from "lucide-react";

interface Recruitment {
  id: string;
  title: string;
  organization: string;
  province: string;
  totalQuota: number;
  applicationEndDate: string | null;
  status: string;
}

function NotificationTickerInner() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const textRef = useRef<HTMLParagraphElement>(null);

  // ── Fetch recruitments ───────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/recruitment")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.length > 0) {
          setRecruitments(d.data);
        }
      })
      .catch(() => {});
  }, []);

  // ── Overflow detection ───────────────────────────────────────────────────
  const checkOverflow = useCallback(() => {
    if (textRef.current) {
      setShouldScroll(textRef.current.scrollWidth > textRef.current.clientWidth + 4);
    }
  }, []);

  useEffect(() => {
    setShouldScroll(false);
    const timer = setTimeout(checkOverflow, 200);
    return () => clearTimeout(timer);
  }, [currentIndex, checkOverflow]);

  // ── Auto-rotate ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (recruitments.length <= 1 || isPaused || isCollapsed) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % recruitments.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [recruitments.length, isPaused, isCollapsed]);

  if (recruitments.length === 0) return null;

  const current = recruitments[currentIndex];
  const currentQuota = current.totalQuota;
  const daysLeft = current.applicationEndDate
    ? Math.ceil((new Date(current.applicationEndDate).getTime() - Date.now()) / 86400000)
    : 999;
  const label = daysLeft <= 0 ? "Da dong" : daysLeft <= 15 ? `${daysLeft} ngay con` : `${currentQuota} chi tieu`;

  return (
    <div
      className="mx-3 sm:mx-4 my-2 rounded-lg border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-red-500/10 backdrop-blur-sm transition-all duration-300 overflow-hidden"
      role="region"
      aria-label={`${currentQuota} chi tieu - ${current.title}`}
    >
      {/* Expanded content */}
      <div
        className="flex items-center"
        style={{ display: isCollapsed ? "none" : "flex" }}
      >
        {/* Section 1: Count badge */}
        <div className="flex-shrink-0 flex items-center justify-center px-2.5 sm:px-3 py-2 sm:py-2.5 border-r border-orange-500/20">
          <div className="flex flex-col items-center min-w-[2rem] sm:min-w-[2.5rem]">
            <span className="text-sm sm:text-base font-black text-orange-600 dark:text-orange-400 leading-none tabular-nums">
              {currentQuota}
            </span>
            <span className="text-[8px] sm:text-[9px] font-semibold text-orange-500/80 dark:text-orange-400/70 uppercase tracking-wide mt-0.5">
              Chi tieu
            </span>
          </div>
        </div>

        {/* Section 2: Marquee text */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Link href="/recruitment" className="block group">
            <div
              className={`relative overflow-hidden ${shouldScroll ? "notification-marquee-container" : ""}`}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <p
                ref={textRef}
                key={`${current.id}-${currentIndex}`}
                className={`text-[11px] xs:text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 whitespace-nowrap ${shouldScroll && !isPaused ? "notification-marquee" : "inline-block"} px-3 py-2 sm:py-2.5`}
              >
                {current.title} · {current.organization} · {label} · {current.province}
              </p>
            </div>
          </Link>
        </div>

        {/* Section 3: Collapse button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-500/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-r-lg"
            aria-label="Thu gon thong bao"
          >
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Collapsed header */}
      <div
        className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 cursor-pointer"
        style={{ display: isCollapsed ? "flex" : "none" }}
        onClick={() => setIsCollapsed(false)}
        role="button"
        aria-expanded={!isCollapsed}
        aria-label="Mo rong thong bao tuyen dung"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setIsCollapsed(false); }}
      >
        <div className="flex items-center gap-2">
          <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" aria-hidden="true" />
          <span className="text-[10px] sm:text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
            Tuyen dung
          </span>
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] sm:text-xs font-black text-orange-600 dark:text-orange-400 tabular-nums leading-none">
            {currentQuota}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" aria-hidden="true" />
      </div>
    </div>
  );
}

export default memo(NotificationTickerInner);
