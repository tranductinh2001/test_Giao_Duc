import 'dotenv/config';

/**
 * QA Test for BrightOne API with actual files
 * Tests PDF and Image OCR
 *
 * Run with: npx tsx scripts/qa-brightone-api.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { brightOneAdapter } from '../src/core/document-adapters';

interface TestResult {
  type: string;
  file: string;
  success: boolean;
  processingTime?: number;
  error?: string;
  document?: {
    title: string;
    sourceType: string;
    sections: number;
    activities: number;
    paragraphs: number;
    wordCount: number;
    rawMarkdown?: string;
  };
  tokens?: number;
  cost?: number;
}

const TEST_RESULTS: TestResult[] = [];

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
      rawMarkdown: result.document.rawMarkdown?.substring(0, 500),
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
    if (result.document.rawMarkdown) {
      console.log('Raw Markdown (first 500 chars):', result.document.rawMarkdown.substring(0, 500));
    }
  }
  if (result.error) console.log('Error:', result.error);
}

async function testImage(filePath: string, fileName: string, mimeType: string) {
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
      rawMarkdown: result.document.rawMarkdown?.substring(0, 500),
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
    if (result.document.rawMarkdown) {
      console.log('Raw Markdown (first 500 chars):', result.document.rawMarkdown.substring(0, 500));
    }
  }
  if (result.error) console.log('Error:', result.error);
}

async function runTests() {
  console.log('Starting BrightOne API QA Tests...');
  console.log('Date:', new Date().toISOString());

  // Test PDF - use existing PDF from uploads
  const pdfPath = path.join(__dirname, '../public/uploads/circulars/1782614389909-2. Phụ lục 4.pdf');
  await testPDF(pdfPath, '2. Phụ lục 4.pdf');

  // Test Image - use existing image
  const imgPath = path.join(__dirname, '../node_modules/xlsx/formats.png');
  await testImage(imgPath, 'formats.png', 'image/png');

  console.log('\n========== SUMMARY ==========');
  console.log(JSON.stringify(TEST_RESULTS, null, 2));

  // Save to file
  const outputPath = path.join(__dirname, '../qa-results-api.json');
  fs.writeFileSync(outputPath, JSON.stringify(TEST_RESULTS, null, 2));
  console.log('\nResults saved to:', outputPath);
}

runTests().catch(console.error);
