'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="rounded-2xl p-8 md:p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(var(--color-primary) / 0.8) 100%)',
          }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Sẵn Sàng Bắt Đầu?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Đăng ký ngay hôm nay để nhận quyền truy cập miễn phí vào ngân hàng câu hỏi và bắt đầu lộ trình học tập của bạn.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-medium bg-white text-primary transition-all hover:scale-105"
            >
              Đăng Ký Miễn Phí
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-medium border-2 border-white/30 text-white transition-all hover:bg-white/10"
            >
              Xem Demo
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
