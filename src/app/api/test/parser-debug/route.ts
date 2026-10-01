/**
 * Parser Debug Endpoint
 *
 * Debug AI Parser to verify what data is being sent to Gemini
 *
 * GET /api/test/parser-debug?lessonPlanId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

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
          orderBy: { sectionOrder: 'asc' }
        }
      }
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Lesson plan not found" },
        { status: 404 }
      );
    }

    // Get workflow session
    const session = await prisma.workflowSession.findFirst({
      where: { lessonPlanId },
      orderBy: { createdAt: 'desc' }
    });

    // Check if file exists
    let fileInfo = null;
    if (lessonPlan.filePath) {
      const fullFilePath = lessonPlan.filePath.startsWith('/uploads')
        ? path.join(process.cwd(), lessonPlan.filePath)
        : lessonPlan.filePath;

      try {
        const fileBuffer = await readFile(fullFilePath);
        fileInfo = {
          path: fullFilePath,
          size: fileBuffer.length,
          sizeKB: Math.round(fileBuffer.length / 1024),
          sizeMB: (fileBuffer.length / (1024 * 1024)).toFixed(2),
          filename: lessonPlan.originalFilename,
          mimeType: lessonPlan.mimeType,
        };
      } catch (e) {
        fileInfo = { error: 'File not found' };
      }
    }

    // Get parse result from workflow
    let parseResult = null;
    if (session?.result) {
      const result = typeof session.result === 'string' ? JSON.parse(session.result) : session.result;
      parseResult = result.parseResult;
    }

    // Get sections (no activities in current schema)
    const sectionsData = await prisma.lessonPlanSection.findMany({
      where: {
        lessonPlanId,
        versionNumber: 1
      },
      orderBy: { sectionOrder: 'asc' }
    });

    return NextResponse.json({
      success: true,
      lessonPlan: {
        id: lessonPlan.id,
        title: lessonPlan.title,
        status: lessonPlan.status,
        filePath: lessonPlan.filePath,
        originalFilename: lessonPlan.originalFilename,
        mimeType: lessonPlan.mimeType,
      },
      fileInfo,
      workflowSession: session ? {
        id: session.id,
        status: session.status,
        currentStep: session.currentStep,
        createdAt: session.createdAt,
      } : null,
      sections: sectionsData.map(s => ({
        id: s.id,
        title: s.sectionTitle,
        type: s.sectionType,
        order: s.sectionOrder,
        hasParsedContent: !!s.parsedContent,
        wordCount: s.wordCount,
      })),
      parseResult: parseResult ? {
        success: parseResult.success,
        sectionCount: parseResult.sections?.length || 0,
        sections: parseResult.sections?.slice(0, 5).map((s: any) => ({
          id: s.id,
          title: s.sectionName || s.title,
          type: s.sectionCode || s.type,
          confidence: s.confidence,
          aiUsed: s.aiUsed,
        }))
      } : null,
      // Debug info
      debug: {
        note: "This shows what data is available in the system",
        nextSteps: [
          "1. Check if original file is being sent to AI Parser",
          "2. Check if Vision data is being converted properly",
          "3. Verify AI receives structured data vs flat text"
        ]
      }
    });

  } catch (error) {
    console.error('[Parser Debug] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
