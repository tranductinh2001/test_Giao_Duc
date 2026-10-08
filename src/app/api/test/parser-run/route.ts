/**
 * Parser Run API
 *
 * Run parser on a specific lesson plan and get detailed output
 *
 * POST /api/test/parser-run
 * Body: { lessonPlanId: string, forceReparse: boolean }
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonPlanId, forceReparse = false } = body;

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

    // Check if we need to reparse
    const hasParsedContent = lessonPlan.sections.some(
      s => s.parsedContent && (s.parsedContent as any)?.activities
    );

    if (!forceReparse && hasParsedContent) {
      // Return existing parsed data
      return NextResponse.json({
        success: true,
        message: "Using existing parsed data",
        lessonPlan: {
          id: lessonPlan.id,
          title: lessonPlan.title,
          filename: lessonPlan.originalFilename,
          mimeType: lessonPlan.mimeType,
        },
        sections: lessonPlan.sections.map(s => ({
          id: s.id,
          title: s.sectionTitle,
          type: s.sectionType,
          hasParsedContent: !!(s.parsedContent as any)?.activities,
        })),
      });
    }

    // Get file path
    let fileBuffer: Buffer | null = null;
    if (lessonPlan.filePath) {
      const fullFilePath = lessonPlan.filePath.startsWith('/uploads')
        ? path.join(process.cwd(), lessonPlan.filePath)
        : lessonPlan.filePath;

      try {
        fileBuffer = await fs.promises.readFile(fullFilePath);
      } catch (e) {
        console.error('[Parser Run] Cannot read file:', e);
      }
    }

    // Parse result
    let parseResult = null;
    let error = null;

    if (fileBuffer) {
      // ===== STAGE 1: VISION RESULT =====
      console.log('\n========================================');
      console.log('===== STAGE 1: VISION RESULT =====');
      console.log('========================================');

      const visionResult = await brightOneVisionAdapter.parse(fileBuffer, lessonPlan.originalFilename || 'document');

      // Count content in vision result
      let visionTotalChars = 0;
      let visionTotalParagraphs = 0;
      let visionTotalActivities = 0;
      let visionTotalTeacherActions = 0;
      let visionTotalStudentActions = 0;

      if (visionResult.document) {
        const doc: any = visionResult.document;

        // Count pages, blocks, sections
        console.log('--- Vision Result Summary ---');
        console.log('pages:', doc.metadata?.pages?.length || 0);
        console.log('blocks:', doc.metadata?.pages?.reduce((sum: number, p: any) => sum + (p.elements?.length || 0), 0) || 0);
        console.log('sections:', doc.sections?.length || 0);
        console.log('activities:', doc.activities?.length || 0);

        // Count tables
        const tablesCount = doc.metadata?.pages?.reduce((sum: number, p: any) => {
          return sum + (p.elements?.filter((e: any) => e.type === 'table').length || 0);
        }, 0) || 0;
        console.log('tables:', tablesCount);

        // Count paragraphs
        if (doc.sections) {
          for (const section of doc.sections) {
            if (section.activities) {
              for (const activity of section.activities) {
                visionTotalActivities++;
                if (activity.paragraphs) {
                  for (const para of activity.paragraphs) {
                    visionTotalParagraphs++;
                    visionTotalChars += (para.content?.length || 0);
                  }
                }
              }
            }
          }
        }

        console.log('--- Content Counts ---');
        console.log('totalCharacters:', visionTotalChars);
        console.log('totalParagraphs:', visionTotalParagraphs);
        console.log('totalActivities:', visionTotalActivities);
        console.log('totalTeacherActions:', visionTotalTeacherActions);
        console.log('totalStudentActions:', visionTotalStudentActions);

        // Print full vision result
        console.log('\n===== VISION RESULT (FULL) =====');
        console.dir(visionResult, { depth: null });

        // Save to file
        fs.writeFileSync(
          path.join(DEBUG_DIR, 'vision-result.json'),
          JSON.stringify(visionResult, null, 2)
        );
        console.log('[DEBUG] Saved: vision-result.json');
      }

      // ===== STAGE 2: CONVERT TO VISION DATA =====
      console.log('\n========================================');
      console.log('===== STAGE 2: convertToVisionData() =====');
      console.log('========================================');

      // Convert BrightOne structured to visionData format (same logic as WorkflowOrchestrator)
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
          const s: any = section;
          visionData.sections.push({
            id: s.id,
            title: s.title || s.sectionTitle,
            code: s.type || s.sectionCode || s.code,
            pageStart: s.pageNumbers?.[0] || s.pageStart,
            pageEnd: s.pageNumbers?.[s.pageNumbers?.length - 1] || s.pageEnd,
            order: s.order,
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

      // Build pages from sections
      const pageMap = new Map<number, any[]>();
      if (brightoneStructured?.sections) {
        for (const section of brightoneStructured.sections) {
          if (section.activities) {
            for (const activity of section.activities) {
              if (activity.paragraphs) {
                for (const para of activity.paragraphs) {
                  const p: any = para;
                  const pageNum = p.pageNumber || 1;
                  if (!pageMap.has(pageNum)) {
                    pageMap.set(pageNum, []);
                  }
                  const block: any = {
                    id: p.id,
                    type: p.isHeading ? 'heading' : 'paragraph',
                    content: p.content,
                    level: p.headingLevel,
                    pageNumber: pageNum,
                    bbox: p.bbox,
                    readingOrder: p.order,
                  };
                  if (p.tableData) {
                    block.type = 'table';
                    block.tableData = p.tableData;
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

      // Count converted data
      let convertedParagraphs = 0;
      let convertedTeacherActions = 0;
      let convertedStudentActions = 0;
      for (const section of visionData.sections) {
        // sections don't have activities in this format
      }
      for (const activity of visionData.activities) {
        convertedParagraphs += activity.paragraphs?.length || 0;
      }

      console.log('--- VisionData Summary ---');
      console.log('sections:', visionData.sections?.length || 0);
      console.log('paragraphs:', convertedParagraphs);
      console.log('activities:', visionData.activities?.length || 0);
      console.log('teacherActions:', convertedTeacherActions);
      console.log('studentActions:', convertedStudentActions);
      console.log('products: 0');
      console.log('assessments: 0');
      console.log('questions: 0');
      console.log('tables:', visionData.tables?.length || 0);

      console.log('\n===== VISION DATA (FULL) =====');
      console.dir(visionData, { depth: null });

      // Save to file
      fs.writeFileSync(
        path.join(DEBUG_DIR, 'vision-data.json'),
        JSON.stringify(visionData, null, 2)
      );
      console.log('[DEBUG] Saved: vision-data.json');

      // ===== STAGE 3: BEFORE SENDING TO AI =====
      console.log('\n========================================');
      console.log('===== STAGE 3: BEFORE SENDING TO AI =====');
      console.log('========================================');

      // Build prompt from visionData (same as AIDocumentParserPipeline)
      const buildVisionPrompt = (vd: any): string => {
        const parts: string[] = [];

        // Metadata
        if (vd?.metadata) {
          parts.push(`# METADATA`);
          parts.push(`Title: ${vd.metadata.title || 'N/A'}`);
          parts.push(`Total Pages: ${vd.metadata.totalPages || 'N/A'}`);
          parts.push(`Language: ${vd.metadata.language || 'vi'}`);
          parts.push(`Has Tables: ${vd.metadata.hasTables ? 'Yes' : 'No'}`);
          parts.push(`Has Images: ${vd.metadata.hasImages ? 'Yes' : 'No'}`);
          parts.push(`Word Count: ${vd.metadata.wordCount || 'N/A'}`);
          parts.push(`Confidence: ${(vd.metadata.confidence || 0.9) * 100}%`);
        }

        // Sections
        if (vd?.sections?.length > 0) {
          parts.push(`\n# SECTIONS (${vd.sections.length})`);
          for (const section of vd.sections) {
            parts.push(`\n## Section: ${section.title}`);
            parts.push(`Code: ${section.code || 'N/A'}`);
            parts.push(`Page: ${section.pageStart || 'N/A'}-${section.pageEnd || 'N/A'}`);
          }
        }

        // Activities with full content
        if (vd?.activities?.length > 0) {
          parts.push(`\n# ACTIVITIES (${vd.activities.length})`);
          for (const activity of vd.activities) {
            parts.push(`\n## Activity: ${activity.title}`);
            parts.push(`Section: ${activity.sectionTitle}`);
            parts.push(`Paragraphs (${activity.paragraphs?.length || 0}):`);
            for (const para of activity.paragraphs || []) {
              parts.push(`- ${para.content || ''}`);
            }
          }
        }

        return parts.join('\n');
      };

      const prompt = buildVisionPrompt(visionData);
      console.log('--- AI Input Summary ---');
      console.log('Prompt length:', prompt.length);
      console.log('VisionData length (chars):', JSON.stringify(visionData).length);
      console.log('Number of sections:', visionData.sections?.length || 0);

      // Count per section
      for (const section of visionData.sections || []) {
        console.log(`\nSection: ${section.title}`);
        console.log('paragraph count: 0 (no activities in top-level sections)');
        console.log('activity count: 0');
        console.log('teacher action count: 0');
        console.log('student action count: 0');
        console.log('products: 0');
        console.log('assessments: 0');
        console.log('questions: 0');
      }

      // Activity details
      for (const activity of visionData.activities || []) {
        console.log(`\nActivity: ${activity.title}`);
        console.log('paragraph count:', activity.paragraphs?.length || 0);
        console.log('activity count: 1');
        console.log('teacher action count: 0 (not in vision data yet)');
        console.log('student action count: 0 (not in vision data yet)');
        console.log('products: 0');
        console.log('assessments: 0');
        console.log('questions: 0');
      }

      // Save AI input
      fs.writeFileSync(
        path.join(DEBUG_DIR, 'semantic-input.json'),
        JSON.stringify({
          visionData: visionData,
          prompt: prompt,
        }, null, 2)
      );
      console.log('[DEBUG] Saved: semantic-input.json');

      // ===== RUN SEMANTIC PARSER =====
      console.log('\n========================================');
      console.log('===== RUNNING AI SEMANTIC PARSER =====');
      console.log('========================================');

      if (visionResult.success && visionResult.document) {
        // Run Semantic Parser
        const semanticParser = new AIDocumentParserPipeline();

        const parseResultRaw = await semanticParser.parse({
          visionData: visionData,
          documentTitle: lessonPlan.title,
        });

        // ===== STAGE 4: RAW AI RESPONSE =====
        console.log('\n========================================');
        console.log('===== STAGE 4: RAW AI RESPONSE =====');
        console.log('========================================');
        console.log('AI Response success:', parseResultRaw.success);

        // The raw response is internal to the parser - we save what we can
        fs.writeFileSync(
          path.join(DEBUG_DIR, 'semantic-output-raw.txt'),
          `Parse Success: ${parseResultRaw.success}\n` +
          `Confidence: ${parseResultRaw.confidence}\n` +
          `Error: ${parseResultRaw.error || 'None'}\n` +
          `Sections Count: ${parseResultRaw.sections?.length || 0}\n` +
          `Full Sections JSON:\n${JSON.stringify(parseResultRaw.sections, null, 2)}`
        );
        console.log('[DEBUG] Saved: semantic-output-raw.txt');

        // ===== STAGE 5: AFTER JSON.PARSE() =====
        console.log('\n========================================');
        console.log('===== STAGE 5: AFTER JSON.PARSE() =====');
        console.log('========================================');

        if (parseResultRaw.success && parseResultRaw.sections) {
          // Count fields
          let parsedTeacherActions = 0;
          let parsedStudentActions = 0;
          let parsedProducts = 0;
          let parsedAssessments = 0;
          let parsedQuestions = 0;
          let parsedParagraphs = 0;

          console.log('--- Parsed AI JSON Summary ---');
          console.dir(parseResultRaw, { depth: null });

          for (const section of parseResultRaw.sections) {
            const contentLen = section.paragraphs?.map((p: any) => p.content || '').join('\n').length || 0;

            // Count activities in this section
            let sectionActivities = section.activities?.length || 0;
            let sectionTeacherActions = 0;
            let sectionStudentActions = 0;
            let sectionProducts = 0;
            let sectionAssessments = 0;
            let sectionQuestions = 0;
            let sectionParagraphs = section.paragraphs?.length || 0;

            for (const activity of section.activities || []) {
              sectionTeacherActions += activity.teacherActions?.length || 0;
              sectionStudentActions += activity.studentActions?.length || 0;
              sectionProducts += activity.products?.length || 0;
              sectionAssessments += activity.assessments?.length || 0;
              sectionQuestions += activity.questions?.length || 0;
              sectionParagraphs += activity.paragraphs?.length || 0;
            }

            parsedTeacherActions += sectionTeacherActions;
            parsedStudentActions += sectionStudentActions;
            parsedProducts += sectionProducts;
            parsedAssessments += sectionAssessments;
            parsedQuestions += sectionQuestions;
            parsedParagraphs += sectionParagraphs;

            console.log(`\nSection: ${section.title}`);
            console.log('content length:', contentLen);
            console.log('paragraph count:', sectionParagraphs);
            console.log('activity count:', sectionActivities);
            console.log('teacher action count:', sectionTeacherActions);
            console.log('student action count:', sectionStudentActions);
            console.log('products:', sectionProducts);
            console.log('assessments:', sectionAssessments);
            console.log('questions:', sectionQuestions);
            console.log('tables: 0');
            console.log('children:', section.activities?.length || 0);
            console.log('metadata:', { confidence: section.confidence, type: section.type });
          }

          console.log('\n--- Total Parsed Counts ---');
          console.log('total paragraphs:', parsedParagraphs);
          console.log('total teacherActions:', parsedTeacherActions);
          console.log('total studentActions:', parsedStudentActions);
          console.log('total products:', parsedProducts);
          console.log('total assessments:', parsedAssessments);
          console.log('total questions:', parsedQuestions);

          // Save parsed output
          fs.writeFileSync(
            path.join(DEBUG_DIR, 'semantic-output.json'),
            JSON.stringify(parseResultRaw, null, 2)
          );
          console.log('[DEBUG] Saved: semantic-output.json');

          if (parseResultRaw.success) {
            parseResult = {
              success: true,
              sections: parseResultRaw.sections?.length || 0,
              confidence: parseResultRaw.confidence,
              tree: parseResultRaw.sections,
            };
          }
        } else {
          error = parseResultRaw.error || 'Semantic parsing failed';
          console.log('STAGE 5: Semantic parsing failed:', error);
        }
      } else {
        error = visionResult.error || 'Vision parsing failed';
      }
    }

    // Get current sections
    const sections = await prisma.lessonPlanSection.findMany({
      where: {
        lessonPlanId,
        versionNumber: 1,
      },
      orderBy: { sectionOrder: 'asc' },
    });

    // Count fields
    let totalTeacherActions = 0;
    let totalStudentActions = 0;
    let totalProducts = 0;
    let totalAssessments = 0;
    let totalQuestions = 0;
    let totalActivities = 0;

    for (const section of sections) {
      const pc = section.parsedContent as any;
      if (pc?.activities) {
        totalActivities += pc.activities.length;
        for (const activity of pc.activities) {
          totalTeacherActions += activity.teacherActions?.length || 0;
          totalStudentActions += activity.studentActions?.length || 0;
          totalProducts += activity.products?.length || 0;
          totalAssessments += activity.assessments?.length || 0;
          totalQuestions += activity.questions?.length || 0;
        }
      }
    }

    return NextResponse.json({
      success: true,
      lessonPlan: {
        id: lessonPlan.id,
        title: lessonPlan.title,
        filename: lessonPlan.originalFilename,
        mimeType: lessonPlan.mimeType,
        hasFile: !!fileBuffer,
      },
      parseResult,
      error,
      database: {
        sectionsCount: sections.length,
        activitiesCount: totalActivities,
        teacherActionsCount: totalTeacherActions,
        studentActionsCount: totalStudentActions,
        productsCount: totalProducts,
        assessmentsCount: totalAssessments,
        questionsCount: totalQuestions,
      },
      pipelineComparison: parseResult ? {
        parseResultSections: parseResult.sections,
        databaseSections: sections.length,
        match: parseResult.sections === sections.length,
      } : null,
    });

  } catch (error) {
    console.error('[Parser Run] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
