/**
 * OCR Cost Optimizer
 * Stores page hash and reuses OCR results to avoid redundant processing
 */

import crypto from "crypto";
import { promises as fs } from "fs";

export interface OcrPageHash {
  pageNumber: number;
  contentHash: string;
  textLength: number;
  processedAt: Date;
}

export interface OcrCacheEntry {
  bookId: string;
  chapterId?: string;
  pageHashes: OcrPageHash[];
  ocrText: string; // Full extracted text for all pages
  totalPages: number;
  processedAt: Date;
  expiresAt: Date;
}

export interface OcrResult {
  success: boolean;
  text: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
  fromCache: boolean;
  processingTime: number;
  tokenEstimate: number;
}

const OCR_CACHE_DIR = "storage/cache/ocr";

/**
 * Calculate hash for a page image (for OCR caching)
 */
export function calculatePageHash(imageBuffer: Buffer): string {
  return crypto.createHash("sha256").update(imageBuffer).digest("hex").substring(0, 16);
}

/**
 * Calculate hash for PDF page (using page number and book ID)
 */
export function calculatePdfPageHash(
  bookId: string,
  pageNumber: number,
  pdfHash?: string
): string {
  const data = `${bookId}:${pageNumber}:${pdfHash || ""}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
}

/**
 * Get OCR cache path
 */
function getOcrCachePath(bookId: string, chapterId?: string): string {
  const dir = chapterId
    ? `${OCR_CACHE_DIR}/${bookId}/${chapterId}`
    : `${OCR_CACHE_DIR}/${bookId}`;
  return dir;
}

/**
 * Ensure OCR cache directory exists
 */
async function ensureOcrCacheDir(bookId: string, chapterId?: string): Promise<string> {
  const dir = getOcrCachePath(bookId, chapterId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Save OCR result to cache
 */
export async function saveOcrResult(
  bookId: string,
  chapterId: string,
  pageHashes: OcrPageHash[],
  ocrText: string,
  ttlDays: number = 30
): Promise<void> {
  const cachePath = await ensureOcrCacheDir(bookId, chapterId);
  const filePath = `${cachePath}/result.json`;

  const entry: OcrCacheEntry = {
    bookId,
    chapterId,
    pageHashes,
    ocrText,
    totalPages: pageHashes.length,
    processedAt: new Date(),
    expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
  };

  await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
}

/**
 * Get cached OCR result
 */
export async function getCachedOcrResult(
  bookId: string,
  chapterId: string,
  currentPageHashes: OcrPageHash[]
): Promise<{
  found: boolean;
  expired: boolean;
  match: boolean;
  result?: OcrCacheEntry;
  reason?: string;
}> {
  const cachePath = getOcrCachePath(bookId, chapterId);
  const filePath = `${cachePath}/result.json`;

  try {
    const data = await fs.readFile(filePath, "utf-8");
    const entry: OcrCacheEntry = JSON.parse(data);

    // Check if expired
    if (new Date() > new Date(entry.expiresAt)) {
      return { found: true, expired: true, match: false, reason: "expired" };
    }

    // Check if page hashes match
    if (currentPageHashes.length !== entry.pageHashes.length) {
      return { found: true, expired: false, match: false, reason: "page_count_mismatch" };
    }

    for (let i = 0; i < currentPageHashes.length; i++) {
      if (currentPageHashes[i].contentHash !== entry.pageHashes[i]?.contentHash) {
        return { found: true, expired: false, match: false, reason: "hash_mismatch" };
      }
    }

    return { found: true, expired: false, match: true, result: entry };
  } catch {
    return { found: false, expired: false, match: false, reason: "not_found" };
  }
}

/**
 * Get OCR results with cache check
 * Returns cached result if available and matching, otherwise processes and caches
 */
export async function getOrProcessOcr(
  bookId: string,
  chapterId: string,
  pageHashes: OcrPageHash[],
  processFn: () => Promise<OcrResult>
): Promise<OcrResult> {
  const startTime = Date.now();

  // Check cache
  const cacheCheck = await getCachedOcrResult(bookId, chapterId, pageHashes);

  if (cacheCheck.found && cacheCheck.match && cacheCheck.result) {
    return {
      success: true,
      text: cacheCheck.result.ocrText,
      pages: cacheCheck.result.pageHashes.map((h, i) => ({
        pageNumber: h.pageNumber,
        text: "", // Text is in full ocrText
        confidence: 1.0,
      })),
      fromCache: true,
      processingTime: Date.now() - startTime,
      tokenEstimate: Math.ceil(cacheCheck.result.ocrText.length / 4),
    };
  }

  // Process OCR
  const result = await processFn();

  // Cache if successful
  if (result.success) {
    await saveOcrResult(bookId, chapterId, pageHashes, result.text);
  }

  return result;
}

/**
 * Clear OCR cache for a chapter
 */
export async function clearOcrCache(bookId: string, chapterId?: string): Promise<void> {
  const cachePath = getOcrCachePath(bookId, chapterId);

  try {
    await fs.rm(cachePath, { recursive: true, force: true });
  } catch {
    // Directory may not exist
  }
}

/**
 * Get OCR cache statistics
 */
export async function getOcrCacheStats(): Promise<{
  totalEntries: number;
  totalSize: number;
  expiredEntries: number;
  byBook: Array<{
    bookId: string;
    chapters: number;
    size: number;
  }>;
}> {
  const { prisma } = await import("@/lib/prisma");

  // Count from filesystem (simpler for now)
  let totalEntries = 0;
  let totalSize = 0;
  const byBook: Array<{ bookId: string; chapters: number; size: number }> = [];

  try {
    const baseDir = OCR_CACHE_DIR;
    const entries = await fs.readdir(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const bookId = entry.name;
        const bookPath = `${baseDir}/${bookId}`;
        const bookStat = await fs.stat(bookPath);

        const chapterEntries = await fs.readdir(bookPath, { withFileTypes: true });
        const chapters = chapterEntries.filter(e => e.isDirectory()).length;

        let bookSize = 0;
        for (const chapter of chapterEntries) {
          if (chapter.isDirectory()) {
            const chapterPath = `${bookPath}/${chapter.name}`;
            const files = await fs.readdir(chapterPath);
            for (const file of files) {
              const fileStat = await fs.stat(`${chapterPath}/${file}`);
              bookSize += fileStat.size;
            }
          }
        }

        byBook.push({ bookId, chapters, size: bookSize });
        totalEntries += chapters;
        totalSize += bookSize;
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return {
    totalEntries,
    totalSize,
    expiredEntries: 0, // Would need to check each entry's expiration
    byBook,
  };
}

/**
 * Estimate OCR cost based on page count and image size
 */
export function estimateOcrCost(
  pageCount: number,
  averagePageSizeBytes: number = 50000
): {
  estimatedApiCalls: number;
  estimatedCost: number;
  currency: string;
} {
  // Example OCR pricing (Google Cloud Vision API approx)
  const COST_PER_1000_PAGES = 0.0015; // $1.50 per 1000 pages

  const estimatedApiCalls = pageCount;
  const estimatedCost = (pageCount / 1000) * COST_PER_1000_PAGES;

  return {
    estimatedApiCalls,
    estimatedCost: Math.round(estimatedCost * 10000) / 10000,
    currency: "USD",
  };
}

/**
 * Calculate savings from OCR caching
 */
export function calculateOcrSavings(
  pageCount: number,
  cacheHitRate: number
): {
  withoutCache: number;
  withCache: number;
  savings: number;
  savingsPercent: number;
} {
  const baseCost = estimateOcrCost(pageCount);
  const cacheSavings = baseCost.estimatedCost * cacheHitRate;

  return {
    withoutCache: baseCost.estimatedCost,
    withCache: baseCost.estimatedCost - cacheSavings,
    savings: Math.round(cacheSavings * 10000) / 10000,
    savingsPercent: Math.round(cacheHitRate * 100),
  };
}
