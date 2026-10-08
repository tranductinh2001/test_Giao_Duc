'use client';

import { GraduationCap, Phone, MessageCircle, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface ModernFooterProps {
  className?: string;
}

const footerLinks = {
  services: [
    { label: 'Giới thiệu', href: '#' },
    { label: 'Khóa học', href: '/dashboard/exams' },
    { label: 'Ôn thi viên chức', href: '/practice' },
    { label: 'Thẩm định giáo án AI', href: '/lesson-plans/review' },
    { label: 'Ngân hàng câu hỏi', href: '/dashboard' },
  ],
  resources: [
    { label: 'Blog', href: '#' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Góp ý', href: '/feedback' },
    { label: 'Tuyển dụng', href: '/recruitment' },
  ],
  legal: [
    { label: 'Điều khoản sử dụng', href: '#' },
    { label: 'Chính sách bảo mật', href: '#' },
    { label: 'Chính sách hoàn tiền', href: '#' },
  ],
};

export function ModernFooter({ className = '' }: ModernFooterProps) {
  return (
    <footer
      className={`relative overflow-hidden bg-gradient-to-b from-background to-card border-t border-border ${className}`}
    >
      {/* Top gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute bottom-0 left-1/4 w-96 h-96 opacity-5 bg-primary rounded-full blur-3xl"
        />
      </div>

      <div
        className="container mx-auto px-4 md:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24 max-w-full relative z-10"
        style={{ overflowX: 'hidden' }}
      >
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 md:gap-12 mb-10 sm:mb-14 md:mb-16">

          {/* Brand & About Column - Spans 2 cols on lg */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 group mb-5 sm:mb-6">
              <motion.div
                className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
              </motion.div>
              <span className="font-bold text-base sm:text-lg text-foreground tracking-tight group-hover:text-primary transition-colors duration-200">
                VCGo Education
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 sm:mb-6 max-w-sm">
              Nền tảng giáo dục ứng dụng AI hỗ trợ ôn thi viên chức, công chức, phân tích giáo án, ngân hàng câu hỏi và học tập trực tuyến.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 sm:space-y-4">
              <motion.a
                href="tel:0352911750"
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 group"
                whileHover={{ x: 4 }}
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="font-medium">0352911750</span>
              </motion.a>
              <motion.a
                href="https://zalo.me/0352911750"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-blue-500 transition-colors duration-200 group"
                whileHover={{ x: 4 }}
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="font-medium">Zalo: 0352911750</span>
              </motion.a>
              <motion.a
                href="https://www.facebook.com/profile.php?id=61591503491332"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-blue-600 transition-colors duration-200 group"
                whileHover={{ x: 4 }}
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="font-medium">Facebook</span>
              </motion.a>
            </div>
          </div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h4 className="font-semibold text-foreground mb-4 sm:mb-5 text-sm sm:text-base">
              Dịch vụ
            </h4>
            <ul className="space-y-2.5 sm:space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 inline-flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Resources */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <h4 className="font-semibold text-foreground mb-4 sm:mb-5 text-sm sm:text-base">
              Tài nguyên
            </h4>
            <ul className="space-y-2.5 sm:space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 inline-flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Legal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="font-semibold text-foreground mb-4 sm:mb-5 text-sm sm:text-base">
              Pháp lý
            </h4>
            <ul className="space-y-2.5 sm:space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 inline-flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Newsletter CTA */}
        <motion.div
          className="mb-10 sm:mb-14 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="relative rounded-2xl overflow-hidden bg-primary/5 border border-primary/15"
          >
            <div className="p-6 sm:p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-1 sm:mb-2 text-base sm:text-lg">
                    Đăng ký nhận tin tức
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Nhận thông báo về khóa học mới và cập nhật quan trọng
                  </p>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="email"
                    placeholder="Email của bạn"
                    className="h-11 sm:h-12 px-4 rounded-xl text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 w-full md:w-64"
                  />
                  <motion.button
                    className="h-11 sm:h-12 px-5 sm:px-6 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:brightness-110 transition-all duration-200 flex-shrink-0"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <div
          className="pt-6 sm:pt-8 border-t border-border"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground text-center">
            <p>© {new Date().getFullYear()} VCGo Education. Tất cả quyền được bảo lưu.</p>
            <p className="flex items-center gap-1.5">
              Được xây dựng với{' '}
              <span className="text-red-500">❤</span>{' '}
              cho người học Việt Nam.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
