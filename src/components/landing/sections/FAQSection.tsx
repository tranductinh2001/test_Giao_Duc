'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'VCGo Education có miễn phí không?',
    answer: 'VCGo cung cấp cả gói miễn phí và trả phí. Gói miễn phí cho phép bạn truy cập một số tính năng cơ bản. Gói Premium mở khóa tất cả tính năng bao gồm AI cá nhân hóa và đề thi đầy đủ.',
  },
  {
    question: 'Làm thế nào để bắt đầu học?',
    answer: 'Bạn chỉ cần đăng ký tài khoản miễn phí, chọn danh mục thi mong muốn và bắt đầu luyện tập ngay. Hệ thống sẽ tự động theo dõi tiến độ của bạn.',
  },
  {
    question: 'Các đề thi có cập nhật không?',
    answer: 'Chúng tôi cập nhật ngân hàng câu hỏi liên tục theo quy định mới nhất từ Bộ Giáo dục. Bạn luôn nhận được câu hỏi sát với đề thi thực tế.',
  },
  {
    question: 'Có thể học trên điện thoại không?',
    answer: 'Có, VCGo hoạt động trên mọi thiết bị bao gồm điện thoại thông minh, tablet và máy tính. Bạn có thể học mọi lúc mọi nơi.',
  },
  {
    question: 'Làm thế nào để liên hệ hỗ trợ?',
    answer: 'Bạn có thể liên hệ qua email hỗ trợ, chat trực tiếp trên website hoặc gọi điện thoại. Đội ngũ hỗ trợ luôn sẵn sàng 24/7.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Câu Hỏi Thường Gặp</h2>
          <p className="text-muted-foreground text-lg">
            Giải đáp những thắc mắc thường gặp
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: 'hsl(var(--color-card))',
                borderColor: 'hsl(var(--color-border))',
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              viewport={{ once: true }}
            >
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-medium">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-muted-foreground">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
