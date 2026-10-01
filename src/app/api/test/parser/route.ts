/**
 * Test Parser - Debug BrightOne response
 * GET /api/test/parser?lessonPlanId=xxx
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonPlanId = searchParams.get('lessonPlanId');

    if (!lessonPlanId) {
      return NextResponse.json(
        { success: false, message: "lessonPlanId is required" },
        { status: 400 }
      );
    }

    // Get lesson plan
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: lessonPlanId },
      include: {
        sections: {
          orderBy: { sectionOrder: 'asc' }
        }
      }
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Lesson plan not found" },
        { status: 404 }
      );
    }

    // Get workflow session for this lesson plan
    const session = await prisma.workflowSession.findFirst({
      where: {
        lessonPlanId
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get parse result from workflow result
    let parseResult = null;
    if (session?.result) {
      const result = typeof session.result === 'string' ? JSON.parse(session.result) : session.result;
      parseResult = result.parseResult;
    }

    return NextResponse.json({
      success: true,
      lessonPlan: {
        id: lessonPlan.id,
        title: lessonPlan.title,
        fileName: lessonPlan.originalFilename,
      },
      sections: lessonPlan.sections.map(s => ({
        id: s.id,
        sectionType: s.sectionType,
        sectionTitle: s.sectionTitle,
        sectionOrder: s.sectionOrder,
        rawContentLength: s.rawContent?.length || 0,
        rawContent: s.rawContent,
      })),
      parseResult,
    });
  } catch (error: any) {
    console.error("[Test Parser] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
