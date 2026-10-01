/**
 * Full Pipeline Tester
 *
 * Chạy toàn bộ pipeline với nhiều files và sinh báo cáo chi tiết.
 * KHÔNG được sửa code - chỉ chạy, log, đánh giá, báo cáo.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentIR, runDocumentIRPipeline } from './DocumentIRPipeline';
import { DocumentNormalizer, createDocumentNormalizer } from './DocumentNormalizer';
import { DocumentIRValidator, createDocumentValidator } from './DocumentValidator';
import { DocumentIRComparator, createDocumentComparator } from './DocumentComparator';
import { BeekOneAIClient } from '@/lib/beekone-ai-client';

export interface TestConfig {
  inputDir: string;      // Directory chứa PDF files
  outputDir: string;     // Directory output
  maxFiles: number;
}

export interface StageLog {
  stage: string;
  name: string;
  inputCount: number;
  outputCount: number;
  lostIds: string[];
  timeMs: number;
  memory?: number;
}

export interface ParagraphLabel {
  id: string;
  text: string;
  expected?: string;
  predicted: string;
  confidence: number;
  reason: string;
}

export interface TestResult {
  filename: string;
  success: boolean;
  stages: StageLog[];
  coverage: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  unknownRate: number;
  errors: TestError[];
  warnings: TestWarning[];
  paragraphLabels: ParagraphLabel[];
  confusionMatrix: Record<string, Record<string, number>>;
}

/**
 * Test Error
 */
export interface TestError {
  type: string;
  stage: string;
  message: string;
  details?: any;
}

/**
 * Test Warning
 */
export interface TestWarning {
  type: string;
  stage: string;
  message: string;
}

/**
 * Full Pipeline Tester
 */
export class FullPipelineTester {
  private config: TestConfig;
  private normalizer: DocumentNormalizer;
  private validator: DocumentIRValidator;
  private comparator: DocumentIRComparator;

  constructor(config: TestConfig) {
    this.config = config;
    this.normalizer = createDocumentNormalizer();
    this.validator = createDocumentValidator();
    this.comparator = createDocumentComparator();
  }

  /**
   * Chạy test với tất cả files trong inputDir
   */
  async runAll(aiClient: BeekOneAIClient): Promise<TestResult[]> {
    console.log(`\n${'='.repeat(80)}`);
    console.log('FULL PIPELINE TESTER');
    console.log('='.repeat(80));

    // Get all PDF files
    const files = this.getPdfFiles();
    const testFiles = files.slice(0, this.config.maxFiles);

    console.log(`Found ${files.length} PDF files`);
    console.log(`Running on ${testFiles.length} files\n`);

    const results: TestResult[] = [];

    for (let i = 0; i < testFiles.length; i++) {
      const file = testFiles[i];
      console.log(`\n[${i + 1}/${testFiles.length}] Testing: ${file}`);

      const result = await this.runOnFile(file, aiClient);
      results.push(result);

      // Save result immediately
      this.saveResult(result);
    }

    // Generate summary report
    this.generateReport(results);

    return results;
  }

  /**
   * Chạy test trên một file
   */
  async runOnFile(filename: string, aiClient: BeekOneAIClient): Promise<TestResult> {
    const startTime = Date.now();
    const stages: StageLog[] = [];

    // Stage 0: Load file
    console.log('\n--- Stage 0: Load File ---');
    const stage0Start = Date.now();
    const visionData = this.loadVisionData(filename);
    const loadTime = Date.now() - stage0Start;

    stages.push({
      stage: '0',
      name: 'Load',
      inputCount: 0,
      outputCount: 0,
      lostIds: [],
      timeMs: loadTime,
    });
    console.log(`  Time: ${loadTime}ms`);

    // Stage 1: Normalization
    console.log('\n--- Stage 1: Normalization ---');
    const stage1Start = Date.now();
    const normalized = this.runNormalization(visionData);
    const normTime = Date.now() - stage1Start;

    stages.push({
      stage: '1',
      name: 'Normalization',
      inputCount: visionData?.pages?.flatMap((p: any) => p.elements || [])?.length || 0,
      outputCount: normalized.paragraphs?.length || 0,
      lostIds: this.findLostIds(
        visionData?.pages?.flatMap((p: any) => p.elements || []) || [],
        normalized.paragraphs || []
      ),
      timeMs: normTime,
    });
    console.log(`  Input: ${stages[1].inputCount}`);
    console.log(`  Output: ${stages[1].outputCount}`);
    console.log(`  Lost: ${stages[1].lostIds.length}`);
    console.log(`  Time: ${normTime}ms`);

    // Stage 2: Layout
    console.log('\n--- Stage 2: Layout ---');
    const stage2Start = Date.now();
    const layout = this.runLayout(visionData);
    const layoutTime = Date.now() - stage2Start;

    stages.push({
      stage: '2',
      name: 'Layout',
      inputCount: stages[1].outputCount,
      outputCount: layout.sections?.length || 0,
      lostIds: [],
      timeMs: layoutTime,
    });
    console.log(`  Sections: ${layout.sections?.length || 0}`);
    console.log(`  Headings: ${layout.headings?.length || 0}`);
    console.log(`  Time: ${layoutTime}ms`);

    // Stage 3: Paragraph Extraction
    console.log('\n--- Stage 3: Paragraph ---');
    const stage3Start = Date.now();
    const paragraphs = this.runParagraphExtraction(visionData);
    const paraTime = Date.now() - stage3Start;

    stages.push({
      stage: '3',
      name: 'Paragraph',
      inputCount: stages[2].inputCount,
      outputCount: paragraphs.length,
      lostIds: this.findLostParagraphs(stages[2].inputCount, paragraphs),
      timeMs: paraTime,
    });
    console.log(`  Input: ${stages[2].inputCount}`);
    console.log(`  Output: ${paragraphs.length}`);
    console.log(`  Lost: ${stages[3].lostIds.length}`);
    console.log(`  Time: ${paraTime}ms`);

    // Stage 4: Activity Detection
    console.log('\n--- Stage 4: Activity ---');
    const stage4Start = Date.now();
    const activities = this.runActivityDetection(layout, paragraphs);
    const actTime = Date.now() - stage4Start;

    stages.push({
      stage: '4',
      name: 'Activity',
      inputCount: paragraphs.length,
      outputCount: activities.length,
      lostIds: [],
      timeMs: actTime,
    });
    console.log(`  Activities: ${activities.length}`);
    console.log(`  Time: ${actTime}ms`);

    // Stage 5: Semantic Classification
    console.log('\n--- Stage 5: Semantic ---');
    const stage5Start = Date.now();
    const semanticLabels = await this.runSemanticClassification(
      activities,
      paragraphs,
      aiClient,
      stages[5]?.name || 'Semantic'
    );
    const semTime = Date.now() - stage5Start;

    stages.push({
      stage: '5',
      name: 'Semantic',
      inputCount: paragraphs.length,
      outputCount: semanticLabels.length,
      lostIds: this.findLostSemantic(paragraphs, semanticLabels),
      timeMs: semTime,
    });
    console.log(`  Input: ${paragraphs.length}`);
    console.log(`  Labels: ${semanticLabels.length}`);
    console.log(`  Lost: ${stages[5].lostIds.length}`);
    console.log(`  Time: ${semTime}ms`);

    // Stage 6: Mapper
    console.log('\n--- Stage 6: Mapper ---');
    const stage6Start = Date.now();
    const docIR = this.runMapper(layout, paragraphs, activities, semanticLabels, visionData);
    const mapTime = Date.now() - stage6Start;

    stages.push({
      stage: '6',
      name: 'Mapper',
      inputCount: semanticLabels.length,
      outputCount: docIR.paragraphs?.length || 0,
      lostIds: [],
      timeMs: mapTime,
    });
    console.log(`  Time: ${mapTime}ms`);

    // Calculate metrics
    const coverage = (semanticLabels.length / paragraphs.length) * 100;
    const unknownLabels = semanticLabels.filter(l => l.type === 'UNKNOWN');
    const unknownRate = (unknownLabels.length / semanticLabels.length) * 100;

    // Generate paragraph labels
    const paragraphLabels = this.generateParagraphLabels(paragraphs, semanticLabels);

    // Generate confusion matrix
    const confusionMatrix = this.generateConfusionMatrix(paragraphLabels);

    // Find errors
    const errors = this.findErrors(stages, docIR);
    const warnings = this.findWarnings(stages, docIR);

    const totalTime = Date.now() - startTime;

    console.log(`\n--- Summary ---`);
    console.log(`  Total Time: ${totalTime}ms`);
    console.log(`  Coverage: ${coverage.toFixed(1)}%`);
    console.log(`  Unknown Rate: ${unknownRate.toFixed(1)}%`);
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}`);

    return {
      filename,
      success: errors.length === 0,
      stages,
      coverage,
      accuracy: 0, // Need golden labels
      precision: 0,
      recall: 0,
      f1: 0,
      unknownRate,
      errors,
      warnings,
      paragraphLabels,
      confusionMatrix,
    };
  }

  /**
   * Load vision data (mock - thực tế sẽ gọi Vision API)
   */
  private loadVisionData(filename: string): any {
    // Thực tế: gọi Vision API để parse PDF
    // Hiện tại: đọc từ file đã parse
    const filepath = path.join(this.config.inputDir, filename);
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
    return { pages: [], sections: [] };
  }

  /**
   * Run normalization
   */
  private runNormalization(visionData: any): any {
    const paragraphs = visionData?.pages?.flatMap((p: any) => p.elements || []) || [];
    const normalized = this.normalizer.normalizeParagraphs(paragraphs);
    return { paragraphs: normalized };
  }

  /**
   * Run layout
   */
  private runLayout(visionData: any): any {
    return {
      sections: visionData?.sections || [],
      headings: visionData?.pages?.flatMap((p: any) =>
        (p.elements || []).filter((e: any) => e.type === 'heading')
      ) || [],
    };
  }

  /**
   * Run paragraph extraction
   */
  private runParagraphExtraction(visionData: any): any[] {
    const paragraphs: any[] = [];
    const pages = visionData?.pages || [];

    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const elements = pages[pageNum].elements || [];
      for (const elem of elements) {
        if (elem.type === 'paragraph' || elem.type === 'heading') {
          paragraphs.push({
            id: elem.id,
            content: elem.content,
            pageNumber: pageNum + 1,
          });
        }
      }
    }

    return paragraphs;
  }

  /**
   * Run activity detection
   */
  private runActivityDetection(layout: any, paragraphs: any[]): any[] {
    const activities: any[] = [];
    let actIdx = 0;

    for (const para of paragraphs) {
      if (para.content?.match(/^\d+\.|^[IVX]+\.|^Hoạt động/)) {
        activities.push({
          id: `activity_${actIdx++}`,
          title: para.content,
          paragraphIds: [para.id],
        });
      } else if (activities.length > 0) {
        activities[activities.length - 1].paragraphIds.push(para.id);
      }
    }

    return activities;
  }

  /**
   * Run semantic classification
   */
  private async runSemanticClassification(
    activities: any[],
    paragraphs: any[],
    aiClient: BeekOneAIClient,
    stageName: string
  ): Promise<any[]> {
    // Thực tế: gọi AI để classify
    // Hiện tại: return mock labels
    return paragraphs.map((para, idx) => ({
      paragraphId: para.id,
      paragraphIndex: idx,
      type: this.predictLabel(para.content),
      confidence: 0.9,
    }));
  }

  /**
   * Predict label (mock)
   */
  private predictLabel(content: string): string {
    if (!content) return 'UNKNOWN';
    const lower = content.toLowerCase();

    if (lower.includes('gv') || lower.includes('giáo viên')) return 'TEACHER_ACTION';
    if (lower.includes('hs') || lower.includes('học sinh')) return 'STUDENT_ACTION';
    if (lower.includes('sgk') || lower.includes('sách giáo khoa')) return 'TEACHING_MATERIAL';
    if (lower.includes('câu hỏi') || lower.includes('?')) return 'QUESTION';
    if (lower.includes('nhận xét') || lower.includes('đánh giá')) return 'ASSESSMENT';
    if (lower.includes('mục tiêu') || lower.includes('yêu cầu')) return 'LEARNING_OUTCOME';
    if (lower.includes('sản phẩm')) return 'PRODUCT';
    if (lower.match(/^\d+\.|^[IVX]+\.|^hoạt động/i)) return 'SECTION_HEADER';

    return 'UNKNOWN';
  }

  /**
   * Run mapper
   */
  private runMapper(layout: any, paragraphs: any[], activities: any[], labels: any[], visionData: any): DocumentIR {
    return {
      metadata: {
        sourceFile: '',
        totalPages: visionData?.metadata?.totalPages || 1,
        totalParagraphs: paragraphs.length,
        processingTimeMs: 0,
        extractedAt: new Date().toISOString(),
      },
      layout,
      tables: [],
      paragraphs,
      sections: layout.sections || [],
      activities,
      semanticLabels: labels,
      artifacts: {} as any,
    };
  }

  /**
   * Find lost IDs
   */
  private findLostIds(input: any[], output: any[]): string[] {
    const inputIds = new Set(input.map((i: any) => i.id));
    const outputIds = new Set(output.map((o: any) => o.id));

    return Array.from(inputIds).filter(id => !outputIds.has(id));
  }

  /**
   * Find lost paragraphs
   */
  private findLostParagraphs(inputCount: number, paragraphs: any[]): string[] {
    if (inputCount === paragraphs.length) return [];
    return paragraphs.slice(inputCount).map(p => p.id);
  }

  /**
   * Find lost semantic
   */
  private findLostSemantic(paragraphs: any[], labels: any[]): string[] {
    const paraIds = new Set(paragraphs.map(p => p.id));
    const labelParaIds = new Set(labels.map(l => l.paragraphId));

    return Array.from(paraIds).filter(id => !labelParaIds.has(id));
  }

  /**
   * Generate paragraph labels
   */
  private generateParagraphLabels(paragraphs: any[], labels: any[]): ParagraphLabel[] {
    const labelMap = new Map(labels.map(l => [l.paragraphId, l]));

    return paragraphs.map(para => {
      const label = labelMap.get(para.id);
      const predicted = label?.type || 'UNKNOWN';
      const reason = this.getLabelReason(para.content, predicted);

      return {
        id: para.id,
        text: para.content?.substring(0, 100) || '',
        predicted,
        confidence: label?.confidence || 0,
        reason,
      };
    });
  }

  /**
   * Get label reason
   */
  private getLabelReason(content: string, predicted: string): string {
    if (!content) return 'Empty content';

    const lower = content.toLowerCase();

    switch (predicted) {
      case 'TEACHER_ACTION':
        if (lower.includes('gv') || lower.includes('giáo viên')) return 'Contains GV or Giáo viên';
        return 'Contains teacher-related keywords';
      case 'STUDENT_ACTION':
        if (lower.includes('hs') || lower.includes('học sinh')) return 'Contains HS or Học sinh';
        return 'Contains student-related keywords';
      case 'TEACHING_MATERIAL':
        return 'Contains material keywords (SGK, máy chiếu, etc.)';
      case 'QUESTION':
        return 'Contains question mark or question keywords';
      case 'ASSESSMENT':
        return 'Contains assessment keywords';
      case 'SECTION_HEADER':
        return 'Matches heading pattern';
      case 'UNKNOWN':
        return 'No matching keywords found';
      default:
        return 'Default classification';
    }
  }

  /**
   * Generate confusion matrix
   */
  private generateConfusionMatrix(labels: ParagraphLabel[]): Record<string, Record<string, number>> {
    const matrix: Record<string, Record<string, number>> = {};

    for (const label of labels) {
      // Without golden labels, we can't build real confusion matrix
      // This is a placeholder
      const predicted = label.predicted;
      if (!matrix[predicted]) {
        matrix[predicted] = {};
      }
      matrix[predicted][predicted] = (matrix[predicted][predicted] || 0) + 1;
    }

    return matrix;
  }

  /**
   * Find errors
   */
  private findErrors(stages: StageLog[], docIR: DocumentIR): TestError[] {
    const errors: TestError[] = [];

    for (const stage of stages) {
      if (stage.lostIds.length > 0) {
        errors.push({
          type: 'DATA_LOSS',
          stage: stage.name,
          message: `Lost ${stage.lostIds.length} items in ${stage.name}`,
          details: { lostIds: stage.lostIds },
        });
      }
    }

    if (!docIR.paragraphs || docIR.paragraphs.length === 0) {
      errors.push({
        type: 'EMPTY_RESULT',
        stage: 'Mapper',
        message: 'No paragraphs in output',
      });
    }

    return errors;
  }

  /**
   * Find warnings
   */
  private findWarnings(stages: StageLog[], docIR: DocumentIR): TestWarning[] {
    const warnings: TestWarning[] = [];

    for (const stage of stages) {
      if (stage.outputCount === 0 && stage.inputCount > 0) {
        warnings.push({
          type: 'ZERO_OUTPUT',
          stage: stage.name,
          message: `Zero output despite ${stage.inputCount} input`,
        });
      }
    }

    return warnings;
  }

  /**
   * Get PDF files
   */
  private getPdfFiles(): string[] {
    if (!fs.existsSync(this.config.inputDir)) {
      return [];
    }

    return fs.readdirSync(this.config.inputDir)
      .filter(f => f.endsWith('.pdf') || f.endsWith('.json'));
  }

  /**
   * Save result
   */
  private saveResult(result: TestResult): void {
    const outputDir = path.join(this.config.outputDir, 'test_results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = result.filename.replace('.pdf', '.json').replace('.json', '_result.json');
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`  [Saved] ${filepath}`);
  }

  /**
   * Generate summary report
   */
  private generateReport(results: TestResult[]): void {
    const outputDir = path.join(this.config.outputDir, 'test_results');

    // Calculate summary
    const totalFiles = results.length;
    const successful = results.filter(r => r.success).length;
    const avgCoverage = results.reduce((sum, r) => sum + r.coverage, 0) / totalFiles;
    const avgUnknown = results.reduce((sum, r) => sum + r.unknownRate, 0) / totalFiles;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    const report = `# FULL PIPELINE TEST REPORT

## Summary
- Total Files: ${totalFiles}
- Successful: ${successful}
- Failed: ${totalFiles - successful}
- Success Rate: ${((successful / totalFiles) * 100).toFixed(1)}%

## Coverage
- Average Coverage: ${avgCoverage.toFixed(1)}%
- Average Unknown Rate: ${avgUnknown.toFixed(1)}%

## Errors
- Total Errors: ${totalErrors}
- Total Warnings: ${totalWarnings}

## Top Errors
${this.getTopErrors(results)}

## Recommendations
1. Improve prompt for better semantic classification
2. Add more keywords to ontology
3. Fix data loss issues in pipeline stages
`;

    const reportPath = path.join(outputDir, 'REPORT.md');
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`\n[Report saved] ${reportPath}`);
  }

  /**
   * Get top errors
   */
  private getTopErrors(results: TestResult[]): string {
    const errorCounts: Record<string, number> = {};

    for (const result of results) {
      for (const error of result.errors) {
        errorCounts[error.type] = (errorCounts[error.type] || 0) + 1;
      }
    }

    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([type, count]) => `- ${type}: ${count}`)
      .join('\n');
  }
}

/**
 * Create tester
 */
export function createFullPipelineTester(config: TestConfig): FullPipelineTester {
  return new FullPipelineTester(config);
}
