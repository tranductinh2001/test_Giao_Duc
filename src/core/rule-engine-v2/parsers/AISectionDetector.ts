/**
 * AI Section Detector
 *
 * Fallback to AI when rules cannot detect section.
 * Uses BeekOne AI client for section detection.
 */

import { BeekOneAIClient, type AIResult } from '@/lib/beekone-ai-client';
import type {
  AISectionDetectionRequest,
  AISectionDetectionResult,
  TemplateSection,
} from '../types';

export class AISectionDetector {
  private aiClient: BeekOneAIClient;

  constructor(options?: { apiKey?: string; baseUrl?: string; model?: string }) {
    this.aiClient = new BeekOneAIClient(options);
  }

  /**
   * Check if AI provider is available
   */
  isAvailable(): boolean {
    return this.aiClient.isAvailable();
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    return this.aiClient.getProviderInfo();
  }

  /**
   * Detect section using AI
   */
  async detect(
    request: AISectionDetectionRequest
  ): Promise<AISectionDetectionResult> {
    const prompt = this.buildPrompt(request);

    const result = await this.aiClient.complete(prompt, {
      temperature: 0.1,
      maxTokens: 200,
      systemPrompt: "You are a lesson plan section detector.",
    });

    if (!result.success || !result.data) {
      console.error('[AISectionDetector] AI call failed:', result.error);
      // Return empty result instead of throwing
      return {
        sectionCode: '',
        confidence: 0,
        reason: result.error || 'AI detection failed',
        shouldCreateRule: false,
      };
    }

    // Log metrics if available
    if (result.metrics) {
      console.log(`[AISectionDetector] AI Metrics - Provider: ${result.metrics.provider}, Model: ${result.metrics.model}, Tokens: ${result.metrics.totalTokens}, Cost: $${result.metrics.estimatedCost.toFixed(6)}, Latency: ${result.metrics.latencyMs}ms`);
    }

    return this.parseResponse(result.data, request.expectedSections);
  }

  /**
   * Build prompt for AI
   */
  private buildPrompt(request: AISectionDetectionRequest): string {
    const expectedList = request.expectedSections
      .map((s) => `- ${s.code}: ${s.name}`)
      .join('\n');

    return `Context: ${request.context}

Expected sections in this template:
${expectedList}

Text to analyze:
"${request.text}"

Task: Identify which section this text belongs to.

Respond in JSON format:
{
  "sectionCode": "CODE",
  "confidence": 0.95,
  "reason": "Brief explanation",
  "shouldCreateRule": true
}

Rules:
1. confidence: 0-1 (how confident you are)
2. shouldCreateRule: true if this pattern should be learned for future use
3. If no match, return null for sectionCode`;
  }

  /**
   * Parse AI response
   */
  private parseResponse(
    response: string,
    expectedSections: TemplateSection[]
  ): AISectionDetectionResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate section code
      if (parsed.sectionCode) {
        const section = expectedSections.find((s) => s.code === parsed.sectionCode);
        if (!section) {
          throw new Error(`Unknown section code: ${parsed.sectionCode}`);
        }
      }

      return {
        sectionCode: parsed.sectionCode || '',
        confidence: parsed.confidence || 0,
        reason: parsed.reason || '',
        shouldCreateRule: parsed.shouldCreateRule || false,
      };
    } catch (error) {
      console.error('[AISectionDetector] Parse error:', error);
      return {
        sectionCode: '',
        confidence: 0,
        reason: 'Failed to parse AI response',
        shouldCreateRule: false,
      };
    }
  }

  /**
   * Batch detect multiple texts
   */
  async detectBatch(
    texts: string[],
    context: string,
    expectedSections: TemplateSection[]
  ): Promise<AISectionDetectionResult[]> {
    const results: AISectionDetectionResult[] = [];

    for (const text of texts) {
      const result = await this.detect({
        text,
        context,
        expectedSections,
      });
      results.push(result);
    }

    return results;
  }
}
