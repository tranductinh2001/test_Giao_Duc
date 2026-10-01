/**
 * Shared File Validator - Unified file validation for all upload endpoints
 *
 * Configuration is read from environment variables:
 * - MAX_DOC_SIZE_MB=30 (DOC, DOCX)
 * - MAX_PDF_SIZE_MB=100 (PDF)
 * - MAX_IMAGE_SIZE_MB=30 (PNG, JPG, JPEG, WEBP, BMP, TIFF)
 * - MAX_IMPORT_SIZE_MB=30 (XLSX, XLS, JSON)
 *
 * If not set, defaults are used.
 */

import { z } from "zod";

// Default limits (in MB)
const DEFAULT_DOC_SIZE_MB = 30;
const DEFAULT_PDF_SIZE_MB = 100;
const DEFAULT_IMAGE_SIZE_MB = 30;
const DEFAULT_IMPORT_SIZE_MB = 30;

// Read from environment or use defaults
const MAX_DOC_SIZE_MB = parseInt(process.env.MAX_DOC_SIZE_MB || String(DEFAULT_DOC_SIZE_MB), 10);
const MAX_PDF_SIZE_MB = parseInt(process.env.MAX_PDF_SIZE_MB || String(DEFAULT_PDF_SIZE_MB), 10);
const MAX_IMAGE_SIZE_MB = parseInt(process.env.MAX_IMAGE_SIZE_MB || String(DEFAULT_IMAGE_SIZE_MB), 10);
const MAX_IMPORT_SIZE_MB = parseInt(process.env.MAX_IMPORT_SIZE_MB || String(DEFAULT_IMPORT_SIZE_MB), 10);

// Convert to bytes
const MAX_DOC_SIZE_BYTES = MAX_DOC_SIZE_MB * 1024 * 1024;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_IMPORT_SIZE_BYTES = MAX_IMPORT_SIZE_MB * 1024 * 1024;

/**
 * Supported MIME types with categories
 */
export const FILE_TYPE_CATEGORIES = {
  DOCUMENT: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
    "application/msword", // DOC
  ],
  PDF: [
    "application/pdf",
  ],
  IMAGE: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ],
  IMPORT: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
    "application/vnd.ms-excel", // XLS
    "application/json", // JSON
  ],
} as const;

export type FileCategory = keyof typeof FILE_TYPE_CATEGORIES;

/**
 * All allowed MIME types
 */
export const ALLOWED_MIME_TYPES = [
  ...FILE_TYPE_CATEGORIES.DOCUMENT,
  ...FILE_TYPE_CATEGORIES.PDF,
  ...FILE_TYPE_CATEGORIES.IMAGE,
  ...FILE_TYPE_CATEGORIES.IMPORT,
] as const;

/**
 * Get file category from MIME type
 */
export function getFileCategory(mimeType: string): FileCategory | null {
  if (FILE_TYPE_CATEGORIES.DOCUMENT.includes(mimeType as any)) return "DOCUMENT";
  if (FILE_TYPE_CATEGORIES.PDF.includes(mimeType as any)) return "PDF";
  if (FILE_TYPE_CATEGORIES.IMAGE.includes(mimeType as any)) return "IMAGE";
  if (FILE_TYPE_CATEGORIES.IMPORT.includes(mimeType as any)) return "IMPORT";
  return null;
}

/**
 * Get max file size (in bytes) for a given MIME type
 */
export function getMaxFileSize(mimeType: string): number {
  const category = getFileCategory(mimeType);
  switch (category) {
    case "DOCUMENT":
      return MAX_DOC_SIZE_BYTES;
    case "PDF":
      return MAX_PDF_SIZE_BYTES;
    case "IMAGE":
      return MAX_IMAGE_SIZE_BYTES;
    case "IMPORT":
      return MAX_IMPORT_SIZE_BYTES;
    default:
      return MAX_DOC_SIZE_BYTES; // Default to document limit
  }
}

/**
 * Get max file size (in MB) for display
 */
export function getMaxFileSizeMB(mimeType: string): number {
  const category = getFileCategory(mimeType);
  switch (category) {
    case "DOCUMENT":
      return MAX_DOC_SIZE_MB;
    case "PDF":
      return MAX_PDF_SIZE_MB;
    case "IMAGE":
      return MAX_IMAGE_SIZE_MB;
    case "IMPORT":
      return MAX_IMPORT_SIZE_MB;
    default:
      return MAX_DOC_SIZE_MB;
  }
}

/**
 * Get file category from extension
 */
export function getFileCategoryByExtension(fileName: string): FileCategory | null {
  const ext = "." + fileName.toLowerCase().split(".").pop();
  if ([".docx", ".doc"].includes(ext)) return "DOCUMENT";
  if (ext === ".pdf") return "PDF";
  if ([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"].includes(ext)) return "IMAGE";
  if ([".xlsx", ".xls", ".json"].includes(ext)) return "IMPORT";
  return null;
}

/**
 * Get max file size (in bytes) by extension
 */
export function getMaxFileSizeByExtension(fileName: string): number {
  const category = getFileCategoryByExtension(fileName);
  switch (category) {
    case "DOCUMENT":
      return MAX_DOC_SIZE_BYTES;
    case "PDF":
      return MAX_PDF_SIZE_BYTES;
    case "IMAGE":
      return MAX_IMAGE_SIZE_BYTES;
    case "IMPORT":
      return MAX_IMPORT_SIZE_BYTES;
    default:
      return MAX_DOC_SIZE_BYTES;
  }
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: "UNSUPPORTED_TYPE" | "FILE_TOO_LARGE" | "INVALID_FILE";
  category?: FileCategory | null;
  maxSizeMB?: number;
  maxSizeBytes?: number;
}

/**
 * Validate a file based on its MIME type
 */
export function validateFile(file: { name: string; size: number; type: string }): FileValidationResult {
  // Check if MIME type is allowed
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Định dạng không được hỗ trợ. Hỗ trợ: DOCX, DOC, PDF, PNG, JPG, JPEG, WEBP, BMP, TIFF`,
      errorCode: "UNSUPPORTED_TYPE",
    };
  }

  const maxSize = getMaxFileSize(file.type);
  const maxSizeMB = getMaxFileSizeMB(file.type);

  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File "${file.name}" (${sizeMB}MB) vượt quá giới hạn ${maxSizeMB}MB cho loại ${getFileCategory(file.type)}`,
      errorCode: "FILE_TOO_LARGE",
      maxSizeMB,
      maxSizeBytes: maxSize,
    };
  }

  return {
    valid: true,
    category: getFileCategory(file.type),
    maxSizeMB,
    maxSizeBytes: maxSize,
  };
}

/**
 * Check if file requires BrightOne API processing
 */
export function requiresAPI(filename: string, mimeType: string): boolean {
  // PDF and images need BrightOne for OCR
  const category = getFileCategory(mimeType);
  return category === "PDF" || category === "IMAGE";
}

/**
 * Get configuration for display in UI
 */
export function getFileSizeConfig() {
  return {
    document: {
      maxSizeMB: MAX_DOC_SIZE_MB,
      maxSizeBytes: MAX_DOC_SIZE_BYTES,
      extensions: [".docx", ".doc"],
      mimeTypes: FILE_TYPE_CATEGORIES.DOCUMENT,
    },
    pdf: {
      maxSizeMB: MAX_PDF_SIZE_MB,
      maxSizeBytes: MAX_PDF_SIZE_BYTES,
      extensions: [".pdf"],
      mimeTypes: FILE_TYPE_CATEGORIES.PDF,
    },
    image: {
      maxSizeMB: MAX_IMAGE_SIZE_MB,
      maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
      extensions: [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"],
      mimeTypes: FILE_TYPE_CATEGORIES.IMAGE,
    },
    import: {
      maxSizeMB: MAX_IMPORT_SIZE_MB,
      maxSizeBytes: MAX_IMPORT_SIZE_BYTES,
      extensions: [".xlsx", ".xls", ".json"],
      mimeTypes: FILE_TYPE_CATEGORIES.IMPORT,
    },
  };
}

/**
 * Zod schema for file validation (used in form validation)
 */
export const fileValidationSchema = z.object({
  name: z.string(),
  size: z.number().max(MAX_DOC_SIZE_BYTES), // Use highest limit for schema
  type: z.enum(ALLOWED_MIME_TYPES),
});

/**
 * Get error message for BrightOne errors (to return to client)
 */
export function getBrightOneErrorMessage(error: any): string {
  if (!error) return "Lỗi không xác định từ OCR service";

  const errorMessage = error.message || String(error);
  const errorCode = error.code || error.error?.code;

  // Map BrightOne errors to user-friendly messages
  if (errorCode === "QUOTA_EXCEEDED" || errorMessage.includes("quota")) {
    return "OCR quota đã hết. Vui lòng thử lại sau hoặc liên hệ admin.";
  }

  if (errorCode === "TIMEOUT" || errorMessage.includes("timeout")) {
    return "OCR xử lý quá lâu. File có thể quá lớn.";
  }

  if (errorCode === "FILE_TOO_LARGE" || errorMessage.includes("file too large")) {
    return "File vượt quá giới hạn của OCR service.";
  }

  if (errorCode === "UNSUPPORTED_FORMAT" || errorMessage.includes("unsupported")) {
    return "Định dạng file không được OCR service hỗ trợ.";
  }

  // Generic OCR error
  return `OCR thất bại: ${errorMessage}`;
}
