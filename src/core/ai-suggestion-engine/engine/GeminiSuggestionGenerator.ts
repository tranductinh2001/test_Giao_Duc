/**
 * Gemini Suggestion Generator
 *
 * Phase 8: Generate suggestions using AI APIs
 * Supports both Google Gemini and Beeknoee (OpenAI-compatible)
 */

import {
  ReviewIssueInput,
  RuleRef,
  PatchOperation,
} from "../types";

// Provider types
export type AIProviderType = "gemini" | "beeknoee";

interface FixResult {
  newText: string;
  operation: PatchOperation;
  reason: string;
  confidence: number;
}

interface GenerateFixInput {
  activityTitle: string;
  paragraphText: string;
  issue: ReviewIssueInput;
  rule?: RuleRef;
}

interface AISuggestionResponse {
  operation: string;
  newText: string;
  reason: string;
  confidence: number;
}

export class GeminiSuggestionGenerator {
  private provider: AIProviderType;
  private model: string;
  private apiKey?: string;
  private baseUrl?: string;

  constructor() {
    // Read configuration from environment
    this.provider = (process.env.AI_SUGGESTION_PROVIDER as AIProviderType) || "beeknoee";
    this.model = process.env.AI_SUGGESTION_MODEL || "gemini-3.1-flash-lite";

    if (this.provider === "beeknoee") {
      this.apiKey = process.env.BEE_API_KEY;
      this.baseUrl = process.env.BEE_BASE_URL || "https://platform.beeknoee.com/api/v1";
    } else {
      this.apiKey = process.env.GEMINI_API_KEY;
    }
  }

  /**
   * Get current provider type
   */
  getProvider(): AIProviderType {
    return this.provider;
  }

  /**
   * Generate a fix using configured AI provider
   */
  async generateFix(input: GenerateFixInput): Promise<FixResult | null> {
    const { activityTitle, paragraphText, issue, rule } = input;

    if (!this.apiKey) {
      console.warn(`AI provider (${this.provider}) API key not configured, using fallback`);
      return this.generateFallbackFix(issue, paragraphText);
    }

    try {
      const prompt = this.buildPrompt(input);

      let response: string;
      if (this.provider === "beeknoee") {
        response = await this.callBeeknoeeAPI(prompt);
      } else {
        response = await this.callGeminiAPI(prompt);
      }

      return this.parseResponse(response, paragraphText);
    } catch (error) {
      console.error(`AI suggestion generation failed (${this.provider}):`, error);
      return this.generateFallbackFix(issue, paragraphText);
    }
  }

  /**
   * Build prompt for AI
   */
  private buildPrompt(input: GenerateFixInput): string {
    const { activityTitle, paragraphText, issue, rule } = input;

    return `Bạn là một chuyên gia giáo dục. Hãy tạo bản sửa lỗi cho một đoạn văn trong giáo án.

Hoạt động: ${activityTitle}
Đoạn văn hiện tại: ${paragraphText}

Vấn đề:
- Tiêu đề: ${issue.title}
- Mô tả: ${issue.description}
- Lý do: ${issue.reason}
- Mức độ: ${issue.severity}
${rule ? `- Quy tắc: ${rule.ruleName}` : ""}

Hãy trả về JSON với format sau (KHÔNG có markdown, KHÔNG có code block):
{
  "operation": "replace|insertBefore|insertAfter|delete|splitParagraph|mergeParagraph",
  "newText": "nội dung mới sau khi sửa",
  "reason": "giải thích ngắn gọn tại sao cần sửa",
  "confidence": 0.0-1.0
}

Chỉ sửa đúng đoạn văn đang lỗi, không sửa toàn bộ activity hay section.
Nếu không cần thay đổi, trả về operation là "replace" với newText giống như paragraphText.`;
  }

  /**
   * Call Beeknoee API (OpenAI-compatible)
   */
  private async callBeeknoeeAPI(prompt: string): Promise<string> {
    // Convert model name to Beeknoee format
    const modelMap: Record<string, string> = {
      "gemini-3.1-flash-lite": "google/gemini-3.1-flash-lite",
      "gemini-3.5-flash": "google/gemini-3.5-flash",
      "gemini-2.5-flash": "google/gemini-2.5-flash",
      "gemini-2.5-pro": "google/gemini-2.5-pro",
      "gemma-4-31b-it": "google/gemma-4-31b-it",
    };

    const beeModel = modelMap[this.model] || `google/${this.model}`;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: beeModel,
        messages: [
          {
            role: "system",
            content: "Bạn là chuyên gia giáo dục Việt Nam. Nhiệm vụ của bạn là tạo bản sửa lỗi cho giáo án dưới dạng JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Beeknoee API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  /**
   * Call Google Gemini API
   */
  private async callGeminiAPI(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          topP: 0.95,
          topK: 40,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  /**
   * Parse AI response
   */
  private parseResponse(
    response: string,
    originalText: string
  ): FixResult | null {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.generateFallbackFixFromResponse(response, originalText);
      }

      const parsed: AISuggestionResponse = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      const operation = this.normalizeOperation(parsed.operation);
      const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));

      return {
        operation,
        newText: parsed.newText || originalText,
        reason: parsed.reason || "Sửa theo quy tắc",
        confidence,
      };
    } catch {
      return this.generateFallbackFixFromResponse(response, originalText);
    }
  }

  /**
   * Generate fallback when AI fails
   */
  private generateFallbackFix(
    issue: ReviewIssueInput,
    paragraphText: string
  ): FixResult {
    // Use suggestions from issue if available
    if (issue.suggestions && issue.suggestions.length > 0) {
      return {
        operation: PatchOperation.REPLACE,
        newText: issue.suggestions[0],
        reason: issue.reason,
        confidence: issue.confidence * 0.5,
      };
    }

    // Default fallback - no change
    return {
      operation: PatchOperation.REPLACE,
      newText: paragraphText,
      reason: issue.reason,
      confidence: issue.confidence * 0.3,
    };
  }

  /**
   * Generate fallback from raw response
   */
  private generateFallbackFixFromResponse(
    response: string,
    originalText: string
  ): FixResult {
    // Try to extract meaningful text from response
    const lines = response.split("\n").filter((l) => l.trim());
    const meaningfulLines = lines.filter(
      (l) =>
        !l.includes("{") &&
        !l.includes("}") &&
        !l.includes("operation") &&
        !l.includes("newText")
    );

    if (meaningfulLines.length > 0) {
      return {
        operation: PatchOperation.REPLACE,
        newText: meaningfulLines.join(" ").trim(),
        reason: "Sửa từ AI response",
        confidence: 0.3,
      };
    }

    return {
      operation: PatchOperation.REPLACE,
      newText: originalText,
      reason: "Giữ nguyên",
      confidence: 0.1,
    };
  }

  /**
   * Normalize operation string
   */
  private normalizeOperation(operation: string): PatchOperation {
    const normalized = operation.toLowerCase().replace(/["'\s]/g, "");

    switch (normalized) {
      case "replace":
        return PatchOperation.REPLACE;
      case "insertbefore":
        return PatchOperation.INSERT_BEFORE;
      case "insertafter":
        return PatchOperation.INSERT_AFTER;
      case "delete":
        return PatchOperation.DELETE;
      case "splitparagraph":
        return PatchOperation.SPLIT_PARAGRAPH;
      case "mergeparagraph":
        return PatchOperation.MERGE_PARAGRAPH;
      default:
        return PatchOperation.REPLACE;
    }
  }
}
