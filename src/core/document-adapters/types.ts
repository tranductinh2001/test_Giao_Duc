/**
 * Unified Document Model Types
 *
 * Common interface for all document types (DOCX, PDF, Image)
 */

// Supported source types
export enum DocumentSourceType {
  DOCX = "DOCX",
  DOC = "DOC",
  PDF = "PDF",
  IMAGE = "IMAGE",
}

// Document processing status
export enum DocumentStatus {
  UPLOADING = "UPLOADING",
  PARSING = "PARSING",
  OCR = "OCR",
  MAPPING = "MAPPING",
  REVIEW = "REVIEW",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

// Image metadata from PDF/OCR
export interface ImageMetadata {
  index: number;
  fileName: string;
  fileReference: string;
  caption?: string;
  altText?: string;
  ocrText?: string;
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hash?: string;
}

// Table metadata
export interface TableMetadata {
  rows: number;
  columns: number;
  headers: string[];
  mergedCells?: { row: number; col: number; rowSpan: number; colSpan: number }[];
  pageNumber?: number;
}

// Unified paragraph model
export interface UnifiedParagraph {
  id: string;
  content: string;
  order: number;
  pageNumber?: number;
  isHeading?: boolean;
  headingLevel?: number;
  tableData?: {
    rows: string[][];
    metadata: TableMetadata;
  };
  imageRef?: ImageMetadata;
}

// Unified activity model
export interface UnifiedActivity {
  id: string;
  title: string;
  code?: string;
  order: number;
  paragraphs: UnifiedParagraph[];
  pageNumbers?: number[];
}

// Unified section model
export interface UnifiedSection {
  id: string;
  title: string;
  type: string;
  order: number;
  activities: UnifiedActivity[];
  pageNumbers?: number[];
}

// Unified document root
export interface UnifiedDocument {
  id: string;
  title: string;
  sourceType: DocumentSourceType;
  sourceFile: string;
  status: DocumentStatus;

  // Content
  sections: UnifiedSection[];

  // Metadata
  metadata: {
    totalPages?: number;
    wordCount?: number;
    language?: string;
    hasTables?: boolean;
    hasImages?: boolean;
    images?: ImageMetadata[];
    parsedAt?: Date;
    confidence?: number;
  };

  // Source-specific data
  rawContent?: string;
  rawMarkdown?: string;
}

// Adapter result interface
export interface AdapterResult {
  success: boolean;
  document?: UnifiedDocument;
  error?: string;
  processingTime?: number;
  tokens?: number;
  cost?: number;
  fromCache?: boolean;
  batchInfo?: {
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
  };
  // Legacy fields for compatibility
  rawData?: any;
  fileType?: string;
}

// File validation
export interface FileValidation {
  valid: boolean;
  error?: string;
  type?: DocumentSourceType;
  size?: number;
  mimeType?: string;
}

// Workflow uses this interface - doesn't care about source
export interface DocumentInput {
  file: Buffer;
  fileName: string;
  mimeType: string;
  options?: {
    templateId?: string;
    circularId?: string;
    metadata?: Record<string, unknown>;
  };
}
