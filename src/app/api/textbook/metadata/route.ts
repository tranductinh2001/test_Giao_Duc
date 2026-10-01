import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/textbook/metadata
 * Get available subjects and grades from textbooks
 *
 * Query params:
 * - subject: Filter grades by subject (returns grades available for that subject)
 * - grade: Filter subjects by grade (returns subjects available for that grade)
 * - includeAll: Include all textbooks (including not approved) - for upload flow
 * - No params: Returns all subjects and grades
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const grade = searchParams.get("grade");
    const includeAll = searchParams.get("includeAll") === "true";

    // Base filter - include all for upload flow, or only approved for regular flow
    const baseFilter: any = {
      isActive: true,
    };

    if (!includeAll) {
      baseFilter.isApproved = true;
      baseFilter.tocStatus = "COMPLETED";
    }

    // If subject is provided → return grades available for that subject
    if (subject) {
      const grades = await prisma.textbookBook.findMany({
        where: {
          ...baseFilter,
          subject: subject,
        },
        select: { grade: true },
        distinct: ["grade"],
        orderBy: { grade: "asc" },
      });

      return NextResponse.json({
        success: true,
        data: {
          grades: grades.map((g) => g.grade).filter(Boolean),
        },
      });
    }

    // If grade is provided → return subjects available for that grade
    if (grade) {
      const subjects = await prisma.textbookBook.findMany({
        where: {
          ...baseFilter,
          grade: grade,
        },
        select: { subject: true },
        distinct: ["subject"],
        orderBy: { subject: "asc" },
      });

      return NextResponse.json({
        success: true,
        data: {
          subjects: subjects.map((s) => s.subject).filter(Boolean),
        },
      });
    }

    // No params → return all subjects and grades
    const subjects = await prisma.textbookBook.findMany({
      where: baseFilter,
      select: { subject: true },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
    });

    const grades = await prisma.textbookBook.findMany({
      where: baseFilter,
      select: { grade: true },
      distinct: ["grade"],
      orderBy: { grade: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        subjects: subjects.map((s) => s.subject).filter(Boolean),
        grades: grades.map((g) => g.grade).filter(Boolean),
      },
    });
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải metadata" },
      { status: 500 }
    );
  }
}
