import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/lesson-plans/bulk-delete-info - Get info for bulk deletion confirmation
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { lessonPlanIds } = body;

    if (!lessonPlanIds || !Array.isArray(lessonPlanIds) || lessonPlanIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Danh sách ID giáo án không hợp lệ" },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";

    // Get lesson plans with review counts
    const lessonPlans = await prisma.lessonPlan.findMany({
      where: {
        id: { in: lessonPlanIds },
        OR: [
          { userId: session.user.id },
          ...(isAdmin ? [{ userId: { not: session.user.id } }] : []),
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        reviewResults: {
          select: { id: true },
        },
      },
    });

    const totalReviews = lessonPlans.reduce((sum, plan) => sum + plan.reviewResults.length, 0);

    return NextResponse.json({
      success: true,
      data: {
        count: lessonPlans.length,
        totalReviews,
        lessonPlans: lessonPlans.map((plan) => ({
          id: plan.id,
          title: plan.title,
          createdAt: plan.createdAt.toISOString(),
          reviewCount: plan.reviewResults.length,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching bulk delete info:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải thông tin" },
      { status: 500 }
    );
  }
}
