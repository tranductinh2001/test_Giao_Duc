/**
 * Lesson Plan Pipeline
 *
 * Phase 1: Main Pipeline orchestrator
 *
 * Pipeline Flow:
 * Upload DOCX/PDF/Image -> Parser -> Document Structure -> Section Detection -> Activity Detection -> Output JSON
 */

import { parseDocx } from "./parsers/DocxParser";
import { SectionDetector } from "./parsers/SectionDetector";
import { ActivityDetector } from "./parsers/ActivityDetector";
import type { PipelineConfig, PipelineResult, ParsedDocument, DetectedSection } from "./types";
import { DEFAULT_PIPELINE_CONFIG } from "./types";
import { parseDocument } from "../document-adapters";

/**
 * Main Pipeline class
 */
export class LessonPlanPipeline {
  private config: PipelineConfig;
  private sectionDetector?: SectionDetector;
  private activityDetector: ActivityDetector;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.activityDetector = new ActivityDetector();
  }

  /**
   * Initialize pipeline - load template
   */
  async initialize(): Promise<void> {
    if (this.config.useTemplate && this.config.templateId) {
      this.sectionDetector = new SectionDetector(this.config);
      await this.sectionDetector.loadTemplate(this.config.templateId);
    }
  }

  /**
   * Execute the full pipeline
   * @param buffer - The file buffer
   * @param fileName - Optional filename for detecting file type (PDF/Image use BrightOne API)
   */
  async execute(buffer: Buffer, fileName?: string): Promise<PipelineResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Parse document using unified adapter (handles DOCX, PDF, Image)
      let parseResult;

      if (fileName) {
        // Use unified adapter - automatically selects correct parser based on file extension
        const docResult = await parseDocument(buffer, fileName);

        if (!docResult.success) {
          return {
            success: false,
            error: docResult.error || "Lỗi khi parse document",
            errors: [docResult.error || "Lỗi parse"],
            warnings,
          };
        }

        // Convert UnifiedDocument to pipeline format
        const doc = docResult.document!;
        const convertedParagraphs = doc.sections?.flatMap(section =>
          section.activities?.flatMap(activity =>
            activity.paragraphs?.map(para => ({
              text: para.content,
              headingLevel: para.headingLevel ?? null,
              pageNumber: para.pageNumber ?? undefined,
            })) || []
          ) || []
        ) || [];

        parseResult = {
          success: true,
          rawText: doc.rawMarkdown || doc.rawContent || "",
          paragraphs: convertedParagraphs as any,
        };
      } else {
        // Fallback: use legacy DOCX parser
        parseResult = await parseDocx(buffer);
      }

      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error || "Lỗi khi parse file",
          errors: [parseResult.error || "Lỗi parse"],
          warnings,
        };
      }

      if (parseResult.paragraphs.length === 0) {
        return {
          success: false,
          error: "File không có nội dung",
          errors: ["Không có paragraphs"],
          warnings,
        };
      }

      // Step 2: Detect Sections
      let sections: DetectedSection[];

      if (this.sectionDetector) {
        // Use template-based detection
        const sectionResult = this.sectionDetector.detect(
          (parseResult.paragraphs as any[]).map((p) => ({
            text: p.text,
            headingLevel: p.headingLevel,
          }))
        );
        sections = sectionResult.sections;

        if (sectionResult.overallConfidence < 0.3) {
          warnings.push(
            `Confidence thấp (${Math.round(sectionResult.overallConfidence * 100)}%) - có thể cần kiểm tra thủ công`
          );
        }
      } else {
        // Fallback: create single section with all content
        sections = [
          {
            sectionIndex: 0,
            sectionCode: "UNKNOWN",
            sectionTitle: "Nội dung giáo án",
            activities: [],
            confidence: 0.3,
            isUnknown: true,
            detectionMethod: "fallback",
          },
        ];
      }

      // Step 3: Detect Activities within each section
      for (const section of sections) {
        if (section.activities.length === 0) {
          // Need to detect activities from paragraphs
          // First, collect all paragraphs for this section
          const sectionParagraphs = parseResult.paragraphs; // Simplified - in real impl, filter by section

          const activities = this.activityDetector.detect(
            sectionParagraphs,
            section.sectionTitle,
            section.confidence
          );

          section.activities = activities;
        }
      }

      // Step 4: Build document structure
      const document: ParsedDocument = {
        rawText: parseResult.rawText,
        totalParagraphs: parseResult.paragraphs.length,
        sections,
        overallConfidence:
          sections.length > 0
            ? sections.reduce((sum, s) => sum + s.confidence, 0) / sections.length
            : 0,
        method: this.sectionDetector ? "template" : "heuristic",
        parseTime: Date.now() - startTime,
      };

      // Check for unknown sections
      const unknownSections = sections.filter((s) => s.isUnknown);
      if (unknownSections.length > 0) {
        warnings.push(
          `${unknownSections.length} section(s) có confidence thấp, được đánh dấu là UNKNOWN`
        );
      }

      return {
        success: true,
        document,
        errors: [],
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
        errors: [error instanceof Error ? error.message : "Lỗi pipeline"],
        warnings,
      };
    }
  }

  /**
   * Execute pipeline with pre-loaded template
   * @param buffer - The file buffer
   * @param templateId - Template ID to use
   * @param fileName - Optional filename for detecting file type (PDF/Image use BrightOne API)
   */
  async executeWithTemplate(
    buffer: Buffer,
    templateId: string,
    fileName?: string
  ): Promise<PipelineResult> {
    // Load specific template
    const detector = new SectionDetector(this.config);
    await detector.loadTemplate(templateId);

    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Parse document using unified adapter
      let parseResult;

      if (fileName) {
        const docResult = await parseDocument(buffer, fileName);

        if (!docResult.success) {
          return {
            success: false,
            error: docResult.error || "Lỗi khi parse document",
            errors: [docResult.error || "Lỗi parse"],
            warnings,
          };
        }

        const doc = docResult.document!;
        const convertedParagraphs = doc.sections?.flatMap(section =>
          section.activities?.flatMap(activity =>
            activity.paragraphs?.map(para => ({
              text: para.content,
              headingLevel: para.headingLevel ?? null,
              pageNumber: para.pageNumber ?? undefined,
            })) || []
          ) || []
        ) || [];

        parseResult = {
          success: true,
          rawText: doc.rawMarkdown || doc.rawContent || "",
          paragraphs: convertedParagraphs as any,
        };
      } else {
        parseResult = await parseDocx(buffer);
      }

      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error || "Lỗi khi parse file",
          errors: [parseResult.error || "Lỗi parse"],
          warnings,
        };
      }

      // Step 2: Detect Sections using template
      const sectionResult = detector.detect(
        parseResult.paragraphs.map((p: any) => ({
          text: p.text,
          headingLevel: p.headingLevel ?? null,
        }))
      );

      const sections = sectionResult.sections;

      // Step 3: Detect Activities
      for (const section of sections) {
        const activities = this.activityDetector.detect(
          parseResult.paragraphs,
          section.sectionTitle,
          section.confidence
        );
        section.activities = activities;
      }

      // Step 4: Build document
      const document: ParsedDocument = {
        rawText: parseResult.rawText,
        totalParagraphs: parseResult.paragraphs.length,
        sections,
        overallConfidence: sectionResult.overallConfidence,
        method: "template",
        parseTime: Date.now() - startTime,
      };

      return {
        success: true,
        document,
        errors: [],
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
        errors: [error instanceof Error ? error.message : "Lỗi pipeline"],
        warnings,
      };
    }
  }
}

/**
 * Factory function to create and initialize pipeline
 */
export async function createPipeline(
  config?: Partial<PipelineConfig>
): Promise<LessonPlanPipeline> {
  const pipeline = new LessonPlanPipeline(config);
  await pipeline.initialize();
  return pipeline;
}

/**
 * Simple function to execute pipeline
 */
export async function executePipeline(
  buffer: Buffer,
  templateId?: string,
  config?: Partial<PipelineConfig>,
  fileName?: string
): Promise<PipelineResult> {
  const pipeline = new LessonPlanPipeline(config);

  if (templateId) {
    return pipeline.executeWithTemplate(buffer, templateId, fileName);
  }

  return pipeline.execute(buffer, fileName);
}
