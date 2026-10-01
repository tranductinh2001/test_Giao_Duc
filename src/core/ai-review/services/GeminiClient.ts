/**
 * Gemini Client Service
 *
 * Phase 4: API client for Google Gemini models
 */

import { GeminiConfig, GeminiModel, DEFAULT_GEMINI_CONFIG } from "../types";

export interface GeminiRequest {
  contents: Array<{
    role: "user";
    parts: Array<{ text: string }>;
  }>;
  generationConfig: {
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    responseMimeType: string;
  };
  systemInstruction?: {
    role: "system";
    parts: Array<{ text: string }>;
  };
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text: string }>;
    };
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}

export interface GeminiCallResult {
  success: boolean;
  content?: string;
  error?: string;
  tokensUsed?: number;
  latency: number;
  finishReason?: string;
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.00015, output: 0.0006 },      // $0.15/1M input, $0.60/1M output
  "gemini-3-flash": { input: 0.000075, output: 0.0003 },       // $0.075/1M input, $0.30/1M output
  "gemini-3.5-flash": { input: 0.000075, output: 0.0003 },     // $0.075/1M input, $0.30/1M output
  "gemini-3.1-pro": { input: 0.001, output: 0.005 },           // $1.00/1M input, $5.00/1M output
};

export class GeminiClient {
  private config: GeminiConfig;
  private apiKey: string;

  constructor(config: Partial<GeminiConfig> = {}) {
    this.config = { ...DEFAULT_GEMINI_CONFIG, ...config };
    this.apiKey = this.config.apiKey || process.env.BEE_API_KEY || process.env.GEMINI_API_KEY || "";
  }

  /**
   * Set API key
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Check if API key is configured
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate content using Gemini
   */
  async generateContent(
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<GeminiCallResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "API key not configured",
        latency: 0,
      };
    }

    const startTime = Date.now();

    const request: GeminiRequest = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: options?.temperature ?? this.config.temperature,
        topP: this.config.topP,
        topK: this.config.topK,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens,
        responseMimeType: "application/json",
      },
    };

    if (systemPrompt) {
      request.systemInstruction = {
        role: "system",
        parts: [{ text: systemPrompt }],
      };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          latency: Date.now() - startTime,
        };
      }

      const data: GeminiResponse = await response.json();
      const latency = Date.now() - startTime;

      // Check for safety filters
      if (data.promptFeedback?.blockReason) {
        return {
          success: false,
          error: `Content blocked: ${data.promptFeedback.blockReason}`,
          latency,
        };
      }

      const candidate = data.candidates?.[0];
      if (!candidate?.content?.parts?.[0]?.text) {
        return {
          success: false,
          error: "No content in response",
          latency,
        };
      }

      const content = candidate.content.parts[0].text;
      const tokensUsed = this.estimateTokens(prompt) + this.estimateTokens(content);

      return {
        success: true,
        content,
        tokensUsed,
        latency,
        finishReason: candidate.finishReason,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate content with retry logic
   */
  async generateContentWithRetry(
    prompt: string,
    systemPrompt?: string,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      onRetry?: (attempt: number, error: string) => void;
    }
  ): Promise<GeminiCallResult> {
    const maxRetries = options?.maxRetries ?? 3;
    const retryDelay = options?.retryDelay ?? 1000;

    let lastError = "";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.generateContent(prompt, systemPrompt);

      if (result.success) {
        return result;
      }

      lastError = result.error || "Unknown error";

      // Don't retry on certain errors
      if (
        lastError.includes("API key") ||
        lastError.includes("blocked") ||
        lastError.includes("Invalid")
      ) {
        return result;
      }

      if (attempt < maxRetries) {
        options?.onRetry?.(attempt + 1, lastError);
        await this.sleep(retryDelay * (attempt + 1));
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries + 1} attempts: ${lastError}`,
      latency: 0,
    };
  }

  /**
   * Estimate tokens (rough approximation)
   */
  estimateTokens(text: string): number {
    // Average token is ~4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate estimated cost
   */
  calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[this.config.model];
    if (!pricing) {
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Get model info
   */
  getModelInfo(): { model: string; maxTokens: number; pricing: { input: number; output: number } } {
    return {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      pricing: MODEL_PRICING[this.config.model] || { input: 0, output: 0 },
    };
  }

  /**
   * List available models
   */
  static getAvailableModels(): GeminiModel[] {
    return [
      GeminiModel.GEMINI_2_5_FLASH,
      GeminiModel.GEMINI_3_FLASH,
      GeminiModel.GEMINI_3_5_FLASH,
      GeminiModel.GEMINI_3_1_PRO,
    ];
  }

  /**
   * Get config
   */
  getConfig(): GeminiConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const geminiClient = new GeminiClient();
