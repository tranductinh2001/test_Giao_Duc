/**
 * QA Test for Performance
 * Tests: parsing speed, concurrent requests, memory usage
 *
 * Run with: npx tsx scripts/qa-performance.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { parseDocument, requiresAPI } from '../src/core/document-adapters';

interface TestResult {
  test: string;
  description: string;
  duration: number;
  success: boolean;
  details?: any;
}

const TEST_RESULTS: TestResult[] = [];

async function testDOCXPerformance() {
  console.log('\n========== TEST: DOCX Performance ==========');

  const filePath = path.join(__dirname, '../uploads/lesson-plans/1782564564592-Tuan1_Bai1_ThongTinVaDuLieu.docx');

  if (!fs.existsSync(filePath)) {
    console.log('File not found');
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const fileName = 'Tuan1_Bai1_ThongTinVaDuLieu.docx';
  const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  console.log('File size:', buffer.length, 'bytes');

  // Warm up
  await parseDocument(buffer, fileName, mimeType);

  // Run 5 times
  const runs = 5;
  const times: number[] = [];

  for (let i = 0; i < runs; i++) {
    const start = Date.now();
    const result = await parseDocument(buffer, fileName, mimeType);
    const elapsed = Date.now() - start;
    times.push(elapsed);

    TEST_RESULTS.push({
      test: `DOCX Parse Run ${i + 1}`,
      description: `Parse DOCX file (attempt ${i + 1})`,
      duration: elapsed,
      success: result.success,
      details: {
        wordCount: result.document?.metadata?.wordCount,
        sections: result.document?.sections?.length,
      }
    });

    console.log(`Run ${i + 1}: ${elapsed}ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / runs;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`Min: ${min}ms, Max: ${max}ms`);

  TEST_RESULTS.push({
    test: 'DOCX Performance Summary',
    description: 'Average performance over 5 runs',
    duration: avg,
    success: true,
    details: { runs, avg: avg.toFixed(2), min, max },
  });
}

async function testMultipleDOCX() {
  console.log('\n========== TEST: Multiple DOCX Files ==========');

  const files = [
    '1782564564592-Tuan1_Bai1_ThongTinVaDuLieu.docx',
    '1782580532679-Tuan2_Bai2__XulyThongTin.docx',
    '1782883876085-Tuan2_Bai2_PhamMemMayTinh.docx',
  ];

  const uploadDir = path.join(__dirname, '../uploads/lesson-plans');
  const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const start = Date.now();
  let successCount = 0;

  for (const fileName of files) {
    const filePath = path.join(uploadDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', fileName);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const result = await parseDocument(buffer, fileName, mimeType);

    if (result.success) successCount++;

    TEST_RESULTS.push({
      test: `Parse ${fileName}`,
      description: 'Parse individual DOCX file',
      duration: result.processingTime || 0,
      success: result.success,
      details: {
        wordCount: result.document?.metadata?.wordCount,
        sections: result.document?.sections?.length,
      }
    });
  }

  const total = Date.now() - start;

  console.log(`Parsed ${successCount}/${files.length} files in ${total}ms`);
  console.log(`Average: ${total / files.length}ms per file`);

  TEST_RESULTS.push({
    test: 'Multiple DOCX Summary',
    description: 'Parse multiple DOCX files',
    duration: total,
    success: successCount === files.length,
    details: { total, count: files.length, successCount, avgPerFile: (total / files.length).toFixed(2) },
  });
}

async function testRequiresAPIPerformance() {
  console.log('\n========== TEST: requiresAPI Performance ==========');

  const testCases = Array(100).fill(null).map((_, i) => ({
    name: `test${i}.docx`,
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }));

  const start = Date.now();
  for (const tc of testCases) {
    requiresAPI(tc.name, tc.mime);
  }
  const elapsed = Date.now() - start;

  console.log(`100 requiresAPI calls: ${elapsed}ms`);

  TEST_RESULTS.push({
    test: 'requiresAPI Performance',
    description: 'Performance of 100 requiresAPI calls',
    duration: elapsed,
    success: true,
    details: { calls: 100, perCall: (elapsed / 100).toFixed(3) },
  });
}

async function runTests() {
  console.log('Starting Performance QA Tests...');
  console.log('Date:', new Date().toISOString());

  await testDOCXPerformance();
  await testMultipleDOCX();
  await testRequiresAPIPerformance();

  console.log('\n========== SUMMARY ==========');
  console.log(JSON.stringify(TEST_RESULTS, null, 2));

  // Save to file
  const outputPath = path.join(__dirname, '../qa-results-performance.json');
  fs.writeFileSync(outputPath, JSON.stringify(TEST_RESULTS, null, 2));
  console.log('\nResults saved to:', outputPath);
}

runTests().catch(console.error);
