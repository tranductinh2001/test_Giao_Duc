import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get review result with all details
    const reviewResult = await prisma.reviewResult.findUnique({
      where: { id },
      include: {
        lessonPlan: {
          select: {
            id: true,
            title: true,
          },
        },
        annotations: {
          include: {
            section: {
              select: {
                sectionTitle: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!reviewResult) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    }

    // Transform annotations
    const annotations = reviewResult.annotations.map((a) => ({
      id: a.id,
      severity: a.severity,
      message: a.message,
      suggestion: a.suggestion,
      status: a.status,
      sectionTitle: a.section?.sectionTitle,
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: reviewResult.id,
        lessonPlanId: reviewResult.lessonPlanId,
        lessonPlanTitle: reviewResult.lessonPlan?.title,
        overallScore: reviewResult.overallScore,
        totalIssues: reviewResult.totalIssues,
        criticalIssues: reviewResult.criticalIssues,
        errorIssues: reviewResult.errorIssues,
        warningIssues: reviewResult.warningIssues,
        infoIssues: reviewResult.infoIssues,
        status: reviewResult.status,
        reviewedBy: reviewResult.reviewedBy,
        reviewedAt: reviewResult.reviewedAt?.toISOString(),
        annotations,
      },
    });
  } catch (error) {
    console.error("Error fetching review detail:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
