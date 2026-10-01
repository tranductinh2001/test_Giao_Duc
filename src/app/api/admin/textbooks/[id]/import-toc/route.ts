/**
 * TOC Import API
 * Handles importing TOC from:
 * 1. Pages (extracts only specific pages - NO full PDF sent to AI)
 * 2. CSV/Excel
 * 3. JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPdfPath } from "@/core/textbook/storage";
import { extractPages } from "@/core/textbook/extractor";
import { brightOneAdapter } from "@/core/document-adapters/BrightOneAdapter";
import { getModelById, getDefaultModel } from "@/lib/ai-models";
import { promises as fs } from "fs";

export const dynamic = "force-dynamic";

// TOC Import Mode
type ImportMode = "PAGES" | "CSV" | "JSON";

// GET - Get import options
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id: bookId } = await params;

    const book = await prisma.textbookBook.findUnique({
      where: { id: bookId },
      select: { id: true, name: true, pageCount: true, pdfPath: true },
    });

    if (!book) {
      return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        bookId: book.id,
        bookName: book.name,
        pageCount: (book.pageCount ?? 999),
      },
    });
  } catch (error) {
    console.error("[TOC Import] GET error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

// POST - Import TOC
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id: bookId } = await params;
    const contentType = req.headers.get("content-type") || "";

    // Handle form data (file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const mode = formData.get("mode") as ImportMode;
      const file = formData.get("file") as File | null;
      const replaceExisting = formData.get("replaceExisting") === "true";

      if (mode === "CSV" || mode === "JSON") {
        if (!file) {
          return NextResponse.json({ success: false, message: "Vui lòng chọn file" }, { status: 400 });
        }

        const text = await file.text();

        if (mode === "CSV") {
          return importFromCSV(bookId, text, session.user.id, replaceExisting);
        } else {
          return importFromJSON(bookId, text, session.user.id, replaceExisting);
        }
      } else if (mode === "PAGES") {
        // Handle page range import
        const tocStartPage = parseInt(formData.get("tocStartPage") as string);
        const tocEndPage = parseInt(formData.get("tocEndPage") as string);
        const model = formData.get("model") as string | null;

        return importFromPages(bookId, tocStartPage, tocEndPage, session.user.id, model || undefined);
      }
    }

    // Handle JSON body
    const body = await req.json();
    const { mode, data, tocStartPage, tocEndPage, replaceExisting, model } = body;

    if (mode === "PAGES") {
      return importFromPages(bookId, tocStartPage, tocEndPage, session.user.id, model);
    } else if (mode === "CSV") {
      return importFromCSV(bookId, data, session.user.id, replaceExisting);
    } else if (mode === "JSON") {
      return importFromJSON(bookId, data, session.user.id, replaceExisting);
    }

    return NextResponse.json({ success: false, message: "Invalid mode" }, { status: 400 });
  } catch (error) {
    console.error("[TOC Import] POST error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

// Import TOC from specific pages (only those pages, not full PDF)
async function importFromPages(
  bookId: string,
  tocStartPage: number,
  tocEndPage: number,
  userId: string,
  model?: string
): Promise<NextResponse> {
  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
  }

  // Validate page range
  if (tocStartPage < 1 || tocEndPage > (book.pageCount ?? 999) || tocStartPage > tocEndPage) {
    return NextResponse.json({
      success: false,
      message: `Invalid page range: ${tocStartPage}-${tocEndPage} (book has ${(book.pageCount ?? 999)} pages)`,
    }, { status: 400 });
  }

  try {
    // Extract ONLY the TOC pages (not the entire book!)
    const result = await extractPages(bookId, tocStartPage, tocEndPage);

    console.log("[TOC Import] Extract result:", JSON.stringify(result));

    if (!result.success || !result.tempPath) {
      return NextResponse.json({
        success: false,
        message: result.error || "Failed to extract TOC pages",
      }, { status: 500 });
    }

    // Read the extracted PDF as buffer
    const extractedBuffer = await fs.readFile(result.tempPath);
    console.log("[TOC Import] Extracted buffer size:", extractedBuffer.length);

    if (extractedBuffer.length === 0) {
      return NextResponse.json({
        success: false,
        message: "File PDF trích xuất rỗng",
      }, { status: 500 });
    }

    // Send ONLY extracted pages to Beeknoee with selected model
    // Model IDs from ai-models.ts are already in correct format (e.g., "gemini-2.5-flash-lite" or "google/gemini-2.5-flash-lite")
    let providerModelId: string | undefined;
    if (model) {
      const modelConfig = getModelById(model);
      if (modelConfig) {
        providerModelId = modelConfig.id;
      }
    }
    const parseResult = await brightOneAdapter.parse(extractedBuffer, `toc-pages-${bookId}.pdf`, providerModelId);

    console.log("[TOC Import] Parse result success:", parseResult.success);
    if (!parseResult.success) {
      console.log("[TOC Import] Parse error:", parseResult.error);
    }

    if (!parseResult.success || !parseResult.document) {
      return NextResponse.json({
        success: false,
        message: parseResult.error || "Failed to parse TOC pages",
      }, { status: 500 });
    }

    // Parse the markdown to extract structured TOC with hierarchy
    console.log("[TOC Import] Raw markdown sample:", (parseResult.document.rawMarkdown || "").substring(0, 2000));
    const chapters = parseTocFromMarkdown(parseResult.document.rawMarkdown || "");

    if (chapters.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Không tìm thấy chương nào trong trang mục lục",
      }, { status: 400 });
    }

    // Validate the extracted nodes
    const validation = validateTocNodes(chapters, (book.pageCount ?? 999));

    // Return chapters with full metadata - Admin must review and confirm
    return NextResponse.json({
      success: true,
      message: `Tìm thấy ${chapters.length} mục. ${
        validation.warnings.length > 0
          ? `Cảnh báo: ${validation.warnings.length}. `
          : ""
      }Vui lòng xem trước và xác nhận.`,
      data: {
        pendingChapters: chapters,
        source: "AI",
        pagesExtracted: `${tocStartPage}-${tocEndPage}`,
        requiresPageInput: validation.warnings.length > 0,
        validation: {
          warnings: validation.warnings,
          errors: validation.errors,
          totalItems: chapters.length,
          itemsWithPages: chapters.filter(c => c.pageStart).length,
          itemsWithoutPages: chapters.filter(c => !c.pageStart).length,
        },
      },
    });
  } catch (error) {
    console.error("[TOC Import] Pages error:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi nhập từ trang" }, { status: 500 });
  }
}

// Import TOC from CSV
async function importFromCSV(bookId: string, csvData: string, userId: string, replaceExisting?: boolean): Promise<NextResponse> {
  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
  }

  try {
    const lines = csvData.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json({ success: false, message: "File CSV trống" }, { status: 400 });
    }

    // Parse header
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

    // Expected columns: chapter, lesson, startpage, endpage, alias, keyword, description
    const chapterIdx = headers.findIndex(h => h.includes("chapter") || h.includes("chương"));
    const lessonIdx = headers.findIndex(h => h.includes("lesson") || h.includes("bài"));
    const startIdx = headers.findIndex(h => h.includes("start") || h.includes("bắt"));
    const endIdx = headers.findIndex(h => h.includes("end") || h.includes("kết"));
    const aliasIdx = headers.findIndex(h => h.includes("alias") || h.includes("tên"));
    const keywordIdx = headers.findIndex(h => h.includes("keyword") || h.includes("từ khóa"));
    const descIdx = headers.findIndex(h => h.includes("description") || h.includes("mô tả"));

    if (startIdx === -1 || endIdx === -1) {
      return NextResponse.json({
        success: false,
        message: "CSV phải có cột startpage và endpage",
      }, { status: 400 });
    }

    const chapters: Array<{
      title: string;
      startPage: number;
      endPage: number;
      aliases: string[];
      keywords: string[];
      description?: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      if (values.length < 2) continue;

      const chapterName = chapterIdx >= 0 ? values[chapterIdx] :
                         lessonIdx >= 0 ? values[lessonIdx] : `Chương ${i}`;
      const startPage = parseInt(values[startIdx]);
      const endPage = parseInt(values[endIdx]);

      if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage > (book.pageCount ?? 999)) {
        continue; // Skip invalid rows
      }

      const aliases = aliasIdx >= 0 && values[aliasIdx] ? [values[aliasIdx]] : [];
      const keywords = keywordIdx >= 0 && values[keywordIdx] ?
                      values[keywordIdx].split(";").map(k => k.trim()) : [];
      const description = descIdx >= 0 ? values[descIdx] : undefined;

      chapters.push({
        title: chapterName,
        startPage,
        endPage,
        aliases,
        keywords,
        description,
      });
    }

    if (chapters.length === 0) {
      return NextResponse.json({ success: false, message: "Không có dữ liệu hợp lệ" }, { status: 400 });
    }

    // Save chapters
    const savedChapters = await saveChapters(bookId, chapters, "IMPORT", userId, { replaceExisting: replaceExisting || false });

    return NextResponse.json({
      success: true,
      message: `Đã nhập ${savedChapters.length} chương từ CSV`,
      data: {
        importedCount: savedChapters.length,
        chapters: savedChapters,
        source: "IMPORT",
      },
    });
  } catch (error) {
    console.error("[TOC Import] CSV error:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi đọc file CSV" }, { status: 500 });
  }
}

// Import TOC from JSON
async function importFromJSON(bookId: string, jsonData: string, userId: string, replaceExisting?: boolean): Promise<NextResponse> {
  const book = await prisma.textbookBook.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
  }

  try {
    const data = JSON.parse(jsonData);

    // Handle both array format and object format
    const chaptersData = Array.isArray(data) ? data :
                        data.chapters || data.toc || data.items || [];

    const chapters: Array<{
      title: string;
      startPage: number;
      endPage: number;
      aliases: string[];
      keywords: string[];
      description?: string;
    }> = [];

    for (const item of chaptersData) {
      const title = item.title || item.name || item.chapter || item.lesson || "Untitled";
      const startPage = item.startPage || item.start || item.pageStart || item.from;
      const endPage = item.endPage || item.end || item.pageEnd || item.to;

      if (!startPage || !endPage || isNaN(startPage) || isNaN(endPage)) {
        continue;
      }

      if (startPage < 1 || endPage > (book.pageCount ?? 999) || startPage > endPage) {
        continue; // Skip invalid
      }

      chapters.push({
        title,
        startPage,
        endPage,
        aliases: item.aliases || item.alias || [],
        keywords: item.keywords || item.keyword || [],
        description: item.description || item.desc,
      });
    }

    if (chapters.length === 0) {
      return NextResponse.json({ success: false, message: "Không có dữ liệu hợp lệ" }, { status: 400 });
    }

    // Save chapters
    const savedChapters = await saveChapters(bookId, chapters, "IMPORT", userId, { replaceExisting: replaceExisting || false });

    return NextResponse.json({
      success: true,
      message: `Đã nhập ${savedChapters.length} chương từ JSON`,
      data: {
        importedCount: savedChapters.length,
        chapters: savedChapters,
        source: "IMPORT",
      },
    });
  } catch (error) {
    console.error("[TOC Import] JSON error:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi đọc file JSON" }, { status: 500 });
  }
}

// Parse TOC from markdown text with proper hierarchy and page detection
interface TocNode {
  id: string;
  title: string;
  level: number;
  parentId: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  aliases: string[];
  keywords: string[];
  description: string;
  confidence: number;
  reason: string;
  source: string;
  order: number;
  status: string;
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Remove Vietnamese diacritics for alias matching
function removeDiacritics(text: string): string {
  const diacriticsMap: Record<string, string> = {
    'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'đ': 'd',
  };
  return text.toLowerCase().split('').map(char => diacriticsMap[char] || char).join('');
}

// Generate aliases from title
function generateAliases(title: string): string[] {
  const aliases: string[] = [];
  const normalized = removeDiacritics(title);
  aliases.push(normalized);

  const words = normalized.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 1) {
    aliases.push(words.slice(0, 2).join(' '));
  }

  return [...new Set(aliases)];
}

// Detect level from title patterns
function detectLevel(title: string): number {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.match(/^(phần|part)\s+\d+/i)) return 1; // Part
  if (lowerTitle.match(/^(chương|chapter)\s+\d+/i)) return 2; // Chapter
  if (lowerTitle.match(/^(unit|đơn vị)\s+\d+/i)) return 2; // Unit
  if (lowerTitle.match(/^(bài|lesson)\s+\d+/i)) return 3; // Lesson
  if (lowerTitle.match(/^(hoạt động|activity)\s+\d+/i)) return 4; // Activity
  if (lowerTitle.match(/^(bài tập|exercise|luyện tập)\s*\d*/i)) return 5; // Exercise
  if (lowerTitle.match(/^(phụ lục|appendix)\s*\d*/i)) return 1; // Appendix
  if (lowerTitle.match(/^(tài liệu tham khảo|tài liệu reference)\s*/i)) return 1; // Reference

  return 3; // Default to Lesson level
}

// Detect page numbers in TOC line
function detectPageNumber(line: string): { start: number | null; end: number | null } {
  // Pattern 1: "Title ...... 15" or "Title .... 15-20"
  const rangePattern = /\.{2,}\s*(\d+)-(\d+)\s*$/;
  const singlePattern = /\.{2,}\s*(\d+)\s*$/;

  // Pattern 2: Vietnamese format "Title | 5" or "Title | 15-20" (most common!)
  const pipeRangePattern = /\|\s*(\d+)-(\d+)\s*$/;
  const pipeSinglePattern = /\|\s*(\d+)\s*$/;

  // Pattern 3: Just a number at the end with optional spaces
  const trailingNumberPattern = /(\d+)\s*$/;

  // Pattern 4: Title 5 (number at end after space)
  const spaceNumberPattern = /\s+(\d+)\s*$/;

  // Try pipe format first (most common in Vietnamese TOCs)
  let match = line.match(pipeRangePattern);
  if (match) {
    console.log("[PageDetect] Matched pipeRange:", match[1], "-", match[2]);
    return { start: parseInt(match[1]), end: parseInt(match[2]) };
  }

  match = line.match(pipeSinglePattern);
  if (match) {
    console.log("[PageDetect] Matched pipeSingle:", match[1]);
    return { start: parseInt(match[1]), end: parseInt(match[1]) };
  }

  // Try trailing number pattern (e.g., "Bài 1. Thông tin | 5" → "5")
  match = line.match(spaceNumberPattern);
  if (match) {
    const num = parseInt(match[1]);
    // Only accept if it looks like a page number (1-999)
    if (num > 0 && num < 1000) {
      console.log("[PageDetect] Matched spaceNumber:", match[1]);
      return { start: num, end: num };
    }
  }

  // Try just trailing number
  match = line.match(trailingNumberPattern);
  if (match) {
    const num = parseInt(match[1]);
    if (num > 0 && num < 1000) {
      console.log("[PageDetect] Matched trailingNumber:", match[1]);
      return { start: num, end: num };
    }
  }

  // Try dot pattern
  match = line.match(rangePattern);
  if (match) {
    console.log("[PageDetect] Matched range:", match[1], "-", match[2]);
    return { start: parseInt(match[1]), end: parseInt(match[2]) };
  }

  match = line.match(singlePattern);
  if (match) {
    console.log("[PageDetect] Matched single:", match[1]);
    return { start: parseInt(match[1]), end: parseInt(match[1]) };
  }

  console.log("[PageDetect] No match for:", line.substring(0, 50));
  return { start: null, end: null };
}

// Parse TOC from markdown - returns structured hierarchy
function parseTocFromMarkdown(markdown: string): TocNode[] {
  const nodes: TocNode[] = [];
  const lines = markdown.split("\n").filter(l => l.trim().length > 0);

  const currentParentStack: { level: number; id: string }[] = [];
  let order = 0;

  console.log("[TOC Parse] Processing", lines.length, "lines");

  for (const line of lines) {
    // Skip empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;

    // Skip lines that are ONLY markers (not actual content)
    const onlyMarkerPattern = /^\[(?:PAGE|PARAGRAPH|TABLE_START|TABLE_END|LIST|ITEM|SECTION)\](?:\s+\d+)?$/i;
    if (onlyMarkerPattern.test(trimmed)) {
      continue;
    }

    // Skip markdown headers (except TOC header we want to skip)
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("```")) continue;

    // Skip "MỤC LỤC" or "Table of Contents" header
    const lowerTrimmed = trimmed.toLowerCase();
    if (lowerTrimmed.includes("mục lục") || lowerTrimmed.includes("table of contents")) {
      continue;
    }

    // Extract actual content by removing markers
    let title = trimmed;

    // Handle [LESSON:Bài N] format
    const lessonMatch = title.match(/\[LESSON:([^\]]+)\]\s*(.+)/i);
    if (lessonMatch) {
      const lessonPrefix = lessonMatch[1]; // e.g., "Bài 1" or "Chương 1"
      title = lessonMatch[2].trim();

      // Prepend the lesson number to title
      title = `${lessonPrefix} ${title}`;
    }

    // Remove other markers
    title = title.replace(/\[PAGE:\d+\]\s*/gi, "");
    title = title.replace(/^\[PARAGRAPH\]\s*/gi, "");
    title = title.replace(/^\[ROW\]\s*/gi, "");
    title = title.replace(/^\[HEADING:\d+\]\s*/gi, "");
    title = title.replace(/^\[SECTION\]\s*/gi, "");
    title = title.replace(/^\[LIST\]\s*/gi, "");
    title = title.replace(/^\[ITEM\]\s*/gi, "");

    // Remove markdown formatting
    title = title
      .replace(/^[-*\d.]\s*/, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/#{1,6}\s*/, "")
      .trim();

    // Skip if title is too short after cleaning
    if (title.length < 2) continue;

    // Skip lines that look like topic headers (Chủ đề) - these are NOT lessons
    if (lowerTrimmed.match(/^chủ\s+đề/)) {
      continue;
    }

    // Skip lines that are just "Trang" or page indicator at end
    if (title.toLowerCase().includes("trang") && !/\d/.test(title)) {
      continue;
    }

    // Skip lines that are just page numbers
    if (/^\d+$/.test(title)) continue;

    // Detect and remove page numbers from title
    const pageInfo = detectPageNumber(title);
    title = title.replace(/\.{2,}\s*[\d\-ivxA-Z.]+\s*$/i, "").trim();
    title = title.replace(/\|\s*[\d\-]+\s*$/i, "").trim();

    // Skip if title is empty after removing page numbers
    if (title.length < 2) continue;

    const level = detectLevel(title);
    order++;

    // Find parent in stack
    let parentId: string | null = null;
    while (currentParentStack.length > 0 && currentParentStack[currentParentStack.length - 1].level >= level) {
      currentParentStack.pop();
    }
    if (currentParentStack.length > 0) {
      parentId = currentParentStack[currentParentStack.length - 1].id;
    }

    const nodeId = generateId();
    const node: TocNode = {
      id: nodeId,
      title,
      level,
      parentId,
      pageStart: pageInfo.start,
      pageEnd: pageInfo.end,
      aliases: generateAliases(title),
      keywords: [],
      description: "",
      confidence: pageInfo.start ? 0.9 : 0.5,
      reason: pageInfo.start ? "Page number detected in TOC" : "No page number found - requires admin review",
      source: "AI",
      order,
      status: pageInfo.start ? "OK" : "MissingPage",
    };

    console.log("[TOC Parse] Parsed node:", { title: node.title, level: node.level, pageStart: node.pageStart });
    nodes.push(node);

    // Push to stack if this is a container
    if (level < 5) {
      currentParentStack.push({ level, id: nodeId });
    }
  }

  // Post-process: Calculate pageEnd based on next item's pageStart
  // If pageStart = 6 and next item pageStart = 9, then pageEnd = 8
  for (let i = 0; i < nodes.length - 1; i++) {
    const current = nodes[i];
    const next = nodes[i + 1];

    // If current has pageStart and next has pageStart, recalculate pageEnd
    if (current.pageStart && next.pageStart) {
      const calculatedEnd = next.pageStart - 1;
      // Only update if it's different (better estimate)
      if (!current.pageEnd || calculatedEnd > current.pageStart) {
        current.pageEnd = calculatedEnd;
        current.reason = `Calculated pageEnd: ${current.pageEnd} (next item starts at page ${next.pageStart})`;
        current.confidence = 0.8;
        current.status = "OK";
        console.log("[TOC Parse] Calculated pageEnd:", { title: current.title, pageStart: current.pageStart, pageEnd: current.pageEnd });
      }
    }
  }

  // Last item: set pageEnd = pageStart + estimated length (default 3 pages) if not set
  if (nodes.length > 0) {
    const lastNode = nodes[nodes.length - 1];
    if (lastNode.pageStart && !lastNode.pageEnd) {
      lastNode.pageEnd = lastNode.pageStart + 3; // Estimate 3 pages per lesson
      lastNode.reason = `Estimated pageEnd: ${lastNode.pageEnd} (last item, estimated)`;
      lastNode.confidence = 0.6;
      lastNode.status = "Estimated";
      console.log("[TOC Parse] Estimated pageEnd for last item:", { title: lastNode.title, pageStart: lastNode.pageStart, pageEnd: lastNode.pageEnd });
    }
  }

  console.log("[TOC Parse] Total nodes parsed:", nodes.length);
  return nodes;
}

// Validate TOC nodes
function validateTocNodes(nodes: TocNode[], totalPages: number): {
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  const titles = nodes.map(n => n.title.toLowerCase().trim());
  const duplicates = titles.filter((t, i) => titles.indexOf(t) !== i);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate titles found: ${[...new Set(duplicates)].join(", ")}`);
  }

  // Check for missing pages
  const missingPages = nodes.filter(n => !n.pageStart);
  if (missingPages.length > 0) {
    warnings.push(`${missingPages.length} items without page numbers - admin must provide`);
  }

  // Check for invalid page ranges
  for (const node of nodes) {
    if (node.pageStart && node.pageStart < 1) {
      errors.push(`"${node.title}": Invalid start page ${node.pageStart}`);
    }
    if (node.pageEnd && node.pageEnd > totalPages) {
      errors.push(`"${node.title}": Page ${node.pageEnd} exceeds book pages (${totalPages})`);
    }
    if (node.pageStart && node.pageEnd && node.pageStart > node.pageEnd) {
      errors.push(`"${node.title}": Start page > End page`);
    }
  }

  return { warnings, errors };
}

// Save chapters to database - with transaction safety
async function saveChapters(
  bookId: string,
  chapters: Array<{
    title: string;
    startPage: number;
    endPage: number;
    aliases: string[];
    keywords: string[];
    description?: string;
  }>,
  source: "OCR" | "IMPORT" | "MANUAL",
  userId: string,
  options: { replaceExisting?: boolean } = {}
): Promise<Array<any>> {
  const { replaceExisting = false } = options;

  // Check for existing APPROVED chapters - NEVER delete without confirmation
  const existingApprovedChapters = await prisma.textbookChapter.count({
    where: { bookId, status: "APPROVED", isActive: true },
  });

  if (existingApprovedChapters > 0 && !replaceExisting) {
    throw new Error(
      ` Sách hiện có ${existingApprovedChapters} chương đã được phê duyệt. Vui lòng xác nhận để thay thế.`
    );
  }

  // Use transaction for atomicity
  return await prisma.$transaction(async (tx) => {
    // Delete existing chapters only if confirmed
    if (replaceExisting) {
      await tx.textbookChapter.deleteMany({
        where: { bookId },
      });
    }

    const savedChapters = [];

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];

      const saved = await tx.textbookChapter.create({
        data: {
          bookId,
          code: `CH_${Date.now()}_${i}`,
          name: chapter.title,
          chapterNumber: i + 1,
          title: chapter.title,
          aliases: chapter.aliases,
          keywords: chapter.keywords,
          description: chapter.description,
          startPage: chapter.startPage,
          endPage: chapter.endPage,
          level: 1,
          source: source as any,
          confidence: 0.8,
          status: "PENDING", // Requires approval
          isApproved: false,
        },
      });

      savedChapters.push(saved);
    }

    // Update book status
    await tx.textbookBook.update({
      where: { id: bookId },
      data: {
        tocStatus: "COMPLETED",
        tocSource: source as any,
        isApproved: false,
      },
    });

    return savedChapters;
  });
}
