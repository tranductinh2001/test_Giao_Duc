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

    const method = await prisma.teachingMethod.findUnique({
      where: { id },
      include: {
        lessonMethods: {
          include: {
            textbookBook: true,
            textbookChapter: true,
          },
          orderBy: { priority: "asc" },
        },
        activityMethods: {
          orderBy: { priority: "asc" },
        },
        gradeLevelMethods: true,
        subjectMethods: true,
        activityTypeMethods: true,
      },
    });

    if (!method) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phương pháp" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: method });
  } catch (error) {
    console.error("Error fetching teaching method:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải dữ liệu" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
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
    const {
      code,
      name,
      description,
      objectives,
      process,
      advantages,
      limitations,
      conditions,
      examples,
      keywords,
      indicators,
      criteria,
      improvementSuggestions,
      gradeLevels,
      subjects,
      activities,
      sortOrder,
      isActive,
    } = body;

    const existing = await prisma.teachingMethod.findUnique({
      where: { id },
      include: {
        gradeLevelMethods: true,
        subjectMethods: true,
        activityTypeMethods: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phương pháp" },
        { status: 404 }
      );
    }

    if (code !== undefined && (!code || !code.trim())) {
      return NextResponse.json(
        { success: false, message: "Mã phương pháp không được để trống" },
        { status: 400 }
      );
    }

    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json(
        { success: false, message: "Tên phương pháp không được để trống" },
        { status: 400 }
      );
    }

    // Update main data
    await prisma.teachingMethod.update({
      where: { id },
      data: {
        code: code !== undefined ? code.trim().toUpperCase() : undefined,
        name: name?.trim(),
        description: description !== undefined ? description?.trim() || null : undefined,
        objectives: objectives !== undefined ? objectives?.trim() || null : undefined,
        process: process !== undefined ? process?.trim() || null : undefined,
        advantages: advantages !== undefined ? advantages?.trim() || null : undefined,
        limitations: limitations !== undefined ? limitations?.trim() || null : undefined,
        conditions: conditions !== undefined ? conditions?.trim() || null : undefined,
        examples: examples !== undefined ? examples?.trim() || null : undefined,
        keywords: keywords !== undefined ? keywords?.trim() || null : undefined,
        indicators: indicators !== undefined ? indicators?.trim() || null : undefined,
        criteria: criteria !== undefined ? criteria?.trim() || null : undefined,
        improvementSuggestions: improvementSuggestions !== undefined ? improvementSuggestions?.trim() || null : undefined,
        sortOrder: sortOrder ?? existing.sortOrder,
        isActive: isActive ?? existing.isActive,
      },
    });

    // Update grade level links if provided
    if (gradeLevels !== undefined) {
      // Delete existing
      await prisma.teachingMethodGradeLevel.deleteMany({
        where: { teachingMethodId: id },
      });
      // Create new
      if (gradeLevels.length > 0) {
        await prisma.teachingMethodGradeLevel.createMany({
          data: gradeLevels.map((g: string) => ({
            teachingMethodId: id,
            gradeCode: g,
          })),
        });
      }
    }

    // Update subject links if provided
    if (subjects !== undefined) {
      await prisma.teachingMethodSubject.deleteMany({
        where: { teachingMethodId: id },
      });
      if (subjects.length > 0) {
        await prisma.teachingMethodSubject.createMany({
          data: subjects.map((s: string) => ({
            teachingMethodId: id,
            subjectCode: s,
          })),
        });
      }
    }

    // Update activity type links if provided
    if (activities !== undefined) {
      await prisma.teachingMethodActivity.deleteMany({
        where: { teachingMethodId: id },
      });
      if (activities.length > 0) {
        await prisma.teachingMethodActivity.createMany({
          data: activities.map((a: string) => ({
            teachingMethodId: id,
            activityType: a,
          })),
        });
      }
    }

    // Fetch updated method
    const method = await prisma.teachingMethod.findUnique({
      where: { id },
      include: {
        gradeLevelMethods: true,
        subjectMethods: true,
        activityTypeMethods: true,
      },
    });

    return NextResponse.json({ success: true, data: method });
  } catch (error) {
    console.error("Error updating teaching method:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi cập nhật phương pháp" },
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

    const existing = await prisma.teachingMethod.findUnique({
      where: { id },
      include: {
        lessonMethods: true,
        activityMethods: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy phương pháp" },
        { status: 404 }
      );
    }

    // Check if method is in use
    if (existing.lessonMethods.length > 0 || existing.activityMethods.length > 0) {
      // Soft delete instead
      await prisma.teachingMethod.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: "Đã vô hiệu hóa phương pháp (đang được sử dụng)",
      });
    }

    await prisma.teachingMethod.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa phương pháp" });
  } catch (error) {
    console.error("Error deleting teaching method:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xóa phương pháp" },
      { status: 500 }
    );
  }
}
