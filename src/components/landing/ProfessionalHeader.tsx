'use client';

import { useEffect, useState, useCallback } from 'react';
import { GraduationCap, Menu, X, Sparkles, LogOut, User } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface RecruitmentPost {
  id: string;
  title: string;
  organization: string;
  totalQuota: number;
  province: string;
  applicationEndDate: string | null;
}

const LINKS = [
  { label: 'Đề thi', href: '/practice' },
  { label: 'Thẩm định giáo án (AI)', href: '/lesson-plans/review' },
  { label: 'Khóa học', href: '/dashboard/exams' },
  { label: 'Tuyển dụng', href: '/recruitment' },
  { label: 'FAQ', href: '/faq' },
];

const MOBILE_LINKS = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Đề thi', href: '/practice' },
  { label: 'Thẩm định giáo án (AI)', href: '/lesson-plans/review' },
  { label: 'Khóa học', href: '/dashboard/exams' },
  { label: 'Tuyển dụng', href: '/recruitment' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Góp ý', href: '/feedback' },
];

export function ProfessionalHeader() {
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recruitmentPosts, setRecruitmentPosts] = useState<RecruitmentPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('recruitment_banner_dismissed') === 'true';
    }
    return false;
  });

  const hasAnnouncement = recruitmentPosts.length > 0 && !bannerDismissed;
  const headerTop = hasAnnouncement ? 'calc(2rem + env(safe-area-inset-top, 0px))' : 'env(safe-area-inset-top, 0px)';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [mobileMenuOpen]);

  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('recruitment_banner_dismissed', 'true');
    }
  }, []);

  const currentPost = recruitmentPosts[currentIndex];
  const daysLeft = currentPost?.applicationEndDate
    ? Math.ceil((new Date(currentPost.applicationEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      {/* Announcement Bar - Premium Glassmorphism */}
      {hasAnnouncement && (
        <div
          className="fixed inset-x-0 top-0 z-[60] border-b border-white/10 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900"
          style={{
            maxWidth: '100vw',
            overflowX: 'hidden'
          }}
        >
          {/* Animated shimmer effect */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          />
          <div className="relative flex items-center justify-between gap-1 sm:gap-2 h-8 sm:h-10 px-3 sm:px-4">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-white/90 flex-shrink-0 animate-pulse" />
              <Link
                href="/recruitment"
                className="flex items-center gap-1 min-w-0 text-[10px] xs:text-xs sm:text-sm text-white hover:text-white/90 transition-all duration-200 truncate"
              >
                <span className="font-bold text-white/95 truncate max-w-[80px] xs:max-w-[100px] sm:max-w-none">
                  {currentPost?.organization}
                </span>
                <span className="hidden xs:inline text-white/60">•</span>
                <span className="hidden xs:inline text-white/80 truncate">
                  <strong className="text-white">{currentPost?.totalQuota}</strong> vị trí
                </span>
                {daysLeft > 0 && (
                  <>
                    <span className="hidden sm:inline text-white/60">•</span>
                    <span className="hidden sm:inline rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
                      Còn {daysLeft} ngày
                    </span>
                  </>
                )}
              </Link>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {recruitmentPosts.length > 1 && (
                <div className="hidden sm:flex gap-1">
                  {recruitmentPosts.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={handleDismissBanner}
                className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-white/70 hover:bg-white/20 hover:text-white transition-all duration-200"
                aria-label="Đóng thông báo"
              >
                <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header - Glassmorphism with Border */}
      <header
        className={`z-50 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-2xl border-b border-border/50 shadow-lg shadow-black/5'
            : 'bg-background/60 backdrop-blur-xl border-b border-transparent'
        }`}
        style={{
          position: 'fixed',
          top: headerTop,
          left: 0,
          right: 0,
          width: '100%',
          maxWidth: '100%',
          transition: 'background-color 0.5s ease, backdrop-filter 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease',
        }}
      >
        <div className="container mx-auto" style={{ maxWidth: '100%', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
          <div className="flex h-14 items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300"
              >
                <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-foreground tracking-tight hidden sm:inline group-hover:text-primary transition-colors duration-200">
                VCGo Education
              </span>
            </Link>

            {/* Mobile: Recruitment Banner + Spacer + Hamburger */}
            <div className="flex flex-1 items-center gap-2 lg:hidden">
              {/* Mobile Recruitment Banner - more prominent */}
              {hasAnnouncement && (
                <Link
                  href="/recruitment"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-950/50 dark:hover:to-orange-950/50 transition-all shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse flex-shrink-0" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {currentPost?.organization}
                  </span>
                </Link>
              )}

              {/* Practice Button - Mobile */}
              <Link
                href="/practice"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-md hover:brightness-110 transition-all flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Luyện thi</span>
              </Link>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Mobile Hamburger */}
              <button
                aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent/50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
                onClick={() => setMobileMenuOpen((o) => !o)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Desktop Navigation - Underline style */}
            <nav className="hidden items-center gap-1 lg:flex">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 px-4 py-2 group"
                >
                  {link.label}
                  <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                </Link>
              ))}
            </nav>

            {/* Desktop CTAs - Premium buttons */}
            <div className="hidden items-center gap-3 lg:flex ml-4">
              {status === 'loading' ? (
                <div className="h-10 w-24 animate-pulse rounded-xl bg-muted" />
              ) : session ? (
                <>
                  <Link href={session.user.role === 'ADMIN' ? '/admin' : '/dashboard'}>
                    <button className="h-10 px-5 text-sm font-semibold rounded-xl text-foreground hover:bg-accent/80 transition-all duration-200 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{session.user.name || 'Dashboard'}</span>
                    </button>
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="h-10 px-5 text-sm font-semibold rounded-xl text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] bg-primary flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng Xuất
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <button className="h-10 px-5 text-sm font-semibold rounded-xl text-foreground hover:bg-accent/80 transition-all duration-200 relative overflow-hidden group">
                      <span className="relative z-10">Đăng Nhập</span>
                    </button>
                  </Link>
                  <Link href="/register">
                    <button
                      className="h-10 px-5 text-sm font-semibold rounded-xl text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] bg-primary"
                    >
                      Bắt Đầu Học
                    </button>
                  </Link>
                </>
              )}
            </div>

            {/* Desktop-only CTA ends here - mobile hamburger is inside the mobile wrapper */}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[70]"
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="flex flex-col bg-white dark:bg-zinc-900 shadow-xl overflow-hidden"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '85vw',
              maxWidth: '320px',
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="flex-shrink-0 flex h-14 items-center justify-between border-b border-border/50 px-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                >
                  <GraduationCap className="h-4 w-4" />
                </div>
                <span className="font-bold text-foreground">VCGo Education</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent/50 transition-colors duration-200"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Links */}
            <nav className="flex-1 overflow-y-auto p-3 scrollbar-hide overflow-auto">
              {MOBILE_LINKS.map((link, idx) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-all duration-200 flex items-center gap-3 group"
                  style={{ animation: `fadeInUp 0.3s ease-out ${idx * 0.05}s both` }}
                >
                  {link.label === 'Trang chủ' && <span className="text-base">🏠</span>}
                  {link.label === 'Đề thi' && <span className="text-base">📝</span>}
                  {link.label === 'Khóa học' && <span className="text-base">📚</span>}
                  {link.label === 'Phân tích giáo án' && <span className="text-base">🤖</span>}
                  {link.label === 'Tuyển dụng' && <span className="text-base">📢</span>}
                  {link.label === 'FAQ' && <span className="text-base">❓</span>}
                  {link.label === 'Góp ý' && <span className="text-base">💬</span>}
                  <span className="group-hover:translate-x-1 transition-transform duration-200">{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Menu Footer */}
            <div className="flex-none border-t border-border/50 bg-background/80 backdrop-blur-xl p-5">
              <div className="flex flex-col gap-3">
                {status === 'loading' ? (
                  <div className="flex flex-col gap-3">
                    <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
                    <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
                  </div>
                ) : session ? (
                  <>
                    <Link href={session.user.role === 'ADMIN' ? '/admin' : '/dashboard'} onClick={() => setMobileMenuOpen(false)}>
                      <button className="w-full h-12 rounded-xl border-2 border-border bg-background text-foreground font-semibold hover:bg-accent/50 transition-all duration-200 text-sm flex items-center justify-center gap-2">
                        <User className="w-4 h-4" />
                        Dashboard
                      </button>
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full h-12 rounded-xl text-primary-foreground font-semibold transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-primary/20 text-sm flex items-center justify-center gap-2 bg-primary"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng Xuất
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <button className="w-full h-12 rounded-xl border-2 border-border bg-background text-foreground font-semibold hover:bg-accent/50 transition-all duration-200 text-sm">
                        Đăng Nhập
                      </button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      <button
                        className="w-full h-12 rounded-xl text-primary-foreground font-semibold transition-all duration-300 hover:-translate-y-0.5 shadow-lg shadow-primary/20 text-sm bg-primary"
                      >
                        Bắt Đầu Học
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
