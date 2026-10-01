'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, Menu, X } from 'lucide-react';
import Link from 'next/link';

const links = [
  { label: 'Đề thi', href: '/practice' },
  { label: 'Khóa học', href: '/dashboard/exams' },
  { label: 'Bảng giá', href: '#pricing' },
  { label: 'FAQ', href: '/faq' },
];

export function ModernNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-border bg-card/80 backdrop-blur-xl shadow-elevated'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-subtle group-hover:scale-105 group-hover:shadow-elevated transition-transform duration-200" aria-hidden="true">
            <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-foreground tracking-tight">
            VCGo Education
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <button
              className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold rounded-lg text-foreground hover:bg-accent/50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background touch-action-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Đăng Nhập
            </button>
          </Link>
          <Link href="/register">
            <button
              className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-transform duration-200 shadow-elevated hover:shadow-lifted hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background touch-action-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Bắt Đầu Học
            </button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-accent/50 transition-colors md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-action-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-card md:hidden shadow-lifted animate-fade-in-scale" style={{ overscrollBehavior: 'contain' }}>
          <nav className="container mx-auto flex flex-col gap-1 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-border">
              <Link href="/login">
                <button
                  className="w-full inline-flex items-center justify-center h-11 px-4 text-sm font-semibold rounded-lg text-foreground hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-action-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Đăng Nhập
                </button>
              </Link>
              <Link href="/register">
                <button
                  className="w-full inline-flex items-center justify-center h-11 px-4 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all duration-200 shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-action-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Bắt Đầu Học
                </button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
