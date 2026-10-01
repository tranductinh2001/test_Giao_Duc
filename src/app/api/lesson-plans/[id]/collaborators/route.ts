import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/lesson-plans/[id]/collaborators - Get all collaborators
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

    // Check if user has access to this lesson plan
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        userId: true,
        collaborators: {
          select: { userId: true },
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
    const isCollaborator = lessonPlan.collaborators.some(
      (c) => c.userId === session.user.id
    );

    if (!isOwner && !isAdmin && !isCollaborator) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Get all collaborators with user info
    const collaborators = await prisma.lessonPlanCollaborator.findMany({
      where: { lessonPlanId: id },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        inviter: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: collaborators,
    });
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải danh sách cộng tác viên" },
      { status: 500 }
    );
  }
}

// POST /api/lesson-plans/[id]/collaborators - Add collaborator
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
    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin email hoặc role" },
        { status: 400 }
      );
    }

    if (!["VIEWER", "EDITOR"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Role không hợp lệ" },
        { status: 400 }
      );
    }

    // Check if user is owner or admin
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: { userId: true },
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
        { success: false, message: "Chỉ chủ sở hữu hoặc Admin mới có quyền thêm cộng tác viên" },
        { status: 403 }
      );
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng với email này" },
        { status: 404 }
      );
    }

    // Check if already owner
    if (targetUser.id === lessonPlan.userId) {
      return NextResponse.json(
        { success: false, message: "Người dùng này là chủ sở hữu giáo án" },
        { status: 400 }
      );
    }

    // Check if already collaborator
    const existing = await prisma.lessonPlanCollaborator.findUnique({
      where: {
        lessonPlanId_userId: {
          lessonPlanId: id,
          userId: targetUser.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Người dùng đã là cộng tác viên" },
        { status: 400 }
      );
    }

    // Add collaborator
    const collaborator = await prisma.lessonPlanCollaborator.create({
      data: {
        lessonPlanId: id,
        userId: targetUser.id,
        role,
        addedBy: session.user.id,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã thêm ${targetUser.name} với quyền ${role === "EDITOR" ? "chỉnh sửa" : "xem"}`,
      data: collaborator,
    });
  } catch (error) {
    console.error("Error adding collaborator:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi thêm cộng tác viên" },
      { status: 500 }
    );
  }
}
