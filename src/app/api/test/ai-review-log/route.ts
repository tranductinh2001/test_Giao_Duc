/**
 * AI Review Log API
 * Get detailed AI review logs
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

    // Get workflow session
    const workflowSession = await prisma.workflowSession.findFirst({
      where: { lessonPlanId },
      orderBy: { createdAt: 'desc' },
    });

    if (!workflowSession) {
      return NextResponse.json({ error: "No workflow session found" }, { status: 404 });
    }

    // Get review result
    const reviewResult = await prisma.reviewResult.findFirst({
      where: { lessonPlanId },
      orderBy: { createdAt: 'desc' },
    });

    // Get sections
    const sections = await prisma.lessonPlanSection.findMany({
      where: { lessonPlanId },
      orderBy: { sectionOrder: 'asc' },
    });

    // Get annotations by section
    const annotations = await prisma.annotation.findMany({
      where: {
        reviewResultId: reviewResult?.id,
      },
    });

    // Group annotations by section
    const annotationsBySection = annotations.reduce((acc, a) => {
      if (!acc[a.sectionId]) acc[a.sectionId] = [];
      acc[a.sectionId].push(a);
      return acc;
    }, {} as Record<string, typeof annotations>);

    // Check AI request logs
    const aiRequests = await prisma.aIRequest.findMany({
      where: { lessonPlanId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return NextResponse.json({
      lessonPlanId,
      workflow: {
        id: workflowSession.id,
        status: workflowSession.status,
        currentStep: workflowSession.currentStep,
        startedAt: workflowSession.startedAt,
        completedAt: workflowSession.completedAt,
      },
      review: reviewResult ? {
        id: reviewResult.id,
        status: reviewResult.status,
        overallScore: reviewResult.overallScore,
        totalIssues: reviewResult.totalIssues,
        createdAt: reviewResult.createdAt,
      } : null,
      sectionsSummary: {
        total: sections.length,
        withContent: sections.filter(s => s.rawContent && s.rawContent.length > 10).length,
      },
      aiReviewCoverage: sections.map(s => ({
        id: s.id,
        title: s.sectionTitle,
        type: s.sectionType,
        wordCount: s.wordCount,
        hasContent: !!(s.rawContent && s.rawContent.length > 10),
        annotationsCount: annotationsBySection[s.id]?.length || 0,
        issues: annotationsBySection[s.id]?.length || 0,
      })),
      aiRequests: {
        total: aiRequests.length,
        byModel: aiRequests.reduce((acc, r) => {
          const modelName = (r as any).modelName || (r as any).model || 'unknown';
          acc[modelName] = (acc[modelName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });

  } catch (error: any) {
    console.error("[AI Review Log] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
