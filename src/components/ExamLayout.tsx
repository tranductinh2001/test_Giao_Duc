"use client";

import React, { useState } from "react";
import ExamTimer from "./ExamTimer";
import QuestionGrid from "./QuestionGrid";
import { ChevronLeft, ChevronRight, Send, Menu, X, CheckCircle2, Circle } from "lucide-react";

interface ExamLayoutProps {
  examTitle: string;
  timeLimit: number; // seconds
  expiresAt: Date | string;
  questions: Array<{
    id: string;
    content: string;
    choices: Array<{
      id: string;
      content: string;
    }>;
  }>;
  onSubmit: (answers: Record<string, string | null>) => void;
  onTimeUp: () => void;
}

export default function ExamLayout({
  examTitle,
  expiresAt,
  questions,
  onSubmit,
  onTimeUp,
}: ExamLayoutProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [showMobileGrid, setShowMobileGrid] = useState(false);

  const handleAnswer = (choiceId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questions[currentQuestion].id]: choiceId,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (confirm("Bạn có chắc muốn nộp bài?")) {
      onSubmit(answers);
    }
  };

  const answeredQuestions = new Set(
    Object.keys(answers)
      .filter((qId) => answers[qId] !== null)
      .map((qId) => questions.findIndex((q) => q.id === qId))
  );

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Timer */}
      <header className="navbar sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              {examTitle}
            </h1>
            <div className="bg-card px-4 py-2 rounded-lg border border-border shadow-subtle">
              <ExamTimer expiresAt={expiresAt} onTimeUp={onTimeUp} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout: Question (Left) + Grid (Right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Question Panel */}
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">
                  Tiến độ: {answeredQuestions.size}/{questions.length} câu
                </span>
                <span className="text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-lg border border-success">
                  {Math.round((answeredQuestions.size / questions.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${(answeredQuestions.size / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-subtle">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <span className="text-base font-bold text-foreground">
                    Câu {currentQuestion + 1} / {questions.length}
                  </span>
                  <span
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold border-2 flex items-center gap-1.5 ${
                      answers[currentQ.id]
                        ? "bg-success/10 text-success border-success"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {answers[currentQ.id] ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Đã trả lời
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Chưa trả lời
                      </>
                    )}
                  </span>
                </div>

                <div
                  className="prose prose-sm max-w-none text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: currentQ.content }}
                />
              </div>
            </div>

            {/* Choices */}
            <div className="space-y-3">
              {currentQ.choices.map((choice, index) => {
                const isSelected = answers[currentQ.id] === choice.id;
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleAnswer(choice.id)}
                    className={`
                      w-full text-left p-4 rounded-xl border transition-all duration-200
                      ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-elevated"
                          : "border-border bg-card hover:border-primary hover:bg-accent"
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`
                        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }
                      `}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                      <div
                        className="flex-1 text-sm leading-relaxed text-foreground"
                        dangerouslySetInnerHTML={{ __html: choice.content }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4">
              <button
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                className="px-5 py-2.5 rounded-lg border border-border bg-card text-foreground hover:bg-accent hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                Câu trước
              </button>

              <button
                onClick={handleSubmit}
                className="px-8 py-2.5 rounded-lg bg-success text-success-foreground hover:opacity-90 transition-all duration-200 shadow-elevated font-bold text-sm flex items-center gap-2"
              >
                <Send className="w-4 h-4" strokeWidth={2.5} />
                Nộp bài ({answeredQuestions.size}/{questions.length})
              </button>

              <button
                onClick={handleNext}
                disabled={currentQuestion === questions.length - 1}
                className="px-5 py-2.5 rounded-lg border border-border bg-card text-foreground hover:bg-accent hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center gap-2"
              >
                Câu sau
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Question Grid - Fixed on desktop, drawer on mobile */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-card border border-border rounded-xl p-4 shadow-subtle">
              <QuestionGrid
                totalQuestions={questions.length}
                currentQuestion={currentQuestion}
                answeredQuestions={answeredQuestions}
                onQuestionClick={setCurrentQuestion}
              />
            </div>
          </aside>

          {/* Mobile Grid Button */}
          <button
            onClick={() => setShowMobileGrid(true)}
            className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-elevated hover:scale-110 transition-transform duration-200 z-50 flex items-center justify-center"
          >
            <Menu className="w-6 h-6" strokeWidth={2} />
          </button>

          {/* Mobile Drawer */}
          {showMobileGrid && (
            <div className="lg:hidden fixed inset-0 z-50 flex items-end">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileGrid(false)} />
              <div className="relative w-full bg-card rounded-t-3xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">
                    Danh sách câu hỏi
                  </h3>
                  <button
                    onClick={() => setShowMobileGrid(false)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors duration-200"
                  >
                    <X className="w-5 h-5" strokeWidth={2} />
                  </button>
                </div>
                <QuestionGrid
                  totalQuestions={questions.length}
                  currentQuestion={currentQuestion}
                  answeredQuestions={answeredQuestions}
                  onQuestionClick={(index) => {
                    setCurrentQuestion(index);
                    setShowMobileGrid(false);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
