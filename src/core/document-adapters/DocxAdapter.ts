/**
 * DOCX Adapter
 *
 * Uses ParserRules from database for section detection
 * Priority: Database Rules > Heuristic > Default
 */

import { Buffer } from "buffer";
import { parseDocx } from "@/core/lesson-plan-pipeline/parsers/DocxParser";
import { prisma } from "@/lib/prisma";
import {
  BaseAdapter,
  IDocumentAdapter,
  detectSourceType,
} from "./DocumentAdapter";
import {
  UnifiedDocument,
  UnifiedSection,
  UnifiedActivity,
  UnifiedParagraph,
  DocumentSourceType,
  AdapterResult,
} from "./types";

interface ParserRuleFromDB {
  id: string;
  sectionId: string;
  type: string;
  pattern: string;
  priority: number;
  ignoreCase: boolean;
  ignoreAccent: boolean;
  ignoreSpace: boolean;
  normalizeText: boolean;
  fuzzyThreshold: number | null;
  aliases: string[];
  confidence: number;
}

interface SectionTemplate {
  id: string;
  code: string;
  name: string;
}

export class DocxAdapter extends BaseAdapter implements IDocumentAdapter {
  readonly sourceType = DocumentSourceType.DOCX;

  readonly supportedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  readonly supportedExtensions = [".docx", ".doc"];

  // Cache for parser rules and section templates
  private cachedRules: ParserRuleFromDB[] = [];
  private cachedTemplates: SectionTemplate[] = [];
  private lastLoadTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async parse(file: Buffer, fileName: string): Promise<AdapterResult> {
    const startTime = Date.now();

    try {
      // Validate first
      const validation = this.validateFile(file, fileName);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Load parser rules from database
      await this.loadParserRules();

      // Use existing DocxParser
      const result = await parseDocx(file);

      if (!result.success || !result.paragraphs.length) {
        return {
          success: false,
          error: result.error || "Không thể parse file DOCX",
        };
      }

      // Convert to unified model using database rules
      const document = this.convertToUnifiedWithRules(result.paragraphs, fileName, result.rawText);

      return {
        success: true,
        document,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      };
    }
  }

  /**
   * Load parser rules from database
   */
  private async loadParserRules(): Promise<void> {
    const now = Date.now();
    if (this.cachedRules.length > 0 && (now - this.lastLoadTime) < this.CACHE_TTL) {
      return;
    }

    try {
      // Get first active template
      const template = await prisma.rule_templates.findFirst({
        where: { isActive: true },
        select: { id: true },
      });

      if (!template) {
        console.warn("[DocxAdapter] No active template found, using fallback patterns");
        return;
      }

      // Load parser rules
      const rules = await prisma.section_parser_rules.findMany({
        where: {
          templateId: template.id,
          isActive: true,
        },
        orderBy: { priority: "desc" },
      });

      this.cachedRules = rules.map(r => ({
        id: r.id,
        sectionId: r.sectionId,
        type: r.type,
        pattern: r.pattern,
        priority: r.priority,
        ignoreCase: r.ignoreCase,
        ignoreAccent: r.ignoreAccent,
        ignoreSpace: r.ignoreSpace,
        normalizeText: r.normalizeText,
        fuzzyThreshold: r.fuzzyThreshold,
        aliases: r.aliases || [],
        confidence: r.confidence,
      }));

      // Load section templates
      const sections = await prisma.rule_template_sections.findMany({
        where: { templateId: template.id },
        select: { id: true, code: true, name: true },
      });

      this.cachedTemplates = sections.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
      }));

      this.lastLoadTime = now;
      console.log(`[DocxAdapter] Loaded ${this.cachedRules.length} parser rules, ${this.cachedTemplates.length} section templates`);
    } catch (error) {
      console.error("[DocxAdapter] Failed to load parser rules:", error);
      this.cachedRules = [];
      this.cachedTemplates = [];
    }
  }

  /**
   * Normalize text for matching
   */
  private normalizeText(text: string, rule: ParserRuleFromDB): string {
    let result = text;
    if (rule.ignoreCase) result = result.toLowerCase();
    if (rule.ignoreAccent) {
      result = result.normalize("NFD").replace(/[̀-ͯ]/g, "");
    }
    if (rule.ignoreSpace) {
      result = result.replace(/\s+/g, " ").trim();
    }
    return result;
  }

  /**
   * Match text against a rule
   */
  private matchRule(text: string, rule: ParserRuleFromDB): { matched: boolean; confidence: number } {
    const normalizedText = this.normalizeText(text, rule);
    const normalizedPattern = this.normalizeText(rule.pattern, rule);

    // Direct match
    if (normalizedText.includes(normalizedPattern)) {
      return { matched: true, confidence: rule.confidence };
    }

    // Check aliases
    for (const alias of rule.aliases) {
      const normalizedAlias = this.normalizeText(alias, rule);
      if (normalizedText.includes(normalizedAlias)) {
        return { matched: true, confidence: rule.confidence * 0.95 };
      }
    }

    return { matched: false, confidence: 0 };
  }

  /**
   * Get section info from template
   */
  private getSectionInfo(sectionId: string): { code: string; name: string } {
    const template = this.cachedTemplates.find(t => t.id === sectionId);
    return template || { code: sectionId, name: sectionId };
  }

  /**
   * Convert to unified document using database rules
   */
  private convertToUnifiedWithRules(
    paragraphs: any[],
    fileName: string,
    rawText: string
  ): UnifiedDocument {
    const sections: UnifiedSection[] = [];
    let currentSection: UnifiedSection | null = null;
    let currentActivity: UnifiedActivity | null = null;
    let paraOrder = 0;

    const lines = rawText.split("\n").filter(l => l.trim());

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try to match against database rules
      let matchedSection: ParserRuleFromDB | null = null;
      let bestConfidence = 0;

      for (const rule of this.cachedRules) {
        const result = this.matchRule(trimmed, rule);
        if (result.matched && result.confidence > bestConfidence) {
          bestConfidence = result.confidence;
          matchedSection = rule;
        }
      }

      // If found a section match with good confidence
      if (matchedSection && bestConfidence >= 0.7) {
        // Save previous section
        if (currentSection) {
          if (currentActivity) {
            currentSection.activities.push(currentActivity);
            currentActivity = null;
          }
          sections.push(currentSection);
        }

        const sectionInfo = this.getSectionInfo(matchedSection.sectionId);
        currentSection = {
          id: this.generateId(),
          title: sectionInfo.name || sectionInfo.code,
          type: sectionInfo.code,
          order: sections.length + 1,
          activities: [],
        };
        continue;
      }

      // Check if this is an activity heading (e.g., "Hoạt động 1", "Hoạt động 2")
      if (/hoạt\s*động\s*\d+|hoat\s*dong\s*\d+/i.test(trimmed)) {
        if (currentActivity && currentSection) {
          currentSection.activities.push(currentActivity);
        }
        currentActivity = {
          id: this.generateId(),
          title: trimmed,
          order: currentSection ? currentSection.activities.length + 1 : 1,
          paragraphs: [],
        };
        continue;
      }

      // Create paragraph
      const para: UnifiedParagraph = {
        id: this.generateId(),
        content: trimmed,
        order: paraOrder++,
      };

      // Detect heading
      if (trimmed.length < 100 && /^[A-ZĐ]/.test(trimmed)) {
        para.isHeading = true;
        para.headingLevel = trimmed.length < 50 ? 1 : 2;
      }

      // Add to current section/activity
      if (currentActivity) {
        currentActivity.paragraphs.push(para);
      } else if (currentSection) {
        currentActivity = {
          id: this.generateId(),
          title: "Nội dung",
          order: 1,
          paragraphs: [],
        };
        currentActivity.paragraphs.push(para);
      } else {
        // Create default section
        currentSection = {
          id: this.generateId(),
          title: "Nội dung",
          type: "NOI_DUNG",
          order: 1,
          activities: [],
        };
        currentActivity = {
          id: this.generateId(),
          title: "Nội dung",
          order: 1,
          paragraphs: [],
        };
        currentActivity.paragraphs.push(para);
      }
    }

    // Close remaining sections/activities
    if (currentActivity && currentSection) {
      currentSection.activities.push(currentActivity);
    }
    if (currentSection) {
      if (currentSection.activities.length === 0 && currentActivity) {
        currentSection.activities.push(currentActivity);
      }
      sections.push(currentSection);
    }

    // If no sections found, create default
    if (sections.length === 0) {
      sections.push({
        id: this.generateId(),
        title: "Nội dung",
        type: "NOI_DUNG",
        order: 1,
        activities: [{
          id: this.generateId(),
          title: "Nội dung",
          order: 1,
          paragraphs: paragraphs.map((p, i) => ({
            id: this.generateId(),
            content: p.text || "",
            order: i,
          })),
        }],
      });
    }

    return {
      id: this.generateId(),
      title: fileName.replace(/\.(docx|doc)$/i, ""),
      sourceType: DocumentSourceType.DOCX,
      sourceFile: fileName,
      status: "COMPLETED" as any,
      sections,
      metadata: {
        wordCount: rawText.split(/\s+/).filter(Boolean).length,
        parsedAt: new Date(),
      },
      rawContent: rawText,
    };
  }
}

// Export singleton
export const docxAdapter = new DocxAdapter();
