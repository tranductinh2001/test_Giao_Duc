/**
 * Lesson Plan Restore API
 *
 * POST /api/lesson-plans/[id]/restore - Restore soft-deleted lesson plan
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/lesson-plans/[id]/restore - Restore soft-deleted lesson plan
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    // Check if lesson plan exists
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        deletedAt: true,
        title: true,
      },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    // Check if not deleted
    if (!lessonPlan.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Giáo án chưa bị xóa" },
        { status: 400 }
      );
    }

    // Check ownership - only owner and admin can restore
    const isOwner = lessonPlan.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Chỉ chủ sở hữu hoặc Admin mới có quyền khôi phục" },
        { status: 403 }
      );
    }

    // Restore lesson plan
    await prisma.lessonPlan.update({
      where: { id },
      data: { deletedAt: null },
    });

    // Create history entry
    await prisma.reviewHistory.create({
      data: {
        lessonPlanId: id,
        actionType: "RESTORED",
        actionData: {
          action: "lesson_plan_restored",
          restoredAt: new Date().toISOString(),
        },
        performedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã khôi phục giáo án",
    });
  } catch (error) {
    console.error("Error restoring lesson plan:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi khôi phục giáo án" },
      { status: 500 }
    );
  }
}
