# 17. Cấu trúc Thư mục Dự án (Project Folder Structure)

Dự án áp dụng cấu trúc thư mục dạng **Feature-Based (Phân tách theo tính năng)** kết hợp với mô hình App Router của Next.js 14+. Cấu trúc này giúp các nhà phát triển dễ dàng định vị các file liên quan đến cùng một nghiệp vụ mà không cần nhảy qua lại giữa các folder xa nhau.

---

## 17.1. Sơ đồ cây thư mục (Directory Tree Diagram)

Dưới đây là sơ đồ bố trí cấu trúc mã nguồn tổng thể của dự án:

```text
education-platform/
├── 📁 prisma/
│   ├── 📄 schema.prisma             # Định nghĩa thực thể Database
│   └── 📄 seed.ts                   # Script tạo dữ liệu mẫu ban đầu
├── 📁 public/                       # Assets tĩnh (logo, hình ảnh,...)
├── 📁 src/
│   ├── 📁 app/                      # Next.js App Router (Routing & Pages)
│   │   ├── 📄 layout.tsx            # Root Layout (chứa providers, font)
│   │   ├── 📄 page.tsx              # Landing page giới thiệu
│   │   ├── 📁 (auth)/               # Route Group cho xác thực
│   │   │   ├── 📁 login/            # /login
│   │   │   └── 📁 register/         # /register
│   │   ├── 📁 admin/                # Route Group Admin (Yêu cầu quyền ADMIN)
│   │   │   ├── 📄 layout.tsx        # Layout Sidebar Admin
│   │   │   ├── 📄 page.tsx          # Admin Dashboard Overview
│   │   │   ├── 📁 licenses/         # Quản lý License
│   │   │   ├── 📁 questions/        # Quản lý câu hỏi & import
│   │   │   └── 📁 users/            # Quản lý người dùng
│   │   ├── 📁 dashboard/            # Học viên Dashboard (/dashboard)
│   │   │   ├── 📄 layout.tsx
│   │   │   ├── 📄 page.tsx
│   │   │   ├── 📁 bookmarks/        # Câu hỏi yêu thích
│   │   │   ├── 📁 history/          # Lịch sử và xem lại bài thi
│   │   │   ├── 📁 practice/         # Ôn tập theo chuyên đề
│   │   │   └── 📁 wrong-answers/    # Ôn tập câu sai
│   │   ├── 📁 exam/                 # Giao diện làm bài thi (/exam/[id])
│   │   │   └── 📁 [id]/
│   │   └── 📁 api/                  # API Route Handlers (Backend Endpoints)
│   │       ├── 📁 auth/             # API đăng ký, đăng nhập
│   │       ├── 📁 license/          # API liên quan đến kích hoạt license
│   │       ├── 📁 exams/            # API làm bài thi, nộp bài thi
│   │       └── 📁 admin/            # API Admin (câu hỏi, import, user, code)
│   ├── 📁 components/               # UI Components dùng chung toàn hệ thống
│   │   ├── 📁 ui/                   # Các component từ shadcn/ui (Button, Dialog, Table,...)
│   │   ├── 📄 header.tsx
│   │   ├── 📄 sidebar.tsx
│   │   └── 📄 footer.tsx
│   ├── 📁 features/                 # Lớp Nghiệp vụ chia theo tính năng (Feature Layer)
│   │   ├── 📁 auth/                 # Tính năng Xác thực
│   │   ├── 📁 questions/            # Tính năng Quản lý ngân hàng câu hỏi & parsers
│   │   ├── 📁 exams/                # Tính năng Động cơ thi thử & chấm điểm
│   │   ├── 📁 licenses/             # Tính năng Sinh/Kích hoạt License
│   │   └── 📁 statistics/           # Tính năng Thống kê & Phân tích điểm
│   ├── 📁 lib/                      # Các thư viện và tiện ích cấu hình dùng chung
│   │   ├── 📄 prisma.ts             # Khởi tạo duy nhất Prisma Client (Singleton)
│   │   ├── 📄 utils.ts              # Hàm format, cn helper cho Tailwind
│   │   └── 📄 logger.ts             # Cấu hình logging tập trung (Winston/Pino)
│   ├── 📁 stores/                   # Quản lý Client State (Zustand)
│   │   ├── 📄 examStore.ts          # State làm bài thi (lưu tạm đáp án ở client)
│   │   └── 📄 uiStore.ts            # State UI (sidebar toggle, theme)
│   └── 📄 middleware.ts             # Router guard (phân quyền Auth, RBAC)
├── 📄 .env                          # Cấu hình biến môi trường cục bộ
├── 📄 package.json                  # Khai báo thư viện phụ thuộc
├── 📄 tailwind.config.ts            # Cấu hình Tailwind CSS
└── 📄 tsconfig.json                 # Cấu hình TypeScript compiler
```

---

## 17.2. Giải thích chi tiết các Thư mục cốt lõi

### 1. Thư mục `src/features/` (Feature Layer)
Mỗi thư mục con trong `features` chứa các thành phần nghiệp vụ khép kín của tính năng đó:
*   `repositories/`: Chứa các class giao tiếp Database qua Prisma (ví dụ: `QuestionRepository.ts`).
*   `services/`: Chứa Business Logic (ví dụ: `ScoringService.ts`, `WordImportService.ts`).
*   `schemas/`: Chứa các schema kiểm định kiểu dữ liệu Zod (ví dụ: `questionSchema.ts`).
*   `components/`: Các React component phức tạp chỉ dùng riêng cho tính năng này.

### 2. Thư mục `src/app/api/` (API Layer)
Đây là các Router Handlers của Next.js nhận Request từ Frontend:
*   Họ không được chứa mã SQL/Prisma trực tiếp.
*   Nhiệm vụ chính: Trích xuất session người dùng, gọi Schema để validate body, chuyển tiếp dữ liệu đến lớp `Service` tương ứng trong thư mục `src/features/`, nhận kết quả và trả về JSON định dạng chuẩn.

### 3. Thư mục `src/components/ui/` (Presentation Component Library)
Nơi chứa các Component nguyên tử (atomic components) được sinh ra bởi **shadcn/ui** thông qua CLI (ví dụ: `button.tsx`, `dialog.tsx`, `input.tsx`).
*   Tuyệt đối không sửa đổi logic nghiệp vụ trong các file này.
*   Chỉ chỉnh sửa CSS/Tailwind để thay đổi style đồng bộ cho toàn dự án.
