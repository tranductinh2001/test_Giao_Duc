# 20. Lộ trình phát triển & Kế hoạch kiểm thử (Development Roadmap & Testing Plan)

Tài liệu này xác định các giai đoạn phát triển phần mềm (Phases) và kế hoạch kiểm thử chất lượng (Testing Strategy) để đưa dự án từ ý tưởng lên vận hành chính thức trên Vercel.

---

## 20.1. Lộ trình phát triển (Development Roadmap)

Quy trình phát triển được chia thành 6 giai đoạn cuốn chiếu (Iterative Phases) trong vòng 12 tuần:

```mermaid
gantt
    title Lộ trình phát triển hệ thống ôn luyện thi công chức
    dateFormat  YYYY-MM-DD
    section Phát triển
    Giai đoạn 1: Khởi tạo & Auth          :active, des1, 2026-06-01, 14d
    Giai đoạn 2: Ngân hàng câu hỏi & Import:         des2, after des1, 14d
    Giai đoạn 3: Động cơ thi & Chấm điểm   :         des3, after des2, 14d
    Giai đoạn 4: Thống kê & Giao diện Learner:       des4, after des3, 14d
    Giai đoạn 5: Console Admin & License   :         des5, after des4, 14d
    Giai đoạn 6: Kiểm thử & Triển khai     :         des6, after des5, 14d
```

### 1. Giai đoạn 1: Thiết lập hạ tầng & Xác thực (Tuần 1 - 2)
*   **Mục tiêu:** Dựng khung dự án Next.js, thiết lập Database PostgreSQL và cấu hình phân quyền người dùng cơ bản.
*   **Công việc chính:**
    *   Khởi tạo dự án Next.js (App Router, Tailwind CSS, TypeScript).
    *   Thiết kế Prisma Schema và đẩy cấu trúc bảng lên PostgreSQL.
    *   Cài đặt Auth.js (Credentials và Google OAuth Provider).
    *   Xây dựng hệ thống Middleware kiểm tra token và phân quyền RBAC.

### 2. Giai đoạn 2: Quản lý Câu hỏi & Công cụ Import (Tuần 3 - 4)
*   **Mục tiêu:** Xây dựng tính năng cốt lõi cho quản trị viên biên soạn và import dữ liệu câu hỏi.
*   **Công việc chính:**
    *   Phát triển giao diện quản lý danh mục (Category Tree View).
    *   Viết parser bóc tách câu hỏi từ Word (sử dụng `mammoth`) và Excel (sử dụng `xlsx`).
    *   Xây dựng màn hình xem trước dữ liệu (Preview Grid) và cảnh báo lỗi cú pháp file nguồn.

### 3. Giai đoạn 3: Động cơ Đề thi & Chấm điểm tự động (Tuần 5 - 6)
*   **Mục tiêu:** Cung cấp tính năng làm bài thi thử và chấm điểm tự động bảo mật.
*   **Công việc chính:**
    *   Viết thuật toán sinh đề ngẫu nhiên không trùng câu hỏi từ ma trận chuyên đề.
    *   Hiện thực hóa thuật toán đảo câu hỏi và đáp án (Fisher-Yates Shuffle).
    *   Thiết lập bộ máy chấm điểm Transaction-based và lưu lịch sử bài thi.
    *   Bắt lỗi thời gian nộp bài chống gian lận.

### 4. Giai đoạn 4: Giao diện học tập & Phân tích tiến độ (Tuần 7 - 8)
*   **Mục tiêu:** Hoàn thiện trải nghiệm cho người học.
*   **Công việc chính:**
    *   Giao diện thi thử tối giản (Zen Mode) và đồng hồ đếm ngược thông minh.
    *   Kho ôn tập câu hỏi làm sai (UserWrongAnswer) và bookmark.
    *   Tích hợp biểu đồ Recharts phân tích năng lực điểm mạnh/yếu của học viên.

### 5. Giai đoạn 5: Console Admin & Thương mại hóa (Tuần 9 - 10)
*   **Mục tiêu:** Cung cấp đầy đủ công cụ quản trị và phát hành License bán gói dịch vụ.
*   **Công việc chính:**
    *   Thiết lập bộ sinh mã License hàng loạt và cơ chế kích hoạt cộng dồn thời gian sử dụng tài khoản.
    *   Giao diện khóa/mở khóa người học, tra cứu lịch sử kích hoạt mã.
    *   Trang nhật ký hệ thống (Audit logs).

### 6. Giai đoạn 6: Kiểm thử, Tối ưu & Triển khai (Tuần 11 - 12)
*   **Mục tiêu:** Đảm bảo hệ thống hoạt động ổn định và đưa lên máy chủ cloud.
*   **Công việc chính:**
    *   Kiểm thử bảo mật (SQL Injection, XSS, CSFR, IDOR).
    *   Kiểm thử tải (Load Testing) giả lập 2000 người dùng làm bài thi đồng thời.
    *   Triển khai mã nguồn Frontend/Backend lên Vercel.
    *   Bảo trì, tối ưu hóa câu lệnh SQL và các chỉ mục (Indexes) của PostgreSQL.

---

## 20.2. Kế hoạch kiểm thử chất lượng (Testing Strategy)

### 20.2.1. Kiểm thử đơn vị (Unit Testing)
Sử dụng thư viện **Jest** hoặc **Vitest** để kiểm tra độc lập các hàm xử lý logic thuần túy:
*   **Parser Testing:** Viết testcase mô phỏng tệp tin Word bị thiếu phương án D hoặc thiếu dòng đáp án để kiểm định xem parser có ném ra lỗi chính xác như mong đợi không.
*   **Shuffle Testing:** Kiểm định hàm Fisher-Yates đảo mảng ngẫu nhiên nhưng đảm bảo không làm mất hoặc thay đổi các phần tử ban đầu.
*   **Scoring Testing:** Giả lập gửi lên 10 câu trả lời (trong đó 6 câu đúng, 4 câu sai) và so sánh điểm số tính ra có chính xác là 60.0 không.

### 20.2.2. Kiểm thử Tích hợp API (Integration Testing)
Kiểm tra luồng xử lý của các Route Handlers kết hợp với Database (sử dụng Database kiểm thử Test DB độc lập):
*   **RBAC Middleware Testing:** Giả lập tài khoản có vai trò `LEARNER` gửi request lên endpoint `/api/admin/questions` và kiểm tra xem hệ thống có trả về mã lỗi `403 Forbidden` không.
*   **Concurrency Activation Testing:** Thực hiện kiểm thử gửi đồng thời 10 request kích hoạt cùng một mã License để kiểm chứng tính năng chống kích hoạt lặp (Prisma Transaction locking).

### 20.2.3. Kiểm thử Tải & Hiệu năng (Load & Performance Testing)
*   **Công cụ:** Sử dụng **Artillery** hoặc **k6** để viết script giả lập tải.
*   **Kịch bản:** Giả lập 2,000 học viên cùng nhấn nút "Nộp bài thi thử" trong khoảng thời gian 30 giây để đánh giá tốc độ xử lý bulk insert của Postgres và khả năng chịu tải của các serverless functions trên Vercel.
