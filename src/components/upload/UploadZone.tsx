'use client';

import { useState, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Target,
  Layers,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  onLoadSample?: () => void;
  isLoading: boolean;
  progress: string;
  error: string | null;
  isQuotaExceeded?: boolean;
}

export default function UploadZone({
  onFileUpload,
  onLoadSample,
  isLoading,
  progress,
  error,
  isQuotaExceeded = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.pdf') || lower.endsWith('.docx') || file.type === 'application/pdf') {
          onFileUpload(file);
        }
      }
    },
    [onFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center py-4 sm:py-8 px-4">
      {/* Header Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3 shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>Hệ thống AI Thẩm định Kế hoạch Bài dạy (CV 5512 & 2345)</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground text-center tracking-tight mb-2">
        Thẩm Định Giáo Án Thông Minh
      </h1>
      <p className="text-muted-foreground text-center max-w-lg mb-6 text-xs sm:text-sm leading-relaxed">
        Tự động bóc tách tiến trình sư phạm, chấm điểm Rubric 100 điểm và chỉ điểm trực tiếp nhận xét đóng góp trên từng trang bài giảng.
      </p>

      {/* Upload Drop Container */}
      <div
        className={`w-full bg-card/90 backdrop-blur-sm border-2 border-dashed ${
          isDragging
            ? 'border-primary bg-primary/5 ring-4 ring-primary/20 scale-[1.01]'
            : 'border-border/80 hover:border-primary/50 hover:bg-accent/30'
        } rounded-2xl p-7 sm:p-10 text-center transition-all duration-200 shadow-sm relative overflow-hidden`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform duration-300 group-hover:scale-105 shadow-xs">
            {isLoading ? (
              <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7 text-primary" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-base sm:text-lg font-bold text-foreground">
              Kéo thả tài liệu vào đây hoặc nhấp chọn tệp
            </p>
            <p className="text-xs text-muted-foreground">
              Hỗ trợ định dạng PDF hoặc Word (.docx) dung lượng tối đa 100MB
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <label className={isQuotaExceeded ? "cursor-not-allowed opacity-60" : "cursor-pointer"}>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isLoading || isQuotaExceeded}
              />
              <span className={`inline-flex items-center gap-2 px-5 py-2.5 font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all ${
                isQuotaExceeded
                  ? 'bg-muted text-muted-foreground border border-border cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow active:scale-[0.98]'
              }`}>
                <FileText className="w-4 h-4" />
                {isQuotaExceeded ? 'Đã Hết Lượt Thẩm Định' : 'Chọn Tệp Từ Thiết Bị'}
              </span>
            </label>

            {onLoadSample && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isQuotaExceeded) onLoadSample();
                }}
                disabled={isLoading || isQuotaExceeded}
                className={`inline-flex items-center gap-2 px-4 py-2.5 font-semibold text-xs sm:text-sm rounded-xl border border-border/80 shadow-xs transition-all ${
                  isQuotaExceeded
                    ? 'bg-muted text-muted-foreground opacity-60 cursor-not-allowed'
                    : 'bg-background hover:bg-accent text-foreground active:scale-[0.98]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Thử Ngay Giáo Án Mẫu
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 pt-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Công văn 5512 (THCS / THPT)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Công văn 2345 (Tiểu học)
            </span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="w-full mt-4 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-left">
            <h4 className="text-xs font-semibold text-destructive">Đã xảy ra lỗi</h4>
            <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Feature Cards Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Định Vị Tọa Độ Chuẩn</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Ghim nhận xét và đánh dấu chính xác vị trí trên trang tài liệu.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Chuẩn Bộ Giáo Dục</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Kiểm tra 4 pha hoạt động & 4 bước tổ chức dạy học sư phạm.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Rubric Thang 100</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Chấm điểm theo tiêu chí chi tiết và cho phép xuất PDF đóng dấu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
