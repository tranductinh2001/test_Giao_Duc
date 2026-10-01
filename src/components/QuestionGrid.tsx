"use client";

import React from "react";

interface QuestionGridProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestions: Set<number>;
  onQuestionClick: (index: number) => void;
}

export default function QuestionGrid({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  onQuestionClick,
}: QuestionGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">
          Danh sách câu hỏi
        </h3>
        <span className="text-xs font-bold text-primary-foreground bg-primary px-2.5 py-1 rounded-lg">
          {answeredQuestions.size}/{totalQuestions}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => {
          const isAnswered = answeredQuestions.has(num - 1);
          const isCurrent = num - 1 === currentQuestion;

          return (
            <button
              key={num}
              onClick={() => onQuestionClick(num - 1)}
              className={`
                aspect-square rounded-lg text-xs font-bold transition-all duration-200
                ${
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-elevated scale-105"
                    : isAnswered
                    ? "bg-success/10 text-success border-2 border-success hover:bg-success/20"
                    : "bg-muted text-muted-foreground border border-border hover:border-primary hover:bg-accent"
                }
                hover:scale-105 active:scale-95
              `}
            >
              {num}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 text-xs pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary"></div>
          <span className="font-medium text-foreground">Câu hiện tại</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success/10 border-2 border-success"></div>
          <span className="font-medium text-foreground">Đã trả lời</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted border border-border"></div>
          <span className="font-medium text-foreground">Chưa trả lời</span>
        </div>
      </div>
    </div>
  );
}
