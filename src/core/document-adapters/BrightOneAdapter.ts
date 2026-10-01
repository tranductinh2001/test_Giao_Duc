/**
 * BrightOne (Beeknoee) PDF/Image Adapter
 *
 * Uses BrightOne API for PDF and Image OCR
 */

import { Buffer } from "buffer";
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

// BrightOne API configuration - support both BEEKNOEE_API_KEY and BEE_API_KEY
const BEEKNOEE_API_KEY = process.env.BEEKNOEE_API_KEY || process.env.BEE_API_KEY;
const BEEKNOEE_BASE_URL = process.env.BEEKNOEE_BASE_URL || process.env.BEE_BASE_URL || "https://platform.beeknoee.com";
const BEEKNOEE_TIMEOUT = parseInt(process.env.BEEKNOEE_TIMEOUT || "120000");

// Supported formats
const SUPPORTED_PDF = [".pdf"];
const SUPPORTED_IMAGES = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"];

export class BrightOneAdapter extends BaseAdapter implements IDocumentAdapter {
  readonly sourceType = DocumentSourceType.PDF; // Can handle both PDF and IMAGE

  readonly supportedMimeTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ];

  readonly supportedExtensions = [...SUPPORTED_PDF, ...SUPPORTED_IMAGES];

  // Default model for parsing - use google/gemini-2.5-flash which supports PDF input
  private defaultModel = "google/gemini-2.5-flash";

  async parse(file: Buffer, fileName: string, model?: string): Promise<AdapterResult> {
    const startTime = Date.now();

    try {
      // Validate first
      const validation = this.validateFile(file, fileName);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Determine if PDF or Image
      const sourceType = detectSourceType(null, fileName);
      const isPdf = sourceType === DocumentSourceType.PDF;

      // Call BrightOne API
      const selectedModel = model || this.defaultModel;
      const result = await this.callBrightOneAPI(file, fileName, isPdf, selectedModel);

      if (!result.success) {
        return result;
      }

      // Parse the result based on format
      let document: UnifiedDocument;

      if (result.markdown) {
        document = this.parseMarkdown(result.markdown, fileName, isPdf, result);
      } else if (result.text) {
        document = this.parseText(result.text, fileName, isPdf, result);
      } else {
        return { success: false, error: "Không nhận được nội dung từ API" };
      }

      return {
        success: true,
        document,
        processingTime: Date.now() - startTime,
        tokens: result.tokens,
        cost: result.cost,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      };
    }
  }

  private async callBrightOneAPI(
    file: Buffer,
    fileName: string,
    isPdf: boolean,
    model: string
  ): Promise<{
    success: boolean;
    markdown?: string;
    text?: string;
    error?: string;
    tokens?: number;
    cost?: number;
    rawData?: any;
  }> {
    if (!BEEKNOEE_API_KEY) {
      return { success: false, error: "BEEKNOEE_API_KEY chưa được cấu hình" };
    }

    const ext = fileName.toLowerCase().split(".").pop();
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      bmp: "image/bmp",
      tiff: "image/tiff",
      tif: "image/tiff",
    };

    const mimeType = mimeTypes[ext || ""] || "application/octet-stream";

    // Use the Chat Completions API for better layout preservation
    // BEE_BASE_URL already includes /api/v1, so we only add the endpoint
    const url = `${BEEKNOEE_BASE_URL}/chat/completions`;

    // Encode file as base64
    const base64Data = file.toString("base64");

    const body = {
      model: model,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Đây là trang MỤC LỤC của sách giáo khoa. TRÍCH XUẤT DANH SÁCH BÀI HỌC.

QUAN TRỌNG - PHÂN BIỆT:
✅ BÀI HỌC (LẤY): Bài 1, Bài 2, Bài 3... | Lesson 1, Lesson 2... | Unit 1, Unit 2...
✅ CHƯƠNG (LẤY): Chương 1, Chương 2... | Chapter 1, Chapter 2... | Part 1, Part 2...
✅ PHẦN (LẤY): Phần 1, Phần 2...

❌ CHỦ ĐỀ (BỎ): Chủ đề 1, Chủ đề 2... (đây là topic/topic, KHÔNG phải bài học)
❌ MỤC LỤC, Table of Contents (bỏ tiêu đề)
❌ Dòng trống, đường kẻ

Format trả vỀ (mỗi dòng 1 bài):
[LESSON:Bài 1] Thông tin và dữ liệu | 5
[LESSON:Bài 2] Biểu diễn dữ liệu | 12
[LESSON:Chương 1] Tổng quan | 3

Nếu không có số trang, vẫn trả về nhưng để trống phần số trang.`,
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
    };

    const payloadSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
    console.log(`[BrightOne] Request - File: ${fileName}, Size: ${payloadSize} bytes, IsPDF: ${isPdf}, Type: ${mimeType}`);

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
      const errorMsg = errorData.error?.message || response.statusText;
      return { success: false, error: `API Error: ${errorMsg}` };
    }

    const data = await response.json();

    // Extract content from chat response
    let content = "";
    try {
      const choices = data.choices || [];
      if (choices.length > 0) {
        content = choices[0].message?.content || "";
      }
    } catch {
      return { success: false, error: "Không thể đọc response từ API" };
    }

    // Extract token usage from API response if available
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || Math.ceil(content.length / 4);

    // Calculate cost (Gemini 2.5 Flash Lite pricing)
    const cost = (promptTokens * 0.0000003) + (completionTokens * 0.0000012);

    console.log(`[BrightOne] Response - Tokens: prompt=${promptTokens}, completion=${completionTokens}, total=${totalTokens}, Cost: $${cost.toFixed(6)}`);

    return {
      success: true,
      markdown: content,
      tokens: totalTokens,
      cost,
      rawData: data,
    };
  }

  private parseMarkdown(
    markdown: string,
    fileName: string,
    isPdf: boolean,
    apiResult: any
  ): UnifiedDocument {
    const sections: UnifiedSection[] = [];
    const images: ImageMetadata[] = [];

    // Parse markdown with markers
    const lines = markdown.split("\n");

    let currentSection: UnifiedSection | null = null;
    let currentActivity: UnifiedActivity | null = null;
    let currentTableRows: string[][] = [];
    let currentTableMeta: TableMetadata | null = null;
    let inTable = false;
    let pageNumber = 1;
    let paraOrder = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Check for page marker
      const pageMatch = line.match(/\[PAGE:(\d+)\]/);
      if (pageMatch) {
        pageNumber = parseInt(pageMatch[1], 10);
        continue;
      }

      // Check for section marker
      if (line.startsWith("[SECTION]")) {
        // Close previous
        if (currentActivity && currentSection) {
          currentSection.activities.push(currentActivity);
        }
        if (currentSection && currentSection.activities.length > 0) {
          sections.push(currentSection);
        }

        const sectionTitle = line.replace("[SECTION]", "").trim() || "Phần mới";
        currentSection = {
          id: this.generateId(),
          title: sectionTitle,
          type: "SECTION",
          order: sections.length + 1,
          activities: [],
        };
        currentActivity = null;
        continue;
      }

      // Check for heading markers
      const headingMatch = line.match(/\[HEADING:(\d+)\]\s*(.+)/);
      if (headingMatch) {
        const level = parseInt(headingMatch[1], 10);
        const headingText = headingMatch[2].trim();

        // If we have a current section, this becomes an activity
        if (currentSection && currentActivity) {
          currentSection.activities.push(currentActivity);
        }

        currentActivity = {
          id: this.generateId(),
          title: headingText,
          order: currentSection ? currentSection.activities.length + 1 : 1,
          paragraphs: [{
            id: this.generateId(),
            content: headingText,
            order: 0,
            isHeading: true,
            headingLevel: level,
            pageNumber,
          }],
        };
        continue;
      }

      // Table handling
      if (line.includes("[TABLE_START]") || line.includes("TABLE_START")) {
        inTable = true;
        currentTableRows = [];
        currentTableMeta = { rows: 0, columns: 0, headers: [] };
        continue;
      }

      if (line.includes("[TABLE_END]") || line.includes("TABLE_END")) {
        inTable = false;

        // Add table as paragraph
        if (currentTableRows.length > 0 && currentActivity) {
          currentActivity.paragraphs.push({
            id: this.generateId(),
            content: "",
            order: paraOrder++,
            pageNumber,
            tableData: {
              rows: currentTableRows,
              metadata: currentTableMeta!,
            },
          });
        }
        currentTableRows = [];
        currentTableMeta = null;
        continue;
      }

      if (inTable) {
        // Parse table row
        const rowData = line
          .replace(/\[ROW\]/g, "")
          .replace(/\|/g, "")
          .split(",")
          .map((cell: string) => cell.trim())
          .filter(Boolean);

        if (rowData.length > 0) {
          currentTableRows.push(rowData);
          if (currentTableMeta) {
            currentTableMeta.rows = currentTableRows.length;
            currentTableMeta.columns = Math.max(currentTableMeta.columns, rowData.length);
            if (currentTableMeta.rows === 1) {
              currentTableMeta.headers = rowData;
            }
          }
        }
        continue;
      }

      // Regular paragraph
      const para: UnifiedParagraph = {
        id: this.generateId(),
        content: line.replace(/^\[PARAGRAPH\]\s*/, ""),
        order: paraOrder++,
        pageNumber,
      };

      // Check if it's a list item
      if (line.startsWith("[ITEM]") || line.startsWith("[LIST]")) {
        para.content = line.replace(/^\[(?:ITEM|LIST)\]\s*/, "");
      }

      // Add to current activity or create default
      if (!currentActivity) {
        if (!currentSection) {
          currentSection = {
            id: this.generateId(),
            title: "Nội dung",
            type: "NOI_DUNG",
            order: 1,
            activities: [],
          };
        }
        currentActivity = {
          id: this.generateId(),
          title: "Nội dung",
          order: 1,
          paragraphs: [],
        };
      }

      currentActivity.paragraphs.push(para);
    }

    // Close remaining
    if (currentActivity && currentSection) {
      currentSection.activities.push(currentActivity);
    }
    if (currentSection && currentSection.activities.length > 0) {
      sections.push(currentSection);
    }

    // Default section if none found
    if (sections.length === 0) {
      sections.push({
        id: this.generateId(),
        title: "Nội dung",
        type: "NOI_DUNG",
        order: 1,
        activities: [{
          id: this.generateId(),
          title: "Nội dung",
          order: 1,
          paragraphs: [{
            id: this.generateId(),
            content: markdown.replace(/\[.*?\]/g, "").trim(),
            order: 0,
          }],
        }],
      });
    }

    return {
      id: this.generateId(),
      title: fileName.replace(/\.(pdf|png|jpg|jpeg|webp|bmp|tiff?)$/i, ""),
      sourceType: isPdf ? DocumentSourceType.PDF : DocumentSourceType.IMAGE,
      sourceFile: fileName,
      status: "COMPLETED" as any,
      sections,
      metadata: {
        totalPages: pageNumber,
        wordCount: markdown.split(/\s+/).length,
        hasTables: currentTableMeta !== null,
        hasImages: images.length > 0,
        images,
        parsedAt: new Date(),
      },
      rawMarkdown: markdown,
    };
  }

  private parseText(
    text: string,
    fileName: string,
    isPdf: boolean,
    apiResult: any
  ): UnifiedDocument {
    // If no markdown markers, parse as plain text
    return this.parseMarkdown(`[PARAGRAPH]\n${text}`, fileName, isPdf, apiResult);
  }
}

// Export singleton
export const brightOneAdapter = new BrightOneAdapter();
