'use client';

import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, MessageCircle, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

const faqs = [
  {
    q: 'Tôi có cần kiến thức nền trước khi bắt đầu không?',
    a: 'Không nhất thiết. Mỗi khóa học đều được đánh dấu mức độ, và hầu hết lộ trình bắt đầu từ cơ bản. Trợ lý AI của chúng tôi cũng sẽ điều chỉnh giải thích phù hợp với trình độ của bạn.',
  },
  {
    q: 'Mất bao lâu để hoàn thành một khóa học?',
    a: 'Hầu hết các khóa học kéo dài từ 20-60 giờ học tập tập trung. Bạn học theo tốc độ của riêng mình - không có deadline, và tiến độ được lưu trên mọi thiết bị.',
  },
  {
    q: 'Chứng chỉ có được công nhận không?',
    a: 'Có. Chứng chỉ của chúng tôi bao gồm link xác thực mà nhà tuyển dụng có thể kiểm tra, và được chấp nhận bởi hàng nghìn đơn vị tuyển dụng. Chúng tôi không cấp bằng cấp chính quy.',
  },
  {
    q: 'Tôi có thể hủy bất cứ lúc nào không?',
    a: 'Có. Bạn có thể hủy gói Pro từ tài khoản của mình bất cứ lúc nào, và bạn sẽ giữ quyền truy cập cho đến hết chu kỳ thanh toán.',
  },
  {
    q: 'Có giảm giá cho sinh viên hoặc nhóm không?',
    a: 'Chúng tôi cung cấp giảm 50% gói Pro cho sinh viên được xác minh, và giá ưu đãi cho nhóm từ 5 người trở lên. Liên hệ đội ngũ chúng tôi để biết thêm chi tiết.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
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

export function ModernFAQ() {
  return (
    <section id="faq" className="py-16 sm:py-20 md:py-28 lg:py-32 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 right-0 w-96 h-96 opacity-10"
          style={{
            background: 'radial-gradient(circle, hsl(var(--color-primary)) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 opacity-10"
          style={{
            background: 'radial-gradient(circle, hsl(var(--color-primary)) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-full relative z-10" style={{ overflowX: 'hidden' }}>
        {/* Premium header */}
        <motion.div
          className="max-w-3xl mx-auto text-center mb-10 sm:mb-14 md:mb-16"
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
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary">FAQ</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-3 sm:mb-4 md:mb-5">
            <span className="bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
              Câu Hỏi
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Thường Gặp
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed px-2">
            Tất cả những gì bạn cần biết về nền tảng của chúng tôi
          </p>
        </motion.div>

        {/* Premium Accordion */}
        <motion.div
          className="max-w-3xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <Accordion type="single" collapsible className="space-y-3 sm:space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={faq.q}
                variants={itemVariants}
                className="group relative"
              >
                {/* Glow effect */}
                <div
                  className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.3) 0%, hsl(210 70% 60% / 0.3) 100%)',
                    filter: 'blur(8px)',
                  }}
                />

                <AccordionItem
                  value={`item-${i}`}
                  className="relative rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 4px 30px rgba(0,0,0,0.04)',
                  }}
                >
                  <AccordionTrigger
                    className="text-left font-semibold text-foreground py-4 sm:py-5 md:py-6 px-5 sm:px-6 md:px-7 hover:no-underline group transition-all duration-200 text-sm sm:text-base"
                    style={{ paddingRight: '3rem' }}
                  >
                    <span className="pr-4">{faq.q}</span>
                    <motion.div
                      className="absolute right-4 sm:right-5 md:right-6 p-2 rounded-xl transition-all duration-300"
                      style={{
                        background: 'hsl(var(--color-primary) / 0.1)',
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary transition-transform duration-300 group-data-[state=open]:rotate-180" />
                    </motion.div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-4 sm:pb-5 md:pb-6 px-5 sm:px-6 md:px-7 text-sm sm:text-base">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>

        {/* Premium CTA Card */}
        <motion.div
          className="mt-12 sm:mt-16 md:mt-20 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div
            className="relative rounded-2xl overflow-hidden"
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
                background: 'radial-gradient(ellipse at 50% 100%, hsl(var(--color-primary) / 0.2) 0%, transparent 70%)',
              }}
            />

            <div className="relative z-10 p-6 sm:p-8 md:p-10 text-center">
              <motion.div
                className="inline-flex items-center justify-center p-3 rounded-2xl mb-4 sm:mb-5"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--color-primary) / 0.15) 0%, hsl(var(--color-primary) / 0.05) 100%)',
                  border: '1px solid hsl(var(--color-primary) / 0.2)',
                }}
                whileHover={{ scale: 1.05 }}
              >
                <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </motion.div>
              <p className="text-base sm:text-lg text-muted-foreground mb-5 sm:mb-6 font-medium">
                Không tìm thấy câu trả lời bạn cần?
              </p>
              <Link href="/feedback">
                <motion.button
                  className="inline-flex items-center justify-center h-11 sm:h-12 md:h-13 px-6 sm:px-8 md:px-10 text-sm sm:text-base font-semibold rounded-xl text-primary-foreground transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(210 70% 55%) 100%)',
                    boxShadow: '0 4px 20px hsl(var(--color-primary) / 0.3)',
                  }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: '0 8px 30px hsl(var(--color-primary) / 0.4)',
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  Liên Hệ Hỗ Trợ
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
