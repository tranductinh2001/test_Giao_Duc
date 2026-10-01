"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatedContainer, AnimatedCard, FadeInWhenVisible } from "@/components/motion";
import {
  ArrowLeft,
  Settings,
  Clock,
  BookOpen,
  Sliders,
  AlertTriangle,
  CheckCircle,
  Play,
  Info
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  questionCount: number;
}

export default function CustomExamPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(60); // minutes
  const [totalQuestions, setTotalQuestions] = useState(40);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  // Set default title on mount
  useEffect(() => {
    const today = new Date().toLocaleDateString("vi-VN");
    setTitle(`Đề tự luyện - ${today}`);
  }, []);

  // Fetch categories available
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (data.success) {
          // Filter categories that have at least 1 approved question
          const activeCategories = data.data.filter((cat: any) => cat.questionCount > 0);
          setCategories(activeCategories);

          // Initialize percentages to 0
          const initialPercentages: Record<string, number> = {};
          activeCategories.forEach((cat: Category) => {
            initialPercentages[cat.id] = 0;
          });
          setPercentages(initialPercentages);
        } else {
          setError(data.message || "Không thể tải danh sách chuyên đề.");
        }
      } catch (err) {
        setError("Lỗi kết nối máy chủ khi lấy danh sách chuyên mục.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Calculate stats
  const totalPercentage = Object.values(percentages).reduce((sum, val) => sum + val, 0);

  // Calculate question count for each category based on percentage
  const getCalculatedCount = (categoryId: string) => {
    const pct = percentages[categoryId] || 0;
    return Math.round((pct / 100) * totalQuestions);
  };

  // Sum of calculated questions to ensure rounding doesn't cause a discrepancy
  const totalCalculatedQuestions = categories.reduce((sum, cat) => sum + getCalculatedCount(cat.id), 0);

  // Smart adjustment: if total exceeds due to rounding, adjust the largest categories
  const adjustedCounts: Record<string, number> = {};
  const rawCounts = categories.map((cat) => ({
    id: cat.id,
    count: getCalculatedCount(cat.id),
    percentage: percentages[cat.id] || 0,
  }));

  const currentTotal = totalCalculatedQuestions;
  const excess = currentTotal - totalQuestions;

  if (excess > 0) {
    // Sort by count descending to reduce from largest first
    const sorted = [...rawCounts].sort((a, b) => b.count - a.count);
    let remaining = excess;

    sorted.forEach((item) => {
      if (remaining > 0 && item.count > 0) {
        const reduction = Math.min(remaining, item.count);
        adjustedCounts[item.id] = item.count - reduction;
        remaining -= reduction;
      } else {
        adjustedCounts[item.id] = item.count;
      }
    });
  } else if (excess < 0) {
    // Add to largest categories
    const sorted = [...rawCounts].sort((a, b) => b.percentage - a.percentage);
    let remaining = Math.abs(excess);

    sorted.forEach((item) => {
      if (remaining > 0) {
        adjustedCounts[item.id] = item.count + 1;
        remaining--;
      } else {
        adjustedCounts[item.id] = item.count;
      }
    });
  } else {
    rawCounts.forEach((item) => {
      adjustedCounts[item.id] = item.count;
    });
  }

  const finalTotalQuestions = Object.values(adjustedCounts).reduce((sum, val) => sum + val, 0);

  // Validate if requested counts exceed database availability
  const validationErrors: string[] = [];
  categories.forEach((cat) => {
    const requested = adjustedCounts[cat.id] || 0;
    if (requested > cat.questionCount) {
      validationErrors.push(
        `Chuyên đề "${cat.name}" chỉ có ${cat.questionCount} câu hỏi, nhưng bạn yêu cầu ${requested} câu.`
      );
    }
  });

  const isPercentageValid = totalPercentage === 100;
  const isValid = isPercentageValid && validationErrors.length === 0 && title.trim().length > 0 && totalQuestions > 0 && timeLimit > 0;

  const handlePercentageChange = (categoryId: string, value: number) => {
    const cleanValue = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));
    setPercentages((prev) => ({
      ...prev,
      [categoryId]: cleanValue,
    }));
  };

  const handleDistributeEqually = () => {
    const visibleCategories = categories.filter((cat) =>
      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
    if (visibleCategories.length === 0) return;

    const count = visibleCategories.length;
    const basePercentage = Math.floor(100 / count);
    const remainder = 100 % count;

    const newPercentages: Record<string, number> = { ...percentages };
    visibleCategories.forEach((cat, idx) => {
      // Add remainder to the first category
      newPercentages[cat.id] = basePercentage + (idx === 0 ? remainder : 0);
    });
    setPercentages(newPercentages);
  };

  const handleResetPercentages = () => {
    const newPercentages: Record<string, number> = {};
    categories.forEach((cat) => {
      newPercentages[cat.id] = 0;
    });
    setPercentages(newPercentages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    // Build the query matrix
    const matrix = categories.map((cat) => ({
      categoryId: cat.id,
      count: adjustedCounts[cat.id] || 0,
    }));

    try {
      const res = await fetch("/api/exams/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          timeLimit,
          matrix,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Redirect directly to the exam attempt interface
        router.push(`/exam/${data.data.id}`);
      } else {
        if (data.error === "EXAM_LIMIT_REACHED") {
          setError(data.message || "Bạn đã đạt giới hạn tạo đề thi.");
        } else {
          setError(data.message || "Tạo đề tự luyện thất bại.");
        }
        setSubmitting(false);
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-[1600px] px-3 sm:px-4 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        {/* Back Navigation */}
        <Link
          href="/dashboard/exams"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Quay lại danh sách đề thi</span>
          <span className="sm:hidden">Quay lại</span>
        </Link>

        {/* Main Card */}
        <AnimatedContainer animation="fadeInDown">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 shadow-subtle border border-border">
          <div className="flex items-start gap-3 mb-4 sm:mb-6">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20">
              <Sliders className="h-5 w-5 sm:h-6 sm:w-6 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Tự Thiết Kế Đề</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                Tự định cấu hình đề thi thử theo chuyên mục mong muốn
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium flex items-start gap-2 sm:gap-3" role="alert" aria-live="polite">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-xs sm:text-sm">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status" aria-label="Đang tải"></div>
                <span className="text-muted-foreground font-medium">
                  Đang tải danh sách chuyên đề…
                </span>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted p-8 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-warning mb-4" aria-hidden="true" />
              <h3 className="text-lg font-bold text-foreground mb-2">Không Tìm Thấy Chuyên Mục Câu Hỏi Hợp Lệ</h3>
              <p className="text-sm text-muted-foreground">
                Hãy đảm bảo admin đã duyệt tối thiểu 1 câu hỏi trong hệ thống
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 mt-4 sm:mt-6 lg:mt-8">
              {/* Left Column - Configuration */}
              <div className="lg:col-span-5 space-y-4 sm:space-y-6">
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5 border border-border">
                  <div className="flex items-center gap-2 pb-2 sm:pb-3 border-b border-border">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" aria-hidden="true" />
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                      Cấu Hình
                    </h2>
                  </div>

                  <div>
                    <label htmlFor="exam-title" className="block text-[10px] sm:text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 sm:mb-2">
                      Tiêu Đề Đề Thi
                    </label>
                    <input
                      id="exam-title"
                      name="title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Nhập tiêu đề đề thi"
                      autoComplete="off"
                      className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-lg border border-border bg-background text-sm sm:text-base text-foreground hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none transition-colors duration-200"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label htmlFor="time-limit" className="block text-[10px] sm:text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 sm:mb-2 flex items-center gap-1">
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">Thời Gian</span>
                        <span className="sm:hidden">Thời gian</span>
                      </label>
                      <input
                        id="time-limit"
                        name="timeLimit"
                        type="number"
                        min="5"
                        max="180"
                        required
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                        autoComplete="off"
                        className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-lg border border-border bg-background text-sm sm:text-base text-foreground hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none transition-colors duration-200 tabular-nums"
                        style={{ WebkitTapHighlightColor: 'transparent', fontVariantNumeric: 'tabular-nums' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="total-questions" className="block text-[10px] sm:text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 sm:mb-2 flex items-center gap-1">
                        <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">Tổng Số Câu</span>
                        <span className="sm:hidden">Số câu</span>
                      </label>
                      <input
                        id="total-questions"
                        name="totalQuestions"
                        type="number"
                        min="1"
                        max="150"
                        required
                        value={totalQuestions}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setTotalQuestions(val);
                        }}
                        autoComplete="off"
                        className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-lg border border-border bg-background text-sm sm:text-base text-foreground hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none transition-colors duration-200 tabular-nums"
                        style={{ WebkitTapHighlightColor: 'transparent', fontVariantNumeric: 'tabular-nums' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Validation Status Panel */}
                <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-5 border border-border">
                  <div className="flex items-center gap-2 pb-2 sm:pb-3 border-b border-border">
                    <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary" aria-hidden="true" />
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                      Trạng Thái
                    </h2>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {/* Percentage Check */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted">
                      <span className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2">
                        {isPercentageValid ? (
                          <CheckCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-success" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-warning" aria-hidden="true" />
                        )}
                        <span className="hidden sm:inline">Tỷ Lệ</span>
                        <span className="sm:hidden">Tỷ lệ</span>
                      </span>
                      <span className={`text-base sm:text-lg font-bold tabular-nums ${isPercentageValid ? "text-success" : "text-warning"}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {totalPercentage}%
                      </span>
                    </div>

                    {/* Total Question Count */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted">
                      <span className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 sm:gap-2">
                        <CheckCircle className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-success" aria-hidden="true" />
                        <span className="hidden sm:inline">Tổng Câu</span>
                        <span className="sm:hidden">Câu</span>
                      </span>
                      <span className="text-base sm:text-lg font-bold text-foreground tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {finalTotalQuestions}
                      </span>
                    </div>
                  </div>

                  {/* Errors display */}
                  {validationErrors.length > 0 && (
                    <div className="space-y-1.5 sm:space-y-2 p-3 sm:p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-xs sm:text-sm text-destructive">
                      {validationErrors.map((err, idx) => (
                        <p key={idx} className="flex items-start gap-1.5 sm:gap-2">
                          <span className="mt-0.5">•</span>
                          <span>{err}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  {!isPercentageValid && (
                    <div className="flex items-start gap-2 p-3 sm:p-4 rounded-lg bg-warning/10 border border-warning/20 text-xs sm:text-sm text-warning">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>Tổng tỷ lệ phải đạt 100%</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isValid || submitting}
                    className={`w-full h-11 sm:h-12 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                      isValid && !submitting
                        ? "bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    aria-live="polite"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" role="status" aria-label="Đang xử lý"></div>
                        <span className="hidden sm:inline">Đang khởi tạo…</span>
                        <span className="sm:hidden">Đang tạo…</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" aria-hidden="true" />
                        Bắt Đầu
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column - Category Percentages */}
              <div className="lg:col-span-7 space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    Phân Bổ Câu Hỏi
                  </h2>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDistributeEqually}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border rounded-lg text-[10px] sm:text-xs font-medium hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      Chia Đều
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPercentages}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border rounded-lg text-[10px] sm:text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      Đặt Lại
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mb-3 sm:mb-4">
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Tìm chuyên đề..."
                    className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none transition-colors duration-200"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  />
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {categories
                    .filter((cat) =>
                      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                    )
                    .map((cat, index) => {
                    const pct = percentages[cat.id] || 0;
                    const calculatedCount = adjustedCounts[cat.id] || 0;
                    const isExceeded = calculatedCount > cat.questionCount;

                    return (
                      <FadeInWhenVisible key={cat.id} delay={index * 0.05}>
                        <div
                          className={`bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-3 sm:p-5 border transition-colors duration-200 ${
                            isExceeded
                              ? 'border-destructive/30 hover:border-destructive/50'
                              : pct > 0
                              ? 'border-primary/30 hover:border-primary/50'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-border'
                          }`}
                        >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm sm:text-base text-foreground truncate mb-0.5 sm:mb-1">
                              {cat.name}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              <span className="font-bold text-foreground">{cat.questionCount}</span> câu hỏi
                            </p>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
                            {pct > 0 && (
                              <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-lg tabular-nums ${
                                isExceeded
                                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                                  : "bg-primary/10 text-primary border border-primary/20"
                              }`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                = {calculatedCount}
                              </span>
                            )}

                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={pct || ""}
                                onChange={(e) => handlePercentageChange(cat.id, parseInt(e.target.value) || 0)}
                                autoComplete="off"
                                aria-label={`Tỷ lệ ${cat.name}`}
                                className="w-12 sm:w-16 h-8 sm:h-9 px-1.5 sm:px-2 bg-background border border-border rounded-lg text-center text-xs sm:text-sm font-bold text-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors duration-200 tabular-nums"
                                style={{ WebkitTapHighlightColor: 'transparent', fontVariantNumeric: 'tabular-nums' }}
                              />
                              <span className="text-xs sm:text-sm font-medium text-muted-foreground">%</span>
                            </div>
                          </div>
                        </div>

                        {/* Slider controls */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={pct}
                          onChange={(e) => handlePercentageChange(cat.id, parseInt(e.target.value))}
                          aria-label={`Thanh trượt ${cat.name}`}
                          className="w-full h-1.5 sm:h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        />
                      </div>
                  </FadeInWhenVisible>
                );
              })}
              </div>
              </div>
            </form>
          )}
          </div>
        </AnimatedContainer>
      </div>
    </div>
  );
}
