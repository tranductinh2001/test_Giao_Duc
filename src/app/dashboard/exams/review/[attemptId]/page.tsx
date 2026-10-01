"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { generateExamResultPDF, downloadPDF } from "@/lib/pdf";
import { AnimatedContainer, AnimatedCard, FadeInWhenVisible, CountingNumber } from "@/components/motion";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  FileDown,
  Filter,
  BookOpen,
  AlertCircle,
  Home,
  Calendar,
  Target
} from "lucide-react";
import Button from "@/components/ui/button";

interface Question {
  id: string;
  questionText: string;
  explanation: string | null;
  imageUrl: string | null;
  answers: {
    id: string;
    answerText: string;
    isCorrect: boolean;
  }[];
}

interface UserAnswer {
  questionId: string;
  selectedAnswerId: string | null;
}

interface AttemptReview {
  id: string;
  score: number;
  correctCount: number;
  totalCount: number;
  startedAt: string;
  submittedAt: string | null;
  status: string;
  timeSpent: number | null;
  exam: {
    title: string;
    description: string | null;
    timeLimit: number;
  };
  questions: Question[];
  userAnswers: UserAnswer[];
}

export default function ExamReviewPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [review, setReview] = useState<AttemptReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    fetchReview();
  }, [attemptId]);

  const fetchReview = async () => {
    try {
      const res = await fetch(`/api/attempts/${attemptId}/review`);
      const data = await res.json();

      if (data.success) {
        setReview(data.data);
      } else {
        setError(data.message || "Không thể tải chi tiết bài thi.");
      }
    } catch (err) {
      setError("Lỗi kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const getUserAnswer = (questionId: string) => {
    return review?.userAnswers.find((ua) => ua.questionId === questionId);
  };

  const isCorrect = (questionId: string) => {
    const userAnswer = getUserAnswer(questionId);
    if (!userAnswer || !userAnswer.selectedAnswerId) return false;
    const question = review?.questions.find((q) => q.id === questionId);
    return question?.answers.find((a) => a.id === userAnswer.selectedAnswerId)?.isCorrect || false;
  };

  const isSkipped = (questionId: string) => {
    const userAnswer = getUserAnswer(questionId);
    return !userAnswer || !userAnswer.selectedAnswerId;
  };

  const filteredQuestions = review?.questions.filter((q) => {
    if (filter === "all") return true;
    if (filter === "correct") return isCorrect(q.id);
    if (filter === "wrong") return !isCorrect(q.id) && !isSkipped(q.id);
    if (filter === "skipped") return isSkipped(q.id);
    return true;
  }) || [];

  const stats = {
    correct: review?.questions.filter((q) => isCorrect(q.id)).length || 0,
    wrong: review?.questions.filter((q) => !isCorrect(q.id) && !isSkipped(q.id)).length || 0,
    skipped: review?.questions.filter((q) => isSkipped(q.id)).length || 0,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeSpent = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleExportPDF = async () => {
    if (!review) return;

    setExportingPDF(true);
    try {
      const pdfData = {
        examTitle: review.exam.title,
        userName: "Học viên",
        score: review.score,
        correctCount: review.correctCount,
        totalCount: review.totalCount,
        startedAt: review.startedAt,
        submittedAt: review.submittedAt,
        timeSpent: review.timeSpent,
        questions: review.questions.map((q) => {
          const userAnswer = getUserAnswer(q.id);
          const userSelectedAnswer = q.answers.find(
            (a) => a.id === userAnswer?.selectedAnswerId
          );
          const correctAnswer = q.answers.find((a) => a.isCorrect);

          return {
            questionText: q.questionText,
            userAnswer: userSelectedAnswer?.answerText || null,
            correctAnswer: correctAnswer?.answerText || "N/A",
            isCorrect: isCorrect(q.id),
            explanation: q.explanation,
          };
        }),
      };

      const blob = await generateExamResultPDF(pdfData);
      const filename = `ketqua_${review.exam.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      downloadPDF(blob, filename);
    } catch (error) {
      console.error("Export PDF error:", error);
      alert("Không thể xuất PDF. Vui lòng thử lại.");
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-[1500px] px-4 py-8">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-12 text-center shadow-subtle border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="text-muted-foreground font-medium">Đang tải chi tiết bài thi...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-[1500px] px-4 py-8">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-12 text-center shadow-subtle border border-destructive/20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{error || "Không tìm thấy bài thi"}</h3>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push("/dashboard/exams/history")}
              className="mt-4"
            >
              Về lịch sử thi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-[1500px] px-4 py-8 space-y-6">
        {/* Header */}
        <AnimatedContainer animation="fadeInDown">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-6 shadow-subtle border border-zinc-200 dark:border-zinc-800">
          <Link
            href="/dashboard/exams/history"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Về lịch sử thi
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{review.exam.title}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Nộp bài lúc: {formatDate(review.submittedAt || review.startedAt)}</span>
              </div>
            </div>
          </div>
          </div>
        </AnimatedContainer>

        {/* Score Summary */}
        <AnimatedContainer animation="fadeInUp" delay={0.1}>
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-8 shadow-subtle border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Điểm số</p>
                  <p className="text-4xl font-bold text-primary"><CountingNumber value={review.score} duration={2} /></p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {review.correctCount}/{review.totalCount} câu đúng
              </p>
            </div>

            <div className="bg-muted rounded-xl p-5 text-center">
              <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground mb-1">Thời gian</p>
              <p className="text-2xl font-bold text-foreground">
                {formatTimeSpent(review.timeSpent)}
              </p>
            </div>

            <div className="bg-muted rounded-xl p-5 text-center">
              <Award className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground mb-1">Kết quả</p>
              <p className={`text-2xl font-bold ${review.score >= 50 ? "text-success" : "text-destructive"}`}>
                {review.score >= 50 ? "Đạt" : "Chưa đạt"}
              </p>
            </div>
          </div>
          </div>
        </AnimatedContainer>

        {/* Question Stats */}
        <div className="grid grid-cols-3 gap-4">
          <AnimatedCard delay={0.2}>
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-5 shadow-subtle border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-success" />
              <p className="text-sm font-medium text-muted-foreground">Câu đúng</p>
            </div>
            <p className="text-3xl font-bold text-success"><CountingNumber value={stats.correct} duration={1.5} /></p>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.3}>
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-5 shadow-subtle border border-destructive/20">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm font-medium text-muted-foreground">Câu sai</p>
            </div>
            <p className="text-3xl font-bold text-destructive"><CountingNumber value={stats.wrong} duration={1.5} /></p>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.4}>
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-5 shadow-subtle border border-warning/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-5 h-5 text-warning" />
              <p className="text-sm font-medium text-muted-foreground">Bỏ qua</p>
            </div>
            <p className="text-3xl font-bold text-warning"><CountingNumber value={stats.skipped} duration={1.5} /></p>
            </div>
          </AnimatedCard>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-2 shadow-subtle border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2 px-2 pt-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Lọc câu hỏi</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`h-10 rounded-lg text-sm font-bold transition ${
                filter === "all"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Tất cả ({review.totalCount})
            </button>
            <button
              onClick={() => setFilter("correct")}
              className={`h-10 rounded-lg text-sm font-bold transition ${
                filter === "correct"
                  ? "bg-success text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Đúng ({stats.correct})
            </button>
            <button
              onClick={() => setFilter("wrong")}
              className={`h-10 rounded-lg text-sm font-bold transition ${
                filter === "wrong"
                  ? "bg-destructive text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Sai ({stats.wrong})
            </button>
            <button
              onClick={() => setFilter("skipped")}
              className={`h-10 rounded-lg text-sm font-bold transition ${
                filter === "skipped"
                  ? "bg-warning text-white"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Bỏ qua ({stats.skipped})
            </button>
          </div>
        </div>

        {/* Questions Review */}
        <div className="space-y-6">
          {filteredQuestions.map((question, idx) => {
            const userAnswer = getUserAnswer(question.id);
            const correctAnswer = question.answers.find((a) => a.isCorrect);
            const userSelectedAnswer = question.answers.find(
              (a) => a.id === userAnswer?.selectedAnswerId
            );
            const isQuestionCorrect = isCorrect(question.id);
            const isQuestionSkipped = isSkipped(question.id);

            return (
              <FadeInWhenVisible key={question.id} delay={idx * 0.05}>
                <div
                  className={`bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl p-6 shadow-subtle border ${
                    isQuestionCorrect
                      ? "border-success/30"
                      : isQuestionSkipped
                      ? "border-warning/30"
                      : "border-destructive/30"
                  }`}
                >
                {/* Question Header */}
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-muted text-foreground">
                        Câu {idx + 1}
                      </span>
                      {isQuestionCorrect && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                          <CheckCircle className="w-3 h-3" />
                          Đúng
                        </span>
                      )}
                      {!isQuestionCorrect && !isQuestionSkipped && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                          <XCircle className="w-3 h-3" />
                          Sai
                        </span>
                      )}
                      {isQuestionSkipped && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                          <AlertCircle className="w-3 h-3" />
                          Bỏ qua
                        </span>
                      )}
                    </div>
                    <p className="text-base font-medium text-foreground leading-relaxed">
                      {question.questionText}
                    </p>
                  </div>
                </div>

                {/* Question Image */}
                {question.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={question.imageUrl}
                      alt="Question"
                      className="max-h-64 rounded-xl border border-border"
                    />
                  </div>
                )}

                {/* Answers */}
                <div className="space-y-3">
                  {question.answers.map((answer) => {
                    const isUserSelected = answer.id === userAnswer?.selectedAnswerId;
                    const isCorrectAnswer = answer.isCorrect;

                    return (
                      <div
                        key={answer.id}
                        className={`rounded-lg border p-4 ${
                          isCorrectAnswer
                            ? "border-success/40 bg-success/5"
                            : isUserSelected
                            ? "border-destructive/40 bg-destructive/5"
                            : "border-border bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isCorrectAnswer && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                          {!isCorrectAnswer && isUserSelected && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive">
                              <XCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                          {!isCorrectAnswer && !isUserSelected && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                              <span className="text-xs text-muted-foreground">•</span>
                            </div>
                          )}
                          <p
                            className={`flex-1 text-sm ${
                              isCorrectAnswer
                                ? "font-semibold text-success"
                                : isUserSelected
                                ? "font-semibold text-destructive"
                                : "text-foreground"
                            }`}
                          >
                            {answer.answerText}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {question.explanation && (
                  <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-primary mb-1">Giải thích</p>
                        <p className="text-sm text-foreground leading-relaxed">{question.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Answer Summary */}
                <div className="mt-4 rounded-lg border border-border bg-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Bạn đã chọn</p>
                  <p className="text-sm font-medium text-foreground">
                    {userSelectedAnswer
                      ? userSelectedAnswer.answerText
                      : "Không chọn đáp án nào"}
                  </p>
                  {correctAnswer && !isQuestionCorrect && (
                    <p className="mt-2 text-sm text-success font-medium">
                      Đáp án đúng: {correctAnswer.answerText}
                    </p>
                  )}
                </div>
              </div>
              </FadeInWhenVisible>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleExportPDF}
            disabled={exportingPDF}
            leftIcon={<FileDown className="w-4 h-4" />}
            className="w-full"
          >
            {exportingPDF ? "Đang xuất..." : "Xuất PDF"}
          </Button>

          <Link href="/dashboard/exams/history" className="w-full">
            <Button variant="secondary" size="lg" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Lịch sử thi
            </Button>
          </Link>

          <Link href="/dashboard" className="w-full">
            <Button variant="primary" size="lg" className="w-full" leftIcon={<Home className="w-4 h-4" />}>
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
