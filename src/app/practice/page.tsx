"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { BookOpen, ArrowRight, SkipForward, RefreshCw } from "lucide-react";

import UserNavbar from "@/components/user-navbar";
import { ProgressCard } from "@/components/practice/ProgressCard";
import { ChoiceButton } from "@/components/practice/ChoiceButton";
import { ExplanationCard } from "@/components/practice/ExplanationCard";
import { ResultsCard } from "@/components/practice/ResultsCard";

interface Question {
  id: string;
  content: string;
  explanation: string | null;
  categoryName: string | null;
  choices: { id: string; content: string; isCorrect: boolean }[];
}

export default function PracticeModePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    fetch("/api/practice/start", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setQuestions(data.data.questions);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectChoice = (choiceId: string) => {
    if (isAnswered) return;
    setSelectedChoice(choiceId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedChoice) return;

    const correctChoice = currentQuestion.choices.find((c) => c.isCorrect);
    const isCorrect = selectedChoice === correctChoice?.id;

    setIsAnswered(true);
    setScore({
      correct: score.correct + (isCorrect ? 1 : 0),
      total: score.total + 1,
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedChoice(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  };

  const handleSkip = () => {
    setScore((prev) => ({ ...prev, total: prev.total + 1 }));
    handleNext();
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <UserNavbar
          userName={session?.user?.name ?? undefined}
          userRole={session?.user?.role ?? undefined}
        />
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--kraft)]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin"></div>
          </div>
          <p className="text-base font-medium text-[var(--muted)]">
            Đang tải câu hỏi...
          </p>
        </div>
      </div>
    );
  }

  // No Questions State
  if (!currentQuestion && !showResults) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <UserNavbar
          userName={session?.user?.name ?? undefined}
          userRole={session?.user?.role ?? undefined}
        />
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full paper rounded-2xl p-8 sm:p-12 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--kraft)] flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-[var(--muted)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Không có câu hỏi
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Vui lòng thử lại sau hoặc liên hệ admin
            </p>
            <Link href="/dashboard">
              <button className="inline-flex items-center justify-center gap-2 h-12 px-6 text-base font-semibold rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--foreground-inverted)] hover:bg-[var(--primary-hover)] transition-colors w-full sm:w-auto">
                <RefreshCw className="w-5 h-5" />
                Về Dashboard
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // Results State
  if (showResults) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <UserNavbar
          userName={session?.user?.name ?? undefined}
          userRole={session?.user?.role ?? undefined}
        />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-xl w-full">
            <ResultsCard
              correctCount={score.correct}
              totalCount={score.total}
            />
          </div>
        </div>
      </div>
    );
  }

  // Practice State - with sticky bottom bar
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <UserNavbar
        userName={session?.user?.name ?? undefined}
        userRole={session?.user?.role ?? undefined}
      />

      {/* Main Content - Scrollable */}
      <div className="flex-1 pb-28 sm:pb-32">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-4"
            >
              {/* Progress Card */}
              <ProgressCard
                currentIndex={currentIndex}
                total={questions.length}
                correctCount={score.correct}
                wrongCount={score.total - score.correct}
              />

              {/* Question Card - Prominent */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="paper rounded-xl p-4 sm:p-5"
              >
                {/* Category Badge */}
                {currentQuestion.categoryName && (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-[var(--primary-soft)] px-2.5 py-1 mb-3">
                    <BookOpen className="w-3 h-3 text-[var(--primary)]" />
                    <span className="text-[10px] sm:text-xs font-bold text-[var(--primary)] uppercase tracking-wide">
                      {currentQuestion.categoryName}
                    </span>
                  </div>
                )}

                {/* Question Text - Larger for readability */}
                <h3 className="text-base sm:text-lg font-semibold text-[var(--foreground)] leading-relaxed">
                  {currentQuestion.content}
                </h3>
              </motion.div>

              {/* Choices */}
              <div className="space-y-2">
                {currentQuestion.choices.map((choice, idx) => (
                  <ChoiceButton
                    key={choice.id}
                    choice={choice}
                    index={idx}
                    isSelected={selectedChoice === choice.id}
                    isAnswered={isAnswered}
                    onClick={() => handleSelectChoice(choice.id)}
                  />
                ))}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {isAnswered && currentQuestion.explanation && (
                  <ExplanationCard explanation={currentQuestion.explanation} />
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ACTION BAR - XÂY LẠI HOÀN TOÀN */}
      <div
        id="action-bar"
        className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-[var(--surface)] border-t border-[var(--border)]"
      >
        <div className="container mx-auto max-w-2xl">

          {/* KHI CHƯA TRẢ LỜI */}
          {!isAnswered && (
            <div className="flex gap-3">

              {/* NÚT BỎ QUA */}
              <button
                onClick={handleSkip}
                className="flex items-center justify-center gap-2 h-12 px-5 rounded-[var(--radius-sm)] font-medium transition-all flex-shrink-0 bg-[var(--surface)] text-[var(--foreground)] border-2 border-[var(--border)] hover:bg-[var(--kraft)] shadow-[var(--shadow-paper)]"
              >
                <SkipForward className="w-4 h-4 text-[var(--muted)]" />
                <span>Bỏ qua</span>
              </button>

              {/* NÚT TRẢ LỜI */}
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedChoice}
                className={`flex-1 h-12 px-6 rounded-[var(--radius-sm)] font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${
                  selectedChoice
                    ? 'bg-[var(--primary)] text-[var(--foreground-inverted)] border-2 border-[var(--primary-hover)] shadow-[var(--shadow-lift)]'
                    : 'bg-[var(--kraft)] text-[var(--muted)] border-2 border-[var(--border)]'
                }`}
              >
                Trả lời
              </button>
            </div>
          )}

          {/* KHI ĐÃ TRẢ LỜI - NÚT TIẾP THEO */}
          {isAnswered && (
            <button
              onClick={handleNext}
              className="w-full h-12 px-6 rounded-[var(--radius-sm)] font-bold transition-all bg-[var(--primary)] text-[var(--foreground-inverted)] border-2 border-[var(--primary-hover)] shadow-[var(--shadow-lift)]"
            >
              {currentIndex < questions.length - 1 ? 'Câu Tiếp Theo' : 'Xem Kết Quả'}
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
