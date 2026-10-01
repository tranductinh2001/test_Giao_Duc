'use client';

import { motion } from 'framer-motion';
import { Users, FileText, CheckCircle, TrendingUp, Star, Heart } from 'lucide-react';

const stats = [
  {
    label: 'Câu Hỏi Ôn Tập',
    value: '10,000+',
    icon: FileText,
    description: 'Câu hỏi được cập nhật liên tục'
  },
  {
    label: 'Đề Thi Thực Chiến',
    value: '500+',
    icon: CheckCircle,
    description: 'Đề thi mô phỏng sát thực tế'
  },
  {
    label: 'Tỷ Lệ Đỗ Cao',
    value: '95%',
    icon: TrendingUp,
    description: 'Học viên đỗ kỳ thi đầu tiên'
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

export function ModernStats() {
  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-32 overflow-hidden relative">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--color-primary) / 0.08) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-full" style={{ overflowX: 'hidden' }}>
        {/* Premium header with gradient text */}
        <motion.div
          className="text-center mb-12 sm:mb-16 md:mb-20 max-w-3xl mx-auto px-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-foreground via-primary/80 to-foreground bg-clip-text text-transparent">
              Được Tin Dùng Bởi
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Hàng Nghìn Học Viên
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
            Những con số ấn tượng nói lên chất lượng đào tạo
          </p>
        </motion.div>

        {/* Premium Bento Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Featured stat - Large card with gradient border */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 lg:col-span-2 lg:row-span-2 group relative"
          >
            {/* Gradient border effect */}
            <div
              className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(210 70% 60%) 50%, hsl(var(--color-primary)) 100%)',
                padding: '1px',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
              }}
            />

            <div
              className="relative h-full rounded-2xl p-6 sm:p-8 md:p-10 overflow-hidden transition-all duration-500"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
              }}
            >
              {/* Background decoration */}
              <div
                className="absolute top-0 right-0 w-40 h-40 opacity-20"
                style={{
                  background: 'radial-gradient(circle, hsl(var(--color-primary) / 0.3) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                  transform: 'translate(20%, -20%)',
                }}
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6 sm:mb-8">
                  <motion.div
                    className="p-3 sm:p-4 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.15) 0%, hsl(var(--color-primary) / 0.05) 100%)',
                      border: '1px solid hsl(var(--color-primary) / 0.2)',
                    }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" strokeWidth={2} />
                  </motion.div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <div
                      className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-3 sm:mb-4 tabular-nums"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      <span className="bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
                        12,000+
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2 sm:mb-3">
                      Học Viên Tin Dùng
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">
                      Học viên đang học tập mỗi ngày trên nền tảng của chúng tôi
                    </p>
                  </div>

                  {/* Sub-stats with premium styling */}
                  <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-border/50">
                    <motion.div
                      className="relative p-4 sm:p-5 rounded-xl overflow-hidden"
                      style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                      }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="absolute top-2 right-2 opacity-20">
                        <Star className="h-8 w-8 text-primary fill-primary" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        2,400+
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground font-medium mt-1 flex items-center gap-1">
                        <Star className="h-3 w-3 text-primary fill-primary" />
                        Đánh Giá 5 Sao
                      </div>
                    </motion.div>
                    <motion.div
                      className="relative p-4 sm:p-5 rounded-xl overflow-hidden"
                      style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                      }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="absolute top-2 right-2 opacity-20">
                        <Heart className="h-8 w-8 text-primary fill-primary" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-success tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        98%
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground font-medium mt-1 flex items-center gap-1">
                        <Heart className="h-3 w-3 text-success fill-success" />
                        Hài Lòng
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Smaller stats - Premium compact cards */}
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="group relative"
            >
              {/* Gradient border on hover */}
              <div
                className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(210 70% 60%) 100%)',
                  filter: 'blur(8px)',
                }}
              />

              <motion.div
                className="relative h-full rounded-2xl p-5 sm:p-6 md:p-7 overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                }}
                whileHover={{
                  boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                }}
              >
                {/* Decorative element */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, hsl(var(--color-primary)) 0%, transparent 70%)',
                    filter: 'blur(30px)',
                    transform: 'translate(30%, -30%)',
                  }}
                />

                <motion.div
                  className="relative z-10 p-2.5 sm:p-3 rounded-xl w-fit mb-4 sm:mb-5 transition-transform duration-300"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.15) 0%, hsl(var(--color-primary) / 0.05) 100%)',
                    border: '1px solid hsl(var(--color-primary) / 0.2)',
                  }}
                  whileHover={{ scale: 1.1 }}
                >
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" strokeWidth={2} />
                </motion.div>

                <div className="relative z-10">
                  <div
                    className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 sm:mb-2 tabular-nums"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    <span className="bg-gradient-to-r from-foreground to-primary/70 bg-clip-text text-transparent">
                      {stat.value}
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-foreground mb-1 sm:mb-2">
                    {stat.label}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
