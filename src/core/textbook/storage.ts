/**
 * Textbook Storage Service
 * Manages PDF file storage for textbooks
 *
 * Storage Structure:
 * storage/books/{code}/{version}/original.pdf
 *
 * Each version has its own:
 * - PDF file
 * - TOC chapters
 * - Cache entries
 * - Approval workflow
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";

const STORAGE_BASE = path.join(process.cwd(), "storage", "books");

export interface UploadResult {
  bookId: string;
  pdfPath: string | null;
  fileSize: number;
  fileHash: string;
  pageCount: number | null;
}

/**
 * Initialize storage directories
 */
export async function initializeStorage(): Promise<void> {
  await fs.mkdir(STORAGE_BASE, { recursive: true });
}

/**
 * Get storage directory for a book version
 */
function getVersionDir(code: string, version: string): string {
  // Sanitize code and version for filesystem safety
  const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeVersion = version.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(STORAGE_BASE, safeCode, safeVersion);
}

/**
 * Save uploaded PDF and create database record
 * Each version gets its own directory
 */
export async function saveTextbook(
  file: Buffer,
  fileName: string,
  metadata: {
    code: string;
    version?: string;
    name: string;
    description?: string;
    grade: string;
    subject: string;
  }
): Promise<UploadResult> {
  // Calculate file hash for deduplication (optional - allow same content for different versions)
  const fileHash = crypto.createHash("md5").update(file).digest("hex");

  // Generate unique book ID
  const bookId = crypto.randomUUID();

  // Use version in directory path - convert string to number for DB
  const versionStr = metadata.version || "1.0";
  const version = parseFloat(versionStr) || 1;
  const bookDir = getVersionDir(metadata.code, versionStr);
  await fs.mkdir(bookDir, { recursive: true });

  // Normalize filename
  const normalizedFileName = "original.pdf";
  const pdfPath = path.join(bookDir, normalizedFileName);
  await fs.writeFile(pdfPath, file);

  // Get actual page count from PDF
  const pageCount = await getPdfPageCount(file);

  // Create database record with version-aware path
  const book = await prisma.textbookBook.create({
    data: {
      id: bookId,
      code: metadata.code,
      version: version,
      name: metadata.name,
      description: metadata.description,
      grade: metadata.grade,
      subject: metadata.subject,
      pdfPath: `storage/books/${metadata.code}/${version}/original.pdf`,
      pageCount,
      fileSize: file.length,
      fileHash,
      tocStatus: "PENDING",
    },
  });

  return {
    bookId: book.id,
    pdfPath: book.pdfPath,
    fileSize: file.length,
    fileHash,
    pageCount: book.pageCount,
  };
}

/**
 * Get absolute path to PDF file
 */
export function getPdfPath(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}

/**
 * Read PDF file as buffer
 */
export async function readPdf(relativePath: string): Promise<Buffer> {
  const absolutePath = getPdfPath(relativePath);
  return fs.readFile(absolutePath);
}

/**
 * Check if PDF exists
 */
export async function pdfExists(relativePath: string): Promise<boolean> {
  try {
    const absolutePath = getPdfPath(relativePath);
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete textbook PDF and database record
 */
export async function deleteTextbook(bookId: string): Promise<void> {
  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    throw new Error("Không tìm thấy sách");
  }

  // Delete file
  if (book.pdfPath) {
    const absolutePath = getPdfPath(book.pdfPath);
    try {
      await fs.unlink(absolutePath);
    } catch {
      // File may not exist, continue
    }

    // Delete version directory (storage/books/{code}/{version})
    const versionDir = path.dirname(absolutePath);
    try {
      await fs.rm(versionDir, { recursive: true, force: true });
    } catch {
      // Directory not exist
    }
  }

  // Delete database record (cascades to chapters and jobs)
  await prisma.textbookBook.delete({
    where: { id: bookId },
  });
}

/**
 * Get actual page count from PDF using pdf-lib
 */
async function getPdfPageCount(file: Buffer): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(file, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (error) {
    console.warn("[Storage] Failed to read PDF page count, using estimate:", error);
    // Fallback: ~50KB per page average
    const avgPageSize = 50 * 1024;
    return Math.max(1, Math.round(file.length / avgPageSize));
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalBooks: number;
  totalSize: number;
  totalPages: number;
}> {
  const books = await prisma.textbookBook.findMany({
    where: { isActive: true },
    select: {
      fileSize: true,
      pageCount: true,
    },
  });

  return {
    totalBooks: books.length,
    totalSize: books.reduce((sum, b) => sum + Number(b.fileSize || 0), 0),
    totalPages: books.reduce((sum, b) => sum + (b.pageCount || 0), 0),
  };
}
