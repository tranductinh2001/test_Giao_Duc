/**
 * Fix Generator
 *
 * Generate fixes for detected issues using BeekOne AI.
 */

import { BeekOneAIClient } from '@/lib/beekone-ai-client';
import type {
  FixRule,
  FixSuggestion,
  StructureIssue,
  ContentIssue,
  FixResult,
} from '../types';

export class FixGenerator {
  private rules: FixRule[];
  private aiClient: BeekOneAIClient;

  constructor(rules: FixRule[], options?: { apiKey?: string; baseUrl?: string; model?: string }) {
    this.rules = rules.filter((r) => r.isActive);
    this.aiClient = new BeekOneAIClient(options);
  }

  /**
   * Check if AI provider is available
   */
  isAvailable(): boolean {
    return this.aiClient.isAvailable();
  }

  /**
   * Generate fixes for issues
   */
  async generateFixes(
    structureIssues: StructureIssue[],
    contentIssues: ContentIssue[]
  ): Promise<FixResult> {
    const startTime = Date.now();
    const appliedFixes: FixSuggestion[] = [];
    const rejectedFixes: FixSuggestion[] = [];
    let aiCallCount = 0;

    // Generate fixes for structure issues
    for (const issue of structureIssues) {
      const fix = await this.generateFixForIssue(issue.ruleCode, issue.id);
      if (fix) {
        if (fix.autoApply) {
          appliedFixes.push(fix);
        } else {
          rejectedFixes.push(fix);
        }

        if (fix.fixType === 'AI_ASSISTED') {
          aiCallCount++;
        }
      }
    }

    // Generate fixes for content issues
    for (const issue of contentIssues) {
      const fix = await this.generateFixForIssue(issue.ruleCode, issue.id);
      if (fix) {
        if (fix.autoApply) {
          appliedFixes.push(fix);
        } else {
          rejectedFixes.push(fix);
        }

        if (fix.fixType === 'AI_ASSISTED') {
          aiCallCount++;
        }
      }
    }

    const fixTime = Date.now() - startTime;

    return {
      success: true,
      appliedFixes,
      rejectedFixes,
      aiCallCount,
      fixTime,
    };
  }

  /**
   * Generate fix for a single issue
   */
  private async generateFixForIssue(
    issueType: string,
    issueId: string
  ): Promise<FixSuggestion | null> {
    const rule = this.rules.find((r) => r.issueType === issueType);
    if (!rule) return null;

    switch (rule.fixType) {
      case 'TEMPLATE':
        return this.generateTemplateFix(rule, issueId);
      case 'AI_ASSISTED':
        return this.generateAIFix(rule, issueId);
      case 'MANUAL':
        return this.generateManualFix(rule, issueId);
      default:
        return null;
    }
  }

  /**
   * Generate template-based fix
   */
  private async generateTemplateFix(
    rule: FixRule,
    issueId: string
  ): Promise<FixSuggestion> {
    return {
      id: `fix_${issueId}_${Date.now()}`,
      fixRuleId: rule.id,
      issueId,
      fixType: 'TEMPLATE',
      content: rule.fixTemplate || null,
      instructions: rule.instructions || null,
      autoApply: rule.autoApply,
      requiresApproval: rule.requiresApproval,
      confidence: 1.0,
    };
  }

  /**
   * Generate AI-assisted fix
   */
  private async generateAIFix(
    rule: FixRule,
    issueId: string
  ): Promise<FixSuggestion> {
    try {
      const prompt = rule.aiPrompt || 'Generate fix for this issue.';

      const result = await this.aiClient.complete(prompt, {
        temperature: 0.3,
        maxTokens: 500,
        systemPrompt: "You are an AI assistant that generates fixes for lesson plan issues.",
      });

      if (!result.success || !result.data) {
        console.error('[FixGenerator] AI call failed:', result.error);
        // Fallback to manual fix
        return this.generateManualFix(rule, issueId);
      }

      // Log metrics
      if (result.metrics) {
        console.log(`[FixGenerator] AI Metrics - Provider: ${result.metrics.provider}, Model: ${result.metrics.model}, Tokens: ${result.metrics.totalTokens}, Cost: $${result.metrics.estimatedCost.toFixed(6)}, Latency: ${result.metrics.latencyMs}ms`);
      }

      return {
        id: `fix_${issueId}_${Date.now()}`,
        fixRuleId: rule.id,
        issueId,
        fixType: 'AI_ASSISTED',
        content: result.data,
        instructions: rule.instructions || null,
        autoApply: rule.autoApply,
        requiresApproval: rule.requiresApproval,
        confidence: 0.8,
      };
    } catch (error) {
      console.error('[FixGenerator] AI error:', error);
      return this.generateManualFix(rule, issueId);
    }
  }

  /**
   * Generate manual fix instructions
   */
  private async generateManualFix(
    rule: FixRule,
    issueId: string
  ): Promise<FixSuggestion> {
    return {
      id: `fix_${issueId}_${Date.now()}`,
      fixRuleId: rule.id,
      issueId,
      fixType: 'MANUAL',
      content: null,
      instructions: rule.instructions || 'Manual fix required',
      autoApply: false,
      requiresApproval: true,
      confidence: 1.0,
    };
  }
}
