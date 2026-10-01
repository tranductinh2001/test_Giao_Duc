"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, Home } from "lucide-react";

interface ResultsCardProps {
  correctCount: number;
  totalCount: number;
}

export function ResultsCard({ correctCount, totalCount }: ResultsCardProps) {
  const percentage = Math.round((correctCount / totalCount) * 100);

  // Determine trophy color based on score
  const getTrophyColor = () => {
    if (percentage >= 80) return "text-emerald-500";
    if (percentage >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getTrophyBg = () => {
    if (percentage >= 80)
      return "bg-emerald-100 dark:bg-emerald-900/30";
    if (percentage >= 50) return "bg-amber-100 dark:bg-amber-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  const getScoreColor = () => {
    if (percentage >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (percentage >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 sm:p-8 shadow-sm text-center"
    >
      {/* Trophy Icon */}
      <div
        className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full ${getTrophyBg()} flex items-center justify-center mb-6`}
      >
        <Trophy className={`w-10 h-10 sm:w-12 sm:h-12 ${getTrophyColor()}`} />
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Hoàn Thành!
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        Bạn đã trả lời đúng{" "}
        <span className={`font-bold ${getScoreColor()}`}>
          {correctCount}/{totalCount}
        </span>{" "}
        câu
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        {/* Correct */}
        <div
          className={`rounded-xl border-2 p-4 sm:p-5 ${
            percentage >= 80
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
              : percentage >= 50
              ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
              : "border-red-500 bg-red-50 dark:bg-red-950/40"
          }`}
        >
          <p
            className={`text-2xl sm:text-3xl font-bold tabular-nums ${getScoreColor()}`}
          >
            {correctCount}
          </p>
          <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-1">
            Đúng
          </p>
        </div>

        {/* Wrong */}
        <div className="rounded-xl border-2 border-zinc-200 dark:border-zinc-700 p-4 sm:p-5">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-red-600 dark:text-red-400">
            {totalCount - correctCount}
          </p>
          <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-1">
            Sai
          </p>
        </div>

        {/* Percentage */}
        <div className="rounded-xl border-2 border-zinc-200 dark:border-zinc-700 p-4 sm:p-5">
          <p
            className={`text-2xl sm:text-3xl font-bold tabular-nums ${getScoreColor()}`}
          >
            {percentage}%
          </p>
          <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-1">
            Tỷ Lệ
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-12 px-6 text-base font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Luyện Tiếp
        </button>

        <Link href="/dashboard" className="flex-1 sm:flex-none">
          <button className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 text-base font-semibold rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors border border-zinc-300 dark:border-zinc-600">
            <Home className="w-5 h-5" />
            Về Dashboard
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
