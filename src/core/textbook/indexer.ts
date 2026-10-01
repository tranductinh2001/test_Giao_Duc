/**
 * Incremental Index Service
 * Detects new/updated/same PDF and only processes changed lessons
 */

import { promises as fs } from "fs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getPdfPath } from "./storage";

export interface IndexStatus {
  bookId: string;
  pdfHash: string;
  indexedAt: Date;
  totalChapters: number;
  status: "NEW" | "UPDATED" | "UNCHANGED" | "FAILED";
}

export interface ChapterIndexStatus {
  chapterId: string;
  status: "NEW" | "UPDATED" | "UNCHANGED";
  previousHash?: string;
  currentHash?: string;
}

/**
 * Calculate SHA-256 hash of PDF file
 */
async function calculatePdfHash(pdfPath: string): Promise<string> {
  const fileBuffer = await fs.readFile(pdfPath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

/**
 * Calculate content hash for a chapter (based on page range)
 */
function calculateChapterHash(startPage: number, endPage: number): string {
  const content = `${startPage}-${endPage}`;
  return crypto.createHash("sha256").update(content).digest("hex").substring(0, 16);
}

/**
 * Get or create index entry for a book
 */
export async function getOrCreateBookIndex(bookId: string): Promise<{
  id: string;
  bookId: string;
  pdfHash: string;
  indexedAt: Date;
  totalChapters: number;
  status: "NEW" | "UPDATED" | "UNCHANGED";
}> {
  let index = await prisma.textbookIndex.findUnique({
    where: { bookId },
  });

  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    throw new Error("Book not found");
  }

  const pdfPath = getPdfPath(book.pdfPath || "");
  const currentHash = await calculatePdfHash(pdfPath);

  if (!index) {
    // Create new index entry
    index = await prisma.textbookIndex.create({
      data: {
        bookId,
        pdfHash: currentHash,
        indexedAt: new Date(),
        totalChapters: 0,
      },
    });

    return {
      ...index,
      status: "NEW",
    };
  }

  // Check if PDF has changed
  if (index.pdfHash !== currentHash) {
    await prisma.textbookIndex.update({
      where: { id: index.id },
      data: {
        pdfHash: currentHash,
        indexedAt: new Date(),
      },
    });

    return {
      ...index,
      pdfHash: currentHash,
      indexedAt: new Date(),
      status: "UPDATED",
    };
  }

  return {
    ...index,
    status: "UNCHANGED",
  };
}

/**
 * Get incremental index status for all chapters in a book
 */
export async function getChapterIndexStatus(bookId: string): Promise<ChapterIndexStatus[]> {
  const chapters = await prisma.textbookChapter.findMany({
    where: { bookId, isActive: true },
    orderBy: [{ chapterNumber: "asc" }, { startPage: "asc" }],
  });

  const chapterStatuses: ChapterIndexStatus[] = [];

  for (const chapter of chapters) {
    const currentHash = calculateChapterHash(chapter.startPage ?? 1, chapter.endPage ?? 1);

    // Get existing chapter index
    const chapterIndex = await prisma.textbookChapterIndex.findUnique({
      where: { chapterId: chapter.id },
    });

    if (!chapterIndex) {
      chapterStatuses.push({
        chapterId: chapter.id,
        status: "NEW",
        currentHash,
      });
    } else if (chapterIndex.contentHash !== currentHash) {
      chapterStatuses.push({
        chapterId: chapter.id,
        status: "UPDATED",
        previousHash: chapterIndex.contentHash,
        currentHash,
      });

      // Update the hash
      await prisma.textbookChapterIndex.update({
        where: { id: chapterIndex.id },
        data: {
          contentHash: currentHash,
          indexedAt: new Date(),
        },
      });
    } else {
      chapterStatuses.push({
        chapterId: chapter.id,
        status: "UNCHANGED",
        currentHash,
      });
    }
  }

  return chapterStatuses;
}

/**
 * Get all chapters that need processing (NEW or UPDATED)
 */
export async function getChaptersToProcess(bookId: string): Promise<string[]> {
  const statuses = await getChapterIndexStatus(bookId);
  return statuses
    .filter(s => s.status === "NEW" || s.status === "UPDATED")
    .map(s => s.chapterId);
}

/**
 * Mark chapter as indexed
 */
export async function markChapterIndexed(chapterId: string, contentHash: string): Promise<void> {
  const existing = await prisma.textbookChapterIndex.findUnique({
    where: { chapterId },
  });

  if (existing) {
    await prisma.textbookChapterIndex.update({
      where: { id: existing.id },
      data: {
        contentHash,
        indexedAt: new Date(),
        status: "COMPLETED",
      },
    });
  } else {
    await prisma.textbookChapterIndex.create({
      data: {
        chapterId,
        contentHash,
        status: "COMPLETED",
      },
    });
  }
}

/**
 * Full reindex - clear all chapter indices and rebuild
 */
export async function fullReindex(bookId: string): Promise<{
  success: boolean;
  processedChapters: number;
  skippedChapters: number;
}> {
  // Delete all chapter indices
  const chapters = await prisma.textbookChapter.findMany({
    where: { bookId, isActive: true },
    select: { id: true, startPage: true, endPage: true },
  });

  await prisma.textbookChapterIndex.deleteMany({
    where: { chapterId: { in: chapters.map(c => c.id) } },
  });

  // Get updated status
  const status = await getOrCreateBookIndex(bookId);

  let processed = 0;
  const skipped = 0;

  for (const chapter of chapters) {
    const hash = calculateChapterHash(
      chapter.startPage!,
      chapter.endPage!
    );
    await markChapterIndexed(chapter.id, hash);
    processed++;
  }

  // Update book index
  await prisma.textbookIndex.update({
    where: { bookId },
    data: {
      totalChapters: chapters.length,
      indexedAt: new Date(),
    },
  });

  return {
    success: true,
    processedChapters: processed,
    skippedChapters: skipped,
  };
}

/**
 * Get index statistics for a book
 */
export async function getIndexStats(bookId: string): Promise<{
  bookStatus: "NEW" | "UPDATED" | "UNCHANGED";
  totalChapters: number;
  newChapters: number;
  updatedChapters: number;
  unchangedChapters: number;
  lastIndexed: Date | null;
}> {
  const bookIndex = await getOrCreateBookIndex(bookId);
  const chapterStatuses = await getChapterIndexStatus(bookId);

  return {
    bookStatus: bookIndex.status,
    totalChapters: chapterStatuses.length,
    newChapters: chapterStatuses.filter(s => s.status === "NEW").length,
    updatedChapters: chapterStatuses.filter(s => s.status === "UPDATED").length,
    unchangedChapters: chapterStatuses.filter(s => s.status === "UNCHANGED").length,
    lastIndexed: bookIndex.indexedAt,
  };
}

/**
 * Check if a specific chapter needs extraction
 */
export async function needsExtraction(chapterId: string): Promise<{
  needsExtraction: boolean;
  reason: "NEW" | "UPDATED" | "UNCHANGED" | "NOT_INDEXED";
  cachedPagePath?: string;
}> {
  const chapter = await prisma.textbookChapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    return { needsExtraction: true, reason: "NOT_INDEXED" };
  }

  const chapterIndex = await prisma.textbookChapterIndex.findUnique({
    where: { chapterId },
  });

  if (!chapterIndex) {
    return { needsExtraction: true, reason: "NEW" };
  }

  const currentHash = calculateChapterHash(chapter.startPage ?? 1, chapter.endPage ?? 1);

  if (chapterIndex.contentHash !== currentHash) {
    return { needsExtraction: true, reason: "UPDATED" };
  }

  // Check if cache exists
  const book = await prisma.textbookBook.findUnique({
    where: { id: chapter.bookId },
  });

  if (book) {
    const cachePath = `storage/cache/books/${book.id}/${chapter.id}.pdf`;
    try {
      await fs.access(cachePath);
      return {
        needsExtraction: false,
        reason: "UNCHANGED",
        cachedPagePath: cachePath,
      };
    } catch {
      // Cache doesn't exist, need to extract
      return { needsExtraction: true, reason: "UPDATED" };
    }
  }

  return { needsExtraction: false, reason: "UNCHANGED" };
}

/**
 * Rebuild TOC index (alias for fullReindex)
 */
export async function rebuildTocIndex(bookId: string): Promise<void> {
  await fullReindex(bookId);
}

/**
 * Get chapters for a book (re-export from indexer)
 */
export async function getChapters(bookId: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.textbookChapter.findMany({
    where: { bookId, isActive: true },
    orderBy: [{ chapterNumber: "asc" }, { startPage: "asc" }],
  });
}

/**
 * Run TOC indexing job
 * This is the main entry point for indexing a textbook
 * Uses real TOC extraction - NEVER creates fake chapters
 */
export async function runTocIndexing(bookId: string): Promise<{
  success: boolean;
  message: string;
  chaptersSaved: number;
}> {
  const { prisma } = await import("@/lib/prisma");

  // Import the real TOC extractor
  const { extractToc, saveTocEntries, validateTocEntries } = await import("./toc-extractor");

  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    throw new Error("Không tìm thấy sách");
  }

  // Create index job
  const job = await prisma.textbookIndexJob.create({
    data: {
      bookId,
      status: "QUEUED",
      totalPages: book.pageCount ?? 0,
    },
  });

  try {
    // Update status to processing
    await prisma.textbookIndexJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    await prisma.textbookBook.update({
      where: { id: bookId },
      data: { tocStatus: "PROCESSING" },
    });

    // Extract real TOC - this is the REAL extraction, no placeholders!
    const extractionResult = await extractToc(bookId);

    // Log extraction steps
    await prisma.textbookIndexJob.update({
      where: { id: job.id },
      data: {
        extractionLog: extractionResult.extractionLog as unknown as Record<string, any>,
      },
    });

    if (!extractionResult.success || extractionResult.entries.length === 0) {
      // Extraction failed - mark as needing manual entry
      // NEVER create fake chapters!
      await prisma.textbookIndexJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          progress: 0,
          errorMessage: extractionResult.message,
          completedAt: new Date(),
        },
      });

      await prisma.textbookBook.update({
        where: { id: bookId },
        data: { tocStatus: "FAILED" },
      });

      console.log(`[TextbookIndexer] FAILED for book ${bookId}: ${extractionResult.message}`);
      console.log(`[TextbookIndexer] Manual TOC entry required - NO FAKE CHAPTERS CREATED`);

      return {
        success: false,
        message: extractionResult.message,
        chaptersSaved: 0,
      };
    }

    // Validate entries before saving
    const validation = validateTocEntries(extractionResult.entries, book.pageCount ?? 999);
    if (!validation.valid) {
      console.log(`[TextbookIndexer] Validation errors: ${validation.errors.join('; ')}`);
    }

    // Save real TOC entries
    const saveResult = await saveTocEntries(bookId, extractionResult.entries, extractionResult.source);

    if (!saveResult.success) {
      await prisma.textbookIndexJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: saveResult.message,
          completedAt: new Date(),
        },
      });

      await prisma.textbookBook.update({
        where: { id: bookId },
        data: { tocStatus: "FAILED" },
      });

      return {
        success: false,
        message: saveResult.message,
        chaptersSaved: 0,
      };
    }

    // Update job status - SUCCESS!
    await prisma.textbookIndexJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        progress: 100,
        processedPages: book.pageCount ?? 0,
        completedAt: new Date(),
        extractionLog: extractionResult.entries.map((e) => ({
          title: e.title,
          startPage: e.startPage,
          endPage: e.endPage,
          confidence: e.confidence,
          source: e.source,
        })) as unknown as Record<string, any>,
      },
    });

    // Update book status
    await prisma.textbookBook.update({
      where: { id: bookId },
      data: {
        tocStatus: "COMPLETED",
        tocSource: extractionResult.source as any,
      },
    });

    console.log(`[TextbookIndexer] SUCCESS: Extracted ${saveResult.savedCount} real chapters for book ${bookId}`);
    console.log(`[TextbookIndexer] Source: ${extractionResult.source}, Confidence: ${extractionResult.confidence}`);

    return {
      success: true,
      message: `Extracted ${saveResult.savedCount} chapters`,
      chaptersSaved: saveResult.savedCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update job status to failed
    await prisma.textbookIndexJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorMessage: errorMessage,
        completedAt: new Date(),
      },
    });

    await prisma.textbookBook.update({
      where: { id: bookId },
      data: { tocStatus: "FAILED" },
    });

    console.log(`[TextbookIndexer] ERROR: ${errorMessage}`);

    return {
      success: false,
      message: errorMessage,
      chaptersSaved: 0,
    };
  }
}
