'use client';

import { Award, Brain, Compass, MessageSquareHeart, Rocket, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Brain,
    title: 'Học thông minh với AI',
    desc: 'Trợ lý AI hỗ trợ giải đáp thắc mắc 24/7, giúp bạn hiểu sâu hơn từng khái niệm và ghi nhớ lâu hơn.',
    featured: true,
  },
  {
    icon: Compass,
    title: 'Lộ trình học tập cá nhân',
    desc: 'Hệ thống tự động đề xuất lộ trình phù hợp với trình độ và mục tiêu của bạn.',
    featured: false,
  },
  {
    icon: Award,
    title: 'Chứng chỉ được công nhận',
    desc: 'Nhận chứng chỉ hoàn thành khóa học có giá trị khi nộp hồ sơ xin việc.',
    featured: false,
  },
  {
    icon: Rocket,
    title: 'Đề thi thực chiến',
    desc: 'Làm quen với định dạng đề thi thật, rèn luyện kỹ năng quản lý thời gian hiệu quả.',
    featured: false,
  },
  {
    icon: MessageSquareHeart,
    title: 'Cộng đồng sôi động',
    desc: 'Kết nối với hàng nghìn học viên, chia sẻ kinh nghiệm và cùng nhau tiến bộ.',
    featured: false,
  },
  {
    icon: ShieldCheck,
    title: 'Học không rủi ro',
    desc: 'Dùng thử 7 ngày miễn phí. Không hài lòng? Hoàn tiền 100% - không cần lý do.',
    featured: false,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

export function ModernWhyUs() {
  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-32 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 opacity-10"
          style={{
            background: 'radial-gradient(circle, hsl(var(--color-primary)) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 opacity-10"
          style={{
            background: 'radial-gradient(circle, hsl(var(--color-primary)) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-full relative z-10" style={{ overflowX: 'hidden' }}>
        {/* Premium asymmetric header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16 md:mb-20">
          <motion.div
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
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary">Tại sao chọn chúng tôi</span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              <span className="bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
                Nền tảng học tập
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                đáng tin cậy
              </span>
            </h2>
          </motion.div>

          <motion.div
            className="flex md:justify-end items-start md:items-end"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="text-left md:text-right">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2">
                <span className="bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent">6+</span>
              </div>
              <p className="text-base sm:text-lg text-muted-foreground">
                Tính năng nổi bật được thiết kế riêng cho bạn
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bento Grid with Premium Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          style={{ overflow: 'hidden' }}
        >
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className={`group relative ${idx === 0 ? 'lg:row-span-2' : ''}`}
            >
              {/* Gradient glow on hover */}
              <div
                className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.3) 0%, hsl(210 70% 60% / 0.3) 100%)',
                  filter: 'blur(15px)',
                }}
              />

              <motion.div
                className="relative h-full rounded-2xl p-6 sm:p-7 md:p-8 overflow-hidden transition-all duration-500 hover:-translate-y-1"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 4px 30px rgba(0,0,0,0.04)',
                }}
                whileHover={{
                  boxShadow: '0 16px 50px rgba(0,0,0,0.1)',
                  borderColor: 'hsl(var(--color-primary) / 0.3)',
                }}
              >
                {/* Decorative corner gradient */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 opacity-15 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, hsl(var(--color-primary) / 0.5) 0%, transparent 70%)',
                    filter: 'blur(30px)',
                    transform: 'translate(30%, -30%)',
                  }}
                />

                {/* Icon with premium styling */}
                <motion.div
                  className="relative z-10 p-3 sm:p-4 rounded-2xl w-fit mb-5 sm:mb-6 md:mb-7 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.15) 0%, hsl(var(--color-primary) / 0.05) 100%)',
                    border: '1px solid hsl(var(--color-primary) / 0.2)',
                    boxShadow: '0 4px 20px hsl(var(--color-primary) / 0.1)',
                  }}
                  whileHover={{
                    boxShadow: '0 8px 30px hsl(var(--color-primary) / 0.2)',
                  }}
                >
                  <feature.icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </motion.div>

                <div className="relative z-10">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>

                  {/* Featured card gets extra content */}
                  {idx === 0 && (
                    <motion.div
                      className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-border/50"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                    >
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex -space-x-2">
                          {[1, 2, 3, 4].map((i) => (
                            <motion.div
                              key={i}
                              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border-2 border-background shadow-md"
                              style={{
                                background: `linear-gradient(135deg, hsl(${210 + i * 8} 70% ${50 + i * 3}%) 0%, hsl(${210 + i * 8} 70% ${40 + i * 3}%) 100%)`,
                              }}
                              whileHover={{ scale: 1.1, zIndex: 10 }}
                            />
                          ))}
                        </div>
                        <span className="font-medium">
                          <span className="text-primary font-bold">2,400+</span> học viên sử dụng AI mỗi ngày
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
