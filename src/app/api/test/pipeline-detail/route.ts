/**
 * Pipeline Detail API
 * Get detailed pipeline info including AI review issues
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonPlanId } = body;

    if (!lessonPlanId) {
      return NextResponse.json({ error: "lessonPlanId required" }, { status: 400 });
    }

    // Get review results with suggestions
    const reviewResults = await prisma.reviewResult.findMany({
      where: { lessonPlanId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    const reviewResult = reviewResults[0];

    if (!reviewResult) {
      return NextResponse.json({ error: "No review result found" }, { status: 404 });
    }

    // Get annotations for this review
    const annotations = await prisma.annotation.findMany({
      where: {
        reviewResultId: reviewResult.id,
      },
      include: {
        rule: true,
        section: {
          select: {
            id: true,
            sectionTitle: true,
            sectionType: true,
          },
        },
      },
    });

    // Get workflow session for AI call details
    const workflowSession = await prisma.workflowSession.findFirst({
      where: { lessonPlanId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      lessonPlanId,
      reviewResult: {
        id: reviewResult.id,
        status: reviewResult.status,
        overallScore: reviewResult.overallScore,
        totalIssues: reviewResult.totalIssues,
        criticalIssues: reviewResult.criticalIssues,
        errorIssues: reviewResult.errorIssues,
        warningIssues: reviewResult.warningIssues,
        createdAt: reviewResult.createdAt,
      },
      workflow: {
        id: workflowSession?.id,
        status: workflowSession?.status,
        currentStep: workflowSession?.currentStep,
      },
      annotations: annotations.map(a => ({
        id: a.id,
        sectionTitle: a.section?.sectionTitle,
        sectionType: a.section?.sectionType,
        annotationType: a.annotationType,
        severity: a.severity,
        message: a.message,
        explanation: a.explanation,
        suggestion: a.suggestion,
        highlightedText: a.highlightedText,
      })),
      summary: {
        totalAnnotations: annotations.length,
        bySeverity: annotations.reduce((acc, a) => {
          acc[a.severity] = (acc[a.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byType: annotations.reduce((acc, a) => {
          acc[a.annotationType] = (acc[a.annotationType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });

  } catch (error: any) {
    console.error("[Pipeline Detail] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
