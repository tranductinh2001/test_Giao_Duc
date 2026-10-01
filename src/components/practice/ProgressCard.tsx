"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface ProgressCardProps {
  currentIndex: number;
  total: number;
  correctCount: number;
  wrongCount: number;
}

export function ProgressCard({
  currentIndex,
  total,
  correctCount,
  wrongCount,
}: ProgressCardProps) {
  const progress = ((currentIndex + 1) / total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl px-4 py-2.5"
    >
      {/* Compact Header Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Question Counter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Câu
          </span>
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {currentIndex + 1}
          </span>
          <span className="text-sm text-zinc-400">/ {total}</span>
        </div>

        {/* Mini Progress Bar - Hidden on very small screens */}
        <div className="hidden xs:flex flex-1 max-w-[80px] h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>

        {/* Score Badges - Compact */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {correctCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <X className="w-3 h-3 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">
              {wrongCount}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
