/**
 * TOC Validator Service
 * Validates table of contents for lesson ordering, page ranges, duplicates, and gaps
 */

import { prisma } from "@/lib/prisma";

export interface ValidationIssue {
  type: "error" | "warning" | "info";
  category: string;
  message: string;
  chapterId?: string;
  chapterTitle?: string;
  pageNumber?: number;
  details?: Record<string, any>;
}

export interface TocValidationResult {
  isValid: boolean;
  bookId: string;
  totalChapters: number;
  issues: ValidationIssue[];
  stats: {
    totalPages: number;
    coveredPages: number;
    gapPages: number;
    duplicateCount: number;
    missingCount: number;
    invalidRangeCount: number;
  };
}

interface ChapterData {
  id: string;
  title: string;
  chapterNumber: number;
  startPage: number;
  endPage: number;
}

/**
 * Validate TOC for a textbook
 */
export async function validateToc(bookId: string): Promise<TocValidationResult> {
  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
    include: {
      chapters: {
        where: { isActive: true },
        orderBy: [{ chapterNumber: "asc" }, { startPage: "asc" }],
      },
    },
  });

  if (!book) {
    return {
      isValid: false,
      bookId,
      totalChapters: 0,
      issues: [{
        type: "error",
        category: "BOOK_NOT_FOUND",
        message: "Không tìm thấy sách giáo khoa",
      }],
      stats: {
        totalPages: 0,
        coveredPages: 0,
        gapPages: 0,
        duplicateCount: 0,
        missingCount: 0,
        invalidRangeCount: 0,
      },
    };
  }

  const chapters = book.chapters;
  const issues: ValidationIssue[] = [];
  const pageCoverage = new Set<number>();

  // Track statistics
  let duplicateCount = 0;
  let invalidRangeCount = 0;
  let coveredPages = 0;

  // 1. Check for empty chapters
  if (chapters.length === 0) {
    issues.push({
      type: "error",
      category: "NO_CHAPTERS",
      message: "Sách không có chương nào",
    });
  }

  // 2. Validate each chapter
  for (const chapter of chapters) {
    const startPage = chapter.startPage ?? 1;
    const endPage = chapter.endPage ?? startPage;
    const title = chapter.title || "";

    // Check for invalid page range
    if (endPage < startPage) {
      invalidRangeCount++;
      issues.push({
        type: "error",
        category: "INVALID_RANGE",
        message: `Chương "${title}" có trang kết thúc nhỏ hơn trang bắt đầu`,
        chapterId: chapter.id,
        chapterTitle: title,
        pageNumber: endPage,
        details: {
          startPage,
          endPage,
        },
      });
    }

    // Check for pages exceeding book page count
    if (startPage > (book.pageCount ?? 0) || endPage > (book.pageCount ?? 0)) {
      issues.push({
        type: "error",
        category: "PAGE_EXCEEDS_BOOK",
        message: `Chương "${title}" có trang vượt quá số trang sách`,
        chapterId: chapter.id,
        chapterTitle: title,
        pageNumber: Math.max(startPage, endPage),
        details: {
          startPage,
          endPage,
          bookPages: book.pageCount,
        },
      });
    }

    // Check for zero or negative page numbers
    if (startPage <= 0 || endPage <= 0) {
      issues.push({
        type: "error",
        category: "INVALID_PAGE_NUMBER",
        message: `Chương "${title}" có số trang không hợp lệ`,
        chapterId: chapter.id,
        chapterTitle: title,
        details: {
          startPage,
          endPage,
        },
      });
    }

    // Track page coverage
    for (let p = startPage; p <= endPage; p++) {
      if (pageCoverage.has(p)) {
        duplicateCount++;
      } else {
        pageCoverage.add(p);
        coveredPages++;
      }
    }
  }

  // 3. Check for duplicate chapter numbers
  const chapterNumbers = chapters.map(c => c.chapterNumber);
  const duplicates = chapterNumbers.filter((n, i) => chapterNumbers.indexOf(n) !== i);
  if (duplicates.length > 0) {
    issues.push({
      type: "warning",
      category: "DUPLICATE_CHAPTER_NUMBER",
      message: `Có ${duplicates.length} chương trùng số: ${[...new Set(duplicates)].join(", ")}`,
    });
  }

  // 4. Check for lesson order (pages should be increasing)
  for (let i = 1; i < chapters.length; i++) {
    const prev = chapters[i - 1];
    const curr = chapters[i];
    const prevStart = prev.startPage ?? 1;
    const currStart = curr.startPage ?? 1;
    const prevEnd = prev.endPage ?? prevStart;
    const currEnd = curr.endPage ?? currStart;

    if (currStart < prevStart) {
      issues.push({
        type: "warning",
        category: "WRONG_ORDER",
        message: `Chương "${curr.title || ""}" (trang ${currStart}) bắt đầu trước chương "${prev.title || ""}" (trang ${prevStart})`,
        chapterId: curr.id,
        chapterTitle: curr.title || undefined,
        pageNumber: currStart,
      });
    }

    // Check for gaps in page numbering
    if (prevEnd + 1 < currStart) {
      const gapSize = currStart - prevEnd - 1;
      issues.push({
        type: "info",
        category: "PAGE_GAP",
        message: `Khoảng trống ${gapSize} trang giữa "${prev.title || ""}" và "${curr.title || ""}"`,
        chapterId: curr.id,
        chapterTitle: curr.title || undefined,
        pageNumber: currStart,
        details: {
          gapStart: prevEnd + 1,
          gapEnd: currStart - 1,
          gapSize,
        },
      });
    }
  }

  // 5. Check for overlapping chapters
  for (let i = 0; i < chapters.length; i++) {
    for (let j = i + 1; j < chapters.length; j++) {
      const a = chapters[i];
      const b = chapters[j];
      const aStart = a.startPage ?? 1;
      const aEnd = a.endPage ?? aStart;
      const bStart = b.startPage ?? 1;
      const bEnd = b.endPage ?? bStart;

      // Check if ranges overlap
      if (aStart <= bEnd && bStart <= aEnd) {
        issues.push({
          type: "warning",
          category: "OVERLAPPING_PAGES",
          message: `Chương "${a.title || ""}" và "${b.title || ""}" có trang trùng lặp`,
          chapterId: b.id,
          chapterTitle: b.title || undefined,
          details: {
            chapter1: { title: a.title || "", startPage: aStart, endPage: aEnd },
            chapter2: { title: b.title || "", startPage: bStart, endPage: bEnd },
          },
        });
      }
    }
  }

  // 6. Check for missing chapters (large gaps)
  if (chapters.length > 1) {
    const sortedChapters = [...chapters].sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
    for (let i = 1; i < sortedChapters.length; i++) {
      const prev = sortedChapters[i - 1];
      const curr = sortedChapters[i];
      const expectedNumber = (prev.chapterNumber ?? 0) + 1;

      if ((curr.chapterNumber ?? 0) > expectedNumber) {
        const missingCount = (curr.chapterNumber ?? 0) - expectedNumber;
        issues.push({
          type: "warning",
          category: "MISSING_CHAPTERS",
          message: `Thiếu ${missingCount} chương giữa "${prev.title || ""}" và "${curr.title || ""}"`,
          chapterId: curr.id,
          chapterTitle: curr.title || undefined,
          details: {
            expectedNumber,
            actualNumber: curr.chapterNumber,
            missingCount,
          },
        });
      }
    }
  }

  // Calculate stats
  const totalPages = book.pageCount ?? 0;
  const gapPages = totalPages - coveredPages;
  const hasErrors = issues.some(i => i.type === "error");

  return {
    isValid: !hasErrors,
    bookId,
    totalChapters: chapters.length,
    issues,
    stats: {
      totalPages,
      coveredPages,
      gapPages,
      duplicateCount,
      missingCount: issues.filter(i => i.category === "MISSING_CHAPTERS").length,
      invalidRangeCount,
    },
  };
}

/**
 * Validate and fix common issues
 */
export async function fixTocIssues(bookId: string): Promise<{
  fixed: number;
  issues: ValidationIssue[];
}> {
  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
    include: {
      chapters: {
        where: { isActive: true },
        orderBy: [{ chapterNumber: "asc" }, { startPage: "asc" }],
      },
    },
  });

  if (!book) {
    return { fixed: 0, issues: [] };
  }

  const chapters = book.chapters;
  let fixed = 0;

  // Fix 1: Ensure page ranges are valid
  for (const chapter of chapters) {
    const startPage = chapter.startPage ?? 1;
    const endPage = chapter.endPage ?? startPage;
    if (endPage < startPage) {
      await prisma.textbookChapter.update({
        where: { id: chapter.id },
        data: { endPage: startPage + 5 }, // Default 5 pages
      });
      fixed++;
    }
  }

  // Fix 2: Ensure page numbers don't exceed book pages
  for (const chapter of chapters) {
    const startPage = chapter.startPage ?? 1;
    const endPage = chapter.endPage ?? startPage;
    const bookPageCount = book.pageCount ?? 999;
    if (startPage > bookPageCount) {
      await prisma.textbookChapter.update({
        where: { id: chapter.id },
        data: { startPage: 1 },
      });
      fixed++;
    }
    if (endPage > bookPageCount) {
      await prisma.textbookChapter.update({
        where: { id: chapter.id },
        data: { endPage: bookPageCount },
      });
      fixed++;
    }
  }

  // Re-validate after fixes
  const validationResult = await validateToc(bookId);

  return {
    fixed,
    issues: validationResult.issues,
  };
}

/**
 * Get validation summary for all books
 */
export async function getAllBooksValidation(): Promise<{
  books: Array<{
    bookId: string;
    bookName: string;
    status: string;
    chapters: number;
    issues: number;
  }>;
  summary: {
    totalBooks: number;
    validBooks: number;
    invalidBooks: number;
    totalChapters: number;
    totalIssues: number;
  };
}> {
  const books = await prisma.textbookBook.findMany({
    where: { isActive: true },
    include: {
      chapters: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  const results = await Promise.all(
    books.map(async (book) => {
      const validation = await validateToc(book.id);
      return {
        bookId: book.id,
        bookName: book.name,
        status: validation.isValid ? "valid" : "issues",
        chapters: validation.totalChapters,
        issues: validation.issues.length,
      };
    })
  );

  return {
    books: results,
    summary: {
      totalBooks: books.length,
      validBooks: results.filter(r => r.status === "valid").length,
      invalidBooks: results.filter(r => r.status === "issues").length,
      totalChapters: results.reduce((sum, r) => sum + r.chapters, 0),
      totalIssues: results.reduce((sum, r) => sum + r.issues, 0),
    },
  };
}
