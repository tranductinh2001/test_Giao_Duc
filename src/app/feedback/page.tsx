"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserNavbar from "@/components/user-navbar";
import Button from "@/components/ui/button";
import { MessageSquare, Bug, Lightbulb, HelpCircle, FileText, Inbox } from "lucide-react";

interface Feedback {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { value: "Bug", label: "Báo lỗi", icon: Bug, color: "error" },
  { value: "Suggestion", label: "Đề xuất", icon: Lightbulb, color: "primary" },
  { value: "Question", label: "Câu hỏi", icon: HelpCircle, color: "info" },
  { value: "Other", label: "Khác", icon: FileText, color: "secondary" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ xử lý", color: "warning" },
  REVIEWING: { label: "Đang xem xét", color: "info" },
  RESOLVED: { label: "Đã giải quyết", color: "success" },
  DISMISSED: { label: "Đã bỏ qua", color: "secondary" },
};

export default function FeedbackPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Suggestion");

  useEffect(() => {
    if (session) {
      fetchFeedbacks();
    }
  }, [session]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/feedback");
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data);
      }
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!subject.trim() || !message.trim()) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, category }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess("Gửi góp ý thành công! Cảm ơn bạn đã đóng góp.");
        setSubject("");
        setMessage("");
        setCategory("Suggestion");
        fetchFeedbacks();
      } else {
        setError(data.message || "Không thể gửi góp ý");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <UserNavbar userName={session?.user?.name ?? undefined} userRole={session?.user?.role ?? undefined} />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 lg:p-8 shadow-subtle text-center mb-4 sm:mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-primary/10 px-3 sm:px-4 py-1.5 sm:py-2 mb-3 sm:mb-4">
            <MessageSquare className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-primary uppercase">
              Góp Ý
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
            Gửi Góp Ý Cho Chúng Tôi
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Ý kiến của bạn giúp chúng tôi cải thiện nền tảng tốt hơn mỗi&nbsp;ngày
          </p>
        </div>

        {error && (
          <div className="rounded-xl p-4 bg-error/10 border-2 border-error text-error text-sm font-semibold mb-6 animate-fade-in">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl p-4 bg-success/10 border-2 border-success text-success text-sm font-semibold mb-6 animate-fade-in">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Form */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-subtle">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-4 sm:mb-6">Gửi Góp Ý Mới</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Loại Góp Ý
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                          category === cat.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        }`}
                        aria-pressed={category === cat.value}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="feedback-subject" className="block text-sm font-semibold text-foreground mb-2">
                  Tiêu Đề
                </label>
                <input
                  id="feedback-subject"
                  name="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full"
                  placeholder="Tóm tắt nội dung góp ý"
                  required
                />
              </div>

              <div>
                <label htmlFor="feedback-message" className="block text-sm font-semibold text-foreground mb-2">
                  Nội Dung Chi Tiết
                </label>
                <textarea
                  id="feedback-message"
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full min-h-[150px]"
                  placeholder="Mô tả chi tiết vấn đề hoặc đề xuất của bạn…"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={submitting}
                className="w-full"
              >
                {submitting ? "Đang gửi…" : "Gửi Góp Ý"}
              </Button>
            </form>
          </div>

          {/* History */}
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-subtle">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-4 sm:mb-6">
              Góp Ý Của Bạn <span className="tabular-nums">({feedbacks.length})</span>
            </h2>

            {loading ? (
              <div className="flex justify-center py-8 sm:py-12">
                <div className="spinner" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Inbox className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" aria-hidden="true" />
                <p className="text-sm font-semibold text-muted-foreground">
                  Bạn chưa gửi góp ý&nbsp;nào
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                {feedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="rounded-xl border-2 border-border bg-muted p-3 sm:p-4 hover:border-primary transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-bold text-foreground flex-1">
                        {feedback.subject}
                      </h3>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg flex-shrink-0 text-xs font-semibold ${
                          STATUS_LABELS[feedback.status]?.color === "warning" ? "bg-warning/10 text-warning" :
                          STATUS_LABELS[feedback.status]?.color === "info" ? "bg-info/10 text-info" :
                          STATUS_LABELS[feedback.status]?.color === "success" ? "bg-success/10 text-success" :
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {STATUS_LABELS[feedback.status]?.label || feedback.status}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {feedback.message}
                    </p>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">
                        {CATEGORIES.find((c) => c.value === feedback.category)?.label || feedback.category}
                      </span>
                      <time className="text-muted-foreground tabular-nums" dateTime={feedback.createdAt}>
                        {new Date(feedback.createdAt).toLocaleDateString("vi-VN")}
                      </time>
                    </div>

                    {feedback.adminNote && (
                      <div className="mt-3 pt-3 border-t-2 border-border">
                        <p className="text-xs font-semibold text-info mb-1 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                          Phản Hồi Từ Admin:
                        </p>
                        <p className="text-sm text-foreground">
                          {feedback.adminNote}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
