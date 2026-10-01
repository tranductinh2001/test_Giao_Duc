'use client';

import { ArrowRight, BookOpen, Scale, Landmark, Clock, Users, Star } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const exams = [
  {
    title: 'Luật Hiến pháp 2013',
    description: 'Nắm vững kiến thức về Hiến pháp và quyền công dân',
    questions: 120,
    icon: Scale,
    featured: true,
  },
  {
    title: 'Tư tưởng Hồ Chí Minh',
    description: 'Tìm hiểu tư tưởng và đạo đức Hồ Chí Minh',
    questions: 100,
    icon: BookOpen,
    featured: false,
  },
  {
    title: 'Luật Tổ chức Chính phủ',
    description: 'Hiểu rõ cấu trúc và chức năng của Chính phủ',
    questions: 150,
    icon: Landmark,
    featured: false,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  },
};

export function ModernFeaturedExams() {
  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-32 overflow-hidden relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-full relative z-10" style={{ overflowX: 'hidden' }}>
        {/* Premium header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6 mb-10 sm:mb-14 md:mb-16"
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
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary">Đề thi hot</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-2 sm:mb-3">
              <span className="bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
                Đề thi nổi bật
              </span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              Các bộ đề được cập nhật liên tục theo xu hướng thi mới nhất
            </p>
          </div>
        </motion.div>

        {/* Bento Grid Layout */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] gap-4 sm:gap-5 md:gap-6 mb-8 sm:mb-10 md:mb-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          style={{ overflow: 'hidden' }}
        >
          {exams.map((exam, idx) => (
            <motion.div key={exam.title} variants={itemVariants}>
              <Link
                href="/practice"
                className="group block h-full"
              >
                <motion.div
                  className={`relative h-full rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1 ${
                    idx === 0 ? 'md:row-span-2' : ''
                  }`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
                  }}
                  whileHover={{
                    boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                    borderColor: 'hsl(var(--color-primary) / 0.3)',
                  }}
                >
                  {/* Decorative gradient */}
                  <div
                    className="absolute top-0 right-0 w-40 h-40 opacity-20 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, hsl(var(--color-primary)) 0%, transparent 70%)',
                      filter: 'blur(40px)',
                      transform: 'translate(30%, -30%)',
                    }}
                  />

                  {/* Featured badge */}
                  {exam.featured && (
                    <div className="absolute top-4 right-4 z-10">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(210 70% 55%) 100%)',
                          color: 'white',
                          boxShadow: '0 2px 10px hsl(var(--color-primary) / 0.3)',
                        }}
                      >
                        <Star className="h-3 w-3 fill-current" />
                        Nổi bật
                      </span>
                    </div>
                  )}

                  <div className={`relative z-10 p-6 sm:p-7 md:p-8 ${idx === 0 ? 'lg:p-10' : 'lg:p-8'}`}>
                    {/* Icon with premium styling */}
                    <motion.div
                      className="p-2.5 sm:p-3 rounded-xl w-fit mb-4 sm:mb-5 md:mb-6 transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.15) 0%, hsl(var(--color-primary) / 0.05) 100%)',
                        border: '1px solid hsl(var(--color-primary) / 0.2)',
                        boxShadow: '0 4px 15px hsl(var(--color-primary) / 0.1)',
                      }}
                    >
                      <exam.icon
                        className={`text-primary ${idx === 0 ? 'h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8' : 'h-5 w-5 sm:h-6 sm:w-6'}`}
                      />
                    </motion.div>

                    {/* Content */}
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{exam.questions} câu hỏi</span>
                          <span className="text-border">•</span>
                          <span className="text-primary">Mới cập nhật</span>
                        </div>
                        <h3 className={`font-bold text-foreground leading-tight mb-2 sm:mb-3 ${
                          idx === 0 ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl' : 'text-base sm:text-lg md:text-xl'
                        }`}>
                          {exam.title}
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {exam.description}
                        </p>
                      </div>

                      {/* Stats for featured exam */}
                      {idx === 0 && (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-lg sm:text-xl font-bold text-foreground">1,200+</div>
                              <div className="text-xs text-muted-foreground">Học viên</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-primary fill-primary" />
                            <div>
                              <div className="text-lg sm:text-xl font-bold text-foreground">4.8/5</div>
                              <div className="text-xs text-muted-foreground">Đánh giá</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CTA */}
                      <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all duration-300 text-sm sm:text-base pt-2">
                        <span>Làm bài ngay</span>
                        <motion.span
                          initial={{ x: 0 }}
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* View all CTA */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/practice"
            className="group inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-300 text-sm sm:text-base"
          >
            <span>Xem tất cả đề thi</span>
            <motion.span
              initial={{ x: 0 }}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight className="h-4 w-4" />
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
