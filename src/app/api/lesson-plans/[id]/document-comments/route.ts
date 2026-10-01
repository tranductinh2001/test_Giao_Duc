import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/lesson-plans/[id]/document-comments - Get document comments
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
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");
    const status = searchParams.get("status");

    // Check access
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        userId: true,
        deletedAt: true,
        collaborators: {
          where: { userId: session.user.id },
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
    const isCollaborator = lessonPlan.collaborators.length > 0;

    if (!isOwner && !isAdmin && !isCollaborator) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Build query
    const where: any = { lessonPlanId: id };
    if (sectionId) where.sectionId = sectionId;
    if (status) where.status = status;

    // Get comments
    const comments = await prisma.documentComment.findMany({
      where,
      include: {
        Annotation: {
          select: {
            highlightedText: true,
            message: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error("Error fetching document comments:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải comments" },
      { status: 500 }
    );
  }
}

// POST /api/lesson-plans/[id]/document-comments - Create document comment
export async function POST(req: NextRequest, context: RouteContext) {
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
    const {
      sectionId,
      annotationId,
      paragraphId,
      startOffset,
      endOffset,
      commentText,
      severity,
      reason,
      suggestion,
      rewriteContent,
    } = body;

    // Check permissions
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
    const isAdmin = session.user.role === "ADMIN";
    const canEdit = isOwner || isAdmin || lessonPlan.collaborators.some(c => c.role === "EDITOR");

    if (!canEdit) {
      return NextResponse.json(
        { success: false, message: "Không có quyền chỉnh sửa" },
        { status: 403 }
      );
    }

    // Create comment
    const comment = await prisma.documentComment.create({
      data: {
        id: crypto.randomUUID(),
        lessonPlanId: id,
        sectionId,
        annotationId,
        paragraphId,
        startOffset,
        endOffset,
        commentText,
        severity: severity || "INFO",
        reason,
        suggestion,
        rewriteContent,
        createdBy: session.user.id,
        updatedAt: new Date(),
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Đã tạo comment",
        data: comment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating document comment:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tạo comment" },
      { status: 500 }
    );
  }
}
