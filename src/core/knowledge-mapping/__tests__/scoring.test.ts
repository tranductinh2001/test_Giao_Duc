/**
 * Unit Tests for Knowledge Mapping Engine
 *
 * Phase 2: Test matching and scoring without DB dependencies
 */

// Mock vitest if not available
let describe: any;
let it: any;
let expect: any;

try {
  const vitest = require("vitest");
  describe = vitest.describe;
  it = vitest.it;
  expect = vitest.expect;
} catch {
  // Use minimal mocks for basic testing
  describe = (name: string, fn: () => void) => fn();
  it = (name: string, fn: () => void | Promise<void>) => fn();
  expect = (actual: any) => ({
    toBe: (expected: any) => {
      if (actual !== expected) throw new Error(`Expected ${expected} but got ${actual}`);
    },
    toBeGreaterThan: (expected: number) => {
      if (actual <= expected) throw new Error(`Expected ${actual} to be greater than ${expected}`);
    },
    toBeNull: () => {
      if (actual !== null) throw new Error(`Expected null but got ${actual}`);
    },
    toHaveLength: (expected: number) => {
      if (actual.length !== expected) throw new Error(`Expected length ${expected} but got ${actual.length}`);
    },
  });
}

const { ScoringService } = require("../services/ScoringService");
const { MatchingService } = require("../services/MatchingService");

describe("ScoringService", () => {
  const scoringService = new ScoringService();

  describe("calculateScore", () => {
    it("should return high score for exact alias match", () => {
      const result = scoringService.calculateScore({
        documentText: "Học sinh làm việc nhóm",
        activityTitle: "Hoạt động nhóm",
        activityKeywords: [],
        activityAliases: ["làm việc nhóm", "nhóm"],
      });

      expect(result.breakdown.alias).toBe(100);
    });

    it("should return high score for keyword match", () => {
      const result = scoringService.calculateScore({
        documentText: "Học sinh học về phép cộng",
        activityTitle: "Phép cộng",
        activityKeywords: ["cộng", "phép cộng", "toán"],
        activityAliases: [],
      });

      expect(result.breakdown.keyword).toBeGreaterThan(50);
    });

    it("should return high score for heading match", () => {
      const result = scoringService.calculateScore({
        documentText: "Nội dung bài học",
        documentHeading: "Hoạt động hình thành kiến thức",
        activityTitle: "Hoạt động hình thành kiến thức",
        activityKeywords: [],
        activityAliases: [],
      });

      expect(result.breakdown.heading).toBe(100);
    });

    it("should return 100 for exact order match", () => {
      const result = scoringService.calculateScore({
        documentText: "Hoạt động 1",
        documentOrder: 1,
        activityTitle: "Hoạt động",
        activityKeywords: [],
        activityAliases: [],
        activityOrder: 1,
      });

      expect(result.breakdown.order).toBe(100);
    });

    it("should return partial score for close order match", () => {
      const result = scoringService.calculateScore({
        documentText: "Hoạt động 1",
        documentOrder: 1,
        activityTitle: "Hoạt động",
        activityKeywords: [],
        activityAliases: [],
        activityOrder: 2,
      });

      expect(result.breakdown.order).toBe(80);
    });
  });

  describe("getConfidenceLevel", () => {
    it("should return HIGH for score >= 80", () => {
      expect(scoringService.getConfidenceLevel(80)).toBe("HIGH");
      expect(scoringService.getConfidenceLevel(95)).toBe("HIGH");
    });

    it("should return MEDIUM for score >= 50 and < 80", () => {
      expect(scoringService.getConfidenceLevel(50)).toBe("MEDIUM");
      expect(scoringService.getConfidenceLevel(79)).toBe("MEDIUM");
    });

    it("should return LOW for score < 50", () => {
      expect(scoringService.getConfidenceLevel(49)).toBe("LOW");
      expect(scoringService.getConfidenceLevel(0)).toBe("LOW");
    });
  });

  describe("meetsThreshold", () => {
    it("should return true for score >= threshold", () => {
      expect(scoringService.meetsThreshold(50)).toBe(true);
      expect(scoringService.meetsThreshold(51)).toBe(true);
    });

    it("should return false for score < threshold", () => {
      expect(scoringService.meetsThreshold(49)).toBe(false);
    });
  });
});

describe("MatchingService", () => {
  const matchingService = new MatchingService();

  describe("matchActivity", () => {
    it("should return null when no library activities provided", () => {
      const result = matchingService.matchActivity(
        {
          title: "Test Activity",
          text: "Some content",
        },
        []
      );

      expect(result).toBeNull();
    });

    it("should return unknown result when no match meets threshold", () => {
      const result = matchingService.matchActivity(
        {
          title: "Random Activity",
          text: "Random content xyz123",
        },
        [
          {
            id: "1",
            sectionId: "s1",
            code: "ACT_001",
            title: "Different Activity",
            order: 1,
            keywords: ["unique", "specific"],
            aliases: [],
            matchWeight: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
      );

      expect(result?.isUnknown).toBe(true);
    });

    it("should match activity with keyword", () => {
      const result = matchingService.matchActivity(
        {
          title: "Phép cộng",
          text: "Học sinh học phép cộng trong phạm vi 10",
        },
        [
          {
            id: "1",
            sectionId: "s1",
            code: "ACT_001",
            title: "Phép cộng",
            order: 1,
            keywords: ["phép cộng", "cộng"],
            aliases: [],
            matchWeight: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
      );

      expect(result).not.toBeNull();
      expect(result?.isUnknown).toBe(false);
      expect(result?.confidence).toBeGreaterThan(50);
    });
  });

  describe("matchActivities", () => {
    it("should match multiple activities", () => {
      const docActivities = [
        { title: "Hoạt động 1", text: "Tìm hiểu bài" },
        { title: "Hoạt động 2", text: "Luyện tập" },
      ];

      const libraryActivities = [
        {
          id: "1",
          sectionId: "s1",
          code: "ACT_001",
          title: "Tìm hiểu bài",
          order: 1,
          keywords: ["tìm hiểu"],
          aliases: [],
          matchWeight: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          sectionId: "s1",
          code: "ACT_002",
          title: "Luyện tập",
          order: 2,
          keywords: ["luyện tập"],
          aliases: [],
          matchWeight: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const results = matchingService.matchActivities(docActivities, libraryActivities);

      expect(results).toHaveLength(2);
      expect(results[0].confidence).toBeGreaterThan(results[1].confidence);
    });
  });
});

describe("Mapping Config", () => {
  it("should have correct default confidence threshold", () => {
    const { DEFAULT_MAPPING_CONFIG } = require("../types");
    expect(DEFAULT_MAPPING_CONFIG.confidenceThreshold).toBe(50);
  });

  it("should have correct default fuzzy threshold", () => {
    const { DEFAULT_MAPPING_CONFIG } = require("../types");
    expect(DEFAULT_MAPPING_CONFIG.fuzzyThreshold).toBe(0.8);
  });

  it("should have correct weights", () => {
    const { DEFAULT_MAPPING_CONFIG } = require("../types");
    expect(DEFAULT_MAPPING_CONFIG.weights.alias).toBe(30);
    expect(DEFAULT_MAPPING_CONFIG.weights.keyword).toBe(25);
    expect(DEFAULT_MAPPING_CONFIG.weights.heading).toBe(20);
    expect(DEFAULT_MAPPING_CONFIG.weights.order).toBe(10);
    expect(DEFAULT_MAPPING_CONFIG.weights.structure).toBe(10);
    expect(DEFAULT_MAPPING_CONFIG.weights.paragraphFeatures).toBe(5);
  });
});
