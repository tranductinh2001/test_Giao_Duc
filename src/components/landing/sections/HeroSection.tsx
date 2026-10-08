'use client';

import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 bg-primary/10 border border-primary/20 text-primary shadow-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Nền tảng Giáo dục AI Hàng đầu</span>
            <Zap className="w-3 h-3 text-primary/70" />
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="block text-foreground">
              Học Tập
            </span>
            <span className="block mt-2 text-primary">
              Thông Minh Hơn
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            VCGo Education kết hợp AI để mang đến trải nghiệm học tập cá nhân hóa,
            giúp bạn chuẩn bị tốt nhất cho kỳ thi viên chức và công chức.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-all hover:scale-105 bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35"
            >
              Bắt Đầu Học Ngay
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium border border-border bg-card text-foreground transition-all hover:bg-accent hover:border-primary/30 shadow-sm"
            >
              Luyện Thi Thử
            </Link>
            <Link
              href="/lesson-plans/review"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 transition-all hover:bg-emerald-500/20"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Thẩm Định Giáo Án AI
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {[
            { value: '10,000+', label: 'Câu hỏi' },
            { value: '500+', label: 'Đề thi' },
            { value: '95%', label: 'Hài lòng' },
          ].map((stat, index) => (
            <div key={index} className="text-center p-6 rounded-xl bg-card border border-border shadow-sm">
              <div className="text-3xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
