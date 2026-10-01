"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatedCard, FadeInWhenVisible, CountingNumber } from "@/components/motion";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ScoreTrendItem = {
  date: string;
  score: number;
  examTitle: string;
};

type RatioItem = {
  name: string;
  value: number;
  color: string;
};

type AttemptItem = {
  id: string;
  score: number;
  correctCount: number;
  totalCount: number;
  startedAt: string;
  submittedAt: string | null;
  status: string;
  exam: {
    title: string;
    timeLimit: number;
  };
};

type WrongAnswerItem = {
  id: string;
  wrongCount: number;
  lastAnsweredAt: string;
  question: {
    id: string;
    content: string;
    category: {
      name: string;
    };
    choices: {
      id: string;
      content: string;
      isCorrect: boolean;
    }[];
  };
};

type BookmarkItem = {
  id: string;
  createdAt: string;
  question: {
    id: string;
    content: string;
    category: {
      name: string;
    };
    choices: {
      id: string;
      content: string;
      isCorrect: boolean;
    }[];
  };
};

export type LearnerInsightsData = {
  scoreTrend: ScoreTrendItem[];
  passFailRatio: RatioItem[];
  totalAttempts: number;
  wrongAnswerCount: number;
  bookmarkCount: number;
  recentAttempts: AttemptItem[];
  wrongAnswers: WrongAnswerItem[];
  bookmarks: BookmarkItem[];
};

interface LearnerInsightsPanelProps {
  data: LearnerInsightsData;
}

function stripHtml(html: string) {
  return html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function LearnerInsightsPanel({ data }: LearnerInsightsPanelProps) {
  const [bookmarks, setBookmarks] = useState(data.bookmarks);
  const [savingBookmarkId, setSavingBookmarkId] = useState<string | null>(null);
  const hasScoreTrend = data.scoreTrend.some((item) => Number.isFinite(item.score));

  const wrongAnswerChartData = useMemo(
    () =>
      data.wrongAnswers.slice(0, 8).map((item) => {
        const label = stripHtml(item.question.content);
        return {
          label: label.length > 12 ? `${label.slice(0, 12)}...` : label,
          wrongCount: item.wrongCount,
        };
      }),
    [data.wrongAnswers]
  );

  const summaryCards = useMemo(
    () => [
      { label: "Tổng bài làm", value: data.totalAttempts, tone: "from-violet-600 to-indigo-600" },
      { label: "Câu sai cần ôn", value: data.wrongAnswerCount, tone: "from-rose-600 to-orange-600" },
      { label: "Bookmark đã lưu", value: data.bookmarkCount, tone: "from-amber-600 to-yellow-600" },
    ],
    [data.bookmarkCount, data.totalAttempts, data.wrongAnswerCount]
  );

  const handleRemoveBookmark = async (questionId: string, bookmarkId: string) => {
    setSavingBookmarkId(bookmarkId);
    try {
      const res = await fetch(`/api/questions/${questionId}/bookmark`, {
        method: "POST",
      });
      const payload = await res.json();
      if (!payload.success) return;
      setBookmarks((current) => current.filter((item) => item.id !== bookmarkId));
    } finally {
      setSavingBookmarkId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        {summaryCards.map((card, index) => (
          <AnimatedCard key={card.label} delay={index * 0.1} className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-lg shadow-black/10 backdrop-blur-xl">
            <div className={`mb-3 sm:mb-4 h-1 rounded-full bg-gradient-to-r ${card.tone}`} />
            <p className="text-xs sm:text-sm text-slate-400">{card.label}</p>
            <p className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-semibold text-white"><CountingNumber value={card.value} duration={1.5} /></p>
          </AnimatedCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1.7fr_1fr]">
        <FadeInWhenVisible>
          <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg shadow-black/10 backdrop-blur-xl">
          <div className="mb-4 sm:mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">Biểu đồ tiến độ</h2>
              <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Điểm số các lần thi gần nhất.</p>
            </div>
          </div>
          <div className="h-60 sm:h-80">
            {hasScoreTrend ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.scoreTrend}>
                  <XAxis dataKey="date" stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} domain={[0, 100]} fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: 12,
                      color: "#e2e8f0",
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-xs sm:text-sm text-slate-500">
                Chưa có dữ liệu làm bài.
              </div>
            )}
          </div>
        </section>
        </FadeInWhenVisible>

        <FadeInWhenVisible delay={0.1}>
          <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg shadow-black/10 backdrop-blur-xl">
          <h2 className="text-base sm:text-lg font-semibold text-white">Tỷ lệ đạt / không đạt</h2>
          <p className="mb-3 sm:mb-4 text-xs sm:text-sm text-slate-400">Mốc đạt chuẩn: 50 điểm.</p>
          <div className="h-60 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.passFailRatio}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {data.passFailRatio.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    color: "#e2e8f0",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        </FadeInWhenVisible>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1.2fr_1fr]">
        <FadeInWhenVisible delay={0.15}>
          <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg shadow-black/10 backdrop-blur-xl">
          <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">Lịch sử làm bài</h2>
              <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Xem nhanh tiến độ và trạng thái.</p>
            </div>
            <Link href="/dashboard/exams" className="text-xs sm:text-sm text-violet-300 hover:text-violet-200 self-start sm:self-auto">
              Làm bài mới
            </Link>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {data.recentAttempts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-xs sm:text-sm text-slate-500">
                Chưa có lịch sử làm bài.
              </div>
            ) : (
              data.recentAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/40 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white truncate text-sm sm:text-base">{attempt.exam.title}</h3>
                      <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-500">
                        {formatDate(attempt.startedAt)} • {attempt.submittedAt ? formatDate(attempt.submittedAt) : "Chưa nộp"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl sm:text-2xl font-bold text-violet-300">{attempt.score.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">
                        {attempt.correctCount}/{attempt.totalCount}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg shadow-black/10 backdrop-blur-xl">
          <h2 className="text-base sm:text-lg font-semibold text-white">Câu sai & bookmark</h2>
          <p className="mb-4 sm:mb-5 text-xs sm:text-sm text-slate-400">Danh sách ôn tập.</p>

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold text-slate-200">Câu trả lời sai</h3>
              <div className="space-y-2 sm:space-y-3">
                {data.wrongAnswers.length === 0 ? (
                  <div className="rounded-xl sm:rounded-2xl border border-dashed border-white/10 p-3 sm:p-4 text-xs sm:text-sm text-slate-500">
                    Chưa có câu sai.
                  </div>
                ) : (
                  data.wrongAnswers.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/40 p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-slate-500">{item.question.category.name}</p>
                      <p className="mt-1 sm:mt-2 line-clamp-2 text-xs sm:text-sm text-slate-200">{stripHtml(item.question.content)}</p>
                      <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-slate-500">Sai {item.wrongCount} lần</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold text-slate-200">Bookmark đã lưu</h3>
              <div className="space-y-2 sm:space-y-3">
                {bookmarks.length === 0 ? (
                  <div className="rounded-xl sm:rounded-2xl border border-dashed border-white/10 p-3 sm:p-4 text-xs sm:text-sm text-slate-500">
                    Chưa có bookmark.
                  </div>
                ) : (
                  bookmarks.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/40 p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-slate-500">{item.question.category.name}</p>
                      <p className="mt-1 sm:mt-2 line-clamp-2 text-xs sm:text-sm text-slate-200">{stripHtml(item.question.content)}</p>
                      <div className="mt-2 sm:mt-3 flex items-center justify-between gap-2">
                        <p className="text-[10px] sm:text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                        <button
                          type="button"
                          disabled={savingBookmarkId === item.id}
                          onClick={() => handleRemoveBookmark(item.question.id, item.id)}
                          className="rounded-full border border-white/10 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-slate-300 transition hover:border-rose-500/60 hover:text-rose-200 disabled:opacity-40"
                        >
                          {savingBookmarkId === item.id ? "..." : "Bỏ lưu"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
        </FadeInWhenVisible>
      </div>

      <FadeInWhenVisible delay={0.25}>
        <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg shadow-black/10 backdrop-blur-xl">
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-white">Số câu sai theo câu hỏi</h2>
        <div className="h-60 sm:h-80">
          {data.wrongAnswers.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-xs sm:text-sm text-slate-500">
              Chưa có dữ liệu để tổng hợp.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wrongAnswerChartData}>
                <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} interval={0} fontSize={10} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="wrongCount" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
      </FadeInWhenVisible>
    </div>
  );
}
