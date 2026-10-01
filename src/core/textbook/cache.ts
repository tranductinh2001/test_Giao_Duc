/**
 * PDF Page Cache Service
 * Manages cached PDF pages with TTL and storage
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const CACHE_BASE_DIR = "storage/cache/books";
const DEFAULT_TTL_HOURS = 24 * 7; // 7 days default TTL

export interface CacheEntry {
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  startPage: number;
  endPage: number;
  filePath: string;
  size: number;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}

/**
 * Get cache directory for a book
 */
function getCacheDir(bookId: string): string {
  return path.join(CACHE_BASE_DIR, bookId);
}

/**
 * Get cache file path for a chapter
 */
function getCachePath(bookId: string, chapterId: string): string {
  return path.join(getCacheDir(bookId), `${chapterId}.pdf`);
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(bookId: string): Promise<void> {
  const dir = getCacheDir(bookId);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Store PDF pages in cache
 */
export async function cachePdfPages(
  bookId: string,
  chapterId: string,
  chapterTitle: string,
  startPage: number,
  endPage: number,
  pdfBuffer: Buffer
): Promise<CacheEntry> {
  await ensureCacheDir(bookId);

  const cachePath = getCachePath(bookId, chapterId);
  await fs.writeFile(cachePath, pdfBuffer);

  const stats = await fs.stat(cachePath);
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_HOURS * 60 * 60 * 1000);

  const entry: CacheEntry = {
    bookId,
    chapterId,
    chapterTitle,
    startPage,
    endPage,
    filePath: cachePath,
    size: stats.size,
    createdAt: new Date(),
    expiresAt,
    hitCount: 0,
  };

  // Store metadata in database
  await storeCacheMetadata(entry);

  return entry;
}

/**
 * Store cache metadata in database
 */
async function storeCacheMetadata(entry: CacheEntry): Promise<void> {
  const { prisma } = await import("@/lib/prisma");

  await prisma.textbookCacheEntry.upsert({
    where: {
      chapterId: entry.chapterId,
    },
    create: {
      chapterId: entry.chapterId,
      filePath: entry.filePath,
      fileSize: entry.size,
      startPage: entry.startPage,
      endPage: entry.endPage,
      expiresAt: entry.expiresAt,
      hitCount: 0,
    },
    update: {
      filePath: entry.filePath,
      fileSize: entry.size,
      startPage: entry.startPage,
      endPage: entry.endPage,
      expiresAt: entry.expiresAt,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get cached PDF pages if available and not expired
 */
export async function getCachedPdf(
  bookId: string,
  chapterId: string
): Promise<{
  found: boolean;
  expired: boolean;
  buffer?: Buffer;
  entry?: CacheEntry;
}> {
  const { prisma } = await import("@/lib/prisma");

  const cacheEntry = await prisma.textbookCacheEntry.findUnique({
    where: { chapterId },
  });

  if (!cacheEntry) {
    return { found: false, expired: false };
  }

  // Check if expired
  if (new Date() > cacheEntry.expiresAt) {
    // Clean up expired entry
    await deleteCachedPdf(bookId, chapterId);
    return { found: false, expired: true };
  }

  // Check if file exists
  try {
    const buffer = await fs.readFile(cacheEntry.filePath);

    // Update hit count
    await prisma.textbookCacheEntry.update({
      where: { chapterId: cacheEntry.chapterId },
      data: {
        hitCount: { increment: 1 },
      },
    });

    // Get bookId from chapter
    const chapter = await prisma.textbookChapter.findUnique({
      where: { id: cacheEntry.chapterId },
      select: { bookId: true },
    });

    return {
      found: true,
      expired: false,
      buffer,
      entry: {
        bookId: chapter?.bookId || "",
        chapterId: cacheEntry.chapterId,
        chapterTitle: "",
        startPage: cacheEntry.startPage,
        endPage: cacheEntry.endPage,
        filePath: cacheEntry.filePath,
        size: Number(cacheEntry.fileSize),
        createdAt: cacheEntry.createdAt,
        expiresAt: cacheEntry.expiresAt,
        hitCount: cacheEntry.hitCount,
      },
    };
  } catch {
    // File doesn't exist, clean up metadata
    await prisma.textbookCacheEntry.delete({
      where: { chapterId: cacheEntry.chapterId },
    });

    return { found: false, expired: false };
  }
}

/**
 * Delete cached PDF pages
 */
export async function deleteCachedPdf(bookId: string, chapterId: string): Promise<void> {
  const cachePath = getCachePath(bookId, chapterId);

  try {
    await fs.unlink(cachePath);
  } catch {
    // File doesn't exist, ignore
  }

  // Delete metadata
  const { prisma } = await import("@/lib/prisma");
  await prisma.textbookCacheEntry.delete({
    where: { chapterId },
  }).catch(() => {
    // Ignore if not found
  });
}

/**
 * Clear all cache for a book
 */
export async function clearBookCache(bookId: string): Promise<number> {
  const { prisma } = await import("@/lib/prisma");

  const cacheDir = getCacheDir(bookId);
  let deleted = 0;

  try {
    const files = await fs.readdir(cacheDir);
    for (const file of files) {
      if (file.endsWith(".pdf")) {
        await fs.unlink(path.join(cacheDir, file));
        deleted++;
      }
    }
  } catch {
    // Directory doesn't exist
  }

  // Get chapter IDs for this book and delete
  const chapters = await prisma.textbookChapter.findMany({
    where: { bookId },
    select: { id: true },
  });

  const chapterIds = chapters.map(c => c.id);

  if (chapterIds.length > 0) {
    await prisma.textbookCacheEntry.deleteMany({
      where: { chapterId: { in: chapterIds } },
    });
  }

  return deleted;
}

/**
 * Clear all expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  const { prisma } = await import("@/lib/prisma");

  const expired = await prisma.textbookCacheEntry.findMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  let deleted = 0;

  for (const entry of expired) {
    try {
      await fs.unlink(entry.filePath);
    } catch {
      // File doesn't exist
    }
    await prisma.textbookCacheEntry.delete({
      where: { chapterId: entry.chapterId },
    });
    deleted++;
  }

  return deleted;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalSize: number;
  expiredEntries: number;
  hitRate: number;
  byBook: Array<{
    bookId: string;
    chapters: number;
    size: number;
    hits: number;
  }>;
}> {
  const { prisma } = await import("@/lib/prisma");

  const allEntries = await prisma.textbookCacheEntry.findMany({
    where: {
      expiresAt: { gt: new Date() },
    },
  });

  const now = new Date();
  const expiredEntries = await prisma.textbookCacheEntry.count({
    where: {
      expiresAt: { lt: now },
    },
  });

  const totalSize = allEntries.reduce((sum, e) => sum + Number(e.fileSize || 0), 0);
  const totalHits = allEntries.reduce((sum, e) => sum + e.hitCount, 0);

  // Group by book (need to join with chapters)
  const bookMap = new Map<string, { chapters: number; size: number; hits: number }>();

  for (const entry of allEntries) {
    // Get bookId from chapter
    const chapter = await prisma.textbookChapter.findUnique({
      where: { id: entry.chapterId },
      select: { bookId: true },
    });

    const bookId = chapter?.bookId || "unknown";
    const existing = bookMap.get(bookId) || { chapters: 0, size: 0, hits: 0 };
    existing.chapters++;
    existing.size += Number(entry.fileSize || 0);
    existing.hits += entry.hitCount;
    bookMap.set(bookId, existing);
  }

  const byBook = Array.from(bookMap.entries()).map(([bookId, stats]) => ({
    bookId,
    ...stats,
  }));

  return {
    totalEntries: allEntries.length,
    totalSize,
    expiredEntries,
    hitRate: allEntries.length > 0 ? totalHits / allEntries.length : 0,
    byBook,
  };
}

/**
 * Refresh cache TTL for a chapter
 */
export async function refreshCacheTtl(chapterId: string, ttlHours = DEFAULT_TTL_HOURS): Promise<void> {
  const { prisma } = await import("@/lib/prisma");

  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await prisma.textbookCacheEntry.update({
    where: { chapterId },
    data: {
      expiresAt,
      updatedAt: new Date(),
    },
  });
}
