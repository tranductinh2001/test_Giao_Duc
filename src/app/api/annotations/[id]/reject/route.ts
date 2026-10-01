import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/annotations/[id]/reject - Reject annotation
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    // Get annotation with lesson plan
    const annotation = await prisma.annotation.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            lessonPlan: {
              select: {
                userId: true,
                collaborators: {
                  where: { userId: session.user.id },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    });

    if (!annotation) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy annotation" },
        { status: 404 }
      );
    }

    // Check permission
    const isOwner = annotation.section.lessonPlan.userId === session.user.id;
    const isEditor = annotation.section.lessonPlan.collaborators.some(
      (c) => c.role === "EDITOR"
    );
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isEditor && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Không có quyền chỉnh sửa" },
        { status: 403 }
      );
    }

    // Mark annotation as rejected
    await prisma.annotation.update({
      where: { id },
      data: {
        status: "REJECTED",
        resolvedBy: session.user.id,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã bỏ qua đề xuất",
    });
  } catch (error) {
    console.error("Error rejecting annotation:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi bỏ qua" },
      { status: 500 }
    );
  }
}
