# 04. Kiến trúc hệ thống (System Architecture)

Hệ thống được thiết kế theo hướng **Clean Architecture** kết hợp **Feature-Based Layout** giúp tối ưu khả năng mở rộng, độc lập giữa các lớp nghiệp vụ và dễ dàng kiểm thử (Testability).

---

## 4.1. Tổng quan các tầng kiến trúc (Architectural Layers)

Hệ thống chia làm 4 tầng chính với nguyên tắc chiều phụ thuộc (Dependency Rule) chỉ hướng từ ngoài vào trong:

```mermaid
graph TD
    subgraph Presentation Layer (UI)
        A[Next.js Components / Pages] --> B[Zustand Client State]
    end

    subgraph Controller / Routing Layer
        C[Next.js Route Handlers / API] --> D[Zod Validation / DTOs]
    end

    subgraph Service Layer (Business Logic)
        E[Exam Service]
        F[Question Service]
        G[License Service]
        H[User Service]
    end

    subgraph Repository Layer (Data Access)
        I[Prisma Client / Repositories]
    end

    subgraph Data Source Layer
        J[(PostgreSQL Database)]
        K[Supabase Storage]
    end

    A --> C
    C --> E
    C --> F
    C --> G
    C --> H
    E --> I
    F --> I
    G --> I
    H --> I
    I --> J
    F --> K
```

---

## 4.2. Chi tiết vai trò từng lớp (Layer Responsibilities)

### 1. Presentation Layer (Tầng hiển thị)
*   **Công nghệ:** Next.js (App Router), Tailwind CSS, shadcn/ui, Zustand.
*   **Nhiệm vụ:**
    *   Nhận tương tác của người dùng, hiển thị dữ liệu và xử lý các trạng thái Client-side.
    *   Sử dụng **React Hook Form + Zod** để Validate dữ liệu đầu vào ngay tại giao diện (Client-side Validation).
    *   Quản lý state cục bộ bằng Zustand để tránh hiện tượng "prop drilling".

### 2. Controller / API Routing Layer (Tầng điều phối)
*   **Công nghệ:** Next.js Route Handlers (`/app/api/.../route.ts`).
*   **Nhiệm vụ:**
    *   Đóng vai trò là các API Gateway/Controller tiếp nhận các HTTP Request.
    *   Thực hiện kiểm tra tính hợp lệ của Request Payload (Request Body, Query Params) bằng Zod Schema (Server-side Validation).
    *   Áp dụng RBAC Middleware để kiểm tra Token (JWT) và quyền truy cập (Admin/Learner).
    *   Chuyển đổi dữ liệu thô sang Data Transfer Objects (DTOs) trước khi chuyển vào Service Layer.
    *   Bắt lỗi ngoại lệ (Global Error Handler) và trả về định dạng JSON chuẩn.

### 3. Service Layer (Tầng nghiệp vụ chính)
*   **Nhiệm vụ:**
    *   Nơi chứa toàn bộ Business Logic của hệ thống (Ví dụ: Thuật toán chấm điểm, thuật toán sinh đề ngẫu nhiên theo ma trận chuyên đề không trùng câu, tạo chuỗi License Code mã hóa).
    *   Lớp này hoàn toàn độc lập với các giao thức HTTP (không chứa request/response object). Nó có thể dễ dàng chạy trong môi trường CLI, CRON job hoặc Unit Test.
    *   Gọi các Repository tương ứng để đọc/ghi dữ liệu.

### 4. Repository Layer (Tầng truy cập dữ liệu)
*   **Công nghệ:** Prisma ORM, PostgreSQL.
*   **Nhiệm vụ:**
    *   Trừu tượng hóa việc truy vấn cơ sở dữ liệu.
    *   Giúp tách biệt Service Layer khỏi các truy vấn Prisma trực tiếp, giảm thiểu sự phụ thuộc chặt chẽ vào cấu trúc cơ sở dữ liệu.
    *   Mỗi domain thực thể sẽ có một Repository tương ứng (Ví dụ: `QuestionRepository`, `ExamRepository`, `LicenseRepository`).

---

## 4.3. Các nguyên tắc và mô thức thiết kế (Design Patterns & Principles)

### 1. Repository Pattern
Thay vì gọi `prisma.question.findMany()` trực tiếp ở Service, ta khai báo một lớp Repository:
```typescript
export class QuestionRepository {
  async findById(id: string) {
    return prisma.question.findUnique({ where: { id } });
  }
  
  async getQuestionsByCategories(categoryIds: string[], limit: number) {
    return prisma.question.findMany({
      where: { categoryId: { in: categoryIds } },
      take: limit,
    });
  }
}
```

### 2. DTO (Data Transfer Object)
Tách biệt Model của Cơ sở dữ liệu và Dữ liệu trả về cho API để đảm bảo an toàn thông tin (ví dụ: Không trả về trường `password` của bảng User).
*   `CreateUserDTO`: Zod schema định nghĩa dữ liệu cần thiết để tạo user.
*   `UserResponseDTO`: DTO định nghĩa cấu trúc trả về Client sau khi loại bỏ thông tin nhạy cảm.

### 3. Global Error Handling Pattern
Toàn bộ API được bao bọc bởi một hàm middleware chuẩn hóa lỗi để tránh lộ lọt stack trace của PostgreSQL/Prisma ra Client:
```json
{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "Định dạng file tải lên không hợp lệ.",
  "details": ["Dòng 20: Thiếu đáp án đúng."]
}
```

### 4. Logging & Monitoring
Sử dụng thư viện Logger chuyên dụng lưu trữ log theo cấp độ (`info`, `warn`, `error`).
*   **Info Log:** Import thành công file câu hỏi bao gồm bao nhiêu câu, thời gian xử lý.
*   **Warn Log:** Phát hiện hành động nộp bài thi quá giờ (hạn chế gian lận).
*   **Error Log:** Lỗi kết nối Database, lỗi parser tệp tin Word bị hỏng cấu trúc.
