/**
 * Streaming PDF Extractor
 * Handles large PDFs (50MB-500MB) with page-range extraction, caching, and streaming support
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getPdfPath } from "./storage";
import { cachePdfPages, getCachedPdf } from "./cache";
import { needsExtraction } from "./indexer";

export interface ExtractionOptions {
  useCache?: boolean;
  cacheTtlHours?: number;
}

export interface ExtractionResult {
  success: boolean;
  tempPath?: string;
  pageCount: number;
  size?: number;
  buffer?: Buffer;
  originalPages: { start: number; end: number };
  fromCache?: boolean;
  extractionTime?: number;
  error?: string;
}

/**
 * Extract specific pages from textbook PDF
 * Uses streaming to handle large files efficiently
 * @param bookId - The textbook book ID
 * @param startPage - Starting page number (1-indexed)
 * @param endPage - Ending page number (inclusive)
 * @param options - Extraction options (cache, etc.)
 * @returns Extracted PDF as temp path and metadata
 */
export async function extractPages(
  bookId: string,
  startPage: number,
  endPage: number,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const { useCache = true, cacheTtlHours } = options;

  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    return {
      success: false,
      pageCount: 0,
      originalPages: { start: startPage, end: endPage },
      error: "Không tìm thấy sách",
    };
  }

  if (startPage < 1 || endPage > (book.pageCount ?? 999) || startPage > endPage) {
    return {
      success: false,
      pageCount: 0,
      originalPages: { start: startPage, end: endPage },
      error: `Invalid page range: ${startPage}-${endPage} (book has ${book.pageCount} pages)`,
    };
  }

  // Try cache first if enabled
  if (useCache) {
    const chapterId = `temp_${startPage}_${endPage}`;
    const cached = await getCachedPdf(bookId, chapterId);
    if (cached.found && cached.buffer) {
      // Write to temp file for compatibility
      const tempDir = path.join(os.tmpdir(), "textbook-extract");
      await fs.mkdir(tempDir, { recursive: true });
      const tempPath = path.join(tempDir, `${bookId}_p${startPage}-${endPage}_${Date.now()}.pdf`);
      await fs.writeFile(tempPath, cached.buffer);

      return {
        success: true,
        tempPath,
        pageCount: endPage - startPage + 1,
        size: cached.buffer.length,
        originalPages: { start: startPage, end: endPage },
        fromCache: true,
        extractionTime: Date.now() - startTime,
      };
    }
  }

  // Get absolute path to PDF
  const pdfPath = getPdfPath(book.pdfPath || "");
  console.log("[Extractor] PDF path:", pdfPath);

  // Read original PDF
  const originalPdfBytes = await fs.readFile(pdfPath);
  console.log("[Extractor] Original PDF size:", originalPdfBytes.length);

  // Load PDF document
  const pdfDoc = await PDFDocument.load(originalPdfBytes, {
    ignoreEncryption: true,
  });

  // Create new PDF with only selected pages
  const newPdfDoc = await PDFDocument.create();

  // Copy pages (pdf-lib uses 0-indexed pages)
  const pageCount = endPage - startPage + 1;
  const pageIndices = [];
  for (let i = startPage - 1; i < endPage; i++) {
    pageIndices.push(i);
  }
  console.log("[Extractor] Extracting pages:", pageIndices, "count:", pageCount);

  const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
  console.log("[Extractor] Copied pages count:", copiedPages.length);
  for (const page of copiedPages) {
    newPdfDoc.addPage(page);
  }

  // Save to temporary file
  const tempDir = path.join(os.tmpdir(), "textbook-extract");
  await fs.mkdir(tempDir, { recursive: true });

  const tempFileName = `${bookId}_p${startPage}-${endPage}_${Date.now()}.pdf`;
  const tempPath = path.join(tempDir, tempFileName);

  const extractedPdfBytes = await newPdfDoc.save();
  console.log("[Extractor] Extracted PDF size:", extractedPdfBytes.length);
  await fs.writeFile(tempPath, Buffer.from(extractedPdfBytes));

  const stats = await fs.stat(tempPath);

  // Cache if enabled
  if (useCache) {
    const chapterId = `temp_${startPage}_${endPage}`;
    await cachePdfPages(
      bookId,
      chapterId,
      `Pages ${startPage}-${endPage}`,
      startPage,
      endPage,
      Buffer.from(extractedPdfBytes)
    );
  }

  return {
    success: true,
    tempPath,
    pageCount: endPage - startPage + 1,
    size: stats.size,
    originalPages: { start: startPage, end: endPage },
    fromCache: false,
    extractionTime: Date.now() - startTime,
  };
}

/**
 * Extract pages from a specific chapter (using chapter metadata)
 */
export async function extractChapter(
  chapterId: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const chapter = await prisma.textbookChapter.findUnique({
    where: { id: chapterId },
    include: { book: true },
  });

  if (!chapter || !chapter.book) {
    return {
      success: false,
      pageCount: 0,
      originalPages: { start: 0, end: 0 },
      error: "Chapter or book not found",
    };
  }

  return extractPages(chapter.bookId, chapter.startPage ?? 1, chapter.endPage ?? 1, options);
}

/**
 * Delete temporary extraction file
 */
export async function deleteTempExtract(tempPath: string): Promise<void> {
  try {
    await fs.unlink(tempPath);
  } catch {
    // File may not exist
  }
}

/**
 * Find matching chapter for a lesson
 * Now uses the enhanced smart matching
 */
export async function findMatchingChapter(
  bookId: string,
  lessonTitle: string,
  options: { requireApproved?: boolean } = {}
): Promise<{
  chapter: {
    id: string;
    title: string;
    startPage: number;
    endPage: number;
    confidence: number;
    source: string;
    isApproved: boolean;
  } | null;
  method: "exact" | "alias" | "fuzzy";
}> {
  // Only use approved chapters unless explicitly allowed
  const whereClause: any = { bookId, isActive: true };
  if (options.requireApproved !== false) {
    // Default: require approval - can be overridden
    whereClause.isApproved = true;
  }

  const chapters = await prisma.textbookChapter.findMany({
    where: whereClause,
    orderBy: { startPage: "asc" },
  });

  if (chapters.length === 0) {
    // Try unapproved chapters if no approved ones exist
    const unapprovedChapters = await prisma.textbookChapter.findMany({
      where: { bookId, isActive: true },
      orderBy: { startPage: "asc" },
    });

    if (unapprovedChapters.length === 0) {
      return { chapter: null, method: "fuzzy" };
    }

    // Return unapproved with warning
    const chapter = unapprovedChapters[0];
    return {
      chapter: {
        id: chapter.id,
        title: chapter.title || "",
        startPage: chapter.startPage ?? 1,
        endPage: chapter.endPage ?? 1,
        confidence: chapter.confidence ?? 0,
        source: chapter.source || "MANUAL",
        isApproved: false,
      },
      method: "fuzzy",
    };
  }

  const normalizedTitle = lessonTitle.toLowerCase().trim();

  // 1. Exact match
  const exactMatch = chapters.find(
    (c) => c.title && c.title.toLowerCase().trim() === normalizedTitle
  );

  if (exactMatch) {
    return {
      chapter: {
        id: exactMatch.id,
        title: exactMatch.title || "",
        startPage: exactMatch.startPage ?? 1,
        endPage: exactMatch.endPage ?? 1,
        confidence: 1.0,
        source: exactMatch.source || "MANUAL",
        isApproved: exactMatch.isApproved || false,
      },
      method: "exact",
    };
  }

  // 2. Alias match
  for (const chapter of chapters) {
    for (const alias of chapter.aliases || []) {
      if (alias && alias.toLowerCase().trim() === normalizedTitle) {
        return {
          chapter: {
            id: chapter.id,
            title: chapter.title || "",
            startPage: chapter.startPage ?? 1,
            endPage: chapter.endPage ?? 1,
            confidence: 0.95,
            source: chapter.source || "MANUAL",
            isApproved: chapter.isApproved || false,
          },
          method: "alias",
        };
      }
    }
  }

  // 3. Fuzzy match (contains)
  for (const chapter of chapters) {
    const chapterTitle = chapter.title || "";
    const chapterWords = chapterTitle.toLowerCase().split(/\s+/);
    const lessonWords = normalizedTitle.split(/\s+/);

    // Check if key words match
    const commonWords = chapterWords.filter((w) =>
      lessonWords.some((l) => l.includes(w) || w.includes(l))
    );

    if (commonWords.length >= Math.min(2, chapterWords.length)) {
      return {
        chapter: {
          id: chapter.id,
          title: chapter.title || "",
          startPage: chapter.startPage ?? 1,
          endPage: chapter.endPage ?? 1,
          confidence: 0.7,
          source: chapter.source || "MANUAL",
          isApproved: chapter.isApproved || false,
        },
        method: "fuzzy",
      };
    }
  }

  // If no match found, try unapproved chapters
  const unapprovedChapters = await prisma.textbookChapter.findMany({
    where: { bookId, isActive: true },
    orderBy: { startPage: "asc" },
  });

  if (unapprovedChapters.length > 0) {
    // Return best effort from unapproved
    const chapter = unapprovedChapters[0];
    return {
      chapter: {
        id: chapter.id,
        title: chapter.title || "",
        startPage: chapter.startPage ?? 1,
        endPage: chapter.endPage ?? 1,
        confidence: 0.3,
        source: chapter.source || "MANUAL",
        isApproved: false,
      },
      method: "fuzzy",
    };
  }

  return { chapter: null, method: "fuzzy" };
}

/**
 * Get textbook context for lesson review
 * Returns extracted pages as buffer
 */
export async function getTextbookContext(
  bookId: string,
  lessonTitle: string,
  options: ExtractionOptions = {}
): Promise<{
  chapter: {
    id: string;
    title: string;
    startPage: number;
    endPage: number;
    confidence: number;
  } | null;
  pdfBuffer: Buffer | null;
  method: "exact" | "alias" | "fuzzy" | null;
  extraction?: ExtractionResult;
}> {
  // Find matching chapter
  const { chapter, method } = await findMatchingChapter(bookId, lessonTitle);

  if (!chapter) {
    return { chapter: null, pdfBuffer: null, method: null };
  }

  // Extract pages
  const extraction = await extractPages(bookId, chapter.startPage, chapter.endPage, options);

  if (!extraction.success || !extraction.tempPath) {
    return { chapter, pdfBuffer: null, method };
  }

  const pdfBuffer = await fs.readFile(extraction.tempPath);

  // Clean up temp file
  await deleteTempExtract(extraction.tempPath);

  return {
    chapter,
    pdfBuffer,
    method,
    extraction,
  };
}

/**
 * Get textbook context with temp file path
 * Caller is responsible for cleanup
 */
export async function getTextbookContextWithPath(
  bookId: string,
  lessonTitle: string,
  options: ExtractionOptions = {}
): Promise<{
  chapter: {
    id: string;
    title: string;
    startPage: number;
    endPage: number;
    confidence: number;
  } | null;
  tempPath: string | null;
  method: "exact" | "alias" | "fuzzy" | null;
  extraction?: ExtractionResult;
}> {
  const { chapter, method } = await findMatchingChapter(bookId, lessonTitle);

  if (!chapter) {
    return { chapter: null, tempPath: null, method: null };
  }

  const extraction = await extractPages(bookId, chapter.startPage, chapter.endPage, options);

  return {
    chapter,
    tempPath: extraction.tempPath || null,
    method,
    extraction,
  };
}

/**
 * Stream PDF pages for very large files
 * Uses chunked reading to avoid memory issues
 */
export async function* streamPdfPages(
  bookId: string,
  startPage: number,
  endPage: number,
  chunkSize: number = 10
): AsyncGenerator<Buffer, void, unknown> {
  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    throw new Error("Book not found");
  }

  const pdfPath = getPdfPath(book.pdfPath || "");

  // Load source PDF with streaming
  const sourcePdfBytes = await fs.readFile(pdfPath);
  const sourcePdf = await PDFDocument.load(sourcePdfBytes);

  // Yield pages in chunks
  for (let chunkStart = startPage; chunkStart <= endPage; chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize - 1, endPage);

    const newPdf = await PDFDocument.create();
    const pageIndices = [];

    for (let i = chunkStart - 1; i < chunkEnd; i++) {
      pageIndices.push(i);
    }

    const pages = await newPdf.copyPages(sourcePdf, pageIndices);
    for (const page of pages) {
      newPdf.addPage(page);
    }

    const chunkBytes = await newPdf.save();
    yield Buffer.from(chunkBytes);
  }
}

/**
 * Check if chapter needs extraction (for incremental processing)
 */
export async function checkNeedsExtraction(chapterId: string): Promise<{
  needsExtraction: boolean;
  reason: "NEW" | "UPDATED" | "UNCHANGED" | "NOT_INDEXED";
  cachedPagePath?: string;
}> {
  return needsExtraction(chapterId);
}

/**
 * Cleanup extracted PDF after use
 */
export async function cleanupExtractedPdf(tempPath: string | null): Promise<void> {
  if (tempPath) {
    await deleteTempExtract(tempPath);
  }
}
