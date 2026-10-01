/**
 * Book Version Management API
 * Handles creating and managing book versions/editions
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/textbooks/[id]/versions - Get all versions of a book
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id: bookId } = await params;

    const book = await prisma.textbookBook.findUnique({
      where: { id: bookId },
      select: { code: true },
    });

    if (!book) {
      return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
    }

    // Get all versions of this book (same code)
    const versions = await prisma.textbookBook.findMany({
      where: { code: book.code },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        name: true,
        pageCount: true,
        tocStatus: true,
        tocSource: true,
        isApproved: true,
        isActive: true,
        createdAt: true,
        _count: { select: { chapters: true } },
      },
    });

    return NextResponse.json({ success: true, data: versions });
  } catch (error) {
    console.error("[Versions] GET error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/admin/textbooks/[id]/versions - Create a new version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id: bookId } = await params;
    const body = await req.json();
    const { version, copyChapters } = body;

    // Get original book
    const originalBook = await prisma.textbookBook.findUnique({
      where: { id: bookId },
      include: { chapters: { where: { isActive: true } } },
    });

    if (!originalBook) {
      return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
    }

    // Check if version already exists
    const existingVersion = await prisma.textbookBook.findUnique({
      where: { code_version: { code: originalBook.code, version } },
    });

    if (existingVersion) {
      return NextResponse.json({ success: false, message: `Phiên bản ${version} đã tồn tại` }, { status: 400 });
    }

    // Create new version
    const newBook = await prisma.textbookBook.create({
      data: {
        code: originalBook.code,
        version,
        name: `${originalBook.name} (${version})`,
        description: originalBook.description,
        grade: originalBook.grade,
        subject: originalBook.subject,
        pdfPath: originalBook.pdfPath, // Share the same PDF
        pageCount: originalBook.pageCount,
        fileSize: originalBook.fileSize,
        fileHash: originalBook.fileHash,
        tocStatus: copyChapters ? "PENDING" : "PENDING",
        tocSource: "MANUAL",
        isActive: true,
        isApproved: false,
      },
    });

    // Copy chapters if requested
    if (copyChapters && originalBook.chapters.length > 0) {
      await prisma.textbookChapter.createMany({
        data: originalBook.chapters.map((ch, idx) => ({
          bookId: newBook.id,
          code: ch.code || `CH${idx + 1}`,
          name: ch.name || ch.title || `Chương ${idx + 1}`,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          aliases: ch.aliases,
          keywords: ch.keywords,
          description: ch.description,
          startPage: ch.startPage,
          endPage: ch.endPage,
          level: ch.level,
          parentId: null, // Reset parent relationships for new book
          source: "MANUAL",
          confidence: ch.confidence,
          status: "APPROVED", // Copy as approved
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: session.user.id,
        })),
      });

      // Mark new book as ready
      await prisma.textbookBook.update({
        where: { id: newBook.id },
        data: { tocStatus: "COMPLETED", tocSource: "MANUAL", isApproved: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã tạo phiên bản ${version}`,
      data: { id: newBook.id, version: newBook.version },
    });
  } catch (error) {
    console.error("[Versions] POST error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}
