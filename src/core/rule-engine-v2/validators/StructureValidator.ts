/**
 * Structure Validator
 *
 * Validate document structure against template rules
 */

import type {
  StructureRule,
  StructureIssue,
  ParsedSection,
  ValidationResult,
} from '../types';
import { TextNormalizer } from '../parsers/TextNormalizer';

export class StructureValidator {
  private rules: StructureRule[];

  constructor(rules: StructureRule[]) {
    this.rules = rules.filter((r) => r.isActive);
  }

  /**
   * Validate parsed sections
   */
  async validate(sections: ParsedSection[]): Promise<ValidationResult> {
    const startTime = Date.now();
    const structureIssues: StructureIssue[] = [];

    // Group rules by type
    const orderRules = this.rules.filter((r) => r.type === 'ORDER');
    const headingRules = this.rules.filter((r) => r.type === 'HEADING');
    const numberingRules = this.rules.filter((r) => r.type === 'NUMBERING');
    const formatRules = this.rules.filter((r) => r.type === 'FORMAT');
    const styleRules = this.rules.filter((r) => r.type === 'STYLE');

    // Validate section order
    const orderIssues = await this.validateOrder(sections, orderRules);
    structureIssues.push(...orderIssues);

    // Validate each section
    for (const section of sections) {
      // Heading validation
      const headingIssues = await this.validateHeading(section, headingRules);
      structureIssues.push(...headingIssues);

      // Numbering validation
      const numberingIssues = await this.validateNumbering(section, numberingRules);
      structureIssues.push(...numberingIssues);

      // Format validation
      const formatIssues = await this.validateFormat(section, formatRules);
      structureIssues.push(...formatIssues);

      // Style validation
      const styleIssues = await this.validateStyle(section, styleRules);
      structureIssues.push(...styleIssues);
    }

    const validationTime = Date.now() - startTime;

    return {
      success: structureIssues.length === 0,
      structureIssues,
      contentIssues: [],
      aiCallCount: 0,
      validationTime,
    };
  }

  /**
   * Validate section order
   */
  private async validateOrder(
    sections: ParsedSection[],
    rules: StructureRule[]
  ): Promise<StructureIssue[]> {
    const issues: StructureIssue[] = [];

    for (const rule of rules) {
      const expected = rule.expectedValue as { order: Record<string, number> };
      if (!expected?.order) continue;

      // Check if sections are in correct order
      const sectionOrder = sections.map((s) => s.sectionCode);
      const expectedOrder = Object.entries(expected.order)
        .sort((a, b) => a[1] - b[1])
        .map((e) => e[0]);

      // Find misplaced sections
      for (let i = 0; i < sectionOrder.length; i++) {
        const actualSection = sectionOrder[i];
        const expectedIndex = expectedOrder.indexOf(actualSection);

        if (expectedIndex !== -1 && expectedIndex !== i) {
          issues.push({
            id: `order_${actualSection}_${Date.now()}`,
            ruleId: rule.id,
            ruleCode: rule.code,
            severity: rule.severity,
            message: rule.errorMessage || `Section "${actualSection}" is out of order`,
            suggestion: rule.suggestionText || `Move to position ${expectedIndex + 1}`,
            position: {
              sectionId: sections[i].sectionCode,
            },
            penaltyScore: rule.penaltyScore,
          });
        }
      }

      // Check for missing required sections
      for (const expectedSection of expectedOrder) {
        if (!sectionOrder.includes(expectedSection)) {
          issues.push({
            id: `missing_${expectedSection}_${Date.now()}`,
            ruleId: rule.id,
            ruleCode: rule.code,
            severity: rule.severity,
            message: `Missing required section: ${expectedSection}`,
            suggestion: `Add section: ${expectedSection}`,
            position: {
              sectionId: expectedSection,
            },
            penaltyScore: rule.penaltyScore,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate heading style
   */
  private async validateHeading(
    section: ParsedSection,
    rules: StructureRule[]
  ): Promise<StructureIssue[]> {
    const issues: StructureIssue[] = [];

    for (const rule of rules) {
      if (rule.sectionCode && rule.sectionCode !== section.sectionCode) continue;

      const expected = rule.expectedValue as {
        level?: number;
        bold?: boolean;
        uppercase?: boolean;
      };

      if (!expected) continue;

      // Get first line of section (heading)
      const lines = section.content.split('\n');
      const heading = lines[0] || '';

      // Check heading properties
      if (expected.bold && !this.isBold(heading)) {
        issues.push({
          id: `heading_bold_${section.sectionCode}_${Date.now()}`,
          ruleId: rule.id,
          ruleCode: rule.code,
          severity: rule.severity,
          message: rule.errorMessage || 'Heading should be bold',
          suggestion: rule.suggestionText || 'Apply bold formatting to heading',
          position: {
            sectionId: section.sectionCode,
            line: section.startIndex,
          },
          penaltyScore: rule.penaltyScore,
        });
      }

      if (expected.uppercase && !this.isUppercase(heading)) {
        issues.push({
          id: `heading_case_${section.sectionCode}_${Date.now()}`,
          ruleId: rule.id,
          ruleCode: rule.code,
          severity: rule.severity,
          message: rule.errorMessage || 'Heading should be uppercase',
          suggestion: rule.suggestionText || 'Convert heading to uppercase',
          position: {
            sectionId: section.sectionCode,
            line: section.startIndex,
          },
          penaltyScore: rule.penaltyScore,
        });
      }
    }

    return issues;
  }

  /**
   * Validate numbering style
   */
  private async validateNumbering(
    section: ParsedSection,
    rules: StructureRule[]
  ): Promise<StructureIssue[]> {
    const issues: StructureIssue[] = [];

    for (const rule of rules) {
      if (rule.sectionCode && rule.sectionCode !== section.sectionCode) continue;

      const allowed = rule.allowedValues as { styles?: string[] };
      if (!allowed?.styles) continue;

      // Extract numbering from section heading
      const lines = section.content.split('\n');
      const heading = lines[0] || '';
      const { prefix } = TextNormalizer.extractNumbering(heading);

      if (prefix && !this.matchesNumberingStyle(prefix, allowed.styles)) {
        issues.push({
          id: `numbering_${section.sectionCode}_${Date.now()}`,
          ruleId: rule.id,
          ruleCode: rule.code,
          severity: rule.severity,
          message:
            rule.errorMessage ||
            `Incorrect numbering style: "${prefix}". Expected: ${allowed.styles.join(', ')}`,
          suggestion:
            rule.suggestionText || `Change to one of: ${allowed.styles.join(', ')}`,
          position: {
            sectionId: section.sectionCode,
            line: section.startIndex,
          },
          penaltyScore: rule.penaltyScore,
        });
      }
    }

    return issues;
  }

  /**
   * Validate format
   */
  private async validateFormat(
    section: ParsedSection,
    rules: StructureRule[]
  ): Promise<StructureIssue[]> {
    const issues: StructureIssue[] = [];

    for (const rule of rules) {
      if (rule.sectionCode && rule.sectionCode !== section.sectionCode) continue;

      const expected = rule.expectedValue as {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
      };

      if (!expected) continue;

      const contentLength = section.content.length;

      if (expected.minLength && contentLength < expected.minLength) {
        issues.push({
          id: `format_length_${section.sectionCode}_${Date.now()}`,
          ruleId: rule.id,
          ruleCode: rule.code,
          severity: rule.severity,
          message:
            rule.errorMessage ||
            `Section too short: ${contentLength} chars (min: ${expected.minLength})`,
          suggestion:
            rule.suggestionText || `Add more content to reach minimum length`,
          position: {
            sectionId: section.sectionCode,
          },
          penaltyScore: rule.penaltyScore,
        });
      }

      if (expected.maxLength && contentLength > expected.maxLength) {
        issues.push({
          id: `format_length_${section.sectionCode}_${Date.now()}`,
          ruleId: rule.id,
          ruleCode: rule.code,
          severity: rule.severity,
          message:
            rule.errorMessage ||
            `Section too long: ${contentLength} chars (max: ${expected.maxLength})`,
          suggestion: rule.suggestionText || `Reduce content to fit maximum length`,
          position: {
            sectionId: section.sectionCode,
          },
          penaltyScore: rule.penaltyScore,
        });
      }
    }

    return issues;
  }

  /**
   * Validate style
   */
  private async validateStyle(
    section: ParsedSection,
    rules: StructureRule[]
  ): Promise<StructureIssue[]> {
    // Placeholder for future style validation
    return [];
  }

  /**
   * Check if text is bold (placeholder - needs actual formatting info)
   */
  private isBold(text: string): boolean {
    // In practice, this would check actual formatting metadata
    // For now, we assume it's not bold
    return false;
  }

  /**
   * Check if text is uppercase
   */
  private isUppercase(text: string): boolean {
    return text === text.toUpperCase();
  }

  /**
   * Check if numbering matches allowed styles
   */
  private matchesNumberingStyle(prefix: string, allowedStyles: string[]): boolean {
    for (const style of allowedStyles) {
      // Simple pattern matching
      if (prefix === style) return true;

      // Pattern-based matching
      if (style.includes('*')) {
        const pattern = style.replace(/\*/g, '\\d+');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(prefix)) return true;
      }
    }

    return false;
  }
}
