/**
 * Individual Chapter Management API
 * Handles GET, PATCH, DELETE for a single chapter
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/textbooks/[id]/chapters/[chapterId] - Get a single chapter
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id: bookId, chapterId } = await params;

    const chapter = await prisma.textbookChapter.findFirst({
      where: { id: chapterId, bookId },
    });

    if (!chapter) {
      return NextResponse.json({ success: false, message: "Không tìm thấy chương" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: chapter });
  } catch (error) {
    console.error("[Chapter] GET error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

// PATCH /api/admin/textbooks/[id]/chapters/[chapterId] - Update a chapter
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id: bookId, chapterId } = await params;
    const body = await req.json();

    // Check if chapter exists
    const existing = await prisma.textbookChapter.findFirst({
      where: { id: chapterId, bookId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Không tìm thấy chương" }, { status: 404 });
    }

    // Validate page range if being updated
    const { title, startPage, endPage, chapterNumber, aliases, keywords, description, status } = body;

    if (startPage || endPage) {
      const book = await prisma.textbookBook.findUnique({ where: { id: bookId } });
      if (!book) {
        return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
      }

      const newStart = startPage || existing.startPage;
      const newEnd = endPage || existing.endPage;
      const maxPages = book.pageCount ?? 999;

      if (newStart < 1 || newEnd > maxPages || newStart > newEnd) {
        return NextResponse.json({
          success: false,
          message: `Invalid page range: ${newStart}-${newEnd} (book has ${maxPages} pages)`,
        }, { status: 400 });
      }

      // Check for overlapping chapters (excluding current)
      const overlapping = await prisma.textbookChapter.findFirst({
        where: {
          bookId,
          id: { not: chapterId },
          isActive: true,
          OR: [
            { AND: [{ startPage: { lte: newStart } }, { endPage: { gte: newStart } }] },
            { AND: [{ startPage: { lte: newEnd } }, { endPage: { gte: newEnd } }] },
            { AND: [{ startPage: { gte: newStart } }, { endPage: { lte: newEnd } }] },
          ],
        },
      });

      if (overlapping) {
        return NextResponse.json({
          success: false,
          message: `Chương trùng lặp với "${overlapping.title}" (trang ${overlapping.startPage}-${overlapping.endPage})`,
        }, { status: 400 });
      }
    }

    // Update chapter
    const chapter = await prisma.textbookChapter.update({
      where: { id: chapterId },
      data: {
        ...(title && { title }),
        ...(startPage && { startPage }),
        ...(endPage && { endPage }),
        ...(chapterNumber !== undefined && { chapterNumber }),
        ...(aliases && { aliases }),
        ...(keywords && { keywords }),
        ...(description !== undefined && { description }),
        ...(status && { status: status as any }),
      },
    });

    return NextResponse.json({ success: true, data: chapter });
  } catch (error) {
    console.error("[Chapter] PATCH error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

// DELETE /api/admin/textbooks/[id]/chapters/[chapterId] - Delete a chapter
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id: bookId, chapterId } = await params;

    // Soft delete
    const chapter = await prisma.textbookChapter.update({
      where: { id: chapterId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Đã xóa chương" });
  } catch (error) {
    console.error("[Chapter] DELETE error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}
