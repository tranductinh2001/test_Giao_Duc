import mammoth from "mammoth";

// Re-export SectionType values for use in other modules
export const SECTION_TYPES = {
  HEADER: "HEADER",
  OBJECTIVES: "OBJECTIVES",
  PREPARATION: "PREPARATION",
  TEACHING_EQUIPMENT: "TEACHING_EQUIPMENT",
  LEARNING_MATERIALS: "LEARNING_MATERIALS",
  WARM_UP: "WARM_UP",
  KNOWLEDGE_FORMATION: "KNOWLEDGE_FORMATION",
  PRACTICE: "PRACTICE",
  APPLICATION: "APPLICATION",
  EVALUATION: "EVALUATION",
  HOMEWORK: "HOMEWORK",
  TEACHING_PROCESS: "TEACHING_PROCESS",
  APPENDIX: "APPENDIX",
  OTHER: "OTHER",
} as const;

export const SECTION_TYPE_LABELS: Record<string, string> = {
  HEADER: "Thông tin chung",
  OBJECTIVES: "Mục tiêu",
  PREPARATION: "Chuẩn bị",
  TEACHING_EQUIPMENT: "Thiết bị dạy học",
  LEARNING_MATERIALS: "Học liệu",
  WARM_UP: "Khởi động",
  KNOWLEDGE_FORMATION: "Hình thành kiến thức",
  PRACTICE: "Luyện tập",
  APPLICATION: "Vận dụng",
  EVALUATION: "Đánh giá",
  HOMEWORK: "Dặn dò",
  TEACHING_PROCESS: "Tiến trình dạy học",
  APPENDIX: "Phụ lục",
  OTHER: "Khác",
};

export interface DocxElement {
  type: "heading" | "paragraph" | "list-item" | "table";
  level?: number;
  text: string;
  bold?: boolean;
}

export interface DetectedSection {
  sectionType: string;
  sectionTitle: string;
  content: string;
  confidence: number;
  detectionMethod: "heading" | "keyword" | "numbering" | "table" | "semantic" | "fallback";
  reasoning?: string;
  sectionOrder: number;
}

export interface DetectionResult {
  sections: DetectedSection[];
  method: "heuristic" | "semantic" | "hybrid";
  overallConfidence: number;
}

interface SectionPattern {
  type: string;
  keywords: string[];
  priority: number;
  contentClues: string[];
}

const SECTION_PATTERNS: SectionPattern[] = [
  {
    type: "OBJECTIVES",
    keywords: [
      "mục tiêu", "muc tieu", "yêu cầu cần đạt", "yeu cau can dat",
      "mục tiêu bài học", "muc tieu bai hoc", "năng lực cần hình thành",
      "nang luc can hinh thanh", "kiến thức", "kien thuc", "kỹ năng",
      "ky nang", "thái độ", "thai do", "phẩm chất", "pham chat",
      "học sinh cần đạt", "hoc sinh can dat",
    ],
    priority: 0.9,
    contentClues: [
      "kiến thức", "kỹ năng", "thái độ", "phẩm chất", "năng lực",
      "hiểu được", "nắm được", "biết được", "làm được", "thực hiện được",
      "phát triển", "hình thành",
    ],
  },
  {
    type: "PREPARATION",
    keywords: [
      "chuẩn bị", "chuan bi", "chuẩn bị của giáo viên", "chuẩn bị của học sinh",
      "phương tiện", "phuong tien", "đồ dùng dạy học", "do dung day hoc",
      "tài liệu", "tai lieu", "học liệu", "hoc lieu", "thiết bị",
      "sách giáo khoa", "sach giao khoa",
    ],
    priority: 0.85,
    contentClues: [
      "giáo viên chuẩn bị", "học sinh chuẩn bị", "đồ dùng", "thiết bị dạy học",
      "tài liệu tham khảo", "phương tiện dạy học",
    ],
  },
  {
    type: "TEACHING_EQUIPMENT",
    keywords: [
      "thiết bị dạy học", "thiet bi day hoc", "đồ dùng dạy học",
      "do dung day hoc", "phương tiện", "phuong tien", "cơ sở vật chất",
      "co so vat chat",
    ],
    priority: 0.8,
    contentClues: [
      "máy tính", "máy chiếu", "bảng", "tivi", "loa", "tranh ảnh", "video",
      "mô hình", "dụng cụ", "phần mềm",
    ],
  },
  {
    type: "LEARNING_MATERIALS",
    keywords: [
      "học liệu", "hoc lieu", "tài liệu học tập", "tai lieu hoc tap",
      "sách giáo khoa", "sach giao khoa", "phiếu học tập", "phieu hoc tap",
    ],
    priority: 0.8,
    contentClues: [
      "sgk", "sách giáo khoa", "vở bài tập", "tài liệu", "phiếu",
    ],
  },
  {
    type: "WARM_UP",
    keywords: [
      "khởi động", "khoi dong", "mở đầu", "mo dau", "ổn định lớp",
      "on dinh lop", "kiểm tra bài cũ", "kiem tra bai cu", "vào bài",
      "vao bai", "giới thiệu bài", "gioi thieu bai", "tình huống",
      "tinh huong", "trò chơi", "tro choi",
    ],
    priority: 0.85,
    contentClues: [
      "giáo viên giới thiệu", "học sinh lắng nghe", "đặt vấn đề",
      "tạo hứng thú", "dẫn dắt", "trò chơi khởi động",
      "ổn định tổ chức", "kiểm tra sĩ số",
    ],
  },
  {
    type: "KNOWLEDGE_FORMATION",
    keywords: [
      "hình thành kiến thức", "hinh thanh kien thuc", "kiến thức mới",
      "kien thuc moi", "tìm hiểu", "tim hieu", "khám phá", "kham pha",
      "nội dung bài học", "noi dung bai hoc", "bài học", "bai hoc",
      "hoạt động 1", "hoạt động 2", "hoạt động 3",
      "hđ 1", "hđ 2", "hđ 3",
    ],
    priority: 0.8,
    contentClues: [
      "giáo viên hướng dẫn", "học sinh quan sát", "học sinh thảo luận",
      "học sinh phát hiện", "học sinh rút ra", "kết luận",
      "nhận xét", "giải thích", "phân tích",
    ],
  },
  {
    type: "PRACTICE",
    keywords: [
      "luyện tập", "luyen tap", "thực hành", "thuc hanh", "bài tập",
      "bai tap", "củng cố", "cung co", "hoạt động thực hành",
      "hoat dong thuc hanh",
    ],
    priority: 0.85,
    contentClues: [
      "học sinh làm bài", "học sinh thực hành", "làm bài tập",
      "thực hiện yêu cầu", "viết", "tính", "giải", "vẽ",
    ],
  },
  {
    type: "APPLICATION",
    keywords: [
      "vận dụng", "van dung", "vận dụng kiến thức", "van dung kien thuc",
      "liên hệ thực tế", "lien he thuc te", "mở rộng", "mo rong",
      "tình huống thực tế", "tinh huong thuc te",
    ],
    priority: 0.85,
    contentClues: [
      "áp dụng", "liên hệ", "thực tế", "cuộc sống", "thực tiễn",
      "vận dụng những điều đã học",
    ],
  },
  {
    type: "EVALUATION",
    keywords: [
      "đánh giá", "danh gia", "kiểm tra", "kiem tra", "nhận xét",
      "nhan xet", "câu hỏi đánh giá", "cau hoi danh gia",
      "bài kiểm tra", "bai kiem tra",
    ],
    priority: 0.85,
    contentClues: [
      "đánh giá kết quả", "tiêu chí đánh giá", "chấm điểm",
      "nhận xét của giáo viên", "tự đánh giá", "đánh giá đồng đẳng",
    ],
  },
  {
    type: "HOMEWORK",
    keywords: [
      "dặn dò", "dan do", "bài tập về nhà", "bai tap ve nha",
      "chuẩn bị bài sau", "chuan bi bai sau", "hướng dẫn về nhà",
      "huong dan ve nha",
    ],
    priority: 0.85,
    contentClues: [
      "về nhà học bài", "làm bài tập", "chuẩn bị bài mới", "xem trước",
    ],
  },
  {
    type: "TEACHING_PROCESS",
    keywords: [
      "tiến trình dạy học", "tien trinh day hoc", "hoạt động dạy học",
      "hoat dong day hoc", "các hoạt động", "cac hoat dong",
      "nội dung dạy học", "noi dung day hoc",
    ],
    priority: 0.75,
    contentClues: [
      "giáo viên", "học sinh", "hoạt động", "thời gian", "nội dung",
    ],
  },
  {
    type: "APPENDIX",
    keywords: [
      "phụ lục", "phu luc", "bảng phụ", "bang phu", "biểu mẫu",
      "bieu mau", "tài liệu tham khảo", "tai lieu tham khao",
    ],
    priority: 0.7,
    contentClues: [],
  },
];

/**
 * Parse DOCX file into structured elements using mammoth
 */
export async function parseDocxStructure(buffer: Buffer): Promise<{
  elements: DocxElement[];
  rawText: string;
}> {
  // Try to convert to HTML first for structure preservation
  let html = "";
  try {
    const htmlResult = await mammoth.convertToHtml({ buffer });
    html = htmlResult.value;
  } catch {
    // Fallback to raw text if HTML conversion fails
  }

  // Also get raw text
  let rawText = "";
  try {
    const rawResult = await mammoth.extractRawText({ buffer });
    rawText = rawResult.value;
  } catch {
    rawText = "";
  }

  // Parse HTML to elements if available
  const elements: DocxElement[] = [];
  if (html) {
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
    const liRegex = /<li[^>]*>(.*?)<\/li>/gi;

    let match: RegExpExecArray | null;

    // Extract headings
    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const text = match[2].replace(/<[^>]*>/g, "").trim();
      if (text) {
        elements.push({ type: "heading", level, text, bold: level <= 3 });
      }
    }

    // Extract paragraphs
    while ((match = pRegex.exec(html)) !== null) {
      const inner = match[1].trim();
      if (!inner) continue;
      const text = inner.replace(/<[^>]*>/g, "").trim();
      if (!text) continue;

      // Check if it's a heading-like line (bold or short emphasized text)
      const hasStrong = /<strong>|<b>/i.test(inner);
      if (hasStrong && text.length < 120) {
        elements.push({ type: "heading", level: 3, text, bold: true });
      } else {
        elements.push({ type: "paragraph", text });
      }
    }

    // Extract list items
    while ((match = liRegex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, "").trim();
      if (text) {
        elements.push({ type: "list-item", text });
      }
    }
  }

  // If HTML parsing produced no elements, fall back to raw text line parsing
  if (elements.length === 0 && rawText) {
    const lines = rawText.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try to detect heading by line characteristics
      const isHeading =
        /^(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+/i.test(trimmed) || // Roman numerals
        /^\d{1,2}\.\s+/.test(trimmed) || // Arabic numerals
        /^[A-ZÀÁẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ\s]{5,}$/.test(
          trimmed
        ); // All caps line

      if (isHeading && trimmed.length < 100) {
        elements.push({ type: "heading", level: 2, text: trimmed, bold: true });
      } else {
        elements.push({ type: "paragraph", text: trimmed });
      }
    }
  }

  return { elements, rawText };
}

/**
 * Extract heading-like lines from raw text using numbering patterns
 */
function extractNumberedHeadings(lines: string[]): Array<{ text: string; numbering: string; level: number }> {
  const headings: Array<{ text: string; numbering: string; level: number }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 150) continue;

    // Roman numeral patterns: I., II., III., IV., V., VI., VII., VIII., IX., X.
    const romanMatch = trimmed.match(/^(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+(.+)$/i);
    if (romanMatch) {
      headings.push({ text: romanMatch[2].trim(), numbering: romanMatch[1], level: 1 });
      continue;
    }

    // Arabic numeral patterns: 1., 2., 3.
    const arabicMatch = trimmed.match(/^(\d{1,2})\.\s+(.+)$/);
    if (arabicMatch) {
      headings.push({ text: arabicMatch[2].trim(), numbering: arabicMatch[1], level: 2 });
      continue;
    }

    // Lowercase letter patterns: a., b., c.
    const letterMatch = trimmed.match(/^([a-z])\.\s+(.+)$/);
    if (letterMatch) {
      headings.push({ text: letterMatch[2].trim(), numbering: letterMatch[1], level: 3 });
      continue;
    }
  }

  return headings;
}

/**
 * Detect section type from title and content using keyword matching
 */
function detectSectionTypeHeuristic(
  title: string,
  content: string
): { sectionType: string; confidence: number; method: "keyword" | "numbering" | "fallback"; reasoning: string } {
  const normalizedTitle = title.toLowerCase().trim();
  const normalizedContent = content.toLowerCase().trim();
  const combined = normalizedTitle + " " + normalizedContent;

  let bestMatch: { sectionType: string; confidence: number; method: "keyword" | "numbering" | "fallback"; reasoning: string } = {
    sectionType: "OTHER",
    confidence: 0,
    method: "fallback",
    reasoning: "Không khớp mẫu nào",
  };

  for (const pattern of SECTION_PATTERNS) {
    // Check title keywords
    const titleMatch = pattern.keywords.some((kw) => normalizedTitle.includes(kw));

    // Check content clues
    const contentMatch = pattern.contentClues.some((clue) => normalizedContent.includes(clue));

    // Also check full combined text for keyword presence
    const keywordMatch = pattern.keywords.some((kw) => combined.includes(kw));

    if (titleMatch) {
      // Title match is very strong evidence
      const confidence = Math.min(pattern.priority + 0.1, 1.0);
      if (confidence > bestMatch.confidence) {
        const matchedKeyword = pattern.keywords.find((kw) => normalizedTitle.includes(kw)) || "";
        bestMatch = {
          sectionType: pattern.type,
          confidence,
          method: "keyword",
          reasoning: `Tiêu đề chứa từ khóa "${matchedKeyword}"`,
        };
      }
    } else if (keywordMatch && contentMatch) {
      // Both keyword in text and content clues
      if (pattern.priority > bestMatch.confidence) {
        bestMatch = {
          sectionType: pattern.type,
          confidence: pattern.priority,
          method: "keyword",
          reasoning: `Nội dung khớp với mẫu ${pattern.type}`,
        };
      }
    } else if (keywordMatch && pattern.priority > 0.8) {
      // Strong keyword match even without content clues
      const adjustedConf = pattern.priority - 0.15;
      if (adjustedConf > bestMatch.confidence) {
        const matchedKeyword = pattern.keywords.find((kw) => combined.includes(kw)) || "";
        bestMatch = {
          sectionType: pattern.type,
          confidence: adjustedConf,
          method: "keyword",
          reasoning: `Văn bản chứa từ khóa "${matchedKeyword}"`,
        };
      }
    }
  }

  // Special handling: if the title mentions specific active learning methods
  const activityMatch = normalizedTitle.match(/(hoạt động|thảo luận|nhóm|cặp|cá nhân|trò chơi)/);
  if (activityMatch && bestMatch.sectionType === "OTHER") {
    bestMatch = {
      sectionType: "KNOWLEDGE_FORMATION",
      confidence: 0.5,
      method: "keyword",
      reasoning: `Tiêu đề đề cập đến hoạt động: "${activityMatch[0]}"`,
    };
  }

  return bestMatch;
}

/**
 * Detect sections from parsed elements using heuristics
 */
export function detectSectionsHeuristic(elements: DocxElement[], rawText: string): DetectedSection[] {
  const sections: DetectedSection[] = [];
  let currentSection: { title: string; content: string; confidence: number; method: "keyword" | "heading" | "fallback"; headingLevel?: number } | null = null;

  if (elements.length === 0) {
    return [];
  }

  for (const element of elements) {
    const isHeading = element.type === "heading" ||
      (element.bold && element.text.length < 100) ||
      (element.type === "list-item" && /^\d{1,2}\./.test(element.text) && element.text.length < 100);

    if (isHeading && element.text.length < 100) {
      // Save previous section
      if (currentSection) {
        const detection = detectSectionTypeHeuristic(currentSection.title, currentSection.content);
        const finalConfidence = Math.max(detection.confidence, currentSection.confidence / 2);
        sections.push({
          sectionType: detection.sectionType,
          sectionTitle: currentSection.title,
          content: currentSection.content.trim(),
          confidence: finalConfidence,
          detectionMethod: detection.method,
          reasoning: detection.reasoning,
          sectionOrder: sections.length + 1,
        });
      }

      currentSection = {
        title: element.text,
        content: "",
        confidence: element.level ? 0.8 : 0.5,
        method: element.level ? "heading" : "keyword",
        headingLevel: element.level || 2,
      };
    } else if (currentSection) {
      // Skip title-like lines that appear within section content
      if (currentSection.content === "" && element.text.trim() === currentSection.title) {
        continue;
      }
      currentSection.content += element.text + "\n";
    } else {
      // Content before first heading
      currentSection = {
        title: "Thông tin chung",
        content: element.text + "\n",
        confidence: 0.3,
        method: "fallback",
      };
    }
  }

  // Add last section
  if (currentSection && currentSection.content.trim()) {
    const detection = detectSectionTypeHeuristic(currentSection.title, currentSection.content);
    const finalConfidence = Math.max(detection.confidence, currentSection.confidence / 2);
    sections.push({
      sectionType: detection.sectionType,
      sectionTitle: currentSection.title,
      content: currentSection.content.trim(),
      confidence: finalConfidence,
      detectionMethod: detection.method,
      reasoning: detection.reasoning,
      sectionOrder: sections.length + 1,
    });
  }

  // If no sections were detected via elements, try raw text analysis
  if (sections.length <= 1 && sections[0]?.sectionType === "OTHER") {
    const lines = rawText.split("\n");
    const numberedHeadings = extractNumberedHeadings(lines);

    if (numberedHeadings.length > 1) {
      return detectSectionsFromNumbering(lines, numberedHeadings);
    }
  }

  return sections;
}

/**
 * Detect sections from numbered headings when element-based parsing is insufficient
 */
function detectSectionsFromNumbering(
  lines: string[],
  headings: Array<{ text: string; numbering: string; level: number }>
): DetectedSection[] {
  const sections: DetectedSection[] = [];

  // Try to split text by heading lines
  const text = lines.join("\n");

  for (let i = 0; i < headings.length; i++) {
    const currentHeading = headings[i];
    const nextHeading = headings[i + 1];
    const currentLine = `${currentHeading.numbering}. ${currentHeading.text}`;

    const startIdx = text.indexOf(currentLine);
    if (startIdx === -1) continue;

    let endIdx = text.length;
    if (nextHeading) {
      const nextLine = `${nextHeading.numbering}. ${nextHeading.text}`;
      const nextIdx = text.indexOf(nextLine, startIdx + currentLine.length);
      if (nextIdx !== -1) {
        endIdx = nextIdx;
      }
    }

    const content = text.substring(startIdx + currentLine.length, endIdx).trim();
    const detection = detectSectionTypeHeuristic(currentHeading.text, content);

    sections.push({
      sectionType: detection.sectionType,
      sectionTitle: currentHeading.text,
      content,
      confidence: Math.max(detection.confidence, 0.6),
      detectionMethod: "numbering",
      reasoning: detection.reasoning,
      sectionOrder: sections.length + 1,
    });
  }

  return sections;
}

/**
 * Use Beeknoee AI to semantically detect and classify sections
 */
export async function detectSectionsSemantic(
  rawText: string,
  candidates: DetectedSection[]
): Promise<DetectedSection[]> {
  const BEE_API_KEY = process.env.BEE_API_KEY || "";
  const BEE_BASE_URL = process.env.BEE_BASE_URL || "https://platform.beeknoee.com/api/v1";
  const modelName = process.env.AI_MODEL || "gemini-3.1-flash-lite";

  if (!BEE_API_KEY) {
    console.warn("BEE_API_KEY not configured, skipping semantic detection");
    return candidates;
  }

  const validTypes = Object.keys(SECTION_TYPE_LABELS).join(", ");

  const prompt = `
BẠN LÀ CHUYÊN GIA PHÂN TÍCH CẤU TRÚC GIÁO ÁN VIỆT NAM.

NHIỆM VỤ: Phân tích và phân loại các phần của giáo án dưới đây.

CÁC LOẠI SECTION HỢP LỆ:
${Object.entries(SECTION_TYPE_LABELS)
  .map(([key, label]) => `- ${key}: ${label}`)
  .join("\n")}

QUY TẮC PHÂN LOẠI:
1. Dựa vào NỘI DUNG, không chỉ tiêu đề
2. Một tiêu đề có thể khác nhau nhưng cùng nội dung:
   - "Mục tiêu", "Mục tiêu bài học", "Yêu cầu cần đạt" → OBJECTIVES
   - "Chuẩn bị", "Chuẩn bị của giáo viên và học sinh" → PREPARATION
   - "Khởi động", "Mở đầu", "Vào bài mới" → WARM_UP
   - "Hình thành kiến thức", "Tìm hiểu bài", "Bài mới" → KNOWLEDGE_FORMATION
   - "Luyện tập", "Thực hành", "Củng cố" → PRACTICE
   - "Vận dụng", "Liên hệ thực tế", "Mở rộng" → APPLICATION
3. Nếu không chắc chắn, trả về "OTHER"

ĐOẠN VĂN CẦN PHÂN TÍCH (mỗi phần cách nhau bằng ---):

${candidates
  .map(
    (c, i) => `[PHẦN ${i + 1}]
Tiêu đề: "${c.sectionTitle}"
Nội dung:
${c.content.substring(0, 2000)}`
  )
  .join("\n\n---\n\n")}

OUTPUT (JSON array - mỗi phần tử tương ứng với một PHẦN):
{
  "sections": [
    {
      "index": 0,
      "sectionType": "OBJECTIVES",
      "confidence": 0.95,
      "reasoning": "Đoạn văn này liệt kê kiến thức, kỹ năng, thái độ học sinh cần đạt"
    }
  ]
}

Trả về ONLY valid JSON, không markdown, không giải thích thêm.
`;

  try {
    const response = await fetch(`${BEE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BEE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: "Bạn là chuyên gia phân tích cấu trúc giáo án Việt Nam. Trả lời dưới dạng JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 8192,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("Beeknoee API error:", response.status);
      return candidates;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      console.error("Invalid response from Beeknoee API");
      return candidates;
    }

    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.sections && Array.isArray(parsed.sections)) {
      return candidates.map((candidate, index) => {
        const semantic = parsed.sections.find((s: any) => s.index === index);
        if (semantic && semantic.confidence > 0.5) {
          return {
            ...candidate,
            sectionType: semantic.sectionType || candidate.sectionType,
            confidence: Math.max(candidate.confidence, semantic.confidence),
            detectionMethod: (semantic.confidence > candidate.confidence ? "semantic" : candidate.detectionMethod) as DetectedSection["detectionMethod"],
            reasoning: semantic.reasoning || candidate.reasoning,
          };
        }
        return candidate;
      });
    }
  } catch (error) {
    console.error("Error in semantic detection:", error);
  }

  return candidates;
}

/**
 * Merge heuristic and semantic results, resolve conflicts
 */
export function mergeSectionResults(
  heuristic: DetectedSection[],
  semantic: DetectedSection[]
): DetectedSection[] {
  if (semantic.length === 0) return heuristic;
  if (heuristic.length === 0) return semantic;

  // If semantic returned different number of sections, prefer heuristic structure
  // but use semantic types where confidence is higher
  if (heuristic.length !== semantic.length) {
    return heuristic.map((h, i) => {
      const s = semantic[i];
      if (s && s.confidence > h.confidence) {
        return { ...h, sectionType: s.sectionType, confidence: s.confidence, detectionMethod: "semantic", reasoning: s.reasoning };
      }
      return h;
    });
  }

  // Same length - merge per-index
  return heuristic.map((h, i) => {
    const s = semantic[i];
    if (!s) return h;

    // If semantic has higher confidence, use its classification
    if (s.confidence > h.confidence && s.sectionType !== "OTHER") {
      return {
        ...h,
        sectionType: s.sectionType,
        confidence: s.confidence,
        detectionMethod: "semantic" as const,
        reasoning: s.reasoning,
      };
    }

    // If heuristic has higher confidence or both agree, keep heuristic
    return h;
  });
}

/**
 * Main function: detect sections from DOCX buffer
 * Uses heuristic + optional semantic detection
 */
export async function detectSectionsFromDocx(
  buffer: Buffer,
  useSemantic: boolean = true
): Promise<DetectionResult> {
  // Step 1: Parse DOCX structure
  const { elements, rawText } = await parseDocxStructure(buffer);

  if (!rawText.trim()) {
    throw new Error("Không thể đọc nội dung từ file DOCX");
  }

  // Step 2: Heuristic detection
  const heuristicSections = detectSectionsHeuristic(elements, rawText);

  if (heuristicSections.length === 0) {
    // Fallback: create single section with entire content
    return {
      sections: [
        {
          sectionType: "OTHER",
          sectionTitle: "Nội dung giáo án",
          content: rawText.trim(),
          confidence: 0.3,
          detectionMethod: "fallback",
          reasoning: "Không phát hiện được cấu trúc section",
          sectionOrder: 1,
        },
      ],
      method: "heuristic",
      overallConfidence: 0.3,
    };
  }

  // Step 3: Check if semantic detection is needed
  const lowConfidenceSections = heuristicSections.filter((s) => s.confidence < 0.5 || s.sectionType === "OTHER");
  const needsSemantic = useSemantic && (lowConfidenceSections.length > 0 || heuristicSections.length <= 1);

  if (needsSemantic) {
    try {
      const semanticSections = await detectSectionsSemantic(rawText, heuristicSections);
      const merged = mergeSectionResults(heuristicSections, semanticSections);

      return {
        sections: merged,
        method: "hybrid",
        overallConfidence: merged.reduce((sum, s) => sum + s.confidence, 0) / merged.length,
      };
    } catch (error) {
      console.error("Semantic detection failed, using heuristic results:", error);
    }
  }

  return {
    sections: heuristicSections,
    method: "heuristic",
    overallConfidence: heuristicSections.reduce((sum, s) => sum + s.confidence, 0) / heuristicSections.length,
  };
}

/**
 * Calculate word count for Vietnamese text
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Get localized label for a section type
 */
export function getSectionTypeLabel(sectionType: string): string {
  return SECTION_TYPE_LABELS[sectionType] || sectionType;
}
