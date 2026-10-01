"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

interface RecruitmentItem {
  id: string;
  title: string;
  organization: string;
  totalQuota: number;
  province: string;
  applicationEndDate: string | null;
}

const STORAGE_KEY = "recruitment_banner_dismissed";

export function RecruitmentBanner() {
  const pathname = usePathname();
  const [posts, setPosts] = useState<RecruitmentItem[]>([]);
  const [showBanner, setShowBanner] = useState(false); // Default to hidden
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Hide banner on admin pages, lesson-plans pages, and landing page
  const isExcludedPage = pathname === "/" || pathname?.startsWith("/admin") || pathname?.startsWith("/lesson-plans");

  // Load dismissed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== "true") {
      setShowBanner(true);
    }
    setHasInitialized(true);
  }, []);

  // Save dismissed state to localStorage
  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  useEffect(() => {
    // Only fetch if not admin page and not dismissed
    if (isExcludedPage || !hasInitialized || !showBanner) return;
    fetchPosts();
  }, [isExcludedPage, hasInitialized, showBanner]);

  useEffect(() => {
    if (posts.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % posts.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [posts.length]);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/admin/recruitment?active=true");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setPosts(data.data);
        setShowBanner(true);
      }
    } catch (error) {
      console.error("Fetch recruitment error:", error);
    }
  };

  if (isExcludedPage || !showBanner || posts.length === 0) return null;

  const currentPost = posts[currentIndex];
  const daysLeft = currentPost.applicationEndDate
    ? Math.ceil((new Date(currentPost.applicationEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  return (
    <div className="hidden lg:block relative overflow-hidden border-b border-violet-500/30 bg-gradient-to-r from-violet-950/40 to-indigo-950/40 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
              📢
            </span>
            <Link
              href="/recruitment"
              className="flex items-center gap-2 text-slate-200 transition hover:text-white"
            >
              <span className="font-semibold">{currentPost.organization}</span>
              <span className="hidden text-slate-400 sm:inline">•</span>
              <span className="text-slate-300">
                Tuyển <strong className="text-violet-300">{currentPost.totalQuota}</strong> chỉ tiêu
              </span>
              <span className="hidden text-slate-400 md:inline">•</span>
              <span className="hidden text-slate-400 md:inline">📍 {currentPost.province}</span>
              {daysLeft > 0 && (
                <>
                  <span className="hidden text-slate-400 lg:inline">•</span>
                  <span className="hidden rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-300 lg:inline">
                    Còn {daysLeft} ngày
                  </span>
                </>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {posts.length > 1 && (
              <div className="flex gap-1">
                {posts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentIndex
                        ? "w-6 bg-violet-400"
                        : "w-1.5 bg-slate-600 hover:bg-slate-500"
                    }`}
                  />
                ))}
              </div>
            )}

            <button
              onClick={handleDismiss}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
