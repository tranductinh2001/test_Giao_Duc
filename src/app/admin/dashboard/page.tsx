"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  BookOpen,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Brain,
  Sparkles,
  TrendingUp,
  Users,
  Layout,
  Settings,
  ChevronRight,
  Activity,
  Target,
  Layers,
  DollarSign,
  BarChart3,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedContainer, AnimatedCard } from "@/components/motion";
import { getModelById, formatCostVND } from "@/lib/ai-models";

interface StatsData {
  lessonPlans: {
    total: number;
    uploaded: number;
    parsing: number;
    parsed: number;
    reviewing: number;
    reviewed: number;
    completed: number;
    failed: number;
  };
  averageScore: number;
  totalRules: number;
  totalTemplates: number;
  totalBooks: number;
  aiModel: string;
  todayCost: number;
  todayTokens: {
    input: number;
    output: number;
    total: number;
  };
  dailyTrend: Array<{
    date: string;
    uploaded: number;
    reviewed: number;
    completed: number;
  }>;
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

function formatTokens(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/lesson-plans-stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getModelName = (modelId: string): string => {
    const model = getModelById(modelId);
    return model?.displayName || modelId;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-500">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const { lessonPlans } = stats || {
    lessonPlans: {
      total: 0,
      uploaded: 0,
      parsing: 0,
      parsed: 0,
      reviewing: 0,
      reviewed: 0,
      completed: 0,
      failed: 0,
    },
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  AI Lesson Plan
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Nền tảng hỗ trợ giáo viên bằng AI
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/settings">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Cài đặt</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick Stats Grid */}
        <AnimatedContainer animation="fadeInDown" duration={0.4}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Lesson Plans */}
            <AnimatedCard delay={0.1}>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/10 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                    Tổng
                  </span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  {formatNumber(lessonPlans.total)}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Giáo án
                </div>
              </div>
            </AnimatedCard>

            {/* Reviewed */}
            <AnimatedCard delay={0.15}>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:shadow-lg hover:shadow-emerald-500/10 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                    Đã xử lý
                  </span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  {formatNumber(lessonPlans.reviewed + lessonPlans.completed)}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Đã phân tích
                </div>
              </div>
            </AnimatedCard>

            {/* Average Score */}
            <AnimatedCard delay={0.2}>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-lg hover:shadow-purple-500/10 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                    Điểm TB
                  </span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  {stats?.averageScore || 0}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  / 100
                </div>
              </div>
            </AnimatedCard>

            {/* AI Model */}
            <AnimatedCard delay={0.25}>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-700 transition-all hover:shadow-lg hover:shadow-orange-500/10 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bot className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-xs font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                    AI Model
                  </span>
                </div>
                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1 truncate">
                  {getModelName(stats?.aiModel || "gemini-3.1-flash-lite")}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Đang hoạt động
                </div>
              </div>
            </AnimatedCard>
          </div>
        </AnimatedContainer>

        {/* Status Cards */}
        <AnimatedContainer animation="fadeIn" delay={0.3} duration={0.5}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Uploaded */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {lessonPlans.uploaded}
                  </div>
                  <div className="text-xs text-zinc-500">Chờ xử lý</div>
                </div>
              </div>
            </div>

            {/* Processing */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {lessonPlans.parsing + lessonPlans.reviewing}
                  </div>
                  <div className="text-xs text-zinc-500">Đang xử lý</div>
                </div>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {lessonPlans.completed}
                  </div>
                  <div className="text-xs text-zinc-500">Hoàn thành</div>
                </div>
              </div>
            </div>

            {/* Failed */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {lessonPlans.failed}
                  </div>
                  <div className="text-xs text-zinc-500">Lỗi</div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedContainer>

        {/* Resources & Usage Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Resources */}
          <AnimatedCard delay={0.35}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-6">
                <Layers className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Tài nguyên hệ thống
                </h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Bộ quy tắc
                    </span>
                  </div>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {stats?.totalRules || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Layout className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Template
                    </span>
                  </div>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {stats?.totalTemplates || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-rose-600" />
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Bộ sách
                    </span>
                  </div>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {stats?.totalBooks || 0}
                  </span>
                </div>
              </div>
            </div>
          </AnimatedCard>

          {/* AI Usage Today */}
          <AnimatedCard delay={0.4}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  AI Usage hôm nay
                </h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-cyan-600" />
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Chi phí
                    </span>
                  </div>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCostVND(stats?.todayCost || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Input Tokens
                    </span>
                  </div>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {formatTokens(stats?.todayTokens.input || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-pink-600" />
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Output Tokens
                    </span>
                  </div>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {formatTokens(stats?.todayTokens.output || 0)}
                  </span>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Quick Actions */}
        <AnimatedCard delay={0.45}>
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Bắt đầu ngay</h2>
                <p className="text-blue-100 text-sm">
                  Tải lên giáo án đầu tiên và để AI phân tích ngay
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-blue-200" />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Link href="/lesson-plans/upload">
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0 h-12">
                  <FileText className="w-5 h-5 mr-2" />
                  Upload Giáo án
                </Button>
              </Link>
              <Link href="/lesson-plans">
                <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 h-12">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Xem danh sách
                </Button>
              </Link>
              <Link href="/admin/circulars">
                <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 h-12">
                  <Layers className="w-5 h-5 mr-2" />
                  Quản lý Bộ sách
                </Button>
              </Link>
            </div>
          </div>
        </AnimatedCard>

        {/* Recent Activity Chart Placeholder */}
        <AnimatedCard delay={0.5}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Hoạt động 7 ngày gần đây
                </h2>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  Tải lên
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  Hoàn thành
                </span>
              </div>
            </div>
            {/* Simple bar chart */}
            <div className="flex items-end justify-between h-32 gap-2">
              {stats?.dailyTrend.map((day, index) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end gap-1 h-24">
                    <div
                      className="flex-1 bg-blue-500 rounded-t-md min-h-[4px]"
                      style={{ height: `${Math.min(100, (day.uploaded / Math.max(1, lessonPlans.total)) * 400)}%` }}
                    />
                    <div
                      className="flex-1 bg-emerald-500 rounded-t-md min-h-[4px]"
                      style={{ height: `${Math.min(100, (day.completed / Math.max(1, lessonPlans.total)) * 400)}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(day.date).toLocaleDateString("vi-VN", { weekday: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedCard>

        {/* Navigation Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatedCard delay={0.55}>
            <Link href="/admin/circulars">
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Bộ sách</h3>
                  <p className="text-xs text-zinc-500 mt-1">Quản lý công văn & tài liệu</p>
                </div>
              </div>
            </Link>
          </AnimatedCard>

          <AnimatedCard delay={0.6}>
            <Link href="/admin/section-rules">
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-lg group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Rule Engine</h3>
                  <p className="text-xs text-zinc-500 mt-1">Quản lý quy tắc phân tích</p>
                </div>
              </div>
            </Link>
          </AnimatedCard>

          <AnimatedCard delay={0.65}>
            <Link href="/admin/templates">
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-700 transition-all hover:shadow-lg group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Layout className="w-5 h-5 text-amber-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-amber-600 transition-colors" />
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Templates</h3>
                  <p className="text-xs text-zinc-500 mt-1">Quản lý mẫu giáo án</p>
                </div>
              </div>
            </Link>
          </AnimatedCard>

          <AnimatedCard delay={0.7}>
            <Link href="/admin/users">
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-700 transition-all hover:shadow-lg group">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 text-rose-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-rose-600 transition-colors" />
                </div>
                <div className="mt-3">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Người dùng</h3>
                  <p className="text-xs text-zinc-500 mt-1">Quản lý tài khoản</p>
                </div>
              </div>
            </Link>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}
