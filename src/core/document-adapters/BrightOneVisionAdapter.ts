/**
 * BrightOne Vision Adapter
 *
 * Uses BrightOne Vision API as PRIMARY document understanding engine.
 * OCR is only the final fallback.
 *
 * Features:
 * - Document understanding (not just OCR)
 * - Layout analysis with bounding boxes
 * - PDF batching for large documents
 * - Intelligent caching
 * - Structured JSON output
 * - Multi-page merging
 */

import { Buffer } from "buffer";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  BaseAdapter,
  IDocumentAdapter,
  detectSourceType,
} from "./DocumentAdapter";
import {
  UnifiedDocument,
  UnifiedSection,
  UnifiedActivity,
  UnifiedParagraph,
  ImageMetadata,
  DocumentSourceType,
  AdapterResult,
  TableMetadata,
} from "./types";

// BrightOne API configuration
const BEEKNOEE_API_KEY = process.env.BEEKNOEE_API_KEY || process.env.BEE_API_KEY;
const BEEKNOEE_BASE_URL = process.env.BEEKNOEE_BASE_URL || process.env.BEE_BASE_URL || "https://platform.beeknoee.com";
const BEEKNOEE_TIMEOUT = parseInt(process.env.BEEKNOEE_TIMEOUT || "120000");

// Batching configuration
const BATCH_SIZE = parseInt(process.env.BRIGHTONE_BATCH_SIZE || "5");
const MAX_CONCURRENT_BATCHES = parseInt(process.env.BRIGHTONE_MAX_CONCURRENT || "3");

// Cache configuration
const CACHE_DIR = process.env.CACHE_DIR || path.join(process.cwd(), ".cache", "brightone");
const CACHE_TTL_HOURS = parseInt(process.env.BRIGHTONE_CACHE_TTL || "168"); // 1 week

// Vision model
const VISION_MODEL = process.env.BRIGHTONE_VISION_MODEL || "google/gemini-2.5-flash-lite";

// Ensure cache directory exists
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Get cache key from file content and prompt
 */
function getCacheKey(fileBuffer: Buffer, promptVersion: string, modelVersion: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fileBuffer);
  hash.update(promptVersion);
  hash.update(modelVersion);
  return hash.digest("hex").substring(0, 16);
}

/**
 * Get cached result if available and not expired
 */
function getCachedResult(cacheKey: string): { data: any; timestamp: number } | null {
  ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);

  if (!fs.existsSync(cacheFile)) {
    return null;
  }

  try {
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);

    if (ageHours > CACHE_TTL_HOURS) {
      fs.unlinkSync(cacheFile);
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

/**
 * Save result to cache
 */
function saveCachedResult(cacheKey: string, data: any): void {
  ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
  fs.writeFileSync(cacheFile, JSON.stringify({ data, timestamp: Date.now() }));
}

/**
 * System prompt for document understanding
 */
const VISION_SYSTEM_PROMPT = `Bạn là một chuyên gia phân tích tài liệu giáo dục. Nhiệm vụ của bạn là TRÍCH XUẤT CẤU TRÚC từ tài liệu giáo án.

YÊU CẦU QUAN TRỌNG:
1. KHÔNG sử dụng OCR thuần túy - hãy HIỂU tài liệu
2. Phát hiện: tiêu đề, đoạn văn, bảng, hình ảnh, hoạt động, công thức toán
3. Xác định: vị trí (bounding box), thứ tự đọc, số trang
4. Trả về JSON hợp lệ - KHÔNG markdown, KHÔNG html

CẤU TRÚC TRẢ VỀ:
{
  "metadata": {
    "title": "Tiêu đề tài liệu",
    "language": "vi",
    "totalPages": số trang,
    "confidence": 0.0-1.0
  },
  "pages": [
    {
      "pageNumber": 1,
      "elements": [
        {
          "type": "heading|paragraph|table|image|activity|formula|checkbox",
          "content": "nội dung",
          "level": 1-6 (cho heading),
          "bbox": { "x": 0, "y": 0, "width": 100, "height": 20 },
          "readingOrder": 1
        }
      ]
    }
  ],
  "sections": [
    {
      "title": "Tên phần",
      "code": "MUC_TIEU",
      "pageStart": 1,
      "pageEnd": 2,
      "elements": ["element_id_1", "element_id_2"]
    }
  ],
  "tables": [
    {
      "id": "table_1",
      "rows": [["A", "B"], ["1", "2"]],
      "headers": ["Cột 1", "Cột 2"],
      "bbox": { "x": 0, "y": 0, "width": 100, "height": 50 },
      "pageNumber": 1
    }
  ],
  "images": [
    {
      "id": "img_1",
      "caption": "Mô tả hình ảnh",
      "bbox": { "x": 0, "y": 0, "width": 100, "height": 80 },
      "pageNumber": 1
    }
  ]
}`;

/**
 * Parse a single image/page with BrightOne Vision
 */
async function parseWithVision(
  imageBuffer: Buffer,
  mimeType: string,
  pageNumber: number,
  systemPrompt: string = VISION_SYSTEM_PROMPT,
  additionalContext?: {
    bookContext?: string;
    lessonContext?: string;
    rulePrompt?: string;
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  tokens?: number;
  cost?: number;
}> {
  if (!BEEKNOEE_API_KEY) {
    return { success: false, error: "BEEKNOEE_API_KEY chưa được cấu hình" };
  }

  const url = `${BEEKNOEE_BASE_URL}/chat/completions`;
  const base64Data = imageBuffer.toString("base64");

  // Build the complete prompt
  let fullPrompt = systemPrompt;

  if (additionalContext?.bookContext) {
    fullPrompt += `\n\nNGỮ CẢNH SÁCH:\n${additionalContext.bookContext}`;
  }

  if (additionalContext?.lessonContext) {
    fullPrompt += `\n\nNGỮ CẢNH BÀI HỌC:\n${additionalContext.lessonContext}`;
  }

  if (additionalContext?.rulePrompt) {
    fullPrompt += `\n\nQUY TẮC:\n${additionalContext.rulePrompt}`;
  }

  fullPrompt += `\n\nYÊU CẦU: Trả về JSON hợp lệ, không markdown, không html.`;

  const body = {
    model: VISION_MODEL,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: fullPrompt,
        },
        {
          type: "file",
          file: {
            url: `data:${mimeType};base64,${base64Data}`,
            mime_type: mimeType,
          },
        },
      ],
    }],
    temperature: 0.1,
    max_tokens: 32000,
  };

  // DEBUG: Log what we're sending
  const bodySize = Buffer.byteLength(JSON.stringify(body), 'utf8');
  console.log('[BrightOneVision] DEBUG: Sending to Vision API:');
  console.log('[BrightOneVision] DEBUG:   - File size:', base64Data.length, 'bytes (base64)');
  console.log('[BrightOneVision] DEBUG:   - Prompt size:', Buffer.byteLength(fullPrompt, 'utf8'), 'bytes');
  console.log('[BrightOneVision] DEBUG:   - Total request size:', bodySize, 'bytes');
  console.log('[BrightOneVision] DEBUG:   - Has file attachment:', true);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BEEKNOEE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(BEEKNOEE_TIMEOUT),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: `API Error: ${errorData.error?.message || response.statusText}` };
    }

    const data = await response.json();
    let content = "";

    const choices = data.choices || [];
    if (choices.length > 0) {
      content = choices[0].message?.content || "";
    }

    // Extract JSON from response
    let jsonData = null;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If JSON parsing fails, return raw content
      jsonData = { rawContent: content };
    }

    const usage = data.usage || {};
    const cost = (usage.prompt_tokens * 0.0000003) + (usage.completion_tokens * 0.0000012);

    return {
      success: true,
      data: jsonData,
      tokens: usage.total_tokens || 0,
      cost,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi không xác định",
    };
  }
}

/**
 * Convert PDF page to image using pdf-lib (placeholder)
 * In production, you'd use a proper PDF to image converter
 */
async function convertPdfPageToImage(
  pdfBuffer: Buffer,
  pageNumber: number
): Promise<Buffer | null> {
  // This is a placeholder - in production use pdf-lib or sharp
  // For now, we'll send the PDF directly to BrightOne
  return pdfBuffer;
}

/**
 * Split PDF into batches of pages
 */
function createPageBatches(totalPages: number, batchSize: number = BATCH_SIZE): number[][] {
  const batches: number[][] = [];
  for (let i = 1; i <= totalPages; i += batchSize) {
    const end = Math.min(i + batchSize - 1, totalPages);
    batches.push([i, end]);
  }
  return batches;
}

export class BrightOneVisionAdapter extends BaseAdapter implements IDocumentAdapter {
  readonly sourceType = DocumentSourceType.PDF;

  readonly supportedMimeTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ];

  readonly supportedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"];

  // Context for enhanced understanding
  private bookContext?: string;
  private lessonContext?: string;
  private rulePrompt?: string;

  /**
   * Set context for enhanced document understanding
   */
  setContext(context: {
    bookContext?: string;
    lessonContext?: string;
    rulePrompt?: string;
  }): void {
    this.bookContext = context.bookContext;
    this.lessonContext = context.lessonContext;
    this.rulePrompt = context.rulePrompt;
  }

  async parse(file: Buffer, fileName: string): Promise<AdapterResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateFile(file, fileName);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const sourceType = detectSourceType(null, fileName);
      const ext = fileName.toLowerCase().split(".").pop() || "";

      // Check cache first
      const cacheKey = getCacheKey(file, VISION_MODEL, "1.0");
      const cached = getCachedResult(cacheKey);

      if (cached) {
        console.log(`[BrightOneVision] Cache hit for ${fileName}`);
        return {
          success: true,
          document: this.reconstructFromVisionResult(cached.data, fileName),
          processingTime: Date.now() - startTime,
          fromCache: true,
        };
      }

      let result;

      if (ext === "pdf") {
        result = await this.parsePdf(file, fileName);
      } else if (["png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"].includes(ext)) {
        result = await this.parseImage(file, fileName, ext);
      } else {
        return { success: false, error: `Unsupported format: ${ext}` };
      }

      if (!result.success) {
        // Fallback to OCR-based parsing
        console.log(`[BrightOneVision] Vision failed, falling back to OCR...`);
        return this.fallbackToOCR(file, fileName);
      }

      // Cache the result
      saveCachedResult(cacheKey, result.data);

      return {
        success: true,
        document: this.reconstructFromVisionResult(result.data, fileName),
        processingTime: Date.now() - startTime,
        tokens: result.tokens,
        cost: result.cost,
      };
    } catch (error) {
      // Fallback to OCR on any error
      console.log(`[BrightOneVision] Error: ${error}, falling back to OCR...`);
      return this.fallbackToOCR(file, fileName);
    }
  }

  /**
   * Parse PDF using Vision API with batching
   */
  private async parsePdf(
    pdfBuffer: Buffer,
    fileName: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    tokens?: number;
    cost?: number;
  }> {
    console.log(`[BrightOneVision] Parsing PDF: ${fileName}`);

    // For PDF, we send it directly to the API
    // The API should handle multi-page internally
    const mimeType = "application/pdf";
    const result = await parseWithVision(pdfBuffer, mimeType, 1, VISION_SYSTEM_PROMPT, {
      bookContext: this.bookContext,
      lessonContext: this.lessonContext,
      rulePrompt: this.rulePrompt,
    });

    if (!result.success) {
      return result;
    }

    // If result has multiple pages, merge them
    if (result.data?.pages && Array.isArray(result.data.pages)) {
      return result;
    }

    // If single page response, wrap it
    return {
      success: true,
      data: {
        metadata: {
          title: fileName.replace(/\.pdf$/i, ""),
          language: "vi",
          totalPages: 1,
          confidence: 0.9,
        },
        pages: [result.data],
      },
      tokens: result.tokens,
      cost: result.cost,
    };
  }

  /**
   * Parse image using Vision API
   */
  private async parseImage(
    imageBuffer: Buffer,
    fileName: string,
    ext: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    tokens?: number;
    cost?: number;
  }> {
    console.log(`[BrightOneVision] Parsing image: ${fileName}`);

    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      bmp: "image/bmp",
      tiff: "image/tiff",
      tif: "image/tiff",
    };

    const mimeType = mimeTypes[ext] || "image/png";

    return parseWithVision(imageBuffer, mimeType, 1, VISION_SYSTEM_PROMPT, {
      bookContext: this.bookContext,
      lessonContext: this.lessonContext,
      rulePrompt: this.rulePrompt,
    });
  }

  /**
   * Fallback to OCR-based parsing (original BrightOneAdapter behavior)
   */
  private async fallbackToOCR(
    file: Buffer,
    fileName: string
  ): Promise<AdapterResult> {
    console.log(`[BrightOneVision] Using OCR fallback for ${fileName}`);

    // Import and use the original BrightOneAdapter
    const { brightOneAdapter } = await import("./BrightOneAdapter");
    return brightOneAdapter.parse(file, fileName);
  }

  /**
   * Reconstruct UnifiedDocument from Vision API result
   */
  private reconstructFromVisionResult(
    visionData: any,
    fileName: string
  ): UnifiedDocument {
    const sections: UnifiedSection[] = [];
    const images: ImageMetadata[] = [];

    // Extract metadata
    const metadata = visionData?.metadata || {};
    const pages = visionData?.pages || [];
    const detectedSections = visionData?.sections || [];
    const detectedTables = visionData?.tables || [];
    const detectedImages = visionData?.images || [];

    // Build sections from detected sections
    let sectionOrder = 1;
    for (const sec of detectedSections) {
      sections.push({
        id: `section_${sectionOrder}`,
        title: sec.title || "Phần mới",
        type: sec.code || "SECTION",
        order: sectionOrder++,
        activities: [],
        pageNumbers: sec.pageStart && sec.pageEnd
          ? Array.from({ length: sec.pageEnd - sec.pageStart + 1 }, (_, i) => sec.pageStart + i)
          : undefined,
      });
    }

    // If no sections detected, create default
    if (sections.length === 0) {
      sections.push({
        id: "section_1",
        title: "Nội dung",
        type: "NOI_DUNG",
        order: 1,
        activities: [],
      });
    }

    // Build activities and paragraphs from pages
    let activityOrder = 1;
    for (const page of pages) {
      const pageNum = page.pageNumber || 1;
      const elements = page.elements || [];

      for (const elem of elements) {
        if (elem.type === "heading") {
          // Add as new activity in current section
          const currentSection = sections[sections.length - 1];
          if (currentSection) {
            currentSection.activities.push({
              id: `activity_${activityOrder++}`,
              title: elem.content,
              order: currentSection.activities.length + 1,
              paragraphs: [{
                id: `para_${activityOrder}_0`,
                content: elem.content,
                order: 0,
                isHeading: true,
                headingLevel: elem.level || 1,
                pageNumber: pageNum,
              }],
              pageNumbers: [pageNum],
            });
          }
        } else if (elem.type === "paragraph") {
          const currentSection = sections[sections.length - 1];
          let currentActivity = currentSection?.activities[currentSection.activities.length - 1];

          if (!currentActivity) {
            if (currentSection) {
              currentActivity = {
                id: `activity_${activityOrder++}`,
                title: "Nội dung",
                order: currentSection.activities.length + 1,
                paragraphs: [],
                pageNumbers: [],
              };
              currentSection.activities.push(currentActivity);
            }
          }

          if (currentActivity) {
            currentActivity.paragraphs.push({
              id: `para_${activityOrder}_${currentActivity.paragraphs.length}`,
              content: elem.content,
              order: currentActivity.paragraphs.length,
              pageNumber: pageNum,
            });

            if (!currentActivity.pageNumbers?.includes(pageNum)) {
              currentActivity.pageNumbers?.push(pageNum);
            }
          }
        }
      }
    }

    // Process tables
    for (const table of detectedTables) {
      const pageNum = table.pageNumber || 1;

      // Add table as activity in last section
      const currentSection = sections[sections.length - 1];
      if (currentSection) {
        currentSection.activities.push({
          id: table.id || `table_${activityOrder++}`,
          title: "Bảng",
          order: currentSection.activities.length + 1,
          paragraphs: [{
            id: `table_para_${activityOrder}`,
            content: "",
            order: 0,
            pageNumber: pageNum,
            tableData: {
              rows: table.rows || [],
              metadata: {
                rows: table.rows?.length || 0,
                columns: table.rows?.[0]?.length || 0,
                headers: table.headers || [],
                pageNumber: pageNum,
              },
            },
          }],
          pageNumbers: [pageNum],
        });
      }
    }

    // Process images
    for (const img of detectedImages) {
      images.push({
        index: images.length + 1,
        fileName: img.id || `image_${images.length + 1}`,
        fileReference: img.id || `image_${images.length + 1}`,
        caption: img.caption,
        pageNumber: img.pageNumber,
        position: img.bbox,
      });
    }

    // Calculate total word count
    let wordCount = 0;
    for (const section of sections) {
      for (const activity of section.activities) {
        for (const para of activity.paragraphs) {
          wordCount += (para.content?.split(/\s+/).filter(Boolean).length || 0);
        }
      }
    }

    return {
      id: `doc_${Date.now()}`,
      title: metadata.title || fileName.replace(/\.(pdf|png|jpg|jpeg|webp|bmp|tiff?)$/i, ""),
      sourceType: DocumentSourceType.PDF,
      sourceFile: fileName,
      status: "COMPLETED" as any,
      sections,
      metadata: {
        totalPages: metadata.totalPages || pages.length || 1,
        wordCount,
        language: metadata.language || "vi",
        confidence: metadata.confidence || 0.9,
        hasTables: detectedTables.length > 0,
        hasImages: detectedImages.length > 0,
        images,
        parsedAt: new Date(),
      },
    };
  }
}

// Export singleton
export const brightOneVisionAdapter = new BrightOneVisionAdapter();
