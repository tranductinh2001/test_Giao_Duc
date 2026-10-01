"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Save,
  Sparkles,
  Download,
  History,
  FileText,
  Settings,
} from "lucide-react";
import Button from "@/components/ui/button";

interface EditorToolbarProps {
  lessonPlanId: string;
  lessonPlanTitle?: string;
  onAnalyze?: () => void;
  onSave?: () => void;
  onAutoFix?: () => void;
  analyzing?: boolean;
  saving?: boolean;
}

export default function EditorToolbar({
  lessonPlanId,
  lessonPlanTitle = "Giáo án",
  onAnalyze,
  onSave,
  onAutoFix,
  analyzing = false,
  saving = false,
}: EditorToolbarProps) {
  return (
    <div className="border-b border-border bg-card px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-4">
          <Link
            href={`/lesson-plans/${lessonPlanId}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Quay lại
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">{lessonPlanTitle}</span>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={saving}
              isLoading={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          )}

          {onAnalyze && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAnalyze}
              disabled={analyzing}
              isLoading={analyzing}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {analyzing ? "Đang phân tích..." : "Phân tích giáo án"}
            </Button>
          )}

          {onAutoFix && (
            <Button variant="outline" size="sm" onClick={onAutoFix}>
              <Settings className="w-4 h-4 mr-2" />
              Tự động sửa
            </Button>
          )}

          <a href={`/api/lesson-plans/${lessonPlanId}/export?format=docx`} download>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              DOCX
            </Button>
          </a>

          <a href={`/api/lesson-plans/${lessonPlanId}/export?format=pdf`} download>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </a>

          <Link href={`/lesson-plans/${lessonPlanId}/versions`}>
            <Button variant="outline" size="sm">
              <History className="w-4 h-4 mr-2" />
              Lịch sử
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
