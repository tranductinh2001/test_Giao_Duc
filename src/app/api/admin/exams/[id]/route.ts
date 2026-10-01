import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidUUID } from "@/lib/security";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/exams/[id] - Update exam (admin only)
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // Check admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Validate UUID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    // Check if exam exists
    const existingExam = await prisma.exam.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingExam) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đề thi" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, description, timeLimit } = body;

    // Validate title if provided
    if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
      return NextResponse.json(
        { success: false, message: "Tiêu đề không hợp lệ" },
        { status: 400 }
      );
    }

    // Validate timeLimit if provided
    if (timeLimit !== undefined && (typeof timeLimit !== "number" || timeLimit < 60)) {
      return NextResponse.json(
        { success: false, message: "Thời gian tối thiểu là 60 giây" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit;

    // Update exam
    const updatedExam = await prisma.exam.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { examQuestions: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật đề thi thành công",
      data: {
        ...updatedExam,
        createdAt: updatedExam.createdAt.toISOString(),
        updatedAt: updatedExam.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating exam:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi cập nhật đề thi" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/exams/[id] - Delete exam (admin only)
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // Check admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Validate UUID
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    // Check if exam exists
    const existingExam = await prisma.exam.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingExam) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đề thi" },
        { status: 404 }
      );
    }

    // Delete exam (cascade deletes ExamQuestion and ExamAttempt)
    await prisma.exam.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa đề thi",
    });
  } catch (error) {
    console.error("Error deleting exam:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xóa đề thi" },
      { status: 500 }
    );
  }
}
