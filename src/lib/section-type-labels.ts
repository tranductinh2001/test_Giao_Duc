// Lightweight section type label mapping — safe for client components
// (No Node.js dependencies, unlike section-detector.ts)

export const SECTION_TYPE_LABELS: Record<string, string> = {
  HEADER: "Thông tin chung",
  OBJECTIVES: "Mục tiêu",
  PREPARATION: "Chuẩn bị",
  TEACHING_EQUIPMENT: "Thiết bị dạy học",
  LEARNING_MATERIALS: "Học liệu",
  WARM_UP: "Khởi động",
  KNOWLEDGE_FORMATION: "Hình thành kiến thức",
  PRACTICE: "Luyện tập",
  APPLICATION: "Vận dụng",
  EVALUATION: "Đánh giá",
  HOMEWORK: "Dặn dò",
  TEACHING_PROCESS: "Tiến trình dạy học",
  APPENDIX: "Phụ lục",
  OTHER: "Khác",
};

export function getSectionTypeLabel(type: string): string {
  return SECTION_TYPE_LABELS[type] || type;
}

export const SECTION_TYPE_OPTIONS = Object.entries(SECTION_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);
