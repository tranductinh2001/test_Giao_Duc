# 🎓 CIVILPREP - Nền tảng Ôn thi Công chức & Viên chức

[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8.0-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> Một nền tảng ôn thi trực tuyến hiện đại dành cho các kỳ thi công chức và viên chức tại Việt Nam. Xây dựng với Next.js 16, TypeScript, và PostgreSQL.

## ✨ Tính năng chính

### 👨‍💼 Dành cho Admin
- ✅ **Quản lý ngân hàng câu hỏi** với cấu trúc phân cấp theo danh mục
- ✅ **Import hàng loạt** từ file Word (.docx) và Excel (.xlsx)
- ✅ **Export câu hỏi** ra Excel với bộ lọc linh hoạt
- ✅ **Quản lý người dùng** và phân quyền (Admin/Learner)
- ✅ **Hệ thống License** - tạo và kích hoạt gói học tập
- ✅ **Dashboard thống kê** toàn diện
- ✅ **Quản lý đề thi** - tạo đề tự động hoặc thủ công

### 🎓 Dành cho Học viên
- ✅ **Làm đề thi thử** với bấm giờ tự động
- ✅ **Xem kết quả chi tiết** - điểm số, đáp án đúng/sai
- ✅ **Lưu câu hỏi sai** để ôn lại
- ✅ **Bookmark câu hỏi** quan trọng
- ✅ **Báo cáo năng lực** - biểu đồ tiến độ, phân tích điểm yếu
- ✅ **Kích hoạt License** để mở khóa nội dung

## 🚀 Demo

**Link demo:** [https://your-demo-link.vercel.app](https://your-demo-link.vercel.app) _(Coming soon)_

**Tài khoản thử nghiệm:**
- **Admin:** `admin@gmail.com` / `admin12345`
- **Learner:** `learner@gmail.com` / `learner12345`

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** TailwindCSS 4
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Neon.tech)
- **ORM:** Prisma 7.8
- **Authentication:** NextAuth.js 5 (Credentials + Google OAuth)
- **Deployment:** Vercel

## 📦 Cài đặt

### Yêu cầu hệ thống
- Node.js 20+
- PostgreSQL 14+

### Các bước cài đặt

1. **Clone repository**
```bash
git clone https://github.com/tranductinh2001/GiaoDucOnline.git
cd GiaoDucOnline/education-platform
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Thiết lập biến môi trường**

Tạo file `.env` trong thư mục gốc:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-here-32-characters-min"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

4. **Thiết lập Database**

```bash
# Tạo database tables
npx prisma db push

# Seed dữ liệu mẫu
npm run seed
```

5. **Chạy development server**

```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000) để xem kết quả.

## 📚 Tài liệu

Xem thư mục `docs/` để có tài liệu chi tiết về:

1. [Tổng quan dự án](docs/01-project-overview.md)
2. [Yêu cầu sản phẩm](docs/02-product-requirements.md)
3. [Luồng người dùng](docs/03-user-flow.md)
4. [Kiến trúc hệ thống](docs/04-system-architecture.md)
5. [Thiết kế Database](docs/05-database-design.md)
6. [Thiết kế API](docs/06-api-design.md)
7. [Xác thực & Phân quyền](docs/07-authentication.md)
8. [Hệ thống License](docs/08-license-system.md)
9. [Quản lý ngân hàng câu hỏi](docs/09-question-bank.md)
10. [Import từ Word](docs/10-import-word.md)
11. [Import từ Excel](docs/11-import-excel.md)
12. [Cơ chế Sinh đề thi](docs/12-exam-engine.md)
13. [Hệ thống Chấm điểm](docs/13-scoring-system.md)
14. [Tổng hợp thống kê](docs/14-statistics.md)
15. [Giao diện Admin](docs/15-admin-dashboard.md)
16. [Giao diện Người học](docs/16-user-dashboard.md)
17. [Cấu trúc thư mục](docs/17-folder-structure.md)
18. [Tiêu chuẩn viết code](docs/18-coding-standard.md)
19. [Thiết kế UI/UX](docs/19-ui-design.md)
20. [Lộ trình phát triển](docs/20-development-roadmap.md)
21. **[Đề xuất Cải tiến & Tính năng Mới](docs/21-feature-improvements.md)** ⭐

## 🗂️ Cấu trúc Project

```
education-platform/
├── docs/                  # Tài liệu chi tiết (21 files)
├── prisma/               
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data mẫu
├── public/               # Static assets
├── scripts/              # Utility scripts
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Auth pages (login, register)
│   │   ├── admin/        # Admin dashboard
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Learner dashboard
│   │   └── exam/         # Exam taking interface
│   ├── components/       # Reusable React components
│   ├── features/         # Feature modules (questions, exams, licenses)
│   ├── lib/              # Utilities (Prisma client, API helpers)
│   └── types/            # TypeScript type definitions
├── .env                  # Environment variables
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run load tests
npm run load-test
```

## 📦 Deployment

### Deploy lên Vercel

1. Push code lên GitHub
2. Import project vào Vercel
3. Set environment variables trong Vercel dashboard
4. Deploy!

```bash
# Hoặc deploy từ CLI
vercel --prod
```

### Database (Neon)

1. Tạo project trên [Neon.tech](https://neon.tech)
2. Copy connection string vào `DATABASE_URL`
3. Run migrations: `npx prisma db push`

## 🔧 Scripts có sẵn

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run seed         # Seed database with sample data
```

## 🐛 Bug Fixes & Known Issues

Xem [docs/BUGFIX-CATEGORY-COUNT.md](docs/BUGFIX-CATEGORY-COUNT.md) để biết về lỗi đã sửa và cách xử lý.

## 🚀 Roadmap & Đề xuất tính năng

Xem [docs/21-feature-improvements.md](docs/21-feature-improvements.md) để biết các tính năng sắp tới:

- ✅ Phase 1: Foundation (Tháng 1-2)
  - Sửa bug đếm câu hỏi
  - Dashboard học viên nâng cao
  - Chế độ thi nhanh
  - PWA optimization

- 🔄 Phase 2: Growth (Tháng 3-4)
  - Subscription plans + payment gateway
  - Referral program
  - Smart review mode (Spaced Repetition)
  - Admin analytics dashboard
  - AI explanation (beta)

- 📅 Phase 3: Scale (Tháng 5-6)
  - Role-based access control chi tiết
  - Question versioning
  - Community features
  - Similar questions recommendation
  - Zalo Mini App (beta)

- 📅 Phase 4: Enterprise (Tháng 7+)
  - Google Classroom integration
  - React Native app
  - Advanced ML features
  - White-label solution

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Senior Architect:** Tran Duc Tinh
- **AI Pair Programming:** Claude Sonnet 4.6

## 📞 Contact

- **Email:** tranductinh2001@gmail.com
- **GitHub:** [@tranductinh2001](https://github.com/tranductinh2001)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Vercel for hosting
- Neon for PostgreSQL database
- Anthropic for Claude AI assistance

---

**⭐ Nếu project này hữu ích, hãy cho một star!**

Made with ❤️ in Vietnam
