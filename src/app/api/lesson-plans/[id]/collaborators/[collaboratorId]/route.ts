import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string; collaboratorId: string }>;
}

// DELETE /api/lesson-plans/[id]/collaborators/[collaboratorId] - Remove collaborator
export async function DELETE(
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

    const { id, collaboratorId } = await context.params;

    // Check if user is owner or admin
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    const isOwner = lessonPlan.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Chỉ chủ sở hữu hoặc Admin mới có quyền xóa cộng tác viên" },
        { status: 403 }
      );
    }

    // Delete collaborator
    await prisma.lessonPlanCollaborator.delete({
      where: { id: collaboratorId },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa cộng tác viên",
    });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xóa cộng tác viên" },
      { status: 500 }
    );
  }
}

// PATCH /api/lesson-plans/[id]/collaborators/[collaboratorId] - Update collaborator role
export async function PATCH(
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

    const { id, collaboratorId } = await context.params;
    const { role } = await req.json();

    if (!role || !["VIEWER", "EDITOR"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Role không hợp lệ" },
        { status: 400 }
      );
    }

    // Check if user is owner or admin
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    const isOwner = lessonPlan.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Chỉ chủ sở hữu hoặc Admin mới có quyền cập nhật quyền" },
        { status: 403 }
      );
    }

    // Update role
    const updated = await prisma.lessonPlanCollaborator.update({
      where: { id: collaboratorId },
      data: { role },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật quyền thành ${role === "EDITOR" ? "chỉnh sửa" : "xem"}`,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating collaborator:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi cập nhật quyền" },
      { status: 500 }
    );
  }
}
