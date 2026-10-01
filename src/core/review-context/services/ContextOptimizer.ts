/**
 * Context Optimizer Service
 *
 * Phase 3: Removes duplicate data, empty content, and unused knowledge
 */

import type {
  ActivityReviewContext,
  DocumentParagraph,
  Rule,
} from "../types";

export class ContextOptimizer {
  /**
   * Optimize a single activity review context
   */
  optimize(context: ActivityReviewContext): ActivityReviewContext {
    const optimized = this.optimizeParagraphs(context.paragraphs);
    const filteredRules = this.filterRules(context.rules);
    const cleanedKnowledge = this.cleanKnowledge(context);

    return {
      ...context,
      paragraphs: optimized,
      rules: filteredRules,
      knowledge: cleanedKnowledge.knowledge,
      teachingIntent: cleanedKnowledge.teachingIntent,
      expectedTeacherActions: cleanedKnowledge.expectedTeacherActions,
      expectedStudentActions: cleanedKnowledge.expectedStudentActions,
      expectedOutcome: cleanedKnowledge.expectedOutcome,
    };
  }

  /**
   * Optimize multiple contexts
   */
  optimizeAll(contexts: ActivityReviewContext[]): ActivityReviewContext[] {
    return contexts.map((context) => this.optimize(context));
  }

  /**
   * Remove duplicate and empty paragraphs
   */
  private optimizeParagraphs(paragraphs: DocumentParagraph[]): DocumentParagraph[] {
    const seen = new Set<string>();
    const result: DocumentParagraph[] = [];

    for (const paragraph of paragraphs) {
      // Skip empty paragraphs
      if (!paragraph.text || paragraph.text.trim().length === 0) {
        continue;
      }

      // Skip duplicate paragraphs (by normalized text)
      const normalized = paragraph.text.toLowerCase().trim();
      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      result.push({
        ...paragraph,
        text: paragraph.text.trim(),
      });
    }

    return result;
  }

  /**
   * Filter rules - remove duplicates and sort by priority
   */
  private filterRules(rules: Rule[]): Rule[] {
    const seen = new Set<string>();
    const result: Rule[] = [];

    for (const rule of rules) {
      if (seen.has(rule.code)) {
        continue;
      }
      seen.add(rule.code);
      result.push(rule);
    }

    // Sort by priority (highest first)
    return result.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Clean knowledge fields - remove empty/undefined values
   */
  private cleanKnowledge(context: ActivityReviewContext): Partial<ActivityReviewContext> {
    return {
      knowledge: this.cleanString(context.knowledge),
      teachingIntent: this.cleanString(context.teachingIntent),
      expectedTeacherActions: this.cleanString(context.expectedTeacherActions),
      expectedStudentActions: this.cleanString(context.expectedStudentActions),
      expectedOutcome: this.cleanString(context.expectedOutcome),
    };
  }

  /**
   * Clean a string - return undefined if empty
   */
  private cleanString(value: string | undefined): string | undefined {
    if (!value || value.trim().length === 0) {
      return undefined;
    }
    return value.trim();
  }

  /**
   * Check if content is used (has keywords matching paragraphs)
   */
  isKnowledgeUsed(knowledge: string | undefined, paragraphs: DocumentParagraph[]): boolean {
    if (!knowledge || knowledge.trim().length === 0) {
      return false;
    }

    const knowledgeWords = knowledge.toLowerCase().split(/\s+/);
    const paragraphTexts = paragraphs.map((p) => p.text.toLowerCase());

    // Check if any knowledge word appears in paragraphs
    for (const word of knowledgeWords) {
      if (word.length < 3) continue; // Skip short words
      for (const text of paragraphTexts) {
        if (text.includes(word)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get statistics about removed content
   */
  getOptimizationStats(
    original: ActivityReviewContext,
    optimized: ActivityReviewContext
  ): {
    paragraphsRemoved: number;
    rulesRemoved: number;
    knowledgeRemoved: boolean;
    characterSavings: number;
  } {
    const originalTextLength = original.paragraphs.reduce((sum, p) => sum + p.text.length, 0);
    const optimizedTextLength = optimized.paragraphs.reduce((sum, p) => sum + p.text.length, 0);

    return {
      paragraphsRemoved: original.paragraphs.length - optimized.paragraphs.length,
      rulesRemoved: original.rules.length - optimized.rules.length,
      knowledgeRemoved:
        (original.knowledge || "") !== (optimized.knowledge || "") ||
        (original.teachingIntent || "") !== (optimized.teachingIntent || ""),
      characterSavings: originalTextLength - optimizedTextLength,
    };
  }
}

export const contextOptimizer = new ContextOptimizer();
