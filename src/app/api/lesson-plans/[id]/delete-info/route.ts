import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/lesson-plans/[id]/delete-info - Get info for deletion confirmation
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        createdAt: true,
        deletedAt: true,
        reviewResults: {
          select: { id: true },
        },
      },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    // Check ownership - only owner and admin can delete
    const isOwner = lessonPlan.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Chỉ chủ sở hữu hoặc Admin mới có quyền xóa" },
        { status: 403 }
      );
    }

    if (lessonPlan.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Giáo án đã bị xóa trước đó" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: lessonPlan.id,
        title: lessonPlan.title,
        createdAt: lessonPlan.createdAt.toISOString(),
        reviewCount: lessonPlan.reviewResults.length,
      },
    });
  } catch (error) {
    console.error("Error fetching delete info:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải thông tin" },
      { status: 500 }
    );
  }
}
