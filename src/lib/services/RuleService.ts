/**
 * RuleService - Unified Rule Management
 *
 * Single source of truth for rule management.
 * Handles rules from templates, circulars, and standalone rules.
 */

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ====================
// Validation Schemas
// ====================

export const CreateContentRuleSchema = z.object({
  templateId: z.string().optional(),
  sectionId: z.string().optional(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  checkType: z.enum(['PRESENCE', 'FORMAT', 'LENGTH', 'CUSTOM']),
  severity: z.enum(['ERROR', 'WARNING', 'INFO']),
  systemPrompt: z.string().min(1),
  userPrompt: z.string().min(1),
  criteria: z.record(z.string(), z.unknown()).optional(),
  penaltyScore: z.number().int().min(0).default(0),
  useAI: z.boolean().default(true),
  aiModel: z.string().default('gemini-3.1-flash-lite'),
  isActive: z.boolean().default(true),
});

export const CreateStructureRuleSchema = z.object({
  templateId: z.string().optional(),
  sectionId: z.string().optional(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['ORDER', 'NUMBERING', 'REQUIRED', 'UNIQUE']),
  severity: z.enum(['ERROR', 'WARNING', 'INFO']),
  expectedValue: z.record(z.string(), z.unknown()).optional(),
  allowedValues: z.record(z.string(), z.unknown()).optional(),
  penaltyScore: z.number().int().min(0).default(0),
  errorMessage: z.string().optional(),
  suggestionText: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const CreateParserRuleSchema = z.object({
  templateId: z.string().optional(),
  sectionId: z.string().optional(),
  type: z.enum(['KEYWORD', 'REGEX', 'FUZZY', 'HEADING', 'LIST']),
  pattern: z.string().min(1),
  priority: z.number().int().min(0).max(100).default(100),
  ignoreCase: z.boolean().default(true),
  ignoreAccent: z.boolean().default(true),
  ignoreSpace: z.boolean().default(false),
  normalizeText: z.boolean().default(true),
  fuzzyThreshold: z.number().min(0).max(1).optional(),
  aliases: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  confidence: z.number().min(0).max(1).default(1.0),
});

export const CreateFixRuleSchema = z.object({
  templateId: z.string(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  issueType: z.string().min(1),
  issueSeverity: z.enum(['ERROR', 'WARNING', 'INFO']),
  fixType: z.enum(['TEMPLATE', 'AI', 'MANUAL']),
  fixTemplate: z.string().optional(),
  aiPrompt: z.string().optional(),
  instructions: z.string().optional(),
  autoApply: z.boolean().default(false),
  requiresApproval: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export type CreateContentRuleInput = z.infer<typeof CreateContentRuleSchema>;
export type CreateStructureRuleInput = z.infer<typeof CreateStructureRuleSchema>;
export type CreateParserRuleInput = z.infer<typeof CreateParserRuleSchema>;
export type CreateFixRuleInput = z.infer<typeof CreateFixRuleSchema>;

// ====================
// Types
// ====================

export interface ContentRule {
  id: string;
  templateId: string;
  sectionId: string;
  code: string;
  name: string;
  description: string | null;
  checkType: string;
  severity: string;
  systemPrompt: string;
  userPrompt: string;
  criteria: Record<string, unknown> | null;
  penaltyScore: number;
  useAI: boolean;
  aiModel: string;
  isActive: boolean;
}

export interface StructureRule {
  id: string;
  templateId: string;
  sectionId: string | null;
  code: string;
  name: string;
  description: string | null;
  type: string;
  severity: string;
  expectedValue: Record<string, unknown> | null;
  allowedValues: Record<string, unknown> | null;
  penaltyScore: number;
  errorMessage: string | null;
  suggestionText: string | null;
  isActive: boolean;
}

export interface ParserRule {
  id: string;
  templateId: string;
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
  isActive: boolean;
  confidence: number;
}

export interface FixRule {
  id: string;
  templateId: string;
  code: string;
  name: string;
  description: string | null;
  issueType: string;
  issueSeverity: string;
  fixType: string;
  fixTemplate: string | null;
  aiPrompt: string | null;
  instructions: string | null;
  autoApply: boolean;
  requiresApproval: boolean;
  isActive: boolean;
}

// ====================
// Service Class
// ====================

export class RuleService {
  // ====================
  // Content Rules
  // ====================

  /**
   * Get all content rules for a template
   */
  async getContentRules(templateId: string): Promise<ContentRule[]> {
    const rules = await prisma.$queryRaw<ContentRule[]>`
      SELECT * FROM "section_content_rules"
      WHERE "templateId" = ${templateId} AND "isActive" = true
      ORDER BY "sectionId" ASC, code ASC
    `;
    return rules;
  }

  /**
   * Get content rules by section
   */
  async getContentRulesBySection(templateId: string, sectionId: string): Promise<ContentRule[]> {
    const rules = await prisma.$queryRaw<ContentRule[]>`
      SELECT * FROM "section_content_rules"
      WHERE "templateId" = ${templateId} AND "sectionId" = ${sectionId} AND "isActive" = true
      ORDER BY code ASC
    `;
    return rules;
  }

  /**
   * Create content rule
   */
  async createContentRule(input: CreateContentRuleInput): Promise<ContentRule> {
    const id = require('crypto').randomUUID();
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO "section_content_rules" (
        id, "templateId", "sectionId", code, name, description,
        "checkType", severity, "systemPrompt", "userPrompt",
        criteria, "penaltyScore", "useAI", "aiModel", "isActive",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${input.templateId}, ${input.sectionId}, ${input.code}, ${input.name}, ${input.description},
        ${input.checkType}, ${input.severity}, ${input.systemPrompt}, ${input.userPrompt},
        ${JSON.stringify(input.criteria || {})}, ${input.penaltyScore}, ${input.useAI}, ${input.aiModel}, ${input.isActive},
        ${now}, ${now}
      )
    `;

    return this.getContentRule(id) as Promise<ContentRule>;
  }

  /**
   * Get content rule by ID
   */
  async getContentRule(id: string): Promise<ContentRule | null> {
    const rules = await prisma.$queryRaw<ContentRule[]>`
      SELECT * FROM "section_content_rules" WHERE id = ${id} LIMIT 1
    `;
    return rules[0] || null;
  }

  /**
   * Update content rule
   */
  async updateContentRule(id: string, input: Partial<CreateContentRuleInput>): Promise<ContentRule> {
    const updates: string[] = ['"updatedAt" = NOW()'];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = $' + (values.length + 1));
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = $' + (values.length + 1));
      values.push(input.description);
    }
    if (input.systemPrompt !== undefined) {
      updates.push('"systemPrompt" = $' + (values.length + 1));
      values.push(input.systemPrompt);
    }
    if (input.userPrompt !== undefined) {
      updates.push('"userPrompt" = $' + (values.length + 1));
      values.push(input.userPrompt);
    }
    if (input.penaltyScore !== undefined) {
      updates.push('"penaltyScore" = $' + (values.length + 1));
      values.push(input.penaltyScore);
    }
    if (input.isActive !== undefined) {
      updates.push('"isActive" = $' + (values.length + 1));
      values.push(input.isActive);
    }

    values.push(id);

    await prisma.$executeRaw`
      UPDATE "section_content_rules"
      SET ${updates.join(', ')}
      WHERE id = ${id}
    `;

    return this.getContentRule(id) as Promise<ContentRule>;
  }

  /**
   * Delete content rule (soft delete)
   */
  async deleteContentRule(id: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "section_content_rules" SET "isActive" = false, "updatedAt" = NOW() WHERE id = ${id}
    `;
  }

  // ====================
  // Structure Rules
  // ====================

  /**
   * Get all structure rules for a template
   */
  async getStructureRules(templateId: string): Promise<StructureRule[]> {
    const rules = await prisma.$queryRaw<StructureRule[]>`
      SELECT * FROM "section_structure_rules"
      WHERE "templateId" = ${templateId} AND "isActive" = true
      ORDER BY type ASC, code ASC
    `;
    return rules;
  }

  /**
   * Create structure rule
   */
  async createStructureRule(input: CreateStructureRuleInput): Promise<StructureRule> {
    const id = require('crypto').randomUUID();
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO "section_structure_rules" (
        id, "templateId", "sectionId", code, name, description,
        type, severity, "expectedValue", "allowedValues",
        "penaltyScore", "errorMessage", "suggestionText", "isActive",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${input.templateId}, ${input.sectionId}, ${input.code}, ${input.name}, ${input.description},
        ${input.type}, ${input.severity}, ${JSON.stringify(input.expectedValue || {})}, ${JSON.stringify(input.allowedValues || {})},
        ${input.penaltyScore}, ${input.errorMessage}, ${input.suggestionText}, ${input.isActive},
        ${now}, ${now}
      )
    `;

    return this.getStructureRule(id) as Promise<StructureRule>;
  }

  /**
   * Get structure rule by ID
   */
  async getStructureRule(id: string): Promise<StructureRule | null> {
    const rules = await prisma.$queryRaw<StructureRule[]>`
      SELECT * FROM "section_structure_rules" WHERE id = ${id} LIMIT 1
    `;
    return rules[0] || null;
  }

  /**
   * Update structure rule
   */
  async updateStructureRule(id: string, input: Partial<CreateStructureRuleInput>): Promise<StructureRule> {
    const updates: string[] = ['"updatedAt" = NOW()'];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = $' + (values.length + 1));
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = $' + (values.length + 1));
      values.push(input.description);
    }
    if (input.penaltyScore !== undefined) {
      updates.push('"penaltyScore" = $' + (values.length + 1));
      values.push(input.penaltyScore);
    }
    if (input.isActive !== undefined) {
      updates.push('"isActive" = $' + (values.length + 1));
      values.push(input.isActive);
    }

    values.push(id);

    await prisma.$executeRaw`
      UPDATE "section_structure_rules"
      SET ${updates.join(', ')}
      WHERE id = ${id}
    `;

    return this.getStructureRule(id) as Promise<StructureRule>;
  }

  /**
   * Delete structure rule (soft delete)
   */
  async deleteStructureRule(id: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "section_structure_rules" SET "isActive" = false, "updatedAt" = NOW() WHERE id = ${id}
    `;
  }

  // ====================
  // Parser Rules
  // ====================

  /**
   * Get all parser rules for a template
   */
  async getParserRules(templateId: string): Promise<ParserRule[]> {
    const rules = await prisma.$queryRaw<ParserRule[]>`
      SELECT * FROM "section_parser_rules"
      WHERE "templateId" = ${templateId} AND "isActive" = true
      ORDER BY priority DESC, "sectionId" ASC
    `;
    return rules;
  }

  /**
   * Get parser rules by section
   */
  async getParserRulesBySection(templateId: string, sectionId: string): Promise<ParserRule[]> {
    const rules = await prisma.$queryRaw<ParserRule[]>`
      SELECT * FROM "section_parser_rules"
      WHERE "templateId" = ${templateId} AND "sectionId" = ${sectionId} AND "isActive" = true
      ORDER BY priority DESC
    `;
    return rules;
  }

  /**
   * Create parser rule
   */
  async createParserRule(input: CreateParserRuleInput): Promise<ParserRule> {
    const id = require('crypto').randomUUID();
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO "section_parser_rules" (
        id, "templateId", "sectionId", type, pattern, priority,
        "ignoreCase", "ignoreAccent", "ignoreSpace", "normalizeText",
        "fuzzyThreshold", aliases, "isActive", confidence,
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${input.templateId}, ${input.sectionId}, ${input.type}, ${input.pattern}, ${input.priority},
        ${input.ignoreCase}, ${input.ignoreAccent}, ${input.ignoreSpace}, ${input.normalizeText},
        ${input.fuzzyThreshold}, ${input.aliases}, ${input.isActive}, ${input.confidence},
        ${now}, ${now}
      )
    `;

    return this.getParserRule(id) as Promise<ParserRule>;
  }

  /**
   * Get parser rule by ID
   */
  async getParserRule(id: string): Promise<ParserRule | null> {
    const rules = await prisma.$queryRaw<ParserRule[]>`
      SELECT * FROM "section_parser_rules" WHERE id = ${id} LIMIT 1
    `;
    return rules[0] || null;
  }

  /**
   * Update parser rule
   */
  async updateParserRule(id: string, input: Partial<CreateParserRuleInput>): Promise<ParserRule> {
    const updates: string[] = ['"updatedAt" = NOW()'];
    const values: unknown[] = [];

    if (input.pattern !== undefined) {
      updates.push('pattern = $' + (values.length + 1));
      values.push(input.pattern);
    }
    if (input.priority !== undefined) {
      updates.push('priority = $' + (values.length + 1));
      values.push(input.priority);
    }
    if (input.isActive !== undefined) {
      updates.push('"isActive" = $' + (values.length + 1));
      values.push(input.isActive);
    }

    values.push(id);

    await prisma.$executeRaw`
      UPDATE "section_parser_rules"
      SET ${updates.join(', ')}
      WHERE id = ${id}
    `;

    return this.getParserRule(id) as Promise<ParserRule>;
  }

  /**
   * Delete parser rule (soft delete)
   */
  async deleteParserRule(id: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "section_parser_rules" SET "isActive" = false, "updatedAt" = NOW() WHERE id = ${id}
    `;
  }

  // ====================
  // Fix Rules
  // ====================

  /**
   * Get all fix rules for a template
   */
  async getFixRules(templateId: string): Promise<FixRule[]> {
    const rules = await prisma.$queryRaw<FixRule[]>`
      SELECT * FROM "section_fix_rules"
      WHERE "templateId" = ${templateId} AND "isActive" = true
      ORDER BY "issueType" ASC, code ASC
    `;
    return rules;
  }

  /**
   * Get fix rules by issue type
   */
  async getFixRulesByIssueType(templateId: string, issueType: string): Promise<FixRule[]> {
    const rules = await prisma.$queryRaw<FixRule[]>`
      SELECT * FROM "section_fix_rules"
      WHERE "templateId" = ${templateId} AND "issueType" = ${issueType} AND "isActive" = true
      ORDER BY code ASC
    `;
    return rules;
  }

  /**
   * Create fix rule
   */
  async createFixRule(input: CreateFixRuleInput): Promise<FixRule> {
    const id = require('crypto').randomUUID();
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO "section_fix_rules" (
        id, "templateId", code, name, description,
        "issueType", "issueSeverity", "fixType", "fixTemplate",
        "aiPrompt", instructions, "autoApply", "requiresApproval", "isActive",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${input.templateId}, ${input.code}, ${input.name}, ${input.description},
        ${input.issueType}, ${input.issueSeverity}, ${input.fixType}, ${input.fixTemplate},
        ${input.aiPrompt}, ${input.instructions}, ${input.autoApply}, ${input.requiresApproval}, ${input.isActive},
        ${now}, ${now}
      )
    `;

    return this.getFixRule(id) as Promise<FixRule>;
  }

  /**
   * Get fix rule by ID
   */
  async getFixRule(id: string): Promise<FixRule | null> {
    const rules = await prisma.$queryRaw<FixRule[]>`
      SELECT * FROM "section_fix_rules" WHERE id = ${id} LIMIT 1
    `;
    return rules[0] || null;
  }

  /**
   * Update fix rule
   */
  async updateFixRule(id: string, input: Partial<CreateFixRuleInput>): Promise<FixRule> {
    const updates: string[] = ['"updatedAt" = NOW()'];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = $' + (values.length + 1));
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = $' + (values.length + 1));
      values.push(input.description);
    }
    if (input.isActive !== undefined) {
      updates.push('"isActive" = $' + (values.length + 1));
      values.push(input.isActive);
    }

    values.push(id);

    await prisma.$executeRaw`
      UPDATE "section_fix_rules"
      SET ${updates.join(', ')}
      WHERE id = ${id}
    `;

    return this.getFixRule(id) as Promise<FixRule>;
  }

  /**
   * Delete fix rule (soft delete)
   */
  async deleteFixRule(id: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "section_fix_rules" SET "isActive" = false, "updatedAt" = NOW() WHERE id = ${id}
    `;
  }

  // ====================
  // Bulk Operations
  // ====================

  /**
   * Copy rules from one template to another
   */
  async copyRules(sourceTemplateId: string, targetTemplateId: string): Promise<void> {
    // Copy content rules
    const contentRules = await this.getContentRules(sourceTemplateId);
    for (const rule of contentRules) {
      await this.createContentRule({
        templateId: targetTemplateId,
        sectionId: rule.sectionId,
        code: `${rule.code}_copy`,
        name: `${rule.name} (Copy)`,
        description: rule.description || undefined,
        checkType: rule.checkType as 'PRESENCE' | 'FORMAT' | 'LENGTH' | 'CUSTOM',
        severity: rule.severity as 'ERROR' | 'WARNING' | 'INFO',
        systemPrompt: rule.systemPrompt,
        userPrompt: rule.userPrompt,
        criteria: rule.criteria || undefined,
        penaltyScore: rule.penaltyScore,
        useAI: rule.useAI,
        aiModel: rule.aiModel,
        isActive: true,
      });
    }

    // Copy structure rules
    const structureRules = await this.getStructureRules(sourceTemplateId);
    for (const rule of structureRules) {
      await this.createStructureRule({
        templateId: targetTemplateId,
        sectionId: rule.sectionId || undefined,
        code: `${rule.code}_copy`,
        name: `${rule.name} (Copy)`,
        description: rule.description || undefined,
        type: rule.type as 'ORDER' | 'NUMBERING' | 'REQUIRED' | 'UNIQUE',
        severity: rule.severity as 'ERROR' | 'WARNING' | 'INFO',
        expectedValue: rule.expectedValue || undefined,
        allowedValues: rule.allowedValues || undefined,
        penaltyScore: rule.penaltyScore,
        errorMessage: rule.errorMessage || undefined,
        suggestionText: rule.suggestionText || undefined,
        isActive: true,
      });
    }

    // Copy parser rules
    const parserRules = await this.getParserRules(sourceTemplateId);
    for (const rule of parserRules) {
      await this.createParserRule({
        templateId: targetTemplateId,
        sectionId: rule.sectionId,
        type: rule.type as 'KEYWORD' | 'REGEX' | 'FUZZY' | 'HEADING' | 'LIST',
        pattern: rule.pattern,
        priority: rule.priority,
        ignoreCase: rule.ignoreCase,
        ignoreAccent: rule.ignoreAccent,
        ignoreSpace: rule.ignoreSpace,
        normalizeText: rule.normalizeText,
        fuzzyThreshold: rule.fuzzyThreshold || undefined,
        aliases: rule.aliases,
        isActive: true,
        confidence: rule.confidence,
      });
    }

    // Copy fix rules
    const fixRules = await this.getFixRules(sourceTemplateId);
    for (const rule of fixRules) {
      await this.createFixRule({
        templateId: targetTemplateId,
        code: `${rule.code}_copy`,
        name: `${rule.name} (Copy)`,
        description: rule.description || undefined,
        issueType: rule.issueType,
        issueSeverity: rule.issueSeverity as 'ERROR' | 'WARNING' | 'INFO',
        fixType: rule.fixType as 'TEMPLATE' | 'AI' | 'MANUAL',
        fixTemplate: rule.fixTemplate || undefined,
        aiPrompt: rule.aiPrompt || undefined,
        instructions: rule.instructions || undefined,
        autoApply: rule.autoApply,
        requiresApproval: rule.requiresApproval,
        isActive: true,
      });
    }
  }
}

// ====================
// Singleton Export
// ====================

export const ruleService = new RuleService();
