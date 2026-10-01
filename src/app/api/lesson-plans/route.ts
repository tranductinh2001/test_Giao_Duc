import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/lesson-plans - List user's lesson plans
// GET /api/lesson-plans?status=trashed - List deleted lesson plans
// POST /api/lesson-plans - Bulk delete or restore
// DELETE /api/lesson-plans - Bulk permanent delete (admin only)

// GET /api/lesson-plans - List user's lesson plans
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
    const status = searchParams.get("status");
    const subject = searchParams.get("subject");
    const includeTrashed = searchParams.get("includeTrashed") === "true";
    const page = parseInt(searchParams.get("page") || "0");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

    // Build where clause
    const where: any = {
      userId: session.user.id,
    };

    // Handle trashed/deleted status
    if (status === "trashed" || includeTrashed) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    if (status && status !== "trashed") {
      where.status = status;
    }
    if (subject) {
      where.subject = subject;
    }

    // Get total count
    const totalItems = await prisma.lessonPlan.count({ where });

    // Get lesson plans with review summary
    const lessonPlans = await prisma.lessonPlan.findMany({
      where,
      select: {
        id: true,
        userId: true,
        title: true,
        subject: true,
        gradeLevel: true,
        schoolYear: true,
        originalFilename: true,
        fileSize: true,
        mimeType: true,
        status: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
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
      orderBy: {
        createdAt: "desc",
      },
      skip: page * pageSize,
      take: pageSize,
    });

    // Transform response
    const data = lessonPlans.map((plan) => {
      const latestReview = plan.reviewResults[0];

      return {
        id: plan.id,
        userId: plan.userId,
        title: plan.title,
        subject: plan.subject,
        gradeLevel: plan.gradeLevel,
        schoolYear: plan.schoolYear,
        originalFilename: plan.originalFilename,
        fileSize: Number(plan.fileSize),
        mimeType: plan.mimeType,
        status: plan.status,
        currentVersion: plan.currentVersion,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
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
            }
          : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching lesson plans:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải danh sách" },
      { status: 500 }
    );
  }
}

// POST /api/lesson-plans - Bulk soft delete or restore
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
    const { action, lessonPlanIds } = body;

    if (!lessonPlanIds || !Array.isArray(lessonPlanIds) || lessonPlanIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Danh sách ID giáo án không hợp lệ" },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";

    if (action === "delete") {
      // Bulk soft delete
      // Only owner can delete their own, admin can delete any
      const result = await prisma.lessonPlan.updateMany({
        where: {
          id: { in: lessonPlanIds },
          OR: [
            { userId: session.user.id },
            ...(isAdmin ? [{ userId: { not: session.user.id } }] : []),
          ],
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      // Create history entries
      await prisma.reviewHistory.createMany({
        data: lessonPlanIds.map((id: string) => ({
          lessonPlanId: id,
          actionType: "BULK_DELETED",
          actionData: { action: "bulk_soft_delete", count: result.count },
          performedBy: session.user.id,
        })),
      });

      return NextResponse.json({
        success: true,
        message: `Đã xóa ${result.count} giáo án`,
        count: result.count,
      });
    } else if (action === "restore") {
      // Bulk restore (only owner or admin can restore)
      const result = await prisma.lessonPlan.updateMany({
        where: {
          id: { in: lessonPlanIds },
          OR: [
            { userId: session.user.id },
            ...(isAdmin ? [{ userId: { not: session.user.id } }] : []),
          ],
          deletedAt: { not: null },
        },
        data: { deletedAt: null },
      });

      // Create history entries
      await prisma.reviewHistory.createMany({
        data: lessonPlanIds.map((id: string) => ({
          lessonPlanId: id,
          actionType: "BULK_RESTORED",
          actionData: { action: "bulk_restore", count: result.count },
          performedBy: session.user.id,
        })),
      });

      return NextResponse.json({
        success: true,
        message: `Đã khôi phục ${result.count} giáo án`,
        count: result.count,
      });
    } else {
      return NextResponse.json(
        { success: false, message: "Hành động không hợp lệ. Sử dụng 'delete' hoặc 'restore'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in bulk operation:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi thực hiện thao tác" },
      { status: 500 }
    );
  }
}

// DELETE /api/lesson-plans - Bulk permanent delete (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // Only admin can permanently delete
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Chỉ Admin mới có quyền xóa vĩnh viễn" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { lessonPlanIds, confirm } = body;

    if (!lessonPlanIds || !Array.isArray(lessonPlanIds) || lessonPlanIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Danh sách ID giáo án không hợp lệ" },
        { status: 400 }
      );
    }

    if (confirm !== true) {
      return NextResponse.json(
        { success: false, message: "Cần xác nhận để xóa vĩnh viễn" },
        { status: 400 }
      );
    }

    // Permanently delete lesson plans and all related data
    const result = await prisma.lessonPlan.deleteMany({
      where: {
        id: { in: lessonPlanIds },
        deletedAt: { not: null }, // Only already soft-deleted items
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa vĩnh viễn ${result.count} giáo án`,
      count: result.count,
    });
  } catch (error) {
    console.error("Error in permanent delete:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xóa vĩnh viễn" },
      { status: 500 }
    );
  }
}
