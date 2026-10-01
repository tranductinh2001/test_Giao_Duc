/**
 * DOCX Parser Module
 *
 * Phase 1: Parse DOCX file into paragraphs with metadata
 */

import mammoth from "mammoth";
import type { ParsedParagraph } from "../types";

export interface ParseDocxResult {
  paragraphs: ParsedParagraph[];
  rawText: string;
  success: boolean;
  error?: string;
}

/**
 * Parse DOCX buffer into structured paragraphs
 */
export async function parseDocx(buffer: Buffer): Promise<ParseDocxResult> {
  try {
    // Validate DOCX signature
    const signature = buffer.toString("hex", 0, 2);
    if (signature !== "504b") {
      return {
        paragraphs: [],
        rawText: "",
        success: false,
        error: "File không phải là DOCX hợp lệ",
      };
    }

    // Extract raw text
    const rawResult = await mammoth.extractRawText({ buffer });
    const rawText = rawResult.value;

    if (!rawText || rawText.trim().length === 0) {
      return {
        paragraphs: [],
        rawText: "",
        success: false,
        error: "File không có nội dung văn bản",
      };
    }

    // Extract structured content with HTML
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const html = htmlResult.value;

    // Parse paragraphs with metadata
    const paragraphs = extractParagraphs(html, rawText);

    return {
      paragraphs,
      rawText: rawText.trim(),
      success: true,
    };
  } catch (error) {
    return {
      paragraphs: [],
      rawText: "",
      success: false,
      error: error instanceof Error ? error.message : "Lỗi không xác định",
    };
  }
}

/**
 * Extract paragraphs from HTML and raw text
 */
function extractParagraphs(html: string, rawText: string): ParsedParagraph[] {
  const paragraphs: ParsedParagraph[] = [];

  // Try to parse from HTML structure first
  if (html) {
    const htmlParagraphs = parseHtmlParagraphs(html);
    if (htmlParagraphs.length > 0) {
      return htmlParagraphs;
    }
  }

  // Fallback to line-based parsing
  return parseLineBasedParagraphs(rawText);
}

/**
 * Parse paragraphs from HTML structure
 */
function parseHtmlParagraphs(html: string): ParsedParagraph[] {
  const paragraphs: ParsedParagraph[] = [];

  // Extract headings (h1-h6)
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  const headingMap = new Map<number, { text: string; level: number }>();

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = stripHtmlTags(match[2]).trim();
    if (text) {
      headingMap.set(headingMap.size, { text, level });
    }
  }

  // Extract paragraphs
  const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
  let paragraphIndex = 0;

  while ((match = pRegex.exec(html)) !== null) {
    const text = stripHtmlTags(match[1]).trim();
    if (!text) continue;

    // Determine heading level based on context
    const headingLevel = detectHeadingLevel(text, headingMap);

    // Detect style from context
    const style = detectStyle(match[1]);

    paragraphs.push({
      paragraphIndex,
      text,
      headingLevel,
      style,
      pageNumber: null, // mammoth doesn't provide page numbers
      rawStyle: extractRawStyle(match[1]),
    });

    paragraphIndex++;
  }

  return paragraphs;
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Detect heading level based on content patterns
 */
function detectHeadingLevel(
  text: string,
  headings: Map<number, { text: string; level: number }>
): number | null {
  const trimmed = text.trim();

  // Roman numeral pattern: I., II., III., etc.
  if (/^(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+/i.test(trimmed)) {
    return 1;
  }

  // Arabic numeral: 1., 2., 3., etc.
  if (/^\d{1,2}\.\s+/.test(trimmed)) {
    return 2;
  }

  // Lowercase letter: a., b., c., etc.
  if (/^[a-z]\.\s+/.test(trimmed)) {
    return 3;
  }

  // Check if matches any known heading
  for (const [, heading] of headings) {
    if (trimmed.toLowerCase().includes(heading.text.toLowerCase())) {
      return heading.level;
    }
  }

  // Short uppercase line might be a heading
  if (
    trimmed.length < 80 &&
    /^[A-ZÀÁẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ\s]+$/.test(trimmed)
  ) {
    return 2;
  }

  return null;
}

/**
 * Detect style from paragraph content
 */
function detectStyle(htmlContent: string): string | null {
  const lower = htmlContent.toLowerCase();

  // Check for bold
  if (/<strong>|<b>/i.test(htmlContent)) {
    return "bold";
  }

  // Check for italic
  if (/<em>|<i>/i.test(htmlContent)) {
    return "italic";
  }

  // Check for underline
  if (/<u>/i.test(htmlContent)) {
    return "underline";
  }

  return null;
}

/**
 * Extract raw style information
 */
function extractRawStyle(htmlContent: string): string | null {
  const styles: string[] = [];

  if (/<strong>|<b>/i.test(htmlContent)) styles.push("bold");
  if (/<em>|<i>/i.test(htmlContent)) styles.push("italic");
  if (/<u>/i.test(htmlContent)) styles.push("underline");

  return styles.length > 0 ? styles.join(", ") : null;
}

/**
 * Fallback: Parse raw text line by line
 */
function parseLineBasedParagraphs(rawText: string): ParsedParagraph[] {
  const lines = rawText.split("\n");
  const paragraphs: ParsedParagraph[] = [];
  let paragraphIndex = 0;
  let currentParagraph = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line - end current paragraph
    if (!trimmed) {
      if (currentParagraph) {
        paragraphs.push({
          paragraphIndex: paragraphIndex++,
          text: currentParagraph.trim(),
          headingLevel: detectHeadingLevelFromText(currentParagraph),
          style: null,
          pageNumber: null,
          rawStyle: null,
        });
        currentParagraph = "";
      }
      continue;
    }

    // Check if this line is a heading
    const isHeading =
      /^(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+/i.test(trimmed) || // Roman
      /^\d{1,2}\.\s+/.test(trimmed) || // Arabic
      (/^[A-ZÀÁẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ\s]{5,}$/.test(trimmed) &&
        trimmed.length < 100);

    // If it's a heading, start new paragraph
    if (isHeading) {
      if (currentParagraph) {
        paragraphs.push({
          paragraphIndex: paragraphIndex++,
          text: currentParagraph.trim(),
          headingLevel: detectHeadingLevelFromText(currentParagraph),
          style: null,
          pageNumber: null,
          rawStyle: null,
        });
      }
      paragraphs.push({
        paragraphIndex: paragraphIndex++,
        text: trimmed,
        headingLevel: detectHeadingLevelFromText(trimmed),
        style: "heading",
        pageNumber: null,
        rawStyle: "heading",
      });
      currentParagraph = "";
    } else {
      // Add to current paragraph
      currentParagraph += (currentParagraph ? " " : "") + trimmed;
    }
  }

  // Don't forget last paragraph
  if (currentParagraph) {
    paragraphs.push({
      paragraphIndex: paragraphIndex,
      text: currentParagraph.trim(),
      headingLevel: detectHeadingLevelFromText(currentParagraph),
      style: null,
      pageNumber: null,
      rawStyle: null,
    });
  }

  return paragraphs;
}

/**
 * Detect heading level from raw text
 */
function detectHeadingLevelFromText(text: string): number | null {
  const trimmed = text.trim();

  if (/^(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+/i.test(trimmed)) {
    return 1;
  }

  if (/^\d{1,2}\.\s+/.test(trimmed)) {
    return 2;
  }

  if (/^[a-z]\.\s+/.test(trimmed)) {
    return 3;
  }

  return null;
}
