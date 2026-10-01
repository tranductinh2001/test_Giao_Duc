/**
 * Chunk Service
 *
 * Phase 3: Splits long content into semantic chunks
 */

import type {
  ActivityReviewContext,
  ActivityChunk,
  ReviewContextConfig,
  RulePayload,
} from "../types";

export class ChunkService {
  private config: ReviewContextConfig;

  constructor(config: Partial<ReviewContextConfig> = {}) {
    this.config = {
      maxTokensPerChunk: config.maxTokensPerChunk ?? 4000,
      maxCharactersPerChunk: config.maxCharactersPerChunk ?? 15000,
      chunkOverlap: config.chunkOverlap ?? 200,
      minChunkSize: config.minChunkSize ?? 500,
      confidenceThresholdHigh: config.confidenceThresholdHigh ?? 80,
      confidenceThresholdMedium: config.confidenceThresholdMedium ?? 50,
      enableOptimization: config.enableOptimization ?? true,
      enableChunking: config.enableChunking ?? true,
    };
  }

  /**
   * Chunk a single activity review context
   */
  chunk(context: ActivityReviewContext): ActivityChunk[] {
    const paragraphs = context.paragraphs.map((p) => p.text);

    // If content is small enough, return single chunk
    if (!this.config.enableChunking || this.shouldChunk(paragraphs)) {
      return [this.createChunk(context, paragraphs, 0, 1)];
    }

    // Split into chunks
    return this.splitIntoChunks(context, paragraphs);
  }

  /**
   * Check if content needs chunking
   */
  private shouldChunk(paragraphs: string[]): boolean {
    const totalChars = paragraphs.reduce((sum, p) => sum + p.length, 0);
    return totalChars <= this.config.maxCharactersPerChunk;
  }

  /**
   * Split paragraphs into chunks
   */
  private splitIntoChunks(
    context: ActivityReviewContext,
    paragraphs: string[]
  ): ActivityChunk[] {
    const chunks: ActivityChunk[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;
    let chunkIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paraSize = paragraph.length;

      // If single paragraph exceeds max, we need to split it
      if (paraSize > this.config.maxCharactersPerChunk) {
        // First, flush current chunk if not empty
        if (currentChunk.length > 0) {
          chunks.push(this.createChunk(context, currentChunk, chunkIndex++, paragraphs.length));
          currentChunk = [];
          currentSize = 0;
        }

        // Split the long paragraph
        const splitParagraphs = this.splitLongParagraph(paragraph);
        for (const splitPara of splitParagraphs) {
          if (currentSize + splitPara.length > this.config.maxCharactersPerChunk && currentChunk.length > 0) {
            chunks.push(this.createChunk(context, currentChunk, chunkIndex++, paragraphs.length));
            // Keep overlap if enabled
            currentChunk = this.config.chunkOverlap > 0 ? currentChunk.slice(-2) : [];
            currentSize = currentChunk.reduce((sum, p) => sum + p.length, 0);
          }
          currentChunk.push(splitPara);
          currentSize += splitPara.length;
        }
      } else {
        // Check if adding this paragraph would exceed limit
        if (currentSize + paraSize > this.config.maxCharactersPerChunk && currentChunk.length > 0) {
          chunks.push(this.createChunk(context, currentChunk, chunkIndex++, paragraphs.length));
          // Keep overlap
          currentChunk = this.config.chunkOverlap > 0 ? currentChunk.slice(-2) : [];
          currentSize = currentChunk.reduce((sum, p) => sum + p.length, 0);
        }

        currentChunk.push(paragraph);
        currentSize += paraSize;
      }
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(context, currentChunk, chunkIndex, paragraphs.length));
    }

    // Update totalChunks for all
    const totalChunks = chunks.length;
    return chunks.map((chunk) => ({
      ...chunk,
      totalChunks,
    }));
  }

  /**
   * Split a long paragraph at sentence boundaries
   */
  private splitLongParagraph(paragraph: string): string[] {
    // Try to split at sentence boundaries
    const sentences = paragraph.split(/(?<=[.!?])\s+/);

    if (sentences.length <= 1) {
      // No sentence boundaries found, split by words
      return this.splitByWords(paragraph);
    }

    return sentences.filter((s) => s.trim().length > 0);
  }

  /**
   * Split by words if no sentence boundaries
   */
  private splitByWords(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let current = "";
    let currentSize = 0;

    const targetSize = Math.floor(this.config.maxCharactersPerChunk / 2);

    for (const word of words) {
      if (currentSize + word.length + 1 > targetSize && current.length > 0) {
        chunks.push(current);
        current = word;
        currentSize = word.length;
      } else {
        current += (current.length > 0 ? " " : "") + word;
        currentSize += word.length + 1;
      }
    }

    if (current.length > 0) {
      chunks.push(current);
    }

    return chunks;
  }

  /**
   * Create a chunk from paragraphs
   */
  private createChunk(
    context: ActivityReviewContext,
    paragraphs: string[],
    chunkIndex: number,
    totalParagraphs: number
  ): ActivityChunk {
    return {
      chunkIndex,
      totalChunks: 1, // Will be updated
      paragraphs,
      rules: this.convertRules(context.rules),
      metadata: {
        confidence: context.confidence,
        matchedBy: context.matchedBy,
      },
    };
  }

  /**
   * Convert rules to rule payloads
   */
  private convertRules(rules: { code: string; name: string; description: string; category: string; severity: string; priority: number; message?: string; suggestions?: string[] }[]): RulePayload[] {
    return rules.map((rule) => ({
      code: rule.code,
      name: rule.name,
      description: rule.description,
      category: rule.category as any,
      severity: rule.severity as any,
      priority: rule.priority,
      message: rule.message,
      suggestions: rule.suggestions,
    }));
  }

  /**
   * Calculate estimated tokens (rough estimate: 1 token ≈ 4 characters)
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate total tokens for chunks
   */
  calculateChunkTokens(chunk: ActivityChunk): number {
    const text = chunk.paragraphs.join("\n\n");
    return this.estimateTokens(text);
  }
}

export const chunkService = new ChunkService();
