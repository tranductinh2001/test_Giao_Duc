/**
 * Unit Tests for AI Review Engine
 *
 * Phase 4: Test PromptBuilder, GeminiClient, ReviewQueue, JSONValidator, AIReviewEngine
 */

// Simple test framework
function describe(name: string, fn: () => void) {
  console.log(`\n📋 ${name}`);
  try {
    fn();
    console.log(`  ✅ Passed`);
  } catch (e: any) {
    console.log(`  ❌ Failed: ${e.message}`);
  }
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) throw new Error(`Expected ${expected} but got ${actual}`);
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (actual <= expected) throw new Error(`Expected ${actual} > ${expected}`);
    },
    toBeLessThan(expected: number) {
      if (actual >= expected) throw new Error(`Expected ${actual} < ${expected}`);
    },
    toContain(item: any) {
      if (!actual.includes(item)) throw new Error(`Expected ${JSON.stringify(actual)} to contain ${item}`);
    },
    toHaveLength(len: number) {
      if (actual.length !== len) throw new Error(`Expected length ${len} but got ${actual.length}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy value but got ${actual}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy value but got ${actual}`);
    },
  };
}

// ============================================
// PROMPT BUILDER TESTS
// ============================================

import { PromptBuilder } from "../services/PromptBuilder";
import type { ActivityPayload } from "../types";

describe("PromptBuilder", () => {
  const promptBuilder = new PromptBuilder();

  it("should build prompt from payload", () => {
    const payload: ActivityPayload = {
      activityId: "act-001",
      activityCode: "WARM_UP_001",
      activityTitle: "Warm Up Activity",
      sectionName: "Warm Up",
      content: {
        paragraphs: ["First paragraph", "Second paragraph"],
        knowledge: "Test knowledge",
        teachingIntent: "Test intent",
      },
      rules: [
        {
          code: "R001",
          name: "Test Rule",
          description: "Test description",
          category: "CONTENT",
          severity: "ERROR",
          priority: 10,
        },
      ],
      metadata: {
        confidence: 85,
        matchedBy: ["KEYWORD", "ALIAS"],
      },
    };

    const prompt = promptBuilder.buildPrompt(payload);
    expect(prompt).toContain("WARM_UP_001");
    expect(prompt).toContain("Warm Up Activity");
    expect(prompt).toContain("First paragraph");
    expect(prompt).toContain("Test Rule");
  });

  it("should build system prompt", () => {
    const systemPrompt = promptBuilder.buildSystemPrompt();
    expect(systemPrompt).toContain("chuyên gia");
    expect(systemPrompt).toContain("đánh giá");
  });

  it("should respect language option", () => {
    const builder = new PromptBuilder({ language: "en" });
    const systemPrompt = builder.buildSystemPrompt();
    expect(systemPrompt).toContain("expert");
  });
});

// ============================================
// JSON VALIDATOR TESTS
// ============================================

import { JSONValidator } from "../services/JSONValidator";

describe("JSONValidator", () => {
  const validator = new JSONValidator();

  it("should validate valid response", () => {
    const validResponse = JSON.stringify({
      activityId: "act-001",
      score: 85,
      passed: true,
      comments: "Good job",
      issues: [
        {
          ruleId: "R001",
          title: "Test Issue",
          description: "Test description",
          reason: "Test reason",
          severity: "WARNING",
        },
      ],
    });

    const result = validator.validate(validResponse, "act-001");
    expect(result.valid).toBe(true);
    expect(result.result).toBeTruthy();
    expect(result.result?.score).toBe(85);
  });

  it("should reject invalid JSON", () => {
    const invalidResponse = "not json at all";
    const result = validator.validate(invalidResponse, "act-001");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject missing required fields", () => {
    const missingFields = JSON.stringify({
      activityId: "act-001",
      // missing score and passed
    });

    const result = validator.validate(missingFields, "act-001");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing required field: score");
  });

  it("should validate score range", () => {
    const outOfRange = JSON.stringify({
      activityId: "act-001",
      score: 150,
      passed: true,
      issues: [],
    });

    const result = validator.validate(outOfRange, "act-001");
    expect(result.valid).toBe(false);
  });
});

// ============================================
// REVIEW QUEUE TESTS
// ============================================

import { ReviewQueue } from "../services/ReviewQueue";

describe("ReviewQueue", () => {
  it("should enqueue jobs", () => {
    const queue = new ReviewQueue();

    const mockJob = {
      jobId: "job-1",
      sessionId: "session-1",
      activityId: "act-1",
      payload: {} as any,
      status: "PENDING" as any,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
    };

    queue.enqueue(mockJob);
    expect(queue.getQueueLength()).toBe(1);
  });

  it("should get job by ID", () => {
    const queue = new ReviewQueue();

    const mockJob = {
      jobId: "job-2",
      sessionId: "session-1",
      activityId: "act-2",
      payload: {} as any,
      status: "PENDING" as any,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
    };

    queue.enqueue(mockJob);
    const job = queue.getJob("job-2");
    expect(job).toBeTruthy();
    expect(job?.jobId).toBe("job-2");
  });

  it("should get statistics", () => {
    const queue = new ReviewQueue();

    for (let i = 0; i < 5; i++) {
      queue.enqueue({
        jobId: `job-${i}`,
        sessionId: "session-1",
        activityId: `act-${i}`,
        payload: {} as any,
        status: "PENDING" as any,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
      });
    }

    const stats = queue.getStatistics();
    expect(stats.total).toBe(5);
    expect(stats.queued).toBe(5);
  });

  it("should cancel job", () => {
    const queue = new ReviewQueue();

    queue.enqueue({
      jobId: "job-cancel",
      sessionId: "session-1",
      activityId: "act-1",
      payload: {} as any,
      status: "PENDING" as any,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
    });

    const cancelled = queue.cancelJob("job-cancel");
    expect(cancelled).toBe(true);
  });
});

// ============================================
// GEMINI CLIENT TESTS
// ============================================

import { GeminiClient } from "../services/GeminiClient";

describe("GeminiClient", () => {
  it("should handle missing API key", async () => {
    const client = new GeminiClient({ apiKey: undefined });
    const result = await client.generateContent("test prompt");

    expect(result.success).toBe(false);
    expect(result.error).toContain("API key");
  });

  it("should estimate tokens", () => {
    const client = new GeminiClient();
    const tokens = client.estimateTokens("Hello world test");

    expect(tokens).toBeGreaterThan(0);
  });

  it("should calculate cost", () => {
    const client = new GeminiClient();
    const cost = client.calculateCost(1000, 500);

    expect(cost).toBeGreaterThan(0);
  });

  it("should get available models", () => {
    const models = GeminiClient.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
  });
});

// ============================================
// ENGINE CONFIG TESTS
// ============================================

describe("AI Review Engine Config", () => {
  it("should have correct default values", () => {
    const { DEFAULT_REVIEW_ENGINE_CONFIG } = require("../types");
    expect(DEFAULT_REVIEW_ENGINE_CONFIG.gemini.model).toBe("gemini-3.5-flash");
    expect(DEFAULT_REVIEW_ENGINE_CONFIG.queue.maxConcurrent).toBe(3);
    expect(DEFAULT_REVIEW_ENGINE_CONFIG.score.excellentThreshold).toBe(90);
    expect(DEFAULT_REVIEW_ENGINE_CONFIG.enableCache).toBe(true);
  });
});

console.log("\n✅ All tests completed\n");
