import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ExamService } from "@/features/exams/services/ExamService";
import LearnerInsightsPanel from "@/components/learner-insights-panel";
import PageContainer from "@/components/page-container";
import UserNavbar from "@/components/user-navbar";
import { prisma } from "@/lib/prisma";
import { BarChart3, TrendingUp } from "lucide-react";
import { AnimatedContainer, FadeInWhenVisible } from "@/components/motion";

export const revalidate = 0;

export default async function DashboardInsightsPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  let user: { name: string | null; role: string } | null = {
    name: session.user.name ?? null,
    role: session.user.role ?? "LEARNER",
  };
  let scoreTrend: any[] = [];
  let passFailRatio: any[] = [];
  let wrongAnswers: any[] = [];
  let bookmarks: any[] = [];
  let attempts: any[] = [];

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, role: true },
    });
    if (dbUser) user = dbUser;

    const service = new ExamService();
    const [dbScoreTrend, dbPassFailRatio, dbWrongAnswers, dbBookmarks, dbAttempts] = await Promise.all([
      service.getScoreTrend(session.user.id!),
      service.getPassFailRatio(session.user.id!),
      service.getUserWrongAnswers(session.user.id!),
      service.getUserBookmarks(session.user.id!),
      service.getUserAttempts(session.user.id!),
    ]);

    scoreTrend = dbScoreTrend;
    passFailRatio = dbPassFailRatio;
    wrongAnswers = dbWrongAnswers;
    bookmarks = dbBookmarks;
    attempts = dbAttempts;
  } catch (error) {
    console.warn("[DashboardInsightsPage] DB unavailable, using fallback data:", error);
  }

  const data = JSON.parse(
    JSON.stringify({
      scoreTrend,
      passFailRatio,
      totalAttempts: attempts.length,
      wrongAnswerCount: wrongAnswers.length,
      bookmarkCount: bookmarks.length,
      recentAttempts: attempts.slice(0, 5),
      wrongAnswers,
      bookmarks,
    })
  );

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <UserNavbar userName={user?.name ?? undefined} userRole={user?.role ?? undefined} />

      <div className="container mx-auto max-w-[1600px] px-3 sm:px-4 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
        <AnimatedContainer animation="fadeInDown" delay={0.1}>
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 shadow-subtle border border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Báo Cáo Học Tập</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                Theo dõi tiến độ, câu sai và bookmark để ôn tập
              </p>
            </div>
          </div>
        </div>
        </AnimatedContainer>

        <FadeInWhenVisible delay={0.2}>
        <LearnerInsightsPanel data={data} />
        </FadeInWhenVisible>
      </div>
    </div>
  );
}
