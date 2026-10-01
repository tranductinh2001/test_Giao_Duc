/**
 * Matching Service
 *
 * Phase 2: Matching logic using Scoring Service
 */

import { LessonActivity } from "@prisma/client";
import { ScoringService } from "./ScoringService";
import { MatchMethod, ConfidenceLevel, type MappingConfig, type MatchResult } from "../types";

export interface DocumentActivity {
  title: string;
  text: string;
  heading?: string;
  order?: number;
  sectionCode?: string;
  sectionTitle?: string;
  paragraphs?: string[];
}

export class MatchingService {
  private scoringService: ScoringService;
  private config: MappingConfig;

  constructor(config: Partial<MappingConfig> = {}) {
    this.config = {
      confidenceThreshold: config.confidenceThreshold ?? 50,
      fuzzyThreshold: config.fuzzyThreshold ?? 0.8,
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 3600000,
      weights: config.weights ?? {
        alias: 30,
        keyword: 25,
        heading: 20,
        order: 10,
        structure: 10,
        paragraphFeatures: 5,
      },
    };
    this.scoringService = new ScoringService(config);
  }

  /**
   * Match a document activity against all library activities
   */
  matchActivity(
    documentActivity: DocumentActivity,
    libraryActivities: LessonActivity[]
  ): MatchResult | null {
    if (libraryActivities.length === 0) {
      return this.createUnknownResult(documentActivity);
    }

    const results: Array<{
      activity: LessonActivity;
      score: ReturnType<ScoringService["calculateScore"]>;
      matchedBy: MatchMethod[];
    }> = [];

    for (const activity of libraryActivities) {
      const score = this.scoringService.calculateScore({
        documentText: documentActivity.text,
        documentHeading: documentActivity.heading,
        documentOrder: documentActivity.order,
        documentParagraphs: documentActivity.paragraphs,
        activityTitle: activity.title,
        activityKeywords: activity.keywords || [],
        activityAliases: activity.aliases || [],
        activityOrder: activity.order,
      });

      // Determine match methods
      const matchedBy = this.determineMatchMethods(documentActivity, activity);

      results.push({ activity, score, matchedBy });
    }

    // Sort by score descending
    results.sort((a, b) => b.score.total - a.score.total);

    const bestMatch = results[0];

    if (!this.scoringService.meetsThreshold(bestMatch.score.total)) {
      return this.createUnknownResult(documentActivity);
    }

    return {
      activityId: bestMatch.activity.id,
      activityCode: bestMatch.activity.code,
      activityTitle: bestMatch.activity.title,
      confidence: bestMatch.score.total,
      confidenceLevel: this.scoringService.getConfidenceLevel(bestMatch.score.total) as ConfidenceLevel,
      matchedBy: bestMatch.matchedBy,
      score: bestMatch.score,
      isUnknown: false,
    };
  }

  /**
   * Match multiple document activities
   */
  matchActivities(
    documentActivities: DocumentActivity[],
    libraryActivities: LessonActivity[]
  ): MatchResult[] {
    return documentActivities.map((docActivity) =>
      this.matchActivity(docActivity, libraryActivities)
    ).filter((r): r is MatchResult => r !== null);
  }

  /**
   * Find best matches for a document section
   */
  matchSection(
    documentActivities: DocumentActivity[],
    libraryActivitiesForSection: LessonActivity[]
  ): MatchResult[] {
    if (libraryActivitiesForSection.length === 0) {
      return documentActivities.map((a) => this.createUnknownResult(a));
    }

    // Create activity order map
    const orderMap = new Map<number, LessonActivity>();
    for (const activity of libraryActivitiesForSection) {
      if (activity.order !== null && activity.order !== undefined) {
        orderMap.set(activity.order, activity);
      }
    }

    const results: MatchResult[] = [];

    for (let i = 0; i < documentActivities.length; i++) {
      const docActivity = documentActivities[i];
      const docOrder = docActivity.order ?? i + 1;

      // First try order-based matching
      const orderedActivity = orderMap.get(docOrder);
      let candidates = libraryActivitiesForSection;

      if (orderedActivity) {
        // Score the ordered candidate
        const score = this.scoringService.calculateScore({
          documentText: docActivity.text,
          documentHeading: docActivity.heading,
          documentOrder: docOrder,
          activityTitle: orderedActivity.title,
          activityKeywords: orderedActivity.keywords || [],
          activityAliases: orderedActivity.aliases || [],
          activityOrder: orderedActivity.order,
        });

        const matchedBy = this.determineMatchMethods(docActivity, orderedActivity);

        if (this.scoringService.meetsThreshold(score.total)) {
          results.push({
            activityId: orderedActivity.id,
            activityCode: orderedActivity.code,
            activityTitle: orderedActivity.title,
            confidence: score.total,
            confidenceLevel: this.scoringService.getConfidenceLevel(score.total) as ConfidenceLevel,
            matchedBy,
            score,
            isUnknown: false,
          });
          continue;
        }

        // If order match fails, fall back to full search
        candidates = libraryActivitiesForSection.filter((a) => a.id !== orderedActivity.id);
      }

      // Full search in candidates
      const match = this.matchActivity(docActivity, candidates);
      if (match) {
        results.push(match);
      } else {
        results.push(this.createUnknownResult(docActivity));
      }
    }

    return results;
  }

  /**
   * Determine which methods were used for matching
   */
  private determineMatchMethods(
    documentActivity: DocumentActivity,
    activity: LessonActivity
  ): MatchMethod[] {
    const methods: MatchMethod[] = [];
    const docLower = (documentActivity.text + " " + (documentActivity.heading || "")).toLowerCase();

    // Check alias match
    if (activity.aliases && activity.aliases.length > 0) {
      for (const alias of activity.aliases) {
        if (docLower.includes(alias.toLowerCase())) {
          methods.push(MatchMethod.ALIAS);
          break;
        }
      }
    }

    // Check keyword match
    if (activity.keywords && activity.keywords.length > 0) {
      for (const keyword of activity.keywords) {
        if (docLower.includes(keyword.toLowerCase())) {
          methods.push(MatchMethod.KEYWORD);
          break;
        }
      }
    }

    // Check heading match
    if (documentActivity.heading && activity.title) {
      const headingSim = this.calculateSimilarity(
        documentActivity.heading.toLowerCase(),
        activity.title.toLowerCase()
      );
      if (headingSim >= 0.8) {
        methods.push(MatchMethod.HEADING);
      }
    }

    // Check order match
    if (documentActivity.order && activity.order) {
      if (Math.abs(documentActivity.order - activity.order) <= 1) {
        methods.push(MatchMethod.ORDER);
      }
    }

    // Check structure match (section code)
    if (documentActivity.sectionCode) {
      methods.push(MatchMethod.STRUCTURE);
    }

    // If multiple methods matched
    if (methods.length > 1) {
      return [MatchMethod.MULTIPLE];
    }

    return methods.length > 0 ? methods : [MatchMethod.KEYWORD]; // Default to keyword
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
   * Calculate Levenshtein distance
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
   * Create unknown result
   */
  private createUnknownResult(documentActivity: DocumentActivity): MatchResult {
    return {
      activityId: "unknown",
      activityCode: "UNKNOWN",
      activityTitle: documentActivity.title,
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
    };
  }
}
