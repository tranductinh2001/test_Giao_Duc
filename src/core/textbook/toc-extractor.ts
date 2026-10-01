/**
 * Real TOC Extraction Engine
 *
 * Priority:
 * 1. PDF Outline/Bookmarks (with page numbers from PDF)
 * 2. OCR on TOC pages (may or may not have page numbers)
 *
 * IMPORTANT: This is the LEGACY extraction engine.
 * For the new deterministic workflow, use /api/admin/textbooks/[id]/import-toc
 * which returns chapters WITHOUT page ranges - Admin must provide them explicitly.
 *
 * NEVER estimates pages.
 * NEVER creates fake chapters.
 * NEVER generates placeholder data.
 */

import { promises as fs } from "fs";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getPdfPath } from "./storage";
import { brightOneAdapter } from "@/core/document-adapters/BrightOneAdapter";

export interface TocEntry {
  title: string;
  startPage: number;
  endPage: number;
  level: number;
  parentIndex: number;
  aliases: string[];
  confidence: number;
  source: "OUTLINE" | "OCR" | "AI" | "MANUAL";
}

export interface TocExtractionResult {
  success: boolean;
  entries: TocEntry[];
  source: "OUTLINE" | "OCR" | "AI" | "MANUAL";
  confidence: number;
  message: string;
  extractionLog: string[];
}

/**
 * Remove Vietnamese diacritics for fuzzy matching
 */
function removeDiacritics(text: string): string {
  const diacriticsMap: Record<string, string> = {
    'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'đ': 'd',
  };

  return text.toLowerCase().split('').map(char => diacriticsMap[char] || char).join('');
}

/**
 * Generate aliases from chapter title
 */
function generateAliases(title: string): string[] {
  const aliases: string[] = [];
  const normalized = removeDiacritics(title);
  const words = normalized.split(/\s+/).filter(w => w.length > 1);

  // Add normalized version
  aliases.push(normalized);

  // Add individual key words
  if (words.length > 1) {
    aliases.push(words.slice(0, 2).join(' '));
  }

  // Add without numbers
  const withoutNumber = normalized.replace(/\d+/g, '').trim();
  if (withoutNumber !== normalized) {
    aliases.push(withoutNumber);
  }

  // Common variations for Vietnamese textbooks
  const numberMap: Record<string, string> = {
    '1': 'một', '2': 'hai', '3': 'ba', '4': 'bốn', '5': 'năm',
    '6': 'sáu', '7': 'bảy', '8': 'tám', '9': 'chín', '10': 'mười',
  };

  const vietnameseNum = title.match(/\d+/g);
  if (vietnameseNum) {
    for (const num of vietnameseNum) {
      if (numberMap[num]) {
        aliases.push(title.replace(num, numberMap[num]));
      }
    }
  }

  return [...new Set(aliases)];
}

/**
 * Extract TOC from PDF outline/bookmarks
 */
async function extractFromOutline(pdfPath: string, pageCount: number): Promise<TocExtractionResult> {
  const log: string[] = [];
  log.push(`[TOC] Starting outline extraction from ${pdfPath}`);

  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // Get outline (bookmarks) via catalog - use type assertion for pdf-lib internal API
    const catalog = pdfDoc.catalog as any;
    const outlines = catalog?.Outlines;
    const outline = outlines?.First;

    if (!outline) {
      log.push(`[TOC] No outline found in PDF`);
      return {
        success: false,
        entries: [],
        source: "OUTLINE",
        confidence: 0,
        message: "No PDF outline/bookmarks found",
        extractionLog: log,
      };
    }

    // Get all outline items using type assertions
    const outlineItems: any[] = [];
    let currentItem: any = outline;
    let itemCount = 0;
    const maxItems = 500; // Prevent infinite loop

    while (currentItem && itemCount < maxItems) {
      try {
        const title = currentItem.Title?.toString() || "Untitled";
        const dest = currentItem.Dest;

        outlineItems.push({
          title,
          dest,
          First: currentItem.First,
          Last: currentItem.Last,
          Next: currentItem.Next,
          items: [],
        });
      } catch (e) {
        // Skip malformed items
      }

      // Move to next
      currentItem = currentItem.Next;
      itemCount++;
    }

    if (outlineItems.length === 0) {
      log.push(`[TOC] No outline items found`);
      return {
        success: false,
        entries: [],
        source: "OUTLINE",
        confidence: 0,
        message: "No PDF outline items found",
        extractionLog: log,
      };
    }

    log.push(`[TOC] Found ${outlineItems.length} outline items`);

    const entries: TocEntry[] = [];
    const pages = pdfDoc.getPages();

    // Process outline items
    for (const item of outlineItems) {
      const title = item.title;
      let pageNum = 1;

      // Try to get page number from dest
      try {
        if (item.dest) {
          const destArray = Array.isArray(item.dest) ? item.dest : [item.dest];
          if (destArray.length > 0) {
            const pageRef = destArray[0];
            const pageIndex = pages.findIndex(p => (p as any).ref === pageRef);
            if (pageIndex >= 0) {
              pageNum = pageIndex + 1;
            }
          }
        }
      } catch (e) {
        log.push(`[TOC] Could not resolve page for "${title}"`);
      }

      entries.push({
        title: title.trim(),
        startPage: pageNum,
        endPage: pageNum,
        level: 1,
        parentIndex: -1,
        aliases: generateAliases(title),
        confidence: 0.9,
        source: "OUTLINE",
      });
    }

    // Calculate end pages based on next entry
    for (let i = 0; i < entries.length - 1; i++) {
      if (entries[i].level >= entries[i + 1].level) {
        entries[i].endPage = entries[i + 1].startPage - 1;
      }
    }

    // Last entry gets remaining pages
    if (entries.length > 0) {
      entries[entries.length - 1].endPage = pageCount;
    }

    log.push(`[TOC] Extracted ${entries.length} chapters from outline`);

    return {
      success: entries.length > 0,
      entries,
      source: "OUTLINE",
      confidence: entries.length > 0 ? 0.9 : 0,
      message: `Extracted ${entries.length} chapters from PDF outline`,
      extractionLog: log,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.push(`[TOC] Outline extraction failed: ${errorMessage}`);
    return {
      success: false,
      entries: [],
      source: "OUTLINE",
      confidence: 0,
      message: errorMessage,
      extractionLog: log,
    };
  }
}

/**
 * Parse chapter number (supports both Arabic and Roman numerals)
 */
function parseChapterNumber(numStr: string): number {
  // Try Arabic first
  const arabic = parseInt(numStr, 10);
  if (!isNaN(arabic)) return arabic;

  // Try Roman numerals
  const romanMap: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15,
    'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20,
  };

  return romanMap[numStr.toUpperCase()] || 0;
}

/**
 * Extract TOC using OCR on typical TOC pages (pages 1-10)
 */
async function extractFromOCR(pdfPath: string, pageCount: number): Promise<TocExtractionResult> {
  const log: string[] = [];
  log.push(`[TOC] Starting OCR extraction`);

  try {
    // Read first 10 pages for TOC
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // Create a new PDF with just TOC pages (typically first 5-10 pages)
    const tocPageCount = Math.min(10, pageCount);
    const tocPdf = await PDFDocument.create();

    for (let i = 0; i < tocPageCount; i++) {
      const [page] = await tocPdf.copyPages(pdfDoc, [i]);
      tocPdf.addPage(page);
    }

    const tocPdfBytes = await tocPdf.save();
    const tocBuffer = Buffer.from(tocPdfBytes);

    log.push(`[TOC] Created TOC PDF with ${tocPageCount} pages`);

    // Parse with BrightOne
    const result = await brightOneAdapter.parse(tocBuffer, "toc-pages.pdf");

    if (!result.success || !result.document) {
      log.push(`[TOC] OCR failed: ${result.error}`);
      return {
        success: false,
        entries: [],
        source: "OCR",
        confidence: 0,
        message: result.error || "OCR failed",
        extractionLog: log,
      };
    }

    // Parse the OCR result to extract TOC entries
    const entries = parseTocFromText(result.document.rawMarkdown || "", pageCount, log);

    if (entries.length === 0) {
      log.push(`[TOC] Could not parse TOC entries from OCR result`);
      return {
        success: false,
        entries: [],
        source: "OCR",
        confidence: 0,
        message: "Could not parse TOC from OCR result",
        extractionLog: log,
      };
    }

    log.push(`[TOC] Extracted ${entries.length} chapters from OCR`);

    return {
      success: true,
      entries,
      source: "OCR",
      confidence: 0.7,
      message: `Extracted ${entries.length} chapters using OCR`,
      extractionLog: log,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.push(`[TOC] OCR extraction failed: ${errorMessage}`);
    return {
      success: false,
      entries: [],
      source: "OCR",
      confidence: 0,
      message: errorMessage,
      extractionLog: log,
    };
  }
}

/**
 * Parse TOC entries from OCR text
 *
 * IMPORTANT: This function does NOT estimate pages.
 * If page numbers are found in the OCR text, they are used.
 * Otherwise, pages are set to 0 - Admin must provide them.
 *
 * NEVER estimates pages - this violates the core principle.
 */
function parseTocFromText(text: string, totalPages: number, log: string[]): TocEntry[] {
  const entries: TocEntry[] = [];

  // Pattern to find page numbers in TOC text (e.g., "Bài 1: Ôn tập ...... 5")
  const pageNumberPattern = /(?:^|\n)\s*[\dIVX]+\.?\s*[^.]+?\.{2,}\s*(\d+)\s*$/gm;

  // Common patterns for Vietnamese textbook chapters
  const patterns = [
    // Bài 1: Title or Bài 1 - Title
    /Bài\s+(\d+|[IVX]+)[:\-\s]+(.+?)(?=\n|Bài\s+\d|$)/gi,
    // Chương 1: Title
    /Chương\s+(\d+|[IVX]+)[:\-\s]+(.+?)(?=\n|Chương\s+\d|$)/gi,
    // Unit 1: Title
    /Unit\s+(\d+|[IVX]+)[:\-\s]+(.+?)(?=\n|Unit\s+\d|$)/gi,
    // Phần 1: Title
    /Phần\s+(\d+|[IVX]+)[:\-\s]+(.+?)(?=\n|Phần\s+\d|$)/gi,
    // Just numbers at start: "1. Title" or "1 Title"
    /^(\d+)\.?\s+(.+)$/gm,
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];

    for (const match of matches) {
      const numStr = match[1];
      const title = match[2].trim();

      if (!title || title.length < 3) continue;

      const chapterNum = parseChapterNumber(numStr);
      if (chapterNum === 0) continue;

      // DO NOT estimate pages - set to 0 and let Admin provide
      const entry: TocEntry = {
        title,
        startPage: 0, // MUST be provided by Admin
        endPage: 0,   // MUST be provided by Admin
        level: 1,
        parentIndex: -1,
        aliases: generateAliases(title),
        confidence: 0.3, // Low confidence - pages not confirmed
        source: "OCR",
      };

      entries.push(entry);
      log.push(`[TOC] Parsed: "${title}" (page ranges MUST be provided by Admin)`);
    }

    if (entries.length > 0) break;
  }

  return entries;
}

/**
 * Main TOC extraction function
 * Priority: Outline -> OCR -> AI (last resort)
 */
export async function extractToc(bookId: string): Promise<TocExtractionResult> {
  const log: string[] = [];
  log.push(`[TOC] Starting TOC extraction for book ${bookId}`);

  // Get book
  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    return {
      success: false,
      entries: [],
      source: "MANUAL",
      confidence: 0,
      message: "Book not found",
      extractionLog: ["Book not found"],
    };
  }

  const pdfPath = getPdfPath(book.pdfPath || "");

  // Check if PDF exists
  try {
    await fs.access(pdfPath);
  } catch {
    return {
      success: false,
      entries: [],
      source: "MANUAL",
      confidence: 0,
      message: "PDF file not found",
      extractionLog: ["PDF file not found"],
    };
  }

  // Try outline extraction first
  log.push(`[TOC] Trying outline extraction...`);
  let result = await extractFromOutline(pdfPath, book.pageCount ?? 999);

  if (result.success && result.entries.length > 0) {
    log.push(`[TOC] SUCCESS: Outline extraction found ${result.entries.length} chapters`);
    return { ...result, extractionLog: log };
  }

  // Try OCR on TOC pages
  log.push(`[TOC] Outline failed, trying OCR on TOC pages...`);
  result = await extractFromOCR(pdfPath, book.pageCount ?? 999);

  if (result.success && result.entries.length > 0) {
    log.push(`[TOC] SUCCESS: OCR extraction found ${result.entries.length} chapters`);
    return { ...result, extractionLog: log };
  }

  // AI is last resort - but we don't implement it here
  // Instead, return failure so admin can manually enter
  log.push(`[TOC] FAILED: All automatic extraction methods failed`);
  log.push(`[TOC] MANUAL ENTRY REQUIRED: Admin must enter TOC manually`);

  return {
    success: false,
    entries: [],
    source: "MANUAL",
    confidence: 0,
    message: "Could not extract TOC automatically. Please enter manually or try rebuilding with a different PDF.",
    extractionLog: log,
  };
}

/**
 * Validate TOC entries
 */
export function validateTocEntries(entries: TocEntry[], pageCount: number): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Check empty title
    if (!entry.title || entry.title.trim().length === 0) {
      errors.push(`Chapter ${i + 1}: Empty title`);
    }

    // Check invalid page range
    if (entry.startPage < 1) {
      errors.push(`"${entry.title}": Start page must be >= 1`);
    }

    if (entry.endPage > pageCount) {
      errors.push(`"${entry.title}": End page (${entry.endPage}) exceeds book pages (${pageCount})`);
    }

    if (entry.startPage > entry.endPage) {
      errors.push(`"${entry.title}": Start page > End page`);
    }

    // Check for overlaps with siblings
    if (i > 0 && entry.level === entries[i - 1].level) {
      if (entry.startPage < entries[i - 1].endPage) {
        errors.push(`"${entry.title}": Overlaps with previous chapter`);
      }
    }
  }

  // Check for duplicates
  const titles = entries.map(e => e.title.toLowerCase().trim());
  const duplicates = titles.filter((t, i) => titles.indexOf(t) !== i);
  if (duplicates.length > 0) {
    errors.push(`Duplicate chapter names: ${[...new Set(duplicates)].join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Save TOC entries to database
 */
export async function saveTocEntries(
  bookId: string,
  entries: TocEntry[],
  source: "OUTLINE" | "OCR" | "AI" | "MANUAL"
): Promise<{ success: boolean; message: string; savedCount: number }> {
  // Validate first
  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
    select: { pageCount: true },
  });

  if (!book) {
    return { success: false, message: "Book not found", savedCount: 0 };
  }

  const validation = validateTocEntries(entries, book.pageCount ?? 999);
  if (!validation.valid) {
    return { success: false, message: validation.errors.join('; '), savedCount: 0 };
  }

  // Delete existing chapters
  await prisma.textbookChapter.deleteMany({
    where: { bookId },
  });

  // Save new chapters
  let savedCount = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    await prisma.textbookChapter.create({
      data: {
        bookId,
        code: `CH${i + 1}`,
        name: entry.title,
        chapterNumber: i + 1,
        title: entry.title,
        aliases: entry.aliases,
        startPage: entry.startPage,
        endPage: entry.endPage,
        level: entry.level,
        source: entry.source as any,
        confidence: entry.confidence,
        isApproved: source === "MANUAL" ? true : false, // Auto-approve manual entries
        isActive: true,
      },
    });

    savedCount++;
  }

  // Update book status
  await prisma.textbookBook.update({
    where: { id: bookId },
    data: {
      tocStatus: "COMPLETED",
      tocSource: source as any,
      isApproved: source === "MANUAL",
    },
  });

  return {
    success: true,
    message: `Saved ${savedCount} chapters`,
    savedCount,
  };
}
