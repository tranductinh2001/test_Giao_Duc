/**
 * Unified Document Adapter
 *
 * Factory that selects the correct adapter based on file type
 *
 * NEW PIPELINE (Vision-First):
 * Upload -> Storage -> Detect File Type -> Document Adapter -> BrightOne Vision
 * -> Structured Document -> Section Parser -> Rule Engine -> Book Context -> Lesson Review
 *
 * BrightOne Vision is PRIMARY for PDF/Images.
 * OCR (original BrightOneAdapter) is only FALLBACK.
 */

import { Buffer } from "buffer";
import {
  IDocumentAdapter,
  detectSourceType,
  MIME_TYPE_MAP,
} from "./DocumentAdapter";
import { DocxAdapter } from "./DocxAdapter";
import { BrightOneAdapter } from "./BrightOneAdapter";
import { BrightOneVisionAdapter, brightOneVisionAdapter } from "./BrightOneVisionAdapter";
import {
  UnifiedDocument,
  DocumentSourceType,
  AdapterResult,
  FileValidation,
} from "./types";

// Import adapters
const docxAdapter = new DocxAdapter();
const brightOneAdapter = new BrightOneAdapter();
const brightOneVisionAdapterInstance = new BrightOneVisionAdapter();

/**
 * Get adapter based on source type
 * PRIORITY: BrightOne Vision (primary) > BrightOne OCR (fallback)
 */
function getAdapter(sourceType: DocumentSourceType): IDocumentAdapter {
  switch (sourceType) {
    // DOCX (ZIP-based) - can be parsed locally
    case DocumentSourceType.DOCX:
      return docxAdapter;

    // DOC (OLE binary format) - use Vision API first
    case DocumentSourceType.DOC:
      return brightOneVisionAdapterInstance;

    // PDF and Images - use BrightOne Vision as PRIMARY
    case DocumentSourceType.PDF:
    case DocumentSourceType.IMAGE:
      return brightOneVisionAdapterInstance;

    default:
      // Default to BrightOne Vision (safer for unknown formats)
      return brightOneVisionAdapterInstance;
  }
}

/**
 * Unified Document Adapter
 *
 * Main entry point - automatically selects the right adapter
 */
export class UnifiedDocumentAdapter {
  /**
   * Validate a file and detect its type
   */
  static validateFile(file: Buffer, fileName: string, mimeType?: string | null): FileValidation {
    const sourceType = detectSourceType(mimeType || null, fileName);
    const adapter = getAdapter(sourceType);

    return adapter.validateFile(file, fileName);
  }

  /**
   * Parse a document file into UnifiedDocument
   *
   * Automatically selects:
   * - DOCX/DOC → DocxAdapter (local parsing)
   * - PDF/Image → BrightOneAdapter (API OCR)
   */
  static async parse(
    file: Buffer,
    fileName: string,
    mimeType?: string | null
  ): Promise<AdapterResult> {
    // Detect source type - try MIME type first, then fall back to extension
    const detectedMime = mimeType || null;
    const sourceType = detectSourceType(detectedMime, fileName);

    console.log(`[UnifiedDocumentAdapter] Parsing ${fileName}, mimeType=${mimeType || 'none'}, detected=${sourceType}`);

    const adapter = getAdapter(sourceType);

    console.log(`[UnifiedDocumentAdapter] Using adapter: ${adapter.constructor.name} for ${sourceType}`);

    const result = await adapter.parse(file, fileName);

    if (result.success && result.document) {
      console.log(`[UnifiedDocumentAdapter] Successfully parsed ${sourceType}: ${result.document.sections.length} sections, ${result.document.metadata.wordCount} words`);
    }

    return result;
  }

  /**
   * Get supported file types info
   */
  static getSupportedTypes() {
    return {
      docx: {
        type: DocumentSourceType.DOCX,
        extensions: [".docx"],
        method: "Local parsing (mammoth)",
        supports: ["text", "formatting", "tables", "lists"],
      },
      doc: {
        type: DocumentSourceType.DOC,
        extensions: [".doc"],
        method: "BrightOne API (OCR)",
        supports: ["text", "formatting", "tables", "lists"],
      },
      pdf: {
        type: DocumentSourceType.PDF,
        extensions: [".pdf"],
        method: "BrightOne API (Markdown)",
        supports: ["text", "tables", "layout", "page_numbers"],
      },
      image: {
        type: DocumentSourceType.IMAGE,
        extensions: [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"],
        method: "BrightOne API (OCR)",
        supports: ["text", "layout"],
      },
    };
  }

  /**
   * Check if a file type requires API call
   */
  static requiresAPI(fileName: string, mimeType?: string | null): boolean {
    const sourceType = detectSourceType(mimeType || null, fileName);
    return sourceType === DocumentSourceType.PDF || sourceType === DocumentSourceType.IMAGE;
  }
}

// Export main function for convenience
export const parseDocument = UnifiedDocumentAdapter.parse;
export const validateDocument = UnifiedDocumentAdapter.validateFile;
export const requiresAPI = UnifiedDocumentAdapter.requiresAPI;
