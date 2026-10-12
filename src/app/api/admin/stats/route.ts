import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Bạn không có quyền truy cập thống kê quản trị." },
        { status: 403 }
      );
    }

    const [totalQuestions, totalExams, totalCategories, totalUsers] = await Promise.all([
      prisma.question.count(),
      prisma.exam.count(),
      prisma.category.count(),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalQuestions,
        totalExams,
        totalCategories,
        totalUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
