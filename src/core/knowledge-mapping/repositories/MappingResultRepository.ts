/**
 * Mapping Result Repository
 *
 * Phase 2: Database operations for Mapping Results
 */

import { PrismaClient, MappingResult } from "@prisma/client";

const prisma = new PrismaClient();

export class MappingResultRepository {
  async create(data: {
    lessonPlanId: string;
    activityId: string;
    confidence: number;
    matchedBy: string;
    matchScore?: number;
    matchedActivity?: Record<string, unknown>;
    documentSectionCode?: string;
    documentSectionTitle?: string;
    documentActivityTitle?: string;
    documentParagraphs?: string[];
    isUnknown?: boolean;
  }): Promise<MappingResult> {
    return prisma.mappingResult.create({
      data: {
        lessonPlanId: data.lessonPlanId,
        activityId: data.activityId,
        confidence: data.confidence,
        matchedBy: data.matchedBy,
        matchScore: data.matchScore,
        matchedActivity: data.matchedActivity as object | undefined,
        documentSectionCode: data.documentSectionCode,
        documentSectionTitle: data.documentSectionTitle,
        documentActivityTitle: data.documentActivityTitle,
        documentParagraphs: data.documentParagraphs,
        isUnknown: data.isUnknown ?? false,
      },
    });
  }

  async getByLessonPlan(lessonPlanId: string): Promise<MappingResult[]> {
    return prisma.mappingResult.findMany({
      where: { lessonPlanId },
      include: { activity: { include: { section: { include: { lesson: true } } } } },
      orderBy: { confidence: "desc" },
    });
  }

  async getByLessonPlanWithActivity(lessonPlanId: string) {
    return prisma.mappingResult.findMany({
      where: { lessonPlanId },
      include: {
        activity: {
          include: {
            section: {
              include: {
                lesson: {
                  include: {
                    subject: {
                      include: { grade: { include: { book: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { confidence: "desc" },
    });
  }

  async getByActivity(activityId: string): Promise<MappingResult[]> {
    return prisma.mappingResult.findMany({
      where: { activityId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getUnknownByLessonPlan(lessonPlanId: string): Promise<MappingResult[]> {
    return prisma.mappingResult.findMany({
      where: { lessonPlanId, isUnknown: true },
    });
  }

  async getHighConfidence(lessonPlanId: string, threshold = 80): Promise<MappingResult[]> {
    return prisma.mappingResult.findMany({
      where: { lessonPlanId, confidence: { gte: threshold } },
    });
  }

  async update(
    id: string,
    data: {
      confidence?: number;
      matchedBy?: string;
      matchScore?: number;
      matchedActivity?: object;
    }
  ): Promise<MappingResult> {
    return prisma.mappingResult.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.mappingResult.delete({ where: { id } });
  }

  async deleteByLessonPlan(lessonPlanId: string): Promise<number> {
    const result = await prisma.mappingResult.deleteMany({
      where: { lessonPlanId },
    });
    return result.count;
  }

  async countByLessonPlan(lessonPlanId: string): Promise<number> {
    return prisma.mappingResult.count({ where: { lessonPlanId } });
  }

  async getAverageConfidence(lessonPlanId: string): Promise<number | null> {
    const result = await prisma.mappingResult.aggregate({
      where: { lessonPlanId },
      _avg: { confidence: true },
    });
    return result._avg.confidence ?? null;
  }
}

export const mappingResultRepository = new MappingResultRepository();
