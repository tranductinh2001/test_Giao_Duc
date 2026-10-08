// BeekOne AI Client

import { AIConfig, AIRequest, AIResponse, AIResult, AIMessage } from '@/types';
import { getAIConfig } from '@/lib/config';

const getInitialConfig = (): Partial<AIConfig> => {
  const cfg = getAIConfig();
  return {
    provider: 'beeknoee',
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    visionModel: cfg.visionModel,
    timeout: cfg.timeout,
    temperature: 0.2,
    maxTokens: 8192,
  };
};

export class BeekOneClient {
  private config: AIConfig;
  private apiKey: string;

  constructor(apiKey: string, config?: Partial<AIConfig>) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.config = { ...getInitialConfig(), ...config, apiKey } as AIConfig;
  }

  async chat(
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<AIResult<string>> {
    const messages: AIMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const request: AIRequest = {
      model: this.config.model,
      messages,
      temperature: options?.temperature ?? this.config.temperature,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
    };

    return this.executeRequest(request);
  }

  async chatWithImage(
    imageBase64: string,
    prompt: string,
    mimeType: string = 'image/png',
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<AIResult<string>> {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ];

    const request: AIRequest = {
      model: this.config.visionModel,
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 32000,
    };

    return this.executeRequest(request);
  }

  private async executeRequest(request: AIRequest): Promise<AIResult<string>> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const retryable = response.status === 429 || response.status >= 500;

          if (retryable && attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000;
            await this.sleep(delay);
            continue;
          }

          return {
            success: false,
            error: {
              type: 'API_ERROR',
              message: `API Error: ${response.status} - ${errorText}`,
              statusCode: response.status,
              retryable,
            },
          };
        }

        const data: AIResponse = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
          return {
            success: false,
            error: {
              type: 'PARSE_ERROR',
              message: 'No content in AI response',
              retryable: false,
            },
          };
        }

        return { success: true, data: content };
      } catch (error) {
        lastError = error as Error;

        if (error instanceof DOMException && error.name === 'AbortError') {
          return {
            success: false,
            error: {
              type: 'TIMEOUT',
              message: `Request timeout after ${this.config.timeout}ms`,
              retryable: true,
            },
          };
        }

        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: {
        type: 'API_ERROR',
        message: lastError?.message || 'Unknown error',
        retryable: true,
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getConfig(): Readonly<AIConfig> {
    return { ...this.config };
  }
}

// Singleton instance
let clientInstance: BeekOneClient | null = null;

export function getBeekOneClient(): BeekOneClient {
  if (!clientInstance) {
    const cfg = getAIConfig();
    const apiKey = cfg.apiKey;
    if (!apiKey) {
      throw new Error('BEE_API_KEY (hoặc BEEKNOEE_API_KEY, GEMINI_API_KEY) environment variable is not set');
    }
    clientInstance = new BeekOneClient(apiKey);
  }
  return clientInstance;
}

export function resetBeekOneClient(): void {
  clientInstance = null;
}
