/**
 * Simple Trace Test - Test with a sample file
 * POST /api/test/trace-simple
 */

import { NextRequest, NextResponse } from "next/server";
import { brightOneVisionAdapter } from "@/core/document-adapters";
import { AIDocumentParserPipeline } from "@/core/rule-engine-v2/parsers/AIDocumentParserPipeline";
import * as fs from 'fs';
import * as path from 'path';

// Ensure debug directory exists
const DEBUG_DIR = path.join(process.cwd(), 'debug-outputs');
if (!fs.existsSync(DEBUG_DIR)) {
  fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

function countContent(obj: any): any {
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
      if (Array.isArray(section.activities)) {
        result.activities += section.activities.length;
        for (const activity of section.activities) {
          if (Array.isArray(activity.paragraphs)) {
            result.paragraphs += activity.paragraphs.length;
            for (const p of activity.paragraphs) {
              result.characters += (p.content?.length || 0);
            }
          }
          result.teacherActions += (activity.teacherActions?.length || 0);
          result.studentActions += (activity.studentActions?.length || 0);
          result.products += (activity.products?.length || 0);
          result.assessments += (activity.assessments?.length || 0);
          result.questions += (activity.questions?.length || 0);
        }
      }
    }
  }

  if (Array.isArray(obj.tables)) {
    result.tables = obj.tables.length;
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filePath } = body;

    // Use default test file if not provided
    const testFilePath = filePath || path.join(process.cwd(), 'uploads', 'test', 'sample.pdf');

    console.log('\n' + '='.repeat(80));
    console.log('SIMPLE TRACE TEST');
    console.log('File:', testFilePath);
    console.log('='.repeat(80));

    // Check if file exists
    if (!fs.existsSync(testFilePath)) {
      // Try to find any PDF in uploads
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir, { recursive: true });
        const pdfFiles = files.filter((f: any) => String(f).endsWith('.pdf'));
        console.log('Available PDFs:', pdfFiles.slice(0, 5));

        if (pdfFiles.length > 0) {
          const firstPdf = pdfFiles[0];
          const fullPath = path.join(uploadsDir, String(firstPdf));
          console.log('Using:', fullPath);
          return NextResponse.json({
            success: false,
            message: "File not found. Try this path: " + fullPath,
            availablePdfs: pdfFiles.slice(0, 10)
          });
        }
      }

      return NextResponse.json({
        success: false,
        message: "File not found: " + testFilePath,
        hint: "Provide filePath in body or add a PDF to uploads/"
      });
    }

    // Read file
    const fileBuffer = fs.readFileSync(testFilePath);
    console.log('File size:', fileBuffer.length, 'bytes');

    // ============================================================
    // STAGE 1: VISION RESULT
    // ============================================================
    console.log('\n' + '#'.repeat(80));
    console.log('# STAGE 1: VISION RESULT');
    console.log('#'.repeat(80));

    const visionResult = await brightOneVisionAdapter.parse(fileBuffer, path.basename(testFilePath));

    fs.writeFileSync(
      path.join(DEBUG_DIR, 'vision-result.json'),
      JSON.stringify(visionResult, null, 2)
    );

    const stage1 = countContent(visionResult.document);
    console.log('\n--- Stage 1 Counts ---');
    console.log('Sections:', stage1.sections);
    console.log('Activities:', stage1.activities);
    console.log('Paragraphs:', stage1.paragraphs);
    console.log('TeacherActions:', stage1.teacherActions);
    console.log('StudentActions:', stage1.studentActions);
    console.log('Products:', stage1.products);
    console.log('Assessments:', stage1.assessments);
    console.log('Questions:', stage1.questions);

    // Print first section
    if (visionResult.document?.sections?.[0]) {
      console.log('\n--- First Section (Vision Result) ---');
      console.dir(visionResult.document.sections[0], { depth: null });
    }

    if (!visionResult.success || !visionResult.document) {
      return NextResponse.json({
        success: false,
        message: "Vision parsing failed",
        error: visionResult.error
      });
    }

    // ============================================================
    // STAGE 2: VISION DATA
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
      metadata: brightoneStructured?.metadata,
      activities: [],
    };

    // Convert sections
    if (brightoneStructured?.sections) {
      for (const section of brightoneStructured.sections) {
        visionData.sections.push({
          id: section.id,
          title: section.title || section.sectionTitle,
          code: section.type || section.sectionCode || section.code,
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
              paragraphs: activity.paragraphs?.map((p: any) => ({
                id: p.id,
                content: p.content,
              })) || [],
            });
          }
        }
      }
    }
    visionData.activities = activities;

    fs.writeFileSync(
      path.join(DEBUG_DIR, 'vision-data.json'),
      JSON.stringify(visionData, null, 2)
    );

    const stage2 = countContent(visionData);
    console.log('\n--- Stage 2 Counts ---');
    console.log('Sections:', stage2.sections);
    console.log('Activities:', stage2.activities);
    console.log('Paragraphs:', stage2.paragraphs);
    console.log('TeacherActions:', stage2.teacherActions);
    console.log('StudentActions:', stage2.studentActions);

    // Print first activity
    if (visionData.activities?.[0]) {
      console.log('\n--- First Activity (Vision Data) ---');
      console.dir(visionData.activities[0], { depth: null });
    }

    // ============================================================
    // STAGE 3: SEMANTIC OUTPUT
    // ============================================================
    console.log('\n' + '#'.repeat(80));
    console.log('# STAGE 3: SEMANTIC OUTPUT');
    console.log('#'.repeat(80));

    const semanticParser = new AIDocumentParserPipeline();
    const parseResult = await semanticParser.parse({
      visionData: visionData,
      documentTitle: path.basename(testFilePath),
    });

    fs.writeFileSync(
      path.join(DEBUG_DIR, 'semantic-output.json'),
      JSON.stringify({
        success: parseResult.success,
        sections: parseResult.sections,
        confidence: parseResult.confidence,
        debug: parseResult.debug,
      }, null, 2)
    );

    console.log('\n=== PARSER DEBUG INFO ===');
    console.log('AI Calls:', parseResult.debug?.aiCalls);
    console.log('Total Latency:', parseResult.debug?.totalLatency);
    console.log('Input Paragraphs:', parseResult.debug?.inputParagraphs);
    console.log('Output TeacherActions:', parseResult.debug?.outputTeacherActions);
    console.log('Output StudentActions:', parseResult.debug?.outputStudentActions);

    const stage3 = countContent({ sections: parseResult.sections });
    console.log('\n--- Stage 3 Counts ---');
    console.log('Sections:', stage3.sections);
    console.log('Activities:', stage3.activities);
    console.log('Paragraphs:', stage3.paragraphs);
    console.log('TeacherActions:', stage3.teacherActions);
    console.log('StudentActions:', stage3.studentActions);
    console.log('Products:', stage3.products);
    console.log('Assessments:', stage3.assessments);
    console.log('Questions:', stage3.questions);

    // Print first section
    if (parseResult.sections?.[0]) {
      console.log('\n--- First Section (Semantic Output) ---');
      console.dir(parseResult.sections[0], { depth: null });
    }

    // ============================================================
    // COMPARISON
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('COMPARISON TABLE');
    console.log('='.repeat(80));
    console.log('');
    console.log('Stage'.padEnd(20) + 'Sec'.padEnd(8) + 'Act'.padEnd(8) + 'Para'.padEnd(8) + 'TA'.padEnd(8) + 'SA'.padEnd(8) + 'Prod'.padEnd(8) + 'Asmt'.padEnd(8) + 'Q');
    console.log('-'.repeat(80));
    console.log('Vision Result'.padEnd(20) + String(stage1.sections).padEnd(8) + String(stage1.activities).padEnd(8) + String(stage1.paragraphs).padEnd(8) + String(stage1.teacherActions).padEnd(8) + String(stage1.studentActions).padEnd(8) + String(stage1.products).padEnd(8) + String(stage1.assessments).padEnd(8) + stage1.questions);
    console.log('Vision Data'.padEnd(20) + String(stage2.sections).padEnd(8) + String(stage2.activities).padEnd(8) + String(stage2.paragraphs).padEnd(8) + String(stage2.teacherActions).padEnd(8) + String(stage2.studentActions).padEnd(8) + String(stage2.products).padEnd(8) + String(stage2.assessments).padEnd(8) + stage2.questions);
    console.log('Semantic Output'.padEnd(20) + String(stage3.sections).padEnd(8) + String(stage3.activities).padEnd(8) + String(stage3.paragraphs).padEnd(8) + String(stage3.teacherActions).padEnd(8) + String(stage3.studentActions).padEnd(8) + String(stage3.products).padEnd(8) + String(stage3.assessments).padEnd(8) + stage3.questions);

    return NextResponse.json({
      success: true,
      comparison: {
        visionResult: stage1,
        visionData: stage2,
        semanticOutput: stage3,
      },
      debugFiles: [
        'vision-result.json',
        'vision-data.json',
        'semantic-output.json',
      ]
    });

  } catch (error: any) {
    console.error('[Trace Simple] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
