/**
 * Section Parser
 *
 * Parse document into sections using template rules
 */

import type { ParserRule, ParsedSection, ParserResult } from '../types';
import { TextNormalizer } from './TextNormalizer';

export interface ParseOptions {
  enableFuzzyMatching?: boolean;
  fuzzyThreshold?: number;
  logMatches?: boolean;
}

export class SectionParser {
  private rules: ParserRule[];
  private options: ParseOptions;

  constructor(rules: ParserRule[], options: ParseOptions = {}) {
    console.log('[SectionParser] ===== INITIALIZATION =====');
    console.log('[SectionParser] Input rules count:', rules?.length || 0);
    this.rules = rules.filter(r => r.isActive).sort((a, b) => b.priority - a.priority);
    console.log('[SectionParser] Active rules count:', this.rules.length);
    console.log('[SectionParser] Rule priorities:', this.rules.slice(0, 5).map(r => ({ pattern: r.pattern?.substring(0, 20), priority: r.priority, sectionId: r.sectionId })));
    console.log('[SectionParser] ========================');

    this.options = {
      enableFuzzyMatching: true,
      fuzzyThreshold: 0.8,
      logMatches: false,
      ...options,
    };
  }

  /**
   * Parse text into sections
   */
  parse(text: string): ParserResult {
    const startTime = Date.now();
    const lines = text.split('\n');
    const sections: ParsedSection[] = [];
    const unmatchedContent: string[] = [];
    let aiCallCount = 0;
    const errors: string[] = [];

    let currentSection: ParsedSection | null = null;
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Try to match section heading
      const match = this.matchLine(line);

      if (match) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          sectionCode: match.sectionCode,
          sectionName: match.sectionName,
          content: '',
          startIndex: i,
          endIndex: i,
          confidence: match.confidence,
          matchedBy: match.matchedBy,
          aiUsed: match.aiUsed,
        };
        currentContent = [];

        if (match.aiUsed) {
          aiCallCount++;
        }

        if (this.options.logMatches) {
          console.log(`[SectionParser] Matched: ${line} -> ${match.sectionCode}`);
        }
      } else if (currentSection) {
        // Add to current section content
        currentContent.push(line);
        currentSection.endIndex = i;
      } else {
        // No section yet, unmatched content
        unmatchedContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }

    const parseTime = Date.now() - startTime;

    return {
      success: sections.length > 0,
      sections,
      unmatchedContent,
      aiCallCount,
      parseTime,
      errors,
    };
  }

  /**
   * Try to match a line against parser rules
   */
  private matchLine(line: string): {
    sectionCode: string;
    sectionName: string;
    confidence: number;
    matchedBy: {
      ruleId: string;
      ruleType: 'KEYWORD' | 'REGEX' | 'FUZZY';
      pattern: string;
    };
    aiUsed: boolean;
  } | null {
    // Extract numbering
    const { prefix, text: cleanText } = TextNormalizer.extractNumbering(line);

    // Try each rule in priority order
    for (const rule of this.rules) {
      const match = this.tryMatchRule(cleanText, rule);
      if (match) {
        return match;
      }
    }

    return null;
  }

  /**
   * Try to match text against a single rule
   */
  private tryMatchRule(
    text: string,
    rule: ParserRule
  ): {
    sectionCode: string;
    sectionName: string;
    confidence: number;
    matchedBy: {
      ruleId: string;
      ruleType: 'KEYWORD' | 'REGEX' | 'FUZZY';
      pattern: string;
    };
    aiUsed: boolean;
  } | null {
    switch (rule.type) {
      case 'KEYWORD':
        return this.keywordMatch(text, rule);
      case 'REGEX':
        return this.regexMatch(text, rule);
      case 'FUZZY':
        return this.fuzzyMatch(text, rule);
      default:
        return null;
    }
  }

  /**
   * Keyword matching
   */
  private keywordMatch(text: string, rule: ParserRule): ReturnType<typeof this.tryMatchRule> {
    const normalizedText = this.normalizeForRule(text, rule);
    const normalizedPattern = this.normalizeForRule(rule.pattern, rule);

    // Check exact match
    if (normalizedText.includes(normalizedPattern)) {
      return {
        sectionCode: this.getSectionCode(rule),
        sectionName: this.getSectionName(rule),
        confidence: rule.confidence,
        matchedBy: {
          ruleId: rule.id,
          ruleType: 'KEYWORD',
          pattern: rule.pattern,
        },
        aiUsed: false,
      };
    }

    // Check aliases
    for (const alias of rule.aliases) {
      const normalizedAlias = this.normalizeForRule(alias, rule);
      if (normalizedText.includes(normalizedAlias)) {
        return {
          sectionCode: this.getSectionCode(rule),
          sectionName: this.getSectionName(rule),
          confidence: rule.confidence * 0.95, // Slightly lower confidence for alias
          matchedBy: {
            ruleId: rule.id,
            ruleType: 'KEYWORD',
            pattern: alias,
          },
          aiUsed: false,
        };
      }
    }

    return null;
  }

  /**
   * Regex matching
   */
  private regexMatch(text: string, rule: ParserRule): ReturnType<typeof this.tryMatchRule> {
    try {
      const normalizedText = this.normalizeForRule(text, rule);
      const flags = rule.ignoreCase ? 'i' : '';
      const regex = new RegExp(rule.pattern, flags);

      if (regex.test(normalizedText)) {
        return {
          sectionCode: this.getSectionCode(rule),
          sectionName: this.getSectionName(rule),
          confidence: rule.confidence,
          matchedBy: {
            ruleId: rule.id,
            ruleType: 'REGEX',
            pattern: rule.pattern,
          },
          aiUsed: false,
        };
      }
    } catch (error) {
      console.error(`[SectionParser] Invalid regex in rule ${rule.id}:`, error);
    }

    return null;
  }

  /**
   * Fuzzy matching
   */
  private fuzzyMatch(text: string, rule: ParserRule): ReturnType<typeof this.tryMatchRule> {
    if (!this.options.enableFuzzyMatching) {
      return null;
    }

    const normalizedText = this.normalizeForRule(text, rule);
    const normalizedPattern = this.normalizeForRule(rule.pattern, rule);

    const similarity = TextNormalizer.similarity(normalizedText, normalizedPattern);
    const threshold = rule.fuzzyThreshold || this.options.fuzzyThreshold || 0.8;

    if (similarity >= threshold) {
      return {
        sectionCode: this.getSectionCode(rule),
        sectionName: this.getSectionName(rule),
        confidence: similarity * rule.confidence,
        matchedBy: {
          ruleId: rule.id,
          ruleType: 'FUZZY',
          pattern: rule.pattern,
        },
        aiUsed: false,
      };
    }

    // Check aliases with fuzzy matching
    for (const alias of rule.aliases) {
      const normalizedAlias = this.normalizeForRule(alias, rule);
      const aliasSimilarity = TextNormalizer.similarity(normalizedText, normalizedAlias);

      if (aliasSimilarity >= threshold) {
        return {
          sectionCode: this.getSectionCode(rule),
          sectionName: this.getSectionName(rule),
          confidence: aliasSimilarity * rule.confidence * 0.95,
          matchedBy: {
            ruleId: rule.id,
            ruleType: 'FUZZY',
            pattern: alias,
          },
          aiUsed: false,
        };
      }
    }

    return null;
  }

  /**
   * Normalize text according to rule settings
   */
  private normalizeForRule(text: string, rule: ParserRule): string {
    if (!rule.normalizeText) {
      return text;
    }

    return TextNormalizer.normalize(text, {
      lowercase: rule.ignoreCase,
      removeAccents: rule.ignoreAccent,
      normalizeSpaces: rule.ignoreSpace,
    });
  }

  /**
   * Get section code from rule
   * Priority: sectionCode (if provided in mapping) > sectionId
   */
  private getSectionCode(rule: ParserRule): string {
    // Use sectionCode if available (mapped from template sections)
    return (rule as any).sectionCode || rule.sectionId;
  }

  /**
   * Get section name from rule
   */
  private getSectionName(rule: ParserRule): string {
    // Use sectionCode if available, otherwise use pattern
    return (rule as any).sectionCode || rule.pattern;
  }
}
