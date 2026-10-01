'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Users } from 'lucide-react';

const exams = [
  {
    title: 'Viên Chức Y Tế',
    description: 'Ôn thi viên chức Y tế các cấp',
    questionCount: 2500,
    duration: '90 phút',
    participants: 12000,
    color: 'hsl(142, 76%, 36%)',
  },
  {
    title: 'Viên Chức Giáo Dục',
    description: 'Ôn thi viên chức ngành Giáo dục',
    questionCount: 3000,
    duration: '120 phút',
    participants: 18000,
    color: 'hsl(210, 70%, 45%)',
  },
  {
    title: 'Công Chức Hành Chính',
    description: 'Ôn thi công chức hành chính',
    questionCount: 2000,
    duration: '90 phút',
    participants: 8500,
    color: 'hsl(38, 92%, 50%)',
  },
];

export default function FeaturedExamsSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Đề Thi Nổi Bật</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Các đề thi được biên soạn bởi chuyên gia, cập nhật theo chương trình mới nhất
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exams.map((exam, index) => (
            <motion.div
              key={index}
              className="p-6 rounded-xl border transition-all hover:shadow-lg"
              style={{
                backgroundColor: 'hsl(var(--color-card))',
                borderColor: 'hsl(var(--color-border))',
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: exam.color + '20' }}
              >
                <BookOpen className="w-6 h-6" style={{ color: exam.color }} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{exam.title}</h3>
              <p className="text-muted-foreground mb-4">{exam.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {exam.questionCount} câu
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {exam.duration}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {exam.participants.toLocaleString()} người
                </span>
                <Link
                  href={`/exams/${exam.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:underline"
                  style={{ color: exam.color }}
                >
                  Thi thử <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
