/**
 * DocumentIR Pipeline Test Script
 *
 * Chạy test trên các file PDF có sẵn trong thư mục uploads/lesson-plans.
 * KHÔNG sửa code - chỉ chạy, log, đánh giá, báo cáo.
 *
 * Usage: npx tsx scripts/test-document-ir-pipeline.ts --limit=10
 */

import 'dotenv/config';
import { brightOneVisionAdapter } from '@/core/document-adapters';
import { AIDocumentParserPipeline } from '@/core/rule-engine-v2/parsers/AIDocumentParserPipeline';
import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'lesson-plans');
const OUTPUT_DIR = path.join(process.cwd(), 'outputs', 'pipeline-test');
const MAX_FILES = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '10');

interface StageLog {
  stage: number;
  name: string;
  inputCount: number;
  outputCount: number;
  lostIds: string[];
  timeMs: number;
}

interface TestResult {
  lessonPlanId: string;
  title: string;
  filename: string;
  success: boolean;
  stages: StageLog[];
  coverage: number;
  unknownRate: number;
  errors: string[];
  warnings: string[];
  paragraphs: { id: string; content: string; predicted: string }[];
}

async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('DOCUMENT IR PIPELINE TEST');
  console.log(`Max files: ${MAX_FILES}`);
  console.log('='.repeat(80));

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get PDF files from uploads directory
  let files: string[] = [];
  if (fs.existsSync(UPLOADS_DIR)) {
    files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => f.endsWith('.pdf'))
      .slice(0, MAX_FILES);
  }

  console.log(`\nFound ${files.length} PDF files to test\n`);

  const results: TestResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    console.log(`\n[${i + 1}/${files.length}] Testing: ${filename}`);

    const result = await testFile(filename);
    results.push(result);

    // Save result
    const resultPath = path.join(OUTPUT_DIR, `${filename}_result.json`);
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`  [Saved] ${resultPath}`);
  }

  // Generate summary report
  generateReport(results);

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

async function testFile(filename: string): Promise<TestResult> {
  const fullPath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(fullPath)) {
    return {
      lessonPlanId: filename,
      title: filename,
      filename,
      success: false,
      stages: [],
      coverage: 0,
      unknownRate: 100,
      errors: ['File not found'],
      warnings: [],
      paragraphs: [],
    };
  }

  return testLessonPlan(filename, filename, fullPath);
}

async function testLessonPlan(
  lessonPlanId: string,
  title: string,
  filePath: string | null
): Promise<TestResult> {
  const stages: StageLog[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const paragraphs: { id: string; content: string; predicted: string }[] = [];

  const startTime = Date.now();

  try {
    // Stage 0: Load file
    console.log('\n  --- Stage 0: Load File ---');
    const stage0Start = Date.now();
    let fileBuffer: Buffer | null = null;

    if (filePath) {
      const fullPath = filePath.startsWith('/uploads')
        ? path.join(process.cwd(), filePath)
        : filePath;
      try {
        fileBuffer = await fs.promises.readFile(fullPath);
      } catch (e) {
        errors.push(`Cannot read file: ${e}`);
      }
    }
    const stage0Time = Date.now() - stage0Start;
    stages.push({ stage: 0, name: 'Load', inputCount: 0, outputCount: 0, lostIds: [], timeMs: stage0Time });
    console.log(`    Time: ${stage0Time}ms`);

    if (!fileBuffer) {
      return { lessonPlanId, title, filename: filePath || '', success: false, stages, coverage: 0, unknownRate: 100, errors, warnings, paragraphs };
    }

    // Stage 1: Vision Parse
    console.log('\n  --- Stage 1: Vision Parse ---');
    const stage1Start = Date.now();
    const visionResult = await brightOneVisionAdapter.parse(fileBuffer, title);
    const stage1Time = Date.now() - stage1Start;

    const visionParagraphs = countVisionParagraphs(visionResult);
    stages.push({
      stage: 1,
      name: 'Vision',
      inputCount: 0,
      outputCount: visionParagraphs,
      lostIds: [],
      timeMs: stage1Time,
    });
    console.log(`    Paragraphs: ${visionParagraphs}`);
    console.log(`    Time: ${stage1Time}ms`);

    if (!visionResult.success || !visionResult.document) {
      errors.push(`Vision failed: ${visionResult.error}`);
      return { lessonPlanId, title, filename: filePath || '', success: false, stages, coverage: 0, unknownRate: 100, errors, warnings, paragraphs };
    }

    // Stage 2: Convert to VisionData
    console.log('\n  --- Stage 2: Convert to VisionData ---');
    const stage2Start = Date.now();
    const visionData = convertToVisionData(visionResult.document);
    const stage2Time = Date.now() - stage2Start;

    const convertedParagraphs = visionData.activities?.reduce((sum: number, a: any) => sum + (a.paragraphs?.length || 0), 0) || 0;
    stages.push({
      stage: 2,
      name: 'Convert',
      inputCount: visionParagraphs,
      outputCount: convertedParagraphs,
      lostIds: [],
      timeMs: stage2Time,
    });
    console.log(`    Paragraphs: ${convertedParagraphs}`);
    console.log(`    Time: ${stage2Time}ms`);

    // Stage 3: Semantic Parse (AI)
    console.log('\n  --- Stage 3: Semantic Parse (AI) ---');
    const stage3Start = Date.now();
    const semanticParser = new AIDocumentParserPipeline();

    const parseResult = await semanticParser.parse({
      visionData: visionData,
      documentTitle: title,
    });
    const stage3Time = Date.now() - stage3Start;

    // Count parsed results
    let parsedParagraphs = 0;
    let parsedLabels = 0;
    let unknownCount = 0;

    if (parseResult.success && parseResult.sections) {
      for (const section of parseResult.sections) {
        parsedParagraphs += section.paragraphs?.length || 0;
        for (const activity of section.activities || []) {
          parsedParagraphs += activity.paragraphs?.length || 0;

          // Count labels
          parsedLabels += (activity.teacherActions?.length || 0);
          parsedLabels += (activity.studentActions?.length || 0);
          parsedLabels += (activity.products?.length || 0);
          parsedLabels += (activity.assessments?.length || 0);
          parsedLabels += (activity.questions?.length || 0);

          // Collect paragraph info
          for (const p of activity.paragraphs || []) {
            paragraphs.push({
              id: p.id,
              content: p.content?.substring(0, 100) || '',
              predicted: getParagraphType(p),
            });
          }
        }
      }
    }

    stages.push({
      stage: 3,
      name: 'Semantic',
      inputCount: convertedParagraphs,
      outputCount: parsedLabels,
      lostIds: convertedParagraphs > parsedLabels ? [''] : [],
      timeMs: stage3Time,
    });
    console.log(`    Labels: ${parsedLabels}`);
    console.log(`    Unknown: ${unknownCount}`);
    console.log(`    Time: ${stage3Time}ms`);

    if (!parseResult.success) {
      errors.push(`Semantic failed: ${parseResult.error}`);
    }

    // Calculate coverage
    const coverage = convertedParagraphs > 0 ? (parsedLabels / convertedParagraphs) * 100 : 0;
    const unknownRate = parsedLabels > 0 ? (unknownCount / parsedLabels) * 100 : 0;

    const totalTime = Date.now() - startTime;
    console.log(`\n  --- Summary ---`);
    console.log(`    Total Time: ${totalTime}ms`);
    console.log(`    Coverage: ${coverage.toFixed(1)}%`);
    console.log(`    Errors: ${errors.length}`);

    return {
      lessonPlanId,
      title,
      filename: filePath || '',
      success: errors.length === 0,
      stages,
      coverage,
      unknownRate,
      errors,
      warnings,
      paragraphs,
    };

  } catch (error: any) {
    errors.push(`Exception: ${error.message}`);
    return {
      lessonPlanId,
      title,
      filename: filePath || '',
      success: false,
      stages,
      coverage: 0,
      unknownRate: 100,
      errors,
      warnings,
      paragraphs,
    };
  }
}

function countVisionParagraphs(visionResult: any): number {
  let count = 0;
  if (visionResult.document?.sections) {
    for (const section of visionResult.document.sections) {
      if (section.activities) {
        for (const activity of section.activities) {
          count += activity.paragraphs?.length || 0;
        }
      }
    }
  }
  return count;
}

function convertToVisionData(document: any): any {
  const visionData: any = {
    pages: [],
    blocks: [],
    sections: [],
    tables: [],
    images: [],
    metadata: document.metadata,
  };

  // Convert sections
  if (document.sections) {
    for (const section of document.sections) {
      visionData.sections.push({
        id: section.id,
        title: section.title,
        code: section.type,
        pageStart: section.pageStart,
        pageEnd: section.pageEnd,
        order: section.order,
      });
    }
  }

  // Convert activities
  const activities: any[] = [];
  if (document.sections) {
    for (const section of document.sections) {
      if (section.activities) {
        for (const activity of section.activities) {
          activities.push({
            id: activity.id,
            title: activity.title,
            sectionId: section.id,
            sectionTitle: section.title,
            pageNumbers: activity.pageNumbers || [],
            paragraphCount: activity.paragraphs?.length || 0,
            paragraphs: activity.paragraphs?.map((p: any) => ({
              id: p.id,
              content: p.content,
              isHeading: p.isHeading,
              headingLevel: p.headingLevel,
              pageNumber: p.pageNumber,
            })) || [],
          });
        }
      }
    }
  }
  visionData.activities = activities;

  // Build pages
  const pageMap = new Map<number, any[]>();
  for (const activity of activities) {
    for (const para of activity.paragraphs || []) {
      const pageNum = para.pageNumber || 1;
      if (!pageMap.has(pageNum)) {
        pageMap.set(pageNum, []);
      }
      pageMap.get(pageNum)!.push({
        id: para.id,
        type: para.isHeading ? 'heading' : 'paragraph',
        content: para.content,
        level: para.headingLevel,
        pageNumber: pageNum,
      });
    }
  }
  visionData.pages = Array.from(pageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageNum, blocks]) => ({
      pageNumber: pageNum,
      elements: blocks,
    }));

  return visionData;
}

function getParagraphType(paragraph: any): string {
  if (paragraph.isHeading) return 'HEADING';
  if (paragraph.teacherActions?.length > 0) return 'TEACHER_ACTION';
  if (paragraph.studentActions?.length > 0) return 'STUDENT_ACTION';
  if (paragraph.products?.length > 0) return 'PRODUCT';
  if (paragraph.assessments?.length > 0) return 'ASSESSMENT';
  if (paragraph.questions?.length > 0) return 'QUESTION';
  return 'UNKNOWN';
}

function generateReport(results: TestResult[]): void {
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const avgCoverage = results.reduce((sum, r) => sum + r.coverage, 0) / total;
  const avgUnknown = results.reduce((sum, r) => sum + r.unknownRate, 0) / total;
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  // Collect all errors
  const errorCounts: Record<string, number> = {};
  for (const result of results) {
    for (const error of result.errors) {
      const key = error.substring(0, 50);
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    }
  }

  const topErrors = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const report = `# DocumentIR Pipeline Test Report

## Summary
- **Date:** ${new Date().toISOString()}
- **Total Files:** ${total}
- **Successful:** ${successful}
- **Failed:** ${total - successful}
- **Success Rate:** ${((successful / total) * 100).toFixed(1)}%

## Coverage
- **Average Coverage:** ${avgCoverage.toFixed(1)}%
- **Average Unknown Rate:** ${avgUnknown.toFixed(1)}%

## Errors
- **Total Errors:** ${totalErrors}

### Top Errors
${topErrors.map(([error, count]) => `- ${error}: ${count}`).join('\n')}

## Results by File
| File | Status | Coverage | Unknown | Time (ms) |
|------|--------|----------|---------|-----------|
${results.map(r => {
  const totalTime = r.stages.reduce((sum, s) => sum + s.timeMs, 0);
  return `| ${r.title.substring(0, 30)} | ${r.success ? '✅' : '❌'} | ${r.coverage.toFixed(1)}% | ${r.unknownRate.toFixed(1)}% | ${totalTime} |`;
}).join('\n')}

## Stage Performance
${results.slice(0, 3).map(r => `
### ${r.title.substring(0, 30)}
${r.stages.map(s => `- ${s.name}: ${s.timeMs}ms (in: ${s.inputCount}, out: ${s.outputCount})`).join('\n')}
`).join('\n')}

## Recommendations
1. Review failed files for specific issues
2. Improve coverage for files with low coverage
3. Investigate high-unknown-rate files

---
Generated by DocumentIR Pipeline Test Script
`;

  const reportPath = path.join(OUTPUT_DIR, 'REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n[Report saved] ${reportPath}`);
}

main().catch(console.error);
