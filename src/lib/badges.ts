export const BADGES = {
  first_exam: { icon: "🎯", name: "Khởi đầu", color: "text-primary" },
  exam_master_10: { icon: "📚", name: "Siêng năng", color: "text-success" },
  exam_master_50: { icon: "🏆", name: "Chuyên gia", color: "text-warning" },
  perfect_score: { icon: "💯", name: "Hoàn hảo", color: "text-primary" },
  streak_7: { icon: "🔥", name: "Kiên trì 7 ngày", color: "text-warning" },
  streak_30: { icon: "⚡", name: "Kiên trì 30 ngày", color: "text-destructive" },
  level_5: { icon: "⭐", name: "Cấp 5", color: "text-primary" },
  level_10: { icon: "💎", name: "Cấp 10", color: "text-primary" },
  mastery_50: { icon: "🎓", name: "Thành thạo 50 câu", color: "text-success" },
} as const;

export type BadgeId = keyof typeof BADGES;
