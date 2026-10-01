import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/textbook/books/:bookId/teaching-methods
 * Get teaching methods linked to a textbook book and optionally a chapter
 *
 * Query params:
 * - chapterId: Optional - filter to specific chapter's teaching methods
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
    const chapterId = searchParams.get("chapterId");

    const { bookId } = await params;

    // Verify textbook exists
    const textbook = await prisma.textbookBook.findUnique({
      where: { id: bookId },
      select: { id: true, name: true, subject: true, grade: true },
    });

    if (!textbook) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy sách giáo khoa" },
        { status: 404 }
      );
    }

    // Get teaching methods linked to the textbook (via TextbookTeachingMethod)
    const textbookMethods = await prisma.textbookTeachingMethod.findMany({
      where: {
        textbookBookId: bookId,
      },
      include: {
        teachingMethod: {
          select: {
            id: true,
            name: true,
            description: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [{ priority: "desc" }, { teachingMethod: { sortOrder: "asc" } }],
    });

    let chapterMethods: any[] = [];

    // If chapterId provided, also get teaching methods linked to the specific chapter
    if (chapterId) {
      chapterMethods = await prisma.lessonTeachingMethod.findMany({
        where: {
          textbookChapterId: chapterId,
        },
        include: {
          teachingMethod: {
            select: {
              id: true,
              name: true,
              description: true,
              sortOrder: true,
            },
          },
        },
        orderBy: [{ priority: "desc" }, { teachingMethod: { sortOrder: "asc" } }],
      });
    }

    // Combine and deduplicate - chapter methods take priority over book methods
    const bookMethodIds = new Set(textbookMethods.map((tm: any) => tm.teachingMethod.id));
    const filteredChapterMethods = chapterMethods.filter(
      (cm: any) => !bookMethodIds.has(cm.teachingMethod.id)
    );

    const allMethods = [
      ...chapterMethods.map((cm: any) => ({
        ...cm.teachingMethod,
        source: "chapter" as const,
        priority: cm.priority,
        note: cm.note,
        isRecommended: cm.isRecommended,
      })),
      ...textbookMethods.map((tm: any) => ({
        ...tm.teachingMethod,
        source: "textbook" as const,
        priority: tm.priority,
        note: tm.note,
        isRecommended: tm.isRecommended,
      })),
    ];

    return NextResponse.json({
      success: true,
      data: {
        textbook: {
          id: textbook.id,
          name: textbook.name,
          subject: textbook.subject,
          grade: textbook.grade,
        },
        methods: allMethods,
        methodCount: allMethods.length,
      },
    });
  } catch (error) {
    console.error("Error fetching teaching methods:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải phương pháp giảng dạy" },
      { status: 500 }
    );
  }
}
