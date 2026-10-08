'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="rounded-3xl p-8 md:p-14 text-center bg-gradient-to-br from-emerald-900 via-teal-800 to-slate-900 text-white shadow-2xl relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white relative z-10">
            Sẵn Sàng Bắt Đầu?
          </h2>
          <p className="text-emerald-100/90 text-lg mb-8 max-w-xl mx-auto leading-relaxed relative z-10">
            Đăng ký ngay hôm nay để nhận quyền truy cập miễn phí vào ngân hàng câu hỏi và bắt đầu lộ trình học tập của bạn.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-white text-emerald-900 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Đăng Ký Miễn Phí
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/practice"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium border-2 border-white/30 text-white transition-all hover:bg-white/10"
            >
              Luyện Thi Thử Ngay
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
