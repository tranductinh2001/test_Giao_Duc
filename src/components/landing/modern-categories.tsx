'use client';

import {
  Code2, Scale, Building2, TrendingUp, FileText, Users, Globe, BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const categories = [
  { icon: Scale, name: 'Luật Hiến pháp', count: 45 },
  { icon: FileText, name: 'Hành chính', count: 78 },
  { icon: Building2, name: 'Chính trị', count: 56 },
  { icon: TrendingUp, name: 'Kinh tế', count: 42 },
  { icon: Globe, name: 'Lịch sử - Địa lý', count: 38 },
  { icon: Users, name: 'Xã hội học', count: 29 },
  { icon: BookOpen, name: 'Tiếng Anh', count: 64 },
  { icon: Code2, name: 'Tin học', count: 51 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  },
};

export function ModernCategories() {
  return (
    <section id="categories" className="py-16 sm:py-20 md:py-28 lg:py-32 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20"
          style={{
            background: 'radial-gradient(circle, hsl(var(--color-primary) / 0.1) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-full relative z-10" style={{ overflowX: 'hidden' }}>
        {/* Premium header */}
        <motion.div
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 sm:gap-6 mb-10 sm:mb-14 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-2xl">
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-3 sm:mb-4"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.1) 0%, hsl(var(--color-primary) / 0.05) 100%)',
                border: '1px solid hsl(var(--color-primary) / 0.2)',
              }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-primary">Danh mục</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-2 sm:mb-3">
              <span className="bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
                Tìm lĩnh vực
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                của bạn
              </span>
            </h2>
          </div>

          <motion.div
            className="lg:text-right"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">400+</span>{' '}
              đề thi trải dài các lĩnh vực
            </p>
          </motion.div>
        </motion.div>

        {/* Premium Grid with Animated Cards */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          style={{ overflow: 'hidden' }}
        >
          {categories.map((category, idx) => (
            <motion.div key={category.name} variants={itemVariants}>
              <Link
                href="/practice"
                className="group block h-full"
              >
                <motion.div
                  className="relative h-full rounded-2xl p-5 sm:p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                  }}
                  whileHover={{
                    boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                    borderColor: 'hsl(var(--color-primary) / 0.3)',
                  }}
                >
                  {/* Gradient glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at 50% 0%, hsl(var(--color-primary) / 0.15) 0%, transparent 70%)',
                    }}
                  />

                  {/* Icon */}
                  <motion.div
                    className="relative z-10 p-2.5 sm:p-3 rounded-xl w-fit mb-4 sm:mb-5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.15) 0%, hsl(var(--color-primary) / 0.05) 100%)',
                      border: '1px solid hsl(var(--color-primary) / 0.2)',
                      boxShadow: '0 2px 10px hsl(var(--color-primary) / 0.1)',
                    }}
                    whileHover={{
                      boxShadow: '0 4px 20px hsl(var(--color-primary) / 0.2)',
                    }}
                  >
                    <category.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </motion.div>

                  {/* Content */}
                  <div className="relative z-10">
                    <div className="font-semibold text-foreground mb-1 sm:mb-2 leading-tight text-sm sm:text-base group-hover:text-primary transition-colors duration-200">
                      {category.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                      <span className="font-medium text-primary">{category.count}</span>
                      <span>đề thi</span>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <motion.div
                    className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    initial={{ x: -10 }}
                    whileHover={{ x: 0 }}
                  >
                    <div className="p-1.5 rounded-full bg-primary/10">
                      <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </motion.div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
