"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import UserNavbar from "@/components/user-navbar";
import Button from "@/components/ui/button";
import { AnimatedContainer, AnimatedCard, FadeInWhenVisible, CountingNumber } from "@/components/motion";
import {
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  Target,
  CheckCircle,
  XCircle,
  BarChart3,
  Calendar,
  ArrowRight,
  Search,
  X
} from "lucide-react";

interface ExamAttempt {
  id: string;
  score: number;
  correctCount: number;
  totalCount: number;
  startedAt: string;
  submittedAt: string | null;
  status: string;
  timeSpent: number | null;
  exam: {
    id: string;
    title: string;
    timeLimit: number;
  };
}

export default function ExamHistoryPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "passed" | "failed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchAttempts();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchAttempts = async () => {
    try {
      const res = await fetch("/api/user/attempts");
      const data = await res.json();

      if (data.success) {
        setAttempts(data.data);
      } else {
        setError(data.message || "Không thể tải lịch sử thi.");
      }
    } catch (err) {
      setError("Lỗi kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAttempts = attempts.filter((attempt) => {
    // Filter by status
    if (filter === "all") return true;
    if (filter === "passed") return attempt.score >= 50;
    if (filter === "failed") return attempt.score < 50;
    return true;
  }).filter((attempt) => {
    // Filter by search
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      attempt.exam.title.toLowerCase().includes(query) ||
      attempt.status.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: attempts.length,
    passed: attempts.filter((a) => a.score >= 50).length,
    failed: attempts.filter((a) => a.score < 50).length,
    avgScore: attempts.length > 0
      ? (attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length).toFixed(1)
      : "0",
    bestScore: attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0,
  };

  const getStatusBadge = (status: string, score: number) => {
    if (status === "IN_PROGRESS") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
          <Clock className="w-3 h-3" aria-hidden="true" />
          Đang Làm
        </span>
      );
    }
    if (status === "SYSTEM_SUBMITTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
          <Clock className="w-3 h-3" aria-hidden="true" />
          Hết Giờ
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
          <CheckCircle className="w-3 h-3" aria-hidden="true" />
          Đạt
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
        <XCircle className="w-3 h-3" aria-hidden="true" />
        Chưa Đạt
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeSpent = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <UserNavbar userName={session?.user?.name ?? undefined} userRole={session?.user?.role ?? undefined} />
        <div className="container mx-auto max-w-[1600px] px-4 py-8">
          <div className="flex justify-center items-center py-20">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="text-muted-foreground font-medium">Đang tải lịch sử...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <UserNavbar userName={session?.user?.name ?? undefined} userRole={session?.user?.role ?? undefined} />

      <div className="container mx-auto max-w-[1600px] px-3 sm:px-4 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8 max-w-full">
        {/* Header */}
        <AnimatedContainer animation="fadeInDown">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-6 lg:p-8 shadow-subtle border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Lịch Sử Thi</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                Xem lại các bài thi đã hoàn thành và kết quả
              </p>
            </div>
          </div>
          </div>
        </AnimatedContainer>

        {error && (
          <div className="rounded-xl p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          <AnimatedCard delay={0.1}>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-elevated transition-shadow border border-border">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tabular-nums"><CountingNumber value={stats.total} duration={1.5} /></p>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Tổng</p>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-elevated transition-shadow border border-border">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tabular-nums"><CountingNumber value={stats.passed} duration={1.5} /></p>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Đạt</p>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.3}>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-elevated transition-shadow border border-border">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tabular-nums"><CountingNumber value={stats.failed} duration={1.5} /></p>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Chưa</p>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.4}>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-elevated transition-shadow border border-border">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tabular-nums">{stats.avgScore}</p>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">TB</p>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.5} className="hidden lg:block">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 lg:p-5 hover:shadow-elevated transition-shadow border border-border">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-warning/10 border border-warning/20">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-warning" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground tabular-nums"><CountingNumber value={stats.bestScore} duration={1.5} /></p>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Cao Nhất</p>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 shadow-subtle border border-border space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm theo tên đề thi..."
              className="w-full h-10 sm:h-11 pl-10 pr-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none transition-colors text-sm"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "all" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              <span className="hidden sm:inline">Tất Cả</span>
              <span className="sm:hidden">Tất</span>
              <span className="tabular-nums ml-1">({attempts.length})</span>
            </Button>
            <Button
              variant={filter === "passed" ? "success" : "ghost"}
              size="sm"
              onClick={() => setFilter("passed")}
              leftIcon={<CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            >
              <span className="hidden sm:inline">Đạt</span>
              <span className="sm:hidden">Đạt</span>
              <span className="tabular-nums ml-1">({stats.passed})</span>
            </Button>
            <Button
              variant={filter === "failed" ? "danger" : "ghost"}
              size="sm"
              onClick={() => setFilter("failed")}
              leftIcon={<XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            >
              <span className="hidden sm:inline">Chưa Đạt</span>
              <span className="sm:hidden">Chưa</span>
              <span className="tabular-nums ml-1">({stats.failed})</span>
            </Button>
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <p className="text-xs text-muted-foreground">
              Tìm thấy <span className="font-bold text-primary">{filteredAttempts.length}</span> kết quả
              {searchQuery && <> cho từ khóa "<span className="font-semibold text-foreground">{searchQuery}</span>"</>}
            </p>
          )}
        </div>

        {/* Attempt List */}
        {filteredAttempts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-12 text-center shadow-subtle border border-border">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {filter === "all"
                ? "Bạn chưa làm bài thi nào"
                : `Không có bài thi ${filter === "passed" ? "đạt" : "chưa đạt"}`
              }
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Bắt đầu làm bài thi để xây dựng lịch sử học tập của&nbsp;bạn
            </p>
            <Link href="/dashboard/exams">
              <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Làm Đề Thi Ngay
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredAttempts.map((attempt, index) => (
              <FadeInWhenVisible key={attempt.id} delay={index * 0.05}>
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 lg:p-6 hover:shadow-elevated hover:border-primary transition-all border border-border">
                <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6">
                  {/* Left: Main Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20">
                          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-foreground mb-0.5 sm:mb-1 truncate">
                            {attempt.exam.title}
                          </h3>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{formatDate(attempt.submittedAt || attempt.startedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(attempt.status, attempt.score)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                      <div className="bg-muted rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5">Điểm</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-primary tabular-nums">
                          {Math.round(attempt.score)}
                        </p>
                      </div>

                      <div className="bg-muted rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5">Kết quả</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-foreground tabular-nums">
                          {attempt.correctCount}/{attempt.totalCount}
                        </p>
                      </div>

                      <div className="bg-muted rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5">Thời gian</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-foreground tabular-nums">
                          {formatTimeSpent(attempt.timeSpent)}
                        </p>
                      </div>

                      <div className="hidden sm:block bg-muted rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5">Giới hạn</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-foreground tabular-nums">
                          {Math.round(attempt.exam.timeLimit / 60)}p
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-row sm:flex-col gap-2 lg:w-48 relative z-10 mt-2 sm:mt-0">
                    {attempt.status !== "IN_PROGRESS" && (
                      <Link href={`/dashboard/exams/review/${attempt.id}`} className="w-full relative z-20">
                        <Button variant="primary" size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" rightIcon={<ArrowRight className="w-4 h-4" />}>
                          <span className="hidden sm:inline">Xem chi tiết</span>
                          <span className="sm:hidden">Xem</span>
                        </Button>
                      </Link>
                    )}
                    {attempt.status === "IN_PROGRESS" && (
                      <Link href={`/exam/${attempt.exam.id}`} className="w-full relative z-20">
                        <Button variant="primary" size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" rightIcon={<ArrowRight className="w-4 h-4" />}>
                          <span className="hidden sm:inline">Tiếp tục</span>
                          <span className="sm:hidden">Làm tiếp</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                </div>
              </FadeInWhenVisible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
