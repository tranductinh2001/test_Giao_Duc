import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/textbook/books
 * Get textbooks with optional filtering
 *
 * Query params:
 * - subject: Filter by subject (e.g., "Toán", "Văn")
 * - grade: Filter by grade (e.g., "10", "11")
 * - search: Search by name/code
 * - includeAll: Include all textbooks (including not approved) - for upload flow
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
    const search = searchParams.get("search");
    const includeAll = searchParams.get("includeAll") === "true";

    // Build where clause
    const where: any = {
      isActive: true,
    };

    if (!includeAll) {
      where.isApproved = true;
      where.tocStatus = "COMPLETED";
    }

    if (subject) {
      where.subject = subject;
    }

    if (grade) {
      where.grade = grade;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const textbooks = await prisma.textbookBook.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        grade: true,
        subject: true,
        version: true,
        pageCount: true,
      },
      orderBy: [{ subject: "asc" }, { grade: "asc" }, { name: "asc" }],
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: textbooks,
    });
  } catch (error) {
    console.error("Error fetching textbooks:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải sách giáo khoa" },
      { status: 500 }
    );
  }
}
