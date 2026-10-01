import { type SeverityType } from "./severity-labels";

export type ProcessingStatus =
  | "analyzing"
  | "checking"
  | "reviewing"
  | "generating"
  | "complete"
  | "error";

export const PROCESSING_STATUS_LABELS = {
  analyzing: "Đang phân tích...",
  checking: "Đang kiểm tra...",
  reviewing: "Đang đánh giá...",
  generating: "Đang tạo đề xuất...",
  complete: "Hoàn tất",
  error: "Lỗi",
} as const;

export const PROCESSING_STATUS_COLORS = {
  analyzing: "bg-blue-50 text-blue-700 border-blue-200",
  checking: "bg-purple-50 text-purple-700 border-purple-200",
  reviewing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  generating: "bg-green-50 text-green-700 border-green-200",
  complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-red-50 text-red-700 border-red-200",
} as const;

export function getStatusLabel(status: ProcessingStatus): string {
  return PROCESSING_STATUS_LABELS[status];
}

export function getStatusColor(status: ProcessingStatus): string {
  return PROCESSING_STATUS_COLORS[status];
}

export interface ProcessingIndicatorProps {
  status: ProcessingStatus;
  message?: string;
}

export function ProcessingIndicator({ status, message }: ProcessingIndicatorProps) {
  const label = message || getStatusLabel(status);
  const colorClass = getStatusColor(status);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${colorClass} animate-pulse`}>
      <span className="w-2 h-2 rounded-full bg-current animate-ping" />
      {label}
    </div>
  );
}
