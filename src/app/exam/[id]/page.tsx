"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/ui/button";
import { AnimatedContainer, AnimatedCard, FadeInWhenVisible, CountingNumber } from "@/components/motion";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  Target,
  Award,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Filter,
  Home,
  BarChart3,
  Star,
  Circle
} from "lucide-react";

interface ExamChoice {
  id: string;
  content: string;
}

interface ExamQuestion {
  id: string;
  content: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  categoryName: string | null;
  choices: ExamChoice[];
}

interface StartAttemptResponse {
  attemptId: string;
  timeLimit: number;
  questions: ExamQuestion[];
  bookmarkedQuestionIds: string[];
}

interface ReviewAnswer {
  questionId: string;
  question: {
    content: string;
    explanation: string | null;
    category: { name: string } | null;
    choices: { id: string; content: string; isCorrect: boolean }[];
  };
  selectedChoiceId: string | null;
  isCorrect: boolean;
}

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

interface AttemptAnalysis {
  score: number;
  correctCount: number;
  totalCount: number;
  categoryStats: CategoryStats[];
  weakCategories: CategoryStats[];
  recommendations: string[];
}

interface SubmitResult {
  score: number;
  correctCount: number;
  totalCount: number;
  isExpired: boolean;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Result Panel Component
function ResultPanel({
  result,
  attemptId,
}: {
  result: SubmitResult;
  attemptId: string;
}) {
  const [reviews, setReviews] = useState<ReviewAnswer[] | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [filter, setFilter] = useState<"all" | "wrong" | "correct">("all");
  const [analysis, setAnalysis] = useState<AttemptAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const passed = result.score >= 50;
  const percentage = result.score;

  const loadAnalysis = async () => {
    if (analysis) return;
    setAnalysisLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/analytics`);
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.data);
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  const loadReview = async () => {
    if (reviews) {
      setShowReview(true);
      return;
    }
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.data.answers || []);
        setShowReview(true);
      }
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, []);

  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    if (filter === "wrong") return reviews.filter((r) => !r.isCorrect);
    if (filter === "correct") return reviews.filter((r) => r.isCorrect);
    return reviews;
  }, [reviews, filter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Score Banner - enhanced design */}
      <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-border dark:border-zinc-800">
        <AnimatedContainer animation="fadeInDown" className="container mx-auto max-w-[1400px] px-4 py-12">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold text-center mb-8">
            Kết quả bài thi
          </p>

          {/* Circular score - enhanced */}
          <AnimatedContainer animation="scaleIn" delay={0.2} className="flex justify-center mb-8">
            <div className="relative flex h-40 w-40 items-center justify-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - percentage / 100)}`}
                  className={`transition-all duration-1000 ${passed ? "text-success" : "text-destructive"}`}
                />
              </svg>
              <div className="text-center">
                <span className={`text-5xl font-bold tabular-nums ${passed ? "text-success" : "text-destructive"}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <CountingNumber value={Math.round(percentage)} duration={2} />
                </span>
                <span className="ml-1 text-lg text-muted-foreground tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>/100</span>
              </div>
            </div>
          </AnimatedContainer>

          <AnimatedContainer animation="fadeInUp" delay={0.4} className="text-center space-y-2 mb-8">
            <div className="flex items-center justify-center gap-2">
              {passed ? (
                <CheckCircle className="w-6 h-6 text-success" aria-hidden="true" />
              ) : (
                <XCircle className="w-6 h-6 text-destructive" aria-hidden="true" />
              )}
              <p className={`text-2xl font-bold ${passed ? "text-success" : "text-destructive"}`}>
                {passed ? "Đạt yêu cầu" : "Chưa đạt"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Trả lời đúng{" "}
              <span className="font-bold text-foreground tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {result.correctCount}/{result.totalCount}
              </span>{" "}
              câu hỏi
              {result.isExpired && (
                <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  Nộp quá giờ
                </span>
              )}
            </p>
          </AnimatedContainer>

          {/* Stats row - enhanced cards */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
            <AnimatedCard delay={0.5} className="bg-card border border-primary/20 rounded-xl p-5 text-center hover:shadow-elevated transition-shadow duration-200">
              <Target className="w-6 h-6 text-primary mx-auto mb-2" aria-hidden="true" />
              <p className="text-3xl font-bold text-primary mb-1 tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <CountingNumber value={Math.round(percentage)} duration={1.5} />
              </p>
              <p className="text-xs font-medium text-muted-foreground">Điểm số</p>
            </AnimatedCard>

            <AnimatedCard delay={0.6} className="bg-card border border-success/20 rounded-xl p-5 text-center hover:shadow-elevated transition-shadow duration-200">
              <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" aria-hidden="true" />
              <p className="text-3xl font-bold text-success mb-1 tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <CountingNumber value={result.correctCount} duration={1.5} />
              </p>
              <p className="text-xs font-medium text-muted-foreground">Câu đúng</p>
            </AnimatedCard>

            <AnimatedCard delay={0.7} className="bg-card border border-destructive/20 rounded-xl p-5 text-center hover:shadow-elevated transition-shadow duration-200">
              <XCircle className="w-6 h-6 text-destructive mx-auto mb-2" aria-hidden="true" />
              <p className="text-3xl font-bold text-destructive mb-1 tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <CountingNumber value={result.totalCount - result.correctCount} duration={1.5} />
              </p>
              <p className="text-xs font-medium text-muted-foreground">Câu sai</p>
            </AnimatedCard>
          </div>

          {/* Actions */}
          <AnimatedContainer animation="fadeInUp" delay={0.8} className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={loadReview}
              variant="primary"
              size="lg"
              isLoading={reviewLoading}
              leftIcon={<BookOpen className="w-4 h-4" />}
            >
              Xem đáp án chi tiết
            </Button>
            <Link href="/dashboard/exams">
              <Button variant="secondary" size="lg" leftIcon={<Home className="w-4 h-4" />}>
                Trung tâm thi
              </Button>
            </Link>
            <Link href="/dashboard/insights">
              <Button variant="ghost" size="lg" leftIcon={<BarChart3 className="w-4 h-4" />}>
                Báo cáo
              </Button>
            </Link>
          </AnimatedContainer>
        </AnimatedContainer>
      </div>

      {/* Category Analysis Section */}
      {analysis && (
        <div className="container mx-auto max-w-[1400px] px-4 py-8 space-y-6">
          {/* Recommendations */}
          <FadeInWhenVisible>
            <div className="bg-card border border-primary/20 rounded-xl p-6 shadow-subtle">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-primary" aria-hidden="true" />
                <h3 className="text-base font-bold text-primary">Lời khuyên cho bạn</h3>
              </div>
              <ul className="space-y-2 text-sm text-foreground">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeInWhenVisible>

          {/* Category Stats */}
          <FadeInWhenVisible delay={0.1}>
            <div className="bg-card border border-border rounded-xl p-6 shadow-subtle">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" aria-hidden="true" />
                <h3 className="text-base font-bold text-foreground">Phân tích theo chuyên đề</h3>
              </div>
              <div className="space-y-4">
                {analysis.categoryStats.map((cat) => (
                  <div key={cat.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-foreground">{cat.categoryName}</span>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {cat.correctAnswers}/{cat.totalQuestions} câu ({cat.accuracy}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat.accuracy >= 80
                          ? "bg-success"
                          : cat.accuracy >= 60
                          ? "bg-warning"
                          : "bg-destructive"
                      }`}
                      style={{ width: `${cat.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          </FadeInWhenVisible>

          {/* Weak Categories */}
          {analysis.weakCategories.length > 0 && (
            <FadeInWhenVisible delay={0.2}>
              <div className="bg-card border border-destructive/20 rounded-xl p-6 shadow-subtle">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
                  <h3 className="text-base font-bold text-destructive">Chuyên đề cần ôn tập</h3>
                </div>
                <div className="space-y-3">
                  {analysis.weakCategories.map((cat) => (
                    <div
                      key={cat.categoryId}
                      className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-foreground">{cat.categoryName}</span>
                      <span className="text-lg font-bold text-destructive tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{cat.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInWhenVisible>
          )}
        </div>
      )}

      {/* Review section */}
      {showReview && reviews && (
        <div className="container mx-auto max-w-[1400px] px-4 py-8 space-y-6">
          <FadeInWhenVisible>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-bold text-foreground">Xem lại đáp án</h2>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <div className="flex gap-2">
                  {(["all", "correct", "wrong"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`h-9 px-4 rounded-lg text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        filter === f
                          ? "!bg-primary !text-white"
                          : "!bg-muted text-muted-foreground hover:!bg-muted/80"
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', isolation: 'isolate', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
                      aria-pressed={filter === f}
                    >
                      {f === "all" ? "Tất cả" : f === "correct" ? "Đúng" : "Sai"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </FadeInWhenVisible>

          <div className="space-y-4">
            {filteredReviews.map((review, index) => {
              const correctChoice = review.question.choices.find((c) => c.isCorrect);
              return (
                <FadeInWhenVisible key={review.questionId} delay={index * 0.05}>
                  <div
                    className={`bg-card border rounded-xl p-6 shadow-subtle ${
                      review.isCorrect
                        ? "border-success/30"
                        : "border-destructive/30"
                    }`}
                  >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg font-bold text-sm tabular-nums ${
                        review.isCorrect
                          ? "bg-success text-white"
                          : "bg-destructive text-white"
                      }`}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                      aria-label={`Câu hỏi ${index + 1}`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div
                        className="text-sm leading-relaxed text-foreground font-medium"
                        dangerouslySetInnerHTML={{ __html: review.question.content }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {review.question.choices.map((choice, ci) => {
                      const isSelected = review.selectedChoiceId === choice.id;
                      const isCorrectChoice = choice.isCorrect;
                      return (
                        <div
                          key={choice.id}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
                            isCorrectChoice
                              ? "border-success/40 bg-success/5 text-foreground"
                              : isSelected && !isCorrectChoice
                              ? "border-destructive/40 bg-destructive/5 text-foreground"
                              : "border-border bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className="font-mono text-xs font-bold flex-shrink-0">
                            {String.fromCharCode(65 + ci)}.
                          </span>
                          <span className="flex-1 font-medium">{choice.content}</span>
                          {isCorrectChoice && (
                            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" aria-hidden="true" />
                          )}
                          {isSelected && !isCorrectChoice && (
                            <XCircle className="w-4 h-4 text-destructive flex-shrink-0" aria-hidden="true" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {review.question.explanation && (
                    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-primary mb-1">Giải thích</p>
                          <p className="text-sm leading-relaxed text-foreground">
                            {review.question.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!review.isCorrect && correctChoice && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Đáp án đúng:{" "}
                      <span className="font-bold text-success">
                        {correctChoice.content}
                      </span>
                    </p>
                  )}
                </div>
                </FadeInWhenVisible>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Exam Room Component
export default function ExamRoomPage() {
  const params = useParams();
  const examId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);

  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);
  const autoSubmitIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start attempt
  useEffect(() => {
    if (!examId || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const startAttempt = async () => {
      try {
        const res = await fetch(`/api/exams/${examId}/start`, { method: "POST" });
        const data: { success: boolean; data?: StartAttemptResponse; message?: string } = await res.json();

        if (data.success && data.data) {
          setAttemptId(data.data.attemptId);
          setQuestions(data.data.questions);
          setTimeLeft(data.data.timeLimit);
          setBookmarks(new Set(data.data.bookmarkedQuestionIds));
        } else {
          toast.error(data.message || "Không thể bắt đầu bài thi", {
          duration: 4000,
          style: {
            background: 'hsl(var(--color-destructive))',
            color: 'hsl(var(--color-destructive-foreground))',
            fontWeight: '600',
          },
        });
        }
      } catch {
        toast.error("Lỗi kết nối máy chủ", {
          duration: 4000,
          style: {
            background: 'hsl(var(--color-destructive))',
            color: 'hsl(var(--color-destructive-foreground))',
            fontWeight: '600',
          },
        });
      } finally {
        setLoading(false);
      }
    };

    startAttempt();
  }, [examId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || result) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result]);

  // Auto-save every 30s
  useEffect(() => {
    if (!attemptId || result) return;

    autoSaveIntervalRef.current = setInterval(() => {
      saveProgress();
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    };
  }, [attemptId, answers, bookmarks, result]);

  const saveProgress = async () => {
    if (!attemptId) return;
    try {
      await fetch(`/api/attempts/${attemptId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, choiceId]) => ({
            questionId,
            choiceId,
          })),
          bookmarkedQuestionIds: Array.from(bookmarks),
        }),
      });
    } catch {
      // Silent fail
    }
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (submitting || !attemptId) return;
    setSubmitting(true);

    try {
      await saveProgress();

      // Prepare answers in the correct format
      const answersArray = Object.entries(answers).map(([questionId, selectedChoiceId]) => ({
        questionId,
        selectedChoiceId: selectedChoiceId || null,
      }));

      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersArray }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        if (autoSubmitIntervalRef.current) clearInterval(autoSubmitIntervalRef.current);
        toast.success(
          autoSubmit
            ? "⏰ Đã nộp bài tự động do hết thời gian"
            : "🎉 Nộp bài thành công!",
          {
            duration: 3000,
            style: {
              background: 'hsl(var(--color-success))',
              color: 'hsl(var(--color-success-foreground))',
              fontWeight: '600',
            },
          }
        );
      } else {
        // Show specific error message
        const errorMessage = data.message || data.error || "Không thể nộp bài";
        toast.error(errorMessage, {
          duration: 4000,
          style: {
            background: 'hsl(var(--color-destructive))',
            color: 'hsl(var(--color-destructive-foreground))',
            fontWeight: '600',
          },
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("❌ Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối Internet.", {
        duration: 5000,
        style: {
          background: 'hsl(var(--color-destructive))',
          color: 'hsl(var(--color-destructive-foreground))',
          fontWeight: '600',
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = (choiceId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questions[currentIndex].id]: choiceId,
    }));
  };

  const toggleBookmark = useCallback(() => {
    const qId = questions[currentIndex]?.id;
    if (!qId) return;

    setBookmarks((prev) => {
      const next = new Set(prev);
      const wasBookmarked = prev.has(qId);

      if (wasBookmarked) {
        next.delete(qId);
      } else {
        next.add(qId);
      }

      // Toast outside of setState
      setTimeout(() => {
        toast.success(wasBookmarked ? "Đã bỏ lưu câu hỏi" : "Đã lưu câu hỏi", {
          duration: 2000,
          style: {
            background: 'hsl(var(--color-success))',
            color: 'hsl(var(--color-success-foreground))',
            fontWeight: '600',
          },
        });
      }, 0);

      return next;
    });
  }, [currentIndex, questions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (result) return;

      if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (e.key === "ArrowRight" && currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === " " && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        toggleBookmark();
      } else if (e.key >= "1" && e.key <= "4") {
        const choiceIndex = parseInt(e.key) - 1;
        const currentQ = questions[currentIndex];
        if (currentQ?.choices[choiceIndex]) {
          handleAnswer(currentQ.choices[choiceIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentIndex, questions, result, toggleBookmark]);

  const currentQuestion = questions[currentIndex];
  const isBookmarked = currentQuestion ? bookmarks.has(currentQuestion.id) : false;
  const selectedChoiceId = currentQuestion ? answers[currentQuestion.id] : undefined;

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status" aria-label="Đang tải"></div>
            <span className="text-muted-foreground font-medium">Đang tải đề thi…</span>
          </div>
        </div>
      </div>
    );
  }

  if (result && attemptId) {
    return <ResultPanel result={result} attemptId={attemptId} />;
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-subtle max-w-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">Không tìm thấy câu hỏi</h3>
          <Link href="/dashboard/exams">
            <Button variant="primary" size="md" className="mt-6">
              Về trung tâm thi
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Top Bar - Mobile Optimized */}
      <div className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          {/* Timer - Compact */}
          <div
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-bold tabular-nums ${
              timeLeft < 300
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse"
                : timeLeft < 600
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            }`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
            role="timer"
            aria-live="polite"
          >
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {/* Progress - Mobile Friendly */}
          <div className="flex-1 max-w-[140px] flex flex-col gap-1">
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {answeredCount}/{questions.length} câu
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question Grid Toggle - Mobile Only */}
          <button
            onClick={() => setShowQuestionGrid(!showQuestionGrid)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            aria-label="Danh sách câu hỏi"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Submit Button - Compact */}
          <button
            onClick={() => {
              if (window.confirm("Bạn chắc chắn muốn nộp bài?")) {
                handleSubmit(false);
              }
            }}
            disabled={submitting}
            className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg font-semibold text-sm bg-[var(--success)] text-[var(--foreground-inverted)] hover:bg-[var(--success)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Nộp</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Question Grid Panel - Mobile Slide Up */}
      {showQuestionGrid && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowQuestionGrid(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-2xl max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Danh sách câu hỏi</h3>
                <button
                  onClick={() => setShowQuestionGrid(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4">
              {/* Legend */}
              <div className="flex items-center gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-600" />
                  <span className="text-zinc-600 dark:text-zinc-400">Đã chọn</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border-2 border-zinc-300" />
                  <span className="text-zinc-600 dark:text-zinc-400">Chưa chọn</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-zinc-600 dark:text-zinc-400">Đã lưu</span>
                </div>
              </div>
              {/* Question Grid */}
              <div className="grid grid-cols-6 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = idx === currentIndex;
                  const isMarked = bookmarks.has(q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowQuestionGrid(false);
                      }}
                      className={`relative flex h-11 items-center justify-center rounded-lg font-mono text-sm font-bold transition-all ${
                        isCurrent
                          ? "bg-[var(--primary)] text-[var(--foreground-inverted)] ring-2 ring-[var(--primary)]/30"
                          : isAnswered
                          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-2 border-blue-300 dark:border-blue-700"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-2 border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {idx + 1}
                      {isMarked && (
                        <Star className="absolute -right-1 -top-1 w-3 h-3 text-amber-500 fill-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 pb-24 lg:pb-6">
        <div className="container mx-auto max-w-2xl px-4 py-4 lg:py-6">
          {/* Question Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 sm:p-5 shadow-sm mb-4">
            {/* Question Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--foreground-inverted)] text-sm font-bold">
                  {currentIndex + 1}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Câu {currentIndex + 1}/{questions.length}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {currentQuestion.categoryName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                        {currentQuestion.categoryName}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        currentQuestion.difficulty === "EASY"
                          ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                          : currentQuestion.difficulty === "MEDIUM"
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                          : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {DIFFICULTY_LABEL[currentQuestion.difficulty]}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={toggleBookmark}
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all ${
                  isBookmarked
                    ? "bg-amber-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                }`}
                aria-label={isBookmarked ? "Bỏ lưu câu hỏi" : "Lưu câu hỏi"}
              >
                <Star className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
              </button>
            </div>

            {/* Question Text */}
            <div
              className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed mb-5"
              dangerouslySetInnerHTML={{ __html: currentQuestion.content }}
            />

            {/* Choices */}
            <div className="space-y-2.5">
              {currentQuestion.choices.map((choice, index) => {
                const isSelected = selectedChoiceId === choice.id;
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleAnswer(choice.id)}
                    className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 sm:p-3.5 text-left transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-blue-300 dark:hover:border-blue-600"
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                  >
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                        isSelected
                          ? "bg-[var(--primary)] text-[var(--foreground-inverted)]"
                          : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className={`flex-1 text-sm sm:text-base ${isSelected ? "text-blue-700 dark:text-blue-300 font-medium" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {choice.content}
                    </span>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation - Desktop Only */}
          <div className="hidden lg:flex items-center justify-between gap-4">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 h-10 px-4 rounded-lg font-medium text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Câu trước
            </button>

            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {currentIndex + 1} / {questions.length}
            </p>

            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
              className="flex items-center gap-2 h-10 px-4 rounded-lg font-medium text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Câu sau
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Keyboard Hints - Desktop Only */}
          <div className="hidden lg:block mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Phím tắt</p>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span>← → Chuyển câu</span>
              <span>1-4 Chọn đáp án</span>
              <span>Space Lưu câu</span>
            </div>
          </div>
        </div>

        {/* Desktop Question Grid - Sidebar */}
        <div className="hidden lg:block absolute right-0 top-24 w-72 px-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">Danh sách câu hỏi</h3>
            <div className="flex items-center gap-3 mb-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-blue-600" />
                <span className="text-zinc-600 dark:text-zinc-400">Đã chọn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded border-2 border-zinc-300" />
                <span className="text-zinc-600 dark:text-zinc-400">Chưa</span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;
                const isMarked = bookmarks.has(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative flex h-9 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-[var(--primary)] text-[var(--foreground-inverted)] ring-2 ring-[var(--primary)]/30"
                        : isAnswered
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    {idx + 1}
                    {isMarked && (
                      <Star className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar - Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl font-semibold text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trước</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{currentIndex + 1}</span>
            <span className="text-sm text-zinc-400">/</span>
            <span className="text-sm font-semibold text-zinc-500">{questions.length}</span>
          </div>

          <button
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentIndex === questions.length - 1}
            className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl font-semibold text-sm bg-[var(--primary)] text-[var(--foreground-inverted)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Sau</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
