/**
 * Chapter Management API
 * Handles CRUD operations for textbook chapters
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/textbooks/[id]/chapters - Get all chapters for a book
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
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const chapters = await prisma.textbookChapter.findMany({
      where: {
        bookId,
        ...(status && { status: status as any }),
      },
      orderBy: [{ chapterNumber: "asc" }, { startPage: "asc" }],
    });

    return NextResponse.json({ success: true, data: chapters });
  } catch (error) {
    console.error("[Chapters] GET error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

// POST /api/admin/textbooks/[id]/chapters - Create new chapter(s)
// Supports both single chapter and bulk creation
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

    // Check for bulk creation
    const isBulk = Array.isArray(body);

    if (isBulk) {
      // Bulk creation - create multiple chapters
      const chapters = body as Array<{
        title: string;
        startPage?: number;
        endPage?: number;
        pageStart?: number;
        pageEnd?: number;
        aliases?: string[];
        keywords?: string[];
        description?: string;
      }>;

      if (chapters.length === 0) {
        return NextResponse.json({ success: false, message: "Danh sách rỗng" }, { status: 400 });
      }

      // Validate book exists
      const book = await prisma.textbookBook.findUnique({ where: { id: bookId } });
      if (!book) {
        return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
      }

      // Process chapters individually to avoid transaction timeout
      // Delete existing chapters first
      await prisma.textbookChapter.deleteMany({ where: { bookId } });

      const results = [];
      const errors = [];

      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];

        try {
          // Validate page range - skip invalid chapters
          const startPage = ch.startPage || ch.pageStart;
          const endPage = ch.endPage || ch.pageEnd;
          const maxPages = book.pageCount ?? 999;

          if (!startPage || !endPage || startPage < 1 || endPage > maxPages || startPage > endPage) {
            errors.push(`Chương "${ch.title}": Invalid page range ${startPage}-${endPage}`);
            continue;
          }

          const generatedAliases = ch.aliases || generateAliases(ch.title);

          const chapter = await prisma.textbookChapter.create({
            data: {
              bookId,
              code: `CH${i + 1}`,
              name: ch.title || `Chương ${i + 1}`,
              chapterNumber: i + 1,
              title: ch.title,
              startPage,
              endPage,
              aliases: generatedAliases,
              keywords: ch.keywords || [],
              description: ch.description || null,
              source: "IMPORT",
              status: "PENDING",
              isApproved: false,
            },
          });
          results.push(chapter);
        } catch (err) {
          console.error("Error creating chapter:", ch.title, err);
          errors.push(`Chương "${ch.title}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Update book TOC status
      await prisma.textbookBook.update({
        where: { id: bookId },
        data: { tocStatus: "COMPLETED", tocSource: "IMPORT", isApproved: false },
      });

      const createdChapters = results;

      return NextResponse.json({
        success: true,
        data: createdChapters,
        message: errors.length > 0
          ? `Đã tạo ${createdChapters.length} chương, ${errors.length} lỗi`
          : `Đã tạo ${createdChapters.length} chương`,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // Single chapter creation (original logic)
    const { title, startPage, endPage, chapterNumber, aliases, keywords, description } = body;

    if (!title || !startPage || !endPage) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const book = await prisma.textbookBook.findUnique({ where: { id: bookId } });
    if (!book) {
      return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
    }

    const maxPages = book.pageCount ?? 999;
    if (startPage < 1 || endPage > maxPages || startPage > endPage) {
      return NextResponse.json({
        success: false,
        message: `Invalid page range: ${startPage}-${endPage} (book has ${book.pageCount} pages)`,
      }, { status: 400 });
    }

    const existing = await prisma.textbookChapter.findFirst({
      where: {
        bookId,
        isActive: true,
        OR: [
          { AND: [{ startPage: { lte: startPage } }, { endPage: { gte: startPage } }] },
          { AND: [{ startPage: { lte: endPage } }, { endPage: { gte: endPage } }] },
          { AND: [{ startPage: { gte: startPage } }, { endPage: { lte: endPage } }] },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        message: `Chương trùng lặp với "${existing.title}" (trang ${existing.startPage}-${existing.endPage})`,
      }, { status: 400 });
    }

    const generatedAliases = aliases || generateAliases(title);

    const chapter = await prisma.textbookChapter.create({
      data: {
        bookId,
        code: `CH_${Date.now()}`,
        name: title,
        title,
        chapterNumber: chapterNumber || null,
        startPage,
        endPage,
        aliases: generatedAliases,
        keywords: keywords || [],
        description: description || null,
        source: "MANUAL",
        status: "APPROVED",
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
    });

    await prisma.textbookBook.update({
      where: { id: bookId },
      data: { tocStatus: "COMPLETED", tocSource: "MANUAL" },
    });

    return NextResponse.json({ success: true, data: chapter });
  } catch (error) {
    console.error("[Chapters] POST error:", error);
    const message = error instanceof Error ? error.message : "Lỗi server";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// Helper function to generate aliases
function generateAliases(title: string): string[] {
  const aliases: string[] = [];

  // Add title as-is
  aliases.push(title);

  // Add without numbers
  const withoutNumber = title.replace(/\d+/g, "").trim();
  if (withoutNumber !== title) {
    aliases.push(withoutNumber);
  }

  // Vietnamese number conversion
  const numberMap: Record<string, string> = {
    "1": "một", "2": "hai", "3": "ba", "4": "bốn", "5": "năm",
    "6": "sáu", "7": "bảy", "8": "tám", "9": "chín", "10": "mười",
  };

  const numbers = title.match(/\d+/g);
  if (numbers) {
    for (const num of numbers) {
      if (numberMap[num]) {
        aliases.push(title.replace(num, numberMap[num]));
      }
    }
  }

  return [...new Set(aliases)];
}
