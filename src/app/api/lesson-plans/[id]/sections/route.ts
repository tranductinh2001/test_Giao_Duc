import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/lesson-plans/[id]/sections - Get parsed sections
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
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
      select: {
        userId: true,
        deletedAt: true,
        status: true,
        collaborators: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
    });

    if (!lessonPlan) {
      console.error("[Sections API] Lesson plan not found:", id);
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    const isOwner = lessonPlan.userId === session.user.id;
    const isCollaborator = lessonPlan.collaborators.length > 0;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isCollaborator && !isAdmin) {
      console.error("[Sections API] Access denied:", {
        userId: session.user.id,
        ownerId: lessonPlan.userId,
        role: session.user.role,
      });
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

    // Get sections with annotation count and review analysis
    const sections = await prisma.lessonPlanSection.findMany({
      where: { lessonPlanId: id },
      select: {
        id: true,
        lessonPlanId: true,
        versionNumber: true,
        sectionType: true,
        sectionTitle: true,
        sectionOrder: true,
        contentType: true,
        rawContent: true,
        parsedContent: true,
        wordCount: true,
        charCount: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        annotations: {
          select: {
            id: true,
            severity: true,
            status: true,
          },
        },
      },
      orderBy: { sectionOrder: "asc" },
    });

    const data = sections.map((section) => {
      const metadata = section.metadata as any;

      return {
        id: section.id,
        lessonPlanId: section.lessonPlanId,
        versionNumber: section.versionNumber,
        sectionType: section.sectionType,
        sectionTitle: section.sectionTitle,
        sectionOrder: section.sectionOrder,
        contentType: section.contentType,
        rawContent: section.rawContent,
        parsedContent: section.parsedContent,
        wordCount: section.wordCount,
        charCount: section.charCount,
        annotationCount: section.annotations.length,
        criticalCount: section.annotations.filter(a => a.severity === "CRITICAL").length,
        errorCount: section.annotations.filter(a => a.severity === "ERROR").length,
        warningCount: section.annotations.filter(a => a.severity === "WARNING").length,
        infoCount: section.annotations.filter(a => a.severity === "INFO").length,
        pendingCount: section.annotations.filter(a => a.status === "PENDING").length,
        analysis: metadata?.analysis || null,
        strengths: metadata?.strengths || [],
        weaknesses: metadata?.weaknesses || [],
        overallScore: metadata?.overallScore || 0,
        createdAt: section.createdAt.toISOString(),
        updatedAt: section.updatedAt.toISOString(),
      };
    });

    console.log("[Sections API] Fetched sections:", sections.length);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Sections API] Error:", error);
    console.error("[Sections API] Error details:", {
      message: error instanceof Error ? error.message : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải sections" },
      { status: 500 }
    );
  }
}

// POST /api/lesson-plans/[id]/sections - Create custom section
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const { sectionType, sectionTitle, rawContent } = body;

    // Validate input
    if (!sectionTitle || typeof sectionTitle !== "string" || !sectionTitle.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tiêu đề phần" },
        { status: 400 }
      );
    }

    if (!rawContent || typeof rawContent !== "string") {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập nội dung phần" },
        { status: 400 }
      );
    }

    // Check permission
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        userId: true,
        currentVersion: true,
        status: true,
        deletedAt: true,
        collaborators: {
          select: { userId: true, role: true },
        },
      },
    });

    if (!lessonPlan || lessonPlan.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    const isOwner = lessonPlan.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    const collaboration = lessonPlan.collaborators.find(
      (c) => c.userId === session.user.id
    );
    const canEdit = isOwner || isAdmin || collaboration?.role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json(
        { success: false, message: "Không có quyền chỉnh sửa" },
        { status: 403 }
      );
    }

    // Compute next section order
    const maxOrderSection = await prisma.lessonPlanSection.findFirst({
      where: {
        lessonPlanId: id,
        versionNumber: lessonPlan.currentVersion,
      },
      orderBy: { sectionOrder: "desc" },
      select: { sectionOrder: true },
    });

    const sectionOrder = (maxOrderSection?.sectionOrder ?? 0) + 1;
    const wordCount = rawContent.trim().split(/\s+/).length;
    const charCount = rawContent.length;

    // Create section
    const section = await prisma.lessonPlanSection.create({
      data: {
        lessonPlanId: id,
        versionNumber: lessonPlan.currentVersion,
        sectionType: sectionType || "OTHER",
        sectionTitle: sectionTitle.trim(),
        sectionOrder,
        contentType: "TEXT",
        rawContent: rawContent.trim(),
        wordCount,
        charCount,
      },
    });

    // Update lesson plan status to EDITING
    if (lessonPlan.status !== "EDITING") {
      await prisma.lessonPlan.update({
        where: { id },
        data: { status: "EDITING" },
      });
    }

    // Log review history
    await prisma.reviewHistory.create({
      data: {
        lessonPlanId: id,
        actionType: "EDITED",
        actionData: {
          action: "section_added",
          sectionId: section.id,
          sectionTitle: section.sectionTitle,
          sectionType: section.sectionType,
          sectionOrder: section.sectionOrder,
        },
        performedBy: session.user.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Đã thêm phần mới",
        data: {
          id: section.id,
          lessonPlanId: section.lessonPlanId,
          versionNumber: section.versionNumber,
          sectionType: section.sectionType,
          sectionTitle: section.sectionTitle,
          sectionOrder: section.sectionOrder,
          contentType: section.contentType,
          rawContent: section.rawContent,
          wordCount: section.wordCount,
          charCount: section.charCount,
          annotationCount: 0,
          createdAt: section.createdAt.toISOString(),
          updatedAt: section.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating section:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tạo phần mới" },
      { status: 500 }
    );
  }
}
