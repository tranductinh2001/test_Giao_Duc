/**
 * Unified Workflow API
 *
 * POST /api/workflow/stream - Start workflow and get streaming progress
 * GET /api/workflow/stream/[sessionId] - Get workflow result
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  startWorkflow,
  getWorkflowProgress,
  getWorkflowResult,
  cancelWorkflow,
  getLatestWorkflow,
} from "@/lib/workflow-service";
import { rateLimit, getRateLimitIdentifier, RATE_LIMITS, applyRateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

interface RouteContext {
  params: Promise<{ sessionId?: string }>;
}

// POST /api/workflow/stream - Start a new workflow
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized request`);
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // Apply rate limiting
    const rateLimitId = getRateLimitIdentifier(req, session.user.id);
    const rateLimitCheck = await rateLimit(RATE_LIMITS.AI_OPERATIONS)(req, rateLimitId);

    if (!rateLimitCheck.allowed && rateLimitCheck.response) {
      logger.warn(`[${requestId}] Rate limit exceeded for user ${session.user.id}`);
      return rateLimitCheck.response;
    }

    const body = await req.json();
    const { lessonPlanId, templateId, templateCode, aiModel, skipStructureValidation, skipContentReview, textbookBookId, textbookLessonTitle } = body;

    if (!lessonPlanId) {
      return NextResponse.json(
        { success: false, message: "lessonPlanId là bắt buộc" },
        { status: 400 }
      );
    }

    // Validate lesson plan exists and user has access
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: lessonPlanId },
      select: {
        id: true,
        userId: true,
        status: true,
        deletedAt: true,
      },
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

    if (lessonPlan.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Giáo án đã bị xóa" },
        { status: 404 }
      );
    }

    // Check if already running
    if (lessonPlan.status === "PARSING" || lessonPlan.status === "REVIEWING") {
      return NextResponse.json(
        { success: false, message: "Đang trong quá trình xử lý" },
        { status: 409 }
      );
    }

    logger.info(`[${requestId}] Starting workflow for lessonPlan ${lessonPlanId}`, {
      requestId,
      userId: session.user.id,
      lessonPlanId,
      templateId,
      templateCode,
    });

    // Start workflow
    const workflowSessionId = await startWorkflow({
      lessonPlanId,
      userId: session.user.id,
      templateId,
      templateCode,
      aiModel,
      skipStructureValidation,
      skipContentReview,
      textbookBookId,
      textbookLessonTitle,
    });

    const duration = Date.now() - startTime;

    logger.info(`[${requestId}] Workflow started successfully`, {
      requestId,
      userId: session.user.id,
      lessonPlanId,
      workflowSessionId,
      duration,
    });

    const response = NextResponse.json({
      success: true,
      sessionId: workflowSessionId,
      message: "Workflow đã bắt đầu",
      status: "PENDING",
    });

    return applyRateLimitHeaders(response, rateLimitCheck, RATE_LIMITS.AI_OPERATIONS);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Error starting workflow`, error, {
      requestId,
      duration,
    });
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Lỗi server" },
      { status: 500 }
    );
  }
}

// GET /api/workflow/stream - Get workflow by sessionId or lessonPlanId
export async function GET(req: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const lessonPlanId = searchParams.get("lessonPlanId");

    if (!sessionId && !lessonPlanId) {
      return NextResponse.json(
        { success: false, message: "sessionId hoặc lessonPlanId là bắt buộc" },
        { status: 400 }
      );
    }

    let workflow;

    if (sessionId) {
      workflow = await getWorkflowResult(sessionId);
      if (!workflow) {
        return NextResponse.json(
          { success: false, message: "Không tìm thấy workflow" },
          { status: 404 }
        );
      }
    } else if (lessonPlanId) {
      // Get latest workflow for lesson plan
      const lessonPlan = await prisma.lessonPlan.findUnique({
        where: { id: lessonPlanId },
        select: { userId: true },
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

      workflow = await getLatestWorkflow(lessonPlanId);
    }

    if (!workflow) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy workflow" },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Workflow retrieved`, {
      requestId,
      userId: session.user.id,
      sessionId: sessionId || undefined,
      lessonPlanId: lessonPlanId || undefined,
      duration,
    });

    return NextResponse.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Error getting workflow`, error, {
      requestId,
      duration,
    });
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Lỗi server" },
      { status: 500 }
    );
  }
}

// DELETE /api/workflow/stream?sessionId=xxx - Cancel workflow
export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "sessionId là bắt buộc" },
        { status: 400 }
      );
    }

    // Verify ownership
    const workflow = await prisma.workflowSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy workflow" },
        { status: 404 }
      );
    }

    if (workflow.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const cancelled = await cancelWorkflow(sessionId);

    if (!cancelled) {
      return NextResponse.json(
        { success: false, message: "Không thể hủy workflow đã hoàn thành hoặc đang chạy" },
        { status: 400 }
      );
    }

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] Workflow cancelled`, {
      requestId,
      userId: session.user.id,
      sessionId,
      duration,
    });

    return NextResponse.json({
      success: true,
      message: "Workflow đã được hủy",
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[${requestId}] Error cancelling workflow`, error, {
      requestId,
      duration,
    });
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Lỗi server" },
      { status: 500 }
    );
  }
}
