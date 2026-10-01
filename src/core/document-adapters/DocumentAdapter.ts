/**
 * Document Adapter Interface
 *
 * Strategy Pattern: All adapters return UnifiedDocument
 */

import { Buffer } from "buffer";
import {
  UnifiedDocument,
  DocumentSourceType,
  DocumentStatus,
  AdapterResult,
  FileValidation,
} from "./types";
import { getMaxFileSizeByExtension, getFileCategoryByExtension } from "@/lib/file-validator";

// Adapter Interface
export interface IDocumentAdapter {
  readonly sourceType: DocumentSourceType;
  readonly supportedMimeTypes: string[];
  readonly supportedExtensions: string[];

  validateFile(file: Buffer, fileName: string): FileValidation;
  parse(file: Buffer, fileName: string): Promise<AdapterResult>;
}

// Base adapter with common functionality
export abstract class BaseAdapter implements IDocumentAdapter {
  abstract readonly sourceType: DocumentSourceType;
  abstract readonly supportedMimeTypes: string[];
  abstract readonly supportedExtensions: string[];

  validateFile(file: Buffer, fileName: string): FileValidation {
    const ext = fileName.toLowerCase().split(".").pop() || "";

    if (!this.supportedExtensions.includes(`.${ext}`)) {
      return {
        valid: false,
        error: `Định dạng ${ext} không được hỗ trợ. Hỗ trợ: ${this.supportedExtensions.join(", ")}`,
      };
    }

    const maxSize = getMaxFileSizeByExtension(fileName);
    const category = getFileCategoryByExtension(fileName);
    const maxSizeMB = maxSize / (1024 * 1024);

    if (file.length > maxSize) {
      return {
        valid: false,
        error: `File ${(file.length / 1024 / 1024).toFixed(2)}MB vượt quá giới hạn ${maxSizeMB}MB cho loại ${category || "file"}`,
      };
    }

    return {
      valid: true,
      type: this.sourceType,
      size: file.length,
      mimeType: this.supportedMimeTypes[0],
    };
  }

  abstract parse(file: Buffer, fileName: string): Promise<AdapterResult>;

  // Common helper: generate unique ID
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Common helper: create base document structure
  protected createBaseDocument(
    fileName: string,
    rawContent: string,
    sections: any[] = []
  ): UnifiedDocument {
    return {
      id: this.generateId(),
      title: fileName.replace(/\.(docx|doc|pdf|png|jpg|jpeg)$/i, ""),
      sourceType: this.sourceType,
      sourceFile: fileName,
      status: DocumentStatus.PARSING,
      sections,
      metadata: {
        wordCount: rawContent.split(/\s+/).filter(Boolean).length,
        parsedAt: new Date(),
      },
    };
  }
}

// MIME type mapping
export const MIME_TYPE_MAP: Record<string, DocumentSourceType> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocumentSourceType.DOCX,
  "application/msword": DocumentSourceType.DOC,
  "application/pdf": DocumentSourceType.PDF,
  "image/png": DocumentSourceType.IMAGE,
  "image/jpeg": DocumentSourceType.IMAGE,
  "image/jpg": DocumentSourceType.IMAGE,
  "image/webp": DocumentSourceType.IMAGE,
  "image/bmp": DocumentSourceType.IMAGE,
  "image/tiff": DocumentSourceType.IMAGE,
};

// Extension mapping
export const EXTENSION_MAP: Record<string, DocumentSourceType> = {
  ".docx": DocumentSourceType.DOCX,
  ".doc": DocumentSourceType.DOC,
  ".pdf": DocumentSourceType.PDF,
  ".png": DocumentSourceType.IMAGE,
  ".jpg": DocumentSourceType.IMAGE,
  ".jpeg": DocumentSourceType.IMAGE,
  ".webp": DocumentSourceType.IMAGE,
  ".bmp": DocumentSourceType.IMAGE,
  ".tiff": DocumentSourceType.IMAGE,
  ".tif": DocumentSourceType.IMAGE,
};

// Detect source type from MIME type or extension
export function detectSourceType(
  mimeType: string | null,
  fileName: string
): DocumentSourceType {
  // First try MIME type
  if (mimeType) {
    const normalizedMime = mimeType.toLowerCase().trim();
    if (MIME_TYPE_MAP[normalizedMime]) {
      return MIME_TYPE_MAP[normalizedMime];
    }
  }

  // Fall back to extension detection
  const ext = "." + (fileName.toLowerCase().split(".").pop() || "");
  if (EXTENSION_MAP[ext]) {
    return EXTENSION_MAP[ext];
  }

  // Default to DOCX for safety (will use local parsing)
  return DocumentSourceType.DOCX;
}
