"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface EditExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  exam: {
    id: string;
    title: string;
    description?: string | null;
    timeLimit: number;
  } | null;
}

export default function EditExamModal({
  isOpen,
  onClose,
  onSuccess,
  exam,
}: EditExamModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    timeLimitMinutes: 60,
  });

  // Pre-fill form when exam changes
  useEffect(() => {
    if (exam) {
      setFormData({
        title: exam.title || "",
        description: exam.description || "",
        timeLimitMinutes: Math.round(exam.timeLimit / 60),
      });
    }
  }, [exam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }

    if (formData.timeLimitMinutes < 1) {
      toast.error("Thời gian tối thiểu là 1 phút");
      return;
    }

    if (!exam?.id) {
      toast.error("Không tìm thấy ID đề thi");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/exams/${exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          timeLimit: formData.timeLimitMinutes * 60,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Cập nhật đề thi thành công");
        onSuccess();
        onClose();
      } else {
        toast.error(data.message || "Không thể cập nhật đề thi");
      }
    } catch (error) {
      console.error("Error updating exam:", error);
      toast.error("Lỗi khi cập nhật đề thi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: Number(e.target.value),
    }));
  };

  if (!isOpen || !exam) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Chỉnh sửa đề thi</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Tiêu đề <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Nhập tiêu đề đề thi"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
              Mô tả
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Mô tả ngắn về đề thi"
            />
          </div>

          <div>
            <label htmlFor="timeLimitMinutes" className="block text-sm font-medium text-foreground mb-2">
              Thời gian (phút) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              id="timeLimitMinutes"
              name="timeLimitMinutes"
              min={1}
              value={formData.timeLimitMinutes}
              onChange={handleNumberChange}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Khuyến nghị: 1 phút/câu
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
