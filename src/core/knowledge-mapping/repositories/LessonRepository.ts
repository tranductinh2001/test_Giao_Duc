/**
 * Lesson Repository
 *
 * Phase 2: Database operations for Lesson Library
 */

import { PrismaClient, LessonBook, LessonGrade, LessonSubject, Lesson, LessonSection, LessonActivity } from "@prisma/client";
import type {
  BookDTO,
  GradeDTO,
  SubjectDTO,
  LessonDTO,
  LessonSectionDTO,
  LessonActivityDTO,
} from "../types";

const prisma = new PrismaClient();

export class LessonRepository {
  // ============================================
  // BOOK OPERATIONS
  // ============================================

  async createBook(dto: BookDTO): Promise<LessonBook> {
    return prisma.lessonBook.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
        isDefault: dto.isDefault ?? false,
        order: dto.order ?? 0,
      },
    });
  }

  async getBookById(id: string): Promise<LessonBook | null> {
    return prisma.lessonBook.findUnique({ where: { id } });
  }

  async getBookByCode(code: string): Promise<LessonBook | null> {
    return prisma.lessonBook.findUnique({ where: { code } });
  }

  async getAllBooks(activeOnly = true): Promise<LessonBook[]> {
    return prisma.lessonBook.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { order: "asc" },
    });
  }

  async getDefaultBook(): Promise<LessonBook | null> {
    return prisma.lessonBook.findFirst({ where: { isDefault: true } });
  }

  async updateBook(id: string, dto: Partial<BookDTO>): Promise<LessonBook> {
    return prisma.lessonBook.update({
      where: { id },
      data: dto,
    });
  }

  async deleteBook(id: string): Promise<void> {
    await prisma.lessonBook.delete({ where: { id } });
  }

  // ============================================
  // GRADE OPERATIONS
  // ============================================

  async createGrade(dto: GradeDTO): Promise<LessonGrade> {
    return prisma.lessonGrade.create({
      data: {
        bookId: dto.bookId,
        code: dto.code,
        name: dto.name,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getGradeById(id: string): Promise<LessonGrade | null> {
    return prisma.lessonGrade.findUnique({ where: { id } });
  }

  async getGradesByBook(bookId: string, activeOnly = true): Promise<LessonGrade[]> {
    return prisma.lessonGrade.findMany({
      where: {
        bookId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { order: "asc" },
    });
  }

  async updateGrade(id: string, dto: Partial<GradeDTO>): Promise<LessonGrade> {
    return prisma.lessonGrade.update({
      where: { id },
      data: dto,
    });
  }

  async deleteGrade(id: string): Promise<void> {
    await prisma.lessonGrade.delete({ where: { id } });
  }

  // ============================================
  // SUBJECT OPERATIONS
  // ============================================

  async createSubject(dto: SubjectDTO): Promise<LessonSubject> {
    return prisma.lessonSubject.create({
      data: {
        gradeId: dto.gradeId,
        code: dto.code,
        name: dto.name,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getSubjectById(id: string): Promise<LessonSubject | null> {
    return prisma.lessonSubject.findUnique({ where: { id } });
  }

  async getSubjectsByGrade(gradeId: string, activeOnly = true): Promise<LessonSubject[]> {
    return prisma.lessonSubject.findMany({
      where: {
        gradeId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { order: "asc" },
    });
  }

  async updateSubject(id: string, dto: Partial<SubjectDTO>): Promise<LessonSubject> {
    return prisma.lessonSubject.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSubject(id: string): Promise<void> {
    await prisma.lessonSubject.delete({ where: { id } });
  }

  // ============================================
  // LESSON OPERATIONS
  // ============================================

  async createLesson(dto: LessonDTO): Promise<Lesson> {
    return prisma.lesson.create({
      data: {
        subjectId: dto.subjectId,
        code: dto.code,
        title: dto.title,
        description: dto.description,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getLessonById(id: string): Promise<Lesson | null> {
    return prisma.lesson.findUnique({
      where: { id },
      include: {
        subject: { include: { grade: { include: { book: true } } } },
        lessonSections: {
          include: { activities: true },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async getLessonsBySubject(subjectId: string, activeOnly = true): Promise<Lesson[]> {
    return prisma.lesson.findMany({
      where: {
        subjectId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { order: "asc" },
    });
  }

  async updateLesson(id: string, dto: Partial<LessonDTO>): Promise<Lesson> {
    return prisma.lesson.update({
      where: { id },
      data: dto,
    });
  }

  async deleteLesson(id: string): Promise<void> {
    await prisma.lesson.delete({ where: { id } });
  }

  // ============================================
  // SECTION OPERATIONS
  // ============================================

  async createSection(dto: LessonSectionDTO): Promise<LessonSection> {
    return prisma.lessonSection.create({
      data: {
        lessonId: dto.lessonId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getSectionById(id: string): Promise<LessonSection | null> {
    return prisma.lessonSection.findUnique({
      where: { id },
      include: { activities: true },
    });
  }

  async getSectionsByLesson(lessonId: string, activeOnly = true): Promise<LessonSection[]> {
    return prisma.lessonSection.findMany({
      where: {
        lessonId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: { activities: true },
      orderBy: { order: "asc" },
    });
  }

  async updateSection(id: string, dto: Partial<LessonSectionDTO>): Promise<LessonSection> {
    return prisma.lessonSection.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSection(id: string): Promise<void> {
    await prisma.lessonSection.delete({ where: { id } });
  }

  // ============================================
  // ACTIVITY OPERATIONS
  // ============================================

  async createActivity(dto: LessonActivityDTO): Promise<LessonActivity> {
    return prisma.lessonActivity.create({
      data: {
        sectionId: dto.sectionId,
        code: dto.code,
        title: dto.title,
        order: dto.order ?? 0,
        summary: dto.summary,
        teachingIntent: dto.teachingIntent,
        knowledge: dto.knowledge,
        keywords: dto.keywords ?? [],
        teachingMethod: dto.teachingMethod,
        expectedTeacherActions: dto.expectedTeacherActions,
        expectedStudentActions: dto.expectedStudentActions,
        expectedOutcome: dto.expectedOutcome,
        estimatedMinutes: dto.estimatedMinutes,
        matchingPatterns: dto.matchingPatterns as object | undefined,
        aliases: dto.aliases ?? [],
        matchWeight: dto.matchWeight ?? 1.0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getActivityById(id: string): Promise<LessonActivity | null> {
    return prisma.lessonActivity.findUnique({ where: { id } });
  }

  async getActivitiesBySection(sectionId: string, activeOnly = true): Promise<LessonActivity[]> {
    return prisma.lessonActivity.findMany({
      where: {
        sectionId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { order: "asc" },
    });
  }

  async getAllActivities(activeOnly = true): Promise<LessonActivity[]> {
    return prisma.lessonActivity.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: { section: { include: { lesson: { include: { subject: true } } } } },
    });
  }

  async getActivitiesByKeywords(keywords: string[], limit = 10): Promise<LessonActivity[]> {
    return prisma.lessonActivity.findMany({
      where: {
        isActive: true,
        keywords: { hasSome: keywords.map((k) => k.toLowerCase()) },
      },
      include: { section: { include: { lesson: { include: { subject: true } } } } },
      take: limit,
    });
  }

  async updateActivity(id: string, dto: Partial<LessonActivityDTO>): Promise<LessonActivity> {
    return prisma.lessonActivity.update({
      where: { id },
      data: {
        code: dto.code,
        title: dto.title,
        order: dto.order,
        summary: dto.summary,
        teachingIntent: dto.teachingIntent,
        knowledge: dto.knowledge,
        keywords: dto.keywords,
        teachingMethod: dto.teachingMethod,
        expectedTeacherActions: dto.expectedTeacherActions,
        expectedStudentActions: dto.expectedStudentActions,
        expectedOutcome: dto.expectedOutcome,
        estimatedMinutes: dto.estimatedMinutes,
        matchingPatterns: dto.matchingPatterns as object | undefined,
        aliases: dto.aliases,
        matchWeight: dto.matchWeight,
        isActive: dto.isActive,
      },
    });
  }

  async deleteActivity(id: string): Promise<void> {
    await prisma.lessonActivity.delete({ where: { id } });
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async bulkCreateActivities(activities: LessonActivityDTO[]): Promise<LessonActivity[]> {
    // Use create instead of createManyAndReturn for compatibility
    const results: LessonActivity[] = [];
    for (const dto of activities) {
      const activity = await prisma.lessonActivity.create({
        data: {
          sectionId: dto.sectionId,
          code: dto.code,
          title: dto.title,
          order: dto.order ?? 0,
          summary: dto.summary,
          teachingIntent: dto.teachingIntent,
          knowledge: dto.knowledge,
          keywords: dto.keywords ?? [],
          teachingMethod: dto.teachingMethod,
          expectedTeacherActions: dto.expectedTeacherActions,
          expectedStudentActions: dto.expectedStudentActions,
          expectedOutcome: dto.expectedOutcome,
          estimatedMinutes: dto.estimatedMinutes,
          matchingPatterns: dto.matchingPatterns as object | undefined,
          aliases: dto.aliases ?? [],
          matchWeight: dto.matchWeight ?? 1.0,
          isActive: dto.isActive ?? true,
        },
      });
      results.push(activity);
    }
    return results;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async getFullLessonHierarchy(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        subject: {
          include: {
            grade: {
              include: { book: true },
            },
          },
        },
        lessonSections: {
          include: {
            activities: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async countBooks(): Promise<number> {
    return prisma.lessonBook.count();
  }

  async countGrades(bookId?: string): Promise<number> {
    return prisma.lessonGrade.count({ where: bookId ? { bookId } : undefined });
  }

  async countSubjects(gradeId?: string): Promise<number> {
    return prisma.lessonSubject.count({ where: gradeId ? { gradeId } : undefined });
  }

  async countLessons(subjectId?: string): Promise<number> {
    return prisma.lesson.count({ where: subjectId ? { subjectId } : undefined });
  }

  async countSections(lessonId?: string): Promise<number> {
    return prisma.lessonSection.count({ where: lessonId ? { lessonId } : undefined });
  }

  async countActivities(sectionId?: string): Promise<number> {
    return prisma.lessonActivity.count({ where: sectionId ? { sectionId } : undefined });
  }
}

export const lessonRepository = new LessonRepository();
