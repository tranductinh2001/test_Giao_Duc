/**
 * Unified Workflow Service
 *
 * SINGLE entry point for all workflow operations.
 * Wraps WorkflowOrchestrator and handles database persistence.
 *
 * IMPORTANT: For PDF/Images, BrightOne is called FIRST to parse the document,
 * then the parsed sections are used for the workflow.
 */

import { prisma } from '@/lib/prisma';
import { WorkflowOrchestrator } from '@/core/rule-engine-v2';
import { ReviewStatus, WorkflowStatus } from '@prisma/client';
import { TemplateRepository } from '@/lib/repositories/TemplateRepository';
import { logger } from '@/lib/logger';
import { findTextbookContext, getTextbookChapters } from '@/core/textbook/matcher';
import { getTextbookContext as extractTextbookContext } from '@/core/textbook/extractor';
import { parseDocument } from '@/core/document-adapters';
import { readFile } from 'fs/promises';
import path, { join } from 'path';

// Cost estimation constants (Gemini pricing)
const COST_PER_1M_PROMPT_TOKENS = 0.0; // Free for Gemini 2.0 Flash
const COST_PER_1M_COMPLETION_TOKENS = 0.0;

/**
 * Calculate estimated cost based on token usage
 */
function calculateCost(promptTokens: number, completionTokens: number): number {
  return (promptTokens * COST_PER_1M_PROMPT_TOKENS / 1_000_000) +
         (completionTokens * COST_PER_1M_COMPLETION_TOKENS / 1_000_000);
}

export interface StartWorkflowOptions {
  lessonPlanId: string;
  userId: string;
  templateId?: string;
  templateCode?: string;
  aiModel?: string;
  skipStructureValidation?: boolean;
  skipContentReview?: boolean;
  // Textbook context for lesson review
  textbookBookId?: string;
  textbookLessonTitle?: string;
}

export interface WorkflowProgress {
  sessionId: string;
  status: string;
  currentStep: string;
  progress: number;
  steps: WorkflowStepProgress[];
}

export interface WorkflowStepProgress {
  name: string;
  status: string;
  progress: number;
  output?: any;
  error?: string;
  executionTime?: number;
}

export interface WorkflowResult {
  sessionId: string;
  status: string;
  parseResult?: any;
  mappingResult?: any;
  reviewResult?: any;
  annotationResult?: any;
  suggestionResult?: any;
  metrics: {
    totalAiCalls: number;
    totalTokens: number;
    totalCost: number;
    executionTime: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  error?: string;
}

/**
 * Start a new workflow for a lesson plan
 * This is the ONLY entry point for starting workflows
 */
export async function startWorkflow(options: StartWorkflowOptions): Promise<string> {
  const { lessonPlanId, userId, templateId, templateCode, aiModel, skipStructureValidation, skipContentReview, textbookBookId, textbookLessonTitle } = options;

  // Validate lesson plan exists
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
    throw new Error('Lesson plan not found');
  }

  // Create workflow session in database
  const session = await prisma.workflowSession.create({
    data: {
      lessonPlanId,
      userId,
      status: WorkflowStatus.PENDING,
      currentStep: 'PENDING',
      progress: 0,
    },
  });

  // Log workflow start
  logger.logWorkflowStart({
    sessionId: session.id,
    workflowId: session.id,
    lessonPlanId,
    userId,
  });

  // Update lesson plan status
  await prisma.lessonPlan.update({
    where: { id: lessonPlanId },
    data: { status: WorkflowStatus.PARSING },
  });

  // Start workflow execution in background
  executeWorkflow(session.id, {
    lessonPlanId,
    userId,
    templateId,
    templateCode,
    aiModel,
    skipStructureValidation,
    skipContentReview,
    textbookBookId,
    textbookLessonTitle,
    sections: lessonPlan.sections,
    filePath: lessonPlan.filePath,
  }).catch(console.error);

  return session.id;
}

/**
 * Execute workflow in background and persist results
 */
async function executeWorkflow(
  sessionId: string,
  options: {
    lessonPlanId: string;
    userId: string;
    templateId?: string;
    templateCode?: string;
    aiModel?: string;
    skipStructureValidation?: boolean;
    skipContentReview?: boolean;
    textbookBookId?: string;
    textbookLessonTitle?: string;
    sections: any[];
    filePath: string;
  }
): Promise<void> {
  const { lessonPlanId, userId, templateId, templateCode, aiModel, skipStructureValidation, skipContentReview, textbookBookId, textbookLessonTitle, sections, filePath } = options;
  const startTime = Date.now();

  try {
    // Update session to PARSING
    await prisma.workflowSession.update({
      where: { id: sessionId },
      data: {
        status: WorkflowStatus.PARSING,
        currentStep: 'PARSING',
        progress: 10,
        startedAt: new Date(),
      },
    });

    // ============================================================
    // STEP 1: PARSE DOCUMENT WITH BRIGHTONE (FIRST!)
    // For PDF/Images, BrightOne is called FIRST to extract content
    // ============================================================
    console.log('[Workflow] Step 1: Parsing document with BrightOne...');

    // Load file from storage
    let documentText = '';
    let parseSource = 'existing_sections';
    let brightoneStructured: any = null;

    // Check if we have existing parsed sections WITH STRUCTURED DATA
    // If filePath is available, ALWAYS re-parse with BrightOne to get fresh structured data
    const hasStructuredData = sections?.some(s => s.parsedContent && s.parsedContent.activities);

    if (sections && sections.length > 0 && hasStructuredData && !filePath) {
      // Use existing sections from database only if they have structured data AND no file to re-parse
      documentText = sections.map(s => s.rawContent).join('\n\n');
      console.log(`[Workflow] Using existing sections with structured data: ${sections.length} sections`);
      parseSource = 'database';

      const parsedContentSections = sections
        .filter(s => s.parsedContent && s.parsedContent.activities)
        .map(s => s.parsedContent);

      if (parsedContentSections.length > 0) {
        brightoneStructured = { sections: parsedContentSections };
        console.log(`[Workflow] Using structured data from ${parsedContentSections.length} sections`);
      }
    } else if (filePath) {
      // Always re-parse with BrightOne when filePath is available
      // Need to parse the file with BrightOne
      // filePath is stored as /uploads/lesson-plans/filename, need full path
      const fullFilePath = filePath.startsWith('/uploads')
        ? path.join(process.cwd(), filePath)
        : filePath;
      console.log(`[Workflow] Loading file for BrightOne parsing: ${fullFilePath}`);
      try {
        const fileBuffer = await readFile(fullFilePath);

        // Get lesson plan for filename/mimeType
        const lessonPlan = await prisma.lessonPlan.findUnique({
          where: { id: lessonPlanId },
          select: { originalFilename: true, mimeType: true },
        });

        const fileName = lessonPlan?.originalFilename || 'document.pdf';
        const mimeType = lessonPlan?.mimeType || 'application/pdf';

        // Call BrightOne to parse the document
        console.log(`[Workflow] Calling BrightOne for: ${fileName} (${mimeType})`);
        const parseStart = Date.now();
        const parseResult = await parseDocument(fileBuffer, fileName, mimeType);
        const parseTime = Date.now() - parseStart;

        console.log(`[Workflow] BrightOne parse: ${parseResult.success ? 'success' : 'failed'} in ${parseTime}ms`);

        if (!parseResult.success) {
          // BrightOne failed - fallback to error
          const errorMsg = parseResult.error || 'Failed to parse document';
          console.error('[Workflow] BrightOne parse failed:', errorMsg);

          await prisma.workflowSession.update({
            where: { id: sessionId },
            data: {
              status: WorkflowStatus.FAILED,
              currentStep: 'PARSE_FAILED',
              error: errorMsg,
              completedAt: new Date(),
            },
          });

          await prisma.lessonPlan.update({
            where: { id: lessonPlanId },
            data: { status: WorkflowStatus.FAILED },
          });

          throw new Error(errorMsg);
        }

        // Extract text from parsed document
        const doc = parseResult.document;
        brightoneStructured = null; // Reset before populating

        if (doc) {
          brightoneStructured = doc; // Save for orchestrator
          // Convert document sections to text
          documentText = doc.sections?.flatMap(section =>
            section.activities?.flatMap(activity =>
              activity.paragraphs?.map(para => para.content)
            ) || []
          ).join('\n\n') || '';

          console.log(`[Workflow] BrightOne extracted: ${documentText.length} chars, ${doc.sections?.length || 0} sections`);
          parseSource = 'brightone';

          // Save parsed sections to database WITH STRUCTURED DATA
          // Expand each Activity into a separate Section to preserve paragraph structure!
          if (doc.sections && doc.sections.length > 0) {
            await prisma.lessonPlanSection.deleteMany({
              where: { lessonPlanId },
            });

            const expandedSections: any[] = [];
            for (const section of doc.sections || []) {
              const activities = section.activities || [];
              if (activities.length > 0) {
                // Each activity becomes a separate section
                for (let actIdx = 0; actIdx < activities.length; actIdx++) {
                  const activity = activities[actIdx] as any; // AI Semantic Tree has extended fields
                  const paragraphs = activity.paragraphs || [];
                  const rawContent = paragraphs.map((p: any) => p.content).join('\n\n');
                  expandedSections.push({
                    id: crypto.randomUUID(),
                    lessonPlanId,
                    versionNumber: 1,
                    sectionType: 'ACTIVITY',
                    sectionTitle: activity.title || `Hoạt động ${actIdx + 1}`,
                    rawContent: rawContent,
                    parsedContent: {
                      title: activity.title,
                      type: 'activity',
                      // Full Semantic Tree preserved
                      paragraphs: paragraphs,
                      // Teacher Actions
                      teacherActions: activity.teacherActions || [],
                      // Student Actions
                      studentActions: activity.studentActions || [],
                      // Questions
                      questions: activity.questions || [],
                      // Products/Learning Outcomes
                      products: activity.products || [],
                      // Assessments
                      assessments: activity.assessments || [],
                      // Activity metadata
                      goal: activity.goal || null,
                      duration: activity.duration || null,
                      activityType: activity.type || null,
                      confidence: activity.confidence || null,
                    },
                    sectionOrder: expandedSections.length,
                    wordCount: paragraphs.reduce((sum: number, p: any) =>
                      sum + (p.content?.split(/\s+/).filter(Boolean).length || 0), 0),
                    charCount: paragraphs.reduce((sum: number, p: any) =>
                      sum + (p.content?.length || 0), 0),
                  });
                }
              }
              // If no activities, skip - we only save activities as sections
            }

            console.log(`[Workflow] Saving ${expandedSections.length} sections (expanded from activities)`);

            // Debug: Count all activity fields
            let totalTeacherActions = 0;
            let totalStudentActions = 0;
            let totalProducts = 0;
            let totalAssessments = 0;
            let totalQuestions = 0;

            for (const section of expandedSections) {
              const pc = section.parsedContent;
              if (pc) {
                totalTeacherActions += pc.teacherActions?.length || 0;
                totalStudentActions += pc.studentActions?.length || 0;
                totalProducts += pc.products?.length || 0;
                totalAssessments += pc.assessments?.length || 0;
                totalQuestions += pc.questions?.length || 0;
              }
            }

            console.log(`[Workflow] DEBUG - Semantic Tree Data Preserved:`);
            console.log(`[Workflow]   - Total Sections: ${expandedSections.length}`);
            console.log(`[Workflow]   - Total TeacherActions: ${totalTeacherActions}`);
            console.log(`[Workflow]   - Total StudentActions: ${totalStudentActions}`);
            console.log(`[Workflow]   - Total Products: ${totalProducts}`);
            console.log(`[Workflow]   - Total Assessments: ${totalAssessments}`);
            console.log(`[Workflow]   - Total Questions: ${totalQuestions}`);

            await prisma.lessonPlanSection.createMany({ data: expandedSections });
            console.log(`[Workflow] Saved ${expandedSections.length} parsed sections with full structure to database`);

            // CRITICAL: Validate database save
            const savedSections = await prisma.lessonPlanSection.findMany({
              where: { lessonPlanId },
              select: {
                id: true,
                sectionTitle: true,
                parsedContent: true,
              },
            });

            let savedTeacherActions = 0;
            let savedStudentActions = 0;
            let savedProducts = 0;
            let savedAssessments = 0;
            let savedQuestions = 0;

            for (const saved of savedSections) {
              const pc = saved.parsedContent as any;
              if (pc?.teacherActions) savedTeacherActions += pc.teacherActions.length;
              if (pc?.studentActions) savedStudentActions += pc.studentActions.length;
              if (pc?.products) savedProducts += pc.products.length;
              if (pc?.assessments) savedAssessments += pc.assessments.length;
              if (pc?.questions) savedQuestions += pc.questions.length;
            }

            console.log(`[Workflow] DATABASE VALIDATION:`);
            console.log(`[Workflow]   Saved TeacherActions: ${savedTeacherActions} (expected: ${totalTeacherActions})`);
            console.log(`[Workflow]   Saved StudentActions: ${savedStudentActions} (expected: ${totalStudentActions})`);
            console.log(`[Workflow]   Saved Products: ${savedProducts} (expected: ${totalProducts})`);
            console.log(`[Workflow]   Saved Assessments: ${savedAssessments} (expected: ${totalAssessments})`);
            console.log(`[Workflow]   Saved Questions: ${savedQuestions} (expected: ${totalQuestions})`);

            // CRITICAL: Check for data loss
            if (savedTeacherActions !== totalTeacherActions) {
              console.error('[Workflow] CRITICAL: TeacherActions DATA LOSS detected!');
              console.error(`[Workflow] Expected: ${totalTeacherActions}, Got: ${savedTeacherActions}`);
            }
            if (savedStudentActions !== totalStudentActions) {
              console.error('[Workflow] CRITICAL: StudentActions DATA LOSS detected!');
              console.error(`[Workflow] Expected: ${totalStudentActions}, Got: ${savedStudentActions}`);
            }
          }
        }
      } catch (fileError) {
        console.error('[Workflow] Error loading file:', fileError);
        // If file doesn't exist, try to use existing sections or fail
        if (sections && sections.length > 0) {
          documentText = sections.map(s => s.rawContent).join('\n\n');
        } else {
          throw new Error('Cannot load file and no existing sections available');
        }
      }
    }

    // Now validate after BrightOne has processed
    if (!documentText || documentText.trim().length === 0) {
      const errorMsg = 'No content found in document. Please upload a valid document.';
      console.error('[Workflow] Empty document text after BrightOne processing');

      await prisma.workflowSession.update({
        where: { id: sessionId },
        data: {
          status: WorkflowStatus.FAILED,
          currentStep: 'EMPTY_CONTENT',
          error: errorMsg,
          completedAt: new Date(),
        },
      });

      await prisma.lessonPlan.update({
        where: { id: lessonPlanId },
        data: { status: WorkflowStatus.FAILED },
      });

      throw new Error(errorMsg);
    }

    console.log(`[Workflow] Document ready: ${documentText.length} chars, source: ${parseSource}`);

    // ============================================================
    // STEP 2: EXTRACT TEXTBOOK CONTEXT
    // ============================================================
    console.log('[Workflow] Step 2: Extracting textbook context...');

    // Get lesson plan for grade/subject and circular info
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: lessonPlanId },
      select: {
        title: true,
        gradeLevel: true,
        subject: true,
        circularId: true,
        circular: {
          select: {
            id: true,
            code: true,
            title: true,
          }
        }
      },
    });

    // Get Circular version info (optional - won't fail if table doesn't exist)
    let circularVersion = null;
    if (lessonPlan?.circularId) {
      try {
        const versions = await prisma.$queryRaw<{ version: number }[]>`
          SELECT version FROM "CircularVersion" WHERE "circularId" = ${lessonPlan.circularId} ORDER BY version DESC LIMIT 1
        `;
        if (versions.length > 0) {
          circularVersion = versions[0].version;
        }
      } catch (error) {
        // Table may not exist - silently ignore
      }
    }

    // Extract textbook context if provided or auto-match
    let textbookContext = null;
    let usedTextbookBookId = textbookBookId;

    if (usedTextbookBookId && textbookLessonTitle) {
      const result = await extractTextbookContext(usedTextbookBookId, textbookLessonTitle);
      if (result.chapter) {
        textbookContext = {
          bookId: usedTextbookBookId,
          chapterId: result.chapter.id,
          chapterTitle: result.chapter.title,
          startPage: result.chapter.startPage,
          endPage: result.chapter.endPage,
        };
      }
    } else if (lessonPlan && lessonPlan.gradeLevel && lessonPlan.subject) {
      const matchResult = await findTextbookContext(
        lessonPlan.gradeLevel,
        lessonPlan.subject,
        lessonPlan.title
      );
      if (matchResult.book && matchResult.chapter && matchResult.method !== 'fuzzy') {
        usedTextbookBookId = matchResult.book.id;
        textbookContext = {
          bookId: matchResult.book.id,
          bookName: matchResult.book.name,
          chapterId: matchResult.chapter.id,
          chapterTitle: matchResult.chapter.title,
          startPage: matchResult.chapter.startPage,
          endPage: matchResult.chapter.endPage,
        };
      }
    }

    // ============================================================
    // STEP 3: LOAD TEMPLATE
    // ============================================================
    console.log('[Workflow] Step 3: Loading template...');

    const repo = new TemplateRepository();
    let template = null;
    let templateSource = '';

    if (templateId) {
      template = await repo.findById(templateId);
      templateSource = template ? 'by ID' : 'not found by ID';
    }

    if (!template && templateCode) {
      template = await repo.findByCode(templateCode);
      templateSource = template ? 'by code' : `code "${templateCode}" not found`;
    }

    if (!template) {
      template = await repo.findDefault();
      templateSource = template ? 'default template' : 'no default template';
    }

    if (!template) {
      const allTemplates = await prisma.rule_templates.findMany({
        where: { isActive: true },
        take: 1,
      });
      if (allTemplates.length > 0) {
        template = await repo.findById(allTemplates[0].id);
        templateSource = 'first active template (fallback)';
      }
    }

    if (!template) {
      const errorMsg = 'No active lesson template found. Please create or activate a template in Admin.';

      await prisma.workflowSession.update({
        where: { id: sessionId },
        data: {
          status: WorkflowStatus.FAILED,
          currentStep: 'TEMPLATE_ERROR',
          error: errorMsg,
          completedAt: new Date(),
        },
      });

      await prisma.lessonPlan.update({
        where: { id: lessonPlanId },
        data: { status: WorkflowStatus.FAILED },
      });

      throw new Error(errorMsg);
    }

    console.log(`[Workflow] Template loaded: ${template.name} (${template.code}), source: ${templateSource}`);

    // ============================================================
    // CRITICAL: Map Prisma field names to WorkflowOrchestrator expected names
    // Prisma returns: section_parser_rules, section_structure_rules, etc.
    // WorkflowOrchestrator expects: parserRules, structureRules, etc.
    // Template from Prisma has different field names - need to map them
    // ============================================================
    const dbTemplate = template as any;
    const sectionsMap = new Map((dbTemplate.rule_template_sections || []).map((s: any) => [s.id, s.code]));
    const sectionsAliasMap = new Map((dbTemplate.rule_template_sections || []).map((s: any) => {
      // Parse aliases from JSON string or use default
      let aliases: string[] = [];
      try {
        if (s.aliases) {
          aliases = typeof s.aliases === 'string' ? JSON.parse(s.aliases) : s.aliases;
        }
      } catch (e) {
        // If parsing fails, use empty array
      }
      return [s.id, aliases];
    }));

    // Map sectionCode and aliases to each rule - CRITICAL: sectionCode is the section CODE (e.g., "MUC_TIEU"), not UUID
    const mappedTemplate = {
      ...template,
      sections: dbTemplate.rule_template_sections || [],
      parserRules: (dbTemplate.section_parser_rules || []).map((r: any) => ({
        ...r,
        sectionCode: sectionsMap.get(r.sectionId) || r.sectionId,
        aliases: sectionsAliasMap.get(r.sectionId) || [], // Add aliases from template section
      })),
      structureRules: (dbTemplate.section_structure_rules || []).map((r: any) => ({
        ...r,
        sectionCode: r.sectionId ? (sectionsMap.get(r.sectionId) || r.sectionId) : undefined,
      })),
      contentRules: (dbTemplate.section_content_rules || []).map((r: any) => ({
        ...r,
        sectionCode: sectionsMap.get(r.sectionId) || r.sectionId,
      })),
      fixRules: dbTemplate.section_fix_rules || [],
      scoringRules: dbTemplate.section_scoring_rules || [],
    };

    console.log(`[Workflow] Template mapping: ${mappedTemplate.parserRules.length} parserRules, ${mappedTemplate.structureRules.length} structureRules`);
    console.log(`[Workflow] Section aliases:`, Object.fromEntries(sectionsAliasMap));

    // ============================================================
    // STEP 4: EXECUTE WORKFLOW ORCHESTRATOR
    // ============================================================
    console.log('[Workflow] Step 4: Executing workflow orchestrator...');

    const orchestrator = new WorkflowOrchestrator(
      mappedTemplate,
      {
        templateId: template.id,
        skipStructureValidation: skipStructureValidation || false,
        skipContentReview: skipContentReview || false,
        aiModel: aiModel || 'gemini-3.1-flash-lite',
        // Pass BrightOne structured data to preserve paragraphs/activities
        brightoneStructured: brightoneStructured || undefined,
        // Pass Circular information for dynamic prompts
        circularId: lessonPlan?.circularId || undefined,
        circularCode: lessonPlan?.circular?.code || undefined,
        circularVersion: circularVersion || undefined,
        subject: lessonPlan?.subject || undefined,
        gradeLevel: lessonPlan?.gradeLevel || undefined,
        // Pass Textbook context for lesson-specific review
        textbookContext: textbookContext || undefined,
      }
      // BeekOne API key is now handled internally by BeekOneAIClient
    );

    // Debug: Log what we're passing
    console.log('[Workflow] DEBUG: brightoneStructured sections count:', brightoneStructured?.sections?.length || 0);
    console.log('[Workflow] DEBUG: brightoneStructured has activities:', brightoneStructured?.sections?.[0]?.activities?.length || 0);

    console.log('[Workflow] Starting orchestrator.execute()...');
    const result = await orchestrator.execute(documentText, brightoneStructured);
    console.log('[Workflow] Orchestrator result - success:', result.success, ', errors:', result.errors?.length);

    const executionTime = Date.now() - startTime;

    // Extract token metrics from result
    const promptTokens = result.tokensUsed?.promptTokens || 0;
    const completionTokens = result.tokensUsed?.completionTokens || 0;
    const totalTokens = result.tokensUsed?.totalTokens || 0;
    const estimatedCost = result.estimatedCost || calculateCost(promptTokens, completionTokens);

    // Log workflow step completion
    logger.logWorkflowStep('PARSING', {
      sessionId,
      workflowId: sessionId,
      duration: executionTime,
      totalAiCalls: result.totalAiCalls,
      totalTokens,
    });

    // Parse sections into database with transaction
    // Only update sections if orchestrator returned valid sections
    // Otherwise, keep the sections saved from Step 1 (BrightOne parse)
    const parseSucceeded = result.parseResult && result.parseResult.sections.length > 0;

    const transactionResult = await prisma.$transaction(async (tx) => {
      // CRITICAL: Keep sections from Step 1 (BrightOne parse) - DO NOT OVERWRITE!
      // SectionParser only identifies sections, it should NOT replace the content from BrightOne
      // We only update sectionType/sectionTitle to match detected codes
      if (parseSucceeded && result.parseResult.sections.length > 0) {
        // Get existing sections from Step 1
        const existingSections = await tx.lessonPlanSection.findMany({
          where: { lessonPlanId },
          orderBy: { sectionOrder: 'asc' },
        });

        // Update sectionType and sectionTitle for each existing section
        // But KEEP the original rawContent from BrightOne!
        for (let i = 0; i < Math.min(result.parseResult.sections.length, existingSections.length); i++) {
          const detected = result.parseResult.sections[i];
          const existing = existingSections[i];

          if (existing) {
            await tx.lessonPlanSection.update({
              where: { id: existing.id },
              data: {
                sectionType: detected.sectionCode,
                sectionTitle: detected.sectionName || detected.sectionCode,
                // DO NOT update rawContent - keep original from BrightOne!
              },
            });
          }
        }

        // Delete any extra sections that weren't matched
        if (result.parseResult.sections.length < existingSections.length) {
          const toDelete = existingSections.slice(result.parseResult.sections.length);
          await tx.lessonPlanSection.deleteMany({
            where: { id: { in: toDelete.map(s => s.id) } },
          });
        }

        console.log('[Workflow] Updated section types from orchestrator, kept content from BrightOne:', result.parseResult.sections.length);
      } else {
        console.log('[Workflow] Keeping sections from Step 1 (BrightOne parse)');
      }

      // Determine if review was actually completed
      const aiCalls = result.totalAiCalls;
      const hasContentRules = (result.validationResult.contentIssues.length > 0) || (aiCalls > 0);
      const hasErrors = result.errors && result.errors.length > 0;

      // Determine review status based on AI success:
      // - DRAFT: If there were errors or AI provider failed
      // - INCOMPLETE: If parsing succeeded but AI review failed (aiCalls = 0 but had rules)
      // - COMPLETED: If AI review was successful
      let reviewStatus: ReviewStatus;
      if (hasErrors) {
        reviewStatus = ReviewStatus.DRAFT;
        console.log('[Workflow] WARNING: Workflow had errors, marking as DRAFT');
      } else if (!parseSucceeded) {
        reviewStatus = ReviewStatus.DRAFT;
        console.log('[Workflow] WARNING: Parsing failed, marking as DRAFT');
      } else if (hasContentRules && aiCalls === 0) {
        // Had rules but AI didn't run - could be provider unavailable
        reviewStatus = ReviewStatus.DRAFT;
        console.log('[Workflow] WARNING: AI provider unavailable or no rules to check, marking as DRAFT');
      } else if (aiCalls > 0) {
        reviewStatus = ReviewStatus.COMPLETED;
      } else {
        reviewStatus = ReviewStatus.DRAFT;
      }

      console.log('[Workflow] ===== SAVING REVIEW RESULT =====');
      console.log('[Workflow] AI calls:', aiCalls);
      console.log('[Workflow] Content issues:', result.validationResult.contentIssues.length);
      console.log('[Workflow] Review status:', reviewStatus);
      console.log('[Workflow] ========================');

      // Create ReviewResult record
      const allIssues = [...result.validationResult.contentIssues, ...result.validationResult.structureIssues];
      const reviewResult = await tx.reviewResult.create({
        data: {
          lessonPlanId,
          overallScore: result.scoreReport.totalScore,
          status: reviewStatus,
          totalIssues: allIssues.length,
          criticalIssues: allIssues.filter((i: any) => i.severity === 'CRITICAL').length,
          errorIssues: allIssues.filter((i: any) => i.severity === 'ERROR').length,
          warningIssues: allIssues.filter((i: any) => i.severity === 'WARNING').length,
          infoIssues: allIssues.filter((i: any) => i.severity === 'INFO').length,
          suggestions: result.fixResult.rejectedFixes.map((f: any) => ({
            instructions: f.instructions,
            content: f.content,
          })),
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });

      // Create annotations from content issues - map to correct section
      // First, get all sections for this lesson plan to use as fallback
      const allSections = await tx.lessonPlanSection.findMany({
        where: { lessonPlanId },
        orderBy: { sectionOrder: 'asc' },
        take: 1,
      });
      const fallbackSectionId = allSections[0]?.id;

      for (const issue of result.validationResult.contentIssues) {
        // Find the section that matches this issue's sectionId
        const issueSectionId = issue.position?.sectionId || issue.sectionCode;
        let sectionId = fallbackSectionId;

        if (issueSectionId) {
          // First try to find by sectionType (sectionCode)
          const existingSection = await tx.lessonPlanSection.findFirst({
            where: {
              lessonPlanId,
              sectionType: issueSectionId,
            },
          });
          if (existingSection) {
            sectionId = existingSection.id;
          }
        }

        // Skip if no valid section ID available
        if (!sectionId) {
          console.warn('[Workflow] Skipping annotation - no section found for:', issueSectionId || issue.ruleCode);
          continue;
        }

        await tx.annotation.create({
          data: {
            reviewResultId: reviewResult.id,
            sectionId,
            annotationType: 'SUGGESTION',
            severity: issue.severity,
            startPosition: 0,
            endPosition: 0,
            message: issue.message,
            explanation: issue.explanation || issue.message,
            suggestion: issue.suggestion,
            proposedContent: issue.suggestion || issue.message,
            status: WorkflowStatus.PENDING,
          },
        });
      }

      // Also create annotations from structure issues
      for (const issue of result.validationResult.structureIssues) {
        const issueSectionId = issue.position?.sectionId || issue.ruleCode;
        let sectionId = fallbackSectionId;

        if (issueSectionId) {
          const existingSection = await tx.lessonPlanSection.findFirst({
            where: {
              lessonPlanId,
              sectionType: issueSectionId,
            },
          });
          if (existingSection) {
            sectionId = existingSection.id;
          }
        }

        // Skip if no valid section ID available
        if (!sectionId) {
          console.warn('[Workflow] Skipping structure annotation - no section found for:', issueSectionId || issue.ruleCode);
          continue;
        }

        await tx.annotation.create({
          data: {
            reviewResultId: reviewResult.id,
            sectionId,
            annotationType: issue.severity === 'ERROR' ? 'ERROR' : 'WARNING',
            severity: issue.severity,
            startPosition: 0,
            endPosition: 0,
            message: issue.message,
            explanation: issue.message,
            suggestion: issue.suggestion,
            proposedContent: issue.suggestion || issue.message,
            status: WorkflowStatus.PENDING,
          },
        });
      }

      return { reviewResultId: reviewResult.id, totalIssues: reviewResult.totalIssues };
    });

    const reviewResultId = transactionResult.reviewResultId;
    const totalIssues = transactionResult.totalIssues;

    // Update session with complete results (store in result JSON)
    await prisma.workflowSession.update({
      where: { id: sessionId },
      data: {
        status: result.success ? WorkflowStatus.COMPLETED : WorkflowStatus.FAILED,
        currentStep: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        result: {
          totalAiCalls: result.totalAiCalls,
          totalTokens,
          totalCost: estimatedCost,
          executionTime,
          parseResult: {
            sectionsFound: result.parseResult.sections.length,
            sections: result.parseResult.sections.map((s: any) => ({
              code: s.sectionCode,
              name: s.sectionName,
              confidence: s.confidence,
            })),
          },
          reviewResult: {
            structureIssues: result.validationResult.structureIssues.length,
            contentIssues: result.validationResult.contentIssues.length,
            score: result.scoreReport.totalScore,
          },
          textbookContext,
          annotationResult: {
            count: totalIssues,
          },
          suggestionResult: {
            applied: result.fixResult.appliedFixes.length,
            suggested: result.fixResult.rejectedFixes.length,
          },
          error: result.errors.length > 0 ? result.errors.join(', ') : null,
        },
      },
    });

    // Log workflow completion with full metrics
    logger.logWorkflowComplete({
      sessionId,
      workflowId: sessionId,
      lessonPlanId,
      userId,
      duration: executionTime,
      totalAiCalls: result.totalAiCalls,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
    });

    // Update lesson plan status
    await prisma.lessonPlan.update({
      where: { id: lessonPlanId },
      data: { status: result.success ? 'REVIEWED' : 'FAILED' },
    });

    // Log action with full version tracking
    await prisma.reviewHistory.create({
      data: {
        lessonPlanId,
        reviewResultId: reviewResultId,
        actionType: 'REVIEWED',
        actionData: {
          completedAt: new Date().toISOString(),
          score: result.scoreReport.totalScore,
          issues: result.validationResult.contentIssues.length,
          workflowSessionId: sessionId,
          // Version tracking for future comparison
          circularId: lessonPlan?.circularId || null,
          circularCode: lessonPlan?.circular?.code || null,
          circularVersion: circularVersion,
          templateId: template?.id || null,
          templateCode: template?.code || null,
          templateVersion: template?.version || null,
          aiModel: aiModel || 'gemini-3.1-flash-lite',
          executionTime: executionTime,
        },
        performedBy: userId,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const executionTime = Date.now() - startTime;

    // Log workflow error
    logger.logWorkflowError(error, {
      sessionId,
      workflowId: sessionId,
      lessonPlanId,
      userId,
      duration: executionTime,
    });

    // Update session with error
    await prisma.workflowSession.update({
      where: { id: sessionId },
      data: {
        status: WorkflowStatus.FAILED,
        currentStep: 'FAILED',
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    // Update lesson plan status
    await prisma.lessonPlan.update({
      where: { id: lessonPlanId },
      data: { status: WorkflowStatus.FAILED },
    });
  }
}

/**
 * Get workflow progress by session ID
 */
export async function getWorkflowProgress(sessionId: string): Promise<WorkflowProgress | null> {
  const session = await prisma.workflowSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return null;
  }

  const steps = await prisma.workflowStep.findMany({
    where: { workflowSessionId: sessionId },
    orderBy: { startedAt: 'asc' },
  });

  return {
    sessionId: session.id,
    status: session.status,
    currentStep: session.currentStep,
    progress: session.progress,
    steps: steps.map(s => ({
      name: s.stepName,
      status: s.status,
      progress: s.progress,
      error: s.error || undefined,
    })),
  };
}

/**
 * Get workflow result by session ID
 */
export async function getWorkflowResult(sessionId: string): Promise<WorkflowResult | null> {
  const session = await prisma.workflowSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return null;
  }

  // Extract metrics from result JSON
  let metrics = {
    totalAiCalls: 0,
    totalTokens: 0,
    totalCost: 0,
    executionTime: 0,
  };
  if (session.result && typeof session.result === 'object') {
    const res = session.result as Record<string, any>;
    metrics = {
      totalAiCalls: typeof res.totalAiCalls === 'number' ? res.totalAiCalls : 0,
      totalTokens: typeof res.totalTokens === 'number' ? res.totalTokens : 0,
      totalCost: typeof res.totalCost === 'number' ? res.totalCost : 0,
      executionTime: typeof res.executionTime === 'number' ? res.executionTime : 0,
    };
  }

  return {
    sessionId: session.id,
    status: session.status,
    parseResult: session.result && typeof session.result === 'object' ? (session.result as any).parseResult : undefined,
    mappingResult: session.result && typeof session.result === 'object' ? (session.result as any).mappingResult : undefined,
    reviewResult: session.result && typeof session.result === 'object' ? (session.result as any).reviewResult : undefined,
    annotationResult: session.result && typeof session.result === 'object' ? (session.result as any).annotationResult : undefined,
    suggestionResult: session.result && typeof session.result === 'object' ? (session.result as any).suggestionResult : undefined,
    metrics,
    error: session.error || undefined,
  };
}

/**
 * Get latest workflow for a lesson plan
 */
export async function getLatestWorkflow(lessonPlanId: string): Promise<WorkflowResult | null> {
  const session = await prisma.workflowSession.findFirst({
    where: { lessonPlanId },
    orderBy: { startedAt: 'desc' },
  });

  if (!session) {
    return null;
  }

  return getWorkflowResult(session.id);
}

/**
 * Cancel a running workflow
 */
export async function cancelWorkflow(sessionId: string): Promise<boolean> {
  const session = await prisma.workflowSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.status === WorkflowStatus.COMPLETED || session.status === WorkflowStatus.FAILED || session.status === WorkflowStatus.CANCELLED) {
    return false;
  }

  await prisma.workflowSession.update({
    where: { id: sessionId },
    data: {
      status: WorkflowStatus.CANCELLED,
      currentStep: 'CANCELLED',
      completedAt: new Date(),
    },
  });

  return true;
}
