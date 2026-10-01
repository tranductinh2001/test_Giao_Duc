import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/evaluation-criteria/[id] - Get single criteria
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const criteria = await prisma.evaluationCriteria.findUnique({
      where: { id },
    });

    if (!criteria) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tiêu chí" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: criteria,
    });
  } catch (error) {
    console.error("Error fetching criteria:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi lấy tiêu chí" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/evaluation-criteria/[id] - Update criteria
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();

    const updated = await prisma.evaluationCriteria.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật tiêu chí",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating criteria:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi cập nhật tiêu chí" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/evaluation-criteria/[id] - Delete criteria
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    await prisma.evaluationCriteria.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa tiêu chí",
    });
  } catch (error) {
    console.error("Error deleting criteria:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xóa tiêu chí" },
      { status: 500 }
    );
  }
}
