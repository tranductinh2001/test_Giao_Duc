'use client';

import { motion } from 'framer-motion';
import { Brain, BookOpen, TrendingUp, Shield, Clock, Award } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI Cá Nhân Hóa',
    description: 'Hệ thống AI phân tích năng lực và đề xuất lộ trình học tập phù hợp với từng người dùng.',
  },
  {
    icon: BookOpen,
    title: 'Ngân Hàng Câu Hỏi Lớn',
    description: 'Hơn 15,000 câu hỏi được biên soạn bởi chuyên gia, cập nhật liên tục theo quy định mới.',
  },
  {
    icon: TrendingUp,
    title: 'Theo Dõi Tiến Độ',
    description: 'Biểu đồ trực quan giúp bạn theo dõi sự tiến bộ và xác định điểm cần cải thiện.',
  },
  {
    icon: Shield,
    title: 'Đề Thi Chuẩn',
    description: 'Tất cả đề thi đều được biên soạn theo cấu trúc và nội dung chuẩn quy định hiện hành.',
  },
  {
    icon: Clock,
    title: 'Học Mọi Lúc',
    description: 'Truy cập mọi lúc mọi nơi trên thiết bị. Học tập linh hoạt theo thời gian của bạn.',
  },
  {
    icon: Award,
    title: 'Chứng Nhận',
    description: 'Nhận chứng chỉ hoàn thành khóa học để xác nhận năng lực và thành tích.',
  },
];

export default function WhyUsSection() {
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Tại Sao Chọn VCGo?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Chúng tôi cung cấp giải pháp học tập tốt nhất để bạn tự tin đạt kết quả cao trong kỳ thi
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="p-6 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-primary/10 text-primary">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
