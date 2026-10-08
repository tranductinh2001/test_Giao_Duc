// Section Detection

import { Section, Paragraph, BoundingBox } from '@/types/document';

// Common section patterns in Vietnamese lesson plans
const SECTION_PATTERNS = [
  // Roman numeral sections
  { pattern: /^I\.\s*(.+)/i, level: 1, name: 'Yêu cầu cần đạt' },
  { pattern: /^II\.\s*(.+)/i, level: 1, name: 'Đồ dùng dạy học' },
  { pattern: /^III\.\s*(.+)/i, level: 1, name: 'Các hoạt động dạy học' },
  { pattern: /^IV\.\s*(.+)/i, level: 1, name: 'Điều chỉnh sau bài dạy' },

  // Letter subsections
  { pattern: /^[A-Z]\.\s*(.+)/i, level: 2 },

  // Numbered subsections
  { pattern: /^\d+\.\s*(.+)/i, level: 3 },
];

export function detectSections(paragraphs: Paragraph[]): Section[] {
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const matchInfo = matchSectionPattern(paragraph.text);

    if (matchInfo) {
      // Close previous section
      if (currentSection) {
        currentSection.endParagraphId = paragraphs[i - 1]?.id || null;
        currentSection.endPage = paragraphs[i - 1]?.page || currentSection.startPage;
      }

      // Start new section
      currentSection = {
        sectionId: `section_${String(sections.length + 1).padStart(2, '0')}`,
        title: matchInfo.title,
        level: matchInfo.level,
        startParagraphId: paragraph.id,
        endParagraphId: null,
        startPage: paragraph.page,
        endPage: paragraph.page,
      };
      sections.push(currentSection);
    } else if (currentSection) {
      // Continue current section
      currentSection.endPage = paragraph.page;
    }
  }

  // Close last section
  if (currentSection) {
    currentSection.endParagraphId = paragraphs[paragraphs.length - 1]?.id || null;
  }

  return sections;
}

interface MatchResult {
  title: string;
  level: number;
}

function matchSectionPattern(text: string): MatchResult | null {
  const trimmed = text.trim();

  for (const { pattern, level } of SECTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        title: match[0], // Full matched text
        level,
      };
    }
  }

  return null;
}

export function getSectionForParagraph(
  sections: Section[],
  paragraphId: string
): Section | null {
  for (const section of sections) {
    const startIdx = section.startParagraphId
      ? parseInt(section.startParagraphId.replace('p_', ''), 10)
      : 0;
    const endIdx = section.endParagraphId
      ? parseInt(section.endParagraphId.replace('p_', ''), 10)
      : Infinity;
    const paraIdx = parseInt(paragraphId.replace('p_', ''), 10);

    if (paraIdx >= startIdx && paraIdx <= endIdx) {
      return section;
    }
  }
  return null;
}

export function getSectionBbox(
  section: Section,
  paragraphs: Paragraph[]
): BoundingBox {
  const startParagraph = paragraphs.find((p) => p.id === section.startParagraphId);
  const endParagraph = paragraphs.find((p) => p.id === section.endParagraphId);

  if (!startParagraph) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const startX = startParagraph.bbox.x;
  const startY = startParagraph.bbox.y;
  const endX = endParagraph?.bbox ? endParagraph.bbox.x + endParagraph.bbox.width : startParagraph.bbox.x;
  const endY = endParagraph?.bbox ? endParagraph.bbox.y : startParagraph.bbox.y;

  return {
    x: startX,
    y: endY, // Bottom of end paragraph
    width: Math.max(endX - startX, startParagraph.bbox.width),
    height: startY - endY + startParagraph.bbox.height,
  };
}
