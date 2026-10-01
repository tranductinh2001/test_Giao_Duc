import { prisma } from "@/lib/prisma";

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  condition: (stats: UserStats) => boolean;
}

interface UserStats {
  totalAttempts: number;
  totalCorrect: number;
  averageScore: number;
  streak: number;
  level: number;
  masteredQuestions: number;
}

const BADGES: BadgeDefinition[] = [
  {
    id: "first_exam",
    name: "🎯 Khởi đầu",
    description: "Hoàn thành bài thi đầu tiên",
    condition: (s) => s.totalAttempts >= 1,
  },
  {
    id: "exam_master_10",
    name: "📚 Siêng năng",
    description: "Hoàn thành 10 bài thi",
    condition: (s) => s.totalAttempts >= 10,
  },
  {
    id: "exam_master_50",
    name: "🏆 Chuyên gia",
    description: "Hoàn thành 50 bài thi",
    condition: (s) => s.totalAttempts >= 50,
  },
  {
    id: "perfect_score",
    name: "💯 Hoàn hảo",
    description: "Đạt 100 điểm trong một bài thi",
    condition: (s) => s.averageScore === 100, // Check in specific attempt
  },
  {
    id: "streak_7",
    name: "🔥 Kiên trì 7 ngày",
    description: "Học liên tục 7 ngày",
    condition: (s) => s.streak >= 7,
  },
  {
    id: "streak_30",
    name: "⚡ Kiên trì 30 ngày",
    description: "Học liên tục 30 ngày",
    condition: (s) => s.streak >= 30,
  },
  {
    id: "level_5",
    name: "⭐ Cấp 5",
    description: "Đạt cấp độ 5",
    condition: (s) => s.level >= 5,
  },
  {
    id: "level_10",
    name: "💎 Cấp 10",
    description: "Đạt cấp độ 10",
    condition: (s) => s.level >= 10,
  },
  {
    id: "mastery_50",
    name: "🎓 Thành thạo 50 câu",
    description: "Đạt mức thành thạo trên 50 câu hỏi",
    condition: (s) => s.masteredQuestions >= 50,
  },
];

export class GamificationService {
  private readonly XP_PER_CORRECT = 10;
  private readonly XP_PER_WRONG = 5;
  private readonly XP_PER_EXAM_COMPLETE = 50;
  private readonly XP_STREAK_BONUS = 100;
  private readonly XP_PER_LEVEL = 100;

  /**
   * Award XP and update level after exam completion
   */
  async awardExamXP(
    userId: string,
    correctCount: number,
    totalCount: number,
    isPerfectScore: boolean
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, badges: true },
    });

    if (!user) return;

    const xpEarned =
      correctCount * this.XP_PER_CORRECT +
      (totalCount - correctCount) * this.XP_PER_WRONG +
      this.XP_PER_EXAM_COMPLETE;

    const newXP = user.xp + xpEarned;
    const newLevel = Math.floor(newXP / this.XP_PER_LEVEL) + 1;

    const updates: any = { xp: newXP, level: newLevel };

    // Check for new badges
    const stats = await this.getUserStats(userId);
    const newBadges = await this.checkBadges(user.badges, stats, isPerfectScore);

    if (newBadges.length > 0) {
      updates.badges = [...user.badges, ...newBadges];
    }

    await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    return { xpEarned, newLevel, newBadges };
  }

  /**
   * Update streak
   */
  async updateStreak(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true, lastActiveDate: true, xp: true, badges: true },
    });

    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
    }

    let newStreak = user.streak;
    let bonusXP = 0;

    if (!lastActive) {
      // First time
      newStreak = 1;
    } else {
      const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Same day, no change
        return;
      } else if (daysDiff === 1) {
        // Consecutive day
        newStreak++;
        if (newStreak % 7 === 0) {
          bonusXP = this.XP_STREAK_BONUS;
        }
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    const updates: any = {
      streak: newStreak,
      lastActiveDate: new Date(),
    };

    if (bonusXP > 0) {
      updates.xp = user.xp + bonusXP;
    }

    // Check streak badges
    const stats = await this.getUserStats(userId);
    stats.streak = newStreak;
    const newBadges = await this.checkBadges(user.badges, stats, false);

    if (newBadges.length > 0) {
      updates.badges = [...user.badges, ...newBadges];
    }

    await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    return { newStreak, bonusXP, newBadges };
  }

  /**
   * Get user stats for badge checking
   */
  private async getUserStats(userId: string): Promise<UserStats> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true, streak: true },
    });

    const attempts = await prisma.examAttempt.findMany({
      where: {
        userId,
        status: { in: ["SUBMITTED", "SYSTEM_SUBMITTED"] },
      },
      select: { score: true, correctCount: true },
    });

    const masteredCount = await prisma.userQuestionProgress.count({
      where: { userId, masteryLevel: { gte: 4 } },
    });

    const totalAttempts = attempts.length;
    const totalCorrect = attempts.reduce((sum, a) => sum + a.correctCount, 0);
    const averageScore = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
      : 0;

    return {
      totalAttempts,
      totalCorrect,
      averageScore,
      streak: user?.streak || 0,
      level: user?.level || 1,
      masteredQuestions: masteredCount,
    };
  }

  /**
   * Check which badges user earned
   */
  private async checkBadges(
    currentBadges: string[],
    stats: UserStats,
    isPerfectScore: boolean
  ): Promise<string[]> {
    const newBadges: string[] = [];

    for (const badge of BADGES) {
      if (currentBadges.includes(badge.id)) continue;

      // Special case for perfect score
      if (badge.id === "perfect_score" && isPerfectScore) {
        newBadges.push(badge.id);
        continue;
      }

      if (badge.condition(stats)) {
        newBadges.push(badge.id);
      }
    }

    return newBadges;
  }

  /**
   * Get badge details
   */
  getBadgeInfo(badgeId: string): BadgeDefinition | undefined {
    return BADGES.find((b) => b.id === badgeId);
  }

  /**
   * Get all available badges
   */
  getAllBadges(): BadgeDefinition[] {
    return BADGES;
  }
}
