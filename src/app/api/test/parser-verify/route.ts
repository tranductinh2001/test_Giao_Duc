/**
 * Parser Verification API
 * POST /api/test/parser-verify
 *
 * Runs full parser pipeline on a lesson plan and returns detailed verification
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDocument } from "@/core/document-adapters";
import { readFile } from "fs/promises";
import path from "path";

interface VerificationResult {
  lessonPlanId: string;
  fileName: string;
  fileType: string;

  // Pipeline stages
  brightone: {
    success: boolean;
    sectionsCount: number;
    activitiesCount: number;
    paragraphsCount: number;
    tablesCount: number;
    imagesCount: number;
    rawData?: any;
    sections?: any[];
  };

  structured: {
    sectionsCount: number;
    activitiesCount: number;
    paragraphsCount: number;
  };

  database: {
    sectionsCount: number;
    activitiesCount: number;
    paragraphsCount: number;
    sections: any[];
  };

  workspace: {
    sectionsCount: number;
    activitiesCount: number;
    paragraphsCount: number;
  };

  // Comparison
  comparison: {
    headings: { expected: number; actual: number; match: boolean };
    sections: { expected: number; actual: number; match: boolean };
    activities: { expected: number; actual: number; match: boolean; issues: string[] };
    paragraphs: { expected: number; actual: number; match: boolean; issues: string[] };
    tables: { expected: number; actual: number; match: boolean };
    images: { expected: number; actual: number; match: boolean };
  };

  // Accuracy
  accuracy: {
    heading: number;
    section: number;
    activity: number;
    paragraph: number;
    table: number;
    image: number;
    overall: number;
  };

  // Issues
  issues: Array<{
    type: string;
    location: string;
    expected: string;
    actual: string;
    severity: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonPlanId } = body;

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

    const filePath = lessonPlan.filePath;
    const fullPath = filePath.startsWith('/uploads')
      ? path.join(process.cwd(), filePath)
      : filePath;

    // Parse with BrightOne
    let brightoneResult: any = {
      success: false,
      sectionsCount: 0,
      activitiesCount: 0,
      paragraphsCount: 0,
      tablesCount: 0,
      imagesCount: 0,
    };

    try {
      const fileBuffer = await readFile(fullPath);
      const fileName = lessonPlan.originalFilename || 'document';
      const mimeType = lessonPlan.mimeType || 'application/pdf';
      const result = await parseDocument(fileBuffer, fileName, mimeType);

      if (result.success) {
        const doc = result.document;

        // Count from BrightOne
        let paragraphsCount = 0;
        let activitiesCount = 0;
        let tablesCount = 0;
        let imagesCount = 0;

        for (const section of doc?.sections || []) {
          activitiesCount += section.activities?.length || 0;
          for (const activity of section.activities || []) {
            const act = activity as any;
            paragraphsCount += act.paragraphs?.length || 0;
            tablesCount += act.tables?.length || 0;
            imagesCount += act.images?.length || 0;
          }
        }

        brightoneResult = {
          success: true,
          sectionsCount: doc?.sections?.length || 0,
          activitiesCount,
          paragraphsCount,
          tablesCount,
          imagesCount,
          rawData: result.rawData,
          sections: doc?.sections?.map((s: any) => ({
            id: s.id,
            title: s.title,
            type: s.type,
            activitiesCount: s.activities?.length || 0,
            activities: s.activities?.map((a: any) => ({
              id: a.id,
              title: a.title,
              paragraphsCount: a.paragraphs?.length || 0,
              tablesCount: a.tables?.length || 0,
              imagesCount: a.images?.length || 0,
            })),
          })),
        };
      }
    } catch (err: any) {
      brightoneResult.error = err.message;
    }

    // Get database sections
    const dbSections = lessonPlan.sections || [];

    // Count from database - check parsedContent
    let dbParagraphsCount = 0;
    let dbActivitiesCount = 0;
    const dbSectionsData: any[] = [];

    for (const section of dbSections) {
      const parsed = section.parsedContent as any;

      if (parsed) {
        if (parsed.paragraphs && Array.isArray(parsed.paragraphs)) {
          // Expanded format - each section is an activity
          dbParagraphsCount += parsed.paragraphs.length;
          dbActivitiesCount += 1;
          dbSectionsData.push({
            id: section.id,
            title: section.sectionTitle,
            type: section.sectionType,
            paragraphsCount: parsed.paragraphs.length,
            isExpanded: true,
          });
        } else if (parsed.activities && Array.isArray(parsed.activities)) {
          // Original format - activities nested in section
          dbActivitiesCount += parsed.activities.length;
          let sectionParaCount = 0;
          for (const act of parsed.activities) {
            sectionParaCount += act.paragraphs?.length || 0;
          }
          dbParagraphsCount += sectionParaCount;
          dbSectionsData.push({
            id: section.id,
            title: section.sectionTitle,
            type: section.sectionType,
            activitiesCount: parsed.activities.length,
            paragraphsCount: sectionParaCount,
            isExpanded: false,
          });
        }
      } else {
        // No parsedContent - count from rawContent
        dbSectionsData.push({
          id: section.id,
          title: section.sectionTitle,
          type: section.sectionType,
          paragraphsCount: 0,
          isExpanded: false,
        });
      }
    }

    // Comparison
    const comparison = {
      headings: {
        expected: brightoneResult.sectionsCount,
        actual: dbSections.length,
        match: brightoneResult.sectionsCount === dbSections.length,
      },
      sections: {
        expected: brightoneResult.sectionsCount,
        actual: dbSections.length,
        match: brightoneResult.sectionsCount === dbSections.length,
      },
      activities: {
        expected: brightoneResult.activitiesCount,
        actual: dbActivitiesCount,
        match: brightoneResult.activitiesCount === dbActivitiesCount,
        issues: [] as string[],
      },
      paragraphs: {
        expected: brightoneResult.paragraphsCount,
        actual: dbParagraphsCount,
        match: brightoneResult.paragraphsCount === dbParagraphsCount,
        issues: [] as string[],
      },
      tables: {
        expected: brightoneResult.tablesCount,
        actual: 0, // Not stored in current format
        match: false,
      },
      images: {
        expected: brightoneResult.imagesCount,
        actual: 0,
        match: false,
      },
    };

    // Check for activity issues
    if (brightoneResult.activitiesCount !== dbActivitiesCount) {
      const diff = Math.abs(brightoneResult.activitiesCount - dbActivitiesCount);
      if (brightoneResult.activitiesCount > dbActivitiesCount) {
        comparison.activities.issues.push(`Missing ${diff} activities - activities were merged`);
      } else {
        comparison.activities.issues.push(`Extra ${diff} activities - activities were split`);
      }
    }

    // Check for paragraph issues
    if (brightoneResult.paragraphsCount !== dbParagraphsCount) {
      const diff = Math.abs(brightoneResult.paragraphsCount - dbParagraphsCount);
      if (brightoneResult.paragraphsCount > dbParagraphsCount) {
        comparison.paragraphs.issues.push(`Missing ${diff} paragraphs`);
      } else {
        comparison.paragraphs.issues.push(`Extra ${diff} paragraphs`);
      }
    }

    // Build issues list
    const issues: VerificationResult['issues'] = [];

    if (!comparison.headings.match) {
      issues.push({
        type: 'heading_mismatch',
        location: 'headings',
        expected: `${comparison.headings.expected} headings`,
        actual: `${comparison.headings.actual} headings`,
        severity: comparison.headings.expected > comparison.headings.actual ? 'critical' : 'warning',
      });
    }

    if (!comparison.activities.match) {
      issues.push({
        type: 'activity_mismatch',
        location: 'activities',
        expected: `${comparison.activities.expected} activities`,
        actual: `${comparison.activities.actual} activities`,
        severity: 'critical',
      });
    }

    if (!comparison.paragraphs.match) {
      issues.push({
        type: 'paragraph_mismatch',
        location: 'paragraphs',
        expected: `${comparison.paragraphs.expected} paragraphs`,
        actual: `${comparison.paragraphs.actual} paragraphs`,
        severity: 'critical',
      });
    }

    // Calculate accuracy
    const calcAccuracy = (expected: number, actual: number): number => {
      if (expected === 0) return actual === 0 ? 100 : 0;
      return Math.max(0, Math.min(100, (actual / expected) * 100));
    };

    const headingAccuracy = calcAccuracy(comparison.headings.expected, comparison.headings.actual);
    const sectionAccuracy = calcAccuracy(comparison.sections.expected, comparison.sections.actual);
    const activityAccuracy = calcAccuracy(comparison.activities.expected, comparison.activities.actual);
    const paragraphAccuracy = calcAccuracy(comparison.paragraphs.expected, comparison.paragraphs.actual);
    const tableAccuracy = calcAccuracy(comparison.tables.expected, comparison.tables.actual);
    const imageAccuracy = calcAccuracy(comparison.images.expected, comparison.images.actual);

    const overallAccuracy = (
      headingAccuracy * 0.15 +
      sectionAccuracy * 0.15 +
      activityAccuracy * 0.25 +
      paragraphAccuracy * 0.30 +
      tableAccuracy * 0.075 +
      imageAccuracy * 0.075
    );

    const result: VerificationResult = {
      lessonPlanId,
      fileName: lessonPlan.originalFilename || '',
      fileType: lessonPlan.mimeType || '',

      brightone: brightoneResult,
      structured: {
        sectionsCount: dbSections.length,
        activitiesCount: dbActivitiesCount,
        paragraphsCount: dbParagraphsCount,
      },
      database: {
        sectionsCount: dbSections.length,
        activitiesCount: dbActivitiesCount,
        paragraphsCount: dbParagraphsCount,
        sections: dbSectionsData,
      },
      workspace: {
        sectionsCount: dbSections.length,
        activitiesCount: dbActivitiesCount,
        paragraphsCount: dbParagraphsCount,
      },

      comparison,
      accuracy: {
        heading: headingAccuracy,
        section: sectionAccuracy,
        activity: activityAccuracy,
        paragraph: paragraphAccuracy,
        table: tableAccuracy,
        image: imageAccuracy,
        overall: overallAccuracy,
      },

      issues,
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[Parser Verify] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
