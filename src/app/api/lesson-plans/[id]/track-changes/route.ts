import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applyAIRewriteWithTracking, acceptAllTrackChanges, rejectAllTrackChanges } from "@/lib/track-changes-service";
import { join } from "path";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/lesson-plans/[id]/track-changes/apply - Apply AI rewrite with tracking
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
    const { rewrites, action } = body;

    // Check permissions
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        userId: true,
        filePath: true,
        title: true,
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

    const filePath = join(process.cwd(), lessonPlan.filePath);

    let outputPath: string;
    let actionType: string;

    switch (action) {
      case "apply":
        if (!rewrites || !Array.isArray(rewrites)) {
          return NextResponse.json(
            { success: false, message: "Rewrites không hợp lệ" },
            { status: 400 }
          );
        }

        outputPath = await applyAIRewriteWithTracking(
          filePath,
          rewrites.map((r: any) => ({
            originalText: r.originalText,
            newText: r.newText,
            author: "AI Assistant",
          }))
        );
        actionType = "AI rewrite applied with track changes";
        break;

      case "accept":
        outputPath = await acceptAllTrackChanges(filePath);
        actionType = "All track changes accepted";
        break;

      case "reject":
        outputPath = await rejectAllTrackChanges(filePath);
        actionType = "All track changes rejected";
        break;

      default:
        return NextResponse.json(
          { success: false, message: "Action không hợp lệ" },
          { status: 400 }
        );
    }

    // Create new version
    const latestVersion = await prisma.documentVersion.findFirst({
      where: { lessonPlanId: id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const fs = await import("fs/promises");
    const fileStats = await fs.stat(outputPath);
    const fileBuffer = await fs.readFile(outputPath);
    const crypto = await import("crypto");
    const fileHash = crypto.createHash("md5").update(fileBuffer).digest("hex");

    const newVersion = await prisma.documentVersion.create({
      data: {
        id: crypto.randomUUID(),
        lessonPlanId: id,
        versionNumber: (latestVersion?.versionNumber || 0) + 1,
        filePath: outputPath,
        fileUrl: outputPath.replace(process.cwd() + "/public", ""),
        fileSize: BigInt(fileStats.size),
        fileHash,
        changeSummary: actionType,
        changesCount: Array.isArray(rewrites) ? rewrites.length : 1,
        createdBy: session.user.id,
      },
    });

    // Log review history
    await prisma.reviewHistory.create({
      data: {
        lessonPlanId: id,
        actionType: "EDITED",
        actionData: {
          action: "track_changes",
          type: action,
          version: newVersion.versionNumber,
          changesCount: Array.isArray(rewrites) ? rewrites.length : 1,
        },
        performedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã ${action === "apply" ? "áp dụng" : action === "accept" ? "chấp nhận" : "từ chối"} thay đổi`,
      data: {
        versionNumber: newVersion.versionNumber,
        fileUrl: newVersion.fileUrl,
        changesCount: newVersion.changesCount,
      },
    });
  } catch (error) {
    console.error("Error applying track changes:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi xử lý track changes" },
      { status: 500 }
    );
  }
}
