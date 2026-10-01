# 18. Tiêu chuẩn viết code (Coding Standards & Best Practices)

Tài liệu này quy định các chuẩn mực lập trình (Coding Standards) áp dụng đồng bộ trong dự án, đảm bảo mã nguồn dễ đọc, sạch sẽ, tối ưu hiệu năng và dễ dàng bảo trì.

---

## 18.1. TypeScript & Cấu hình Biên dịch (TypeScript Guidelines)

*   **Bắt buộc Strict Mode:** File `tsconfig.json` cấu hình `"strict": true`.
*   **Tránh dùng kiểu `any`:** Tất cả các biến, tham số hàm, dữ liệu trả về đều phải định nghĩa kiểu dữ liệu (Type hoặc Interface) cụ thể. Nếu không biết trước kiểu dữ liệu, sử dụng kiểu `unknown` và thực hiện Type Guarding trước khi ép kiểu.
*   **Quy ước đặt tên:**
    *   **Interface / Type:** Dạng PascalCase (Ví dụ: `interface ExamAttemptAnswer`).
    *   **Functions / Variables:** Dạng camelCase (Ví dụ: `const calculateScore`).
    *   **Enums / Constants:** Dạng UPPER_SNAKE_CASE (Ví dụ: `const DEFAULT_PAGE_LIMIT = 10`).

---

## 18.2. Phân chia React Server Components (RSC) & Client Components

Dự án sử dụng Next.js App Router, do đó cần hiểu rõ sự khác biệt giữa hai loại Component để tối ưu hóa SEO và tốc độ tải trang ban đầu:

### Nguyên tắc phân chia:
*   **React Server Components (Mặc định):** Sử dụng cho các component chỉ hiển thị dữ liệu tĩnh, fetch dữ liệu trực tiếp từ Database hoặc gọi Service. Không sử dụng react hooks (`useState`, `useEffect`) hoặc các sự kiện tương tác (`onClick`, `onChange`).
*   **Client Components (Khai báo `"use client"` ở hàng đầu tiên):** Chỉ sử dụng khi component có sự tương tác của người dùng:
    *   Các biểu mẫu (Forms) sử dụng React Hook Form.
    *   Trình đếm ngược thời gian thi thử (Countdown Timer).
    *   Các biểu đồ động Recharts.
    *   Các hộp thoại Dialog/Modal có trạng thái đóng/mở.

---

## 18.3. Quản lý kết nối Database (Prisma Best Practices)

Trong môi trường phát triển (Development) của Next.js, cơ chế Fast Refresh sẽ khởi chạy lại các module liên tục, dẫn đến việc tạo mới hàng trăm kết nối trùng lặp làm treo cơ sở dữ liệu PostgreSQL.

### Thiết lập Prisma Client Singleton (`src/lib/prisma.ts`):
```typescript
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
```

---

## 18.4. Tiêu chuẩn Xử lý lỗi & Logging

### 1. Chuẩn hóa Class Lỗi nghiệp vụ (`AppError.ts`)
Chúng ta xây dựng một Class mở rộng từ Error mặc định của JS để bổ sung mã trạng thái HTTP (status code) và mã lỗi tùy chỉnh phục vụ phản hồi API:

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details: any[];

  constructor(message: string, statusCode = 400, errorCode = "BAD_REQUEST", details: any[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

### 2. Định dạng Log chuẩn (Logging Standards)
Sử dụng thư viện **Pino** hoặc **Winston** để ghi log. Tuyệt đối không sử dụng `console.log` trên môi trường Production.
*   **Log định dạng JSON:** Giúp các hệ thống thu thập log (Elasticsearch, Loki) phân tích cú pháp dễ dàng.
*   **Quy tắc che dấu dữ liệu nhạy cảm (Data Masking):** Trước khi ghi log một Request Body, bộ lọc logger phải tự động xóa hoặc ẩn đi các trường nhạy cảm như `password`, `refresh_token`, `access_token` thành dấu `*` để bảo mật.
