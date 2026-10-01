/**
 * Activity Detection Audit Script
 *
 * Audit flow: Document → Layout → Section → Paragraph → Activity → Semantic
 * KHÔNG sửa gì - chỉ log và phân tích
 *
 * Usage: npx tsx scripts/audit-activity-detection.ts --limit=1
 */

import 'dotenv/config';
import { brightOneVisionAdapter } from '@/core/document-adapters';
import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'lesson-plans');
const OUTPUT_DIR = path.join(process.cwd(), 'outputs', 'audit-activity');
const MAX_FILES = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '1');

async function main() {
  console.log(`\n${'='.repeat(100)}`);
  console.log('ACTIVITY DETECTION AUDIT');
  console.log('='.repeat(100));

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get PDF files
  let files: string[] = [];
  if (fs.existsSync(UPLOADS_DIR)) {
    files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => f.endsWith('.pdf'))
      .slice(0, MAX_FILES);
  }

  console.log(`\nFound ${files.length} files\n`);

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    console.log(`\n${'='.repeat(100)}`);
    console.log(`AUDITING: ${filename}`);
    console.log('='.repeat(100));

    await auditFile(filename);
  }
}

async function auditFile(filename: string): Promise<void> {
  const fullPath = path.join(UPLOADS_DIR, filename);
  const outputFile = path.join(OUTPUT_DIR, `${filename}_audit.txt`);

  const logs: string[] = [];

  function log(msg: string) {
    console.log(msg);
    logs.push(msg);
  }

  try {
    // Load file
    log(`\n📁 STAGE 0: LOAD FILE`);
    log(`  File: ${filename}`);
    const fileBuffer = fs.readFileSync(fullPath);
    log(`  Size: ${fileBuffer.length} bytes`);

    // STAGE 1: Vision Parse
    log(`\n🔍 STAGE 1: VISION PARSE`);
    log(`  Calling BrightOneVisionAdapter.parse()...`);

    const visionResult = await brightOneVisionAdapter.parse(fileBuffer, filename);

    if (!visionResult.success || !visionResult.document) {
      log(`  ❌ Vision failed: ${visionResult.error}`);
      return;
    }

    const doc = visionResult.document;
    log(`  ✅ Vision success`);
    log(`  Pages: ${doc.metadata?.totalPages}`);
    log(`  Title: ${doc.title || 'N/A'}`);

    // STAGE 2: Layout & Sections
    log(`\n📑 STAGE 2: LAYOUT & SECTIONS`);
    const sections = doc.sections || [];
    log(`  Total Sections: ${sections.length}`);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      log(`\n  Section ${i + 1}:`);
      log(`    ID: ${section.id}`);
      log(`    Title: ${section.title}`);
      log(`    Type: ${section.type}`);
    }

    // STAGE 3: Paragraph Extraction (from Vision)
    log(`\n📝 STAGE 3: PARAGRAPH EXTRACTION (FROM VISION)`);

    const allParagraphs: any[] = [];
    const paraByActivity: Map<string, any[]> = new Map();

    for (const section of sections) {
      const activities = section.activities || [];
      log(`\n  Section: ${section.title}`);
      log(`  Activities in section: ${activities.length}`);

      for (const activity of activities) {
        const paragraphs = activity.paragraphs || [];
        paraByActivity.set(activity.id, paragraphs);

        for (const para of paragraphs) {
          allParagraphs.push({
            ...para,
            activityId: activity.id,
            activityTitle: activity.title,
            sectionTitle: section.title,
          });
        }
      }
    }

    log(`\n  TOTAL PARAGRAPHS (from Vision): ${allParagraphs.length}`);

    // Log each paragraph
    log(`\n  ─────────────────────────────────────────────────────────────────────────`);
    log(`  PARAGRAPH DETAILS`);
    log(`  ─────────────────────────────────────────────────────────────────────────`);

    for (let i = 0; i < allParagraphs.length; i++) {
      const p = allParagraphs[i];
      log(`\n  P${i} [${p.activityTitle?.substring(0, 20)}]`);
      log(`    ID: ${p.id}`);
      log(`    Type: ${p.isHeading ? 'HEADING' : 'PARAGRAPH'}`);
      log(`    Level: ${p.headingLevel || '-'}`);
      log(`    Content: ${(p.content || '').substring(0, 60)}...`);
    }

    // STAGE 4: Activity Detection Analysis
    log(`\n\n🎯 STAGE 4: ACTIVITY DETECTION ANALYSIS`);
    log(`  ─────────────────────────────────────────────────────────────────────────`);

    // Check if activities have proper content
    let activityWithMultipleParagraphs = 0;
    let activityWithSingleParagraph = 0;
    let activityWithZeroParagraphs = 0;

    for (const section of sections) {
      const activities = section.activities || [];

      for (const activity of activities) {
        const paragraphs = activity.paragraphs || [];

        log(`\n  Activity: ${activity.title}`);
        log(`    ID: ${activity.id}`);
        log(`    Paragraph Count: ${paragraphs.length}`);

        if (paragraphs.length === 0) {
          activityWithZeroParagraphs++;
          log(`    ❌ CRITICAL: Zero paragraphs!`);
        } else if (paragraphs.length === 1) {
          activityWithSingleParagraph++;
          log(`    ⚠️  WARNING: Only 1 paragraph`);
          log(`    Paragraph: ${paragraphs[0].content?.substring(0, 50)}...`);
        } else {
          activityWithMultipleParagraphs++;
          log(`    ✅ OK: ${paragraphs.length} paragraphs`);
          log(`    First 3 paragraphs:`);
          paragraphs.slice(0, 3).forEach((p, idx) => {
            log(`      - ${p.content?.substring(0, 50)}...`);
          });
        }
      }
    }

    // STAGE 5: Validation Table
    log(`\n\n📊 STAGE 5: VALIDATION TABLE`);
    log(`  ─────────────────────────────────────────────────────────────────────────`);
    log(`\n  | Activity | Heading | Paragraph Count | Expected | Actual | Status |`);
    log(`  |----------|---------|-----------------|----------|--------|--------|`);

    for (const section of sections) {
      const activities = section.activities || [];
      for (const activity of activities) {
        const count = activity.paragraphs?.length || 0;
        const status = count < 2 ? '❌ CRITICAL' : '✅ OK';
        const heading = activity.title?.substring(0, 25) || 'N/A';

        log(`  | ${heading.padEnd(24)} | ${(count >= 1 ? 'Yes' : 'No').padEnd(7)} | ${String(count).padEnd(15)} | >=2 | ${String(count).padEnd(6)} | ${status} |`);
      }
    }

    // STAGE 6: Algorithm Analysis
    log(`\n\n🔬 STAGE 6: ALGORITHM ANALYSIS`);
    log(`  ─────────────────────────────────────────────────────────────────────────`);
    log(`  Total Activities: ${sections.reduce((sum, s) => sum + (s.activities?.length || 0), 0)}`);
    log(`  Activities with 0 paragraphs: ${activityWithZeroParagraphs}`);
    log(`  Activities with 1 paragraph: ${activityWithSingleParagraph}`);
    log(`  Activities with 2+ paragraphs: ${activityWithMultipleParagraphs}`);

    if (activityWithSingleParagraph > 0) {
      log(`\n  ⚠️  ALGORITHM ISSUE DETECTED!`);
      log(`  Activities are being created with ONLY the heading paragraph.`);
      log(`  The algorithm should create activities that INCLUDE all paragraphs`);
      log(`  until the next heading appears.`);
    }

    // Save logs
    fs.writeFileSync(outputFile, logs.join('\n'), 'utf-8');
    console.log(`\n[Saved] ${outputFile}`);

  } catch (error: any) {
    log(`\n❌ Error: ${error.message}`);
    fs.writeFileSync(outputFile, logs.join('\n'), 'utf-8');
  }
}

main().catch(console.error);
