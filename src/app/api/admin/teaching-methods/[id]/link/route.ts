import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get all lesson methods for this teaching method
    const lessonMethods = await prisma.lessonTeachingMethod.findMany({
      where: { teachingMethodId: id },
      include: {
        textbookBook: {
          select: { id: true, name: true },
        },
        textbookChapter: {
          select: { id: true, name: true },
        },
      },
      orderBy: { priority: "asc" },
    });

    // Get all activity methods for this teaching method
    const activityMethods = await prisma.activityTeachingMethod.findMany({
      where: { teachingMethodId: id },
      orderBy: { priority: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        lessons: lessonMethods,
        activities: activityMethods,
      },
    });
  } catch (error) {
    console.error("Error fetching teaching method links:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải dữ liệu" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { type, targetId, priority, note, isRecommended } = body;

    // Verify teaching method exists
    const method = await prisma.teachingMethod.findUnique({
      where: { id },
    });

    if (!method) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phương pháp" },
        { status: 404 }
      );
    }

    if (type === "lesson") {
      const { textbookBookId, textbookChapterId, lessonTitle } = body;

      if (!lessonTitle?.trim()) {
        return NextResponse.json(
          { success: false, message: "Tên bài học không được để trống" },
          { status: 400 }
        );
      }

      const lessonMethod = await prisma.lessonTeachingMethod.create({
        data: {
          teachingMethodId: id,
          lessonTitle: lessonTitle.trim(),
          textbookBookId: textbookBookId || null,
          textbookChapterId: textbookChapterId || null,
          priority: priority ?? 0,
          note: note?.trim() || null,
          isRecommended: isRecommended ?? true,
        },
      });

      return NextResponse.json({ success: true, data: lessonMethod }, { status: 201 });
    } else if (type === "activity") {
      if (!targetId) {
        return NextResponse.json(
          { success: false, message: "Mã hoạt động không được để trống" },
          { status: 400 }
        );
      }

      const activityMethod = await prisma.activityTeachingMethod.create({
        data: {
          teachingMethodId: id,
          activityCode: targetId,
          priority: priority ?? 0,
          note: note?.trim() || null,
          isRecommended: isRecommended ?? true,
        },
      });

      return NextResponse.json({ success: true, data: activityMethod }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, message: "Loại liên kết không hợp lệ" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating teaching method link:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tạo liên kết" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get("linkId");
    const linkType = searchParams.get("type"); // "lesson" or "activity"

    if (!linkId || !linkType) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin liên kết" },
        { status: 400 }
      );
    }

    if (linkType === "lesson") {
      await prisma.lessonTeachingMethod.delete({
        where: { id: linkId },
      });
    } else if (linkType === "activity") {
      await prisma.activityTeachingMethod.delete({
        where: { id: linkId },
      });
    } else {
      return NextResponse.json(
        { success: false, message: "Loại liên kết không hợp lệ" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Đã xóa liên kết" });
  } catch (error) {
    console.error("Error deleting teaching method link:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xóa liên kết" },
      { status: 500 }
    );
  }
}
