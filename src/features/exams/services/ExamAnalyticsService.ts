import { prisma } from "@/lib/prisma";

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

interface AttemptAnalysis {
  score: number;
  correctCount: number;
  totalCount: number;
  categoryStats: CategoryStats[];
  weakCategories: CategoryStats[];
  recommendations: string[];
}

export class ExamAnalyticsService {
  /**
   * Analyze attempt results by category
   */
  async analyzeAttempt(attemptId: string, userId: string): Promise<AttemptAnalysis> {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            question: {
              include: {
                category: { select: { id: true, name: true } },
                choices: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) throw new Error("ATTEMPT_NOT_FOUND");
    if (attempt.userId !== userId) throw new Error("FORBIDDEN");

    // Group by category
    const categoryMap = new Map<string, { name: string; total: number; correct: number }>();

    for (const answer of attempt.answers) {
      const categoryId = answer.question.category?.id || "uncategorized";
      const categoryName = answer.question.category?.name || "Chưa phân loại";

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, { name: categoryName, total: 0, correct: 0 });
      }

      const stats = categoryMap.get(categoryId)!;
      stats.total++;
      if (answer.isCorrect) stats.correct++;
    }

    // Build category stats
    const categoryStats: CategoryStats[] = Array.from(categoryMap.entries()).map(
      ([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        totalQuestions: data.total,
        correctAnswers: data.correct,
        accuracy: Math.round((data.correct / data.total) * 100),
      })
    );

    // Sort by accuracy ascending
    categoryStats.sort((a, b) => a.accuracy - b.accuracy);

    // Weak categories (accuracy < 60%)
    const weakCategories = categoryStats.filter((c) => c.accuracy < 60);

    // Generate recommendations
    const recommendations: string[] = [];

    if (attempt.score < 50) {
      recommendations.push("Bạn cần ôn luyện thêm để đạt điểm chuẩn (≥50 điểm).");
    } else if (attempt.score < 70) {
      recommendations.push("Kết quả khá tốt! Cố gắng thêm để đạt mức điểm cao hơn.");
    } else if (attempt.score < 85) {
      recommendations.push("Bạn đã làm rất tốt! Tiếp tục duy trì phong độ.");
    } else {
      recommendations.push("Xuất sắc! Bạn đã thành thạo nội dung bài thi này.");
    }

    if (weakCategories.length > 0) {
      recommendations.push(
        `Nên ôn tập thêm các chuyên đề: ${weakCategories.map((c) => c.categoryName).join(", ")}.`
      );
    }

    if (attempt.totalCount - attempt.correctCount > attempt.totalCount * 0.3) {
      recommendations.push("Hãy xem lại giải thích các câu sai để hiểu rõ hơn.");
    }

    return {
      score: attempt.score,
      correctCount: attempt.correctCount,
      totalCount: attempt.totalCount,
      categoryStats,
      weakCategories,
      recommendations,
    };
  }

  /**
   * Get user's overall performance across all attempts
   */
  async getUserOverallStats(userId: string) {
    const attempts = await prisma.examAttempt.findMany({
      where: {
        userId,
        status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] },
      },
      select: {
        score: true,
        correctCount: true,
        totalCount: true,
      },
    });

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        totalCorrect: 0,
        totalQuestions: 0,
      };
    }

    const totalCorrect = attempts.reduce((sum, a) => sum + a.correctCount, 0);
    const totalQuestions = attempts.reduce((sum, a) => sum + a.totalCount, 0);
    const averageScore = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length;
    const passedAttempts = attempts.filter((a) => a.score >= 50).length;

    return {
      totalAttempts: attempts.length,
      averageScore: Math.round(averageScore),
      passRate: Math.round((passedAttempts / attempts.length) * 100),
      totalCorrect,
      totalQuestions,
    };
  }
}
