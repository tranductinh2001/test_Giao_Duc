import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string; annotationId: string }>;
}

// POST /api/lesson-plans/[id]/annotations/[annotationId]/accept
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id, annotationId } = await context.params;

    // Check lesson plan ownership
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

    if (lessonPlan.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Giáo án đã bị xóa" },
        { status: 404 }
      );
    }

    // Check annotation exists and belongs to this lesson plan
    const annotation = await prisma.annotation.findFirst({
      where: {
        id: annotationId,
        reviewResult: {
          lessonPlanId: id
        }
      },
      select: { id: true, status: true },
    });

    if (!annotation) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy annotation" },
        { status: 404 }
      );
    }

    // Update annotation status
    const updated = await prisma.annotation.update({
      where: { id: annotationId },
      data: {
        status: "ACCEPTED",
        resolvedBy: session.user.id,
        resolvedAt: new Date(),
      },
    });

    // Log action
    await prisma.reviewHistory.create({
      data: {
        lessonPlanId: id,
        actionType: "ANNOTATION_ACCEPTED",
        actionData: { annotationId },
        performedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã chấp nhận annotation",
      data: updated,
    });
  } catch (error) {
    console.error("Error accepting annotation:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi chấp nhận annotation" },
      { status: 500 }
    );
  }
}
