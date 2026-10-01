/**
 * Unit Tests for Review Context Builder
 *
 * Phase 3: Test ContextOptimizer, ChunkService, PayloadBuilder, StatisticsService
 */

// Simple test framework
function describe(name: string, fn: () => void) {
  console.log(`\n📋 ${name}`);
  try {
    fn();
    console.log(`  ✅ Passed`);
  } catch (e) {
    console.log(`  ❌ Failed: ${e.message}`);
  }
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
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
// CONTEXT OPTIMIZER TESTS
// ============================================

import { ContextOptimizer } from "../services/ContextOptimizer";
import type { ActivityReviewContext, DocumentParagraph } from "../types";

describe("ContextOptimizer", () => {
  const optimizer = new ContextOptimizer();

  it("should remove empty paragraphs", () => {
    const context: ActivityReviewContext = {
      activityId: "1",
      activityCode: "ACT_001",
      activityTitle: "Test Activity",
      sectionCode: "WARM_UP",
      sectionName: "Warm Up",
      paragraphs: [
        { text: "" },
        { text: "  " },
        { text: "Valid paragraph" },
        { text: "" },
      ],
      rules: [],
      confidence: 80,
      matchedBy: ["KEYWORD"],
    };

    const result = optimizer.optimize(context);
    expect(result.paragraphs).toHaveLength(1);
    expect(result.paragraphs[0].text).toBe("Valid paragraph");
  });

  it("should remove duplicate paragraphs", () => {
    const context: ActivityReviewContext = {
      activityId: "1",
      activityCode: "ACT_001",
      activityTitle: "Test Activity",
      sectionCode: "WARM_UP",
      sectionName: "Warm Up",
      paragraphs: [
        { text: "Hello world" },
        { text: "Hello world" },
        { text: "Different text" },
      ],
      rules: [],
      confidence: 80,
      matchedBy: ["KEYWORD"],
    };

    const result = optimizer.optimize(context);
    expect(result.paragraphs).toHaveLength(2);
  });

  it("should sort rules by priority", () => {
    const context: ActivityReviewContext = {
      activityId: "1",
      activityCode: "ACT_001",
      activityTitle: "Test Activity",
      sectionCode: "WARM_UP",
      sectionName: "Warm Up",
      paragraphs: [{ text: "Test" }],
      rules: [
        { id: "1", code: "R1", name: "Rule 1", description: "", category: "CONTENT" as any, severity: "ERROR" as any, priority: 1, checkType: "FORMAT" as any },
        { id: "2", code: "R2", name: "Rule 2", description: "", category: "CONTENT" as any, severity: "ERROR" as any, priority: 10, checkType: "FORMAT" as any },
        { id: "3", code: "R3", name: "Rule 3", description: "", category: "CONTENT" as any, severity: "ERROR" as any, priority: 5, checkType: "FORMAT" as any },
      ],
      confidence: 80,
      matchedBy: ["KEYWORD"],
    };

    const result = optimizer.optimize(context);
    expect(result.rules[0].priority).toBe(10);
    expect(result.rules[1].priority).toBe(5);
    expect(result.rules[2].priority).toBe(1);
  });

  it("should clean empty knowledge fields", () => {
    const context: ActivityReviewContext = {
      activityId: "1",
      activityCode: "ACT_001",
      activityTitle: "Test",
      sectionCode: "WARM_UP",
      sectionName: "Warm Up",
      paragraphs: [{ text: "Test" }],
      knowledge: "",
      teachingIntent: "   ",
      expectedTeacherActions: "Action",
      rules: [],
      confidence: 80,
      matchedBy: [],
    };

    const result = optimizer.optimize(context);
    expect(result.knowledge).toBeFalsy();
    expect(result.teachingIntent).toBeFalsy();
    expect(result.expectedTeacherActions).toBeTruthy();
  });
});

// ============================================
// CHUNK SERVICE TESTS
// ============================================

import { ChunkService } from "../services/ChunkService";

describe("ChunkService", () => {
  const chunkService = new ChunkService({
    maxCharactersPerChunk: 100,
    enableChunking: true,
  });

  it("should not chunk small content", () => {
    const context: ActivityReviewContext = {
      activityId: "1",
      activityCode: "ACT_001",
      activityTitle: "Test",
      sectionCode: "WARM_UP",
      sectionName: "Warm Up",
      paragraphs: [
        { text: "Short paragraph" },
        { text: "Another short one" },
      ],
      rules: [],
      confidence: 80,
      matchedBy: [],
    };

    const chunks = chunkService.chunk(context);
    expect(chunks).toHaveLength(1);
  });

  it("should chunk large content", () => {
    const context: ActivityReviewContext = {
      activityId: "1",
      activityCode: "ACT_001",
      activityTitle: "Test",
      sectionCode: "WARM_UP",
      sectionName: "Warm Up",
      paragraphs: [
        { text: "A".repeat(60) },
        { text: "B".repeat(60) },
      ],
      rules: [],
      confidence: 80,
      matchedBy: [],
    };

    const chunks = chunkService.chunk(context);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should estimate tokens correctly", () => {
    const text = "Hello world"; // 11 chars
    const tokens = chunkService.estimateTokens(text);
    expect(tokens).toBe(3); // ceil(11/4)
  });
});

// ============================================
// STATISTICS SERVICE TESTS
// ============================================

import { StatisticsService } from "../services/StatisticsService";

describe("StatisticsService", () => {
  const statsService = new StatisticsService();

  it("should estimate tokens", () => {
    const text = "Hello world test";
    const tokens = statsService.estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
  });

  it("should calculate activity payload stats", () => {
    const activity = {
      activityId: "1",
      activityCode: "ACT_001",
      activityTitle: "Test",
      sectionName: "Warm Up",
      chunks: [
        {
          chunkIndex: 0,
          totalChunks: 1,
          paragraphs: ["Para 1", "Para 2"],
          rules: [],
          metadata: { confidence: 80, matchedBy: ["KEYWORD"] },
        },
      ],
      originalParagraphs: ["Para 1", "Para 2"],
      estimatedTokens: 100,
      characterCount: 20,
    };

    const result = statsService.calculateActivityPayloadStats(activity);
    expect(result.activityId).toBe("1");
    expect(result.chunkCount).toBe(1);
    expect(result.isChunked).toBe(false);
  });

  it("should check threshold", () => {
    const activities = [
      { activityId: "1", estimatedTokens: 3000, characterCount: 1000, chunks: [] as any },
      { activityId: "2", estimatedTokens: 3000, characterCount: 1000, chunks: [] as any },
    ];

    expect(statsService.exceedsThreshold(activities, 5000)).toBe(true);
    expect(statsService.exceedsThreshold(activities, 7000)).toBe(false);
  });
});

// ============================================
// CONFIG TESTS
// ============================================

describe("Review Context Config", () => {
  it("should have correct default values", () => {
    const { DEFAULT_REVIEW_CONTEXT_CONFIG } = require("../types");
    expect(DEFAULT_REVIEW_CONTEXT_CONFIG.maxTokensPerChunk).toBe(4000);
    expect(DEFAULT_REVIEW_CONTEXT_CONFIG.maxCharactersPerChunk).toBe(15000);
    expect(DEFAULT_REVIEW_CONTEXT_CONFIG.confidenceThresholdHigh).toBe(80);
    expect(DEFAULT_REVIEW_CONTEXT_CONFIG.confidenceThresholdMedium).toBe(50);
  });
});

console.log("\n✅ All tests completed\n");
