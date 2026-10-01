'use client';

import { Star, Quote, Heart, ThumbsUp } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    quote:
      'Sau 3 tháng luyện tập, mình đã đỗ kỳ thi công chức. Các đề thi rất sát với đề thi thật, giúp mình tự tin hơn rất nhiều.',
    name: 'Nguyễn Văn An',
    role: 'Công chức Sở Tài chính',
    avatar: 1,
  },
  {
    quote:
      'Nền tảng học rất tiện lợi, mình có thể học mọi lúc mọi nơi. Trợ lý AI giải đáp thắc mắc rất nhanh chóng và chính xác.',
    name: 'Trần Thị Bình',
    role: 'Công chức Phòng Giáo dục',
    avatar: 2,
  },
  {
    quote:
      'Đây là nền tảng học tốt nhất mình từng sử dụng. Giao diện đẹp, dễ dùng, và quan trọng là nội dung chất lượng cao.',
    name: 'Lê Hoàng Nam',
    role: 'Ứng viên thi công chức',
    avatar: 3,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
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

const avatarColors = [
  { from: 'hsl(210 70% 50%)', to: 'hsl(210 70% 40%)' },
  { from: 'hsl(340 70% 50%)', to: 'hsl(340 70% 40%)' },
  { from: 'hsl(160 70% 40%)', to: 'hsl(160 70% 30%)' },
];

export function ModernTestimonials() {
  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-32 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-0 w-96 h-96 opacity-10"
          style={{
            background: 'radial-gradient(circle, hsl(var(--color-primary)) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 opacity-10"
          style={{
            background: 'radial-gradient(circle, hsl(var(--color-primary)) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-full relative z-10" style={{ overflowX: 'hidden' }}>
        {/* Premium header */}
        <motion.div
          className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4 sm:mb-5"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.1) 0%, hsl(var(--color-primary) / 0.05) 100%)',
              border: '1px solid hsl(var(--color-primary) / 0.2)',
            }}
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Heart className="h-3.5 w-3.5 text-primary fill-primary" />
            <span className="text-primary">Câu chuyện học viên</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
              Được yêu thích bởi
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              học viên toàn quốc
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
            Những chia sẻ chân thực từ những người đã đồng hành cùng chúng tôi
          </p>
        </motion.div>

        {/* Premium Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          style={{ overflow: 'hidden' }}
        >
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={testimonial.name}
              variants={itemVariants}
              className="group relative"
            >
              {/* Gradient border effect on hover */}
              <div
                className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(210 70% 60%) 100%)',
                  filter: 'blur(8px)',
                  zIndex: -1,
                }}
              />

              <motion.div
                className="relative h-full rounded-2xl p-6 sm:p-7 md:p-8 overflow-hidden transition-all duration-500"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
                }}
                whileHover={{
                  boxShadow: '0 16px 50px rgba(0,0,0,0.1)',
                  transform: 'translateY(-4px)',
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Decorative quote icon */}
                <div
                  className="absolute top-4 right-4 opacity-10 pointer-events-none"
                >
                  <Quote className="h-16 w-16 text-primary" />
                </div>

                {/* Star rating */}
                <div className="flex gap-1 text-primary mb-4 sm:mb-5 md:mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                    </motion.div>
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="relative z-10 text-foreground leading-relaxed mb-6 sm:mb-7 md:mb-8 font-medium text-sm sm:text-base">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="pt-4 sm:pt-5 md:pt-6 border-t border-border/50">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <motion.div
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm sm:text-base shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${avatarColors[idx].from} 0%, ${avatarColors[idx].to} 100%)`,
                        boxShadow: `0 4px 15px ${avatarColors[idx].from}40`,
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {testimonial.name.split(' ').slice(-1)[0].charAt(0)}
                    </motion.div>
                    <div>
                      <div className="font-semibold text-foreground text-sm sm:text-base">
                        {testimonial.name}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3 text-success" />
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Premium metrics section */}
        <motion.div
          className="mt-12 sm:mt-16 md:mt-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div
            className="relative inline-flex flex-col items-center gap-3 sm:gap-4 p-6 sm:p-8 md:p-10 rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
            }}
          >
            {/* Decorative gradient */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, hsl(var(--color-primary) / 0.2) 0%, transparent 70%)',
              }}
            />

            <div className="relative z-10">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2">
                <span className="bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">2,400+</span>
              </div>
              <div className="text-base sm:text-lg text-muted-foreground flex items-center justify-center gap-2">
                <Heart className="h-5 w-5 text-primary fill-primary" />
                Đánh giá tích cực từ học viên
              </div>
            </div>

            {/* Trust indicators */}
            <div className="relative z-10 flex items-center gap-6 sm:gap-8 mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded-full border-2 border-background"
                      style={{
                        background: `linear-gradient(135deg, hsl(${210 + i * 5} 70% ${50 + i * 2}%) 0%, hsl(${210 + i * 5} 70% ${40 + i * 2}%) 100%)`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">Học viên tin tưởng</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
