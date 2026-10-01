/**
 * Content Reviewer
 *
 * Review section content using BeekOne AI and rules.
 */

import { BeekOneAIClient } from '@/lib/beekone-ai-client';
import type {
  ContentRule,
  ContentIssue,
  ParsedSection,
  ValidationResult,
} from '../types';

export interface ContentReviewerOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  textbookContext?: {
    bookId?: string;
    bookName?: string;
    chapterId?: string;
    chapterTitle?: string;
    startPage?: number;
    endPage?: number;
  };
}

export class ContentReviewer {
  private rules: ContentRule[];
  private aiClient: BeekOneAIClient;
  private textbookContext?: ContentReviewerOptions['textbookContext'];

  constructor(rules: ContentRule[], options?: ContentReviewerOptions) {
    console.log('[ContentReviewer] ===== INITIALIZATION =====');
    console.log('[ContentReviewer] Input rules count:', rules?.length || 0);

    this.rules = rules.filter((r) => r.isActive && r.useAI);
    this.textbookContext = options?.textbookContext;
    this.aiClient = new BeekOneAIClient(options);

    console.log('[ContentReviewer] After filter (isActive && useAI):', this.rules.length);
    console.log('[ContentReviewer] Rules with useAI:', this.rules.filter(r => r.useAI).length);
    console.log('[ContentReviewer] AI Provider Available:', this.aiClient.isAvailable());
    if (this.textbookContext) {
      console.log('[ContentReviewer] Textbook Context:', this.textbookContext.bookName, '- Chapter:', this.textbookContext.chapterTitle);
    }
    console.log('[ContentReviewer] ========================');
  }

  /**
   * Check if AI provider is available
   */
  isAvailable(): boolean {
    return this.aiClient.isAvailable();
  }

  /**
   * Review section content
   */
  async review(sections: ParsedSection[]): Promise<ValidationResult> {
    console.log('[ContentReviewer.review] ===== START REVIEW =====');
    console.log('[ContentReviewer.review] Sections to review:', sections.length);
    console.log('[ContentReviewer.review] Available rules:', this.rules.length);

    // Check AI availability
    if (!this.isAvailable()) {
      console.warn('[ContentReviewer.review] AI provider not available, skipping AI review');
      return {
        success: true,
        structureIssues: [],
        contentIssues: [],
        aiCallCount: 0,
        validationTime: 0,
      };
    }

    const startTime = Date.now();
    const contentIssues: ContentIssue[] = [];
    let aiCallCount = 0;

    // Log all available sectionIds in rules
    const ruleSectionIds = [...new Set(this.rules.map(r => r.sectionId))];
    console.log('[ContentReviewer.review] Rule sectionIds:', ruleSectionIds);

    for (const section of sections) {
      console.log('[ContentReviewer.review] Processing section:', section.sectionCode, section.sectionName);

      // Get rules for this section - check BOTH sectionId AND sectionCode
      const sectionRules = this.rules.filter((r) =>
        r.sectionId === section.sectionCode || r.sectionCode === section.sectionCode
      );
      console.log('[ContentReviewer.review] Matching rules for', section.sectionCode, ':', sectionRules.length);

      if (sectionRules.length === 0) {
        console.log('[ContentReviewer.review] WARNING: No rules found for section', section.sectionCode);
        console.log('[ContentReviewer.review] Available sectionIds were:', ruleSectionIds);
      }

      for (const rule of sectionRules) {
        console.log('[ContentReviewer.review] Calling AI for rule:', rule.code, rule.name);
        const issues = await this.reviewWithRule(section, rule);
        console.log('[ContentReviewer.review] AI returned issues:', issues.length);
        contentIssues.push(...issues);
        aiCallCount++;
      }
    }

    console.log('[ContentReviewer.review] ===== END REVIEW =====');
    console.log('[ContentReviewer.review] Total AI calls:', aiCallCount);

    const validationTime = Date.now() - startTime;

    return {
      success: contentIssues.length === 0,
      structureIssues: [],
      contentIssues,
      aiCallCount,
      validationTime,
    };
  }

  /**
   * Review section with a single rule
   */
  private async reviewWithRule(
    section: ParsedSection,
    rule: ContentRule
  ): Promise<ContentIssue[]> {
    const prompt = this.buildPrompt(section, rule);

    try {
      const result = await this.aiClient.complete(prompt, {
        temperature: rule.temperature || 0.3,
        maxTokens: rule.maxTokens || 500,
        systemPrompt: rule.systemPrompt || undefined,
      });

      if (!result.success || !result.data) {
        console.error('[ContentReviewer] AI call failed:', result.error);
        return [];
      }

      // Log metrics
      if (result.metrics) {
        console.log(`[ContentReviewer] AI Metrics - Provider: ${result.metrics.provider}, Model: ${result.metrics.model}, Tokens: ${result.metrics.totalTokens}, Cost: $${result.metrics.estimatedCost.toFixed(6)}, Latency: ${result.metrics.latencyMs}ms`);
      }

      return this.parseResponse(result.data, section, rule);
    } catch (error) {
      console.error(`[ContentReviewer] Error reviewing section ${section.sectionCode}:`, error);
      return [];
    }
  }

  /**
   * Build AI prompt
   */
  private buildPrompt(section: ParsedSection, rule: ContentRule): string {
    const criteriaText = rule.criteria
      ? `\nCriteria:\n${JSON.stringify(rule.criteria, null, 2)}`
      : '';

    // Add textbook context if available
    let textbookContextText = '';
    if (this.textbookContext) {
      textbookContextText = `
TEXTBOOK CONTEXT (Use this to evaluate lesson alignment):
- Textbook: ${this.textbookContext.bookName || 'Not specified'}
- Chapter: ${this.textbookContext.chapterTitle || 'Not specified'}
- Pages: ${this.textbookContext.startPage || '?'} - ${this.textbookContext.endPage || '?'}

The lesson plan should align with the above textbook chapter content. Evaluate whether the content matches the expected curriculum.
`;
    }

    return `${rule.systemPrompt || ''}

Section: ${section.sectionName}
Check Type: ${rule.checkType}
${textbookContextText}
Content to review:
"""
${section.content}
"""

${rule.userPrompt}${criteriaText}

Respond in JSON format:
{
  "hasIssue": true/false,
  "issues": [
    {
      "message": "Brief description",
      "explanation": "Why this is an issue",
      "suggestion": "How to fix",
      "severity": "ERROR" | "WARNING" | "INFO",
      "startOffset": 0,
      "endOffset": 10
    }
  ]
}`;
  }

  /**
   * Parse AI response
   */
  private parseResponse(
    response: string,
    section: ParsedSection,
    rule: ContentRule
  ): ContentIssue[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.hasIssue || !parsed.issues) {
        return [];
      }

      return parsed.issues.map((issue: any) => ({
        id: `content_${rule.code}_${section.sectionCode}_${Date.now()}`,
        ruleId: rule.id,
        ruleCode: rule.code,
        severity: issue.severity || rule.severity,
        message: issue.message || 'Content issue detected',
        explanation: issue.explanation || null,
        suggestion: issue.suggestion || null,
        position: {
          sectionId: section.sectionCode,
          startOffset: issue.startOffset,
          endOffset: issue.endOffset,
        },
        sectionCode: section.sectionCode, // Add for annotation mapping
        penaltyScore: rule.penaltyScore,
        aiGenerated: true,
      }));
    } catch (error) {
      console.error('[ContentReviewer] Parse error:', error);
      return [];
    }
  }

  /**
   * Batch review multiple sections
   */
  async reviewBatch(sections: ParsedSection[]): Promise<ValidationResult> {
    return this.review(sections);
  }
}
