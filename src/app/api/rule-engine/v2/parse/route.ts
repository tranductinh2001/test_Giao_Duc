/**
 * Rule Engine v2.0 API
 *
 * POST /api/rule-engine/v2/parse - Parse document with Rule Engine
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { TemplateRepository } from '@/lib/repositories/TemplateRepository';
import { WorkflowOrchestrator } from '@/core/rule-engine-v2';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { text, lessonPlanId, templateId, templateCode, config } = body;

    // If lessonPlanId provided, load lesson plan and extract text
    const documentText = text;

    if (lessonPlanId) {
      const lessonPlan = await prisma.lessonPlan.findUnique({
        where: { id: lessonPlanId },
      });

      if (!lessonPlan) {
        return NextResponse.json(
          { success: false, message: 'Lesson plan not found' },
          { status: 404 }
        );
      }

      // Use documentText directly from request body
      // (extractedText field doesn't exist on LessonPlan model)
    }

    if (!documentText) {
      return NextResponse.json(
        { success: false, message: 'Missing text or lessonPlanId parameter' },
        { status: 400 }
      );
    }

    // Load template
    const repo = new TemplateRepository();
    let template;

    if (templateId) {
      template = await repo.findById(templateId);
    } else if (templateCode) {
      template = await repo.findByCode(templateCode);
    } else {
      template = await repo.findDefault();
    }

    if (!template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      );
    }

    // Map Prisma field names to WorkflowOrchestrator expected names
    const dbTemplate = template as any;
    const mappedTemplate = {
      ...template,
      sections: dbTemplate.rule_template_sections || [],
      parserRules: dbTemplate.section_parser_rules || [],
      structureRules: dbTemplate.section_structure_rules || [],
      contentRules: dbTemplate.section_content_rules || [],
      fixRules: dbTemplate.section_fix_rules || [],
      scoringRules: dbTemplate.section_scoring_rules || [],
    };

    // Create orchestrator
    const orchestrator = new WorkflowOrchestrator(
      mappedTemplate,
      {
        templateId: template.id,
        skipStructureValidation: config?.skipStructureValidation || false,
        skipContentReview: config?.skipContentReview || false,
        aiModel: config?.aiModel || 'gemini-3.1-flash-lite',
      }
      // BeekOne API key is now handled internally by BeekOneAIClient
    );

    // Execute workflow
    console.log('[API] Starting Rule Engine v2.0 workflow...');
    const startTime = Date.now();

    const result = await orchestrator.execute(documentText);

    const executionTime = Date.now() - startTime;

    console.log('[API] Workflow complete:', {
      success: result.success,
      score: result.scoreReport.totalScore,
      aiCalls: result.totalAiCalls,
      time: executionTime,
    });

    // If lessonPlanId provided, save results to database
    if (lessonPlanId) {
      // Update lesson plan status
      await prisma.lessonPlan.update({
        where: { id: lessonPlanId },
        data: { status: 'PARSED' },
      });

      // Save parsed sections
      await prisma.lessonPlanSection.deleteMany({
        where: { lessonPlanId },
      });

      for (const section of result.parseResult.sections) {
        await prisma.lessonPlanSection.create({
          data: {
            id: crypto.randomUUID(),
            lessonPlanId,
            versionNumber: 1,
            sectionType: section.sectionCode,
            sectionTitle: section.sectionName,
            rawContent: section.content,
            sectionOrder: result.parseResult.sections.indexOf(section),
            wordCount: section.content.split(/\s+/).length,
            charCount: section.content.length,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        template: {
          id: template.id,
          code: template.code,
          name: template.name,
        },
        parse: {
          sectionsFound: result.parseResult.sections.length,
          unmatchedLines: result.parseResult.unmatchedContent.length,
          sections: result.parseResult.sections.map((s) => ({
            code: s.sectionCode,
            name: s.sectionName,
            confidence: s.confidence,
            aiUsed: s.aiUsed,
            contentLength: s.content.length,
          })),
        },
        validation: {
          structureIssues: result.validationResult.structureIssues.length,
          contentIssues: result.validationResult.contentIssues.length,
          issues: [
            ...result.validationResult.structureIssues.map((i) => ({
              type: 'structure',
              severity: i.severity,
              message: i.message,
              suggestion: i.suggestion,
              penalty: i.penaltyScore,
            })),
            ...result.validationResult.contentIssues.map((i) => ({
              type: 'content',
              severity: i.severity,
              message: i.message,
              suggestion: i.suggestion,
              penalty: i.penaltyScore,
              aiGenerated: i.aiGenerated,
            })),
          ],
        },
        fixes: {
          applied: result.fixResult.appliedFixes.length,
          suggested: result.fixResult.rejectedFixes.length,
          fixes: [
            ...result.fixResult.appliedFixes.map((f) => ({
              type: f.fixType,
              content: f.content,
              instructions: f.instructions,
              autoApplied: true,
            })),
            ...result.fixResult.rejectedFixes.map((f) => ({
              type: f.fixType,
              content: f.content,
              instructions: f.instructions,
              autoApplied: false,
            })),
          ],
        },
        score: {
          total: result.scoreReport.totalScore,
          max: result.scoreReport.maxScore,
          percentage: result.scoreReport.percentage,
          breakdown: result.scoreReport.breakdown,
          issues: result.scoreReport.issuesSummary,
          penalties: result.scoreReport.penaltiesApplied,
        },
        metrics: {
          totalAiCalls: result.totalAiCalls,
          totalTime: result.totalTime,
          parseTime: result.parseResult.parseTime,
          validationTime: result.validationResult.validationTime,
          fixTime: result.fixResult.fixTime,
        },
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('[API] Rule Engine error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
