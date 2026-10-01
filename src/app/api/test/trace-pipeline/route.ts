/**
 * Trace Pipeline - Full pipeline debug with logging at every stage
 * GET /api/test/trace-pipeline?lessonPlanId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { brightOneVisionAdapter } from "@/core/document-adapters";
import { AIDocumentParserPipeline } from "@/core/rule-engine-v2/parsers/AIDocumentParserPipeline";
import * as fs from 'fs';
import * as path from 'path';

// Ensure debug directory exists
const DEBUG_DIR = path.join(process.cwd(), 'debug-outputs');
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

function countContent(obj: any): {
  sections: number;
  activities: number;
  paragraphs: number;
  teacherActions: number;
  studentActions: number;
  products: number;
  assessments: number;
  questions: number;
  tables: number;
  characters: number;
} {
  const result = {
    sections: 0,
    activities: 0,
    paragraphs: 0,
    teacherActions: 0,
    studentActions: 0,
    products: 0,
    assessments: 0,
    questions: 0,
    tables: 0,
    characters: 0,
  };

  if (!obj) return result;

  // Count sections
  if (Array.isArray(obj.sections)) {
    result.sections = obj.sections.length;
    for (const section of obj.sections) {
      // Count activities
      if (Array.isArray(section.activities)) {
        result.activities += section.activities.length;
        for (const activity of section.activities) {
          // Count paragraphs
          if (Array.isArray(activity.paragraphs)) {
            result.paragraphs += activity.paragraphs.length;
            for (const p of activity.paragraphs) {
              result.characters += (p.content?.length || 0);
            }
          }
          // Count teacher actions
          result.teacherActions += (activity.teacherActions?.length || 0);
          // Count student actions
          result.studentActions += (activity.studentActions?.length || 0);
          // Count products
          result.products += (activity.products?.length || 0);
          // Count assessments
          result.assessments += (activity.assessments?.length || 0);
          // Count questions
          result.questions += (activity.questions?.length || 0);
        }
      }
      // Also check for direct paragraphs in section (legacy format)
      if (Array.isArray(section.paragraphs)) {
        result.paragraphs += section.paragraphs.length;
        for (const p of section.paragraphs) {
          result.characters += (p.content?.length || 0);
        }
      }
    }
  }

  // Count tables
  if (Array.isArray(obj.tables)) {
    result.tables = obj.tables.length;
  }

  return result;
}

function printComparisonTable(stageName: string, counts: ReturnType<typeof countContent>): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STAGE: ${stageName}`);
  console.log('='.repeat(60));
  console.log(`Sections:        ${counts.sections}`);
  console.log(`Activities:      ${counts.activities}`);
  console.log(`Paragraphs:     ${counts.paragraphs}`);
  console.log(`TeacherActions:  ${counts.teacherActions}`);
  console.log(`StudentActions: ${counts.studentActions}`);
  console.log(`Products:       ${counts.products}`);
  console.log(`Assessments:    ${counts.assessments}`);
  console.log(`Questions:      ${counts.questions}`);
  console.log(`Tables:         ${counts.tables}`);
  console.log(`Characters:     ${counts.characters}`);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonPlanId = searchParams.get('lessonPlanId');

    if (!lessonPlanId) {
      return NextResponse.json(
        { success: false, message: "lessonPlanId is required" },
        { status: 400 }
      );
    }

    // Get lesson plan
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: lessonPlanId },
      include: {
        sections: {
          where: { versionNumber: 1 },
          orderBy: { sectionOrder: 'asc' },
        },
      },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Lesson plan not found" },
        { status: 404 }
      );
    }

    console.log('\n' + '='.repeat(80));
    console.log('FULL PIPELINE TRACE - LESSON PLAN: ' + lessonPlanId);
    console.log('='.repeat(80));

    // Get file path
    const filePath = lessonPlan.filePath;
    if (!filePath) {
      return NextResponse.json(
        { success: false, message: "No file path for lesson plan" },
        { status: 404 }
      );
    }

    const fullPath = filePath.startsWith('/uploads')
      ? path.join(process.cwd(), filePath)
      : filePath;

    let fileBuffer: Buffer | null = null;
    try {
      fileBuffer = await fs.promises.readFile(fullPath);
      console.log(`[TRACE] Read file: ${fullPath}, size: ${fileBuffer.length} bytes`);
    } catch (e) {
      console.error('[TRACE] Cannot read file:', e);
      return NextResponse.json(
        { success: false, message: "Cannot read file: " + e },
        { status: 404 }
      );
    }

    // ============================================================
    // STAGE 1: VISION RESULT
    // ============================================================
    console.log('\n' + '#'.repeat(80));
    console.log('# STAGE 1: VISION RESULT');
    console.log('#'.repeat(80));

    const visionResult = await brightOneVisionAdapter.parse(fileBuffer, lessonPlan.originalFilename || 'document');

    // Save full vision result
    fs.writeFileSync(
      path.join(DEBUG_DIR, 'vision-result.json'),
      JSON.stringify(visionResult, null, 2)
    );
    console.log('[TRACE] Saved: vision-result.json');

    const stage1 = countContent(visionResult.document);
    printComparisonTable('VISION RESULT', stage1);

    // Print one section as example
    if (visionResult.document?.sections?.[0]) {
      console.log('\n--- EXAMPLE SECTION (Vision Result) ---');
      console.dir(visionResult.document.sections[0], { depth: null });
    }

    // ============================================================
    // STAGE 2: VISION DATA (Convert to same format as WorkflowOrchestrator)
    // ============================================================
    console.log('\n' + '#'.repeat(80));
    console.log('# STAGE 2: VISION DATA');
    console.log('#'.repeat(80));

    const brightoneStructured = visionResult.document;
    const visionData: any = {
      pages: [],
      blocks: [],
      sections: [],
      tables: [],
      images: [],
      metadata: {
        title: brightoneStructured?.title,
        totalPages: brightoneStructured?.metadata?.totalPages,
        language: brightoneStructured?.metadata?.language || 'vi',
        confidence: brightoneStructured?.metadata?.confidence,
        hasTables: brightoneStructured?.metadata?.hasTables,
        hasImages: brightoneStructured?.metadata?.hasImages,
        wordCount: brightoneStructured?.metadata?.wordCount,
      },
    };

    // Convert sections
    if (brightoneStructured?.sections) {
      for (const section of brightoneStructured.sections) {
        visionData.sections.push({
          id: section.id,
          title: section.title || section.sectionTitle,
          code: section.type || section.sectionCode || section.code,
          pageStart: section.pageNumbers?.[0] || section.pageStart,
          pageEnd: section.pageNumbers?.[section.pageNumbers?.length - 1] || section.pageEnd,
          order: section.order,
        });
      }
    }

    // Convert activities
    const activities: any[] = [];
    if (brightoneStructured?.sections) {
      for (const section of brightoneStructured.sections) {
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
                tableData: p.tableData,
              })) || [],
            });
          }
        }
      }
    }
    visionData.activities = activities;

    // Build pages
    const pageMap = new Map<number, any[]>();
    if (brightoneStructured?.sections) {
      for (const section of brightoneStructured.sections) {
        if (section.activities) {
          for (const activity of section.activities) {
            if (activity.paragraphs) {
              for (const para of activity.paragraphs) {
                const pageNum = para.pageNumber || 1;
                if (!pageMap.has(pageNum)) {
                  pageMap.set(pageNum, []);
                }
                const block: any = {
                  id: para.id,
                  type: para.isHeading ? 'heading' : 'paragraph',
                  content: para.content,
                  level: para.headingLevel,
                  pageNumber: pageNum,
                  bbox: para.bbox,
                  readingOrder: para.order,
                };
                if (para.tableData) {
                  block.type = 'table';
                  block.tableData = para.tableData;
                }
                pageMap.get(pageNum)!.push(block);
              }
            }
          }
        }
      }
    }
    visionData.pages = Array.from(pageMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([pageNum, blocks]) => ({
        pageNumber: pageNum,
        elements: blocks,
      }));

    // Build blocks
    if (visionData.pages) {
      for (const page of visionData.pages) {
        for (const elem of page.elements) {
          visionData.blocks.push({
            id: elem.id,
            pageNumber: page.pageNumber,
            type: elem.type,
            content: elem.content,
            level: elem.level,
            bbox: elem.bbox,
            readingOrder: elem.readingOrder,
            tableData: elem.tableData,
            confidence: elem.confidence,
          });
        }
      }
    }

    // Save vision data
    fs.writeFileSync(
      path.join(DEBUG_DIR, 'vision-data.json'),
      JSON.stringify(visionData, null, 2)
    );
    console.log('[TRACE] Saved: vision-data.json');

    const stage2 = countContent(visionData);
    printComparisonTable('VISION DATA', stage2);

    // Print one section as example
    if (visionData.sections?.[0]) {
      console.log('\n--- EXAMPLE SECTION (Vision Data) ---');
      console.dir(visionData.sections[0], { depth: null });
    }

    // ============================================================
    // STAGE 3: SEMANTIC OUTPUT (After AI Parser)
    // ============================================================
    console.log('\n' + '#'.repeat(80));
    console.log('# STAGE 3: SEMANTIC OUTPUT');
    console.log('#'.repeat(80));

    const semanticParser = new AIDocumentParserPipeline();
    const parseResult = await semanticParser.parse({
      visionData: visionData,
      documentTitle: lessonPlan.title,
    });

    // Save semantic output
    fs.writeFileSync(
      path.join(DEBUG_DIR, 'semantic-output.json'),
      JSON.stringify({
        success: parseResult.success,
        sections: parseResult.sections,
        confidence: parseResult.confidence,
        error: parseResult.error,
      }, null, 2)
    );
    console.log('[TRACE] Saved: semantic-output.json');

    const stage3 = countContent({ sections: parseResult.sections });
    printComparisonTable('SEMANTIC OUTPUT', stage3);

    // Print one section as example
    if (parseResult.sections?.[0]) {
      console.log('\n--- EXAMPLE SECTION (Semantic Output) ---');
      console.dir(parseResult.sections[0], { depth: null });
    }

    // ============================================================
    // COMPARISON TABLE
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('COMPARISON TABLE');
    console.log('='.repeat(80));
    console.log('');
    console.log('Stage'.padEnd(20) + 'Sec'.padEnd(8) + 'Act'.padEnd(8) + 'Para'.padEnd(8) + 'TA'.padEnd(8) + 'SA'.padEnd(8) + 'Prod'.padEnd(8) + 'Asmt'.padEnd(8) + 'Q'.padEnd(8) + 'Char');
    console.log('-'.repeat(80));
    console.log('Vision Result'.padEnd(20) + String(stage1.sections).padEnd(8) + String(stage1.activities).padEnd(8) + String(stage1.paragraphs).padEnd(8) + String(stage1.teacherActions).padEnd(8) + String(stage1.studentActions).padEnd(8) + String(stage1.products).padEnd(8) + String(stage1.assessments).padEnd(8) + String(stage1.questions).padEnd(8) + stage1.characters);
    console.log('Vision Data'.padEnd(20) + String(stage2.sections).padEnd(8) + String(stage2.activities).padEnd(8) + String(stage2.paragraphs).padEnd(8) + String(stage2.teacherActions).padEnd(8) + String(stage2.studentActions).padEnd(8) + String(stage2.products).padEnd(8) + String(stage2.assessments).padEnd(8) + String(stage2.questions).padEnd(8) + stage2.characters);
    console.log('Semantic Output'.padEnd(20) + String(stage3.sections).padEnd(8) + String(stage3.activities).padEnd(8) + String(stage3.paragraphs).padEnd(8) + String(stage3.teacherActions).padEnd(8) + String(stage3.studentActions).padEnd(8) + String(stage3.products).padEnd(8) + String(stage3.assessments).padEnd(8) + String(stage3.questions).padEnd(8) + stage3.characters);

    // ============================================================
    // EXAMPLE SECTION COMPARISON
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('EXAMPLE SECTION COMPARISON');
    console.log('='.repeat(80));

    // Find a section with activities
    const sectionWithActivities = visionResult.document?.sections?.find((s: any) => s.activities?.length > 0);

    if (sectionWithActivities) {
      console.log('\n--- Vision Result Section ---');
      console.log('Title:', sectionWithActivities.title);
      console.log('Activities:', sectionWithActivities.activities?.length || 0);
      if (sectionWithActivities.activities?.[0]) {
        const act = sectionWithActivities.activities[0];
        console.log('  First Activity:', act.title);
        console.log('  Paragraphs:', act.paragraphs?.length || 0);
        console.log('  TeacherActions:', act.teacherActions?.length || 0);
        console.log('  StudentActions:', act.studentActions?.length || 0);
        console.log('  Products:', act.products?.length || 0);
        console.log('  Assessments:', act.assessments?.length || 0);
        console.log('  Questions:', act.questions?.length || 0);
        console.log('  Full activity:');
        console.dir(act, { depth: null });
      }
    }

    // Find matching section in visionData
    const visionDataActivity = visionData.activities?.[0];
    if (visionDataActivity) {
      console.log('\n--- Vision Data Activity ---');
      console.log('Title:', visionDataActivity.title);
      console.log('Section:', visionDataActivity.sectionTitle);
      console.log('Paragraphs:', visionDataActivity.paragraphs?.length || 0);
      console.log('Full activity:');
      console.dir(visionDataActivity, { depth: null });
    }

    // Find matching section in semantic output
    const semanticSection = parseResult.sections?.[0];
    if (semanticSection) {
      console.log('\n--- Semantic Output Section ---');
      console.log('Title:', semanticSection.title);
      console.log('Activities:', semanticSection.activities?.length || 0);
      if (semanticSection.activities?.[0]) {
        const act = semanticSection.activities[0];
        console.log('  First Activity:', act.title);
        console.log('  Paragraphs:', act.paragraphs?.length || 0);
        console.log('  TeacherActions:', act.teacherActions?.length || 0);
        console.log('  StudentActions:', act.studentActions?.length || 0);
        console.log('  Products:', act.products?.length || 0);
        console.log('  Assessments:', act.assessments?.length || 0);
        console.log('  Questions:', act.questions?.length || 0);
        console.log('  Full activity:');
        console.dir(act, { depth: null });
      }
    }

    // Check database content
    console.log('\n--- Database Section (Current) ---');
    const dbSections = await prisma.lessonPlanSection.findMany({
      where: { lessonPlanId, versionNumber: 1 },
      orderBy: { sectionOrder: 'asc' },
    });

    console.log('Sections in DB:', dbSections.length);
    if (dbSections.length > 0) {
      const firstDbSection = dbSections[0];
      console.log('First DB Section:', firstDbSection.sectionTitle);
      const pc = firstDbSection.parsedContent as any;
      console.log('  Has parsedContent:', !!pc);
      console.log('  parsedContent type:', typeof pc);
      if (pc) {
        console.log('  parsedContent keys:', Object.keys(pc));
        console.log('  Activities:', pc.activities?.length || 0);
        if (pc.activities?.[0]) {
          const act = pc.activities[0];
          console.log('    First Activity:', act.title);
          console.log('    Paragraphs:', act.paragraphs?.length || 0);
          console.log('    TeacherActions:', act.teacherActions?.length || 0);
          console.log('    StudentActions:', act.studentActions?.length || 0);
          console.log('    Full activity:');
          console.dir(act, { depth: null });
        }
      }
    }

    // Save database section data
    fs.writeFileSync(
      path.join(DEBUG_DIR, 'database-sections.json'),
      JSON.stringify(dbSections.map(s => ({
        id: s.id,
        title: s.sectionTitle,
        type: s.sectionType,
        parsedContent: s.parsedContent,
      })), null, 2)
    );
    console.log('[TRACE] Saved: database-sections.json');

    // Return summary
    return NextResponse.json({
      success: true,
      lessonPlan: {
        id: lessonPlan.id,
        title: lessonPlan.title,
      },
      comparison: {
        visionResult: stage1,
        visionData: stage2,
        semanticOutput: stage3,
      },
      debugFiles: [
        'vision-result.json',
        'vision-data.json',
        'semantic-output.json',
        'database-sections.json',
      ],
    });

  } catch (error) {
    console.error('[Trace Pipeline] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
