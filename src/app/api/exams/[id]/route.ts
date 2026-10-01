import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await context.params;

    // Find the exam and verify ownership
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        isCustom: true,
        isPublished: true,
      },
    });

    if (!exam) {
      return NextResponse.json(
        { success: false, error: "EXAM_NOT_FOUND", message: "Không tìm thấy đề thi." },
        { status: 404 }
      );
    }

    // Only allow deletion of custom exams by the owner or admin
    if (exam.isCustom && exam.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Bạn không có quyền xóa đề thi này." },
        { status: 403 }
      );
    }

    // Don't allow users to delete published admin exams
    if (!exam.isCustom && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Không thể xóa đề thi của admin." },
        { status: 403 }
      );
    }

    // Delete the exam (cascade will handle related records)
    await prisma.exam.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa đề thi thành công."
    });
  } catch (error: any) {
    console.error("Error deleting exam:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message || "Lỗi khi xóa đề thi." },
      { status: 500 }
    );
  }
}
