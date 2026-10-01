/**
 * Section Detector Module
 *
 * Phase 1: Detect sections using template rules with aliases
 * Reads from Database Template (Admin configured)
 */

import { prisma } from "@/lib/prisma";
import { TextNormalizer } from "../../rule-engine-v2/parsers/TextNormalizer";
import type { DetectedSection, ParserRule, SectionAlias, PipelineConfig } from "../types";
import { DEFAULT_PIPELINE_CONFIG } from "../types";

export interface SectionDetectionResult {
  sections: DetectedSection[];
  overallConfidence: number;
  method: "template" | "heuristic";
  usedTemplateId?: string;
}

/**
 * Section Detector - uses template rules with aliases from database
 */
export class SectionDetector {
  private rules: ParserRule[] = [];
  private aliases: Map<string, SectionAlias[]> = new Map();
  private config: PipelineConfig;
  private templateId?: string;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * Load template rules and aliases from database
   */
  async loadTemplate(templateId?: string): Promise<void> {
    // If no templateId provided, try to get default template
    let targetTemplateId = templateId;

    if (!targetTemplateId) {
      const defaultTemplate = await prisma.rule_templates.findFirst({
        where: { isActive: true, isDefault: true },
        select: { id: true },
      });

      if (defaultTemplate) {
        targetTemplateId = defaultTemplate.id;
      } else {
        // Fallback: get first active template
        const firstTemplate = await prisma.rule_templates.findFirst({
          where: { isActive: true },
          select: { id: true },
        });
        targetTemplateId = firstTemplate?.id;
      }
    }

    if (!targetTemplateId) {
      throw new Error("Không tìm thấy template nào");
    }

    this.templateId = targetTemplateId;

    // Load parser rules
    const dbRules = await prisma.section_parser_rules.findMany({
      where: {
        templateId: targetTemplateId,
        isActive: true,
      },
      orderBy: { priority: "desc" },
    });

    this.rules = dbRules.map((rule) => ({
      id: rule.id,
      templateId: rule.templateId,
      sectionId: rule.sectionId,
      type: rule.type as "KEYWORD" | "REGEX" | "FUZZY",
      pattern: rule.pattern,
      priority: rule.priority,
      ignoreCase: rule.ignoreCase,
      ignoreAccent: rule.ignoreAccent,
      ignoreSpace: rule.ignoreSpace,
      normalizeText: rule.normalizeText,
      fuzzyThreshold: rule.fuzzyThreshold ?? null,
      aliases: rule.aliases ?? [],
      isActive: rule.isActive,
      confidence: rule.confidence,
    }));

    // Load aliases for each section
    const sectionAliases = await prisma.rule_template_sections.findMany({
      where: { templateId: targetTemplateId },
      select: {
        id: true,
        code: true,
      },
    });

    // Note: Aliases are stored in parser_rules.aliases field
    // If we need a separate alias table, we'd add it here
    for (const section of sectionAliases) {
      // Get aliases from parser rules for this section
      const sectionRules = this.rules.filter((r) => r.sectionId === section.code);
      const allAliases: SectionAlias[] = [];

      sectionRules.forEach((rule, idx) => {
        if (rule.aliases && rule.aliases.length > 0) {
          rule.aliases.forEach((alias, aliasIdx) => {
            allAliases.push({
              id: `${rule.id}-${aliasIdx}`,
              sectionId: section.code,
              alias: alias,
              order: aliasIdx,
              confidence: rule.confidence * 0.95, // Slightly lower than main pattern
            });
          });
        }
      });

      this.aliases.set(section.code, allAliases);
    }
  }

  /**
   * Detect sections from paragraphs
   */
  detect(
    paragraphs: Array<{ text: string; headingLevel: number | null }>
  ): SectionDetectionResult {
    const sections: DetectedSection[] = [];
    let currentSection: DetectedSection | null = null;
    let currentActivityIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      const isHeading =
        para.headingLevel !== null ||
        this.isHeadingLine(para.text);

      if (isHeading) {
        // Save previous section
        if (currentSection) {
          // If section has no activities, create default one
          if (currentSection.activities.length === 0) {
            currentSection.activities.push({
              activityIndex: 0,
              title: currentSection.sectionTitle,
              paragraphs: paragraphs
                .slice(
                  this.findParagraphIndex(paragraphs, currentSection.sectionTitle),
                  i
                )
                .map((p, idx) => ({
                  paragraphIndex: idx,
                  text: p.text,
                  headingLevel: p.headingLevel,
                  style: null,
                  pageNumber: null,
                  rawStyle: null,
                })),
              confidence: currentSection.confidence,
              detectionMethod: "heading",
            });
          }
          sections.push(currentSection);
        }

        // Try to match this heading against template rules
        const match = this.matchHeading(para.text);

        if (match) {
          currentSection = {
            sectionIndex: sections.length,
            sectionCode: match.sectionCode,
            sectionTitle: this.getSectionTitle(match.sectionCode, para.text),
            activities: [],
            confidence: match.confidence,
            isUnknown: match.confidence < this.config.confidenceThreshold,
            detectionMethod: match.method,
            matchedAlias: match.matchedAlias,
            matchedPattern: match.matchedPattern,
          };
          currentActivityIndex = 0;
        } else {
          // No match - treat as unknown section
          currentSection = {
            sectionIndex: sections.length,
            sectionCode: "UNKNOWN",
            sectionTitle: para.text,
            activities: [],
            confidence: 0,
            isUnknown: true,
            detectionMethod: "heading",
          };
          currentActivityIndex = 0;
        }
      } else if (currentSection) {
        // Check for activity heading within section
        const activityMatch = this.matchActivityHeading(para.text);

        if (activityMatch && this.config.enableActivityDetection) {
          // Start new activity
          currentSection.activities.push({
            activityIndex: currentActivityIndex++,
            title: activityMatch.title,
            paragraphs: [],
            confidence: activityMatch.confidence,
            detectionMethod: activityMatch.method,
            matchedPattern: activityMatch.pattern,
          });
        } else {
          // Add to current activity or create default
          if (currentSection.activities.length === 0) {
            currentSection.activities.push({
              activityIndex: 0,
              title: currentSection.sectionTitle,
              paragraphs: [],
              confidence: currentSection.confidence,
              detectionMethod: currentSection.detectionMethod,
            });
          }

          // Add to last activity
          const lastActivity =
            currentSection.activities[currentSection.activities.length - 1];
          lastActivity.paragraphs.push({
            paragraphIndex: lastActivity.paragraphs.length,
            text: para.text,
            headingLevel: para.headingLevel,
            style: null,
            pageNumber: null,
            rawStyle: null,
          });
        }
      }
    }

    // Don't forget last section
    if (currentSection) {
      // Ensure section has at least one activity
      if (currentSection.activities.length === 0) {
        currentSection.activities.push({
          activityIndex: 0,
          title: currentSection.sectionTitle,
          paragraphs: [],
          confidence: currentSection.confidence,
          detectionMethod: currentSection.detectionMethod,
        });
      }
      sections.push(currentSection);
    }

    // Calculate overall confidence
    const overallConfidence =
      sections.length > 0
        ? sections.reduce((sum, s) => sum + s.confidence, 0) / sections.length
        : 0;

    return {
      sections,
      overallConfidence,
      method: this.templateId ? "template" : "heuristic",
      usedTemplateId: this.templateId,
    };
  }

  /**
   * Match heading text against template rules
   */
  private matchHeading(
    text: string
  ): {
    sectionCode: string;
    confidence: number;
    method: "heading" | "keyword" | "numbering" | "template";
    matchedAlias?: string;
    matchedPattern?: string;
  } | null {
    // Try each rule in priority order
    for (const rule of this.rules) {
      const match = this.matchRule(text, rule);
      if (match) {
        return match;
      }
    }

    return null;
  }

  /**
   * Match text against a single rule
   */
  private matchRule(
    text: string,
    rule: ParserRule
  ): {
    sectionCode: string;
    confidence: number;
    method: "heading" | "keyword" | "numbering" | "template";
    matchedAlias?: string;
    matchedPattern?: string;
  } | null {
    const normalizedText = this.normalizeText(text, rule);

    switch (rule.type) {
      case "KEYWORD":
        return this.keywordMatch(normalizedText, rule);
      case "REGEX":
        return this.regexMatch(normalizedText, rule);
      case "FUZZY":
        return this.fuzzyMatch(normalizedText, rule);
      default:
        return null;
    }
  }

  /**
   * Keyword matching with aliases
   */
  private keywordMatch(
    text: string,
    rule: ParserRule
  ): ReturnType<typeof this.matchRule> {
    const normalizedPattern = this.normalizeText(rule.pattern, rule);

    // Check main pattern
    if (text.includes(normalizedPattern)) {
      return {
        sectionCode: rule.sectionId,
        confidence: rule.confidence,
        method: "keyword",
        matchedPattern: rule.pattern,
      };
    }

    // Check aliases
    for (const alias of rule.aliases) {
      const normalizedAlias = this.normalizeText(alias, rule);
      if (text.includes(normalizedAlias)) {
        return {
          sectionCode: rule.sectionId,
          confidence: rule.confidence * 0.95,
          method: "keyword",
          matchedAlias: alias,
          matchedPattern: rule.pattern,
        };
      }
    }

    return null;
  }

  /**
   * Regex matching
   */
  private regexMatch(
    text: string,
    rule: ParserRule
  ): ReturnType<typeof this.matchRule> {
    try {
      const flags = rule.ignoreCase ? "i" : "";
      const regex = new RegExp(rule.pattern, flags);

      if (regex.test(text)) {
        return {
          sectionCode: rule.sectionId,
          confidence: rule.confidence,
          method: "numbering",
          matchedPattern: rule.pattern,
        };
      }
    } catch {
      // Invalid regex, skip
    }

    return null;
  }

  /**
   * Fuzzy matching
   */
  private fuzzyMatch(
    text: string,
    rule: ParserRule
  ): ReturnType<typeof this.matchRule> {
    if (!this.config.enableFuzzyMatching) {
      return null;
    }

    const normalizedPattern = this.normalizeText(rule.pattern, rule);
    const similarity = TextNormalizer.similarity(text, normalizedPattern);
    const threshold = rule.fuzzyThreshold || this.config.fuzzyThreshold;

    if (similarity >= threshold) {
      return {
        sectionCode: rule.sectionId,
        confidence: similarity * rule.confidence,
        method: "keyword",
        matchedPattern: rule.pattern,
      };
    }

    // Check aliases with fuzzy
    for (const alias of rule.aliases) {
      const normalizedAlias = this.normalizeText(alias, rule);
      const aliasSimilarity = TextNormalizer.similarity(text, normalizedAlias);

      if (aliasSimilarity >= threshold) {
        return {
          sectionCode: rule.sectionId,
          confidence: aliasSimilarity * rule.confidence * 0.95,
          method: "keyword",
          matchedAlias: alias,
          matchedPattern: rule.pattern,
        };
      }
    }

    return null;
  }

  /**
   * Normalize text according to rule settings
   */
  private normalizeText(text: string, rule: ParserRule): string {
    return TextNormalizer.normalize(text, {
      lowercase: rule.ignoreCase,
      removeAccents: rule.ignoreAccent,
      normalizeSpaces: rule.ignoreSpace,
    });
  }

  /**
   * Check if line looks like a heading
   */
  private isHeadingLine(text: string): boolean {
    const trimmed = text.trim();

    // Roman numeral pattern
    if (/^(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+/i.test(trimmed)) {
      return true;
    }

    // Arabic numeral pattern
    if (/^\d{1,2}\.\s+/.test(trimmed)) {
      return true;
    }

    // Short uppercase line
    if (
      trimmed.length < 80 &&
      /^[A-ZÀÁẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ\s]+$/.test(
        trimmed
      )
    ) {
      return true;
    }

    return false;
  }

  /**
   * Match activity heading within a section
   */
  private matchActivityHeading(
    text: string
  ): {
    title: string;
    confidence: number;
    method: "heading" | "keyword";
    pattern?: string;
  } | null {
    const trimmed = text.trim();

    // Activity patterns: "Hoạt động 1:", "Hoạt động 1", "HĐ 1", etc.
    const activityMatch = trimmed.match(
      /^(hoạt động|hoat dong|hd|hđ)\s*(\d+)[\s:.]/i
    );

    if (activityMatch) {
      return {
        title: trimmed,
        confidence: 0.9,
        method: "heading",
        pattern: activityMatch[0],
      };
    }

    // Numbered sub-heading: 1.1, 1.2, etc.
    const subNumberMatch = trimmed.match(/^(\d+\.\d+)[\s.]/);

    if (subNumberMatch) {
      return {
        title: trimmed,
        confidence: 0.85,
        method: "heading",
        pattern: subNumberMatch[0],
      };
    }

    return null;
  }

  /**
   * Get section title from code or use original
   */
  private getSectionTitle(sectionCode: string, original: string): string {
    // Try to find a nice title from rules
    const rule = this.rules.find((r) => r.sectionId === sectionCode);
    if (rule) {
      // Return the pattern as a readable name
      return rule.pattern.charAt(0).toUpperCase() + rule.pattern.slice(1);
    }

    return original;
  }

  /**
   * Find paragraph index by title
   */
  private findParagraphIndex(
    paragraphs: Array<{ text: string }>,
    title: string
  ): number {
    return paragraphs.findIndex((p) =>
      p.text.toLowerCase().includes(title.toLowerCase())
    );
  }
}

/**
 * Factory function to create SectionDetector with loaded template
 */
export async function createSectionDetector(
  templateId?: string,
  config?: Partial<PipelineConfig>
): Promise<SectionDetector> {
  const detector = new SectionDetector(config);
  await detector.loadTemplate(templateId);
  return detector;
}
