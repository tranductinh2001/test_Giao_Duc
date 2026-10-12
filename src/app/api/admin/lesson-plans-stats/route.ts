import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    // Get lesson plan counts by status
    const [
      totalCount,
      uploadedCount,
      parsingCount,
      parsedCount,
      reviewingCount,
      reviewedCount,
      completedCount,
      failedCount,
    ] = await Promise.all([
      prisma.lessonPlan.count(),
      prisma.lessonPlan.count({ where: { status: "UPLOADED" } }),
      prisma.lessonPlan.count({ where: { status: "PARSING" } }),
      prisma.lessonPlan.count({ where: { status: "PARSED" } }),
      prisma.lessonPlan.count({ where: { status: "REVIEWING" } }),
      prisma.lessonPlan.count({ where: { status: "REVIEWED" } }),
      prisma.lessonPlan.count({ where: { status: "COMPLETED" } }),
      prisma.lessonPlan.count({ where: { status: "FAILED" } }),
    ]);

    // Get average score from review results
    const reviewResults = await prisma.reviewResult.findMany({
      where: { status: "COMPLETED" },
      select: { overallScore: true },
    });

    let avgScore = 0;
    if (reviewResults.length > 0) {
      const totalScore = reviewResults.reduce((sum, result) => {
        return sum + (Number(result.overallScore) || 0);
      }, 0);
      avgScore = Math.round(totalScore / reviewResults.length * 10) / 10;
    }

    // Get rule count
    const ruleCount = await prisma.sectionRule.count();

    // Get template count (rule_templates)
    const templateCount = await prisma.rule_templates.count();

    // Get book/circular count (LessonBook or CircularDocument)
    const bookCount = await prisma.lessonBook.count();

    // Get today's AI usage stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsage = await prisma.usageLog.findMany({
      where: { createdAt: { gte: today } },
      select: { totalCost: true, inputTokens: true, outputTokens: true },
    });

    const todayCost = todayUsage.reduce((sum, log) => sum + log.totalCost, 0);
    const todayInputTokens = todayUsage.reduce((sum, log) => sum + log.inputTokens, 0);
    const todayOutputTokens = todayUsage.reduce((sum, log) => sum + log.outputTokens, 0);

    // Get most used model
    const modelUsage = await prisma.usageLog.groupBy({
      by: ["modelUsed"],
      _count: true,
      orderBy: { _count: { modelUsed: "desc" } },
      take: 1,
    });
    const mostUsedModel = modelUsage[0]?.modelUsed || "gemini-3.1-flash-lite";

    // Get last 7 days trend data for charts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPlans = await prisma.lessonPlan.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const dailyStats: Record<string, { uploaded: number; reviewed: number; completed: number }> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      dailyStats[key] = { uploaded: 0, reviewed: 0, completed: 0 };
    }
    recentPlans.forEach((plan) => {
      const key = plan.createdAt.toISOString().split("T")[0];
      if (dailyStats[key]) {
        if (plan.status === "UPLOADED") dailyStats[key].uploaded++;
        else if (plan.status === "REVIEWED") dailyStats[key].reviewed++;
        else if (plan.status === "COMPLETED") dailyStats[key].completed++;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        lessonPlans: {
          total: totalCount,
          uploaded: uploadedCount,
          parsing: parsingCount,
          parsed: parsedCount,
          reviewing: reviewingCount,
          reviewed: reviewedCount,
          completed: completedCount,
          failed: failedCount,
        },
        averageScore: avgScore,
        totalRules: ruleCount,
        totalTemplates: templateCount,
        totalBooks: bookCount,
        aiModel: mostUsedModel,
        todayCost,
        todayTokens: {
          input: todayInputTokens,
          output: todayOutputTokens,
          total: todayInputTokens + todayOutputTokens,
        },
        dailyTrend: Object.entries(dailyStats).map(([date, stats]) => ({
          date,
          ...stats,
        })).reverse(),
      },
    });
  } catch (error) {
    console.error("Error fetching lesson plan stats:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
