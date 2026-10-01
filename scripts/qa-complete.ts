/**
 * Complete QA Test for BrightOne Pipeline
 * Tests: DOCX, PDF, Image parsing and performance
 *
 * Run with: npx tsx scripts/qa-complete.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { parseDocument, requiresAPI, brightOneAdapter } from '../src/core/document-adapters';

interface TestResult {
  type: string;
  file: string;
  success: boolean;
  requiresAPI: boolean;
  processingTime?: number;
  error?: string;
  document?: {
    title: string;
    sourceType: string;
    sections: number;
    activities: number;
    paragraphs: number;
    wordCount: number;
  };
  tokens?: number;
  cost?: number;
}

const TEST_RESULTS: TestResult[] = [];

async function testDOCX() {
  console.log('\n========== TEST: DOCX ==========');
  const filePath = path.join(__dirname, '../uploads/lesson-plans/1782564564592-Tuan1_Bai1_ThongTinVaDuLieu.docx');

  if (!fs.existsSync(filePath)) {
    console.log('DOCX file not found');
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const fileName = 'Tuan1_Bai1_ThongTinVaDuLieu.docx';
  const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  console.log('Testing:', fileName);
  const startTime = Date.now();
  const result = await parseDocument(buffer, fileName, mimeType);
  const elapsed = Date.now() - startTime;

  const testResult: TestResult = {
    type: 'DOCX',
    file: fileName,
    success: result.success,
    requiresAPI: requiresAPI(fileName, mimeType),
    processingTime: elapsed,
    error: result.error,
  };

  if (result.document) {
    testResult.document = {
      title: result.document.title,
      sourceType: result.document.sourceType,
      sections: result.document.sections?.length || 0,
      activities: result.document.sections?.reduce((sum, s) => sum + (s.activities?.length || 0), 0) || 0,
      paragraphs: result.document.sections?.reduce((sum, s) =>
        sum + s.activities?.reduce((aSum, a) => aSum + (a.paragraphs?.length || 0), 0), 0) || 0,
      wordCount: result.document.metadata?.wordCount || 0,
    };
  }

  TEST_RESULTS.push(testResult);

  console.log('Success:', result.success);
  console.log('Processing Time:', elapsed, 'ms');
  if (result.document) {
    console.log('Source Type:', result.document.sourceType);
    console.log('Sections:', testResult.document?.sections);
    console.log('Activities:', testResult.document?.activities);
    console.log('Word Count:', testResult.document?.wordCount);
  }
}

async function testPDF(filePath: string, fileName: string) {
  console.log(`\n========== TEST: PDF - ${fileName} ==========`);

  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  console.log('File size:', buffer.length, 'bytes');

  const startTime = Date.now();
  const result = await brightOneAdapter.parse(buffer, fileName);
  const elapsed = Date.now() - startTime;

  const testResult: TestResult = {
    type: 'PDF',
    file: fileName,
    success: result.success,
    requiresAPI: true,
    processingTime: elapsed,
    error: result.error,
    tokens: result.tokens,
    cost: result.cost,
  };

  if (result.document) {
    testResult.document = {
      title: result.document.title,
      sourceType: result.document.sourceType,
      sections: result.document.sections?.length || 0,
      activities: result.document.sections?.reduce((sum, s) => sum + (s.activities?.length || 0), 0) || 0,
      paragraphs: result.document.sections?.reduce((sum, s) =>
        sum + s.activities?.reduce((aSum, a) => aSum + (a.paragraphs?.length || 0), 0), 0) || 0,
      wordCount: result.document.metadata?.wordCount || 0,
    };
  }

  TEST_RESULTS.push(testResult);

  console.log('Success:', result.success);
  console.log('Processing Time:', elapsed, 'ms');
  console.log('Tokens:', result.tokens);
  console.log('Cost:', result.cost);
  if (result.document) {
    console.log('Source Type:', result.document.sourceType);
    console.log('Sections:', testResult.document?.sections);
    console.log('Word Count:', testResult.document?.wordCount);
  }
}

async function testImage(filePath: string, fileName: string) {
  console.log(`\n========== TEST: IMAGE - ${fileName} ==========`);

  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  console.log('File size:', buffer.length, 'bytes');

  const startTime = Date.now();
  const result = await brightOneAdapter.parse(buffer, fileName);
  const elapsed = Date.now() - startTime;

  const testResult: TestResult = {
    type: 'IMAGE',
    file: fileName,
    success: result.success,
    requiresAPI: true,
    processingTime: elapsed,
    error: result.error,
    tokens: result.tokens,
    cost: result.cost,
  };

  if (result.document) {
    testResult.document = {
      title: result.document.title,
      sourceType: result.document.sourceType,
      sections: result.document.sections?.length || 0,
      activities: result.document.sections?.reduce((sum, s) => sum + (s.activities?.length || 0), 0) || 0,
      paragraphs: result.document.sections?.reduce((sum, s) =>
        sum + s.activities?.reduce((aSum, a) => aSum + (a.paragraphs?.length || 0), 0), 0) || 0,
      wordCount: result.document.metadata?.wordCount || 0,
    };
  }

  TEST_RESULTS.push(testResult);

  console.log('Success:', result.success);
  console.log('Processing Time:', elapsed, 'ms');
  console.log('Tokens:', result.tokens);
  console.log('Cost:', result.cost);
  if (result.document) {
    console.log('Source Type:', result.document.sourceType);
    console.log('Word Count:', testResult.document?.wordCount);
  }
}

async function testRequiresAPI() {
  console.log('\n========== TEST: requiresAPI Detection ==========');

  const testCases = [
    { name: 'test.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', expected: false },
    { name: 'test.doc', mime: 'application/msword', expected: false },
    { name: 'test.pdf', mime: 'application/pdf', expected: true },
    { name: 'test.png', mime: 'image/png', expected: true },
    { name: 'test.jpg', mime: 'image/jpeg', expected: true },
    { name: 'test.webp', mime: 'image/webp', expected: true },
    { name: 'test.bmp', mime: 'image/bmp', expected: true },
    { name: 'test.tiff', mime: 'image/tiff', expected: true },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const result = requiresAPI(tc.name, tc.mime);
    const ok = result === tc.expected;
    if (ok) passed++;
    console.log(`${tc.name}: requiresAPI=${result}, expected=${tc.expected}, ${ok ? '✓' : '✗'}`);
  }
  console.log(`requiresAPI: ${passed}/${testCases.length} passed`);
}

async function runTests() {
  console.log('Starting Complete BrightOne Pipeline QA Tests...');
  console.log('Date:', new Date().toISOString());

  // Test DOCX
  await testDOCX();

  // Test PDF
  const pdfPath = path.join(__dirname, '../public/uploads/circulars/1782614389909-2. Phụ lục 4.pdf');
  await testPDF(pdfPath, '2. Phụ lục 4.pdf');

  // Test Image
  const imgPath = path.join(__dirname, '../node_modules/xlsx/formats.png');
  await testImage(imgPath, 'formats.png');

  // Test requiresAPI
  await testRequiresAPI();

  // Summary
  console.log('\n========== SUMMARY ==========');
  const total = TEST_RESULTS.length;
  const success = TEST_RESULTS.filter(r => r.success).length;
  console.log(`Total: ${total}, Success: ${success}, Failed: ${total - success}`);

  // Save to file
  const outputPath = path.join(__dirname, '../qa-results-complete.json');
  fs.writeFileSync(outputPath, JSON.stringify(TEST_RESULTS, null, 2));
  console.log('\nResults saved to:', outputPath);
}

runTests().catch(console.error);
