/**
 * Integration Tests for Knowledge Mapping Repositories
 *
 * Phase 2: Test repository operations with real database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";

// Test database URL
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://localhost:5432/education_test";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
});

describe("LessonRepository Integration", () => {
  let bookId: string;
  let gradeId: string;
  let subjectId: string;
  let lessonId: string;
  let sectionId: string;

  beforeAll(async () => {
    // Connect to test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.lessonActivity.deleteMany({
      where: { section: { lesson: { subject: { grade: { book: { code: "TEST_BOOK" } } } } } },
    });
    await prisma.lessonSection.deleteMany({
      where: { lesson: { subject: { grade: { book: { code: "TEST_BOOK" } } } } },
    });
    await prisma.lesson.deleteMany({
      where: { subject: { grade: { book: { code: "TEST_BOOK" } } } },
    });
    await prisma.lessonSubject.deleteMany({
      where: { grade: { book: { code: "TEST_BOOK" } } },
    });
    await prisma.lessonGrade.deleteMany({
      where: { book: { code: "TEST_BOOK" } },
    });
    await prisma.lessonBook.deleteMany({
      where: { code: "TEST_BOOK" },
    });
  });

  describe("Book Operations", () => {
    it("should create a book", async () => {
      const { LessonRepository } = await import("../repositories/LessonRepository");
      const repo = new LessonRepository();

      const book = await repo.createBook({
        code: "TEST_BOOK",
        name: "Test Book",
        description: "Test Description",
      });

      expect(book.id).toBeDefined();
      expect(book.code).toBe("TEST_BOOK");
      expect(book.name).toBe("Test Book");
      bookId = book.id;
    });

    it("should get book by code", async () => {
      const { LessonRepository } = await import("../repositories/LessonRepository");
      const repo = new LessonRepository();

      const book = await repo.getBookByCode("TEST_BOOK");
      expect(book).not.toBeNull();
      expect(book?.name).toBe("Test Book");
    });

    it("should get all books", async () => {
      const { LessonRepository } = await import("../repositories/LessonRepository");
      const repo = new LessonRepository();

      const books = await repo.getAllBooks();
      expect(books.length).toBeGreaterThan(0);
    });
  });

  describe("Grade Operations", () => {
    it("should create a grade", async () => {
      const { LessonRepository } = await import("../repositories/LessonRepository");
      const repo = new LessonRepository();

      const grade = await repo.createGrade({
        bookId,
        code: "1",
        name: "Lớp 1",
        order: 0,
      });

      expect(grade.id).toBeDefined();
      expect(grade.code).toBe("1");
      gradeId = grade.id;
    });

    it("should get grades by book", async () => {
      const { LessonRepository } = await import("../repositories/LessonRepository");
      const repo = new LessonRepository();

      const grades = await repo.getGradesByBook(bookId);
      expect(grades.length).toBe(1);
      expect(grades[0].code).toBe("1");
    });
  });

  describe("Subject Operations", () => {
    it("should create a subject", async () => {
      const { LessonRepository } = await import("../repositories/LessonRepository");
      const repo = new LessonRepository();

      const subject = await repo.createSubject({
        gradeId,
        code: "TOAN",
        name: "Toán",
        order: 0,
      });

      expect(subject.id).toBeDefined();
      expect(subject.code).toBe("TOAN");
      subjectId = subject.id;
    });
  });

  describe("Lesson Operations", () => {
    it("should create a lesson", async () => {
      const { LessonRepository } = await import("../repositories/LessonRepository");
      const repo = new LessonRepository();

      const lesson = await repo.createLesson({
        subjectId,
        code: "LESSON_001",
        title: "Phép cộng trong phạm vi 10",
        order: 0,
      });

      expect(lesson.id).toBeDefined();
      expect(lesson.title).toBe("Phép cộng trong phạm vi 10");
      lessonId = lesson.id;
    });
  });

  describe("Section Operations", () => {
    it("should create a section", async () => {
      const { LessonRepository } = await import("../repositories/LessonRepository");
      const repo = new LessonRepository();

      const section = await repo.createSection({
        lessonId,
        code: "WARM_UP",
        name: "Khởi động",
        order: 0,
      });

      expect(section.id).toBeDefined();
      expect(section.code).toBe("WARM_UP");
      sectionId = section.id;
    });
  });

  describe("Activity Operations", () => {
    it("should create an activity", async () => {
      const { LessonRepository } = await import("../repositories/LessonRepository");
      const repo = new LessonRepository();

      const activity = await repo.createActivity({
        sectionId,
        code: "ACT_001",
        title: "Hát bài hát khởi động",
        order: 0,
        keywords: ["hát", "khởi động"],
        aliases: ["bài hát"],
        teachingIntent: "Tạo không khí vui vẻ",
        knowledge: "Hát đúng giai điệu",
        expectedTeacherActions: "Hướng dẫn hát",
        expectedStudentActions: "Hát theo",
        expectedOutcome: "HS hát được bài",
      });

      expect(activity.id).toBeDefined();
      expect(activity.title).toBe("Hát bài hát khởi động");
      expect(activity.keywords).toContain("hát");
      expect(activity.keywords).toContain("khởi động");
    });

    it("should get activities by keywords", async () => {
      const { LessonRepository } = await import("../repositories/LessonRepository");
      const repo = new LessonRepository();

      const activities = await repo.getActivitiesByKeywords(["hát"], 10);
      expect(activities.length).toBeGreaterThan(0);
      expect(activities[0].keywords).toContain("hát");
    });
  });
});

describe("MappingResultRepository Integration", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should create and retrieve mapping results", async () => {
    const { MappingResultRepository } = await import("../repositories/MappingResultRepository");
    const repo = new MappingResultRepository();

    // First create a test activity
    const book = await prisma.lessonBook.create({
      data: {
        code: "MAP_TEST_BOOK",
        name: "Mapping Test Book",
      },
    });

    const grade = await prisma.lessonGrade.create({
      data: {
        bookId: book.id,
        code: "1",
        name: "Lớp 1",
      },
    });

    const subject = await prisma.lessonSubject.create({
      data: {
        gradeId: grade.id,
        code: "TOAN",
        name: "Toán",
      },
    });

    const lesson = await prisma.lesson.create({
      data: {
        subjectId: subject.id,
        code: "LESSON_001",
        title: "Test Lesson",
      },
    });

    const section = await prisma.lessonSection.create({
      data: {
        lessonId: lesson.id,
        code: "WARM_UP",
        name: "Khởi động",
      },
    });

    const activity = await prisma.lessonActivity.create({
      data: {
        sectionId: section.id,
        code: "ACT_001",
        title: "Test Activity",
        keywords: ["test"],
      },
    });

    // Create mapping result
    const result = await repo.create({
      lessonPlanId: "lp_001",
      activityId: activity.id,
      confidence: 85.5,
      matchedBy: "KEYWORD",
      matchScore: 85.5,
      documentSectionCode: "WARM_UP",
      documentSectionTitle: "Khởi động",
      documentActivityTitle: "Test Document Activity",
    });

    expect(result.id).toBeDefined();
    expect(result.confidence).toBe(85.5);

    // Retrieve
    const retrieved = await repo.getByLessonPlan("lp_001");
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].confidence).toBe(85.5);

    // Cleanup
    await prisma.lessonActivity.delete({ where: { id: activity.id } });
    await prisma.lessonSection.delete({ where: { id: section.id } });
    await prisma.lesson.delete({ where: { id: lesson.id } });
    await prisma.lessonSubject.delete({ where: { id: subject.id } });
    await prisma.lessonGrade.delete({ where: { id: grade.id } });
    await prisma.lessonBook.delete({ where: { id: book.id } });
  });
});
