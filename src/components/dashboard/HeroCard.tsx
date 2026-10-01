"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileCheck } from "lucide-react";

interface HeroCardProps {
  href: string;
}

export default function HeroCard({ href }: HeroCardProps) {
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
        className="block h-full bg-gradient-to-br from-teal-600 via-teal-600 to-teal-700 text-white rounded-2xl p-5 lg:p-6 shadow-lg shadow-teal-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
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
                <span className="text-xs font-semibold">Sẵn sàng</span>
              </motion.div>

              <h2 className="text-xl lg:text-2xl font-bold mb-2 tracking-tight">
                Làm đề thi mới
              </h2>

              <p className="text-sm text-white/80 leading-relaxed max-w-[240px]">
                Chọn chuyên đề, độ khó và bắt đầu làm bài ngay hôm nay
              </p>
            </div>

            <motion.div
              className="flex-shrink-0 p-3 rounded-xl bg-white/15"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            >
              <FileCheck className="w-8 h-8 lg:w-10 lg:h-10" />
            </motion.div>
          </div>

          {/* Bottom Section */}
          <div className="mt-auto pt-4">
            <motion.div
              className="inline-flex items-center gap-2 text-sm font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span>Bắt đầu ngay</span>
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
