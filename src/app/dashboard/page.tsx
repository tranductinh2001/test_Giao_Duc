import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserNavbar from "@/components/user-navbar";
import {
  FileText,
  BarChart3,
  Trophy,
  Target,
  Zap,
  ChevronRight,
  Clock,
  Award,
  Sparkles,
  BookOpen,
  ArrowRight,
  Coins,
  Play,
  Key,
  Shield,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let user = {
    id: session.user.id,
    name: session.user.name || "Học viên",
    role: session.user.role || "LEARNER",
    level: 1,
    xp: 25,
    streak: 1,
  };

  let totalAttempts = 0;
  let bestAttempt: { score: number; exam: { title: string } } | null = null;
  let recentAttempts: Array<{ score: number; correctCount: number; totalCount: number; submittedAt: Date | null; exam: { title: string } }> = [];
  let masteredCount = 0;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, role: true, level: true, xp: true, streak: true },
    });

    if (dbUser) {
      user = dbUser;
      const [attempts, best, recent, mastered] = await Promise.all([
        prisma.examAttempt.count({ where: { userId: user.id, status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] } } }),
        prisma.examAttempt.findFirst({
          where: { userId: user.id, status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] } },
          orderBy: { score: "desc" },
          select: { score: true, exam: { select: { title: true } } },
        }),
        prisma.examAttempt.findMany({
          where: { userId: user.id, status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] } },
          orderBy: { submittedAt: "desc" },
          take: 5,
          select: { score: true, correctCount: true, totalCount: true, submittedAt: true, exam: { select: { title: true } } },
        }),
        prisma.userQuestionProgress.count({ where: { userId: user.id, masteryLevel: { gte: 4 } } }),
      ]);
      totalAttempts = attempts;
      bestAttempt = best;
      recentAttempts = recent;
      masteredCount = mastered;
    }
  } catch (dbErr) {
    console.warn("[DashboardPage] Database offline or query failed, using session fallback");
  }

  const avgScore = recentAttempts.length > 0
    ? Math.round(recentAttempts.reduce((sum, a) => sum + a.score, 0) / recentAttempts.length)
    : null;

  const xpProgress = user.xp % 100;
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <UserNavbar userName={user.name} userRole={user.role} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Welcome Banner - Paper Style */}
        <section className="mb-8">
          <div className="paper p-6 hover:shadow-[var(--shadow-lift)] transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <h1 className="text-2xl font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
                  Xin chào, <span className="text-[var(--primary)]">{user.name}</span>
                </h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1.5">Sẵn sàng cho bài học hôm nay?</p>
              </div>

              {/* User Stats */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Streak */}
                <div className="flex items-center gap-2 rounded-xl bg-[var(--warning-soft)] px-4 py-2.5">
                  <Zap className="h-5 w-5 text-[var(--warning)]" />
                  <div>
                    <span className="text-base font-bold text-[var(--foreground)]">{user.streak}</span>
                    <span className="text-xs text-[var(--muted-foreground)] ml-1">ngày</span>
                  </div>
                </div>
                {/* Level */}
                <div className="flex items-center gap-2 rounded-xl bg-[var(--primary-soft)] px-4 py-2.5">
                  <Trophy className="h-5 w-5 text-[var(--primary)]" />
                  <div>
                    <span className="text-base font-bold text-[var(--foreground)]">Lv.{user.level}</span>
                  </div>
                </div>
                {/* XP Progress */}
                <div className="w-24">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-[var(--muted-foreground)]">XP</span>
                    <span className="text-xs font-semibold text-[var(--warning)]">{xpProgress}/100</span>
                  </div>
                  <div className="h-2 bg-[var(--kraft)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--warning)] to-[var(--primary)] transition-all duration-500"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Action - Start Exam */}
        <section className="mb-8">
          <Link
            href="/dashboard/exams"
            className="group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] p-6 text-[var(--foreground-inverted)] hover:shadow-[var(--shadow-elevated)] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Play className="h-7 w-7 ml-1" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-medium text-white/80">Sẵn sàng</span>
                </div>
                <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  Làm đề thi mới
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  Chọn chuyên đề, độ khó và bắt đầu làm bài
                </p>
              </div>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors">
              <ArrowRight className="h-5 w-5" />
            </div>
          </Link>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="paper p-5 hover:shadow-[var(--shadow-lift)] transition-all hover:-translate-y-1">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
              <FileText className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
              {totalAttempts}
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Tổng bài thi</p>
          </div>
          <div className="paper p-5 hover:shadow-[var(--shadow-lift)] transition-all hover:-translate-y-1">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--warning-soft)]">
              <Trophy className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
              {bestAttempt ? `${Math.round(bestAttempt.score)}%` : "—"}
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Điểm cao nhất</p>
          </div>
          <div className="paper p-5 hover:shadow-[var(--shadow-lift)] transition-all hover:-translate-y-1">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--secondary-soft)]">
              <BarChart3 className="h-5 w-5 text-[var(--secondary)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
              {avgScore !== null ? `${avgScore}%` : "—"}
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Điểm trung bình</p>
          </div>
          <div className="paper p-5 hover:shadow-[var(--shadow-lift)] transition-all hover:-translate-y-1">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--success-soft)]">
              <Award className="h-5 w-5 text-[var(--success)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
              {masteredCount}
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Câu đã thành thạo</p>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mb-8 overflow-hidden paper">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
                <Clock className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">Hoạt động gần đây</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Lịch sử làm bài thi của bạn</p>
              </div>
            </div>
            <Link
              href="/dashboard/exams/history"
              className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1"
            >
              Xem tất cả
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {recentAttempts.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {recentAttempts.map((attempt, i) => (
                <Link
                  key={i}
                  href="/dashboard/exams/history"
                  className="flex items-center justify-between px-5 py-4 hover:bg-[var(--kraft)]/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${
                        attempt.score >= 80
                          ? "bg-[var(--success-soft)] text-[var(--success)]"
                          : attempt.score >= 60
                          ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                          : "bg-[var(--danger-soft)] text-[var(--danger)]"
                      }`}
                    >
                      {Math.round(attempt.score)}%
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[var(--foreground)]">{attempt.exam.title}</h4>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {attempt.correctCount}/{attempt.totalCount} câu đúng
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--muted-foreground)]" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--kraft)]">
                <FileText className="h-8 w-8 text-[var(--muted-foreground)]" />
              </div>
              <h4 className="mb-2 text-base font-semibold text-[var(--foreground)]">Chưa có hoạt động</h4>
              <p className="mb-5 text-sm text-[var(--muted-foreground)]">
                Hãy bắt đầu làm bài thi để theo dõi tiến độ học tập của bạn
              </p>
              <Link
                href="/dashboard/exams"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--foreground-inverted)] hover:bg-[var(--primary-hover)] transition-colors"
              >
                <Play className="h-4 w-4" />
                Làm bài thi ngay
              </Link>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h3 className="mb-4 text-base font-semibold text-[var(--foreground)]">Hành động nhanh</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Link
              href="/practice"
              className="paper p-5 text-center hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 transition-all"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] mx-auto">
                <Target className="h-6 w-6 text-[var(--primary)]" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]">Luyện tập</span>
            </Link>
            <Link
              href="/dashboard/insights"
              className="paper p-5 text-center hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 transition-all"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--secondary-soft)] mx-auto">
                <BarChart3 className="h-6 w-6 text-[var(--secondary)]" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]">Báo cáo</span>
            </Link>
            <Link
              href="/payment"
              className="paper p-5 text-center hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 transition-all"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--warning-soft)] mx-auto">
                <Coins className="h-6 w-6 text-[var(--warning)]" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]">Gói cước</span>
            </Link>
            <Link
              href="/lesson-plans/review"
              className="paper p-5 text-center hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 transition-all"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 mx-auto">
                <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]">Thẩm định GA</span>
            </Link>
            <Link
              href="/licenses/activate"
              className="paper p-5 text-center hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 transition-all"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 mx-auto">
                <Key className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]">Kích hoạt Key</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="paper p-5 text-center hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 transition-all"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 mx-auto">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-[var(--foreground)]">Quản trị</span>
              </Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
