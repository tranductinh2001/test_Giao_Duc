import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string; sectionId: string }>;
}

// GET /api/lesson-plans/[id]/sections/[sectionId] - Get section details
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id, sectionId } = await context.params;

    // Check permission
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        userId: true,
        collaborators: {
          select: {
            userId: true,
            role: true,
          },
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
    const collaboration = lessonPlan.collaborators.find(
      (c) => c.userId === session.user.id
    );
    const hasAccess = isOwner || isAdmin || collaboration;

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Get section
    const section = await prisma.lessonPlanSection.findUnique({
      where: { id: sectionId },
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
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!section) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy section" },
        { status: 404 }
      );
    }

    // Verify section belongs to lesson plan
    if (section.lessonPlanId !== id) {
      return NextResponse.json(
        { success: false, message: "Section không thuộc giáo án này" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error("Error fetching section:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải section" },
      { status: 500 }
    );
  }
}

// PATCH /api/lesson-plans/[id]/sections/[sectionId] - Update section content
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id, sectionId } = await context.params;
    const body = await req.json();
    const { rawContent, sectionTitle, createVersion } = body;

    // Validate input
    if (!rawContent || typeof rawContent !== "string") {
      return NextResponse.json(
        { success: false, message: "Nội dung không hợp lệ" },
        { status: 400 }
      );
    }

    // Check permission
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        userId: true,
        currentVersion: true,
        filePath: true,
        fileSize: true,
        status: true,
        collaborators: {
          select: {
            userId: true,
            role: true,
          },
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

    // Get section
    const section = await prisma.lessonPlanSection.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        lessonPlanId: true,
        versionNumber: true,
        rawContent: true,
      },
    });

    if (!section) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy section" },
        { status: 404 }
      );
    }

    // Verify section belongs to lesson plan
    if (section.lessonPlanId !== id) {
      return NextResponse.json(
        { success: false, message: "Section không thuộc giáo án này" },
        { status: 400 }
      );
    }

    // Calculate word and character counts
    const wordCount = rawContent.trim().split(/\s+/).length;
    const charCount = rawContent.length;

    // Create version if requested (for major changes)
    if (createVersion) {
      const newVersionNumber = lessonPlan.currentVersion + 1;

      // Create new version record
      await prisma.lessonPlanVersion.create({
        data: {
          lessonPlanId: id,
          versionNumber: newVersionNumber,
          filePath: lessonPlan.filePath,
          fileSize: lessonPlan.fileSize,
          changeSummary: `Chỉnh sửa section: ${sectionTitle || section.id}`,
          createdBy: session.user.id,
        },
      });

      // Update lesson plan version number
      await prisma.lessonPlan.update({
        where: { id },
        data: {
          currentVersion: newVersionNumber,
          status: "EDITING",
        },
      });
    } else {
      // Just update status to EDITING if not already
      if (lessonPlan.status !== "EDITING") {
        await prisma.lessonPlan.update({
          where: { id },
          data: { status: "EDITING" },
        });
      }
    }

    // Update section
    const updateData: {
      rawContent: string;
      wordCount: number;
      charCount: number;
      sectionTitle?: string;
    } = {
      rawContent: rawContent.trim(),
      wordCount,
      charCount,
    };

    if (sectionTitle !== undefined) {
      updateData.sectionTitle = sectionTitle.trim() || null;
    }

    const updated = await prisma.lessonPlanSection.update({
      where: { id: sectionId },
      data: updateData,
      select: {
        id: true,
        sectionTitle: true,
        rawContent: true,
        wordCount: true,
        charCount: true,
        updatedAt: true,
      },
    });

    // Log review history
    await prisma.reviewHistory.create({
      data: {
        lessonPlanId: id,
        actionType: "EDITED",
        actionData: {
          sectionId,
          sectionTitle: updated.sectionTitle,
          oldWordCount: section.rawContent.trim().split(/\s+/).length,
          newWordCount: wordCount,
          versionCreated: createVersion,
        },
        performedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật section",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi cập nhật section" },
      { status: 500 }
    );
  }
}

// DELETE /api/lesson-plans/[id]/sections/[sectionId] - Delete section
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id, sectionId } = await context.params;

    // Check permission - only owner and admin can delete
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        userId: true,
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

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Chỉ chủ sở hữu hoặc Admin mới có quyền xóa" },
        { status: 403 }
      );
    }

    // Verify section exists and belongs to lesson plan
    const section = await prisma.lessonPlanSection.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        lessonPlanId: true,
        sectionTitle: true,
      },
    });

    if (!section) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy section" },
        { status: 404 }
      );
    }

    if (section.lessonPlanId !== id) {
      return NextResponse.json(
        { success: false, message: "Section không thuộc giáo án này" },
        { status: 400 }
      );
    }

    // Delete section (cascade will handle annotations)
    await prisma.lessonPlanSection.delete({
      where: { id: sectionId },
    });

    // Log review history
    await prisma.reviewHistory.create({
      data: {
        lessonPlanId: id,
        actionType: "EDITED",
        actionData: {
          action: "section_deleted",
          sectionId,
          sectionTitle: section.sectionTitle,
        },
        performedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa section",
    });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xóa section" },
      { status: 500 }
    );
  }
}
