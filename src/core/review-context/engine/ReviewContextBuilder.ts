/**
 * Review Context Builder
 *
 * Phase 3: Main orchestration for building review contexts
 */

import type {
  DocumentStructure,
  MappingResult,
  LessonKnowledge,
  Template,
  Rule,
  ActivityReviewContext,
  ReviewContextConfig,
  ReviewJob,
  ReviewJobOutput,
  ActivityReviewData,
  ReviewStatistics,
} from "../types";
import { DEFAULT_REVIEW_CONTEXT_CONFIG } from "../types";
import { ContextOptimizer } from "../services/ContextOptimizer";
import { PayloadBuilder } from "../services/PayloadBuilder";
import { StatisticsService } from "../services/StatisticsService";

// Simple UUID generator
function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ReviewContextBuilderInput {
  document: DocumentStructure;
  mappingResult: MappingResult;
  lessonKnowledge: LessonKnowledge[];
  template?: Template;
  rules: Rule[];
}

export class ReviewContextBuilder {
  private config: ReviewContextConfig;
  private optimizer: ContextOptimizer;
  private payloadBuilder: PayloadBuilder;
  private statisticsService: StatisticsService;

  constructor(config: Partial<ReviewContextConfig> = {}) {
    this.config = { ...DEFAULT_REVIEW_CONTEXT_CONFIG, ...config };
    this.optimizer = new ContextOptimizer();
    this.payloadBuilder = new PayloadBuilder(this.config);
    this.statisticsService = new StatisticsService();
  }

  /**
   * Build review context from inputs
   */
  build(input: ReviewContextBuilderInput): ReviewJob {
    const { document, mappingResult, lessonKnowledge, template, rules } = input;

    // Build activity contexts
    const contexts = this.buildActivityContexts(
      document,
      mappingResult,
      lessonKnowledge,
      rules
    );

    // Apply optimization if enabled
    const optimizedContexts = this.config.enableOptimization
      ? this.optimizer.optimizeAll(contexts)
      : contexts;

    // Create review job
    const job: ReviewJob = {
      jobId: generateId(),
      lessonPlanId: mappingResult.lessonPlanId,
      activities: optimizedContexts,
      createdAt: new Date(),
    };

    return job;
  }

  /**
   * Build complete review output
   */
  buildOutput(input: ReviewContextBuilderInput): ReviewJobOutput {
    const job = this.build(input);

    // Build activity data with chunks and payloads
    const activityData: ActivityReviewData[] = [];
    const contexts: ActivityReviewContext[] = [];

    for (const context of job.activities) {
      const payloadResult = this.payloadBuilder.buildActivityPayload(context);

      activityData.push({
        activityId: context.activityId,
        activityCode: context.activityCode,
        activityTitle: context.activityTitle,
        sectionName: context.sectionName,
        chunks: payloadResult.payloads.map((p) => ({
          chunkIndex: p.metadata.chunkIndex ?? 0,
          totalChunks: p.metadata.totalChunks ?? 1,
          paragraphs: p.content.paragraphs,
          rules: p.rules,
          metadata: {
            confidence: p.metadata.confidence,
            matchedBy: p.metadata.matchedBy,
          },
        })),
        originalParagraphs: context.paragraphs.map((p) => p.text),
        estimatedTokens: payloadResult.estimatedTokens,
        characterCount: payloadResult.characterCount,
      });

      contexts.push(context);
    }

    // Calculate statistics
    const statistics = this.statisticsService.calculateStatistics(activityData, contexts);

    return {
      job,
      activities: activityData,
      statistics,
    };
  }

  /**
   * Build activity contexts from document and mapping
   */
  private buildActivityContexts(
    document: DocumentStructure,
    mappingResult: MappingResult,
    lessonKnowledge: LessonKnowledge[],
    rules: Rule[]
  ): ActivityReviewContext[] {
    const contexts: ActivityReviewContext[] = [];

    // Create lookup maps
    const knowledgeMap = new Map<string, LessonKnowledge["activities"][0]>();
    for (const knowledge of lessonKnowledge) {
      for (const activity of knowledge.activities) {
        knowledgeMap.set(activity.activityId, activity);
      }
    }

    // Process each section mapping
    for (const sectionResult of mappingResult.sectionResults) {
      // Find corresponding document section
      const docSection = document.sections.find(
        (s) => s.code === sectionResult.sectionCode
      );

      // Find template section if exists
      // (Template would define required activities)

      // Process each matched activity
      for (const match of sectionResult.matchedActivities) {
        // Get knowledge for this activity
        const knowledge = knowledgeMap.get(match.activityId);

        // Get rules for this activity (based on category, section, etc.)
        const activityRules = this.getRulesForActivity(rules, sectionResult.sectionCode, match);

        // Get paragraphs for this activity
        const paragraphs = docSection?.paragraphs || [];

        const context: ActivityReviewContext = {
          activityId: match.activityId,
          activityCode: match.activityCode,
          activityTitle: match.activityTitle,
          sectionCode: sectionResult.sectionCode,
          sectionName: sectionResult.sectionTitle,
          paragraphs,
          knowledge: knowledge?.knowledge,
          teachingIntent: knowledge?.teachingIntent,
          expectedTeacherActions: knowledge?.expectedTeacherActions,
          expectedStudentActions: knowledge?.expectedStudentActions,
          expectedOutcome: knowledge?.expectedOutcome,
          rules: activityRules,
          confidence: match.confidence,
          matchedBy: match.matchedBy,
        };

        contexts.push(context);
      }
    }

    // Add unknown activities
    for (const unknown of mappingResult.unknownActivities) {
      const docSection = document.sections.find(
        (s) => s.code === unknown.activityCode.split("_")[0]
      );

      contexts.push({
        activityId: unknown.activityId,
        activityCode: unknown.activityCode,
        activityTitle: unknown.activityTitle,
        sectionCode: unknown.activityCode.split("_")[0] || "UNKNOWN",
        sectionName: "Unknown Section",
        paragraphs: docSection?.paragraphs || [],
        rules: [],
        confidence: unknown.confidence,
        matchedBy: unknown.matchedBy,
      });
    }

    return contexts;
  }

  /**
   * Get rules applicable to an activity
   */
  private getRulesForActivity(
    rules: Rule[],
    sectionCode: string,
    match: { activityId: string; isUnknown: boolean }
  ): Rule[] {
    // Filter rules based on section and activity
    // In a real implementation, rules would have section codes or categories
    return rules.filter((rule) => {
      // Include rules that match the section
      // For now, return all active rules
      return true;
    });
  }

  /**
   * Generate JSON output
   */
  toJSON(input: ReviewContextBuilderInput): string {
    const output = this.buildOutput(input);
    return JSON.stringify(output, null, 2);
  }

  /**
   * Generate payload only
   */
  toPayloadJSON(input: ReviewContextBuilderInput): string {
    const job = this.build(input);
    const result = this.payloadBuilder.buildPayloads(job.activities);
    return JSON.stringify(result, null, 2);
  }

  /**
   * Validate input
   */
  validate(input: ReviewContextBuilderInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.document) {
      errors.push("Document is required");
    }

    if (!input.mappingResult) {
      errors.push("Mapping result is required");
    }

    if (!input.rules || input.rules.length === 0) {
      errors.push("At least one rule is required");
    }

    if (input.document && input.document.sections.length === 0) {
      errors.push("Document must have at least one section");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): ReviewContextConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReviewContextConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export function createReviewContextBuilder(
  config?: Partial<ReviewContextConfig>
): ReviewContextBuilder {
  return new ReviewContextBuilder(config);
}
