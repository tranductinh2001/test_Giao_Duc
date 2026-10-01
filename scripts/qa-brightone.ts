/**
 * QA Test Script for BrightOne Pipeline
 * Tests: DOCX, PDF, Image parsing
 *
 * Run with: npx tsx scripts/qa-brightone.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseDocument, requiresAPI } from '../src/core/document-adapters';

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
}

const TEST_RESULTS: TestResult[] = [];

async function testDOCX() {
  console.log('\n========== TEST: DOCX ==========');
  const filePath = path.join(__dirname, '../uploads/lesson-plans/1782564564592-Tuan1_Bai1_ThongTinVaDuLieu.docx');

  if (!fs.existsSync(filePath)) {
    console.log('DOCX file not found:', filePath);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const fileName = 'Tuan1_Bai1_ThongTinVaDuLieu.docx';
  const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  console.log('Testing:', fileName);
  console.log('requiresAPI:', requiresAPI(fileName, mimeType));

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
    console.log('Paragraphs:', testResult.document?.paragraphs);
    console.log('Word Count:', testResult.document?.wordCount);
  }
  if (result.error) console.log('Error:', result.error);
}

async function testImageOCR() {
  console.log('\n========== TEST: Image OCR (API Check) ==========');

  const testCases = [
    { name: 'test.png', mime: 'image/png' },
    { name: 'test.jpg', mime: 'image/jpeg' },
    { name: 'test.jpeg', mime: 'image/jpeg' },
    { name: 'test.webp', mime: 'image/webp' },
    { name: 'test.bmp', mime: 'image/bmp' },
    { name: 'test.tiff', mime: 'image/tiff' },
  ];

  for (const tc of testCases) {
    const needsAPI = requiresAPI(tc.name, tc.mime);
    console.log(`${tc.name} (${tc.mime}): requiresAPI = ${needsAPI}`);

    TEST_RESULTS.push({
      type: 'IMAGE',
      file: tc.name,
      success: true, // Just checking requiresAPI
      requiresAPI: needsAPI,
      error: undefined,
    });
  }
}

async function testPDFCheck() {
  console.log('\n========== TEST: PDF (API Check) ==========');

  const testCases = [
    { name: 'test.pdf', mime: 'application/pdf' },
  ];

  for (const tc of testCases) {
    const needsAPI = requiresAPI(tc.name, tc.mime);
    console.log(`${tc.name} (${tc.mime}): requiresAPI = ${needsAPI}`);

    TEST_RESULTS.push({
      type: 'PDF',
      file: tc.name,
      success: true,
      requiresAPI: needsAPI,
      error: undefined,
    });
  }
}

async function runTests() {
  console.log('Starting BrightOne Pipeline QA Tests...');
  console.log('Date:', new Date().toISOString());
  console.log('Node version:', process.version);

  await testDOCX();
  await testPDFCheck();
  await testImageOCR();

  console.log('\n========== SUMMARY ==========');
  console.log(JSON.stringify(TEST_RESULTS, null, 2));

  // Save to file
  const outputPath = path.join(__dirname, '../qa-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(TEST_RESULTS, null, 2));
  console.log('\nResults saved to:', outputPath);
}

runTests().catch(console.error);
