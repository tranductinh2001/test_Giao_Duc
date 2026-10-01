import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/lesson-plans/[id]/review-data - Get review result with teaching method analysis
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    // Check ownership
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: { userId: true, deletedAt: true },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    if (lessonPlan.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Get latest review result
    const reviewResult = await prisma.reviewResult.findFirst({
      where: { lessonPlanId: id },
      orderBy: { createdAt: "desc" },
      include: {
        annotations: {
          orderBy: { severity: "asc" },
          include: {
            rule: {
              select: { id: true, ruleName: true },
            },
            section: {
              select: { sectionTitle: true, sectionType: true, sectionOrder: true },
            },
          },
        },
        reviewer: {
          select: { name: true, email: true },
        },
      },
    });

    if (!reviewResult) {
      return NextResponse.json(
        { success: false, message: "Chưa có kết quả review" },
        { status: 404 }
      );
    }

    // Get review history with teaching method analysis
    const reviewHistory = await prisma.reviewHistory.findFirst({
      where: {
        lessonPlanId: id,
        actionType: "REVIEWED",
      },
      orderBy: { createdAt: "desc" },
    });

    const actionData = reviewHistory?.actionData as Record<string, any> | null;

    return NextResponse.json({
      success: true,
      data: {
        id: reviewResult.id,
        lessonPlanId: reviewResult.lessonPlanId,
        overallScore: reviewResult.overallScore ? Number(reviewResult.overallScore) : null,
        totalIssues: reviewResult.totalIssues,
        criticalIssues: reviewResult.criticalIssues,
        errorIssues: reviewResult.errorIssues,
        warningIssues: reviewResult.warningIssues,
        infoIssues: reviewResult.infoIssues,
        status: reviewResult.status,
        reviewedBy: reviewResult.reviewedBy,
        reviewedAt: reviewResult.reviewedAt,
        createdAt: reviewResult.createdAt,
        annotations: reviewResult.annotations.map((a) => ({
          id: a.id,
          sectionId: a.sectionId,
          sectionTitle: a.section?.sectionTitle || `Section ${a.section?.sectionOrder || 0}`,
          sectionType: a.section?.sectionType || "UNKNOWN",
          ruleId: a.ruleId,
          ruleTitle: a.rule?.ruleName || "Unknown Rule",
          severity: a.severity,
          message: a.message,
          suggestion: a.suggestion,
          status: a.status,
          explanation: a.explanation,
          proposedContent: a.proposedContent,
        })),
        teachingMethodAnalysis: reviewResult.teachingMethodAnalysis,
        teachingMethodScore: reviewResult.teachingMethodScore
          ? Number(reviewResult.teachingMethodScore)
          : (actionData?.teachingMethodScore || null),
        reviewer: reviewResult.reviewer,
      },
    });
  } catch (error) {
    console.error("Error fetching review data:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải dữ liệu" },
      { status: 500 }
    );
  }
}
