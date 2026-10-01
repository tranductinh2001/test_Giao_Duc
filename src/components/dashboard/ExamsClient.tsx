"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BookOpen, Clock, TrendingUp, Settings, Trash2, Search, X, Filter, SlidersHorizontal } from "lucide-react";
import Button from "@/components/ui/button";
import { AnimatedCard, FadeInWhenVisible } from "@/components/motion";
import DeleteCustomExamButton from "@/components/DeleteCustomExamButton";

interface ExamData {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number;
  isCustom: boolean;
  category?: { name: string } | null;
  _count: { examQuestions: number; attempts: number };
}

interface RecentAttempt {
  score: number;
  correctCount: number;
  totalCount: number;
  submittedAt: string | Date | null;
  exam: { title: string };
}

interface Props {
  initialExams: ExamData[];
  initialCustomExams: ExamData[];
  initialRecentAttempt: RecentAttempt | null;
  totalAttempts: number;
}

export default function ExamsClient({
  initialExams,
  initialCustomExams,
  initialRecentAttempt,
  totalAttempts,
}: Props) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customExams, setCustomExams] = useState(initialCustomExams);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    initialExams.forEach(exam => {
      if (exam.category?.name) cats.add(exam.category.name);
    });
    return Array.from(cats);
  }, [initialExams]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Filter exams
  const filteredExams = useMemo(() => {
    let result = initialExams;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        exam =>
          exam.title.toLowerCase().includes(query) ||
          exam.description?.toLowerCase().includes(query) ||
          exam.category?.name?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter(exam => exam.category?.name === selectedCategory);
    }

    return result;
  }, [initialExams, searchQuery, selectedCategory]);

  // Filter custom exams
  const filteredCustomExams = useMemo(() => {
    if (!searchQuery) return customExams;
    const query = searchQuery.toLowerCase();
    return customExams.filter(
      exam =>
        exam.title.toLowerCase().includes(query) ||
        exam.description?.toLowerCase().includes(query)
    );
  }, [customExams, searchQuery]);

  // Clear search
  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const recentAttempt = initialRecentAttempt;

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden">
      <div className="container mx-auto max-w-[1600px] px-4 py-4 sm:py-6 lg:py-8 space-y-6 lg:space-y-8 max-w-full">
        {/* Header Section */}
        <div className="paper rounded-2xl sm:rounded-xl p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-[var(--primary-soft)]" aria-hidden="true">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary)]" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
                    Trung Tâm Thi Thử
                  </h1>
                  <p className="text-xs sm:text-sm text-[var(--muted)] hidden sm:block">
                    Chọn đề thi để luyện tập và nâng cao năng lực
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link href="/dashboard/exams/custom">
                <Button variant="primary" size="sm" leftIcon={<Settings className="w-4 h-4" aria-hidden="true" />}>
                  <span className="hidden sm:inline">Tự Thiết Kế Đề</span>
                  <span className="sm:hidden">Tự Tạo</span>
                </Button>
              </Link>
              <Link href="/dashboard/insights">
                <Button variant="secondary" size="sm">
                  <span className="hidden sm:inline">Báo Cáo Chi Tiết</span>
                  <span className="sm:hidden">Báo Cáo</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 sm:mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[var(--muted)]" aria-hidden="true" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm kiếm đề thi..."
                className="w-full h-11 sm:h-12 pl-10 sm:pl-12 pr-10 sm:pr-24 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] hover:border-[var(--primary)]/50 focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20 focus-visible:outline-none transition-colors text-sm sm:text-base"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchInput && (
                  <button
                    onClick={clearSearch}
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--kraft)] transition-colors"
                    aria-label="Xóa tìm kiếm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    showFilters || selectedCategory !== "all"
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--kraft)]"
                  }`}
                  aria-label="Bộ lọc"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--kraft)] animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4 text-[var(--muted)]" />
                  <span className="text-sm font-semibold text-[var(--foreground)]">Lọc theo danh mục</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      selectedCategory === "all"
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    Tất cả
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        selectedCategory === cat
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results Info */}
            {(searchQuery || selectedCategory !== "all") && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-[var(--muted)]">
                  Tìm thấy <span className="font-bold text-[var(--primary)]">{filteredExams.length}</span> đề thi
                  {searchQuery && (
                    <> cho từ khóa "<span className="font-semibold text-[var(--foreground)]">{searchQuery}</span>"</>
                  )}
                </p>
                {(searchQuery || selectedCategory !== "all") && (
                  <button
                    onClick={() => {
                      clearSearch();
                      setSelectedCategory("all");
                    }}
                    className="text-xs sm:text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="mt-4 sm:mt-6 lg:mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
            <AnimatedCard delay={0.1}>
              <div className="paper rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-[var(--shadow-lift)] transition-shadow">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[var(--primary-soft)] border border-[var(--primary)]/20" aria-hidden="true">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--foreground)] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                      {filteredExams.length}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium text-[var(--muted)]">Đề Có Sẵn</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.12}>
              <div className="paper rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-[var(--shadow-lift)] transition-shadow">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[var(--secondary-soft)] border border-[var(--secondary)]/20" aria-hidden="true">
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--secondary)]" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--foreground)] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                      {filteredCustomExams.length}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium text-[var(--muted)]">Đề Tự Tạo</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.14}>
              <div className="paper rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-[var(--shadow-lift)] transition-shadow">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[var(--primary-soft)] border border-[var(--primary)]/20" aria-hidden="true">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--foreground)] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                      {totalAttempts}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium text-[var(--muted)]">Lần Làm</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.16}>
              <div className="paper rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-[var(--shadow-lift)] transition-shadow">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[var(--warning-soft)] border border-[var(--warning)]/20" aria-hidden="true">
                    <span className="text-sm sm:text-lg font-bold text-[var(--warning)]">🏆</span>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--foreground)] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                      {recentAttempt ? `${Math.round(recentAttempt.score)}` : "—"}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium text-[var(--muted)]">Điểm Mới</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.18} className="hidden lg:block">
              <div className="paper rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-[var(--shadow-lift)] transition-shadow">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[var(--success-soft)] border border-[var(--success)]/20" aria-hidden="true">
                    <span className="text-sm sm:text-lg font-bold text-[var(--success)]">✓</span>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--foreground)] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                      {recentAttempt ? `${recentAttempt.correctCount}/${recentAttempt.totalCount}` : "—"}
                    </p>
                    <p className="text-[10px] sm:text-xs font-medium text-[var(--muted)]">Kết Quả</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </div>

          {recentAttempt && (
            <div className="mt-4 sm:mt-6 rounded-[var(--radius-md)] border border-[var(--success)]/20 bg-[var(--success-soft)] px-3 sm:px-5 py-3 sm:py-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--success)] mt-0.5 flex-shrink-0" aria-hidden="true">✓</div>
                <div className="flex-1 text-xs sm:text-sm min-w-0">
                  <p className="font-semibold text-[var(--foreground)] truncate">
                    Bài Làm: <span className="text-[var(--primary)]">{recentAttempt.exam.title}</span>
                  </p>
                  <p className="text-[var(--muted)] mt-0.5 sm:mt-1">
                    <span className="font-bold text-[var(--success)] tabular-nums">{Math.round(recentAttempt.score)} điểm</span>
                    {recentAttempt.submittedAt && (
                      <span className="ml-1 sm:ml-2">
                        • {new Date(recentAttempt.submittedAt).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Exam Listing */}
        {filteredExams.length === 0 && filteredCustomExams.length === 0 ? (
          <div className="paper rounded-xl p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kraft)] mx-auto mb-4" aria-hidden="true">
              <Search className="w-8 h-8 text-[var(--muted)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--foreground)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>Không Tìm Thấy Đề Thi</h3>
            <p className="text-sm text-[var(--muted)]">
              {searchQuery ? `Không có đề thi nào phù hợp với "${searchQuery}"` : "Hãy tự thiết kế đề thi của bạn hoặc chờ admin xuất bản đề thi."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* User's Custom Exams */}
            {filteredCustomExams.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
                    Đề Thi Tự Tạo Của Bạn
                  </h2>
                  <span className="text-sm font-medium text-[var(--muted)] tabular-nums">
                    {filteredCustomExams.length} đề thi
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {filteredCustomExams.map((exam, index) => (
                    <FadeInWhenVisible key={exam.id} delay={index * 0.05}>
                      <div className="paper rounded-xl p-4 sm:p-6 hover:shadow-[var(--shadow-lift)] hover:border-[var(--primary)]/40 transition-shadow duration-200 group">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-[var(--secondary-soft)] text-[var(--secondary)] border border-[var(--secondary)]/20">
                                Tự tạo
                              </span>
                            </div>

                            <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] leading-tight mb-1 sm:mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>
                              {exam.title}
                            </h3>

                            {exam.description && (
                              <p className="text-xs sm:text-sm text-[var(--muted)] line-clamp-2 leading-relaxed">
                                {exam.description}
                              </p>
                            )}
                          </div>

                          <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)] self-start">
                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                            <span className="text-xs sm:text-sm font-bold">{Math.round(exam.timeLimit / 60)}p</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-[var(--border)]">
                          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-[var(--muted)]">
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="font-bold text-[var(--foreground)]">{exam._count.examQuestions}</span> câu
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <DeleteCustomExamButton examId={exam.id} examTitle={exam.title} />
                            <Link href={`/exam/${exam.id}`}>
                              <Button variant="primary" size="sm">
                                Bắt Đầu
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </FadeInWhenVisible>
                  ))}
                </div>
              </div>
            )}

            {/* Published Exams */}
            {filteredExams.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
                    Đề Thi Có Sẵn
                  </h2>
                  <span className="text-sm font-medium text-[var(--muted)] tabular-nums">
                    {filteredExams.length} đề thi
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {filteredExams.map((exam, index) => (
                    <FadeInWhenVisible key={exam.id} delay={index * 0.05}>
                      <div className="paper rounded-xl p-4 sm:p-6 hover:shadow-[var(--shadow-lift)] hover:border-[var(--primary)]/40 transition-shadow duration-200 group">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-[var(--kraft)] text-[var(--foreground)]">
                                #{index + 1}
                              </span>
                              {exam.category && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/20">
                                  {exam.category.name}
                                </span>
                              )}
                            </div>

                            <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] leading-tight mb-1 sm:mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>
                              {exam.title}
                            </h3>

                            {exam.description && (
                              <p className="text-xs sm:text-sm text-[var(--muted)] line-clamp-2 leading-relaxed">
                                {exam.description}
                              </p>
                            )}
                          </div>

                          <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)] self-start">
                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                            <span className="text-xs sm:text-sm font-bold">{Math.round(exam.timeLimit / 60)}p</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-[var(--border)]">
                          <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-[var(--muted)]">
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="font-bold text-[var(--foreground)]">{exam._count.examQuestions}</span> câu
                            </span>
                            <span className="hidden sm:flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4" />
                              <span className="font-bold text-[var(--foreground)]">{exam._count.attempts}</span> lượt
                            </span>
                          </div>

                          <Link href={`/exam/${exam.id}`}>
                            <Button variant="primary" size="sm">
                              Bắt Đầu
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </FadeInWhenVisible>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
