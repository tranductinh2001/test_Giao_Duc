import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserNavbar from "@/components/user-navbar";
import { FileText, BarChart3, Trophy, Target, Zap, ChevronRight, Clock, Award, Sparkles, BookOpen, ArrowRight, FolderOpen, Layers, GraduationCap, ScrollText, Megaphone } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true, level: true, xp: true, streak: true },
  });

  if (!user) redirect("/login");

  const [totalAttempts, bestAttempt, recentAttempts, masteredCount] = await Promise.all([
    prisma.examAttempt.count({ where: { userId: user.id, status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] } } }),
    prisma.examAttempt.findFirst({
      where: { userId: user.id, status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] } },
      orderBy: { score: "desc" }, select: { score: true, exam: { select: { title: true } } }
    }),
    prisma.examAttempt.findMany({
      where: { userId: user.id, status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] } },
      orderBy: { submittedAt: "desc" }, take: 5,
      select: { score: true, correctCount: true, totalCount: true, submittedAt: true, exam: { select: { title: true } } }
    }),
    prisma.userQuestionProgress.count({ where: { userId: user.id, masteryLevel: { gte: 4 } } })
  ]);

  const avgScore = recentAttempts.length > 0
    ? Math.round(recentAttempts.reduce((sum, a) => sum + a.score, 0) / recentAttempts.length)
    : null;

  const xpProgress = (user.xp % 100);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <UserNavbar userName={user.name} userRole={user.role} />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Welcome Banner - Paper Style */}
        <section className="mb-6">
          <div className="paper p-5 hover:shadow-[var(--shadow-lift)] transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
                  Xin chào, <span className="text-[var(--primary)]">{user.name}</span>
                </h1>
                <p className="text-sm text-[var(--muted)] mt-1">Sẵn sàng cho bài học hôm nay?</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-[var(--warning-soft)] px-3 py-1.5">
                  <Zap className="h-4 w-4 text-[var(--warning)]" />
                  <span className="text-sm font-semibold text-[var(--foreground)]">{user.streak}</span>
                  <span className="text-xs text-[var(--muted)]">ngày</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-[var(--primary-soft)] px-3 py-1.5">
                  <Trophy className="h-4 w-4 text-[var(--primary)]" />
                  <span className="text-sm font-semibold text-[var(--foreground)]">Lv.{user.level}</span>
                </div>
                <div className="w-20">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-[var(--muted)]">XP</span>
                    <span className="text-xs font-medium text-[var(--warning)]">{xpProgress}/100</span>
                  </div>
                  <div className="h-1.5 bg-[var(--kraft)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--warning)]" style={{ width: `${xpProgress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Action */}
        <section className="mb-6">
          <Link
            href="/dashboard/exams"
            className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--primary)] p-5 text-[var(--foreground-inverted)] hover:bg-[var(--primary-hover)] transition-all hover:shadow-[var(--shadow-lift)]"
          >
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-sm font-medium text-[var(--foreground-inverted)]/80">Sẵn sàng</span>
              </div>
              <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Làm đề thi mới</h2>
              <p className="mt-1 text-sm text-[var(--foreground-inverted)]/70">Chọn chuyên đề, độ khó và bắt đầu làm bài</p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
              <ArrowRight className="h-5 w-5" />
            </div>
          </Link>
        </section>

        {/* Stats Grid - Education Workspace Style */}
        <section className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="paper p-4 hover:shadow-[var(--shadow-lift)] transition-all hover:-translate-y-0.5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-soft)]">
              <FileText className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <p className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>{totalAttempts}</p>
            <p className="text-sm text-[var(--muted)]">Tổng bài thi</p>
          </div>
          <div className="paper p-4 hover:shadow-[var(--shadow-lift)] transition-all hover:-translate-y-0.5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--warning-soft)]">
              <Trophy className="h-4 w-4 text-[var(--warning)]" />
            </div>
            <p className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>{bestAttempt ? `${Math.round(bestAttempt.score)}%` : '—'}</p>
            <p className="text-sm text-[var(--muted)]">Điểm cao nhất</p>
          </div>
          <div className="paper p-4 hover:shadow-[var(--shadow-lift)] transition-all hover:-translate-y-0.5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--secondary-soft)]">
              <BarChart3 className="h-4 w-4 text-[var(--secondary)]" />
            </div>
            <p className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>{avgScore !== null ? `${avgScore}%` : '—'}</p>
            <p className="text-sm text-[var(--muted)]">Điểm TB</p>
          </div>
          <div className="paper p-4 hover:shadow-[var(--shadow-lift)] transition-all hover:-translate-y-0.5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--success-soft)]">
              <Award className="h-4 w-4 text-[var(--success)]" />
            </div>
            <p className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-display)' }}>{masteredCount}</p>
            <p className="text-sm text-[var(--muted)]">Thành thạo</p>
          </div>
        </section>

        {/* Recent Activity - Paper Card Style */}
        <section className="mb-6 overflow-hidden paper">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-soft)]">
                <Clock className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Hoạt động gần đây</h3>
                <p className="text-xs text-[var(--muted)]">Lịch sử làm bài thi</p>
              </div>
            </div>
            <Link href="/dashboard/exams/history" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]">
              Xem tất cả
            </Link>
          </div>

          {recentAttempts.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {recentAttempts.map((attempt, i) => (
                <Link key={i} href="/dashboard/exams/history" className="flex items-center justify-between px-4 py-3 hover:bg-[var(--kraft)] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold ${
                      attempt.score >= 80
                        ? 'bg-[var(--success-soft)] text-[var(--success)]'
                        : attempt.score >= 60
                        ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                        : 'bg-[var(--danger-soft)] text-[var(--danger)]'
                    }`}>
                      {Math.round(attempt.score)}%
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[var(--foreground)]">{attempt.exam.title}</h4>
                      <p className="text-xs text-[var(--muted)]">{attempt.correctCount}/{attempt.totalCount} câu đúng</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kraft)]">
                <FileText className="h-6 w-6 text-[var(--muted)]" />
              </div>
              <h4 className="mb-1 text-sm font-semibold text-[var(--foreground)]">Chưa có hoạt động</h4>
              <p className="mb-4 text-sm text-[var(--muted)]">Hãy bắt đầu làm bài thi để theo dõi tiến độ</p>
              <Link href="/dashboard/exams" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--foreground-inverted)] hover:bg-[var(--primary-hover)] transition-colors">
                Làm bài thi ngay
              </Link>
            </div>
          )}
        </section>

        {/* Quick Actions - Card Grid Style */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Hành động nhanh</h3>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/practice" className="paper p-4 text-center hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-soft)] mx-auto">
                <Target className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <span className="text-xs font-medium text-[var(--foreground)]">Luyện tập</span>
            </Link>
            <Link href="/dashboard/insights" className="paper p-4 text-center hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--secondary-soft)] mx-auto">
                <BarChart3 className="h-5 w-5 text-[var(--secondary)]" />
              </div>
              <span className="text-xs font-medium text-[var(--foreground)]">Báo cáo</span>
            </Link>
            {(user.role === "ADMIN") && (
              <>
                <Link href="/lesson-plans" className="paper p-4 text-center hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--warning-soft)] mx-auto">
                    <BookOpen className="h-5 w-5 text-[var(--warning)]" />
                  </div>
                  <span className="text-xs font-medium text-[var(--foreground)]">Giáo án</span>
                </Link>
                <Link href="/ai-workspace" className="paper p-4 text-center hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--secondary-soft)] mx-auto">
                    <Sparkles className="h-5 w-5 text-[var(--secondary)]" />
                  </div>
                  <span className="text-xs font-medium text-[var(--foreground)]">AI Workspace</span>
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
