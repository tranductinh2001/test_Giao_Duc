/**
 * Document Normalizer
 *
 * Chuẩn hóa dữ liệu sau Vision trước khi Semantic.
 * KHÔNG thay đổi ý nghĩa - chỉ format lại.
 */

export interface NormalizedParagraph {
  id: string;
  content: string;
  originalContent: string;
  pageNumber: number;
  lineNumber: number;
  normalized: boolean;
  changes: string[];
}

export interface NormalizationResult {
  paragraphs: NormalizedParagraph[];
  tables: any[];
  summary: {
    totalParagraphs: number;
    normalizedParagraphs: number;
    totalChanges: number;
  };
}

/**
 * Document Normalizer
 */
export class DocumentNormalizer {
  /**
   * Normalize all paragraphs
   */
  normalizeParagraphs(paragraphs: any[]): NormalizedParagraph[] {
    return paragraphs.map((para, index) => {
      const originalContent = para.content || '';
      const changes: string[] = [];

      let normalized = this.normalizeText(originalContent);

      // Check if heading was split across lines
      if (index > 0 && this.isHeadingContinuation(para, paragraphs[index - 1])) {
        const prevPara = paragraphs[index - 1];
        normalized = (prevPara.content || '') + ' ' + normalized;
        changes.push('JOIN_HEADING');
      }

      // Normalize bullet points
      normalized = this.normalizeBullets(normalized);
      changes.push('NORMALIZE_BULLETS');

      // Normalize dashes
      normalized = this.normalizeDashes(normalized);
      changes.push('NORMALIZE_DASHES');

      // Normalize whitespace
      normalized = this.normalizeWhitespace(normalized);
      changes.push('NORMALIZE_WHITESPACE');

      // Normalize Roman numerals
      normalized = this.normalizeRomanNumerals(normalized);
      changes.push('NORMALIZE_ROMAN');

      // Normalize special characters
      normalized = this.normalizeSpecialChars(normalized);
      changes.push('NORMALIZE_SPECIAL');

      return {
        id: para.id || `para_${index}`,
        content: normalized,
        originalContent,
        pageNumber: para.pageNumber || 1,
        lineNumber: para.lineNumber || index,
        normalized: normalized !== originalContent,
        changes: [...new Set(changes)], // Remove duplicates
      };
    });
  }

  /**
   * Normalize text - remove extra spaces, trim
   */
  private normalizeText(text: string): string {
    if (!text) return '';

    // Replace multiple spaces with single space
    let result = text.replace(/\s+/g, ' ');

    // Trim
    result = result.trim();

    return result;
  }

  /**
   * Normalize bullet points
   * • GV cho HS hát → GV cho HS hát
   */
  private normalizeBullets(text: string): string {
    if (!text) return text;

    // Remove bullet characters
    const bulletChars = ['•', '◦', '▪', '‣', '✓', '✔', '○', '●', '■', '□'];

    let result = text;
    for (const bullet of bulletChars) {
      // Replace bullet at start of line
      result = result.replace(new RegExp(`^${bullet}\\s*`, 'gm'), '');
      result = result.replace(new RegExp(`\\n${bullet}\\s*`, 'g'), '\n');
    }

    // Remove leading dashes that are bullets
    result = result.replace(/^-\s+/gm, '');
    result = result.replace(/\n-\s+/g, '\n');

    return result;
  }

  /**
   * Normalize dashes
   * II- → II.
   * -- → -
   */
  private normalizeDashes(text: string): string {
    if (!text) return text;

    let result = text;

    // II- → II.
    result = result.replace(/([IVXLC])\s*-+$/gm, '$1.');

    // -- → -
    result = result.replace(/--/g, '—');

    // - at end of line → .
    result = result.replace(/-\s*$/gm, '.');

    return result;
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(text: string): string {
    if (!text) return text;

    let result = text;

    // Multiple spaces → single space
    result = result.replace(/[ \t]+/g, ' ');

    // Space before punctuation
    result = result.replace(/ \?/g, '?');
    result = result.replace(/ \!/g, '!');
    result = result.replace(/ \./g, '.');
    result = result.replace(/ \,/g, ',');

    // Trim each line
    result = result.split('\n').map(line => line.trim()).join('\n');

    // Remove empty lines
    result = result.replace(/\n\s*\n/g, '\n');

    return result.trim();
  }

  /**
   * Normalize Roman numerals
   * I. → I.
   * II. → II.
   */
  private normalizeRomanNumerals(text: string): string {
    if (!text) return text;

    let result = text;

    // I→I. (at end or before space)
    result = result.replace(/([IVXLCDM])\s*$/gm, '$1.');

    // I. → I. (ensure consistent)
    result = result.replace(/([IVXLCDM])\.+/g, '$1.');

    return result;
  }

  /**
   * Normalize special characters
   */
  private normalizeSpecialChars(text: string): string {
    if (!text) return text;

    let result = text;

    // Smart quotes → straight quotes
    result = result.replace(/[""]/g, '"');
    result = result.replace(/[""]/g, '"');
    result = result.replace(/[']/g, "'");
    result = result.replace(/[']/g, "'");

    // Ellipsis
    result = result.replace(/\.\.\./g, '…');

    // Em dash
    result = result.replace(/—/g, '-');

    // Non-breaking space
    result = result.replace(/ /g, ' ');

    return result;
  }

  /**
   * Check if paragraph is a continuation of heading
   */
  private isHeadingContinuation(current: any, previous: any): boolean {
    if (!previous || !current) return false;

    const prevContent = previous.content || '';
    const currContent = current.content || '';

    // If previous was a heading (ends with : or -)
    if (prevContent.match(/[:\-]\s*$/)) {
      // And current starts with lowercase or continues
      if (currContent.match(/^[a-zăâáắấàằẳẵặẫẩạảấầẩẫẹẻẽếềểễệỉịỏơờớởỡợốồổỗộớợợụủứừửữựỳỵỷỹ]/)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize tables
   */
  normalizeTables(tables: any[]): any[] {
    return tables.map(table => ({
      ...table,
      rows: table.rows?.map((row: string[]) =>
        row.map(cell => this.normalizeText(cell || ''))
      ),
    }));
  }
}

/**
 * Create normalizer instance
 */
export function createDocumentNormalizer(): DocumentNormalizer {
  return new DocumentNormalizer();
}
