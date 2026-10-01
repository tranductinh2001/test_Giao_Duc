"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, FileText, BookOpen, Sparkles, ArrowRight } from "lucide-react";

interface LessonPlanUploadHeroProps {
  href?: string;
}

export default function LessonPlanUploadHero({ href = "/lesson-plans/upload" }: LessonPlanUploadHeroProps) {
  return (
    <motion.div
      className="overflow-hidden h-full"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileTap={{ scale: 0.99 }}
    >
      <Link
        href={href}
        className="block h-full bg-gradient-to-br from-violet-600 via-violet-600 to-violet-700 text-white rounded-2xl p-5 lg:p-6 shadow-lg shadow-violet-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        <div className="relative flex flex-col h-full">
          {/* Top Section */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <motion.div
                className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 mb-3"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-semibold">AI-powered</span>
              </motion.div>

              <h2 className="text-xl lg:text-2xl font-bold mb-2 tracking-tight">
                Tải lên giáo án
              </h2>

              <p className="text-sm text-white/80 leading-relaxed max-w-[240px]">
                Tải lên file Word, review với AI ngay lập tức
              </p>
            </div>

            <motion.div
              className="flex-shrink-0 p-3 rounded-xl bg-white/15"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            >
              <Upload className="w-8 h-8 lg:w-10 lg:h-10" />
            </motion.div>
          </div>

          {/* Feature badges */}
          <div className="mt-auto pt-4 mb-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              DOCX/PDF
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              AI Review
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg text-xs font-medium">
              <BookOpen className="w-3.5 h-3.5" />
              Context
            </span>
          </div>

          {/* Bottom Section */}
          <div className="mt-auto pt-4 border-t border-white/20">
            <motion.div
              className="inline-flex items-center gap-2 text-sm font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span>Tải lên ngay</span>
              <ArrowRight className="w-4 h-4 animate-bounce" />
            </motion.div>
          </div>

          {/* Decorative gradient */}
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -z-10" />
        </div>
      </Link>
    </motion.div>
  );
}
