/**
 * Workflow Orchestrator
 *
 * Orchestrate the entire rule engine workflow
 */

import type {
  RuleTemplate,
  WorkflowConfig,
  WorkflowResult,
  ParserResult,
  ValidationResult,
  FixResult,
  ScoreReport,
  ParsedSection,
} from '../types';
import { SectionParser } from '../parsers/SectionParser';
import { AISectionDetector } from '../parsers/AISectionDetector';
import { AIDocumentParserPipeline, type AIDocumentParseResult, type DocumentTree } from '../parsers/AIDocumentParserPipeline';
import { StructureValidator } from '../validators/StructureValidator';
import { ContentReviewer } from '../reviewers/ContentReviewer';
import { FixGenerator } from '../fixers/FixGenerator';
import { ScoreCalculator } from '../scoring/ScoreCalculator';

export class WorkflowOrchestrator {
  private template: RuleTemplate;
  private config: WorkflowConfig;

  /**
   * Match section title to template section codes using parser rules
   */
  private matchSectionCode(title: string, content: string): { code: string; ruleId: string; pattern: string; confidence: number } | null {
    if (!title && !content) return null;

    const text = title + ' ' + content;

    for (const rule of this.template.parserRules || []) {
      if (!rule.isActive) continue;

      try {
        const pattern = rule.pattern;
        let regex: RegExp;

        if (rule.type === 'REGEX') {
          regex = new RegExp(pattern, rule.ignoreCase ? 'i' : '');
        } else {
          // KEYWORD or FUZZY - use escaped regex
          const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          regex = new RegExp(escaped, rule.ignoreCase ? 'i' : '');
        }

        if (regex.test(text)) {
          return {
            code: rule.sectionCode || rule.id,
            ruleId: rule.id,
            pattern: rule.pattern,
            confidence: rule.confidence || 0.9,
          };
        }
      } catch (e) {
        // Skip invalid patterns
      }
    }

    return null;
  }

  /**
   * Convert BrightOne structured data to visionData format for AI Parser
   * This preserves MAXIMUM structure from the original document
   *
   * STRUCTURE PRESERVED:
   * - pages: Full page structure with elements
   * - blocks: All content blocks (headings, paragraphs)
   * - tables: Full table structure including merged cells, columns
   * - rows/columns/cells: Table cell data
   * - bbox: Position information
   * - readingOrder: Element ordering
   * - confidence: Detection confidence scores
   */
  private convertToVisionData(brightoneStructured: any): any {
    if (!brightoneStructured) return null;

    const visionData: any = {
      pages: [],
      blocks: [],
      sections: [],
      tables: [],
      images: [],
      metadata: {
        title: brightoneStructured.title,
        totalPages: brightoneStructured.metadata?.totalPages,
        language: brightoneStructured.metadata?.language || 'vi',
        confidence: brightoneStructured.metadata?.confidence,
        hasTables: brightoneStructured.metadata?.hasTables,
        hasImages: brightoneStructured.metadata?.hasImages,
        wordCount: brightoneStructured.metadata?.wordCount,
      },
    };

    // ============================================================
    // STEP 1: Convert SECTIONS (preserve code, title, page numbers)
    // ============================================================
    if (brightoneStructured.sections) {
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

    // ============================================================
    // STEP 2: Convert TABLES (preserve merged cells, columns, headers)
    // ============================================================
    if (brightoneStructured.sections) {
      for (const section of brightoneStructured.sections) {
        if (section.activities) {
          for (const activity of section.activities) {
            if (activity.paragraphs) {
              for (const para of activity.paragraphs) {
                if (para.tableData) {
                  const tableMeta = para.tableData.metadata || {};

                  visionData.tables.push({
                    id: para.id,
                    // Full row data
                    rows: para.tableData.rows || [],
                    // Column headers
                    headers: tableMeta.headers || [],
                    // Table dimensions
                    rowCount: tableMeta.rows || para.tableData.rows?.length || 0,
                    columnCount: tableMeta.columns || para.tableData.rows?.[0]?.length || 0,
                    // Merged cells - CRITICAL for table understanding
                    mergedCells: tableMeta.mergedCells || [],
                    // Position info
                    bbox: para.bbox,
                    pageNumber: para.pageNumber,
                    // Confidence
                    confidence: tableMeta.confidence || 0.9,
                  });
                }
              }
            }
          }
        }
      }
    }

    // ============================================================
    // STEP 3: Convert PAGES with full BLOCK structure
    // This preserves the original document hierarchy
    // ============================================================
    if (brightoneStructured.metadata?.pages) {
      // Pages already available in metadata
      visionData.pages = brightoneStructured.metadata.pages.map((page: any) => ({
        pageNumber: page.pageNumber,
        elements: page.elements?.map((elem: any) => ({
          id: elem.id,
          type: elem.type,
          content: elem.content,
          level: elem.level,
          // Position information
          bbox: elem.bbox,
          // Reading order
          readingOrder: elem.readingOrder,
          // Confidence
          confidence: elem.confidence,
        })) || [],
      }));
    } else {
      // Build pages from sections/activities/paragraphs
      const pageMap = new Map<number, any[]>();

      if (brightoneStructured.sections) {
        for (const section of brightoneStructured.sections) {
          if (section.activities) {
            for (const activity of section.activities) {
              if (activity.paragraphs) {
                for (const para of activity.paragraphs) {
                  const pageNum = para.pageNumber || 1;
                  if (!pageMap.has(pageNum)) {
                    pageMap.set(pageNum, []);
                  }

                  // Convert each paragraph to a block
                  const block: any = {
                    id: para.id,
                    type: para.isHeading ? 'heading' : 'paragraph',
                    content: para.content,
                    level: para.headingLevel,
                    pageNumber: pageNum,
                    bbox: para.bbox,
                    readingOrder: para.order,
                  };

                  // Include table data if present
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

      // Convert map to pages array
      visionData.pages = Array.from(pageMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([pageNum, blocks]) => ({
          pageNumber: pageNum,
          elements: blocks,
        }));
    }

    // ============================================================
    // STEP 4: Convert BLOCKS (all content elements)
    // This flattens all content for easy access
    // ============================================================
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
            // Table specific
            tableData: elem.tableData,
            // Confidence
            confidence: elem.confidence,
          });
        }
      }
    }

    // ============================================================
    // STEP 5: Convert IMAGES with full metadata
    // ============================================================
    if (brightoneStructured.metadata?.images) {
      visionData.images = brightoneStructured.metadata.images.map((img: any) => ({
        id: img.fileName || img.id,
        caption: img.caption,
        pageNumber: img.pageNumber,
        bbox: img.position || img.bbox,
        confidence: img.confidence || 0.9,
      }));
    }

    // ============================================================
    // STEP 6: Add ACTIVITIES as separate structure
    // AI parser needs to understand activities
    // ============================================================
    const activities: any[] = [];
    if (brightoneStructured.sections) {
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
              // Include paragraphs for context
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

    console.log('[Workflow] Converted to visionData (MAXIMUM STRUCTURE):', {
      sections: visionData.sections.length,
      tables: visionData.tables.length,
      pages: visionData.pages.length,
      blocks: visionData.blocks.length,
      images: visionData.images.length,
      activities: visionData.activities.length,
      hasMergedCells: visionData.tables.some((t: any) => t.mergedCells?.length > 0),
      tableColumns: visionData.tables.map((t: any) => t.columnCount),
    });

    return visionData;
  }

  constructor(template: RuleTemplate, config: WorkflowConfig) {
    this.template = template;
    this.config = config;

    // Log template details on initialization
    console.log('[WorkflowOrchestrator] ===== INITIALIZATION =====');
    console.log('[WorkflowOrchestrator] Template:', template.name, template.code);
    console.log('[WorkflowOrchestrator] parserRules count:', template.parserRules?.length || 0);
    console.log('[WorkflowOrchestrator] structureRules count:', template.structureRules?.length || 0);
    console.log('[WorkflowOrchestrator] contentRules count:', template.contentRules?.length || 0);
    console.log('[WorkflowOrchestrator] fixRules count:', template.fixRules?.length || 0);
    console.log('[WorkflowOrchestrator] scoringRules count:', template.scoringRules?.length || 0);
    console.log('[WorkflowOrchestrator] skipContentReview:', config.skipContentReview);
    console.log('[WorkflowOrchestrator] aiModel:', config.aiModel);
    console.log('[WorkflowOrchestrator] AI Provider: BeekOne (via BeekOneAIClient)');
    console.log('[WorkflowOrchestrator] ========================');
  }

  /**
   * Execute full workflow
   * @param documentText - Flat text content
   * @param brightoneStructured - Optional structured data from BrightOne
   */
  async execute(documentText: string, brightoneStructured?: any): Promise<WorkflowResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalAiCalls = 0;

    try {
      console.log('[Workflow] Starting Rule Engine v2.0...');

      // Step 1: Parse sections
      console.log('[Workflow] Step 1/5: Parsing sections...');
      console.log('[Workflow] DEBUG: execute() received brightoneStructured sections:', brightoneStructured?.sections?.length || 0);
      const parseResult = await this.parseSections(documentText, brightoneStructured);
      totalAiCalls += parseResult.aiCallCount;

      if (!parseResult.success) {
        errors.push('Failed to parse document');
        return this.buildErrorResult(errors, totalAiCalls, Date.now() - startTime);
      }

      console.log(
        `[Workflow] Parsed ${parseResult.sections.length} sections (${parseResult.aiCallCount} AI calls)`
      );

      // Step 2: Validate structure
      let structureResult: ValidationResult = {
        success: true,
        structureIssues: [],
        contentIssues: [],
        aiCallCount: 0,
        validationTime: 0,
      };

      if (!this.config.skipStructureValidation) {
        console.log('[Workflow] Step 2/5: Validating structure...');
        structureResult = await this.validateStructure(parseResult);
        console.log(
          `[Workflow] Found ${structureResult.structureIssues.length} structure issues`
        );
      }

      // Step 3: Review content
      let contentResult: ValidationResult = {
        success: true,
        structureIssues: [],
        contentIssues: [],
        aiCallCount: 0,
        validationTime: 0,
      };

      if (!this.config.skipContentReview) {
        console.log('[Workflow] ===== STEP 3/5: AI CONTENT REVIEW =====');
        console.log('[Workflow] skipContentReview = false, calling reviewContent...');
        console.log('[Workflow] Parsed sections count:', parseResult.sections.length);
        console.log('[Workflow] Template contentRules count:', this.template.contentRules?.length || 0);

        contentResult = await this.reviewContent(parseResult);

        console.log('[Workflow] Content review completed');
        console.log('[Workflow] contentResult.success:', contentResult.success);
        console.log('[Workflow] contentResult.contentIssues:', contentResult.contentIssues.length);
        console.log('[Workflow] contentResult.aiCallCount:', contentResult.aiCallCount);

        totalAiCalls += contentResult.aiCallCount;
        console.log(
          `[Workflow] Found ${contentResult.contentIssues.length} content issues (${contentResult.aiCallCount} AI calls)`
        );
        console.log('[Workflow] ===== END STEP 3 =====');
      } else {
        console.log('[Workflow] SKIPPED: skipContentReview = true');
      }

      // Merge validation results
      const validationResult: ValidationResult = {
        success: structureResult.success && contentResult.success,
        structureIssues: structureResult.structureIssues,
        contentIssues: contentResult.contentIssues,
        aiCallCount: structureResult.aiCallCount + contentResult.aiCallCount,
        validationTime: structureResult.validationTime + contentResult.validationTime,
      };

      // Step 4: Generate fixes
      console.log('[Workflow] Step 4/5: Generating fixes...');
      const fixResult = await this.generateFixes(validationResult);
      totalAiCalls += fixResult.aiCallCount;
      console.log(
        `[Workflow] Generated ${fixResult.appliedFixes.length + fixResult.rejectedFixes.length} fixes (${fixResult.aiCallCount} AI calls)`
      );

      // Step 5: Calculate score
      console.log('[Workflow] Step 5/5: Calculating score...');
      const scoreReport = this.calculateScore(validationResult);
      console.log(`[Workflow] Final score: ${scoreReport.totalScore}/${scoreReport.maxScore}`);

      const totalTime = Date.now() - startTime;

      console.log(`[Workflow] Complete! Total time: ${totalTime}ms, Total AI calls: ${totalAiCalls}`);

      return {
        success: true,
        template: this.template,
        parseResult,
        validationResult,
        fixResult,
        scoreReport,
        totalAiCalls,
        totalTime,
        errors,
      };
    } catch (error) {
      console.error('[Workflow] Error:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return this.buildErrorResult(errors, totalAiCalls, Date.now() - startTime);
    }
  }

  /**
   * Parse document into sections
   * IMPORTANT: If brightoneStructured is provided, use it directly instead of re-parsing
   * CRITICAL: Expand each BrightOne Activity into a separate Section to preserve paragraph structure
   */
  private async parseSections(text: string, brightoneStructured?: any): Promise<ParserResult> {
    // PRIORITY 1: If BrightOne provided structured data, use it directly!
    if (brightoneStructured && brightoneStructured.sections && brightoneStructured.sections.length > 0) {
      console.log('[Workflow] Using BrightOne structured data - expanding activities to sections');
      const sections: ParsedSection[] = [];

      for (const section of brightoneStructured.sections) {
        // Expand each Activity into a separate Section!
        const activities = section.activities || [];

        if (activities.length > 0) {
          // Each activity becomes a separate section
          for (const activity of activities) {
            const paragraphs = activity.paragraphs?.map((p: any) => p.content).filter(Boolean) || [];
            const content = paragraphs.join('\n\n');

            // Try to match section code using activity title
            const matchedCode = this.matchSectionCode(activity.title || '', content);

            sections.push({
              sectionCode: matchedCode?.code || 'ACTIVITY',
              sectionName: activity.title || 'Hoạt động',
              content: content,
              startIndex: 0,
              endIndex: content.length,
              confidence: matchedCode?.confidence || 0.9,
              matchedBy: matchedCode ? {
                ruleId: matchedCode.ruleId || 'brightone',
                ruleType: 'KEYWORD' as any,
                pattern: matchedCode.pattern || '',
              } : {
                ruleId: 'brightone',
                ruleType: 'KEYWORD' as any,
                pattern: activity.title || '',
              },
              aiUsed: false,
            });
          }
        } else {
          // No activities, use section directly
          const allParagraphs = section.activities?.flatMap((a: any) =>
            a.paragraphs?.map((p: any) => p.content).filter(Boolean) || []
          ) || [];
          const content = allParagraphs.join('\n\n');

          const matchedCode = this.matchSectionCode(section.title || '', content);
          sections.push({
            sectionCode: matchedCode?.code || 'UNKNOWN',
            sectionName: section.title || 'Phần',
            content: content,
            startIndex: 0,
            endIndex: content.length,
            confidence: matchedCode?.confidence || 0.8,
            matchedBy: matchedCode ? {
              ruleId: matchedCode.ruleId || 'brightone',
              ruleType: 'KEYWORD' as any,
              pattern: matchedCode.pattern || '',
            } : {
              ruleId: 'brightone',
              ruleType: 'KEYWORD' as any,
              pattern: section.title || '',
            },
            aiUsed: false,
          });
        }
      }

      console.log(`[Workflow] Expanded BrightOne to ${sections.length} sections from activities`);

      // ENHANCE WITH AI: Run AI Parser to understand semantic structure
      // This adds Teacher/Student actions, products, assessments from AI analysis
      console.log('[Workflow] ===== AI DOCUMENT PARSING (ENHANCING BRIGHTONE) =====');
      const aiParser = new AIDocumentParserPipeline({
        model: this.config.aiModel || 'gemini-3.1-flash-lite',
      });

      if (aiParser.isAvailable()) {
        try {
          // Convert BrightOne structured data to visionData format for AI Parser
          const visionData = this.convertToVisionData(brightoneStructured);

          // CRITICAL: Validate visionData before using
          if (!visionData) {
            console.error('[Workflow] CRITICAL: visionData is null/undefined');
            console.error('[Workflow] Cannot continue without visionData');
            throw new Error('visionData is required for Semantic Parser');
          }

          // Log visionData stats
          console.log('[Workflow] visionData stats:', {
            pages: visionData.pages?.length || 0,
            blocks: visionData.blocks?.length || 0,
            sections: visionData.sections?.length || 0,
            tables: visionData.tables?.length || 0,
            activities: visionData.activities?.length || 0,
            images: visionData.images?.length || 0,
          });

          // AI-FIRST SEMANTIC PARSING: Only use visionData, NOT documentText
          // The Semantic Reasoner works ONLY with Vision JSON
          const aiParseResult: AIDocumentParseResult = await aiParser.parse({
            // documentText removed - Semantic Parser works with Vision JSON only
            visionData: visionData,
            context: {
              subject: this.config.subject,
              gradeLevel: this.config.gradeLevel,
            },
          });

          // CRITICAL: Handle Semantic Parser failure
          if (!aiParseResult.success) {
            console.error('[Workflow] CRITICAL: Semantic Parser FAILED');
            console.error('[Workflow] Error:', aiParseResult.error);
            console.error('[Workflow] Cannot continue - stopping workflow');
            throw new Error(`Semantic Parser failed: ${aiParseResult.error}`);
          }

          if (aiParseResult.sections && aiParseResult.sections.length > 0) {
            console.log(`[Workflow] AI Parser success: ${aiParseResult.sections.length} sections, confidence: ${(aiParseResult.confidence * 100).toFixed(1)}%`);

            // Log AI-parsed activities for debugging
            for (const aiSection of aiParseResult.sections) {
              if (aiSection.activities && aiSection.activities.length > 0) {
                console.log(`[Workflow] AI Section "${aiSection.title}": ${aiSection.activities.length} activities`);
                for (const activity of aiSection.activities) {
                  console.log(`[Workflow]   - Activity: ${activity.title}`);
                  // New: Use TeacherActions[] and StudentActions[] arrays
                  const teacherActions = activity.teacherActions || [];
                  const studentActions = activity.studentActions || [];
                  console.log(`[Workflow]     Teacher Actions (${teacherActions.length}): ${teacherActions.slice(0, 2).map((a: any) => a.action?.substring(0, 30) || 'N/A').join(', ')}${teacherActions.length > 2 ? '...' : ''}`);
                  console.log(`[Workflow]     Student Actions (${studentActions.length}): ${studentActions.slice(0, 2).map((a: any) => a.action?.substring(0, 30) || 'N/A').join(', ')}${studentActions.length > 2 ? '...' : ''}`);
                  console.log(`[Workflow]     Products: ${activity.products?.length || 0}`);
                  console.log(`[Workflow]     Assessments: ${activity.assessments?.length || 0}`);
                }
              }
            }

            // Store document tree for later use in Rule Engine
            (this as any)._documentTree = aiParseResult.tree;

            // CRITICAL: Convert AI Semantic Tree sections to ParsedSection format
            // Use AI sections, NOT BrightOne sections
            const aiSections: ParsedSection[] = aiParseResult.sections.map((section: any, sIdx: number) => {
              const paragraphs = section.paragraphs?.map((p: any) => p.content).join('\n\n') || '';
              const matchedCode = this.matchSectionCode(section.title || '', paragraphs);

              return {
                sectionCode: matchedCode?.code || section.type?.toUpperCase() || 'CUSTOM',
                sectionName: section.title || section.type || 'Custom Section',
                content: paragraphs,
                startIndex: 0,
                endIndex: paragraphs.length,
                confidence: section.confidence || 0.9,
                matchedBy: {
                  ruleId: 'ai-semantic-parser',
                  ruleType: 'AI' as any,
                  pattern: section.title || '',
                },
                aiUsed: true,
                // Preserve Semantic Tree data
                parsedContent: {
                  title: section.title,
                  type: 'activity',
                  paragraphs: section.paragraphs || [],
                  teacherActions: section.teacherActions || [],
                  studentActions: section.studentActions || [],
                  questions: section.questions || [],
                  products: section.products || [],
                  assessments: section.assessments || [],
                  goal: section.goal || null,
                  duration: section.duration || null,
                  activityType: section.type || null,
                  confidence: section.confidence || null,
                },
              };
            });

            console.log('[Workflow] Using AI Semantic Tree sections:', aiSections.length);

            return {
              success: true,
              sections: aiSections,
              unmatchedContent: [],
              aiCallCount: 1,
              parseTime: 0,
              errors: [],
            };
          } else {
            // AI returned no sections - this is a failure
            console.error('[Workflow] AI Parser returned no sections - this should have been caught earlier');
            throw new Error('AI Semantic Parser returned empty sections');
          }
        } catch (error) {
          console.error('[Workflow] AI Parser enhancement failed:', error);
          throw error;
        }
      }

      // AI Parser not available - this should not happen in production
      console.error('[Workflow] AI Parser not available - this should not happen');
      throw new Error('AI Parser is not available');
    }

    // PRIORITY 2: Use AI Document Parser (replaces regex-based parsing)
    console.log('[Workflow] ===== AI DOCUMENT PARSING =====');
    const aiParser = new AIDocumentParserPipeline({
      model: this.config.aiModel || 'gemini-3.1-flash-lite',
    });

    if (aiParser.isAvailable()) {
      try {
        const aiParseResult: AIDocumentParseResult = await aiParser.parse({
          documentText: text,
          context: {
            subject: this.config.subject,
            gradeLevel: this.config.gradeLevel,
          },
        });

        if (aiParseResult.success && aiParseResult.sections && aiParseResult.sections.length > 0) {
          console.log(`[Workflow] AI Parser success: ${aiParseResult.sections.length} sections, confidence: ${(aiParseResult.confidence * 100).toFixed(1)}%`);

          // Convert AI sections to ParsedSection format
          const sections: ParsedSection[] = aiParseResult.sections.map((section: any, sIdx: number) => {
            const paragraphs = section.paragraphs?.map((p: any) => p.content).join('\n\n') || '';
            const matchedCode = this.matchSectionCode(section.title || '', paragraphs);

            return {
              sectionCode: matchedCode?.code || section.type?.toUpperCase() || 'CUSTOM',
              sectionName: section.title || section.type || 'Custom Section',
              content: paragraphs,
              startIndex: 0,
              endIndex: paragraphs.length,
              confidence: section.confidence || 0.9,
              matchedBy: {
                ruleId: 'ai-parser',
                ruleType: 'AI' as any,
                pattern: section.title || '',
              },
              aiUsed: true,
              // Preserve Semantic Tree data
              parsedContent: {
                title: section.title,
                type: 'activity',
                paragraphs: section.paragraphs || [],
                teacherActions: section.teacherActions || [],
                studentActions: section.studentActions || [],
                questions: section.questions || [],
                products: section.products || [],
                assessments: section.assessments || [],
                goal: section.goal || null,
                duration: section.duration || null,
                activityType: section.type || null,
                confidence: section.confidence || null,
              },
            };
          });

          // Store document tree for later use
          (this as any)._documentTree = aiParseResult.tree;

          return {
            success: true,
            sections,
            unmatchedContent: [],
            aiCallCount: 1,
            parseTime: 0,
            errors: [],
          };
        } else {
          console.error('[Workflow] AI Parser failed:', aiParseResult.error);
          throw new Error(`AI Parser failed: ${aiParseResult.error}`);
        }
      } catch (error) {
        console.error('[Workflow] AI Parser error:', error);
        throw error;
      }
    } else {
      console.error('[Workflow] AI Parser not available - this is a critical error');
      throw new Error('AI Parser is not available');
    }

    // CRITICAL: DO NOT allow legacy fallback when using visionData
    // The PRIORITY 1 path (with visionData) already throws if Semantic Parser fails
    // This code only runs for PRIORITY 2 (without visionData) or legacy path
    console.log('[Workflow] Using section parser (legacy path - no visionData)');
    const parser = new SectionParser(this.template.parserRules, {
      enableFuzzyMatching: true,
      fuzzyThreshold: 0.8,
      logMatches: true,
    });

    const result = parser.parse(text);

    // Handle unmatched content with AI if needed
    if (result.unmatchedContent.length > 0) {
      console.log(`[Workflow] ===== AI SECTION DETECTION =====`);
      console.log(`[Workflow] ${result.unmatchedContent.length} unmatched lines, using AI detector...`);

      const detector = new AISectionDetector({
        model: this.config.aiModel || 'gemini-3.1-flash-lite',
      });

      try {
        // Detect sections for unmatched content - split into chunks for each unmatched line
        const unmatchedText = result.unmatchedContent.join('\n');
        const detectionResult = await detector.detect({
          text: unmatchedText,
          context: 'Lesson plan content that was not matched by regex patterns',
          expectedSections: this.template.sections || [],
        });

        console.log('[Workflow] AI Detection result:', JSON.stringify(detectionResult));

        // Add AI-detected section to result
        if (detectionResult.sectionCode && detectionResult.confidence > 0.5) {
          // Check if we should add this as a new section or append to existing
          const existingSectionIndex = result.sections.findIndex(s => s.sectionCode === detectionResult.sectionCode);
          if (existingSectionIndex >= 0 && result.sections[existingSectionIndex].content !== undefined) {
            // Append to existing section
            result.sections[existingSectionIndex].content += '\n' + unmatchedText;
            result.sections[existingSectionIndex].aiUsed = true;
          } else {
            // Create new section
            result.sections.push({
              sectionCode: detectionResult.sectionCode,
              sectionName: detectionResult.sectionCode,
              content: unmatchedText,
              startIndex: 0,
              endIndex: 0,
              confidence: detectionResult.confidence,
              matchedBy: { ruleId: 'ai', ruleType: 'AI' as any, pattern: 'AI detection' },
              aiUsed: true,
            });
          }
          // Clear unmatched since we handled it
          result.unmatchedContent = [];
          result.aiCallCount++;
          console.log('[Workflow] AI detected section:', detectionResult.sectionCode, 'confidence:', detectionResult.confidence);
        } else {
          console.log('[Workflow] AI detection returned low confidence, keeping unmatched content');
        }
      } catch (error) {
        console.error('[Workflow] AI detection failed:', error);
        // Continue with unmatched content - don't fail the whole workflow
      }
      console.log('[Workflow] ===== END AI DETECTION =====');
    }

    return result;
  }

  /**
   * Validate document structure
   */
  private async validateStructure(parseResult: ParserResult): Promise<ValidationResult> {
    const validator = new StructureValidator(this.template.structureRules);
    return validator.validate(parseResult.sections);
  }

  /**
   * Review content with AI
   */
  private async reviewContent(parseResult: ParserResult): Promise<ValidationResult> {
    const reviewer = new ContentReviewer(this.template.contentRules, {
      model: this.config.aiModel || 'gemini-3.1-flash-lite',
      // Pass full config including textbook context for lesson-specific review
      ...this.config,
    });
    return reviewer.review(parseResult.sections);
  }

  /**
   * Generate fixes for issues
   */
  private async generateFixes(validationResult: ValidationResult): Promise<FixResult> {
    const generator = new FixGenerator(this.template.fixRules, {
      model: this.config.aiModel || 'gemini-3.1-flash-lite',
    });
    return generator.generateFixes(
      validationResult.structureIssues,
      validationResult.contentIssues
    );
  }

  /**
   * Calculate final score
   */
  private calculateScore(validationResult: ValidationResult): ScoreReport {
    const calculator = new ScoreCalculator(this.template.scoringRules);
    return calculator.calculate(
      validationResult.structureIssues,
      validationResult.contentIssues
    );
  }

  /**
   * Build error result
   */
  private buildErrorResult(
    errors: string[],
    totalAiCalls: number,
    totalTime: number
  ): WorkflowResult {
    return {
      success: false,
      template: this.template,
      parseResult: {
        success: false,
        sections: [],
        unmatchedContent: [],
        aiCallCount: 0,
        parseTime: 0,
        errors,
      },
      validationResult: {
        success: false,
        structureIssues: [],
        contentIssues: [],
        aiCallCount: 0,
        validationTime: 0,
      },
      fixResult: {
        success: false,
        appliedFixes: [],
        rejectedFixes: [],
        aiCallCount: 0,
        fixTime: 0,
      },
      scoreReport: {
        totalScore: 0,
        maxScore: 100,
        percentage: 0,
        breakdown: {
          structure: 0,
          content: 0,
          format: 0,
        },
        issuesSummary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
        penaltiesApplied: [],
      },
      totalAiCalls,
      totalTime,
      errors,
    };
  }
}
