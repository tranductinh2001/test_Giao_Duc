import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/education-config
 * Get education levels, grades, and subjects configuration
 *
 * Query params:
 * - level: Filter by education level (mam_non, tieu_hoc, thcs, thpt)
 * - grade: Filter grades by level
 * - subject: Filter subjects by level
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Chỉ Admin mới có quyền truy cập" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level");
    const includeGrades = searchParams.get("grades") === "true";
    const includeSubjects = searchParams.get("subjects") === "true";

    // Get education levels
    const levelsConfig = await prisma.systemConfig.findUnique({
      where: { key: "education_levels" },
    });

    // Get grades by level
    const gradesConfig = await prisma.systemConfig.findUnique({
      where: { key: "grades_by_level" },
    });

    // Get subjects by level
    const subjectsConfig = await prisma.systemConfig.findUnique({
      where: { key: "subjects_by_level" },
    });

    const levels = (levelsConfig?.value as any[]) || [];
    const gradesByLevel = (gradesConfig?.value as Record<string, any>) || {};
    const subjectsByLevel = (subjectsConfig?.value as Record<string, any>) || {};

    // If level specified, return filtered data
    if (level) {
      const levelData = levels.find((l: any) => l.id === level);
      if (!levelData) {
        return NextResponse.json(
          { success: false, message: "Cấp học không hợp lệ" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          level: levelData,
          grades: includeGrades ? (gradesByLevel[level] || []) : undefined,
          subjects: includeSubjects ? (subjectsByLevel[level] || []) : undefined,
        },
      });
    }

    // Return all data
    return NextResponse.json({
      success: true,
      data: {
        levels,
        gradesByLevel,
        subjectsByLevel,
      },
    });
  } catch (error) {
    console.error("Error getting education config:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải cấu hình giáo dục" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/education-config
 * Update education levels, grades, or subjects configuration
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Chỉ Admin mới có quyền truy cập" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key || !value) {
      return NextResponse.json(
        { success: false, message: "Thiếu key hoặc value" },
        { status: 400 }
      );
    }

    // Validate key
    const validKeys = ["education_levels", "grades_by_level", "subjects_by_level"];
    if (!validKeys.includes(key)) {
      return NextResponse.json(
        { success: false, message: "Key không hợp lệ" },
        { status: 400 }
      );
    }

    const updated = await prisma.systemConfig.upsert({
      where: { key },
      update: { value, updatedBy: session.user.id },
      create: { key, value, updatedBy: session.user.id },
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật cấu hình",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating education config:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi cập nhật cấu hình" },
      { status: 500 }
    );
  }
}
