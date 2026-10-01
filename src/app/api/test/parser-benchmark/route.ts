/**
 * Parser Benchmark API
 *
 * Run parser on multiple lesson plans and verify data at each step
 *
 * GET /api/test/parser-benchmark?limit=20&mimeType=pdf
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BrightOneVisionAdapter } from "@/core/document-adapters/BrightOneVisionAdapter";
import { AIDocumentParserPipeline } from "@/core/rule-engine-v2/parsers/AIDocumentParserPipeline";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const mimeType = searchParams.get('mimeType'); // 'pdf', 'docx', 'image', 'all'

    // Get lesson plans with files
    const whereClause: any = {
      originalFilename: { not: null },
      mimeType: { not: null },
    };

    if (mimeType && mimeType !== 'all') {
      if (mimeType === 'pdf') {
        whereClause.mimeType = { in: ['application/pdf', 'application/x-pdf'] };
      } else if (mimeType === 'docx') {
        whereClause.mimeType = { in: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] };
      } else if (mimeType === 'image') {
        whereClause.mimeType = { startsWith: 'image/' };
      }
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where: whereClause,
      take: limit,
      select: {
        id: true,
        title: true,
        originalFilename: true,
        mimeType: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const results = [];

    for (const lessonPlan of lessonPlans) {
      console.log(`[Benchmark] Processing: ${lessonPlan.title}`);

      try {
        // Get sections for this lesson plan
        const sections = await prisma.lessonPlanSection.findMany({
          where: {
            lessonPlanId: lessonPlan.id,
            versionNumber: 1,
          },
          select: {
            id: true,
            sectionTitle: true,
            sectionType: true,
            parsedContent: true,
            rawContent: true,
          },
        });

        // Count Semantic Tree fields
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

        results.push({
          lessonPlanId: lessonPlan.id,
          title: lessonPlan.title,
          filename: lessonPlan.originalFilename,
          mimeType: lessonPlan.mimeType,
          status: lessonPlan.status,
          sectionsCount: sections.length,
          activitiesCount: totalActivities,
          teacherActionsCount: totalTeacherActions,
          studentActionsCount: totalStudentActions,
          productsCount: totalProducts,
          assessmentsCount: totalAssessments,
          questionsCount: totalQuestions,
          hasData: totalTeacherActions > 0 || totalStudentActions > 0,
        });
      } catch (error) {
        console.error(`[Benchmark] Error processing ${lessonPlan.id}:`, error);
        results.push({
          lessonPlanId: lessonPlan.id,
          title: lessonPlan.title,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Summary
    const summary = {
      total: results.length,
      withData: results.filter(r => (r as any).hasData).length,
      totalSections: results.reduce((sum, r) => sum + ((r as any).sectionsCount || 0), 0),
      totalActivities: results.reduce((sum, r) => sum + ((r as any).activitiesCount || 0), 0),
      totalTeacherActions: results.reduce((sum, r) => sum + ((r as any).teacherActionsCount || 0), 0),
      totalStudentActions: results.reduce((sum, r) => sum + ((r as any).studentActionsCount || 0), 0),
      totalProducts: results.reduce((sum, r) => sum + ((r as any).productsCount || 0), 0),
      totalAssessments: results.reduce((sum, r) => sum + ((r as any).assessmentsCount || 0), 0),
      totalQuestions: results.reduce((sum, r) => sum + ((r as any).questionsCount || 0), 0),
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });

  } catch (error) {
    console.error('[Benchmark] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
