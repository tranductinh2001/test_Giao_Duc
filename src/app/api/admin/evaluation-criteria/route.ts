import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/evaluation-criteria - Get all evaluation criteria
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
    const level = searchParams.get("level");
    const isActive = searchParams.get("isActive");

    const where: any = {};
    if (level) where.level = level;
    if (isActive !== null) where.isActive = isActive === "true";

    const criteria = await prisma.evaluationCriteria.findMany({
      where,
      orderBy: [{ level: "asc" }, { category: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: criteria,
    });
  } catch (error) {
    console.error("Error fetching evaluation criteria:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi lấy tiêu chí đánh giá" },
      { status: 500 }
    );
  }
}

// POST /api/admin/evaluation-criteria - Create new evaluation criteria
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
    const { name, code, level, category, description, maxScore, criteria, isActive } = body;

    // Validate required fields
    if (!name || !code || !level || !category || maxScore === undefined || !criteria) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.evaluationCriteria.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Mã tiêu chí đã tồn tại" },
        { status: 400 }
      );
    }

    const newCriteria = await prisma.evaluationCriteria.create({
      data: {
        name,
        code,
        level,
        category,
        description,
        maxScore,
        criteria,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã tạo tiêu chí đánh giá",
      data: newCriteria,
    });
  } catch (error) {
    console.error("Error creating evaluation criteria:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tạo tiêu chí đánh giá" },
      { status: 500 }
    );
  }
}
