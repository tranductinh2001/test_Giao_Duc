/**
 * Get Workflow Progress API
 *
 * Phase 7.1: Production-ready DocumentEditor
 * Returns real workflow progress from database
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "sessionId is required" },
        { status: 400 }
      );
    }

    // Find the lesson plan by sessionId
    const lessonPlanId = sessionId;

    // Get the latest review result for this lesson plan
    const reviewResult = await prisma.reviewResult.findFirst({
      where: { lessonPlanId },
      orderBy: { createdAt: "desc" },
    });

    // If no review result exists yet, workflow hasn't started
    if (!reviewResult) {
      return NextResponse.json({
        success: true,
        sessionId,
        status: "UPLOADED",
        progress: 0,
        currentStep: "Chờ xử lý",
        message: "Sẵn sàng",
        steps: [],
        error: null,
      });
    }

    // Map ReviewStatus to WorkflowProgressStep
    const statusMap: Record<string, string> = {
      DRAFT: "AI_REVIEWING",
      IN_PROGRESS: "AI_REVIEWING",
      COMPLETED: "COMPLETED",
      FAILED: "FAILED",
    };

    const status = statusMap[reviewResult.status] || "AI_REVIEWING";

    // Calculate progress based on review result status
    const progressMap: Record<string, number> = {
      UPLOADED: 5,
      PARSING: 25,
      MAPPING: 50,
      BUILDING_CONTEXT: 70,
      AI_REVIEWING: 90,
      COMPLETED: 100,
      FAILED: 0,
    };

    const progress = progressMap[status] || 0;

    const stepMessages: Record<string, string> = {
      UPLOADED: "Tải tài liệu hoàn tất",
      PARSING: "Đang phân tích tài liệu...",
      MAPPING: "Đang ánh xạ hoạt động...",
      BUILDING_CONTEXT: "Đang xây dựng ngữ cảnh...",
      AI_REVIEWING: "Đang AI review...",
      COMPLETED: "Review hoàn tất!",
      FAILED: "Workflow thất bại",
    };

    // Build steps array
    const steps = [
      { step: "UPLOADED", status: progress >= 5 ? "completed" : "pending", progress: 5 },
      { step: "PARSING", status: progress >= 25 ? "completed" : progress >= 5 ? "running" : "pending", progress: 25 },
      { step: "MAPPING", status: progress >= 50 ? "completed" : progress >= 25 ? "running" : "pending", progress: 50 },
      { step: "BUILDING_CONTEXT", status: progress >= 70 ? "completed" : progress >= 50 ? "running" : "pending", progress: 70 },
      { step: "AI_REVIEWING", status: progress >= 90 ? "completed" : progress >= 70 ? "running" : "pending", progress: 90 },
      { step: "COMPLETED", status: progress >= 100 ? "completed" : "pending", progress: 100 },
    ];

    return NextResponse.json({
      success: true,
      sessionId,
      status,
      progress,
      currentStep: stepMessages[status] || "Đang xử lý...",
      message: stepMessages[status] || "Đang xử lý...",
      steps,
      error: status === "FAILED" ? "Workflow thất bại" : null,
    });
  } catch (error: any) {
    console.error("Error getting progress:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
