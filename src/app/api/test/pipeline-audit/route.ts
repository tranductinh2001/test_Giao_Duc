/**
 * Pipeline Audit API
 * POST /api/test/pipeline-audit
 *
 * Full pipeline audit: BrightOne → Parser → Rule Engine → AI Review → Issues → Annotations → Workspace
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDocument } from "@/core/document-adapters";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonPlanId } = body;

    if (!lessonPlanId) {
      return NextResponse.json({ error: "lessonPlanId required" }, { status: 400 });
    }

    // Get lesson plan with all related data
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: lessonPlanId },
      include: {
        sections: {
          orderBy: { sectionOrder: 'asc' },
        },
        reviewResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!lessonPlan) {
      return NextResponse.json({ error: "Lesson plan not found" }, { status: 404 });
    }

    // Step 1: Get BrightOne response
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = lessonPlan.filePath;
    const fullPath = filePath.startsWith('/uploads')
      ? path.join(process.cwd(), filePath)
      : filePath;

    let brightoneResponse: any = { success: false, error: null };
    try {
      const fileBuffer = await fs.readFile(fullPath);
      const fileName = lessonPlan.originalFilename || 'document';
      const mimeType = lessonPlan.mimeType || 'application/pdf';
      const result = await parseDocument(fileBuffer, fileName, mimeType);
      brightoneResponse = {
        success: result.success,
        error: result.error || null,
        sectionsCount: result.document?.sections?.length || 0,
        activitiesCount: result.document?.sections?.reduce((sum: number, s: any) => sum + (s.activities?.length || 0), 0) || 0,
      };
    } catch (err: any) {
      brightoneResponse.error = err.message;
    }

    // Step 2: Get Parser output (sections in database)
    const parserOutput = {
      sectionsCount: lessonPlan.sections.length,
      sections: lessonPlan.sections.map(s => ({
        id: s.id,
        title: s.sectionTitle,
        type: s.sectionType,
        wordCount: s.wordCount,
        hasParsedContent: !!s.parsedContent,
      })),
    };

    // Step 3: Get Rule Engine output (workflow session)
    const workflowSession = await prisma.workflowSession.findFirst({
      where: { lessonPlanId },
      orderBy: { createdAt: 'desc' },
    });

    const ruleEngineOutput = {
      sessionId: workflowSession?.id,
      status: workflowSession?.status,
      currentStep: workflowSession?.currentStep,
      error: workflowSession?.error,
    };

    // Step 4: Get AI Review output (review results)
    const reviewResult = lessonPlan.reviewResults[0];
    const aiReviewOutput = reviewResult ? {
      status: reviewResult.status,
      overallScore: reviewResult.overallScore,
      totalIssues: reviewResult.totalIssues,
      criticalIssues: reviewResult.criticalIssues,
      errorIssues: reviewResult.errorIssues,
      warningIssues: reviewResult.warningIssues,
      infoIssues: reviewResult.infoIssues,
      createdAt: reviewResult.createdAt,
    } : null;

    // Step 5: Get Issues
    const issues = reviewResult ? {
      content: reviewResult.totalIssues,
      structure: 0, // Need to check structure issues
    } : null;

    // Step 6: Get Annotations
    const annotations = await prisma.annotation.findMany({
      where: {
        section: {
          lessonPlanId,
        },
      },
      select: {
        id: true,
        annotationType: true,
        severity: true,
        message: true,
        explanation: true,
        suggestion: true,
        highlightedText: true,
        startPosition: true,
        endPosition: true,
        sectionId: true,
      },
    });

    // Step 7: Check Workspace (sections with parsedContent)
    const workspaceSections = lessonPlan.sections.filter(s => s.parsedContent);
    const workspaceOutput = {
      totalSections: workspaceSections.length,
      sectionsWithContent: workspaceSections.filter(s => s.rawContent && s.rawContent.length > 10).length,
    };

    // Step 8: Get Export status
    const exportHistory = await prisma.exportHistory.findMany({
      where: { lessonPlanId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Calculate pipeline completion
    const pipelineStatus = {
      brightone: brightoneResponse.success,
      parser: parserOutput.sectionsCount > 0,
      ruleEngine: !!workflowSession,
      aiReview: !!aiReviewOutput,
      annotations: annotations.length > 0,
      workspace: workspaceOutput.sectionsWithContent > 0,
      export: exportHistory.length > 0,
    };

    const completedSteps = Object.values(pipelineStatus).filter(v => v).length;
    const totalSteps = Object.keys(pipelineStatus).length;

    // Per-section details
    const sectionDetails = await Promise.all(
      lessonPlan.sections.slice(0, 5).map(async (section) => {
        // Get annotations for this section
        const sectionAnnotations = annotations.filter(a => a.sectionId === section.id);

        // Check if section was AI reviewed (has content issues)
        // Note: This would require joining with review issues

        return {
          id: section.id,
          title: section.sectionTitle,
          type: section.sectionType,
          wordCount: section.wordCount,
          hasRawContent: !!(section.rawContent && section.rawContent.length > 10),
          hasParsedContent: !!section.parsedContent,
          annotationsCount: sectionAnnotations.length,
        };
      })
    );

    return NextResponse.json({
      lessonPlanId,
      fileName: lessonPlan.originalFilename,
      pipelineStatus,
      completion: `${completedSteps}/${totalSteps} steps`,

      // Pipeline stages
      brightone: brightoneResponse,
      parser: parserOutput,
      ruleEngine: ruleEngineOutput,
      aiReview: aiReviewOutput,
      annotations: {
        total: annotations.length,
        byType: annotations.reduce((acc: Record<string, number>, a: any) => {
          const type = a.annotationType || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {}),
      },
      workspace: workspaceOutput,
      export: {
        count: exportHistory.length,
        latest: exportHistory[0]?.createdAt,
      },

      // Per-section details
      sections: sectionDetails,
    });

  } catch (error: any) {
    console.error("[Pipeline Audit] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
