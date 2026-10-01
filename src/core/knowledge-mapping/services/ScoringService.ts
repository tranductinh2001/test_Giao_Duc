/**
 * Scoring Service
 *
 * Phase 2: Weighted scoring for matching
 */

import { TextNormalizer } from "../../rule-engine-v2/parsers/TextNormalizer";
import type { MappingConfig, MatchScore } from "../types";

export class ScoringService {
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
  }

  /**
   * Calculate match score between document content and library activity
   */
  calculateScore(params: {
    documentText: string;
    documentHeading?: string;
    documentOrder?: number;
    documentStructure?: string;
    documentParagraphs?: string[];
    activityTitle: string;
    activityKeywords: string[];
    activityAliases: string[];
    activityOrder?: number;
    activityStructure?: string;
  }): MatchScore {
    const { documentText, documentHeading, documentOrder, activityTitle, activityKeywords, activityAliases, activityOrder, documentStructure, activityStructure, documentParagraphs } = params;

    const normalizedDoc = TextNormalizer.normalize(documentText, {
      lowercase: true,
      removeAccents: true,
      normalizeSpaces: true,
    });

    const normalizedHeading = documentHeading
      ? TextNormalizer.normalize(documentHeading, {
          lowercase: true,
          removeAccents: true,
          normalizeSpaces: true,
        })
      : "";

    const normalizedTitle = TextNormalizer.normalize(activityTitle, {
      lowercase: true,
      removeAccents: true,
      normalizeSpaces: true,
    });

    // Calculate individual scores
    const aliasScore = this.calculateAliasScore(normalizedDoc, normalizedHeading, activityAliases);
    const keywordScore = this.calculateKeywordScore(normalizedDoc, activityKeywords);
    const headingScore = this.calculateHeadingScore(normalizedHeading, normalizedTitle);
    const orderScore = this.calculateOrderScore(documentOrder, activityOrder);
    const structureScore = this.calculateStructureScore(documentStructure, activityStructure);
    const paragraphScore = this.calculateParagraphFeaturesScore(documentParagraphs, activityKeywords);

    // Apply weights
    const total =
      aliasScore * (this.config.weights.alias / 100) +
      keywordScore * (this.config.weights.keyword / 100) +
      headingScore * (this.config.weights.heading / 100) +
      orderScore * (this.config.weights.order / 100) +
      structureScore * (this.config.weights.structure / 100) +
      paragraphScore * (this.config.weights.paragraphFeatures / 100);

    return {
      total: Math.min(100, Math.round(total * 100) / 100),
      breakdown: {
        alias: aliasScore,
        keyword: keywordScore,
        heading: headingScore,
        order: orderScore,
        structure: structureScore,
        paragraphFeatures: paragraphScore,
      },
      weights: this.config.weights,
    };
  }

  /**
   * Calculate alias match score (0-100)
   */
  private calculateAliasScore(
    documentText: string,
    documentHeading: string,
    aliases: string[]
  ): number {
    if (aliases.length === 0) return 0;

    const combined = `${documentText} ${documentHeading}`;
    let maxScore = 0;

    for (const alias of aliases) {
      const normalizedAlias = TextNormalizer.normalize(alias, {
        lowercase: true,
        removeAccents: true,
        normalizeSpaces: true,
      });

      // Exact match
      if (combined.includes(normalizedAlias)) {
        return 100;
      }

      // Fuzzy match
      const similarity = TextNormalizer.similarity(combined, normalizedAlias);
      if (similarity >= this.config.fuzzyThreshold) {
        maxScore = Math.max(maxScore, similarity * 100);
      }
    }

    return maxScore;
  }

  /**
   * Calculate keyword match score (0-100)
   */
  private calculateKeywordScore(documentText: string, keywords: string[]): number {
    if (keywords.length === 0) return 0;

    const normalizedKeywords = keywords.map((k) =>
      TextNormalizer.normalize(k, {
        lowercase: true,
        removeAccents: true,
        normalizeSpaces: true,
      })
    );

    let matchedCount = 0;
    for (const keyword of normalizedKeywords) {
      if (documentText.includes(keyword)) {
        matchedCount++;
      }
    }

    return (matchedCount / normalizedKeywords.length) * 100;
  }

  /**
   * Calculate heading/title match score (0-100)
   */
  private calculateHeadingScore(documentHeading: string, activityTitle: string): number {
    if (!documentHeading || !activityTitle) return 0;

    const similarity = TextNormalizer.similarity(documentHeading, activityTitle);
    return similarity * 100;
  }

  /**
   * Calculate order match score (0-100)
   */
  private calculateOrderScore(docOrder?: number, activityOrder?: number): number {
    if (docOrder === undefined || activityOrder === undefined || activityOrder === null) {
      return 0;
    }

    // Exact match
    if (docOrder === activityOrder) return 100;

    // Close match (within 1 position)
    if (Math.abs(docOrder - activityOrder) <= 1) return 80;

    // Within 2 positions
    if (Math.abs(docOrder - activityOrder) <= 2) return 60;

    // Within 3 positions
    if (Math.abs(docOrder - activityOrder) <= 3) return 40;

    return 0;
  }

  /**
   * Calculate structure match score (0-100)
   */
  private calculateStructureScore(
    documentStructure?: string,
    activityStructure?: string
  ): number {
    if (!documentStructure || !activityStructure) return 0;

    const similarity = TextNormalizer.similarity(documentStructure, activityStructure);
    return similarity * 100;
  }

  /**
   * Calculate paragraph features score (0-100)
   */
  private calculateParagraphFeaturesScore(
    paragraphs?: string[],
    keywords?: string[]
  ): number {
    if (!paragraphs || paragraphs.length === 0 || !keywords || keywords.length === 0) {
      return 0;
    }

    const normalizedKeywords = keywords.map((k) =>
      TextNormalizer.normalize(k, {
        lowercase: true,
        removeAccents: true,
      })
    );

    let totalMatches = 0;
    let totalChecks = 0;

    for (const paragraph of paragraphs) {
      const normalizedParagraph = TextNormalizer.normalize(paragraph, {
        lowercase: true,
        removeAccents: true,
      });

      for (const keyword of normalizedKeywords) {
        totalChecks++;
        if (normalizedParagraph.includes(keyword)) {
          totalMatches++;
        }
      }
    }

    return totalChecks > 0 ? (totalMatches / totalChecks) * 100 : 0;
  }

  /**
   * Convert score to confidence level
   */
  getConfidenceLevel(score: number): "HIGH" | "MEDIUM" | "LOW" {
    if (score >= 80) return "HIGH";
    if (score >= 50) return "MEDIUM";
    return "LOW";
  }

  /**
   * Check if score meets threshold
   */
  meetsThreshold(score: number): boolean {
    return score >= this.config.confidenceThreshold;
  }
}
