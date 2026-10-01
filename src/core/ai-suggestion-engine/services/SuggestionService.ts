/**
 * Suggestion Service
 *
 * Phase 8: Handle suggestion grouping and statistics
 */

import {
  Suggestion,
  SuggestionGroup,
  SuggestionStatistics,
  SuggestionGroupBy,
  SuggestionStatus,
} from "../types";

export interface GetSuggestionsOptions {
  sessionId: string;
  groupBy?: SuggestionGroupBy;
  status?: SuggestionStatus;
  minConfidence?: number;
}

export class SuggestionService {
  /**
   * Get suggestions with optional filtering
   */
  async getSuggestions(options: GetSuggestionsOptions): Promise<Suggestion[]> {
    // In real implementation, this would query database
    // For now, return empty array
    return [];
  }

  /**
   * Group suggestions by specified criteria
   */
  groupSuggestions(
    suggestions: Suggestion[],
    groupBy: SuggestionGroupBy
  ): SuggestionGroup[] {
    const groupsMap = new Map<string, { label: string; suggestions: Suggestion[] }>();

    for (const suggestion of suggestions) {
      let key: string;
      let label: string;

      switch (groupBy) {
        case SuggestionGroupBy.SECTION:
          key = suggestion.sectionId;
          label = suggestion.sectionTitle;
          break;
        case SuggestionGroupBy.ACTIVITY:
          key = suggestion.activityId;
          label = suggestion.activityTitle;
          break;
        case SuggestionGroupBy.SEVERITY:
          key = suggestion.rule.severity;
          label = this.getSeverityLabel(suggestion.rule.severity);
          break;
        case SuggestionGroupBy.RULE:
          key = suggestion.rule.ruleId;
          label = suggestion.rule.ruleName;
          break;
        default:
          key = suggestion.sectionId;
          label = suggestion.sectionTitle;
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { label, suggestions: [] });
      }
      groupsMap.get(key)!.suggestions.push(suggestion);
    }

    return Array.from(groupsMap.entries()).map(([key, data]) => ({
      key,
      label: data.label,
      type: groupBy.toLowerCase() as "section" | "activity" | "severity" | "rule",
      suggestions: data.suggestions,
      count: data.suggestions.length,
    }));
  }

  /**
   * Calculate statistics for suggestions
   */
  calculateStatistics(suggestions: Suggestion[]): SuggestionStatistics {
    const stats: SuggestionStatistics = {
      sessionId: suggestions[0]?.sessionId || "",
      totalSuggestions: suggestions.length,
      accepted: 0,
      rejected: 0,
      pending: 0,
      conflicts: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      rulesTriggered: new Map(),
      averageConfidence: 0,
      generatedAt: new Date(),
    };

    for (const suggestion of suggestions) {
      switch (suggestion.status) {
        case SuggestionStatus.ACCEPTED:
          stats.accepted++;
          break;
        case SuggestionStatus.REJECTED:
          stats.rejected++;
          break;
        case SuggestionStatus.PENDING:
          stats.pending++;
          break;
        case SuggestionStatus.CONFLICT:
          stats.conflicts++;
          break;
      }

      switch (suggestion.rule.severity) {
        case "ERROR":
          stats.errorCount++;
          break;
        case "WARNING":
          stats.warningCount++;
          break;
        case "INFO":
          stats.infoCount++;
          break;
      }

      const count = stats.rulesTriggered.get(suggestion.rule.ruleId) || 0;
      stats.rulesTriggered.set(suggestion.rule.ruleId, count + 1);
    }

    if (suggestions.length > 0) {
      stats.averageConfidence =
        suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;
    }

    return stats;
  }

  /**
   * Get severity label in Vietnamese
   */
  private getSeverityLabel(severity: string): string {
    switch (severity) {
      case "ERROR":
        return "Lỗi";
      case "WARNING":
        return "Cảnh báo";
      case "INFO":
        return "Thông tin";
      default:
        return "Không xác định";
    }
  }

  /**
   * Accept a suggestion (returns patch for application)
   */
  async acceptSuggestion(suggestionId: string): Promise<{
    success: boolean;
    patch?: any;
    error?: string;
  }> {
    // In real implementation, this would:
    // 1. Update suggestion status to ACCEPTED
    // 2. Create a patch record
    // 3. Return patch for DocumentEditor to apply
    return { success: true };
  }

  /**
   * Reject a suggestion
   */
  async rejectSuggestion(suggestionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // In real implementation, this would update suggestion status to REJECTED
    return { success: true };
  }

  /**
   * Regenerate a suggestion with new AI fix
   */
  async regenerateSuggestion(suggestionId: string): Promise<{
    success: boolean;
    newSuggestion?: Suggestion;
    error?: string;
  }> {
    // In real implementation, this would:
    // 1. Get original suggestion
    // 2. Call Gemini with same context but different prompt
    // 3. Create new suggestion
    return { success: true };
  }
}
