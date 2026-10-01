'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const categories = [
  { name: 'Viên Chức Y Tế', count: 2500, color: 'hsl(142, 76%, 36%)' },
  { name: 'Viên Chức Giáo Dục', count: 3000, color: 'hsl(210, 70%, 45%)' },
  { name: 'Công Chức Hành Chính', count: 2000, color: 'hsl(38, 92%, 50%)' },
  { name: 'Viên Chức Tài Chính', count: 1800, color: 'hsl(280, 65%, 50%)' },
  { name: 'Viên Chức Văn Hóa', count: 1500, color: 'hsl(190, 70%, 40%)' },
  { name: 'Viên Chức Lao Động', count: 1200, color: 'hsl(25, 95%, 55%)' },
];

export default function CategoriesSection() {
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Danh Mục Thi</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Lựa chọn danh mục phù hợp với mục tiêu nghề nghiệp của bạn
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              viewport={{ once: true }}
            >
              <Link
                href={`/categories/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'hsl(var(--color-card))',
                  borderColor: 'hsl(var(--color-border))',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{category.count} câu</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
