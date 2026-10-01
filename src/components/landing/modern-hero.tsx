'use client';

import { ArrowRight, Brain, BookOpen, Trophy, Sparkles, Zap, Shield } from 'lucide-react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

export function ModernHero() {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[90vh] flex items-center overflow-hidden"
      style={{ maxWidth: '100vw' }}
    >
      {/* Transparent background - ShapeGrid shows through from page.tsx */}

      {/* Main Content */}
      <motion.div
        className="container mx-auto relative z-10 px-4 sm:px-6 md:px-8"
        style={{ maxWidth: '100%', y, opacity }}
      >
        <div className="max-w-5xl mx-auto text-center" style={{ overflowX: 'hidden' }}>

          {/* Premium Badge */}
          <motion.div
            className="mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.1) 0%, hsl(var(--color-primary) / 0.05) 100%)',
                border: '1px solid hsl(var(--color-primary) / 0.2)',
              }}
            >
              {/* Glow effect */}
              <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'radial-gradient(circle, hsl(var(--color-primary) / 0.2) 0%, transparent 70%)', filter: 'blur(8px)' }}
              />
              <Sparkles className="w-4 h-4 text-primary relative z-10" />
              <span className="text-primary relative z-10">Nền tảng Giáo dục AI Hàng đầu</span>
              <Zap className="w-3 h-3 text-primary/70 relative z-10" />
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            className="mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <h1
              className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95]"
              style={{ overflowWrap: 'break-word', maxWidth: '100%' }}
            >
              <span className="block">
                <span className="bg-gradient-to-r from-foreground via-primary/80 to-foreground bg-clip-text text-transparent">
                  Học Tập
                </span>
              </span>
              <span className="block mt-2 sm:mt-3">
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(210 70% 60%) 50%, hsl(var(--color-primary)) 100%)',
                  }}
                >
                  Thông Minh Hơn
                </span>
              </span>
            </h1>
          </motion.div>

          {/* Subheading */}
          <motion.p
            className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{ maxWidth: '100%' }}
          >
            Ôn thi viên chức, công chức với{' '}
            <span className="font-semibold text-foreground relative">
              <span className="relative z-10">10,000+ câu hỏi</span>
              <span className="absolute bottom-0 left-0 right-0 h-2 bg-primary/20 rounded" />
            </span>{' '}
            chất lượng cao và{' '}
            <span className="font-semibold text-foreground relative">
              <span className="relative z-10">AI phân tích giáo án</span>
              <span className="absolute bottom-0 left-0 right-0 h-2 bg-primary/20 rounded" />
            </span>
            {' '}thông minh.
          </motion.p>

          {/* Feature Pills - Premium Cards */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-14 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {[
              { icon: BookOpen, text: '10K+ Câu hỏi', highlight: true },
              { icon: Brain, text: 'AI Thông minh', highlight: true },
              { icon: Trophy, text: '95% Đỗ', highlight: false },
              { icon: Shield, text: 'Bảo mật', highlight: false },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="group relative flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 cursor-default"
                style={{
                  background: item.highlight
                    ? 'linear-gradient(135deg, hsl(var(--color-primary) / 0.15) 0%, hsl(var(--color-primary) / 0.05) 100%)'
                    : 'rgba(255, 255, 255, 0.6)',
                  border: `1px solid ${item.highlight ? 'hsl(var(--color-primary) / 0.3)' : 'hsl(var(--color-border))'}`,
                  boxShadow: item.highlight ? '0 4px 20px hsl(var(--color-primary) / 0.1)' : '0 2px 10px rgba(0,0,0,0.05)',
                }}
                whileHover={{ y: -2 }}
              >
                <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
                  {item.text}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons - Premium with depth */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Link href="/register" className="w-full sm:w-auto group">
              <motion.button
                className="w-full sm:w-auto relative inline-flex items-center justify-center h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base font-semibold rounded-xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(210 70% 55%) 100%)',
                  boxShadow: '0 4px 20px hsl(var(--color-primary) / 0.35), 0 0 0 1px hsl(var(--color-primary) / 0.1) inset',
                }}
                whileHover={{ scale: 1.02, boxShadow: '0 8px 30px hsl(var(--color-primary) / 0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10 text-primary-foreground">Bắt Đầu Miễn Phí</span>
                <motion.span
                  className="relative z-10 ml-2"
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowRight className="h-5 w-5 text-primary-foreground" />
                </motion.span>
              </motion.button>
            </Link>

            <Link href="/practice" className="w-full sm:w-auto">
              <motion.button
                className="w-full sm:w-auto inline-flex items-center justify-center h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base font-semibold rounded-xl backdrop-blur-xl transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid hsl(var(--color-border))',
                  boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
                }}
                whileHover={{
                  scale: 1.02,
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderColor: 'hsl(var(--color-primary) / 0.3)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-foreground">Xem Demo</span>
              </motion.button>
            </Link>
          </motion.div>

          {/* Social Proof - Premium Glass Card */}
          <motion.div
            className="px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <div
              className="relative inline-flex flex-wrap items-center justify-center gap-6 sm:gap-10 px-6 sm:px-10 py-5 sm:py-6 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset',
              }}
            >
              {/* Users */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex -space-x-2 sm:-space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 border-white shadow-md flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, hsl(${210 + i * 5} 70% ${50 + i * 5}%) 0%, hsl(${210 + i * 5} 70% ${40 + i * 5}%) 100%)`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                      whileHover={{ scale: 1.1, zIndex: 10 }}
                    />
                  ))}
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm sm:text-base font-bold text-foreground whitespace-nowrap">12,000+</div>
                  <div className="text-xs text-muted-foreground hidden sm:block">Học viên</div>
                </div>
              </div>

              <div className="h-8 w-px bg-border/50 flex-shrink-0 hidden xs:block" aria-hidden="true" />

              {/* Stats */}
              <div className="flex items-center gap-6 sm:gap-8">
                <div className="text-center min-w-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent whitespace-nowrap">
                    95%
                  </div>
                  <div className="text-xs text-muted-foreground">Đỗ thi</div>
                </div>
                <div className="text-center min-w-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent whitespace-nowrap">
                    4.9
                  </div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 md:h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, hsl(var(--color-background)) 0%, transparent 100%)' }}
      />
    </section>
  );
}
