import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/textbook/books/:bookId/chapters
 * Get chapters for a specific textbook
 *
 * Query params:
 * - includeAll: Include all chapters (including not approved) - for upload flow
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get("includeAll") === "true";

    const { bookId } = await params;

    // Verify textbook exists
    const textbook = await prisma.textbookBook.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        name: true,
        tocStatus: true,
      },
    });

    if (!textbook) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy sách giáo khoa" },
        { status: 404 }
      );
    }

    // For non-includeAll mode, require completed TOC
    if (!includeAll && textbook.tocStatus !== "COMPLETED") {
      return NextResponse.json(
        { success: false, message: "Sách chưa được đánh chỉ mục" },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause: any = {
      bookId,
      level: 1,
      isActive: true,
    };

    // For includeAll mode, show all chapters
    if (!includeAll) {
      whereClause.status = "APPROVED";
    }

    // Get chapters (level 1 = main chapters)
    const chapters = await prisma.textbookChapter.findMany({
      where: whereClause,
      select: {
        id: true,
        chapterNumber: true,
        title: true,
        aliases: true,
        startPage: true,
        endPage: true,
        description: true,
      },
      orderBy: [{ chapterNumber: "asc" }, { title: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: chapters,
    });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải danh sách bài học" },
      { status: 500 }
    );
  }
}
