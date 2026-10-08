// DOCX Parser for Auto-Rating KHBD
// Converts .docx files into DocumentIR structure compatible with PDFViewer, Rubric & AI Reviewer

import mammoth from 'mammoth';
import { DocumentIR, Paragraph, Page, Table, TableCell, Section, Activity } from '@/types/document';
import { v4 as uuidv4 } from 'uuid';

export interface ParseDocxResult {
  document: DocumentIR;
  rawText: string;
}

// Simulated A4 page dimensions in points (72 DPI)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_TOP = 56.7; // ~2.0cm
const MARGIN_BOTTOM = 56.7;
const MARGIN_LEFT = 56.7;
const MARGIN_RIGHT = 42.5; // ~1.5cm
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

// Heading detection regexes for Vietnamese Lesson Plans (CV 5512 / CV 2345)
const HEADING_1_REGEX = /^(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\s*[\.\-–—]\s*(.+)/i;
const HEADING_2_REGEX = /^(?:\d+\s*[\.\-–—]|[A-Z]\s*[\.\-–—])\s*(.+)/;
const ACTIVITY_REGEX = /^(?:hoạt\s*động|hoat\s*dong)\s*(\d+)?[:\-–—\.]?\s*(.*)/i;

export async function parseDOCX(arrayBuffer: ArrayBuffer, filename: string = 'giao_an.docx'): Promise<ParseDocxResult> {
  const nodeBuffer = Buffer.from(arrayBuffer);

  // 1. Extract raw text and raw HTML for structure
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer: nodeBuffer }),
    mammoth.convertToHtml({ buffer: nodeBuffer }),
  ]);

  const rawText = textResult.value || '';
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // 2. Break down into paragraphs with simulated layout positions
  const paragraphs: Paragraph[] = [];
  const pages: Page[] = [];

  let currentPageNum = 1;
  let currentY = MARGIN_TOP;
  const lineSpacing = 16; // points per normal text line
  const paragraphSpacing = 10;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const isH1 = HEADING_1_REGEX.test(text);
    const isH2 = HEADING_2_REGEX.test(text);
    const isActivity = ACTIVITY_REGEX.test(text);

    let type: Paragraph['type'] = 'paragraph';
    let fontSize = 11;
    let fontWeight: 'bold' | 'normal' = 'normal';

    if (isH1) {
      type = 'heading_1';
      fontSize = 13;
      fontWeight = 'bold';
    } else if (isH2 || isActivity) {
      type = 'heading_2';
      fontSize = 12;
      fontWeight = 'bold';
    } else if (/^[•\-\*\d\.)]+\s/.test(text)) {
      type = 'list_item';
      fontSize = 11;
    }

    // Estimate height of paragraph based on text length
    const approxLines = Math.max(1, Math.ceil((text.length * 7) / USABLE_WIDTH));
    const pHeight = Math.max(approxLines * lineSpacing, 18);

    // If paragraph exceeds page, move to next page
    if (currentY + pHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
      // Record completed page
      pages.push({
        pageNumber: currentPageNum,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        rotation: 0,
      });
      currentPageNum++;
      currentY = MARGIN_TOP;
    }

    const pId = `p_${String(i + 1).padStart(4, '0')}`;
    paragraphs.push({
      id: pId,
      page: currentPageNum,
      text,
      type,
      bbox: {
        x: MARGIN_LEFT,
        y: currentY,
        width: USABLE_WIDTH,
        height: pHeight,
      },
      style: {
        fontSize,
        fontWeight,
        textAlign: isH1 && text.toUpperCase() === text ? 'center' : 'left',
      },
    });

    currentY += pHeight + paragraphSpacing;
  }

  // Record the final page
  pages.push({
    pageNumber: currentPageNum,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    rotation: 0,
  });

  // 3. Extract sections from headings
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (p.type === 'heading_1' || p.type === 'heading_2') {
      if (currentSection) {
        currentSection.endParagraphId = paragraphs[i - 1]?.id || null;
        currentSection.endPage = paragraphs[i - 1]?.page || currentSection.startPage;
      }
      currentSection = {
        sectionId: `sec_${String(sections.length + 1).padStart(2, '0')}`,
        title: p.text,
        level: p.type === 'heading_1' ? 1 : 2,
        startParagraphId: p.id,
        endParagraphId: null,
        startPage: p.page,
        endPage: p.page,
      };
      sections.push(currentSection);
    }
  }
  if (currentSection && paragraphs.length > 0) {
    const lastP = paragraphs[paragraphs.length - 1];
    currentSection.endParagraphId = lastP.id;
    currentSection.endPage = lastP.page;
  }

  // 4. Extract activities
  const activities: Activity[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const actMatch = p.text.match(ACTIVITY_REGEX);
    if (actMatch || p.text.toLowerCase().includes('hoạt động')) {
      let actType: Activity['type'] = 'unknown';
      const lower = p.text.toLowerCase();
      if (lower.includes('khởi động') || lower.includes('mở đầu')) actType = 'khoi_dong';
      else if (lower.includes('hình thành kiến thức') || lower.includes('khám phá')) actType = 'hinh_thanh_kien_thuc';
      else if (lower.includes('luyện tập') || lower.includes('thực hành')) actType = 'luyen_tap';
      else if (lower.includes('vận dụng')) actType = 'van_dung';

      const endP = paragraphs[Math.min(i + 4, paragraphs.length - 1)] || p;

      activities.push({
        activityId: `act_${String(activities.length + 1).padStart(2, '0')}`,
        title: p.text,
        type: actType,
        startParagraphId: p.id,
        endParagraphId: endP.id,
        startPage: p.page,
        endPage: endP.page,
        teacherActionIds: [],
        studentActionIds: [],
        productIds: [],
      });
    }
  }

  const document: DocumentIR = {
    documentId: uuidv4(),
    metadata: {
      filename,
      pageCount: pages.length,
      fileSize: arrayBuffer.byteLength,
      hash: String(arrayBuffer.byteLength),
    },
    pages,
    sections,
    paragraphs,
    tables: [],
    activities,
    semanticLabels: [],
    reviews: [],
    annotations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { document, rawText };
}

export { parseDocx } from '../docx-parser-legacy';
