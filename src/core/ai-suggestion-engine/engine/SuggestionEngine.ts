/**
 * Suggestion Engine
 *
 * Phase 8: Main engine for generating suggestions from review results
 */

import {
  SuggestionEngineInput,
  SuggestionEngineOutput,
  Suggestion,
  Conflict,
  SuggestionStatistics,
  ActivityInput,
  ParagraphInput,
  ReviewIssueInput,
  RuleRef,
  PatchOperation,
  SuggestionStatus,
} from "../types";
import { ConflictEngine } from "./ConflictEngine";
import { GeminiSuggestionGenerator } from "./GeminiSuggestionGenerator";

export class SuggestionEngine {
  private conflictEngine: ConflictEngine;
  private generator: GeminiSuggestionGenerator;

  constructor() {
    this.conflictEngine = new ConflictEngine();
    this.generator = new GeminiSuggestionGenerator();
  }

  /**
   * Generate suggestions from review results
   */
  async generate(input: SuggestionEngineInput): Promise<SuggestionEngineOutput> {
    const { sessionId, reviewId, activities, issues, rules } = input;

    const suggestions: Suggestion[] = [];
    const conflicts: Conflict[] = [];

    // Group issues by activity
    const issuesByActivity = this.groupIssuesByActivity(issues);

    // Process each activity
    for (const [activityId, activityIssues] of Object.entries(issuesByActivity)) {
      const activity = activities.find((a) => a.activityId === activityId);
      if (!activity) continue;

      // Generate suggestions for each issue
      for (const issue of activityIssues) {
        const suggestion = await this.createSuggestion(
          sessionId,
          reviewId,
          activity,
          issue,
          rules
        );

        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(sessionId, suggestions);

    return {
      sessionId,
      reviewId,
      suggestions,
      statistics,
      conflicts,
      generatedAt: new Date(),
    };
  }

  /**
   * Create a single suggestion from an issue
   */
  private async createSuggestion(
    sessionId: string,
    reviewId: string,
    activity: ActivityInput,
    issue: ReviewIssueInput,
    rules: RuleRef[]
  ): Promise<Suggestion | null> {
    const rule = rules.find((r) => r.ruleId === issue.ruleId);

    // Find the paragraph
    const paragraph = issue.paragraphIndex !== undefined
      ? activity.paragraphs[issue.paragraphIndex]
      : activity.paragraphs[0];

    if (!paragraph) {
      return null;
    }

    // Determine the operation type based on issue
    const operation = this.determineOperation(issue, paragraph.text);

    // Use Gemini to generate the actual fix
    const fixResult = await this.generator.generateFix({
      activityTitle: activity.activityTitle,
      paragraphText: paragraph.text,
      issue: issue,
      rule: rule,
    });

    if (!fixResult) {
      return null;
    }

    const suggestion: Suggestion = {
      suggestionId: this.generateId(),
      sessionId,
      reviewId,
      paragraphId: paragraph.paragraphId,
      activityId: activity.activityId,
      activityTitle: activity.activityTitle,
      sectionId: activity.sectionId,
      sectionTitle: activity.sectionTitle,
      rule: {
        ruleId: rule?.ruleId || issue.ruleId,
        ruleName: rule?.ruleName || issue.title,
        category: rule?.category || "CONTENT",
        severity: issue.severity,
        priority: rule?.priority || 5,
      },
      operation: fixResult.operation,
      oldText: paragraph.text,
      newText: fixResult.newText,
      reason: fixResult.reason,
      confidence: issue.confidence * fixResult.confidence,
      createdAt: new Date(),
      status: SuggestionStatus.PENDING,
    };

    return suggestion;
  }

  /**
   * Determine the appropriate patch operation based on issue and paragraph
   */
  private determineOperation(
    issue: ReviewIssueInput,
    paragraphText: string
  ): PatchOperation {
    // Check if there are suggestions in the issue
    if (issue.suggestions && issue.suggestions.length > 0) {
      // If the suggestion indicates insertion
      const suggestion = issue.suggestions[0].toLowerCase();
      if (suggestion.includes("thêm") || suggestion.includes("add")) {
        return PatchOperation.INSERT_AFTER;
      }
      if (suggestion.includes("xóa") || suggestion.includes("delete")) {
        return PatchOperation.DELETE;
      }
      if (suggestion.includes("tách") || suggestion.includes("split")) {
        return PatchOperation.SPLIT_PARAGRAPH;
      }
      if (suggestion.includes("gộp") || suggestion.includes("merge")) {
        return PatchOperation.MERGE_PARAGRAPH;
      }
    }

    // Default to replace
    return PatchOperation.REPLACE;
  }

  /**
   * Group issues by activity ID
   */
  private groupIssuesByActivity(
    issues: ReviewIssueInput[]
  ): Record<string, ReviewIssueInput[]> {
    const grouped: Record<string, ReviewIssueInput[]> = {};

    for (const issue of issues) {
      if (!grouped[issue.activityId]) {
        grouped[issue.activityId] = [];
      }
      grouped[issue.activityId].push(issue);
    }

    return grouped;
  }

  /**
   * Calculate statistics for suggestions
   */
  private calculateStatistics(
    sessionId: string,
    suggestions: Suggestion[]
  ): SuggestionStatistics {
    const stats: SuggestionStatistics = {
      sessionId,
      totalSuggestions: suggestions.length,
      accepted: 0,
      rejected: 0,
      pending: suggestions.filter(
        (s) => s.status === SuggestionStatus.PENDING
      ).length,
      conflicts: 0,
      errorCount: suggestions.filter((s) => s.rule.severity === "ERROR")
        .length,
      warningCount: suggestions.filter((s) => s.rule.severity === "WARNING")
        .length,
      infoCount: suggestions.filter((s) => s.rule.severity === "INFO").length,
      rulesTriggered: new Map(),
      averageConfidence:
        suggestions.length > 0
          ? suggestions.reduce((sum, s) => sum + s.confidence, 0) /
            suggestions.length
          : 0,
      generatedAt: new Date(),
    };

    // Count rules triggered
    for (const suggestion of suggestions) {
      const count = stats.rulesTriggered.get(suggestion.rule.ruleId) || 0;
      stats.rulesTriggered.set(suggestion.rule.ruleId, count + 1);
    }

    return stats;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
