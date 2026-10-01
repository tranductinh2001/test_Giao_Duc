import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/lesson-plans/[id]/teaching-methods - Get relevant teaching methods for a lesson plan
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    // Check ownership
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: { userId: true, deletedAt: true },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    if (lessonPlan.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    if (lessonPlan.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Giáo án đã bị xóa" },
        { status: 404 }
      );
    }

    // Get all active teaching methods
    const teachingMethods = await prisma.teachingMethod.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // Get lesson plan sections to analyze content
    const sections = await prisma.lessonPlanSection.findMany({
      where: { lessonPlanId: id },
      select: { sectionType: true, rawContent: true },
    });

    // Analyze which teaching methods might be relevant
    // For now, return all methods with their linked lessons count
    const methodsWithRelevance = await Promise.all(
      teachingMethods.map(async (method) => {
        const linkedLessons = await prisma.lessonTeachingMethod.count({
          where: { teachingMethodId: method.id },
        });

        return {
          ...method,
          linkedLessons,
          isRecommended: linkedLessons > 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        methods: methodsWithRelevance,
        analysis: {
          sectionCount: sections.length,
          contentTypes: [...new Set(sections.map((s) => s.sectionType))],
        },
      },
    });
  } catch (error) {
    console.error("Error fetching teaching methods:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải dữ liệu" },
      { status: 500 }
    );
  }
}
