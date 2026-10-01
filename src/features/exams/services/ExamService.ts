import { prisma } from "@/lib/prisma";
import { GamificationService } from "@/features/gamification/GamificationService";
import { SmartExamGeneratorService } from "./SmartExamGeneratorService";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

// Fisher-Yates shuffle
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function calculateScore(correctCount: number, totalCount: number) {
  if (totalCount <= 0) return 0;
  return parseFloat(((correctCount / totalCount) * 100).toFixed(2));
}

interface MatrixItem {
  categoryId: string;
  count: number;
}

type AttemptAnswerCreateInput = Prisma.ExamAttemptAnswerCreateManyInput;

export class ExamService {
  /** Get all published exams */
  async getPublishedExams() {
    try {
      return await prisma.exam.findMany({
        where: { isPublished: true, isCustom: false },
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { name: true } },
          _count: { select: { examQuestions: true } },
        },
      });
    } catch (error) {
      logger.error("Failed to fetch published exams", error as Error);
      throw new Error("FETCH_EXAMS_FAILED");
    }
  }

  /** Get single exam detail */
  async getExamById(id: string) {
    try {
      const exam = await prisma.exam.findUnique({
        where: { id },
        include: {
          examQuestions: {
            orderBy: { sortOrder: "asc" },
            include: {
              question: {
                include: { choices: true, category: { select: { name: true } } },
              },
            },
          },
        },
      });

      if (!exam) {
        throw new Error("EXAM_NOT_FOUND");
      }

      return exam;
    } catch (error) {
      if (error instanceof Error && error.message === "EXAM_NOT_FOUND") {
        throw error;
      }
      logger.error("Failed to fetch exam by ID", error as Error, { examId: id });
      throw new Error("FETCH_EXAM_FAILED");
    }
  }

  /** Recursively collect all subcategory IDs */
  private async getSubcategoryIds(parentId: string, depth = 0): Promise<string[]> {
    // Prevent infinite recursion
    if (depth > 10) {
      logger.warn("Max recursion depth reached in getSubcategoryIds", { parentId, depth });
      return [];
    }

    try {
      const subcats = await prisma.category.findMany({
        where: { parentId },
        select: { id: true },
      });
      const ids = subcats.map((s) => s.id);
      for (const id of ids) {
        const childrenIds = await this.getSubcategoryIds(id, depth + 1);
        ids.push(...childrenIds);
      }
      return ids;
    } catch (error) {
      logger.error("Failed to fetch subcategories", error as Error, { parentId, depth });
      return [];
    }
  }

  /** Generate exam from category matrix — includes subcategory questions */
  async generateExamFromMatrix(data: {
    title: string;
    description?: string | null;
    timeLimit: number;
    matrix: MatrixItem[];
    categoryId?: string | null;
    isCustom?: boolean;
    userId?: string | null;
  }) {
    const chosenQuestionIds: string[] = [];
    const usedQuestionIds = new Set<string>(); // Track used questions to avoid duplicates

    for (const item of data.matrix) {
      // Collect this category + all nested subcategories
      const allCategoryIds = [item.categoryId, ...(await this.getSubcategoryIds(item.categoryId))];

      const randomQuestions = await prisma.question.findMany({
        where: {
          categoryId: { in: allCategoryIds },
          id: { notIn: Array.from(usedQuestionIds) }, // Exclude already used questions
          },
        select: { id: true },
      });

      // Shuffle and pick
      const shuffled = shuffleArray(randomQuestions);
      const needed = Math.min(item.count, shuffled.length);

      if (needed === 0) {
        throw new Error(
          `Không có câu hỏi nào đã duyệt trong danh mục này (bao gồm danh mục con). Vui lòng duyệt câu hỏi trước khi tạo đề.`
        );
      }

      if (shuffled.length < item.count) {
        throw new Error(
          `Không đủ câu hỏi. Yêu cầu: ${item.count}, Hiện có (bao gồm danh mục con): ${shuffled.length}. Vui lòng giảm số câu hoặc import thêm câu hỏi.`
        );
      }

      // Add selected questions and mark as used
      shuffled.slice(0, needed).forEach((q) => {
        chosenQuestionIds.push(q.id);
        usedQuestionIds.add(q.id);
      });
    }

    return prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: data.title,
          description: data.description,
          timeLimit: data.timeLimit,
          isPublished: data.isCustom ? false : true,
          isCustom: data.isCustom ?? false,
          userId: data.userId || null,
          matrix: data.matrix as unknown as Prisma.InputJsonValue,
          categoryId: data.categoryId || null,
        },
      });

      await tx.examQuestion.createMany({
        data: chosenQuestionIds.map((qId, idx) => ({
          examId: exam.id,
          questionId: qId,
          sortOrder: idx + 1,
        })),
      });

      return exam;
    });
  }

  /** Start a new attempt (returns shuffled questions, hides isCorrect) */
  async startAttempt(userId: string, examId: string) {
    const exam = await this.getExamById(examId);
    if (!exam) throw new Error("EXAM_NOT_FOUND");
    if (!exam.isPublished) {
      if (!exam.isCustom || exam.userId !== userId) {
        throw new Error("EXAM_NOT_PUBLISHED");
      }
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        examId,
        score: 0,
        correctCount: 0,
        totalCount: exam.examQuestions.length,
      status: "IN_PROGRESS",
      },
    });

    const bookmarkedQuestionIds = (
      await prisma.bookmark.findMany({
        where: {
          userId,
          questionId: { in: exam.examQuestions.map((eq) => eq.question.id) },
        },
        select: { questionId: true },
      })
    ).map((bookmark) => bookmark.questionId);

    // Shuffle questions and choices, strip isCorrect
    const questions = shuffleArray(
      exam.examQuestions.map((eq) => ({
        id: eq.question.id,
        content: eq.question.content,
        explanation: eq.question.explanation,
        difficulty: eq.question.difficulty,
        categoryName: eq.question.category?.name,
        choices: shuffleArray(
          eq.question.choices.map((c) => ({
            id: c.id,
            content: c.content,
            // isCorrect intentionally omitted
          }))
        ),
      }))
    );

    return {
      attemptId: attempt.id,
      timeLimit: exam.timeLimit,
      questions,
      bookmarkedQuestionIds,
    };
  }

  /** Score and submit attempt */
  async submitAttempt(
    attemptId: string,
    userId: string,
    answers: { questionId: string; selectedChoiceId: string | null }[]
  ) {
    // Tăng timeout từ 5s lên 15s
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({
        where: { id: attemptId },
        include: {
          exam: {
            include: {
              examQuestions: {
                include: { question: { include: { choices: true } } },
              },
            },
          },
        },
      });

      if (!attempt) throw new Error("ATTEMPT_NOT_FOUND");
      if (attempt.userId !== userId) throw new Error("FORBIDDEN");
      if (attempt.status !== "IN_PROGRESS") throw new Error("ALREADY_SUBMITTED");

      // Check time expiry (timeLimit seconds + 30s grace)
      const expiresAt = new Date(
        attempt.startedAt.getTime() + (attempt.exam.timeLimit + 30) * 1000
      );
      const now = new Date();
      const isExpired = now > expiresAt;

      const totalCount = attempt.exam.examQuestions.length;
      let correctCount = 0;
      const answersToCreate: AttemptAnswerCreateInput[] = [];
      const wrongAnswersToUpsert: { userId: string; questionId: string }[] = [];

      for (const eq of attempt.exam.examQuestions) {
        const q = eq.question;
        const correctChoice = q.choices.find((c) => c.isCorrect);
        const userAns = answers.find((ua) => ua.questionId === q.id);
        const selectedChoiceId = userAns?.selectedChoiceId ?? null;
        const isCorrect = !!selectedChoiceId && selectedChoiceId === correctChoice?.id;

        if (isCorrect) {
          correctCount++;
        } else {
          wrongAnswersToUpsert.push({ userId: attempt.userId, questionId: q.id });
        }

        answersToCreate.push({
          attemptId: attempt.id,
          questionId: q.id,
          selectedChoiceId,
          isCorrect,
        });
      }

      const score = calculateScore(correctCount, totalCount);

      // Batch all writes in transaction
      await tx.examAttempt.update({
        where: { id: attempt.id },
        data: {
          score,
          correctCount,
          totalCount,
          status: isExpired ? "SYSTEM_SUBMITTED" : "SUBMITTED",
          submittedAt: now,
        },
      });

      await tx.examAttemptAnswer.createMany({ data: answersToCreate });

      // Batch upsert wrong answers - OPTIMIZED
      if (wrongAnswersToUpsert.length > 0) {
        await Promise.all(
          wrongAnswersToUpsert.map(item =>
            tx.userWrongAnswer.upsert({
              where: { userId_questionId: { userId: item.userId, questionId: item.questionId } },
              create: { userId: item.userId, questionId: item.questionId, wrongCount: 1, lastAnsweredAt: now },
              update: { wrongCount: { increment: 1 }, lastAnsweredAt: now },
            })
          )
        );
      }

      return {
        score,
        correctCount,
        totalCount,
        isExpired,
        userId: attempt.userId,
        answersToCreate // Return for post-processing
      };
    }, {
      maxWait: 10000, // 10s max wait to acquire connection
      timeout: 15000, // 15s total timeout (was 5s default)
    }).then(async (result) => {
      // Move heavy operations OUTSIDE transaction
      try {
        const gamificationService = new GamificationService();
        const isPerfectScore = result.score === 100;

        // Run gamification async (don't block)
        await Promise.all([
          gamificationService.awardExamXP(result.userId, result.correctCount, result.totalCount, isPerfectScore),
          gamificationService.updateStreak(result.userId),
        ]);

        // Update question progress in background
        const smartService = new SmartExamGeneratorService();
        await Promise.all(
          result.answersToCreate.map(answer =>
            smartService.updateQuestionProgress(
              result.userId,
              answer.questionId,
              answer.isCorrect || false,
              undefined
            )
          )
        );
      } catch (error) {
        // Log but don't fail - gamification is not critical
        logger.error("Post-submit processing failed (non-critical)", error as Error, {
          userId: result.userId,
          attemptId,
        });
      }

      // Return clean result
      return {
        score: result.score,
        correctCount: result.correctCount,
        totalCount: result.totalCount,
        isExpired: result.isExpired,
      };
    });
  }

  /** Get user's exam history */
  async getUserAttempts(userId: string) {
    return prisma.examAttempt.findMany({
      where: { userId, status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] } },
      orderBy: { submittedAt: "desc" },
      include: { exam: { select: { title: true, timeLimit: true } } },
    });
  }

  /** Get attempt review with full answers */
  async getAttemptReview(attemptId: string, userId: string) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            question: { include: { choices: true, category: { select: { name: true } } } },
            choice: true,
          },
        },
        exam: { select: { title: true } },
      },
    });
    if (!attempt) throw new Error("ATTEMPT_NOT_FOUND");
    if (attempt.userId !== userId) throw new Error("FORBIDDEN");
    return attempt;
  }

  /** Get score trend for charts */
  async getScoreTrend(userId: string, limit = 10) {
    const attempts = await prisma.examAttempt.findMany({
      where: { userId, status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] } },
      orderBy: { startedAt: "asc" },
      take: limit,
      select: { startedAt: true, score: true, exam: { select: { title: true } } },
    });
    return attempts.map((a) => ({
      date: new Date(a.startedAt).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" }),
      score: a.score,
      examTitle: a.exam.title,
    }));
  }

  /** Get pass/fail ratio */
  async getPassFailRatio(userId: string) {
    const attempts = await prisma.examAttempt.findMany({
      where: { userId, status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] } },
      select: { score: true },
    });
    let passed = 0, failed = 0;
    attempts.forEach((a) => { if (a.score >= 50) passed++; else failed++; });
    return [
      { name: "Đạt (≥50 điểm)", value: passed, color: "#10b981" },
      { name: "Không đạt (<50 điểm)", value: failed, color: "#ef4444" },
    ];
  }

  /** Get user wrong answers for review */
  async getUserWrongAnswers(userId: string) {
    return prisma.userWrongAnswer.findMany({
      where: { userId },
      orderBy: { wrongCount: "desc" },
      include: {
        question: {
          include: { choices: true, category: { select: { name: true } } },
        },
      },
    });
  }

  /** Get user bookmarks */
  async getUserBookmarks(userId: string) {
    return prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        question: {
          include: { choices: true, category: { select: { name: true } } },
        },
      },
    });
  }

  /** Get bookmark state for a specific question */
  async getBookmarkState(userId: string, questionId: string) {
    const bookmark = await prisma.bookmark.findUnique({
      where: { userId_questionId: { userId, questionId } },
      select: { id: true },
    });

    return { bookmarked: !!bookmark };
  }

  /** Toggle bookmark */
  async toggleBookmark(userId: string, questionId: string) {
    const existing = await prisma.bookmark.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    if (existing) {
      await prisma.bookmark.delete({ where: { userId_questionId: { userId, questionId } } });
      return { bookmarked: false };
    }
    await prisma.bookmark.create({ data: { userId, questionId } });
    return { bookmarked: true };
  }
}
