"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

interface DeleteCustomExamButtonProps {
  examId: string;
  examTitle: string;
}

export default function DeleteCustomExamButton({ examId, examTitle }: DeleteCustomExamButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa đề thi "${examTitle}"?\n\nHành động này không thể hoàn tác.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast.success("✅ Đã xóa đề thi thành công!", {
          duration: 3000,
          style: {
            background: "var(--color-success)",
            color: "var(--color-success-foreground)",
            fontWeight: "600",
          },
        });
        router.refresh();
      } else {
        toast.error(data.message || "❌ Không thể xóa đề thi", {
          duration: 4000,
          style: {
            background: "var(--color-destructive)",
            color: "var(--color-destructive-foreground)",
            fontWeight: "600",
          },
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("❌ Lỗi kết nối. Vui lòng thử lại.", {
        duration: 4000,
        style: {
          background: "var(--color-destructive)",
          color: "var(--color-destructive-foreground)",
          fontWeight: "600",
        },
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
      style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
      title="Xóa đề thi"
      aria-label={`Xóa đề thi ${examTitle}`}
    >
      {isDeleting ? (
        <div
          className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"
          role="status"
          aria-label="Đang xóa"
        />
      ) : (
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
}
