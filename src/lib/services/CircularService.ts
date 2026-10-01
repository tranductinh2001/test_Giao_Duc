/**
 * CircularService - Unified Circular Management
 *
 * Single source of truth for circular (công văn) management.
 * Handles CRUD operations, versioning, and rule associations.
 */

import { prisma } from '@/lib/prisma';
import { ReviewStatus, CircularType } from '@prisma/client';
import { z } from 'zod';

// ====================
// Validation Schemas
// ====================

export const CreateCircularSchema = z.object({
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  type: z.nativeEnum(CircularType).default('GUIDELINE'),
  content: z.string().min(1),
  summary: z.string().optional(),
  issuedDate: z.string().or(z.date()),
  effectiveDate: z.string().or(z.date()).optional(),
  applicableLevel: z.array(z.string()).default([]),
  applicableSubjects: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  templateId: z.string().optional(),
});

export const UpdateCircularSchema = CreateCircularSchema.partial().extend({
  code: CreateCircularSchema.shape.code.optional(),
  title: CreateCircularSchema.shape.title.optional(),
});

export type CreateCircularInput = z.infer<typeof CreateCircularSchema>;
export type UpdateCircularInput = z.infer<typeof UpdateCircularSchema>;

// ====================
// Types
// ====================

export interface CircularWithVersions {
  id: string;
  code: string;
  title: string;
  type: CircularType;
  summary: string | null;
  issuedDate: Date;
  effectiveDate: Date | null;
  applicableLevel: string[];
  applicableSubjects: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  versions?: CircularVersion[];
}

export interface CircularVersion {
  id: string;
  circularId: string;
  version: number;
  code: string;
  title: string;
  type: CircularType;
  content: string;
  summary: string | null;
  issuedDate: Date;
  effectiveDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CircularRuleGroupWithRules {
  id: string;
  circularId: string;
  name: string;
  description: string | null;
  priority: number;
  isActive: boolean;
  rules: CircularRule[];
}

export interface CircularRule {
  id: string;
  groupId: string;
  sectionType: string;
  title: string;
  requirements: string;
  correctExample: string | null;
  incorrectExample: string | null;
  aiPrompt: string;
  priority: number;
  weight: number;
  level: number;
  order: number;
  isActive: boolean;
}

// ====================
// Service Class
// ====================

export class CircularService {
  /**
   * Create a new circular with initial version
   */
  async create(input: CreateCircularInput): Promise<CircularWithVersions> {
    const data = {
      code: input.code.toUpperCase(),
      title: input.title,
      type: input.type,
      content: input.content,
      summary: input.summary,
      issuedDate: new Date(input.issuedDate),
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
      applicableLevel: input.applicableLevel,
      applicableSubjects: input.applicableSubjects,
      isActive: input.isActive,
    };

    // Create circular
    const circular = await prisma.circularDocument.create({
      data: {
        code: data.code,
        title: data.title,
        type: data.type,
        content: data.content,
        summary: data.summary,
        issuedDate: data.issuedDate,
        effectiveDate: data.effectiveDate,
        applicableLevel: data.applicableLevel,
        applicableSubjects: data.applicableSubjects,
        isActive: data.isActive,
      },
    });

    // Try to create initial version if table exists
    try {
      await prisma.$executeRaw`
        INSERT INTO "CircularVersion" (id, "circularId", version, code, title, type, content, summary, "issuedDate", "effectiveDate", "isActive", "createdAt", "updatedAt")
        VALUES (${require('crypto').randomUUID()}, ${circular.id}, 1, ${circular.code}, ${circular.title}, ${circular.type}, ${circular.content}, ${circular.summary}, ${circular.issuedDate}, ${circular.effectiveDate}, ${circular.isActive}, NOW(), NOW())
      `;
    } catch {
      // Table doesn't exist yet
    }

    return this.getById(circular.id) as Promise<CircularWithVersions>;
  }

  /**
   * Get all circulars with pagination
   */
  async getAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: CircularType;
    isActive?: boolean;
  }): Promise<{ data: CircularWithVersions[]; total: number }> {
    const { page = 1, limit = 20, search, type, isActive } = options || {};

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      prisma.circularDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.circularDocument.count({ where }),
    ]);

    return { data: data as CircularWithVersions[], total };
  }

  /**
   * Get circular by ID with versions and rules
   */
  async getById(id: string): Promise<CircularWithVersions | null> {
    const circular = await prisma.circularDocument.findUnique({
      where: { id },
    });

    if (!circular) return null;

    // Get versions (if table exists)
    let versions: CircularVersion[] = [];
    try {
      versions = (await prisma.$queryRaw`
        SELECT * FROM "CircularVersion" WHERE "circularId" = ${id} ORDER BY version DESC
      `) as CircularVersion[];
    } catch {
      // Table doesn't exist yet, skip
    }

    return {
      ...circular,
      versions,
    } as CircularWithVersions;
  }

  /**
   * Update circular (creates new version)
   */
  async update(id: string, input: UpdateCircularInput): Promise<CircularWithVersions> {
    const existing = await prisma.circularDocument.findUnique({ where: { id } });
    if (!existing) throw new Error('Circular not found');

    const data = {
      ...(input.code && { code: input.code.toUpperCase() }),
      ...(input.title && { title: input.title }),
      ...(input.type && { type: input.type }),
      ...(input.content && { content: input.content }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.issuedDate && { issuedDate: new Date(input.issuedDate) }),
      ...(input.effectiveDate !== undefined && { effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null }),
      ...(input.applicableLevel && { applicableLevel: input.applicableLevel }),
      ...(input.applicableSubjects && { applicableSubjects: input.applicableSubjects }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    // Update circular
    await prisma.circularDocument.update({
      where: { id },
      data,
    });

    // Try to create new version if table exists
    try {
      const versions = await prisma.$queryRaw<{ version: number }[]>`
        SELECT version FROM "CircularVersion" WHERE "circularId" = ${id} ORDER BY version DESC LIMIT 1
      `;
      const latestVersion = versions.length > 0 ? versions[0].version + 1 : 1;

      await prisma.$executeRaw`
        INSERT INTO "CircularVersion" (id, "circularId", version, code, title, type, content, summary, "issuedDate", "effectiveDate", "isActive", "createdAt", "updatedAt")
        VALUES (${require('crypto').randomUUID()}, ${id}, ${latestVersion}, ${data.code || existing.code}, ${data.title || existing.title}, ${data.type || existing.type}, ${data.content || ''}, ${data.summary ?? existing.summary}, ${data.issuedDate || existing.issuedDate}, ${data.effectiveDate ?? existing.effectiveDate}, ${data.isActive ?? existing.isActive}, NOW(), NOW())
      `;
    } catch {
      // Table doesn't exist yet
    }

    return this.getById(id) as Promise<CircularWithVersions>;
  }

  /**
   * Delete circular (soft delete)
   */
  async delete(id: string): Promise<void> {
    await prisma.circularDocument.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Get circular versions
   */
  async getVersions(circularId: string): Promise<CircularVersion[]> {
    try {
      return await prisma.$queryRaw<CircularVersion[]>`
        SELECT * FROM "CircularVersion" WHERE "circularId" = ${circularId} ORDER BY version DESC
      `;
    } catch {
      return [];
    }
  }

  /**
   * Get specific version
   */
  async getVersion(circularId: string, version: number): Promise<CircularVersion | null> {
    try {
      const versions = await prisma.$queryRaw<CircularVersion[]>`
        SELECT * FROM "CircularVersion" WHERE "circularId" = ${circularId} AND version = ${version}
      `;
      return versions[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Link circular to template
   * Note: This requires a junction table or ruleGroupId field - implement after migration
   */
  async linkToTemplate(_circularId: string, _templateId: string): Promise<void> {
    // TODO: Implement after database migration adds the necessary field/table
    console.warn('linkToTemplate not yet implemented - requires database migration');
  }

  /**
   * Get circulars by template
   */
  async getByTemplate(_templateId: string): Promise<CircularWithVersions[]> {
    // TODO: Link circulars to templates via CircularVersion or separate junction table
    // For now, return all active circulars
    const circulars = await prisma.circularDocument.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return circulars as CircularWithVersions[];
  }
}

// ====================
// Singleton Export
// ====================

export const circularService = new CircularService();
