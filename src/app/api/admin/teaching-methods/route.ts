import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const flat = searchParams.get("flat") === "true";
    const withRelations = searchParams.get("relations") === "true";

    // Build include conditionally
    const includeRelations = withRelations
      ? {
          lessonMethods: {
            include: {
              teachingMethod: false,
            },
          },
          activityMethods: {
            include: {
              teachingMethod: false,
            },
          },
          gradeLevelMethods: true,
          subjectMethods: true,
          activityTypeMethods: true,
        }
      : undefined;

    const methods = await prisma.teachingMethod.findMany({
      where: flat ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: includeRelations,
    });

    return NextResponse.json({ success: true, data: methods });
  } catch (error) {
    console.error("Error fetching teaching methods:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải dữ liệu" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

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
    } = body;

    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, message: "Mã phương pháp không được để trống" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Tên phương pháp không được để trống" },
        { status: 400 }
      );
    }

    // Get max sortOrder if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxOrder = await prisma.teachingMethod.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      finalSortOrder = (maxOrder?.sortOrder ?? -1) + 1;
    }

    // Create teaching method with related data in transaction
    const method = await prisma.teachingMethod.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || null,
        objectives: objectives?.trim() || null,
        process: process?.trim() || null,
        advantages: advantages?.trim() || null,
        limitations: limitations?.trim() || null,
        conditions: conditions?.trim() || null,
        examples: examples?.trim() || null,
        keywords: keywords?.trim() || null,
        indicators: indicators?.trim() || null,
        criteria: criteria?.trim() || null,
        improvementSuggestions: improvementSuggestions?.trim() || null,
        sortOrder: finalSortOrder,
        // Add grade level links
        gradeLevelMethods: gradeLevels?.length > 0 ? {
          create: gradeLevels.map((g: string) => ({ gradeCode: g }))
        } : undefined,
        // Add subject links
        subjectMethods: subjects?.length > 0 ? {
          create: subjects.map((s: string) => ({ subjectCode: s }))
        } : undefined,
        // Add activity type links
        activityTypeMethods: activities?.length > 0 ? {
          create: activities.map((a: string) => ({ activityType: a }))
        } : undefined,
      },
      include: {
        gradeLevelMethods: true,
        subjectMethods: true,
        activityTypeMethods: true,
      },
    });

    return NextResponse.json({ success: true, data: method }, { status: 201 });
  } catch (error) {
    console.error("Error creating teaching method:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tạo phương pháp" },
      { status: 500 }
    );
  }
}
