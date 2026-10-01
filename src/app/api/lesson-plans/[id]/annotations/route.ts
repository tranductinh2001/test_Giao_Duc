import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/lesson-plans/[id]/annotations - Get all annotations for a lesson plan
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

    // Check ownership or collaboration
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        userId: true,
        collaborators: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    const isOwner = lessonPlan.userId === session.user.id;
    const isCollaborator = lessonPlan.collaborators.length > 0;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isCollaborator && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Get latest review result
    const reviewResult = await prisma.reviewResult.findFirst({
      where: { lessonPlanId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!reviewResult) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get query params for filtering
    const searchParams = req.nextUrl.searchParams;
    const sectionId = searchParams.get("sectionId");
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");

    // Build where clause
    const where: any = { reviewResultId: reviewResult.id };
    if (sectionId) where.sectionId = sectionId;
    if (severity && severity !== "ALL") where.severity = severity;
    if (status && status !== "ALL") where.status = status;

    // Get all annotations
    const annotations = await prisma.annotation.findMany({
      where,
      include: {
        section: {
          select: {
            id: true,
            sectionTitle: true,
            sectionType: true,
            sectionOrder: true,
          },
        },
        rule: {
          select: {
            id: true,
            ruleName: true,
          },
        },
      },
      orderBy: [
        { section: { sectionOrder: "asc" } },
        { startPosition: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      data: annotations,
    });
  } catch (error) {
    console.error("Error fetching annotations:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải annotations" },
      { status: 500 }
    );
  }
}
