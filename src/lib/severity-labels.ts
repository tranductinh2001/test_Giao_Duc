// Vietnamese labels for severity levels
export const SEVERITY_LABELS = {
  CRITICAL: "Nghiêm trọng",
  ERROR: "Lỗi",
  WARNING: "Cảnh báo",
  INFO: "Gợi ý",
} as const;

export const SEVERITY_COLORS = {
  CRITICAL: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800",
    icon: "🔴",
  },
  ERROR: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-800",
    icon: "🟠",
  },
  WARNING: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
    icon: "🟡",
  },
  INFO: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    icon: "💡",
  },
} as const;

export type SeverityType = keyof typeof SEVERITY_LABELS;

export function getSeverityLabel(severity: SeverityType): string {
  return SEVERITY_LABELS[severity] || severity;
}

export function getSeverityColor(severity: SeverityType) {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS.INFO;
}
