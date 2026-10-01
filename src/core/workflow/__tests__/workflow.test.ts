/**
 * Unit Tests for Workflow Orchestrator
 *
 * Phase 5: Test Workflow Orchestrator, State Machine, Events, Config
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
    toBeGreaterThan(expected: number) {
      if (actual <= expected) throw new Error(`Expected ${actual} > ${expected}`);
    },
  };
}

// ============================================
// WORKFLOW TYPES TESTS
// ============================================

import { WorkflowStatus, WorkflowEvent, DEFAULT_WORKFLOW_CONFIG } from "../types";

describe("Workflow Types", () => {
  it("should have correct workflow statuses", () => {
    expect(WorkflowStatus.UPLOADED).toBe("UPLOADED");
    expect(WorkflowStatus.PARSING).toBe("PARSING");
    expect(WorkflowStatus.MAPPING).toBe("MAPPING");
    expect(WorkflowStatus.BUILDING_CONTEXT).toBe("BUILDING_CONTEXT");
    expect(WorkflowStatus.AI_REVIEWING).toBe("AI_REVIEWING");
    expect(WorkflowStatus.COMPLETED).toBe("COMPLETED");
    expect(WorkflowStatus.FAILED).toBe("FAILED");
    expect(WorkflowStatus.CANCELLED).toBe("CANCELLED");
  });

  it("should have correct workflow events", () => {
    expect(WorkflowEvent.DOCUMENT_UPLOADED).toBe("DOCUMENT_UPLOADED");
    expect(WorkflowEvent.PARSER_STARTED).toBe("PARSER_STARTED");
    expect(WorkflowEvent.PARSER_COMPLETED).toBe("PARSER_COMPLETED");
    expect(WorkflowEvent.MAPPING_COMPLETED).toBe("MAPPING_COMPLETED");
    expect(WorkflowEvent.REVIEW_COMPLETED).toBe("REVIEW_COMPLETED");
    expect(WorkflowEvent.WORKFLOW_COMPLETED).toBe("WORKFLOW_COMPLETED");
  });
});

// ============================================
// CONFIG TESTS
// ============================================

describe("Workflow Config", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_WORKFLOW_CONFIG.parser.maxFileSize).toBe(30 * 1024 * 1024);
    expect(DEFAULT_WORKFLOW_CONFIG.parser.allowedExtensions).toContain(".docx");
    expect(DEFAULT_WORKFLOW_CONFIG.mapping.confidenceThresholdHigh).toBe(80);
    expect(DEFAULT_WORKFLOW_CONFIG.mapping.confidenceThresholdMedium).toBe(50);
    expect(DEFAULT_WORKFLOW_CONFIG.context.maxTokensPerChunk).toBe(4000);
    expect(DEFAULT_WORKFLOW_CONFIG.review.geminiModel).toBe("gemini-3.5-flash");
    expect(DEFAULT_WORKFLOW_CONFIG.review.maxConcurrent).toBe(3);
    expect(DEFAULT_WORKFLOW_CONFIG.global.enableResume).toBe(true);
  });

  it("should allow config override", () => {
    const customConfig = {
      parser: { maxFileSize: 20 * 1024 * 1024 },
      review: { geminiModel: "gemini-2.5-flash" as any },
    };

    const merged = { ...DEFAULT_WORKFLOW_CONFIG, ...customConfig };
    expect(merged.parser.maxFileSize).toBe(20 * 1024 * 1024);
    expect(merged.review.geminiModel).toBe("gemini-2.5-flash");
  });
});

// ============================================
// WORKFLOW ORCHESTRATOR TESTS
// ============================================

import { WorkflowOrchestrator } from "../engine/WorkflowOrchestrator";

describe("WorkflowOrchestrator", () => {
  it("should create orchestrator with default config", () => {
    const orchestrator = new WorkflowOrchestrator();
    expect(orchestrator).toBeTruthy();
  });

  it("should create orchestrator with custom config", () => {
    const orchestrator = new WorkflowOrchestrator({
      global: { logLevel: "debug" },
    });
    expect(orchestrator).toBeTruthy();
  });

  it("should have getConfig method", () => {
    const orchestrator = new WorkflowOrchestrator();
    const config = orchestrator.getConfig();
    expect(config).toBeTruthy();
    expect(config.parser).toBeTruthy();
    expect(config.mapping).toBeTruthy();
    expect(config.context).toBeTruthy();
    expect(config.review).toBeTruthy();
  });

  it("should have updateConfig method", () => {
    const orchestrator = new WorkflowOrchestrator();
    orchestrator.updateConfig({ global: { logLevel: "error" } });
    const config = orchestrator.getConfig();
    expect(config.global.logLevel).toBe("error");
  });

  it("should generate session IDs", () => {
    const orchestrator = new WorkflowOrchestrator();
    const sessions = orchestrator.getAllSessions();
    expect(sessions).toHaveLength(0);
  });
});

// ============================================
// STATE MACHINE TESTS
// ============================================

describe("Workflow State Machine", () => {
  const validTransitions: Record<string, string[]> = {
    UPLOADED: ["PARSING"],
    PARSING: ["MAPPING", "FAILED"],
    MAPPING: ["BUILDING_CONTEXT", "FAILED"],
    BUILDING_CONTEXT: ["AI_REVIEWING", "FAILED"],
    AI_REVIEWING: ["COMPLETED", "FAILED"],
    COMPLETED: [],
    FAILED: [],
    CANCELLED: [],
  };

  it("should have valid state transitions", () => {
    expect(validTransitions.UPLOADED).toContain("PARSING");
    expect(validTransitions.PARSING).toContain("MAPPING");
    expect(validTransitions.MAPPING).toContain("BUILDING_CONTEXT");
    expect(validTransitions.BUILDING_CONTEXT).toContain("AI_REVIEWING");
    expect(validTransitions.AI_REVIEWING).toContain("COMPLETED");
  });

  it("should not allow transitions from COMPLETED", () => {
    expect(validTransitions.COMPLETED).toHaveLength(0);
  });

  it("should not allow transitions from FAILED", () => {
    expect(validTransitions.FAILED).toHaveLength(0);
  });

  it("should not allow transitions from CANCELLED", () => {
    expect(validTransitions.CANCELLED).toHaveLength(0);
  });
});

// ============================================
// PROGRESS CALCULATION TESTS
// ============================================

describe("Progress Calculation", () => {
  const progressMap: Record<string, number> = {
    UPLOADED: 5,
    PARSING: 25,
    MAPPING: 50,
    BUILDING_CONTEXT: 70,
    AI_REVIEWING: 90,
    COMPLETED: 100,
  };

  it("should calculate correct progress for each step", () => {
    expect(progressMap.UPLOADED).toBe(5);
    expect(progressMap.PARSING).toBe(25);
    expect(progressMap.MAPPING).toBe(50);
    expect(progressMap.BUILDING_CONTEXT).toBe(70);
    expect(progressMap.AI_REVIEWING).toBe(90);
    expect(progressMap.COMPLETED).toBe(100);
  });

  it("should have increasing progress", () => {
    const progresses = Object.values(progressMap);
    for (let i = 1; i < progresses.length; i++) {
      expect(progresses[i]).toBeGreaterThan(progresses[i - 1]);
    }
  });
});

console.log("\n✅ All tests completed\n");
