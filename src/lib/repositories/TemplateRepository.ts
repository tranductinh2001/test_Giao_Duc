/**
 * Template Repository
 *
 * Database operations for Rule Engine templates
 */

import { prisma } from '@/lib/prisma';
import type { RuleTemplate } from '@/core/rule-engine-v2/types';

export class TemplateRepository {
  /**
   * Get all active templates
   */
  async findAll(): Promise<RuleTemplate[]> {
    const templates = await prisma.rule_templates.findMany({
      where: { isActive: true },
      include: {
        rule_template_sections: {
          orderBy: { order: 'asc' },
        },
        section_parser_rules: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
        section_structure_rules: {
          where: { isActive: true },
        },
        section_content_rules: {
          where: { isActive: true },
        },
        section_fix_rules: {
          where: { isActive: true },
        },
        section_scoring_rules: {
          where: { isActive: true },
        },
      },
    });

    return templates as any;
  }

  /**
   * Get template by ID
   */
  async findById(id: string): Promise<RuleTemplate | null> {
    const template = await prisma.rule_templates.findUnique({
      where: { id },
      include: {
        rule_template_sections: {
          orderBy: { order: 'asc' },
        },
        section_parser_rules: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
        section_structure_rules: {
          where: { isActive: true },
        },
        section_content_rules: {
          where: { isActive: true },
        },
        section_fix_rules: {
          where: { isActive: true },
        },
        section_scoring_rules: {
          where: { isActive: true },
        },
      },
    });

    return template as any;
  }

  /**
   * Get template by code
   */
  async findByCode(code: string): Promise<RuleTemplate | null> {
    const template = await prisma.rule_templates.findUnique({
      where: { code },
      include: {
        rule_template_sections: {
          orderBy: { order: 'asc' },
        },
        section_parser_rules: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
        section_structure_rules: {
          where: { isActive: true },
        },
        section_content_rules: {
          where: { isActive: true },
        },
        section_fix_rules: {
          where: { isActive: true },
        },
        section_scoring_rules: {
          where: { isActive: true },
        },
      },
    });

    return template as any;
  }

  /**
   * Get default template
   */
  async findDefault(): Promise<RuleTemplate | null> {
    const template = await prisma.rule_templates.findFirst({
      where: { isActive: true, isDefault: true },
      include: {
        rule_template_sections: {
          orderBy: { order: 'asc' },
        },
        section_parser_rules: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
        section_structure_rules: {
          where: { isActive: true },
        },
        section_content_rules: {
          where: { isActive: true },
        },
        section_fix_rules: {
          where: { isActive: true },
        },
        section_scoring_rules: {
          where: { isActive: true },
        },
      },
    });

    return template as any;
  }

  /**
   * Create new template
   */
  async create(data: {
    code: string;
    name: string;
    description?: string;
    category?: string;
  }): Promise<RuleTemplate> {
    console.log('[TemplateRepository] Creating template, prisma:', typeof prisma);
    console.log('[TemplateRepository] prisma.rule_templates:', typeof prisma.rule_templates);

    const template = await prisma.rule_templates.create({
      data: {
        id: crypto.randomUUID(),
        code: data.code,
        name: data.name,
        description: data.description,
        category: data.category,
        isActive: true,
        isDefault: false,
        version: 1,
        updatedAt: new Date(),
      },
      include: {
        rule_template_sections: true,
        section_parser_rules: true,
        section_structure_rules: true,
        section_content_rules: true,
        section_fix_rules: true,
        section_scoring_rules: true,
      },
    });

    return template as any;
  }

  /**
   * Update template
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      isActive?: boolean;
      isDefault?: boolean;
    }
  ): Promise<RuleTemplate> {
    const template = await prisma.rule_templates.update({
      where: { id },
      data,
      include: {
        rule_template_sections: true,
        section_parser_rules: true,
        section_structure_rules: true,
        section_content_rules: true,
        section_fix_rules: true,
        section_scoring_rules: true,
      },
    });

    return template as any;
  }

  /**
   * Delete template (soft delete - set isActive to false)
   */
  async delete(id: string): Promise<void> {
    await prisma.rule_templates.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get template statistics
   */
  async getStats(templateId: string) {
    const [
      parserRulesCount,
      structureRulesCount,
      contentRulesCount,
      fixRulesCount,
      scoringRulesCount,
      usageCount,
    ] = await Promise.all([
      prisma.section_parser_rules.count({
        where: { templateId, isActive: true },
      }),
      prisma.section_structure_rules.count({
        where: { templateId, isActive: true },
      }),
      prisma.section_content_rules.count({
        where: { templateId, isActive: true },
      }),
      prisma.section_fix_rules.count({
        where: { templateId, isActive: true },
      }),
      prisma.section_scoring_rules.count({
        where: { templateId, isActive: true },
      }),
      prisma.rule_usage_history.count({
        where: { ruleType: 'TEMPLATE' },
      }),
    ]);

    return {
      parserRulesCount,
      structureRulesCount,
      contentRulesCount,
      fixRulesCount,
      scoringRulesCount,
      usageCount,
    };
  }
}
