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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, role: true },
  });

  const [exams, recentAttempt, userCustomExams, totalAttempts] = await Promise.all([
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

  return (
    <>
      <UserNavbar userName={user?.name} userRole={user?.role} />
      <ExamsClient
        initialExams={exams}
        initialCustomExams={userCustomExams}
        initialRecentAttempt={recentAttempt}
        totalAttempts={totalAttempts}
      />
    </>
  );
}
