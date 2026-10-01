/**
 * Unified BeekOne AI Client
 *
 * Centralized AI provider for all AI operations.
 * Replaces direct Gemini API calls with BeekOne adapter.
 *
 * Features:
 * - Single AI provider (BeekOne) for all operations
 * - Detailed logging (provider, model, tokens, cost, latency)
 * - Structured business errors (never throws Forbidden)
 * - Unified interface for section detection, review, and fixes
 */

import { Buffer } from "buffer";

// BeekOne API Configuration
const BEE_API_KEY = process.env.BEE_API_KEY || process.env.BEEKNOEE_API_KEY || "";
const BEE_BASE_URL = process.env.BEE_BASE_URL || process.env.BEEKNOEE_BASE_URL || "https://platform.beeknoee.com";
const DEFAULT_MODEL = process.env.AI_MODEL || "gemini-3.1-flash-lite";

export interface AIRequestMetrics {
  provider: string;
  model: string;
  requestSize: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
}

export interface AIResult<T = string> {
  success: boolean;
  data?: T;
  error?: string;
  metrics?: AIRequestMetrics;
}

/**
 * Unified BeekOne AI Client
 */
export class BeekOneAIClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(options?: { apiKey?: string; baseUrl?: string; model?: string }) {
    this.apiKey = options?.apiKey || BEE_API_KEY;
    this.baseUrl = options?.baseUrl || BEE_BASE_URL;
    this.defaultModel = options?.model || DEFAULT_MODEL;
  }

  /**
   * Check if BeekOne is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { name: string; model: string; available: boolean } {
    return {
      name: "BeekOne",
      model: this.defaultModel,
      available: this.isAvailable(),
    };
  }

  /**
   * Generate text completion
   */
  async complete(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<AIResult<string>> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    // Validate API key
    if (!this.apiKey) {
      return {
        success: false,
        error: "AI provider unavailable. Please try again later.",
      };
    }

    try {
      const url = `${this.baseUrl}/chat/completions`;
      const requestBody = {
        model,
        messages: [
          ...(options?.systemPrompt
            ? [{ role: "system" as const, content: options.systemPrompt }]
            : []),
          { role: "user" as const, content: prompt },
        ],
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 8192,
        stream: false,
      };

      const requestSize = Buffer.byteLength(JSON.stringify(requestBody), "utf8");

      console.log(`[BeekOneAI] Request - Model: ${model}, Size: ${requestSize} bytes`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BeekOneAI] API Error: ${response.status} - ${errorText}`);

        // Return structured business error
        return {
          success: false,
          error: "AI provider unavailable. Please try again later.",
          metrics: {
            provider: "BeekOne",
            model,
            requestSize,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCost: 0,
            latencyMs,
          },
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      const usage = data.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || Math.ceil(content.length / 4);

      // Calculate cost (Gemini 2.5 Flash Lite pricing)
      const estimatedCost = (promptTokens * 0.0000003) + (completionTokens * 0.0000012);

      console.log(`[BeekOneAI] Response - Tokens: prompt=${promptTokens}, completion=${completionTokens}, Cost: $${estimatedCost.toFixed(6)}, Latency: ${latencyMs}ms`);

      return {
        success: true,
        data: content,
        metrics: {
          provider: "BeekOne",
          model,
          requestSize,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost,
          latencyMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error(`[BeekOneAI] Error: ${error}`);

      return {
        success: false,
        error: "AI provider unavailable. Please try again later.",
        metrics: {
          provider: "BeekOne",
          model,
          requestSize: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          latencyMs,
        },
      };
    }
  }

  /**
   * Analyze image with vision capabilities
   */
  async analyzeImage(
    imageBuffer: Buffer,
    prompt: string,
    mimeType: string = "image/png",
    options?: {
      model?: string;
      temperature?: number;
    }
  ): Promise<AIResult<any>> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    if (!this.apiKey) {
      return {
        success: false,
        error: "AI provider unavailable. Please try again later.",
      };
    }

    try {
      const url = `${this.baseUrl}/chat/completions`;
      const base64Data = imageBuffer.toString("base64");

      const requestBody = {
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "file",
                file: {
                  url: `data:${mimeType};base64,${base64Data}`,
                  mime_type: mimeType,
                },
              },
            ],
          },
        ],
        temperature: options?.temperature ?? 0.1,
        max_tokens: 32000,
      };

      const requestSize = Buffer.byteLength(JSON.stringify(requestBody), "utf8");

      console.log(`[BeekOneAI] Vision Request - Model: ${model}, Size: ${requestSize} bytes`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BeekOneAI] Vision API Error: ${response.status} - ${errorText}`);

        return {
          success: false,
          error: "AI provider unavailable. Please try again later.",
          metrics: {
            provider: "BeekOne",
            model,
            requestSize,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            estimatedCost: 0,
            latencyMs,
          },
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Try to parse JSON if present
      let parsedData: any = content;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Keep raw content
      }

      const usage = data.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || Math.ceil(content.length / 4);
      const estimatedCost = (promptTokens * 0.0000003) + (completionTokens * 0.0000012);

      console.log(`[BeekOneAI] Vision Response - Tokens: ${totalTokens}, Cost: $${estimatedCost.toFixed(6)}, Latency: ${latencyMs}ms`);

      return {
        success: true,
        data: parsedData,
        metrics: {
          provider: "BeekOne",
          model,
          requestSize,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost,
          latencyMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error(`[BeekOneAI] Vision Error: ${error}`);

      return {
        success: false,
        error: "AI provider unavailable. Please try again later.",
        metrics: {
          provider: "BeekOne",
          model,
          requestSize: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          latencyMs,
        },
      };
    }
  }
}

// Export singleton
export const beekOneAIClient = new BeekOneAIClient();
