import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/lesson-plans/[id] - Get lesson plan details
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

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        subject: true,
        gradeLevel: true,
        schoolYear: true,
        circularId: true,
        originalFilename: true,
        filePath: true,
        fileSize: true,
        mimeType: true,
        status: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        circular: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
          },
        },
        collaborators: {
          select: {
            userId: true,
            role: true,
          },
        },
        reviewResults: {
          select: {
            id: true,
            overallScore: true,
            totalIssues: true,
            criticalIssues: true,
            errorIssues: true,
            warningIssues: true,
            status: true,
            reviewedAt: true,
            teachingMethodScore: true,
            teachingMethodAnalysis: true,
            ruleSet: {
              select: {
                code: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    // Get latest workflow session
    let latestSession = null;
    const latestSessionData = await prisma.workflowSession.findFirst({
      where: { lessonPlanId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        progress: true,
        currentStep: true,
        startedAt: true,
        completedAt: true,
        error: true,
      },
    });
    if (latestSessionData) {
      latestSession = {
        id: latestSessionData.id,
        status: latestSessionData.status,
        progress: latestSessionData.progress,
        currentStep: latestSessionData.currentStep,
        startedAt: latestSessionData.startedAt?.toISOString() || null,
        completedAt: latestSessionData.completedAt?.toISOString() || null,
        error: latestSessionData.error,
      };
    }

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    // Check ownership or collaboration
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

    // Determine user's permission level
    let userPermission: "OWNER" | "EDITOR" | "VIEWER" | "ADMIN" = "VIEWER";
    if (isAdmin) {
      userPermission = "ADMIN";
    } else if (isOwner) {
      userPermission = "OWNER";
    } else if (collaboration) {
      userPermission = collaboration.role;
    }

    // Check if deleted
    if (lessonPlan.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Giáo án đã bị xóa" },
        { status: 404 }
      );
    }

    // Transform response
    const latestReview = lessonPlan.reviewResults[0];
    const response = {
      id: lessonPlan.id,
      userId: lessonPlan.userId,
      title: lessonPlan.title,
      subject: lessonPlan.subject,
      gradeLevel: lessonPlan.gradeLevel,
      schoolYear: lessonPlan.schoolYear,
      circularId: lessonPlan.circularId,
      originalFilename: lessonPlan.originalFilename,
      fileSize: Number(lessonPlan.fileSize),
      mimeType: lessonPlan.mimeType,
      status: lessonPlan.status,
      currentVersion: lessonPlan.currentVersion,
      createdAt: lessonPlan.createdAt.toISOString(),
      updatedAt: lessonPlan.updatedAt.toISOString(),
      userPermission,
      circular: lessonPlan.circular,
      workflowSession: latestSession,
      reviewSummary: latestReview
        ? {
            reviewResultId: latestReview.id,
            ruleSetCode: latestReview.ruleSet?.code ?? null,
            ruleSetName: latestReview.ruleSet?.name ?? null,
            overallScore: latestReview.overallScore
              ? Number(latestReview.overallScore)
              : undefined,
            totalIssues: latestReview.totalIssues,
            criticalIssues: latestReview.criticalIssues,
            errorIssues: latestReview.errorIssues,
            warningIssues: latestReview.warningIssues,
            reviewStatus: latestReview.status,
            reviewedAt: latestReview.reviewedAt?.toISOString(),
            teachingMethodScore: latestReview.teachingMethodScore
              ? Number(latestReview.teachingMethodScore)
              : undefined,
            teachingMethodAnalysis: latestReview.teachingMethodAnalysis || null,
          }
        : undefined,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching lesson plan:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải giáo án" },
      { status: 500 }
    );
  }
}

// PATCH /api/lesson-plans/[id] - Update lesson plan metadata
export async function PATCH(
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
    const { title, subject, gradeLevel, schoolYear, circularId } = body;

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
    const canEdit = isOwner || isAdmin || collaboration?.role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json(
        { success: false, message: "Không có quyền chỉnh sửa" },
        { status: 403 }
      );
    }

    // Validate circularId if provided
    if (circularId !== undefined && circularId !== null) {
      const circular = await prisma.circularDocument.findUnique({
        where: { id: circularId },
        select: { id: true, isActive: true },
      });
      if (!circular || !circular.isActive) {
        return NextResponse.json(
          { success: false, message: "Công văn không hợp lệ" },
          { status: 400 }
        );
      }
    }

    // Update lesson plan
    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(subject !== undefined && { subject }),
        ...(gradeLevel !== undefined && { gradeLevel }),
        ...(schoolYear !== undefined && { schoolYear }),
        ...(circularId !== undefined && { circularId: circularId || null }),
      },
      select: {
        id: true,
        title: true,
        subject: true,
        gradeLevel: true,
        schoolYear: true,
        circularId: true,
        circular: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
          },
        },
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật giáo án",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating lesson plan:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi cập nhật giáo án" },
      { status: 500 }
    );
  }
}

// DELETE /api/lesson-plans/[id] - Soft delete lesson plan
export async function DELETE(
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

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        createdAt: true,
        deletedAt: true,
        reviewResults: {
          select: { id: true },
        },
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

    // Check ownership - only owner and admin can delete
    const isOwner = lessonPlan.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Chỉ chủ sở hữu hoặc Admin mới có quyền xóa" },
        { status: 403 }
      );
    }

    if (lessonPlan.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Giáo án đã bị xóa trước đó" },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.lessonPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa giáo án",
    });
  } catch (error) {
    console.error("Error deleting lesson plan:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xóa giáo án" },
      { status: 500 }
    );
  }
}
