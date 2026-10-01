import mammoth from "mammoth";
import { readFile } from "fs/promises";

export interface ParsedSection {
  sectionType: string;
  sectionTitle: string;
  sectionOrder: number;
  contentType: "TEXT" | "HTML" | "MARKDOWN";
  rawContent: string;
  wordCount: number;
  charCount: number;
}

/**
 * Parse DOCX file and extract structured sections
 */
export async function parseDocx(filePath: string): Promise<ParsedSection[]> {
  try {
    // Check if file exists
    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch (error) {
      throw new Error("File không tồn tại hoặc không thể đọc được");
    }

    // Check if file is not empty
    if (buffer.length === 0) {
      throw new Error("File rỗng, không có nội dung");
    }

    // Check if file is actually a DOCX (ZIP format starts with PK)
    const signature = buffer.toString('hex', 0, 2);
    if (signature !== '504b') { // PK in hex
      throw new Error("File không phải là DOCX hợp lệ. Vui lòng đảm bảo file có định dạng .docx (không phải .doc)");
    }

    // Extract text with mammoth
    let result;
    try {
      result = await mammoth.extractRawText({ buffer });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('body element')) {
        throw new Error("File DOCX bị lỗi cấu trúc. Vui lòng thử:\n1. Mở file trong Microsoft Word\n2. Save As → chọn định dạng .docx (không phải .doc)\n3. Upload lại file mới");
      }
      throw new Error(`Không thể đọc file DOCX: ${errorMessage}`);
    }

    const text = result.value;

    if (!text || text.trim().length === 0) {
      throw new Error("File DOCX không có nội dung văn bản hoặc chỉ có hình ảnh/bảng biểu");
    }

    // Split into sections by detecting headings
    const sections = detectSections(text);

    if (sections.length === 0) {
      // If no sections detected, create a single section with all content
      return [
        {
          sectionType: "OTHER",
          sectionTitle: "Nội dung giáo án",
          sectionOrder: 1,
          contentType: "TEXT",
          rawContent: text.trim(),
          wordCount: countWords(text),
          charCount: text.trim().length,
        },
      ];
    }

    // Map sections to structured data
    return sections.map((section, index) => ({
      sectionType: detectSectionType(section.title),
      sectionTitle: section.title,
      sectionOrder: index + 1,
      contentType: "TEXT" as const,
      rawContent: section.content.trim(),
      wordCount: countWords(section.content),
      charCount: section.content.trim().length,
    }));
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    throw new Error(
      `Lỗi khi phân tích file DOCX: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Detect section type based on title keywords
 */
function detectSectionType(title: string): string {
  const normalized = title.toLowerCase().trim();

  // Header patterns
  if (
    normalized.includes("thông tin chung") ||
    normalized.includes("tiêu đề") ||
    normalized.includes("header")
  ) {
    return "HEADER";
  }

  // Objectives patterns (Mục tiêu)
  if (
    normalized.includes("mục tiêu") ||
    normalized.includes("muc tieu") ||
    normalized.includes("objectives")
  ) {
    return "OBJECTIVES";
  }

  // Preparation patterns (Chuẩn bị)
  if (
    normalized.includes("chuẩn bị") ||
    normalized.includes("chuan bi") ||
    normalized.includes("preparation") ||
    normalized.includes("đồ dùng") ||
    normalized.includes("phương tiện")
  ) {
    return "PREPARATION";
  }

  // Teaching process patterns (Tiến trình dạy học)
  if (
    normalized.includes("tiến trình") ||
    normalized.includes("tien trinh") ||
    normalized.includes("dạy học") ||
    normalized.includes("day hoc") ||
    normalized.includes("hoạt động") ||
    normalized.includes("teaching process") ||
    normalized.includes("activities")
  ) {
    return "TEACHING_PROCESS";
  }

  // Evaluation patterns (Đánh giá)
  if (
    normalized.includes("đánh giá") ||
    normalized.includes("danh gia") ||
    normalized.includes("evaluation") ||
    normalized.includes("kiểm tra") ||
    normalized.includes("kiem tra")
  ) {
    return "EVALUATION";
  }

  return "OTHER";
}

/**
 * Detect sections by analyzing heading patterns in Vietnamese lesson plans
 */
function detectSections(text: string): Array<{ title: string; content: string }> {
  const lines = text.split("\n");
  const sections: Array<{ title: string; content: string }> = [];
  let currentSection: { title: string; content: string } | null = null;

  // Common Vietnamese lesson plan heading patterns:
  // I. Mục tiêu
  // II. Chuẩn bị
  // III. Tiến trình dạy học
  // IV. Đánh giá
  // Or: 1. Mục tiêu, 2. Chuẩn bị, etc.
  const headingPatterns = [
    // Roman numerals: I., II., III., IV., etc.
    /^(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+(.+)$/i,
    // Arabic numerals: 1., 2., 3., etc.
    /^(\d{1,2})\.\s+(.+)$/,
    // Uppercase section headers
    /^([A-ZÀÁẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ\s]{5,})$/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      if (currentSection) {
        currentSection.content += "\n";
      }
      continue;
    }

    // Check if line is a heading
    let isHeading = false;
    let headingTitle = "";

    for (const pattern of headingPatterns) {
      const match = line.match(pattern);
      if (match) {
        // For patterns with capture groups
        if (match[2]) {
          headingTitle = match[2].trim();
        } else {
          headingTitle = line;
        }

        // Validate heading length (should be reasonably short)
        if (headingTitle.length > 0 && headingTitle.length < 100) {
          isHeading = true;
          break;
        }
      }
    }

    if (isHeading && headingTitle) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        title: headingTitle,
        content: "",
      };
    } else if (currentSection) {
      // Add content to current section
      currentSection.content += line + "\n";
    } else {
      // Content before first heading - create a default section
      if (sections.length === 0) {
        currentSection = {
          title: "Thông tin chung",
          content: line + "\n",
        };
      }
    }
  }

  // Add last section
  if (currentSection) {
    sections.push(currentSection);
  }

  // Filter out empty sections and trim content
  return sections
    .filter((section) => section.content.trim().length > 0)
    .map((section) => ({
      ...section,
      content: section.content.trim(),
    }));
}

/**
 * Count words in Vietnamese text
 * Vietnamese words are separated by spaces
 */
function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  // Split by whitespace and filter out empty strings
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  return words.length;
}
