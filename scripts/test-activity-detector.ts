/**
 * Test Clean ActivityDetector Module
 *
 * Verify the new algorithm:
 * Heading opens Activity
 * Gather ALL paragraphs until next Heading
 * Create ActivityIR with heading + all paragraphs
 */

import { ActivityDetector, createActivityDetector } from '../src/core/semantic/ActivityDetector';
import { ParagraphIR, HeadingIR, LayoutIR } from '../src/core/semantic/types';

function testActivityDetector() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CLEAN ACTIVITY DETECTOR');
  console.log('='.repeat(80));

  // Create mock paragraphs
  const paragraphs: ParagraphIR[] = [
    { id: 'p0', content: 'Môn học: Tập đọc', type: 'heading', pageId: 'page_1', blockId: 'b0', lineNumber: 0, readingOrder: 0, headingLevel: 1 },
    { id: 'p1', content: 'Lớp: 3', type: 'heading', pageId: 'page_1', blockId: 'b1', lineNumber: 1, readingOrder: 1, headingLevel: 1 },
    { id: 'p2', content: 'Bài học: NGÀY GẶP LẠI', type: 'heading', pageId: 'page_1', blockId: 'b2', lineNumber: 2, readingOrder: 2, headingLevel: 1 },
    { id: 'p3', content: '60 tiết / 1 tiết', type: 'text', pageId: 'page_1', blockId: 'b3', lineNumber: 3, readingOrder: 3 },
    { id: 'p4', content: 'Thời gian thực hiện: ngày 6 tháng 6 năm 2026', type: 'text', pageId: 'page_1', blockId: 'b4', lineNumber: 4, readingOrder: 4 },
    { id: 'p5', content: 'I - Yêu cầu cần đạt', type: 'heading', pageId: 'page_1', blockId: 'b5', lineNumber: 5, readingOrder: 5, headingLevel: 2 },
    { id: 'p6', content: '1. Kiến thức kĩ năng', type: 'heading', pageId: 'page_1', blockId: 'b6', lineNumber: 6, readingOrder: 6, headingLevel: 3 },
    { id: 'p7', content: 'Sau bài học, học sinh có thể:', type: 'text', pageId: 'page_1', blockId: 'b7', lineNumber: 7, readingOrder: 7 },
    { id: 'p8', content: '2. Năng lực', type: 'heading', pageId: 'page_1', blockId: 'b8', lineNumber: 8, readingOrder: 8, headingLevel: 3 },
    { id: 'p9', content: 'Qua bài học, học sinh có cơ hội hình thành...', type: 'text', pageId: 'page_1', blockId: 'b9', lineNumber: 9, readingOrder: 9 },
    { id: 'p10', content: '2.1: Năng lực chung', type: 'heading', pageId: 'page_1', blockId: 'b10', lineNumber: 10, readingOrder: 10, headingLevel: 4 },
    { id: 'p11', content: '2.2. Năng lực đặc thù', type: 'heading', pageId: 'page_1', blockId: 'b11', lineNumber: 11, readingOrder: 11, headingLevel: 4 },
    { id: 'p12', content: 'Học sinh được phát triển năng lực ngôn ngữ...', type: 'text', pageId: 'page_1', blockId: 'b12', lineNumber: 12, readingOrder: 12 },
  ];

  // Create mock headings
  const headings: HeadingIR[] = paragraphs
    .filter(p => p.type === 'heading')
    .map(p => ({
      id: `h_${p.id}`,
      text: p.content,
      level: p.headingLevel || 1,
      pageId: p.pageId,
      blockId: p.blockId,
      readingOrder: p.readingOrder,
      isActivityHeading: false,
    }));

  // Run ActivityDetector
  const detector = createActivityDetector({
    minParagraphsForActivity: 1,
    includeEmptyActivities: true,
  });

  console.log('\n--- INPUT ---');
  console.log(`Paragraphs: ${paragraphs.length}`);
  console.log(`Headings: ${headings.length}`);

  const result = detector.detect(paragraphs, headings);

  console.log('\n--- OUTPUT ---');
  console.log(`Total Activities: ${result.activities.length}`);
  console.log(`Unmapped Paragraphs: ${result.unmappedParagraphs.length}`);

  // Print validation table
  console.log('\n--- VALIDATION TABLE ---');
  console.log('| Activity | Heading | Paragraph Count | Expected | Actual | Status |');
  console.log('|----------|---------|-----------------|----------|--------|--------|');

  for (const activity of result.activities) {
    const count = activity.paragraphIds.length;
    const status = count < 2 ? '❌ CRITICAL' : '✅ OK';
    const heading = activity.title?.substring(0, 25).padEnd(24);
    console.log(`| ${heading} | Yes | ${count} | >=2 | ${count} | ${status} |`);
  }

  // Summary
  const singlePara = result.activities.filter(a => a.paragraphIds.length === 1).length;
  const multiPara = result.activities.filter(a => a.paragraphIds.length >= 2).length;

  console.log('\n--- SUMMARY ---');
  console.log(`Activities with 1 paragraph: ${singlePara}`);
  console.log(`Activities with 2+ paragraphs: ${multiPara}`);
  console.log(`Success rate: ${((multiPara / result.activities.length) * 100).toFixed(1)}%`);

  if (singlePara > 0) {
    console.log('\n❌ STILL HAS ISSUES - Activities with only 1 paragraph');
    for (const a of result.activities.filter(a => a.paragraphIds.length === 1)) {
      console.log(`  - ${a.title}: ${a.paragraphIds.length} para`);
    }
  } else {
    console.log('\n✅ ALL ACTIVITIES HAVE 2+ PARAGRAPHS');
  }
}

testActivityDetector();
