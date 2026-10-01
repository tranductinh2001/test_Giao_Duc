"use client";

import { useState, useEffect } from "react";
import { X, Edit, Save, History } from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import { getSectionTypeLabel } from "@/lib/section-type-labels";

interface EditSectionModalProps {
  lessonPlanId: string;
  sectionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SectionData {
  id: string;
  sectionTitle: string | null;
  rawContent: string;
  wordCount: number;
  charCount: number;
  sectionType: string;
  sectionOrder: number;
}

export default function EditSectionModal({
  lessonPlanId,
  sectionId,
  isOpen,
  onClose,
  onSuccess,
}: EditSectionModalProps) {
  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [createVersion, setCreateVersion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen && sectionId) {
      fetchSection();
    }
  }, [isOpen, sectionId]);

  const fetchSection = async () => {
    setFetching(true);
    try {
      const res = await fetch(
        `/api/lesson-plans/${lessonPlanId}/sections/${sectionId}`
      );
      const data = await res.json();

      if (data.success) {
        setSectionData(data.data);
        setTitle(data.data.sectionTitle || "");
        setContent(data.data.rawContent || "");
      } else {
        toast.error(data.message || "Lỗi khi tải section");
        onClose();
      }
    } catch (error) {
      console.error("Error fetching section:", error);
      toast.error("Lỗi khi tải section");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Vui lòng nhập nội dung");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/lesson-plans/${lessonPlanId}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawContent: content.trim(),
            sectionTitle: title.trim() || null,
            createVersion,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        toast.success("Đã cập nhật section");
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.message || "Lỗi khi cập nhật");
      }
    } catch (error) {
      console.error("Error updating section:", error);
      toast.error("Lỗi khi cập nhật section");
    } finally {
      setLoading(false);
    }
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Edit className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Chỉnh sửa section
              </h2>
              {sectionData && (
                <p className="text-sm text-muted-foreground">
                  {getSectionTypeLabel(sectionData.sectionType)} - Section #{sectionData.sectionOrder}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading state */}
        {fetching ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Tiêu đề section
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tiêu đề (tùy chọn)"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Nội dung <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{getWordCount(content)} từ</span>
                    <span>{content.length} ký tự</span>
                    {sectionData && (
                      <span className="text-info">
                        (Trước: {sectionData.wordCount} từ)
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung section..."
                  className="w-full min-h-[400px] px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-y font-mono text-sm leading-relaxed"
                  required
                />
              </div>

              {/* Version Control Option */}
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/20">
                <input
                  type="checkbox"
                  id="createVersion"
                  checked={createVersion}
                  onChange={(e) => setCreateVersion(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                />
                <label htmlFor="createVersion" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      Tạo version mới
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lưu trữ phiên bản hiện tại trước khi thay đổi (khuyến nghị cho những chỉnh sửa lớn)
                  </p>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={loading}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                  disabled={loading || !content.trim()}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
