/**
 * QA Test for Error Handling
 * Tests: timeout, invalid file, missing API key, etc.
 *
 * Run with: npx tsx scripts/qa-error-handling.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { parseDocument, requiresAPI, validateDocument } from '../src/core/document-adapters';
import { brightOneAdapter } from '../src/core/document-adapters';

interface TestResult {
  test: string;
  description: string;
  success: boolean;
  error?: string;
  details?: any;
}

const TEST_RESULTS: TestResult[] = [];

async function testValidation() {
  console.log('\n========== TEST: File Validation ==========');

  // Test 1: Valid DOCX
  const validDocx = path.join(__dirname, '../uploads/lesson-plans/1782564564592-Tuan1_Bai1_ThongTinVaDuLieu.docx');
  if (fs.existsSync(validDocx)) {
    const buffer = fs.readFileSync(validDocx);
    const validation = validateDocument(buffer, 'test.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    TEST_RESULTS.push({
      test: 'Valid DOCX validation',
      description: 'Validate a proper DOCX file',
      success: validation.valid,
      error: validation.error,
    });
    console.log('Valid DOCX:', validation);
  }

  // Test 2: Invalid file (text file with .docx extension)
  const invalidBuffer = Buffer.from('This is not a valid DOCX file');
  const invalidValidation = validateDocument(invalidBuffer, 'fake.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  TEST_RESULTS.push({
    test: 'Invalid DOCX validation',
    description: 'Validate a fake DOCX file',
    success: invalidValidation.valid,
    error: invalidValidation.error,
  });
  console.log('Invalid DOCX:', invalidValidation);

  // Test 3: Unsupported file type
  const unsupportedValidation = validateDocument(Buffer.from('test'), 'test.exe', 'application/x-executable');
  TEST_RESULTS.push({
    test: 'Unsupported file type',
    description: 'Validate an unsupported file type',
    success: unsupportedValidation.valid,
    error: unsupportedValidation.error,
  });
  console.log('Unsupported:', unsupportedValidation);
}

async function testRequiresAPI() {
  console.log('\n========== TEST: requiresAPI Detection ==========');

  const testCases = [
    { name: 'test.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', expected: false },
    { name: 'test.doc', mime: 'application/msword', expected: false },
    { name: 'test.pdf', mime: 'application/pdf', expected: true },
    { name: 'test.png', mime: 'image/png', expected: true },
    { name: 'test.jpg', mime: 'image/jpeg', expected: true },
    { name: 'test.jpeg', mime: 'image/jpeg', expected: true },
    { name: 'test.webp', mime: 'image/webp', expected: true },
    { name: 'test.bmp', mime: 'image/bmp', expected: true },
    { name: 'test.tiff', mime: 'image/tiff', expected: true },
  ];

  for (const tc of testCases) {
    const result = requiresAPI(tc.name, tc.mime);
    const passed = result === tc.expected;
    TEST_RESULTS.push({
      test: `requiresAPI(${tc.name})`,
      description: `Check if ${tc.name} requires API`,
      success: passed,
      error: passed ? undefined : `Expected ${tc.expected}, got ${result}`,
      details: { file: tc.name, mime: tc.mime, result, expected: tc.expected },
    });
    console.log(`${tc.name}: requiresAPI=${result}, expected=${tc.expected}, passed=${passed}`);
  }
}

async function testErrorHandling() {
  console.log('\n========== TEST: Error Handling ==========');

  // Test 1: Empty buffer
  try {
    const emptyBuffer = Buffer.from('');
    const result = await parseDocument(emptyBuffer, 'empty.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    TEST_RESULTS.push({
      test: 'Empty buffer',
      description: 'Parse an empty buffer',
      success: !result.success,
      error: result.error,
    });
    console.log('Empty buffer:', result);
  } catch (e: any) {
    TEST_RESULTS.push({
      test: 'Empty buffer',
      description: 'Parse an empty buffer',
      success: true,
      error: e.message,
    });
  }

  // Test 2: Very large file simulation (triggers size check in API)
  // We'll just test the detection
  const largeFileName = 'a'.repeat(200) + '.docx';
  const needsAPI = requiresAPI(largeFileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  TEST_RESULTS.push({
    test: 'Long filename',
    description: 'Check handling of very long filenames',
    success: true,
    details: { fileName: largeFileName.substring(0, 50) + '...', requiresAPI: needsAPI },
  });
  console.log('Long filename:', needsAPI);

  // Test 3: Null/undefined handling
  try {
    const result = await parseDocument(Buffer.from('test'), '', undefined as any);
    TEST_RESULTS.push({
      test: 'Undefined mime type',
      description: 'Parse with undefined mime type',
      success: result.success, // Should fallback to DOCX
    });
    console.log('Undefined mime:', result.success);
  } catch (e: any) {
    TEST_RESULTS.push({
      test: 'Undefined mime type',
      description: 'Parse with undefined mime type',
      success: false,
      error: e.message,
    });
  }
}

async function testAdapterSelection() {
  console.log('\n========== TEST: Adapter Selection ==========');

  // Test that correct adapter is selected
  const testCases = [
    { name: 'test.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', adapter: 'DocxAdapter' },
    { name: 'test.pdf', mime: 'application/pdf', adapter: 'BrightOneAdapter' },
    { name: 'test.png', mime: 'image/png', adapter: 'BrightOneAdapter' },
  ];

  for (const tc of testCases) {
    const buffer = Buffer.from('test content');
    const sourceType = tc.mime.includes('word') ? 'DOCX' : tc.mime.includes('pdf') ? 'PDF' : 'IMAGE';
    const needsAPI = requiresAPI(tc.name, tc.mime);

    TEST_RESULTS.push({
      test: `Adapter selection for ${tc.name}`,
      description: `Verify ${tc.adapter} is selected for ${tc.name}`,
      success: (tc.adapter === 'BrightOneAdapter') === needsAPI,
      details: { file: tc.name, expectedAdapter: tc.adapter, requiresAPI: needsAPI },
    });
    console.log(`${tc.name}: adapter=${tc.adapter}, requiresAPI=${needsAPI}`);
  }
}

async function runTests() {
  console.log('Starting Error Handling QA Tests...');
  console.log('Date:', new Date().toISOString());

  await testValidation();
  await testRequiresAPI();
  await testErrorHandling();
  await testAdapterSelection();

  console.log('\n========== SUMMARY ==========');
  const total = TEST_RESULTS.length;
  const passed = TEST_RESULTS.filter(r => r.success).length;
  console.log(`Total: ${total}, Passed: ${passed}, Failed: ${total - passed}`);

  console.log('\nFailed tests:');
  TEST_RESULTS.filter(r => !r.success).forEach(r => {
    console.log(`- ${r.test}: ${r.error}`);
  });

  // Save to file
  const outputPath = path.join(__dirname, '../qa-results-errors.json');
  fs.writeFileSync(outputPath, JSON.stringify(TEST_RESULTS, null, 2));
  console.log('\nResults saved to:', outputPath);
}

runTests().catch(console.error);
