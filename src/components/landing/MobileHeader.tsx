'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, Menu, X, Bell } from 'lucide-react';
import Link from 'next/link';

interface RecruitmentPost {
  id: string;
  title: string;
  organization: string;
  totalQuota: number;
  province: string;
  applicationEndDate: string | null;
}

const STORAGE_KEY = 'recruitment_banner_dismissed';

export function MobileHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recruitmentPosts, setRecruitmentPosts] = useState<RecruitmentPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize from localStorage synchronously
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('/api/admin/recruitment?active=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setRecruitmentPosts(data.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (recruitmentPosts.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % recruitmentPosts.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [recruitmentPosts.length]);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const currentPost = recruitmentPosts[currentIndex];
  const daysLeft = currentPost?.applicationEndDate
    ? Math.ceil((new Date(currentPost.applicationEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-border/50 bg-background/95 backdrop-blur-lg shadow-sm'
            : 'bg-background/80 backdrop-blur-md'
        }`}
      >
        {/* Top Bar - Logo & Menu */}
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-foreground text-sm sm:text-base tracking-tight">
              VCGo Education
            </span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Recruitment Badge (if posts exist) */}
            {recruitmentPosts.length > 0 && !bannerDismissed && (
              <Link
                href="/recruitment"
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border border-violet-500/30 px-2.5 py-1 mr-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-500/30 transition-colors"
              >
                <Bell className="h-3 w-3" />
                <span className="hidden sm:inline">Tuyển dụng</span>
                <span className="sm:hidden">{currentPost?.totalQuota}+</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-action-manipulation"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Announcement Ticker (Mobile) */}
        {recruitmentPosts.length > 0 && !bannerDismissed && (
          <div className="border-b border-violet-500/20 bg-gradient-to-r from-violet-950/30 to-indigo-950/30">
            <div className="container mx-auto px-4 py-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-xs">
                  📢
                </span>
                <Link
                  href="/recruitment"
                  className="flex-1 min-w-0 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  <span className="font-semibold text-violet-300">{currentPost?.organization}</span>
                  <span className="mx-1.5 text-slate-500">•</span>
                  <span>Tuyển <strong className="text-violet-200">{currentPost?.totalQuota}</strong> chỉ tiêu</span>
                  {daysLeft > 0 && (
                    <>
                      <span className="mx-1.5 text-slate-500">•</span>
                      <span className="inline-flex items-center rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300">
                        Còn {daysLeft} ngày
                      </span>
                    </>
                  )}
                </Link>
                <button
                  onClick={handleDismissBanner}
                  className="flex-shrink-0 rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
                  aria-label="Đóng thông báo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-background shadow-xl animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="font-bold text-foreground">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Links */}
            <nav className="flex flex-col gap-1 p-3">
              {[
                { label: 'Trang chủ', href: '/' },
                { label: 'Đề thi', href: '/practice' },
                { label: 'Khóa học', href: '/dashboard/exams' },
                { label: 'Phân tích giáo án', href: '/lesson-plans' },
                { label: 'Tuyển dụng', href: '/recruitment' },
                { label: 'FAQ', href: '/faq' },
                { label: 'Góp ý', href: '/feedback' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Menu Footer */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
              <div className="flex flex-col gap-3">
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  <button className="w-full h-11 rounded-lg border border-border bg-background text-foreground font-semibold hover:bg-accent transition-colors">
                    Đăng Nhập
                  </button>
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)}>
                  <button className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all">
                    Bắt Đầu Học
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in-left {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
