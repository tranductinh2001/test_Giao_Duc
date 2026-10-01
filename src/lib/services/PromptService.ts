/**
 * PromptService - Unified Prompt Management
 *
 * Single source of truth for AI prompts.
 * All prompts are stored in the database, loaded at runtime.
 */

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ====================
// Validation Schemas
// ====================

export const PromptSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().default('general'),
  systemPrompt: z.string().min(1),
  userPrompt: z.string().min(1),
  variables: z.array(z.string()).default([]),
  model: z.string().default('gemini-3.1-flash-lite'),
  temperature: z.number().min(0).max(2).default(0.3),
  maxTokens: z.number().min(1).max(8192).default(500),
  isActive: z.boolean().default(true),
});

export const PromptVariableSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  description: z.string().optional(),
  required: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
});

export type PromptInput = z.infer<typeof PromptSchema>;
export type PromptVariableInput = z.infer<typeof PromptVariableSchema>;

// ====================
// Types
// ====================

export interface Prompt {
  id: string;
  name: string;
  description: string | null;
  category: string;
  systemPrompt: string;
  userPrompt: string;
  variables: string[];
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptWithUsage extends Prompt {
  usageCount: number;
  lastUsed: Date | null;
}

// ====================
// Service Class
// ====================

export class PromptService {
  /**
   * Get all prompts
   */
  async getAll(category?: string): Promise<Prompt[]> {
    // Use raw query to avoid Prisma model issues
    let prompts: Prompt[];

    if (category) {
      prompts = await prisma.$queryRaw<Prompt[]>`
        SELECT * FROM "section_content_rules"
        WHERE "isActive" = true AND category = ${category}
        ORDER BY name ASC
      `;
    } else {
      prompts = await prisma.$queryRaw<Prompt[]>`
        SELECT * FROM "section_content_rules"
        WHERE "isActive" = true
        ORDER BY name ASC
      `;
    }

    return prompts;
  }

  /**
   * Get prompt by ID
   */
  async getById(id: string): Promise<Prompt | null> {
    const prompts = await prisma.$queryRaw<Prompt[]>`
      SELECT * FROM "section_content_rules"
      WHERE id = ${id} AND "isActive" = true
    `;

    return prompts[0] || null;
  }

  /**
   * Get prompt by name
   */
  async getByName(name: string): Promise<Prompt | null> {
    const prompts = await prisma.$queryRaw<Prompt[]>`
      SELECT * FROM "section_content_rules"
      WHERE name = ${name} AND "isActive" = true
    `;

    return prompts[0] || null;
  }

  /**
   * Get prompts by category
   */
  async getByCategory(category: string): Promise<Prompt[]> {
    const prompts = await prisma.$queryRaw<Prompt[]>`
      SELECT * FROM "section_content_rules"
      WHERE category = ${category} AND "isActive" = true
      ORDER BY name ASC
    `;

    return prompts;
  }

  /**
   * Create prompt (stored in section_content_rules)
   */
  async create(input: PromptInput): Promise<Prompt> {
    const id = input.id || require('crypto').randomUUID();
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO "section_content_rules" (
        id, name, description, category, "systemPrompt", "userPrompt",
        variables, "aiModel", "maxTokens", temperature, "isActive",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${input.name}, ${input.description}, ${input.category},
        ${input.systemPrompt}, ${input.userPrompt}, ${input.variables},
        ${input.model}, ${input.maxTokens}, ${input.temperature}, ${input.isActive},
        ${now}, ${now}
      )
    `;

    return this.getById(id) as Promise<Prompt>;
  }

  /**
   * Update prompt
   */
  async update(id: string, input: Partial<PromptInput>): Promise<Prompt> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.category !== undefined) {
      updates.push('category = ?');
      values.push(input.category);
    }
    if (input.systemPrompt !== undefined) {
      updates.push('"systemPrompt" = ?');
      values.push(input.systemPrompt);
    }
    if (input.userPrompt !== undefined) {
      updates.push('"userPrompt" = ?');
      values.push(input.userPrompt);
    }
    if (input.variables !== undefined) {
      updates.push('variables = ?');
      values.push(input.variables);
    }
    if (input.model !== undefined) {
      updates.push('"aiModel" = ?');
      values.push(input.model);
    }
    if (input.temperature !== undefined) {
      updates.push('temperature = ?');
      values.push(input.temperature);
    }
    if (input.maxTokens !== undefined) {
      updates.push('"maxTokens" = ?');
      values.push(input.maxTokens);
    }
    if (input.isActive !== undefined) {
      updates.push('"isActive" = ?');
      values.push(input.isActive);
    }

    updates.push('"updatedAt" = ?');
    values.push(new Date());
    values.push(id);

    await prisma.$executeRaw`
      UPDATE "section_content_rules"
      SET ${updates.join(', ')}
      WHERE id = ${id}
    `;

    return this.getById(id) as Promise<Prompt>;
  }

  /**
   * Delete prompt (soft delete)
   */
  async delete(id: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "section_content_rules"
      SET "isActive" = false, "updatedAt" = ${new Date()}
      WHERE id = ${id}
    `;
  }

  /**
   * Render prompt with variables
   */
  renderPrompt(prompt: Prompt, variables: Record<string, unknown>): { systemPrompt: string; userPrompt: string } {
    let systemPrompt = prompt.systemPrompt;
    let userPrompt = prompt.userPrompt;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      systemPrompt = systemPrompt.replace(new RegExp(placeholder, 'g'), String(value));
      userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { systemPrompt, userPrompt };
  }

  /**
   * Get prompt categories
   */
  async getCategories(): Promise<string[]> {
    const result = await prisma.$queryRaw<{ category: string }[]>`
      SELECT DISTINCT category FROM "section_content_rules"
      WHERE "isActive" = true
      ORDER BY category ASC
    `;

    return result.map(r => r.category);
  }

  /**
   * Search prompts
   */
  async search(query: string): Promise<Prompt[]> {
    const prompts = await prisma.$queryRaw<Prompt[]>`
      SELECT * FROM "section_content_rules"
      WHERE "isActive" = true
      AND (
        name ILIKE ${`%${query}%`}
        OR description ILIKE ${`%${query}%`}
        OR "systemPrompt" ILIKE ${`%${query}%`}
        OR "userPrompt" ILIKE ${`%${query}%`}
      )
      ORDER BY name ASC
    `;

    return prompts;
  }

  /**
   * Duplicate prompt
   */
  async duplicate(id: string, newName: string): Promise<Prompt> {
    const original = await this.getById(id);
    if (!original) throw new Error('Prompt not found');

    return this.create({
      name: newName,
      description: original.description || undefined,
      category: original.category,
      systemPrompt: original.systemPrompt,
      userPrompt: original.userPrompt,
      variables: original.variables,
      model: original.model,
      temperature: original.temperature,
      maxTokens: original.maxTokens,
      isActive: true,
    });
  }
}

// ====================
// Singleton Export
// ====================

export const promptService = new PromptService();
