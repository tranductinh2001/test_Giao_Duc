'use client';

import { Check, Sparkles, Zap, Crown, Star } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const plans = [
  {
    name: 'Miễn Phí',
    price: '0đ',
    period: 'mãi mãi',
    desc: 'Dùng thử nền tảng với các bài học miễn phí.',
    features: [
      'Truy cập 50+ bài học miễn phí',
      'Diễn đàn cộng đồng',
      'Truy cập trên mobile + web',
      'Theo dõi tiến độ cơ bản',
    ],
    cta: 'Bắt Đầu Ngay',
    highlight: false,
    icon: Zap,
  },
  {
    name: 'Pro',
    price: '199,000đ',
    period: '/tháng',
    desc: 'Mọi thứ bạn cần để học nghiêm túc.',
    features: [
      'Truy cập không giới hạn tất cả khóa học',
      'Trợ lý AI trong mọi bài học',
      'Chứng chỉ được xác thực',
      'Xem lại lịch sử bài thi chi tiết',
      'Tải tài liệu để học offline',
    ],
    cta: 'Dùng Thử 7 Ngày',
    highlight: true,
    icon: Sparkles,
  },
  {
    name: 'Doanh Nghiệp',
    price: '499,000đ',
    period: '/người/tháng',
    desc: 'Cho tổ chức muốn đào tạo nhân sự.',
    features: [
      'Tất cả tính năng Pro',
      'Dashboard quản lý nhóm',
      'SSO + quyền quản trị',
      'Quản lý tài khoản chuyên trách',
      'Lộ trình học tập tùy chỉnh',
    ],
    cta: 'Liên Hệ Tư Vấn',
    highlight: false,
    icon: Crown,
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

export function ModernPricing() {
  return (
    <section id="pricing" className="py-16 sm:py-20 md:py-28 lg:py-32 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-20"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--color-primary) / 0.1) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-full relative z-10" style={{ overflowX: 'hidden' }}>
        {/* Premium header */}
        <motion.div
          className="text-center mb-12 sm:mb-16 md:mb-20 max-w-3xl mx-auto"
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
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary">Bảng giá</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
              Bảng Giá
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Linh Hoạt
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
            Bắt đầu miễn phí, nâng cấp khi sẵn sàng. Hủy bất cứ lúc nào.
          </p>
        </motion.div>

        {/* Premium Pricing Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          style={{ overflow: 'hidden' }}
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              className={`relative group ${plan.highlight ? 'md:-mt-4 md:mb-4' : ''}`}
            >
              {/* Popular badge for highlighted plan */}
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                  <motion.span
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-primary-foreground shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(210 70% 55%) 100%)',
                      boxShadow: '0 4px 20px hsl(var(--color-primary) / 0.4)',
                    }}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Star className="h-3 w-3 fill-current" />
                    Phổ Biến Nhất
                  </motion.span>
                </div>
              )}

              {/* Gradient border effect */}
              <div
                className={`absolute -inset-[1px] rounded-2xl transition-opacity duration-500 ${
                  plan.highlight ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{
                  background: plan.highlight
                    ? 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(210 70% 55%) 50%, hsl(var(--color-primary)) 100%)'
                    : 'linear-gradient(135deg, hsl(var(--color-primary) / 0.5) 0%, hsl(210 70% 60% / 0.5) 100%)',
                  filter: 'blur(8px)',
                  padding: '1px',
                }}
              />

              <motion.div
                className={`relative flex flex-col rounded-2xl h-full transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-primary text-primary-foreground'
                    : ''
                }`}
                style={{
                  background: plan.highlight
                    ? 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(210 70% 50%) 100%)'
                    : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px)',
                  border: plan.highlight
                    ? '1px solid hsl(var(--color-primary) / 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.9)',
                  boxShadow: plan.highlight
                    ? '0 20px 60px hsl(var(--color-primary) / 0.3)'
                    : '0 8px 40px rgba(0,0,0,0.06)',
                }}
                whileHover={{
                  transform: plan.highlight ? 'scale(1.02)' : 'translateY(-4px)',
                  boxShadow: plan.highlight
                    ? '0 30px 80px hsl(var(--color-primary) / 0.4)'
                    : '0 16px 50px rgba(0,0,0,0.12)',
                }}
              >
                <div className="p-6 sm:p-7 md:p-8 flex-1">
                  <div className="space-y-5 sm:space-y-6">
                    {/* Plan header */}
                    <div className="flex items-center gap-3">
                      <motion.div
                        className={`p-2.5 rounded-xl ${
                          plan.highlight
                            ? 'bg-primary-foreground/20'
                            : ''
                        }`}
                        style={{
                          background: plan.highlight
                            ? 'rgba(255,255,255,0.2)'
                            : 'linear-gradient(135deg, hsl(var(--color-primary) / 0.15) 0%, hsl(var(--color-primary) / 0.05) 100%)',
                          border: plan.highlight
                            ? '1px solid rgba(255,255,255,0.2)'
                            : '1px solid hsl(var(--color-primary) / 0.2)',
                        }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <plan.icon
                          className={`h-5 w-5 ${
                            plan.highlight ? 'text-primary-foreground' : 'text-primary'
                          }`}
                        />
                      </motion.div>
                      <div>
                        <h3 className={`text-lg sm:text-xl font-bold ${
                          plan.highlight ? 'text-primary-foreground' : 'text-foreground'
                        }`}>
                          {plan.name}
                        </h3>
                        <p className={`text-xs sm:text-sm leading-relaxed ${
                          plan.highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}>
                          {plan.desc}
                        </p>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="py-4 border-t border-b"
                      style={{
                        borderColor: plan.highlight
                          ? 'rgba(255,255,255,0.2)'
                          : 'hsl(var(--color-border) / 0.5)',
                      }}
                    >
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <span className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight tabular-nums ${
                          plan.highlight ? 'text-primary-foreground' : 'text-foreground'
                        }`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {plan.price}
                        </span>
                        <span className={`text-xs sm:text-sm font-semibold ${
                          plan.highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}>
                          {plan.period}
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 sm:space-y-4">
                      {plan.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3"
                        >
                          <motion.span
                            className={`flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full ${
                              plan.highlight
                                ? 'bg-primary-foreground/20'
                                : 'bg-primary/10'
                            }`}
                            whileHover={{ scale: 1.1 }}
                          >
                            <Check
                              className={`h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3] ${
                                plan.highlight ? 'text-primary-foreground' : 'text-primary'
                              }`}
                            />
                          </motion.span>
                          <span className={`text-xs sm:text-sm leading-relaxed ${
                            plan.highlight ? 'text-primary-foreground/90' : 'text-foreground'
                          }`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA */}
                <div className="p-6 sm:p-7 md:p-8 pt-0">
                  <Link href="/register" className="block">
                    <motion.button
                      className={`w-full h-11 sm:h-12 md:h-13 rounded-xl font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        plan.highlight
                          ? 'bg-primary-foreground text-primary hover:brightness-95 shadow-lg'
                          : 'bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
                      }`}
                      style={{
                        boxShadow: plan.highlight
                          ? '0 4px 15px rgba(0,0,0,0.2)'
                          : '0 4px 20px hsl(var(--color-primary) / 0.3)',
                      }}
                      whileHover={{
                        scale: 1.02,
                        boxShadow: plan.highlight
                          ? '0 6px 20px rgba(0,0,0,0.25)'
                          : '0 8px 30px hsl(var(--color-primary) / 0.4)',
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {plan.cta}
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer note */}
        <motion.div
          className="mt-12 sm:mt-16 md:mt-20 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-sm sm:text-base text-muted-foreground">
            Cần gói tùy chỉnh cho tổ chức?{' '}
            <Link
              href="#"
              className="font-semibold text-primary hover:text-primary/80 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors"
            >
              Liên Hệ Tư Vấn
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
