import { prisma } from "@/lib/prisma";

interface QuestionWeight {
  questionId: string;
  weight: number;
  reason: string;
}

export class SmartExamGeneratorService {
  /**
   * Generate smart exam prioritizing:
   * 1. Never encountered questions (highest priority)
   * 2. Frequently wrong questions
   * 3. Long time not reviewed
   * 4. Low mastery level
   * 5. Decrease weight for frequently correct questions
   */
  async generateSmartExam(
    userId: string,
    categoryIds: string[],
    totalQuestions: number,
    difficulty?: ("EASY" | "MEDIUM" | "HARD")[]
  ): Promise<string[]> {
    // Get all questions in categories
    const allQuestions = await prisma.question.findMany({
      where: {
        categoryId: { in: categoryIds },
        ...(difficulty && difficulty.length > 0 ? { difficulty: { in: difficulty } } : {}),
      },
      select: { id: true },
    });

    if (allQuestions.length === 0) return [];

    // Get user progress for these questions
    const userProgress = await prisma.userQuestionProgress.findMany({
      where: {
        userId,
        questionId: { in: allQuestions.map((q) => q.id) },
      },
    });

    const progressMap = new Map(userProgress.map((p) => [p.questionId, p]));

    // Calculate weight for each question
    const weights: QuestionWeight[] = allQuestions.map((q) => {
      const progress = progressMap.get(q.id);

      if (!progress) {
        // Never encountered - highest priority
        return {
          questionId: q.id,
          weight: 100,
          reason: "never_encountered",
        };
      }

      let weight = 50; // Base weight

      // Factor 1: Accuracy (lower accuracy = higher weight)
      if (progress.accuracy < 40) {
        weight += 30;
      } else if (progress.accuracy < 60) {
        weight += 20;
      } else if (progress.accuracy < 80) {
        weight += 10;
      } else if (progress.accuracy >= 90) {
        weight -= 20; // Reduce weight for mastered questions
      }

      // Factor 2: Mastery level (lower mastery = higher weight)
      weight += (5 - progress.masteryLevel) * 5;

      // Factor 3: Time since last review (longer = higher weight)
      if (progress.lastReviewedAt) {
        const daysSinceReview = Math.floor(
          (Date.now() - progress.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceReview > 30) {
          weight += 15;
        } else if (daysSinceReview > 14) {
          weight += 10;
        } else if (daysSinceReview > 7) {
          weight += 5;
        }
      } else {
        weight += 15; // Never reviewed = high priority
      }

      // Factor 4: Frequently wrong
      if (progress.timesWrong > progress.timesCorrect * 2) {
        weight += 15;
      }

      return {
        questionId: q.id,
        weight: Math.max(0, Math.min(100, weight)),
        reason: progress.accuracy < 60 ? "frequently_wrong" : progress.masteryLevel < 3 ? "low_mastery" : "review_needed",
      };
    });

    // Sort by weight descending
    weights.sort((a, b) => b.weight - a.weight);

    // Take top questions, but add some randomness to avoid always same order
    const topQuestions = weights.slice(0, Math.min(totalQuestions * 2, weights.length));

    // Weighted random selection from top candidates
    const selected: string[] = [];
    const candidates = [...topQuestions];

    while (selected.length < totalQuestions && candidates.length > 0) {
      const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < candidates.length; i++) {
        random -= candidates[i].weight;
        if (random <= 0) {
          selected.push(candidates[i].questionId);
          candidates.splice(i, 1);
          break;
        }
      }
    }

    // If not enough, fill with random questions
    if (selected.length < totalQuestions) {
      const remaining = allQuestions
        .map((q) => q.id)
        .filter((id) => !selected.includes(id))
        .slice(0, totalQuestions - selected.length);
      selected.push(...remaining);
    }

    // Shuffle final selection
    return this.shuffle(selected);
  }

  /**
   * Update question progress after answering
   */
  async updateQuestionProgress(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    timeSpent?: number
  ) {
    const existing = await prisma.userQuestionProgress.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });

    const now = new Date();

    if (!existing) {
      // Create new progress
      await prisma.userQuestionProgress.create({
        data: {
          userId,
          questionId,
          timesEncountered: 1,
          timesCorrect: isCorrect ? 1 : 0,
          timesWrong: isCorrect ? 0 : 1,
          accuracy: isCorrect ? 100 : 0,
          avgTimeSpent: timeSpent || null,
          lastReviewedAt: now,
          masteryLevel: isCorrect ? 1 : 0,
          nextReviewDate: this.calculateNextReview(1, isCorrect),
        },
      });
    } else {
      // Update existing
      const newEncountered = existing.timesEncountered + 1;
      const newCorrect = existing.timesCorrect + (isCorrect ? 1 : 0);
      const newWrong = existing.timesWrong + (isCorrect ? 0 : 1);
      const newAccuracy = (newCorrect / newEncountered) * 100;

      const newAvgTime = timeSpent
        ? existing.avgTimeSpent
          ? (existing.avgTimeSpent * existing.timesEncountered + timeSpent) / newEncountered
          : timeSpent
        : existing.avgTimeSpent;

      // Update mastery level (0-5)
      let newMastery = existing.masteryLevel;
      if (isCorrect) {
        if (newAccuracy >= 90 && newEncountered >= 5) {
          newMastery = Math.min(5, existing.masteryLevel + 1);
        }
      } else {
        newMastery = Math.max(0, existing.masteryLevel - 1);
      }

      await prisma.userQuestionProgress.update({
        where: { userId_questionId: { userId, questionId } },
        data: {
          timesEncountered: newEncountered,
          timesCorrect: newCorrect,
          timesWrong: newWrong,
          accuracy: newAccuracy,
          avgTimeSpent: newAvgTime,
          lastReviewedAt: now,
          masteryLevel: newMastery,
          nextReviewDate: this.calculateNextReview(newMastery, isCorrect),
        },
      });
    }
  }

  /**
   * Calculate next review date using spaced repetition
   */
  private calculateNextReview(masteryLevel: number, wasCorrect: boolean): Date {
    const now = new Date();
    let daysToAdd = 1;

    if (wasCorrect) {
      // Exponential spacing
      const intervals = [1, 3, 7, 14, 30, 60]; // days
      daysToAdd = intervals[Math.min(masteryLevel, intervals.length - 1)];
    } else {
      // Wrong answer - review sooner
      daysToAdd = 1;
    }

    now.setDate(now.getDate() + daysToAdd);
    return now;
  }

  /**
   * Shuffle array
   */
  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
