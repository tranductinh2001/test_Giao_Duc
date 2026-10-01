/**
 * Document IR Comparator
 *
 * So sánh dữ liệu giữa các stages để phát hiện mất mát.
 */

import { DocumentIR } from './DocumentIRPipeline';

export interface ComparisonResult {
  valid: boolean;
  stage: string;
  missing: MissingData[];
  metrics: ComparisonMetrics;
}

export interface MissingData {
  stage: string;
  expected: number;
  actual: number;
  lost: number;
  percentLost: number;
}

export interface ComparisonMetrics {
  vision: {
    paragraphs: number;
  };
  layout: {
    sections: number;
    headings: number;
  };
  paragraph: {
    total: number;
    fromVision: number;
    lost: number;
  };
  semantic: {
    labeled: number;
    coverage: number;
  };
  documentIR: {
    total: number;
    withLabels: number;
  };
}

/**
 * Document IR Comparator
 */
export class DocumentIRComparator {
  /**
   * Compare all stages
   */
  compare(visionData: any, docIR: DocumentIR): ComparisonResult {
    const missing: MissingData[] = [];

    // Count from Vision
    const visionParagraphs = this.countVisionParagraphs(visionData);

    // Count from Layout
    const layoutSections = docIR.layout?.sections?.length || 0;
    const layoutHeadings = docIR.layout?.headings?.length || 0;

    // Count from Paragraphs
    const paragraphTotal = docIR.paragraphs?.length || 0;

    // Count from Semantic
    const semanticTotal = docIR.semanticLabels?.length || 0;

    // Count from DocumentIR
    const docIRTotal = docIR.paragraphs?.length || 0;
    const docIRWithLabels = new Set(docIR.semanticLabels?.map(l => l.paragraphId)).size;

    // Check for data loss at each stage

    // Vision → Paragraph
    const paragraphLost = visionParagraphs - paragraphTotal;
    if (paragraphLost > 0) {
      missing.push({
        stage: 'Vision → Paragraph',
        expected: visionParagraphs,
        actual: paragraphTotal,
        lost: paragraphLost,
        percentLost: (paragraphLost / visionParagraphs) * 100,
      });
    }

    // Paragraph → Semantic
    const semanticLost = paragraphTotal - semanticTotal;
    if (semanticLost > 0) {
      missing.push({
        stage: 'Paragraph → Semantic',
        expected: paragraphTotal,
        actual: semanticTotal,
        lost: semanticLost,
        percentLost: (semanticLost / paragraphTotal) * 100,
      });
    }

    // Check overall validity
    const valid = missing.length === 0 || missing.every(m => m.percentLost < 5);

    const metrics: ComparisonMetrics = {
      vision: {
        paragraphs: visionParagraphs,
      },
      layout: {
        sections: layoutSections,
        headings: layoutHeadings,
      },
      paragraph: {
        total: paragraphTotal,
        fromVision: visionParagraphs,
        lost: paragraphLost,
      },
      semantic: {
        labeled: semanticTotal,
        coverage: paragraphTotal > 0 ? (semanticTotal / paragraphTotal) * 100 : 0,
      },
      documentIR: {
        total: docIRTotal,
        withLabels: docIRWithLabels,
      },
    };

    return {
      valid,
      stage: valid ? 'PASS' : missing[0]?.stage || 'UNKNOWN',
      missing,
      metrics,
    };
  }

  /**
   * Count paragraphs from Vision data
   */
  private countVisionParagraphs(visionData: any): number {
    let count = 0;

    // From pages
    if (visionData?.pages) {
      for (const page of visionData.pages) {
        if (page.elements) {
          count += page.elements.filter((e: any) => e.type === 'paragraph' || e.type === 'heading').length;
        }
      }
    }

    // From sections
    if (visionData?.sections) {
      for (const section of visionData.sections) {
        if (section.elements) {
          count += section.elements.filter((e: any) => e.type === 'paragraph' || e.type === 'heading').length;
        }
      }
    }

    // From paragraphs (direct)
    if (visionData?.paragraphs) {
      count = visionData.paragraphs.length;
    }

    return count;
  }

  /**
   * Generate comparison report
   */
  generateReport(comparison: ComparisonResult): string {
    const lines: string[] = [];

    lines.push('# Document IR Comparison Report');
    lines.push('');
    lines.push(`## Status: ${comparison.valid ? '✅ PASS' : '❌ FAIL'}`);
    lines.push('');
    lines.push('## Metrics');
    lines.push('');

    lines.push('### Vision');
    lines.push(`- Paragraphs: ${comparison.metrics.vision.paragraphs}`);
    lines.push('');

    lines.push('### Layout');
    lines.push(`- Sections: ${comparison.metrics.layout.sections}`);
    lines.push(`- Headings: ${comparison.metrics.layout.headings}`);
    lines.push('');

    lines.push('### Paragraph');
    lines.push(`- Total: ${comparison.metrics.paragraph.total}`);
    lines.push(`- From Vision: ${comparison.metrics.paragraph.fromVision}`);
    lines.push(`- Lost: ${comparison.metrics.paragraph.lost}`);
    lines.push('');

    lines.push('### Semantic');
    lines.push(`- Labeled: ${comparison.metrics.semantic.labeled}`);
    lines.push(`- Coverage: ${comparison.metrics.semantic.coverage.toFixed(1)}%`);
    lines.push('');

    lines.push('### DocumentIR');
    lines.push(`- Total: ${comparison.metrics.documentIR.total}`);
    lines.push(`- With Labels: ${comparison.metrics.documentIR.withLabels}`);
    lines.push('');

    if (comparison.missing.length > 0) {
      lines.push('## Missing Data');
      lines.push('');
      for (const m of comparison.missing) {
        lines.push(`- ${m.stage}: ${m.lost} lost (${m.percentLost.toFixed(1)}%)`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * Create comparator
 */
export function createDocumentComparator(): DocumentIRComparator {
  return new DocumentIRComparator();
}
