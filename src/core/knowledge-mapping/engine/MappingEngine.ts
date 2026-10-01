/**
 * Knowledge Mapping Engine
 *
 * Phase 2: Main orchestration for knowledge mapping
 */

import { lessonRepository } from "../repositories/LessonRepository";
import { mappingResultRepository } from "../repositories/MappingResultRepository";
import { MatchingService, type DocumentActivity } from "../services/MatchingService";
import { ScoringService } from "../services/ScoringService";
import { LessonCache, getLessonCache, CACHE_KEYS } from "../services/LessonCache";
import {
  DEFAULT_MAPPING_CONFIG,
  ConfidenceLevel,
  type MappingConfig,
  type MappingResult as MappingResultType,
  type SectionMatchResult,
  type MatchResult,
} from "../types";
import type { LessonActivity, LessonSection, Lesson, LessonSubject } from "@prisma/client";

// Extended type with relations
interface LessonActivityWithSection extends LessonActivity {
  section: LessonSection & {
    lesson: Lesson & {
      subject: LessonSubject;
    };
  };
}

export interface DocumentSection {
  code: string;
  title: string;
  activities: DocumentActivity[];
}

export interface KnowledgeMappingInput {
  lessonPlanId: string;
  bookId?: string;
  gradeId?: string;
  subjectId?: string;
  lessonId?: string;
  sections: DocumentSection[];
}

export class KnowledgeMappingEngine {
  private config: MappingConfig;
  private matchingService: MatchingService;
  private scoringService: ScoringService;
  private cache: LessonCache;

  constructor(config: Partial<MappingConfig> = {}) {
    this.config = { ...DEFAULT_MAPPING_CONFIG, ...config };
    this.matchingService = new MatchingService(this.config);
    this.scoringService = new ScoringService(this.config);
    this.cache = getLessonCache();
  }

  /**
   * Map document to lesson library
   */
  async map(input: KnowledgeMappingInput): Promise<MappingResultType> {
    const result: MappingResultType = {
      lessonPlanId: input.lessonPlanId,
      bookId: input.bookId,
      gradeId: input.gradeId,
      subjectId: input.subjectId,
      lessonId: input.lessonId,
      sectionResults: [],
      unknownActivities: [],
      overallConfidence: 0,
      mappedAt: new Date(),
      errors: [],
      warnings: [],
    };

    try {
      // Get all library activities
      const libraryActivities = await this.getLibraryActivities(
        input.bookId,
        input.gradeId,
        input.subjectId,
        input.lessonId
      );

      if (libraryActivities.length === 0) {
        result.errors.push("No activities found in lesson library");
        return result;
      }

      // Group activities by section
      const activitiesBySection = new Map<string, LessonActivity[]>();
      for (const activity of libraryActivities as LessonActivityWithSection[]) {
        const sectionCode = activity.section.code;
        if (!activitiesBySection.has(sectionCode)) {
          activitiesBySection.set(sectionCode, []);
        }
        activitiesBySection.get(sectionCode)!.push(activity);
      }

      // Process each document section
      for (const docSection of input.sections) {
        const sectionResult = await this.mapSection(
          docSection,
          activitiesBySection
        );
        result.sectionResults.push(sectionResult);

        // Collect unknown activities
        result.unknownActivities.push(
          ...sectionResult.matchedActivities.filter((a) => a.isUnknown)
        );
      }

      // Calculate overall confidence
      const confidences = result.sectionResults.map((s) => s.overallConfidence);
      result.overallConfidence =
        confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0;

      // Save results to database
      await this.saveResults(input.lessonPlanId, result);
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Unknown mapping error"
      );
    }

    return result;
  }

  /**
   * Map a single section
   */
  private async mapSection(
    docSection: DocumentSection,
    activitiesBySection: Map<string, LessonActivity[]>
  ): Promise<SectionMatchResult> {
    const result: SectionMatchResult = {
      sectionCode: docSection.code,
      sectionTitle: docSection.title,
      matchedActivities: [],
      overallConfidence: 0,
    };

    // Find matching library section activities
    let sectionActivities = activitiesBySection.get(docSection.code) || [];

    // If no exact match, try to find similar section
    if (sectionActivities.length === 0) {
      const similarSection = this.findSimilarSection(docSection.code, activitiesBySection);
      if (similarSection) {
        sectionActivities = similarSection;
        result.matchedActivities.push({
          activityId: "section_fallback",
          activityCode: "SECTION_FALLBACK",
          activityTitle: `Fallback to section ${docSection.code}`,
          confidence: 30,
          confidenceLevel: ConfidenceLevel.LOW,
          matchedBy: [],
          score: {
            total: 30,
            breakdown: {
              alias: 0,
              keyword: 0,
              heading: 0,
              order: 0,
              structure: 30,
              paragraphFeatures: 0,
            },
            weights: this.config.weights,
          },
          isUnknown: false,
        });
      }
    }

    // Match each document activity
    for (const docActivity of docSection.activities) {
      const match = this.matchingService.matchActivity(docActivity, sectionActivities);

      if (match) {
        result.matchedActivities.push(match);
      } else {
        // No match found - mark as unknown
        result.matchedActivities.push({
          activityId: "unknown",
          activityCode: "UNKNOWN",
          activityTitle: docActivity.title,
          confidence: 0,
          confidenceLevel: ConfidenceLevel.LOW,
          matchedBy: [],
          score: {
            total: 0,
            breakdown: {
              alias: 0,
              keyword: 0,
              heading: 0,
              order: 0,
              structure: 0,
              paragraphFeatures: 0,
            },
            weights: this.config.weights,
          },
          isUnknown: true,
        });
      }
    }

    // Calculate section confidence
    const confidences = result.matchedActivities.map((a) => a.confidence);
    result.overallConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

    return result;
  }

  /**
   * Find similar section using fuzzy matching
   */
  private findSimilarSection(
    docSectionCode: string,
    activitiesBySection: Map<string, LessonActivity[]>
  ): LessonActivity[] | null {
    const normalizedDocCode = docSectionCode.toLowerCase().replace(/_/g, "");

    for (const [libSectionCode, activities] of activitiesBySection.entries()) {
      const normalizedLibCode = libSectionCode.toLowerCase().replace(/_/g, "");

      // Check similarity
      const similarity = this.calculateSimilarity(normalizedDocCode, normalizedLibCode);
      if (similarity >= this.config.fuzzyThreshold) {
        return activities;
      }
    }

    return null;
  }

  /**
   * Simple similarity calculation
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Get library activities with caching
   */
  private async getLibraryActivities(
    bookId?: string,
    gradeId?: string,
    subjectId?: string,
    lessonId?: string
  ) {
    const cacheKey = CACHE_KEYS.allActivities();

    if (this.config.enableCache) {
      const cached = this.cache.get<LessonActivity[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const activities = await lessonRepository.getAllActivities();

    if (this.config.enableCache) {
      this.cache.set(cacheKey, activities);
    }

    return activities;
  }

  /**
   * Save mapping results to database
   */
  private async saveResults(
    lessonPlanId: string,
    result: MappingResultType
  ): Promise<void> {
    // Delete existing results
    await mappingResultRepository.deleteByLessonPlan(lessonPlanId);

    // Save new results
    for (const sectionResult of result.sectionResults) {
      for (const match of sectionResult.matchedActivities) {
        if (!match.isUnknown && match.activityId !== "section_fallback") {
          await mappingResultRepository.create({
            lessonPlanId,
            activityId: match.activityId,
            confidence: match.confidence,
            matchedBy: match.matchedBy.join(","),
            matchScore: match.score.total,
            matchedActivity: {
              code: match.activityCode,
              title: match.activityTitle,
            },
            documentSectionCode: sectionResult.sectionCode,
            documentSectionTitle: sectionResult.sectionTitle,
            documentActivityTitle: match.activityTitle,
          });
        }
      }
    }
  }

  /**
   * Get mapping results from database
   */
  async getResults(lessonPlanId: string) {
    return mappingResultRepository.getByLessonPlanWithActivity(lessonPlanId);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Factory function
export function createMappingEngine(config?: Partial<MappingConfig>): KnowledgeMappingEngine {
  return new KnowledgeMappingEngine(config);
}
