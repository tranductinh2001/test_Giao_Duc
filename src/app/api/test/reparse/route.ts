/**
 * Reparse API - Test endpoint to re-parse a lesson plan
 * POST /api/test/reparse
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startWorkflow } from "@/lib/workflow-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonPlanId, templateCode = "GD_TIENG_VIET_3" } = body;

    if (!lessonPlanId) {
      return NextResponse.json(
        { success: false, message: "lessonPlanId is required" },
        { status: 400 }
      );
    }

    // Get lesson plan
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: lessonPlanId },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Lesson plan not found" },
        { status: 404 }
      );
    }

    console.log(`[Test Reparse] Starting reparse for lesson plan: ${lessonPlanId}`);

    // Delete existing sections to force re-parse
    await prisma.lessonPlanSection.deleteMany({
      where: { lessonPlanId },
    });

    // Start workflow - this will re-parse with BrightOne
    const sessionId = await startWorkflow({
      lessonPlanId,
      userId: lessonPlan.userId,
      templateCode,
      skipStructureValidation: true, // Focus on parsing accuracy
      skipContentReview: false,
    });

    return NextResponse.json({
      success: true,
      lessonPlanId,
      sessionId,
      message: 'Reparse started. Use /api/test/workflow-status?sessionId=X to check progress.',
    });

  } catch (error: any) {
    console.error("[Test Reparse] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
