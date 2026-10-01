import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/lesson-plans/[id]/file - Download original uploaded file
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

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        userId: true,
        filePath: true,
        originalFilename: true,
        mimeType: true,
        collaborators: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    // Check access
    const isOwner = lessonPlan.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    const hasCollaboration = lessonPlan.collaborators.length > 0;

    if (!isOwner && !isAdmin && !hasCollaboration) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    if (!lessonPlan.filePath) {
      console.error("[File API] No filePath in database for lesson plan:", id);
      return NextResponse.json(
        { success: false, message: "File path not found in database" },
        { status: 404 }
      );
    }

    // Read file from storage - try multiple locations
    console.log("[File API] Attempting to read file:", lessonPlan.filePath);

    // Try different path combinations - correct path without "public" first
    // eslint-disable-next-line turbopack/no-turbopack-imports
    const possiblePaths = [
      join(/*turbopackIgnore: true*/ process.cwd(), lessonPlan.filePath), // /uploads/xxx (correct)
      join(/*turbopackIgnore: true*/ process.cwd(), "public", lessonPlan.filePath), // legacy path
      join(/*turbopackIgnore: true*/ process.cwd(), "public/uploads/circulars", lessonPlan.originalFilename || ""), // old location
      join(/*turbopackIgnore: true*/ process.cwd(), "public/exports", lessonPlan.originalFilename || ""), // exports location
    ];

    let fileBuffer: Buffer | null = null;
    let successPath: string | null = null;

    for (const path of possiblePaths) {
      try {
        console.log("[File API] Trying path:", path);
        fileBuffer = await readFile(path);
        successPath = path;
        console.log("[File API] File found at:", path);
        break;
      } catch (err) {
        // Continue to next path
      }
    }

    if (!fileBuffer || !successPath) {
      console.error("[File API] File not found in any location");
      return NextResponse.json(
        {
          success: false,
          message: "File not found in storage",
          filePath: lessonPlan.filePath,
          triedPaths: possiblePaths
        },
        { status: 404 }
      );
    }

    // Return file
    return new NextResponse(fileBuffer as any, {
      headers: {
        "Content-Type": lessonPlan.mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${lessonPlan.originalFilename || "document.docx"}"`,
      },
    });
  } catch (error) {
    console.error("[File API] Error downloading file:", error);
    console.error("[File API] Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Lỗi khi tải file",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
