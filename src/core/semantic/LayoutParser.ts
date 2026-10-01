/**
 * Layout Parser Module (Clean Architecture)
 *
 * Extracts LayoutIR from Vision data:
 * - Pages
 * - Blocks (paragraphs, headings, etc.)
 * - Headings
 * - Sections
 *
 * Does NOT create Activities - that's ActivityDetector's job.
 */

import {
  LayoutIR,
  PageIR,
  BlockIR,
  HeadingIR,
  SectionIR,
  ParagraphIR,
  TableDataIR,
} from './types';

/**
 * Layout Parser Options
 */
export interface LayoutParserOptions {
  enableTableExtraction: boolean;
  enableHeadingDetection: boolean;
  minConfidence: number;
}

/**
 * Layout Parser Result
 */
export interface LayoutParserResult {
  layout: LayoutIR;
  paragraphs: ParagraphIR[];
  headings: HeadingIR[];
}

/**
 * Layout Parser
 *
 * Converts Vision data to clean IR types
 */
export class LayoutParser {
  private options: LayoutParserOptions;

  constructor(options: Partial<LayoutParserOptions> = {}) {
    this.options = {
      enableTableExtraction: true,
      enableHeadingDetection: true,
      minConfidence: 0.5,
      ...options,
    };
  }

  /**
   * Parse Vision data to LayoutIR
   *
   * @param visionData - Raw vision data from OCR/Vision API
   * @param sourceFile - Source file name for metadata
   */
  parse(visionData: any, sourceFile?: string): LayoutParserResult {
    console.log('\n[LayoutParser] Starting...');

    // Extract metadata
    const metadata = visionData?.metadata || {};
    const pages = visionData?.pages || [];
    const detectedSections = visionData?.sections || [];
    const detectedTables = visionData?.tables || [];

    // Build pages
    const pageIRs: PageIR[] = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      pageIRs.push({
        id: `page_${i + 1}`,
        pageNumber: page.pageNumber || i + 1,
        width: page.width,
        height: page.height,
      });
    }

    console.log(`  Pages: ${pageIRs.length}`);

    // Build sections
    const sectionIRs: SectionIR[] = [];
    for (let i = 0; i < detectedSections.length; i++) {
      const sec = detectedSections[i];
      sectionIRs.push({
        id: sec.id || `section_${i + 1}`,
        title: sec.title || 'Untitled Section',
        code: sec.code || sec.type || 'OTHER',
        pageStart: sec.pageStart || 1,
        pageEnd: sec.pageEnd || pageIRs.length,
        order: i + 1,
        paragraphIds: [],
      });
    }

    // Default section if none detected
    if (sectionIRs.length === 0) {
      sectionIRs.push({
        id: 'section_1',
        title: 'Nội dung',
        code: 'NOI_DUNG',
        pageStart: 1,
        pageEnd: pageIRs.length,
        order: 1,
        paragraphIds: [],
      });
    }

    console.log(`  Sections: ${sectionIRs.length}`);

    // Build blocks and extract paragraphs + headings
    const blocks: BlockIR[] = [];
    const paragraphs: ParagraphIR[] = [];
    const headings: HeadingIR[] = [];

    let paraIndex = 0;
    let blockIndex = 0;

    for (const page of pages) {
      const pageNum = page.pageNumber || 1;
      const pageId = `page_${pageNum}`;
      const elements = page.elements || [];

      for (const elem of elements) {
        const blockId = `block_${blockIndex++}`;

        // Create block
        const block: BlockIR = {
          id: blockId,
          type: this.mapBlockType(elem.type),
          content: elem.content || '',
          pageId,
          readingOrder: elem.readingOrder || blockIndex,
          bbox: elem.bbox,
        };

        blocks.push(block);

        // Extract paragraph or heading
        if (elem.type === 'paragraph' && elem.content?.trim()) {
          const para: ParagraphIR = {
            id: `para_${paraIndex}`,
            content: elem.content.trim(),
            type: 'text',
            pageId,
            blockId,
            lineNumber: paraIndex,
            readingOrder: block.readingOrder,
            headingLevel: undefined,
          };
          paragraphs.push(para);
          paraIndex++;
        } else if (elem.type === 'heading' && elem.content?.trim()) {
          const heading: HeadingIR = {
            id: `heading_${headings.length}`,
            text: elem.content.trim(),
            level: elem.level || 1,
            pageId,
            blockId,
            readingOrder: block.readingOrder,
            isActivityHeading: this.isActivityHeading(elem.content),
          };
          headings.push(heading);

          // Also add as paragraph
          const para: ParagraphIR = {
            id: `para_${paraIndex}`,
            content: elem.content.trim(),
            type: 'heading',
            pageId,
            blockId,
            lineNumber: paraIndex,
            readingOrder: block.readingOrder,
            headingLevel: elem.level,
          };
          paragraphs.push(para);
          paraIndex++;
        } else if (elem.type === 'table' && this.options.enableTableExtraction) {
          // Extract table rows as paragraphs
          if (elem.tableData?.rows) {
            for (let rowIdx = 0; rowIdx < elem.tableData.rows.length; rowIdx++) {
              const row = elem.tableData.rows[rowIdx];
              const rowContent = row.join(' | ');

              const para: ParagraphIR = {
                id: `para_${paraIndex}`,
                content: rowContent,
                type: 'table',
                pageId,
                blockId,
                lineNumber: paraIndex,
                readingOrder: block.readingOrder + rowIdx,
                tableData: {
                  id: `table_${elem.id || blockId}`,
                  rows: elem.tableData.rows,
                  headers: elem.tableData.headers || [],
                  pageId,
                },
              };
              paragraphs.push(para);
              paraIndex++;
            }
          }
        }
      }
    }

    console.log(`  Blocks: ${blocks.length}`);
    console.log(`  Paragraphs: ${paragraphs.length}`);
    console.log(`  Headings: ${headings.length}`);

    // Build LayoutIR
    const layout: LayoutIR = {
      metadata: {
        title: metadata.title,
        language: metadata.language || 'vi',
        totalPages: pageIRs.length,
        totalSections: sectionIRs.length,
        confidence: metadata.confidence || 0.9,
      },
      pages: pageIRs,
      sections: sectionIRs,
      headings,
      blocks,
    };

    console.log('[LayoutParser] Complete\n');

    return {
      layout,
      paragraphs,
      headings,
    };
  }

  /**
   * Map vision type to block type
   */
  private mapBlockType(type: string): BlockIR['type'] {
    switch (type) {
      case 'heading': return 'heading';
      case 'paragraph': return 'text';
      case 'list': return 'list';
      case 'table': return 'table';
      case 'image': return 'image';
      case 'formula': return 'formula';
      default: return 'text';
    }
  }

  /**
   * Check if heading is an activity heading
   */
  private isActivityHeading(text: string): boolean {
    const trimmed = text.trim();

    // Pattern 1: "Hoạt động 1:", "Hoạt động 1", "HĐ 1", etc.
    if (/^(hoạt động|hoat dong|hd|hđ)\s*(\d+)[\s:.]/i.test(trimmed)) {
      return true;
    }

    // Pattern 2: "Hoạt động của giáo viên", "Hoạt động của học sinh"
    if (/^(hoạt động\s+(của\s+)?(giáo viên|học sinh))/i.test(trimmed)) {
      return true;
    }

    // Pattern 3: Numbered sub-sections: 1.1, 1.2, 2.1, etc.
    if (/^(\d+\.\d+)[\s.]/.test(trimmed) && trimmed.length < 60) {
      return true;
    }

    return false;
  }
}

/**
 * Create LayoutParser instance
 */
export function createLayoutParser(options?: Partial<LayoutParserOptions>): LayoutParser {
  return new LayoutParser(options);
}
