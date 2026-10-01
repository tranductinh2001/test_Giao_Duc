import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteTextbook } from "@/core/textbook/storage";
import { rebuildTocIndex, getChapters } from "@/core/textbook/indexer";

/**
 * GET /api/admin/textbooks/[id]
 * Get textbook details
 */
export async function GET(
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
      include: {
        chapters: {
          where: { isActive: true },
          orderBy: { startPage: "asc" },
        },
        indexJobs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!book) {
      return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
    }

    // Convert BigInt to number for JSON serialization
    const bookWithSerializedBigInt = {
      ...book,
      fileSize: book.fileSize ? Number(book.fileSize) : null,
      chapters: book.chapters,
    };

    return NextResponse.json({
      success: true,
      data: bookWithSerializedBigInt,
    });
  } catch (error) {
    console.error("[Textbook] GET error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/textbooks/[id]
 * Delete textbook
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await params;

    await deleteTextbook(id);

    return NextResponse.json({
      success: true,
      message: "Đã xóa sách",
    });
  } catch (error) {
    console.error("[Textbook] DELETE error:", error);
    const message = error instanceof Error ? error.message : "Lỗi khi xóa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * POST /api/admin/textbooks/[id]/rebuild-index
 * Rebuild TOC index
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

    // Start rebuild in background
    rebuildTocIndex(id).catch((err) => {
      console.error("[Textbook] Rebuild failed:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Đã bắt đầu rebuild TOC index",
    });
  } catch (error) {
    console.error("[Textbook] Rebuild error:", error);
    const message = error instanceof Error ? error.message : "Lỗi khi rebuild";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
