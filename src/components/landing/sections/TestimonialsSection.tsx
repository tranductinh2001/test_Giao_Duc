'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Nguyễn Văn A',
    role: 'Học viên',
    content: 'VCGo đã giúp tôi đậu kỳ thi viên chức Y tế với điểm số cao. Hệ thống AI rất thông minh, biết điểm yếu của tôi và đề xuất bài tập phù hợp.',
    rating: 5,
    avatar: 'NV',
  },
  {
    name: 'Trần Thị B',
    role: 'Giáo viên',
    content: 'Tôi sử dụng VCGo để ôn thi công chức và đã đậu ngay lần đầu. Ngân hàng câu hỏi rất phong phú, sát với đề thi thực tế.',
    rating: 5,
    avatar: 'TB',
  },
  {
    name: 'Lê Văn C',
    role: 'Sinh viên',
    content: 'Giao diện dễ sử dụng, câu hỏi chất lượng cao. Tôi đặc biệt thích tính năng theo dõi tiến độ học tập.',
    rating: 5,
    avatar: 'LC',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/40 border-y border-border/50">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Học Viên Nói Gì?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Chia sẻ từ những học viên đã thành công
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="p-6 rounded-xl bg-card border border-border shadow-sm relative flex flex-col justify-between"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div>
                <Quote className="absolute top-4 right-4 w-8 h-8 text-foreground/10 pointer-events-none" />
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{testimonial.content}</p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-primary/10 text-primary">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
