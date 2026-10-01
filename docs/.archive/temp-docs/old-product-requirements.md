# 02. Yêu cầu sản phẩm (Product Requirements Document - PRD)

Tài liệu này định nghĩa chi tiết các yêu cầu chức năng (Functional Requirements) và phi chức năng (Non-functional Requirements) cho hệ thống ôn luyện thi công chức, viên chức.

---

## 2.1. Phân quyền người dùng (User Roles & Permissions)

Hệ thống hỗ trợ cơ chế phân quyền dựa trên vai trò (Role-Based Access Control - RBAC). Có hai nhóm đối tượng chính:

| Chức năng | Khách (Guest) | Người học (Learner) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: |
| Xem trang giới thiệu, đăng ký/đăng nhập | ✅ | ✅ | ✅ |
| Kích hoạt License bằng mã code | ❌ | ✅ | ✅ |
| Luyện tập theo chuyên đề & Lưu bookmark | ❌ | ✅ (Cần License) | ✅ |
| Tạo đề & Thi thử (có bấm giờ) | ❌ | ✅ (Cần License) | ✅ |
| Xem lịch sử làm bài & Báo cáo năng lực | ❌ | ✅ | ✅ |
| Ôn lại danh sách câu hỏi làm sai | ❌ | ✅ | ✅ |
| Quản lý tài khoản người dùng & Khóa/Mở khóa | ❌ | ❌ | ✅ |
| Quản lý ngân hàng câu hỏi (Thêm, Sửa, Xóa) | ❌ | ❌ | ✅ |
| Import câu hỏi từ Word, Excel, JSON | ❌ | ❌ | ✅ |
| Phát sinh mã License mới & cấu hình gói dịch vụ | ❌ | ❌ | ✅ |
| Dashboard thống kê toàn hệ thống | ❌ | ❌ | ✅ |

---

## 2.2. Yêu cầu chức năng (Functional Requirements - FR)

### 2.2.1. Xác thực & Tài khoản (Auth & Account)
*   **FR-1.1:** Người dùng có thể đăng ký tài khoản mới bằng Email, Mật khẩu và Tên hiển thị. Có kiểm tra định dạng email và mật khẩu mạnh.
*   **FR-1.2:** Đăng nhập hệ thống bằng Email/Mật khẩu hoặc thông qua mạng xã hội (Google OAuth).
*   **FR-1.3:** Người dùng có thể cập nhật thông tin cá nhân (Tên, Ảnh đại diện) và thay đổi mật khẩu.
*   **FR-1.4:** Admin có quyền tìm kiếm, khóa hoặc mở khóa tài khoản người dùng.

### 2.2.2. Hệ thống License & Quản lý gói cước
*   **FR-2.1:** Hệ thống hỗ trợ mô hình mua gói dịch vụ thông qua **Mã kích hoạt (License Code)**.
*   **FR-2.2:** Admin có thể sinh hàng loạt mã License ngẫu nhiên (UUID hoặc định dạng dễ đọc như `VIC-XXXX-XXXX`), chỉ định thời hạn (ví dụ: 30 ngày, 90 ngày, 180 ngày, 365 ngày) và gói dịch vụ tương ứng.
*   **FR-2.3:** Người học nhập mã License vào hệ thống để kích hoạt hoặc gia hạn thời gian ôn luyện. Hệ thống ghi lại lịch sử kích hoạt của từng mã.

### 2.2.3. Quản lý ngân hàng câu hỏi
*   **FR-3.1:** Quản lý cấu trúc cây danh mục câu hỏi (Ví dụ: Kiến thức chung > Luật Viên chức 2010 > Chương I).
*   **FR-3.2:** Thêm, Sửa, Xóa câu hỏi đơn lẻ trực tiếp trên giao diện Admin. Hỗ trợ câu hỏi trắc nghiệm khách quan dạng 4 lựa chọn (A, B, C, D) có 1 đáp án đúng duy nhất, kèm theo giải thích chi tiết đáp án.
*   **FR-3.3:** **Import hàng loạt:** Cho phép Admin tải lên file Word (.docx), Excel (.xlsx) hoặc JSON. Hệ thống tự động phân tích cú pháp (parse), hiển thị giao diện xem trước (preview) và báo lỗi nếu định dạng không khớp trước khi lưu vào database.

### 2.2.4. Công cụ sinh đề & Tổ chức thi (Exam Engine)
*   **FR-4.1:** **Luyện tập tự do:** Người học chọn chuyên đề cụ thể để làm bài không giới hạn thời gian. Hệ thống hiển thị ngay giải thích sau khi người dùng chọn đáp án.
*   **FR-4.2:** **Sinh đề tự động theo tỷ lệ (Auto-generation):** Người học chọn loại đề thi (Ví dụ: Thi công chức Thuế), hệ thống tự động lấy ngẫu nhiên câu hỏi từ ngân hàng câu hỏi dựa trên cấu trúc tỷ lệ chuyên đề đã định nghĩa trước (Ví dụ: 20 câu Luật Thuế, 20 câu Hiến pháp, 20 câu Luật Công chức).
*   **FR-4.3:** **Tránh trùng câu hỏi:** Đảm bảo thuật toán sinh đề ngẫu nhiên không chọn lặp lại cùng một câu hỏi trong một đề thi.
*   **FR-4.4:** **Đảo câu hỏi & đáp án:** Hỗ trợ tính năng xáo trộn thứ tự các câu hỏi và xáo trộn thứ tự các đáp án (A, B, C, D) của từng câu hỏi để tránh học vẹt.
*   **FR-4.5:** **Thi thử có thời gian:** Người học làm bài thi dưới áp lực thời gian (Ví dụ: 60 câu / 60 phút). Đồng hồ đếm ngược được duy trì cả ở Client và kiểm tra ở Server. Khi hết giờ, hệ thống tự động nộp bài.

### 2.2.5. Chấm điểm, Báo cáo & Phân tích
*   **FR-5.1:** Tính điểm tự động ngay sau khi nộp bài. Hiển thị báo cáo kết quả thi: Số câu đúng/sai, Tỷ lệ %, Thời gian làm bài thực tế, Đạt/Không đạt (Thường thi công chức yêu cầu đúng >= 50% số câu).
*   **FR-5.2:** Phân tích điểm mạnh, điểm yếu: Báo cáo tỷ lệ trả lời đúng theo từng danh mục chuyên đề (Ví dụ: Luật Viên chức: 90% - Mạnh; Luật Phòng chống tham nhũng: 30% - Yếu) để đề xuất người dùng cần ôn tập phần nào.
*   **FR-5.3:** **Ôn lại câu sai:** Hệ thống lưu trữ các câu hỏi người dùng đã trả lời sai trong lịch sử. Người dùng có thể vào kho riêng để luyện tập lại chính các câu sai này cho đến khi làm đúng.
*   **FR-5.4:** **Bookmark:** Người dùng có thể đánh dấu (bookmark) các câu hỏi khó để xem lại sau này.

---

## 2.3. Yêu cầu phi chức năng (Non-Functional Requirements - NFR)

### 2.3.1. Hiệu năng & Khả năng đáp ứng (Performance)
*   **NFR-1.1:** Giao diện người dùng phải tải nhanh (FCP < 1.2s, LCP < 2.5s) trên môi trường mạng 3G/4G tiêu chuẩn.
*   **NFR-1.2:** Các thao tác chọn đáp án và chuyển câu hỏi phải phản hồi lập tức ở phía Client (không có độ trễ UI).
*   **NFR-1.3:** Tối ưu hóa truy vấn Database bằng cách đánh Index trên các cột khóa ngoại thường xuyên tìm kiếm như `userId`, `questionId`, `categoryId`.

### 2.3.2. Bảo mật & An toàn thông tin (Security)
*   **NFR-2.1:** Mã hóa mật khẩu người dùng bằng thuật toán băm an toàn (`bcrypt` hoặc `argon2id`) trước khi ghi vào Database.
*   **NFR-2.2:** Bảo vệ chống lại các lỗ hổng bảo mật phổ biến (OWASP Top 10):
    *   **SQL Injection:** Phòng chống tự động thông qua việc sử dụng Prisma Client (tham số hóa truy vấn).
    *   **XSS (Cross-Site Scripting):** React/Next.js tự động escape dữ liệu output. Với phần nội dung câu hỏi có chứa HTML, sử dụng thư viện `dompurify` để sanitize trước khi render.
    *   **CSRF:** Next.js Route Handlers + Auth.js sử dụng CSRF tokens cho các session-based requests.
*   **NFR-2.3:** Kiểm tra quyền (Authorization check) ở mọi API Endpoint để tránh IDOR (Insecure Direct Object Reference). Người học không được phép xem hoặc chỉnh sửa lịch sử làm bài của người khác.

### 2.3.3. Khả năng mở rộng & Bảo trì (Maintainability & Scalability)
*   **NFR-3.1:** Kiến trúc mã nguồn phải tuân thủ Clean Architecture giúp tách biệt rõ ràng Business Logic ra khỏi Framework và Database.
*   **NFR-3.2:** Hỗ trợ tính năng Logging tập trung (sử dụng Winston hoặc Pino) trên server để ghi lại các hoạt động quan trọng như: Lỗi hệ thống, Import câu hỏi lỗi, Kích hoạt License.

### 2.3.4. Giao diện & Độ tương thích (Usability)
*   **NFR-4.1:** Giao diện thiết kế theo chuẩn Mobile-First, responsive mượt mà từ màn hình điện thoại siêu nhỏ (320px) đến màn hình máy tính lớn (1920px).
*   **NFR-4.2:** Giao diện hỗ trợ cả Dark Mode (Chế độ tối) và Light Mode (Chế độ sáng) để người học không bị mỏi mắt khi học ban đêm.
