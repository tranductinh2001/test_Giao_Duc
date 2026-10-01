import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/licenses/[id] - Update license
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
    const { status, durationDays } = body;

    const updateData: any = {};

    if (status) {
      // Validate status
      const validStatuses = ["UNUSED", "ACTIVATED", "EXPIRED", "REVOKED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, message: "Status không hợp lệ" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (durationDays !== undefined) {
      if (durationDays < 1) {
        return NextResponse.json(
          { success: false, message: "Thời hạn phải lớn hơn 0" },
          { status: 400 }
        );
      }
      updateData.durationDays = durationDays;
    }

    const updated = await prisma.license.update({
      where: { id },
      data: updateData,
      include: {
        activatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật license",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating license:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi cập nhật license" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/licenses/[id] - Delete license
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

    // Check if license is unused
    const license = await prisma.license.findUnique({
      where: { id },
      select: { status: true, code: true },
    });

    if (!license) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy license" },
        { status: 404 }
      );
    }

    if (license.status !== "UNUSED") {
      return NextResponse.json(
        {
          success: false,
          message: "Chỉ có thể xóa license chưa sử dụng",
        },
        { status: 400 }
      );
    }

    await prisma.license.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa license",
    });
  } catch (error) {
    console.error("Error deleting license:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xóa license" },
      { status: 500 }
    );
  }
}
