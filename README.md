# Nền tảng Luyện thi Công chức / Viên chức trực tuyến

Chào mừng bạn đến với tài liệu kỹ thuật và thiết kế hệ thống cho Nền tảng Luyện thi Công chức & Viên chức. Đây là một ứng dụng Web hiện đại giúp người học ôn thi luyện tập, thi thử, tự động sinh đề, và phân tích hiệu quả học tập thông qua ngân hàng câu hỏi đa dạng.

---

## 🚀 Công nghệ sử dụng (Tech Stack)

Hệ thống được thiết kế và phát triển dựa trên các công nghệ tiên tiến nhất hiện nay để đảm bảo hiệu năng cao, bảo mật và khả năng mở rộng:

*   **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui.
*   **Backend**: Next.js Route Handlers (RESTful API).
*   **Authentication & Authorization**: Auth.js (NextAuth.vn) / JWT với RBAC (Role-Based Access Control).
*   **Database & ORM**: PostgreSQL kết hợp Prisma ORM.
*   **State Management**: Zustand (Client State).
*   **Form & Validation**: React Hook Form kết hợp Zod.
*   **Charts & Analytics**: Recharts.
*   **Storage**: Supabase Storage hoặc Cloudinary (cho các file media trong câu hỏi).

---

## 📂 Danh mục tài liệu thiết kế chi tiết (Documentation Index)

Tài liệu được phân chia thành 20 phần độc lập, bao quát mọi khía cạnh của hệ thống từ nghiệp vụ, thiết kế cơ sở dữ liệu, API, thuật toán cho tới tiêu chuẩn viết code và lộ trình phát triển:

1.  **Tổng quan dự án:** [01-project-overview.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/01-project-overview.md)
2.  **Yêu cầu sản phẩm:** [02-product-requirements.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/02-product-requirements.md)
3.  **Luồng người dùng (User Flow):** [03-user-flow.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/03-user-flow.md)
4.  **Kiến trúc hệ thống:** [04-system-architecture.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/04-system-architecture.md)
5.  **Thiết kế Cơ sở dữ liệu (Database Design):** [05-database-design.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/05-database-design.md)
6.  **Thiết kế API (API Specifications):** [06-api-design.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/06-api-design.md)
7.  **Xác thực & Phân quyền (Auth & RBAC):** [07-authentication.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/07-authentication.md)
8.  **Hệ thống License & Kích hoạt gói dịch vụ:** [08-license-system.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/08-license-system.md)
9.  **Quản lý ngân hàng câu hỏi:** [09-question-bank.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/09-question-bank.md)
10. **Quy trình Import dữ liệu từ file Word (.docx):** [10-import-word.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/10-import-word.md)
11. **Quy trình Import dữ liệu từ file Excel (.xlsx):** [11-import-excel.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/11-import-excel.md)
12. **Cơ chế Sinh đề thi tự động (Exam Engine):** [12-exam-engine.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/12-exam-engine.md)
13. **Hệ thống Chấm điểm & Phân tích điểm:** [13-scoring-system.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/13-scoring-system.md)
14. **Tổng hợp thống kê học tập (Analytics Engine):** [14-statistics.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/14-statistics.md)
15. **Giao diện Quản trị (Admin Dashboard):** [15-admin-dashboard.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/15-admin-dashboard.md)
16. **Giao diện Người học (User Dashboard):** [16-user-dashboard.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/16-user-dashboard.md)
17. **Cấu trúc thư mục dự án (Folder Structure):** [17-folder-structure.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/17-folder-structure.md)
18. **Tiêu chuẩn viết code (Coding Standards):** [18-coding-standard.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/18-coding-standard.md)
19. **Thiết kế giao diện UI/UX:** [19-ui-design.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/19-ui-design.md)
20. **Lộ trình phát triển & Kế hoạch kiểm thử:** [20-development-roadmap.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/20-development-roadmap.md)
21. **Đề xuất Cải tiến & Tính năng Mới:** [21-feature-improvements.md](file:///c:/Users/Admin/Desktop/MMO/educations/education-platform/docs/21-feature-improvements.md)

---

## 🛠️ Hướng dẫn cài đặt nhanh (Quickstart Guide)

Sau khi bộ tài liệu được duyệt và bắt đầu phát triển, bạn có thể triển khai dự án theo các bước:

### 1. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 2. Thiết lập biến môi trường
Tạo file `.env` ở thư mục gốc dựa theo `.env.example`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/education_db?schema=public"
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Đồng bộ Database Schema
```bash
npx prisma db push
npx prisma generate
```

### 4. Khởi chạy máy chủ phát triển
```bash
npm run dev
```

---
*Tài liệu này được biên soạn bởi Senior Software Architect & Tech Lead cho dự án Nền tảng ôn thi công chức.*
