'use client';

import { motion } from 'framer-motion';

const stats = [
  { value: '15,000+', label: 'Câu hỏi ôn thi', icon: '📝' },
  { value: '600+', label: 'Đề thi chất lượng', icon: '📋' },
  { value: '50,000+', label: 'Học viên', icon: '👥' },
  { value: '98%', label: 'Tỷ lệ đậu', icon: '🎯' },
];

export default function StatsSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/40 border-y border-border/50">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="text-center p-6 rounded-xl bg-card border border-border shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
