/**
 * Unit Tests for Lesson Plan Pipeline Parser
 *
 * Phase 1: Test parser without AI/DB dependencies
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TextNormalizer } from "../../rule-engine-v2/parsers/TextNormalizer";

// Test data - sample DOCX buffer (minimal valid DOCX)
// This is a minimal ZIP file with DOCX structure
const SAMPLE_DOCX_BUFFER = Buffer.from([
  0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00,
  0x50, 0x4b, 0x01, 0x02, 0x14, 0x00, 0x14, 0x00, 0x00, 0x00,
  0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

describe("TextNormalizer", () => {
  describe("normalize", () => {
    it("should lowercase text when option is set", () => {
      const result = TextNormalizer.normalize("HELLO World", { lowercase: true });
      expect(result).toBe("hello world");
    });

    it("should remove accents when option is set", () => {
      const result = TextNormalizer.normalize("xin chào", { removeAccents: true });
      expect(result).toBe("xin chao");
    });

    it("should normalize spaces when option is set", () => {
      const result = TextNormalizer.normalize("hello    world", { normalizeSpaces: true });
      expect(result).toBe("hello world");
    });

    it("should combine multiple options", () => {
      const result = TextNormalizer.normalize("XIN CHÀO", {
        lowercase: true,
        removeAccents: true,
      });
      expect(result).toBe("xin chao");
    });
  });

  describe("removeAccents", () => {
    it("should remove Vietnamese accents", () => {
      expect(TextNormalizer.removeAccents("àáảãạ")).toBe("aaaaa");
      expect(TextNormalizer.removeAccents("èéẻẽẹ")).toBe("eeeee");
      expect(TextNormalizer.removeAccents("ìíỉĩị")).toBe("iiiii");
      expect(TextNormalizer.removeAccents("òóỏõọ")).toBe("ooooo");
      expect(TextNormalizer.removeAccents("ùúủũụ")).toBe("uuuuu");
      expect(TextNormalizer.removeAccents("ỳýỷỹỵ")).toBe("yyyyy");
      expect(TextNormalizer.removeAccents("đ")).toBe("d");
    });

    it("should handle uppercase accented characters", () => {
      expect(TextNormalizer.removeAccents("ÀÁẢÃẠ")).toBe("AAAAA");
      expect(TextNormalizer.removeAccents("Đ")).toBe("D");
    });
  });

  describe("extractNumbering", () => {
    it("should extract Arabic numbering", () => {
      const result = TextNormalizer.extractNumbering("1. Mục tiêu");
      expect(result.prefix).toBe("1.");
      expect(result.text).toBe("Mục tiêu");
    });

    it("should extract Roman numeral numbering", () => {
      const result = TextNormalizer.extractNumbering("II. Chuẩn bị");
      expect(result.prefix).toBe("II.");
      expect(result.text).toBe("Chuẩn bị");
    });

    it("should extract letter numbering", () => {
      const result = TextNormalizer.extractNumbering("a) Hoạt động");
      expect(result.prefix).toBe("a)");
      expect(result.text).toBe("Hoạt động");
    });

    it("should handle text without numbering", () => {
      const result = TextNormalizer.extractNumbering("Mục tiêu bài học");
      expect(result.prefix).toBe("");
      expect(result.text).toBe("Mục tiêu bài học");
    });
  });

  describe("similarity", () => {
    it("should return 1 for identical strings", () => {
      const result = TextNormalizer.similarity("hello", "hello");
      expect(result).toBe(1.0);
    });

    it("should return 0 for completely different strings", () => {
      const result = TextNormalizer.similarity("abc", "xyz");
      expect(result).toBe(0);
    });

    it("should handle partial matches", () => {
      const result = TextNormalizer.similarity("muc tieu", "mục tiêu");
      expect(result).toBeGreaterThan(0.5);
    });

    it("should handle empty strings", () => {
      const result = TextNormalizer.similarity("", "");
      expect(result).toBe(1.0);
    });
  });
});

describe("Pipeline Types", () => {
  it("should have correct confidence threshold default", () => {
    const { DEFAULT_PIPELINE_CONFIG } = require("../types");
    expect(DEFAULT_PIPELINE_CONFIG.confidenceThreshold).toBe(50);
  });

  it("should have correct fuzzy threshold default", () => {
    const { DEFAULT_PIPELINE_CONFIG } = require("../types");
    expect(DEFAULT_PIPELINE_CONFIG.fuzzyThreshold).toBe(0.8);
  });
});
