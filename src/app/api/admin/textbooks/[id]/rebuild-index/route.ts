import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rebuildTocIndex } from "@/core/textbook/indexer";

/**
 * POST /api/admin/textbooks/[id]/rebuild-index
 * Rebuild TOC index for a textbook
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await params;

    const book = await prisma.textbookBook.findUnique({
      where: { id },
    });

    if (!book) {
      return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
    }

    // Check if there's already a running job
    const runningJob = await prisma.textbookIndexJob.findFirst({
      where: {
        bookId: id,
        status: { in: ["QUEUED", "PROCESSING"] },
      },
    });

    if (runningJob) {
      return NextResponse.json({
        success: false,
        message: "Đang có job đánh chỉ mục đang chạy",
      }, { status: 400 });
    }

    // Start rebuild in background
    rebuildTocIndex(id).catch((err) => {
      console.error("[Textbooks] Rebuild failed:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Đã bắt đầu rebuild TOC index",
    });
  } catch (error) {
    console.error("[Textbooks] Rebuild error:", error);
    const message = error instanceof Error ? error.message : "Lỗi khi rebuild";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
