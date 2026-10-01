/**
 * Start Review Workflow API
 *
 * Phase 7: Syncfusion DocumentEditor Integration
 * Starts the review workflow for a lesson plan
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lessonPlanId, sessionId: providedSessionId } = body;

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

    // Use provided sessionId or generate new one
    const sessionId = providedSessionId || nanoid();

    // TODO: Initialize workflow session in database
    // For now, return the sessionId

    return NextResponse.json({
      success: true,
      sessionId,
      status: "PARSING",
      message: "Workflow started",
    });
  } catch (error: any) {
    console.error("Error starting review:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
