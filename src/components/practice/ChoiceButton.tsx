"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface Choice {
  id: string;
  content: string;
  isCorrect: boolean;
}

interface ChoiceButtonProps {
  choice: Choice;
  index: number;
  isSelected: boolean;
  isAnswered: boolean;
  onClick: () => void;
}

export function ChoiceButton({
  choice,
  index,
  isSelected,
  isAnswered,
  onClick,
}: ChoiceButtonProps) {
  const letters = ["A", "B", "C", "D"];

  const isCorrectChoice = choice.isCorrect;
  const showCorrect = isAnswered && isCorrectChoice;
  const showWrong = isAnswered && isSelected && !isCorrectChoice;

  // Determine colors based on state
  const getButtonStyles = () => {
    if (showCorrect) {
      return "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40";
    }
    if (showWrong) {
      return "border-red-500 bg-red-50 dark:bg-red-950/40";
    }
    if (isSelected) {
      return "border-primary bg-blue-50 dark:bg-blue-950/40";
    }
    return "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-primary/50 hover:bg-zinc-50 dark:hover:bg-zinc-800";
  };

  const getLetterStyles = () => {
    if (showCorrect) {
      return "border-emerald-500 bg-emerald-500 text-[var(--foreground-inverted)]";
    }
    if (showWrong) {
      return "border-red-500 bg-red-500 text-[var(--foreground-inverted)]";
    }
    if (isSelected) {
      return "border-primary bg-primary text-[var(--foreground-inverted)]";
    }
    return "border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={!isAnswered ? { scale: 1.01 } : {}}
      whileTap={!isAnswered ? { scale: 0.99 } : {}}
      onClick={onClick}
      disabled={isAnswered}
      className={`
        w-full text-left rounded-xl border-2 p-4 sm:p-5
        transition-all duration-200 cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        disabled:cursor-default disabled:opacity-100
        ${getButtonStyles()}
      `}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Letter Indicator */}
        <div
          className={`
            flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9
            rounded-full border-2 flex items-center justify-center
            font-bold text-sm sm:text-base
            transition-colors duration-200
            ${getLetterStyles()}
          `}
        >
          {showCorrect ? (
            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : showWrong ? (
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            letters[index]
          )}
        </div>

        {/* Choice Text */}
        <p className="flex-1 text-base sm:text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed pt-1">
          {choice.content}
        </p>
      </div>
    </motion.button>
  );
}
