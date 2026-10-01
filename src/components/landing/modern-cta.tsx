'use client';

import { ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function ModernCTA() {
  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-32 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-full relative z-10" style={{ overflowX: 'hidden' }}>
        {/* Premium CTA Card */}
        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] as const }}
        >
          <div
            className="relative overflow-hidden rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(220 70% 50%) 50%, hsl(var(--color-primary)) 100%)',
              boxShadow: '0 25px 80px -15px hsl(var(--color-primary) / 0.4)',
            }}
          >
            {/* Animated background pattern */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(135deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.1))
                `,
                backgroundSize: '40px 40px',
                animation: 'movePattern 20s linear infinite',
              }}
            />

            {/* Gradient orbs */}
            <motion.div
              className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-30"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
              animate={{
                x: [0, 30, 0],
                y: [0, -20, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
              animate={{
                x: [0, -30, 0],
                y: [0, 30, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Content */}
            <div className="relative z-10 text-center px-6 sm:px-8 md:px-12 lg:px-16 py-12 sm:py-16 md:py-20 lg:py-24">
              {/* Premium badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 sm:mb-8"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="h-4 w-4 text-white/90" />
                <span className="text-sm font-medium text-white/90">Miễn phí 7 ngày dùng thử</span>
              </motion.div>

              {/* Heading */}
              <motion.h2
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4 sm:mb-6 md:mb-8 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Sẵn Sàng
                <br />
                <span className="text-white/90">Bắt Đầu Học?</span>
              </motion.h2>

              {/* Description */}
              <motion.p
                className="text-base sm:text-lg md:text-xl text-white/80 mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed px-2"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                Tham gia cùng hàng nghìn học viên đã đỗ kỳ thi công chức với nền tảng của chúng tôi
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10 md:mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Link href="/register">
                  <motion.button
                    className="w-full sm:w-auto inline-flex items-center justify-center h-12 sm:h-14 px-8 sm:px-10 md:px-12 text-sm sm:text-base font-semibold rounded-xl overflow-hidden group"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      color: 'hsl(var(--color-primary))',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="relative z-10 font-bold">Bắt Đầu Miễn Phí</span>
                    <motion.span
                      className="relative z-10 ml-2"
                      initial={{ x: 0 }}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight className="h-5 w-5" />
                    </motion.span>
                  </motion.button>
                </Link>
                <Link href="/practice">
                  <motion.button
                    className="w-full sm:w-auto inline-flex items-center justify-center h-12 sm:h-14 px-8 sm:px-10 md:px-12 text-sm sm:text-base font-semibold rounded-xl transition-all duration-300"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      backdropFilter: 'blur(10px)',
                    }}
                    whileHover={{
                      scale: 1.02,
                      background: 'rgba(255,255,255,0.25)',
                      borderColor: 'rgba(255,255,255,0.5)',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Xem Demo
                  </motion.button>
                </Link>
              </motion.div>

              {/* Trust signals */}
              <motion.div
                className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                {[
                  { icon: Zap, text: 'Không cần thẻ tín dụng' },
                  { icon: Shield, text: 'Hoàn tiền 100%' },
                  { icon: Sparkles, text: 'Dùng thử 7 ngày' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-white/70 text-xs sm:text-sm"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes movePattern {
          0% { background-position: '0 0'; }
          100% { background-position: '40px 40px'; }
        }
      `}</style>
    </section>
  );
}
