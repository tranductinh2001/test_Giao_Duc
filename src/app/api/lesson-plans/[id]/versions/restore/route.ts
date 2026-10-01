import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { copyFile } from "fs/promises";
import { join } from "path";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Chưa đăng nhập" }, { status: 401 });
    }
    const { id } = await context.params;
    const body = await req.json();
    const { versionNumber } = body;
    if (!versionNumber || typeof versionNumber !== "number") {
      return NextResponse.json({ success: false, message: "Version number không hợp lệ" }, { status: 400 });
    }
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: { userId: true, filePath: true, currentVersion: true, collaborators: { where: { userId: session.user.id }, select: { role: true } } },
    });
    if (!lessonPlan) {
      return NextResponse.json({ success: false, message: "Không tìm thấy giáo án" }, { status: 404 });
    }
    const isOwner = lessonPlan.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    const canEdit = isOwner || isAdmin || lessonPlan.collaborators.some(c => c.role === "EDITOR");
    if (!canEdit) {
      return NextResponse.json({ success: false, message: "Không có quyền chỉnh sửa" }, { status: 403 });
    }
    const version = await prisma.documentVersion.findUnique({
      where: { lessonPlanId_versionNumber: { lessonPlanId: id, versionNumber } },
    });
    if (!version) {
      return NextResponse.json({ success: false, message: "Không tìm thấy version" }, { status: 404 });
    }
    const sourcePath = version.filePath;
    const destPath = join(process.cwd(), lessonPlan.filePath);
    await copyFile(sourcePath, destPath);
    await prisma.lessonPlan.update({ where: { id }, data: { currentVersion: versionNumber } });
    await prisma.reviewHistory.create({
      data: {
        lessonPlanId: id,
        actionType: "EDITED",
        actionData: { action: "version_restored", versionNumber, restoredFrom: version.fileHash },
        performedBy: session.user.id,
      },
    });
    return NextResponse.json({ success: true, message: `Đã khôi phục version ${versionNumber}` });
  } catch (error) {
    console.error("Error restoring version:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi khôi phục version" }, { status: 500 });
  }
}