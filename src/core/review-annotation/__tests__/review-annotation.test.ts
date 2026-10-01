/**
 * Unit Tests for Review Annotation Engine
 *
 * Phase 6: Test Annotation Engine, Filtering, Grouping, Navigation
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
    toBeLessThan(expected: number) {
      if (actual >= expected) throw new Error(`Expected ${actual} < ${expected}`);
    },
    toContainKey(key: string) {
      if (!(key in actual)) throw new Error(`Expected object to contain key ${key}`);
    },
  };
}

// ============================================
// ANNOTATION TYPES TESTS
// ============================================

import {
  AnnotationSeverity,
  AnnotationStatus,
  AnnotationFilter,
  AnnotationGroupBy,
  DEFAULT_ANNOTATION_CONFIG,
} from "../types.js";

describe("Annotation Types", () => {
  it("should have correct severity values", () => {
    expect(AnnotationSeverity.CRITICAL).toBe("CRITICAL");
    expect(AnnotationSeverity.HIGH).toBe("HIGH");
    expect(AnnotationSeverity.MEDIUM).toBe("MEDIUM");
    expect(AnnotationSeverity.LOW).toBe("LOW");
  });

  it("should have correct status values", () => {
    expect(AnnotationStatus.OPEN).toBe("OPEN");
    expect(AnnotationStatus.REVIEWED).toBe("REVIEWED");
    expect(AnnotationStatus.DISMISSED).toBe("DISMISSED");
    expect(AnnotationStatus.FIXED).toBe("FIXED");
  });

  it("should have correct filter values", () => {
    expect(AnnotationFilter.ALL).toBe("ALL");
    expect(AnnotationFilter.CRITICAL).toBe("CRITICAL");
    expect(AnnotationFilter.HIGH).toBe("HIGH");
    expect(AnnotationFilter.MEDIUM).toBe("MEDIUM");
    expect(AnnotationFilter.LOW).toBe("LOW");
    expect(AnnotationFilter.PASSED).toBe("PASSED");
    expect(AnnotationFilter.UNKNOWN).toBe("UNKNOWN");
  });

  it("should have correct group by values", () => {
    expect(AnnotationGroupBy.SECTION).toBe("SECTION");
    expect(AnnotationGroupBy.ACTIVITY).toBe("ACTIVITY");
    expect(AnnotationGroupBy.SEVERITY).toBe("SEVERITY");
    expect(AnnotationGroupBy.RULE).toBe("RULE");
  });
});

// ============================================
// CONFIG TESTS
// ============================================

describe("Annotation Config", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_ANNOTATION_CONFIG.enableGrouping).toBe(true);
    expect(DEFAULT_ANNOTATION_CONFIG.enableStatistics).toBe(true);
    expect(DEFAULT_ANNOTATION_CONFIG.enableNavigation).toBe(true);
    expect(DEFAULT_ANNOTATION_CONFIG.defaultGroupBy).toBe(AnnotationGroupBy.SECTION);
    expect(DEFAULT_ANNOTATION_CONFIG.defaultFilter).toBe(AnnotationFilter.ALL);
    expect(DEFAULT_ANNOTATION_CONFIG.maxAnnotations).toBe(1000);
  });

  it("should allow config override", () => {
    const customConfig = {
      enableGrouping: false,
      maxAnnotations: 500,
    };

    const merged = { ...DEFAULT_ANNOTATION_CONFIG, ...customConfig };
    expect(merged.enableGrouping).toBe(false);
    expect(merged.maxAnnotations).toBe(500);
  });
});

// ============================================
// REVIEW ANNOTATION ENGINE TESTS
// ============================================

import { ReviewAnnotationEngine } from "../engine/ReviewAnnotationEngine.js";

describe("ReviewAnnotationEngine", () => {
  it("should create engine with default config", () => {
    const engine = new ReviewAnnotationEngine();
    expect(engine).toBeTruthy();
  });

  it("should create engine with custom config", () => {
    const engine = new ReviewAnnotationEngine({
      enableGrouping: false,
      enableNavigation: false,
    });
    expect(engine).toBeTruthy();
  });

  it("should have getConfig method", () => {
    const engine = new ReviewAnnotationEngine();
    const config = engine.getConfig();
    expect(config).toBeTruthy();
    expect(config.enableGrouping).toBe(true);
    expect(config.enableNavigation).toBe(true);
  });

  it("should have updateConfig method", () => {
    const engine = new ReviewAnnotationEngine();
    engine.updateConfig({ enableGrouping: false });
    const config = engine.getConfig();
    expect(config.enableGrouping).toBe(false);
  });
});

// ============================================
// BUILD ANNOTATION COLLECTION TESTS
// ============================================

describe("Build Annotation Collection", () => {
  const engine = new ReviewAnnotationEngine();

  it("should build collection from review results", () => {
    const input = {
      sessionId: "session-001",
      lessonPlanId: "lesson-001",
      reviewSession: {
        sessionId: "session-001",
        activities: [
          {
            activityId: "act-001",
            activityCode: "HD1",
            activityTitle: "Hoạt động 1",
            sectionName: "Mở đầu",
            score: 75,
            passed: false,
            issues: [
              {
                ruleId: "R001",
                ruleName: "Mục tiêu rõ ràng",
                title: "Thiếu mục tiêu",
                description: "Hoạt động cần có mục tiêu cụ thể",
                reason: "Không tìm thấy mục tiêu hoạt động",
                severity: "ERROR" as const,
                paragraphIndex: 1,
                suggestions: ["Thêm mục tiêu hoạt động"],
                confidence: 90,
              },
            ],
          },
          {
            activityId: "act-002",
            activityCode: "HD2",
            activityTitle: "Hoạt động 2",
            sectionName: "Hoạt động",
            score: 95,
            passed: true,
            issues: [],
          },
        ],
      },
      paragraphs: {
        sessionId: "session-001",
        sections: [
          {
            sectionId: "MOI_DAU",
            sectionCode: "A",
            sectionName: "Mở đầu",
            paragraphs: [
              { paragraphIndex: 0, text: "Intro text", startOffset: 0, endOffset: 10 },
              { paragraphIndex: 1, text: "Activity goal", startOffset: 11, endOffset: 25 },
            ],
          },
          {
            sectionId: "HOAT_DONG",
            sectionCode: "B",
            sectionName: "Hoạt động",
            paragraphs: [
              { paragraphIndex: 0, text: "Activity text", startOffset: 0, endOffset: 20 },
            ],
          },
        ],
      },
    };

    const collection = engine.build(input);

    expect(collection.sessionId).toBe("session-001");
    expect(collection.lessonPlanId).toBe("lesson-001");
    expect(collection.annotations).toHaveLength(2); // 1 issue + 1 passed
    expect(collection.statistics).toBeTruthy();
    expect(collection.filters).toBeTruthy();
    expect(collection.navigation).toBeTruthy();
  });

  it("should calculate correct statistics", () => {
    const input = {
      sessionId: "session-002",
      lessonPlanId: "lesson-001",
      reviewSession: {
        sessionId: "session-002",
        activities: [
          {
            activityId: "act-001",
            activityCode: "HD1",
            activityTitle: "Hoạt động 1",
            sectionName: "Mở đầu",
            score: 50,
            passed: false,
            issues: [
              {
                ruleId: "R001",
                title: "Lỗi nghiêm trọng",
                description: "Thiếu nội dung",
                reason: "Không có nội dung",
                severity: "ERROR" as const,
                confidence: 95,
              },
              {
                ruleId: "R002",
                title: "Cảnh báo",
                description: "Cần cải thiện",
                reason: "Chưa đủ chi tiết",
                severity: "WARNING" as const,
                confidence: 80,
              },
            ],
          },
          {
            activityId: "act-002",
            activityCode: "HD2",
            activityTitle: "Hoạt động 2",
            sectionName: "Hoạt động",
            score: 90,
            passed: true,
            issues: [],
          },
        ],
      },
    };

    const collection = engine.build(input);

    expect(collection.statistics.totalAnnotations).toBe(3); // 2 issues + 1 passed
    expect(collection.statistics.critical).toBe(1);
    expect(collection.statistics.medium).toBe(1);
    expect(collection.statistics.passed).toBe(1);
  });

  it("should create groups by section", () => {
    const input = {
      sessionId: "session-003",
      lessonPlanId: "lesson-001",
      reviewSession: {
        sessionId: "session-003",
        activities: [
          {
            activityId: "act-001",
            activityCode: "HD1",
            activityTitle: "Hoạt động 1",
            sectionName: "Mở đầu",
            score: 60,
            passed: false,
            issues: [
              {
                ruleId: "R001",
                title: "Lỗi",
                description: "Error",
                reason: "Reason",
                severity: "ERROR" as const,
                confidence: 90,
              },
            ],
          },
          {
            activityId: "act-002",
            activityCode: "HD2",
            activityTitle: "Hoạt động 2",
            sectionName: "Hoạt động",
            score: 70,
            passed: false,
            issues: [
              {
                ruleId: "R002",
                title: "Warning",
                description: "Warning",
                reason: "Reason",
                severity: "WARNING" as const,
                confidence: 85,
              },
            ],
          },
        ],
      },
    };

    const collection = engine.build(input);

    expect(collection.groups).toHaveLength(2);
    expect(collection.groups[0].type).toBe("section");
    expect(collection.groups[0].count).toBe(1);
    expect(collection.groups[1].count).toBe(1);
  });
});

// ============================================
// FILTER TESTS
// ============================================

describe("Filter Annotations", () => {
  const engine = new ReviewAnnotationEngine();

  it("should filter by CRITICAL", () => {
    const annotations = [
      { severity: AnnotationSeverity.CRITICAL, ruleId: "R1" },
      { severity: AnnotationSeverity.MEDIUM, ruleId: "R2" },
      { severity: AnnotationSeverity.LOW, ruleId: "PASSED" },
    ] as any[];

    const filtered = engine.filter(annotations, AnnotationFilter.CRITICAL);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ruleId).toBe("R1");
  });

  it("should filter by HIGH", () => {
    const annotations = [
      { severity: AnnotationSeverity.CRITICAL, ruleId: "R1" },
      { severity: AnnotationSeverity.HIGH, ruleId: "R2" },
      { severity: AnnotationSeverity.LOW, ruleId: "R3" },
    ] as any[];

    const filtered = engine.filter(annotations, AnnotationFilter.HIGH);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ruleId).toBe("R2");
  });

  it("should filter by MEDIUM", () => {
    const annotations = [
      { severity: AnnotationSeverity.CRITICAL, ruleId: "R1" },
      { severity: AnnotationSeverity.MEDIUM, ruleId: "R2" },
      { severity: AnnotationSeverity.LOW, ruleId: "R3" },
    ] as any[];

    const filtered = engine.filter(annotations, AnnotationFilter.MEDIUM);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ruleId).toBe("R2");
  });

  it("should filter by LOW (excluding PASSED)", () => {
    const annotations = [
      { severity: AnnotationSeverity.LOW, ruleId: "R1" },
      { severity: AnnotationSeverity.LOW, ruleId: "PASSED" },
      { severity: AnnotationSeverity.MEDIUM, ruleId: "R2" },
    ] as any[];

    const filtered = engine.filter(annotations, AnnotationFilter.LOW);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ruleId).toBe("R1");
  });

  it("should filter by PASSED", () => {
    const annotations = [
      { severity: AnnotationSeverity.LOW, ruleId: "R1" },
      { severity: AnnotationSeverity.LOW, ruleId: "PASSED" },
    ] as any[];

    const filtered = engine.filter(annotations, AnnotationFilter.PASSED);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ruleId).toBe("PASSED");
  });

  it("should return all for ALL filter", () => {
    const annotations = [
      { severity: AnnotationSeverity.CRITICAL, ruleId: "R1" },
      { severity: AnnotationSeverity.MEDIUM, ruleId: "R2" },
      { severity: AnnotationSeverity.LOW, ruleId: "R3" },
    ] as any[];

    const filtered = engine.filter(annotations, AnnotationFilter.ALL);
    expect(filtered).toHaveLength(3);
  });
});

// ============================================
// GROUP TESTS
// ============================================

describe("Group Annotations", () => {
  const engine = new ReviewAnnotationEngine();

  it("should group by SECTION", () => {
    const annotations = [
      { sectionId: "SEC1", sectionName: "Section 1", severity: AnnotationSeverity.CRITICAL } as any,
      { sectionId: "SEC1", sectionName: "Section 1", severity: AnnotationSeverity.MEDIUM } as any,
      { sectionId: "SEC2", sectionName: "Section 2", severity: AnnotationSeverity.LOW } as any,
    ];

    const groups = engine.group(annotations, AnnotationGroupBy.SECTION);

    expect(groups).toHaveLength(2);
    expect(groups[0].type).toBe("section");
    expect(groups[0].count).toBe(2);
    expect(groups[1].count).toBe(1);
  });

  it("should group by ACTIVITY", () => {
    const annotations = [
      { activityId: "A1", activityTitle: "Activity 1", severity: AnnotationSeverity.CRITICAL } as any,
      { activityId: "A1", activityTitle: "Activity 1", severity: AnnotationSeverity.MEDIUM } as any,
      { activityId: "A2", activityTitle: "Activity 2", severity: AnnotationSeverity.LOW } as any,
    ];

    const groups = engine.group(annotations, AnnotationGroupBy.ACTIVITY);

    expect(groups).toHaveLength(2);
    expect(groups[0].type).toBe("activity");
  });

  it("should group by SEVERITY", () => {
    const annotations = [
      { severity: AnnotationSeverity.CRITICAL, severityText: "CRITICAL" } as any,
      { severity: AnnotationSeverity.MEDIUM, severityText: "MEDIUM" } as any,
      { severity: AnnotationSeverity.CRITICAL, severityText: "CRITICAL" } as any,
    ];

    const groups = engine.group(annotations, AnnotationGroupBy.SEVERITY);

    expect(groups).toHaveLength(2);
  });

  it("should group by RULE", () => {
    const annotations = [
      { ruleId: "R1", ruleName: "Rule 1", severity: AnnotationSeverity.CRITICAL } as any,
      { ruleId: "R1", ruleName: "Rule 1", severity: AnnotationSeverity.MEDIUM } as any,
      { ruleId: "R2", ruleName: "Rule 2", severity: AnnotationSeverity.LOW } as any,
    ];

    const groups = engine.group(annotations, AnnotationGroupBy.RULE);

    expect(groups).toHaveLength(2);
    expect(groups[0].type).toBe("rule");
  });
});

// ============================================
// NAVIGATION TESTS
// ============================================

describe("Annotation Navigation", () => {
  const engine = new ReviewAnnotationEngine();

  it("should build navigation with correct state", () => {
    const annotations = [
      { annotationId: "1" },
      { annotationId: "2" },
      { annotationId: "3" },
    ] as any[];

    const nav = engine.navigate(annotations, 0);

    expect(nav.currentIndex).toBe(0);
    expect(nav.totalCount).toBe(3);
    expect(nav.hasNext).toBe(true);
    expect(nav.hasPrevious).toBe(false);
    expect(nav.current).toBeTruthy();
    expect(nav.current!.annotationId).toBe("1");
    expect(nav.next?.annotationId).toBe("2");
    expect(nav.previous).toBe(null);
  });

  it("should navigate to middle", () => {
    const annotations = [
      { annotationId: "1" },
      { annotationId: "2" },
      { annotationId: "3" },
    ] as any[];

    const nav = engine.navigate(annotations, 1);

    expect(nav.currentIndex).toBe(1);
    expect(nav.hasNext).toBe(true);
    expect(nav.hasPrevious).toBe(true);
    expect(nav.previous?.annotationId).toBe("1");
    expect(nav.next?.annotationId).toBe("3");
  });

  it("should navigate to last", () => {
    const annotations = [
      { annotationId: "1" },
      { annotationId: "2" },
      { annotationId: "3" },
    ] as any[];

    const nav = engine.navigate(annotations, 2);

    expect(nav.currentIndex).toBe(2);
    expect(nav.hasNext).toBe(false);
    expect(nav.hasPrevious).toBe(true);
    expect(nav.next).toBe(null);
    expect(nav.previous?.annotationId).toBe("2");
  });

  it("should handle empty annotations", () => {
    const annotations: any[] = [];

    const nav = engine.navigate(annotations, 0);

    expect(nav.totalCount).toBe(0);
    expect(nav.hasNext).toBe(false);
    expect(nav.hasPrevious).toBe(false);
    expect(nav.current).toBe(null);
  });

  it("should handle byIndex function", () => {
    const annotations = [
      { annotationId: "1" },
      { annotationId: "2" },
      { annotationId: "3" },
    ] as any[];

    const nav = engine.navigate(annotations, 0);

    expect(nav.byIndex(0)?.annotationId).toBe("1");
    expect(nav.byIndex(1)?.annotationId).toBe("2");
    expect(nav.byIndex(2)?.annotationId).toBe("3");
    expect(nav.byIndex(99)).toBe(null);
    expect(nav.byIndex(-1)).toBe(null);
  });
});

// ============================================
// UPDATE STATUS TESTS
// ============================================

describe("Update Annotation Status", () => {
  const engine = new ReviewAnnotationEngine();

  it("should update annotation status", () => {
    const input = {
      sessionId: "session-004",
      lessonPlanId: "lesson-001",
      reviewSession: {
        sessionId: "session-004",
        activities: [
          {
            activityId: "act-001",
            activityCode: "HD1",
            activityTitle: "Hoạt động 1",
            sectionName: "Mở đầu",
            score: 60,
            passed: false,
            issues: [
              {
                ruleId: "R001",
                title: "Lỗi",
                description: "Error",
                reason: "Reason",
                severity: "ERROR" as const,
                confidence: 90,
              },
            ],
          },
        ],
      },
    };

    const collection = engine.build(input);
    const annotation = collection.annotations[0];

    const updated = engine.updateStatus(annotation.annotationId, AnnotationStatus.REVIEWED);

    expect(updated).toBeTruthy();
    expect(updated?.status).toBe(AnnotationStatus.REVIEWED);
  });

  it("should return null for non-existent annotation", () => {
    const updated = engine.updateStatus("non-existent-id", AnnotationStatus.REVIEWED);
    expect(updated).toBe(null);
  });
});

// ============================================
// GET BY ID / ACTIVITY / SECTION TESTS
// ============================================

describe("Get Annotations", () => {
  const engine = new ReviewAnnotationEngine();

  it("should get annotation by ID", () => {
    const input = {
      sessionId: "session-005",
      lessonPlanId: "lesson-001",
      reviewSession: {
        sessionId: "session-005",
        activities: [
          {
            activityId: "act-001",
            activityCode: "HD1",
            activityTitle: "Hoạt động 1",
            sectionName: "Mở đầu",
            score: 60,
            passed: false,
            issues: [
              {
                ruleId: "R001",
                title: "Lỗi",
                description: "Error",
                reason: "Reason",
                severity: "ERROR" as const,
                confidence: 90,
              },
            ],
          },
        ],
      },
    };

    const collection = engine.build(input);
    const annotationId = collection.annotations[0].annotationId;

    const result = engine.getById(annotationId);
    expect(result).toBeTruthy();
    expect(result?.annotationId).toBe(annotationId);
  });

  it("should get annotations by activity", () => {
    const input = {
      sessionId: "session-006",
      lessonPlanId: "lesson-001",
      reviewSession: {
        sessionId: "session-006",
        activities: [
          {
            activityId: "act-001",
            activityCode: "HD1",
            activityTitle: "Hoạt động 1",
            sectionName: "Mở đầu",
            score: 60,
            passed: false,
            issues: [
              { ruleId: "R001", title: "Lỗi 1", description: "Error", reason: "Reason", severity: "ERROR" as const, confidence: 90 },
              { ruleId: "R002", title: "Lỗi 2", description: "Error", reason: "Reason", severity: "WARNING" as const, confidence: 85 },
            ],
          },
        ],
      },
    };

    const collection = engine.build(input);
    const annotations = engine.getByActivity("act-001");

    expect(annotations).toHaveLength(2);
  });

  it("should get annotations by section", () => {
    const input = {
      sessionId: "session-007",
      lessonPlanId: "lesson-001",
      reviewSession: {
        sessionId: "session-007",
        activities: [
          {
            activityId: "act-001",
            activityCode: "HD1",
            activityTitle: "Hoạt động 1",
            sectionName: "Mở đầu",
            score: 60,
            passed: false,
            issues: [
              { ruleId: "R001", title: "Lỗi", description: "Error", reason: "Reason", severity: "ERROR" as const, confidence: 90 },
            ],
          },
        ],
      },
    };

    const collection = engine.build(input);
    const sectionId = collection.annotations[0].sectionId;
    const annotations = engine.getBySection(sectionId);

    expect(annotations).toHaveLength(1);
  });
});

console.log("\n✅ All Review Annotation Engine tests completed\n");
