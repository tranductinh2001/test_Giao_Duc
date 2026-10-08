import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserNavbar from "@/components/user-navbar";
import ExamsClient from "@/components/dashboard/ExamsClient";

export const revalidate = 0;

export default async function LearnerExamsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let user: { name: string | null; role: string } | null = {
    name: session.user.name ?? null,
    role: session.user.role ?? "LEARNER",
  };
  let exams: any[] = [];
  let recentAttempt: any = null;
  let userCustomExams: any[] = [];
  let totalAttempts = 0;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, role: true },
    });
    if (dbUser) user = dbUser;

    const [dbExams, dbRecentAttempt, dbUserCustomExams, dbTotalAttempts] = await Promise.all([
      prisma.exam.findMany({
        where: { isPublished: true, isCustom: false },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { examQuestions: true, attempts: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.examAttempt.findFirst({
        where: {
          userId: session.user.id,
          status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] },
        },
        orderBy: { submittedAt: "desc" },
        select: {
          score: true,
          correctCount: true,
          totalCount: true,
          submittedAt: true,
          exam: { select: { title: true } },
        },
      }),
      prisma.exam.findMany({
        where: { userId: session.user.id, isCustom: true },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { examQuestions: true, attempts: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.examAttempt.count({
        where: { userId: session.user.id, status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] } },
      }),
    ]);

    exams = dbExams;
    recentAttempt = dbRecentAttempt;
    userCustomExams = dbUserCustomExams;
    totalAttempts = dbTotalAttempts;
  } catch (error) {
    console.warn("[LearnerExamsPage] DB unavailable, using fallback data:", error);
  }

  return (
    <>
      <UserNavbar userName={user?.name ?? undefined} userRole={user?.role ?? undefined} />
      <ExamsClient
        initialExams={exams}
        initialCustomExams={userCustomExams}
        initialRecentAttempt={recentAttempt}
        totalAttempts={totalAttempts}
      />
    </>
  );
}
