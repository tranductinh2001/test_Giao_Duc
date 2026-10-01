/**
 * TemplateService - Unified Template Management
 *
 * Single source of truth for template management.
 * Handles CRUD operations, versioning, and rule associations.
 */

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { TemplateRepository } from '@/lib/repositories/TemplateRepository';

// ====================
// Validation Schemas
// ====================

export const CreateTemplateSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().default('general'),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

export const CreateSectionSchema = z.object({
  templateId: z.string(),
  code: z.string().min(1).max(50).toUpperCase(),
  name: z.string().min(1).max(200),
  order: z.number().int().min(1),
  isRequired: z.boolean().default(true),
  isRepeatable: z.boolean().default(false),
  numberingStyle: z.string().optional(),
  headingLevel: z.number().int().min(1).max(6).optional(),
  parentId: z.string().optional(),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
export type CreateSectionInput = z.infer<typeof CreateSectionSchema>;

// ====================
// Types
// ====================

export interface TemplateSection {
  id: string;
  templateId: string;
  code: string;
  name: string;
  order: number;
  isRequired: boolean;
  isRepeatable: boolean;
  numberingStyle: string | null;
  headingLevel: number | null;
  parentId: string | null;
}

export interface TemplateWithSections {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  sections?: TemplateSection[];
  contentRules?: unknown[];
  structureRules?: unknown[];
  parserRules?: unknown[];
  fixRules?: unknown[];
  scoringRules?: unknown[];
}

// ====================
// Service Class
// ====================

export class TemplateService {
  private repository: TemplateRepository;

  constructor() {
    this.repository = new TemplateRepository();
  }

  /**
   * Initialize default templates (run once)
   */
  async initializeDefaults(): Promise<void> {
    const existing = await prisma.rule_templates.count();
    if (existing > 0) {
      console.log('Templates already initialized, skipping...');
      return;
    }

    // Load from seed file
    const { DEFAULT_TEMPLATE_5STEP } = await import('@/core/rule-engine-v2/seed/default-template');
    await this.create(DEFAULT_TEMPLATE_5STEP as unknown as CreateTemplateInput);
    console.log('Default template initialized');
  }

  /**
   * Get all templates
   */
  async getAll(options?: {
    page?: number;
    limit?: number;
    category?: string;
    isActive?: boolean;
  }): Promise<{ data: TemplateWithSections[]; total: number }> {
    const { page = 1, limit = 20, category, isActive = true } = options || {};

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      prisma.rule_templates.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.rule_templates.count({ where }),
    ]);

    // Get sections for each template
    const dataWithSections = await Promise.all(
      data.map(async (template) => {
        const sections = await prisma.rule_template_sections.findMany({
          where: { templateId: template.id },
          orderBy: { order: 'asc' },
        });
        return { ...template, sections } as TemplateWithSections;
      })
    );

    return { data: dataWithSections, total };
  }

  /**
   * Get template by ID
   */
  async getById(id: string): Promise<TemplateWithSections | null> {
    const template = await this.repository.findById(id);
    if (!template) return null;

    return template as unknown as TemplateWithSections;
  }

  /**
   * Get template by code
   */
  async getByCode(code: string): Promise<TemplateWithSections | null> {
    const template = await this.repository.findByCode(code);
    if (!template) return null;

    return template as unknown as TemplateWithSections;
  }

  /**
   * Get default template
   */
  async getDefault(): Promise<TemplateWithSections | null> {
    const template = await prisma.rule_templates.findFirst({
      where: { isDefault: true, isActive: true },
      include: {
        rule_template_sections: { orderBy: { order: 'asc' } },
        section_parser_rules: { where: { isActive: true } },
        section_structure_rules: { where: { isActive: true } },
        section_content_rules: { where: { isActive: true } },
        section_fix_rules: { where: { isActive: true } },
        section_scoring_rules: { where: { isActive: true } },
      },
    });

    return template as unknown as TemplateWithSections | null;
  }

  /**
   * Create template
   */
  async create(input: CreateTemplateInput): Promise<TemplateWithSections> {
    // Check if code already exists
    const existing = await prisma.rule_templates.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw new Error(`Template with code ${input.code} already exists`);
    }

    // If this is default, unset other defaults
    if (input.isDefault) {
      await prisma.rule_templates.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const id = require('crypto').randomUUID();
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO "rule_templates" (id, code, name, description, category, "isActive", "isDefault", version, "createdAt", "updatedAt")
      VALUES (${id}, ${input.code}, ${input.name}, ${input.description}, ${input.category}, ${input.isActive}, ${input.isDefault}, 1, ${now}, ${now})
    `;

    return this.getById(id) as Promise<TemplateWithSections>;
  }

  /**
   * Update template
   */
  async update(id: string, input: UpdateTemplateInput): Promise<TemplateWithSections> {
    const existing = await prisma.rule_templates.findUnique({ where: { id } });
    if (!existing) throw new Error('Template not found');

    // If setting as default, unset other defaults
    if (input.isDefault) {
      await prisma.rule_templates.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const template = await prisma.rule_templates.update({
      where: { id },
      data: {
        ...input,
        version: existing.version + 1,
        updatedAt: new Date(),
      },
    });

    return this.getById(template.id) as Promise<TemplateWithSections>;
  }

  /**
   * Delete template (soft delete)
   */
  async delete(id: string): Promise<void> {
    await prisma.rule_templates.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Add section to template
   */
  async addSection(input: CreateSectionInput): Promise<TemplateSection> {
    const now = new Date();
    const section = await prisma.rule_template_sections.create({
      data: {
        id: require('crypto').randomUUID(),
        templateId: input.templateId,
        code: input.code,
        name: input.name,
        order: input.order,
        isRequired: input.isRequired,
        isRepeatable: input.isRepeatable,
        numberingStyle: input.numberingStyle,
        headingLevel: input.headingLevel,
        parentId: input.parentId,
        level: input.parentId ? 2 : 1,
        createdAt: now,
        updatedAt: now,
      },
    });

    return section as TemplateSection;
  }

  /**
   * Update section
   */
  async updateSection(sectionId: string, input: Partial<CreateSectionInput>): Promise<TemplateSection> {
    const section = await prisma.rule_template_sections.update({
      where: { id: sectionId },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });

    return section as TemplateSection;
  }

  /**
   * Delete section
   */
  async deleteSection(sectionId: string): Promise<void> {
    await prisma.rule_template_sections.delete({
      where: { id: sectionId },
    });
  }

  /**
   * Get sections by template
   */
  async getSections(templateId: string): Promise<TemplateSection[]> {
    return prisma.rule_template_sections.findMany({
      where: { templateId },
      orderBy: { order: 'asc' },
    }) as unknown as TemplateSection[];
  }

  /**
   * Duplicate template
   */
  async duplicate(id: string, newCode: string, newName: string): Promise<TemplateWithSections> {
    const original = await this.getById(id);
    if (!original) throw new Error('Template not found');

    // Create new template
    const newTemplate = await this.create({
      code: newCode,
      name: newName,
      description: original.description || '',
      category: original.category || 'general',
      isActive: true,
      isDefault: false,
    });

    // Copy sections
    for (const section of original.sections || []) {
      await this.addSection({
        templateId: newTemplate.id,
        code: section.code,
        name: section.name,
        order: section.order,
        isRequired: section.isRequired,
        isRepeatable: section.isRepeatable,
        numberingStyle: section.numberingStyle || undefined,
        headingLevel: section.headingLevel || undefined,
      });
    }

    // Copy rules (using RuleService would be better, but for now just copy basic data)
    // This would require importing RuleService - keeping it simple for now

    return this.getById(newTemplate.id) as Promise<TemplateWithSections>;
  }

  /**
   * Get template categories
   */
  async getCategories(): Promise<string[]> {
    const result = await prisma.$queryRaw<{ category: string }[]>`
      SELECT DISTINCT category FROM "rule_templates"
      WHERE "isActive" = true AND category IS NOT NULL
      ORDER BY category ASC
    `;

    return result.map(r => r.category).filter(Boolean) as string[];
  }
}

// ====================
// Singleton Export
// ====================

export const templateService = new TemplateService();
