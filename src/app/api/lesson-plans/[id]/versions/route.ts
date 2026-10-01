import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Chưa đăng nhập" }, { status: 401 });
    }
    const { id } = await context.params;
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: { userId: true, deletedAt: true, collaborators: { where: { userId: session.user.id } } },
    });
    if (!lessonPlan || lessonPlan.deletedAt) {
      return NextResponse.json({ success: false, message: "Không tìm thấy giáo án" }, { status: 404 });
    }
    const isOwner = lessonPlan.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    const isCollaborator = lessonPlan.collaborators.length > 0;
    if (!isOwner && !isAdmin && !isCollaborator) {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }
    const versions = await prisma.documentVersion.findMany({
      where: { lessonPlanId: id },
      include: { User: { select: { id: true, name: true, email: true } } },
      orderBy: { versionNumber: "desc" },
    });
    return NextResponse.json({ success: true, data: versions });
  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi tải versions" }, { status: 500 });
  }
}