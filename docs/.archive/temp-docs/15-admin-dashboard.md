# 15. Giao diện Quản trị (Admin Dashboard Specifications)

Giao diện quản trị được tối ưu hóa cho công việc quản lý dữ liệu lớn, vận hành mượt mà và trực quan trên các màn hình máy tính lớn (Desktop-first).

---

## 15.1. Bố cục tổng thể (Core Layout & Navigation)

Sử dụng bố cục thanh điều hướng bên (Sidebar Navigation) kết hợp Thanh công cụ phía trên (Header) chứa hồ sơ cá nhân và nút chuyển đổi chế độ Sáng/Tối.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Sidebar Logo   │ Header: Search, DarkMode Toggle, Profile (Admin)     │
├─────────────────┼──────────────────────────────────────────────────────┤
│ 📊 Dashboard    │                                                      │
│ 👥 QL Người dùng│                  Vùng Nội dung Chính                 │
│ 🎫 QL License    │                 (Main Content Area)                  │
│ 📚 Ngân hàng CH │                                                      │
│ 📤 Import File  │                                                      │
│ ⚙️ Cài đặt      │                                                      │
└─────────────────┴──────────────────────────────────────────────────────┘
```

---

## 15.2. Các phân hệ trang chính (Main Sub-pages)

### 15.2.1. Trang Thống kê tổng quan (Dashboard Overview)
*   **Hộp chỉ số (Statistic Cards):**
    *   Tổng số Học viên (Total Users) kèm tỷ lệ tăng trưởng so với tuần trước.
    *   Tỷ lệ kích hoạt License (Active Licenses/Total Generated).
    *   Tổng số câu hỏi trong ngân hàng.
    *   Số bài thi thử đã thực hiện trên hệ thống.
*   **Biểu đồ (Charts - Recharts):**
    *   Biểu đồ đường (Line Chart): Số tài khoản đăng ký mới theo thời gian.
    *   Biểu đồ cột (Bar Chart): Số lượng câu hỏi phân bổ theo từng chương luật chính.

### 15.2.2. Trang Quản lý Người dùng (User Management)
*   **Thành phần UI:**
    *   Thanh tìm kiếm theo Tên, Email.
    *   Bộ lọc nhanh theo Trạng thái (Đang hoạt động, Đang bị khóa) và vai trò (Learner, Admin).
    *   Bảng danh sách người dùng phân trang (Table component từ shadcn/ui).
*   **Hành động (Actions):**
    *   **Tạo người dùng mới:** Nút "Tạo người dùng mới" mở modal cho phép Admin tạo tài khoản mới với đầy đủ thông tin (tên, email, mật khẩu, vai trò, trạng thái, hạn license).
    *   **Sửa thông tin người dùng:** Nút "Sửa" mở modal cho phép Admin cập nhật thông tin người dùng (tên, email, mật khẩu, vai trò, trạng thái, hạn license).
    *   **Khóa / Mở khóa tài khoản:** Nút thao tác nhanh, kích hoạt API để thay đổi `UserStatus` ngay lập tức mà không cần tải lại trang.
    *   **Xóa người dùng:** Nút "Xóa" cho phép Admin xóa người dùng khỏi hệ thống (có xác nhận trước khi xóa).
    *   **Quản lý License:** Admin có thể cập nhật trực tiếp thời hạn license cho từng người dùng.

### 15.2.3. Phân hệ Quản lý License (License Console)
*   **Bộ sinh mã (License Generator Box):**
    *   Form nhập: Số lượng mã cần tạo (Number), Số ngày hiệu lực (ví dụ: 30, 90, 365).
    *   Nút "Phát sinh mã": Gọi API `/api/admin/license/generate`. Khi thành công, tự động cập nhật danh sách phía dưới và hiển thị nút "Tải về tệp Excel chứa mã".
*   **Bảng danh sách mã License (License Registry Table):**
    *   Bộ lọc: `UNUSED` (Chưa dùng), `ACTIVATED` (Đã kích hoạt), `EXPIRED` (Hết hạn).
    *   Hành động: Sao chép nhanh mã code vào Clipboard; Thu hồi (`REVOKE`) các mã bị phát hành sai.

### 15.2.4. Phân hệ Ngân hàng Câu hỏi & Thư mục (Question & Category Console)
*   **Sơ đồ cây Thư mục bên trái (Category Tree View):**
    *   Hiển thị danh sách các chuyên mục và chuyên mục con.
    *   Cho phép Admin kéo thả hoặc click để thêm, sửa tên chuyên mục (Inline Edit) hoặc xóa chuyên mục (chỉ khi không chứa câu hỏi).
*   **Bảng danh sách Câu hỏi bên phải (Questions Data Grid):**
    *   Khi click vào thư mục bên trái, bảng bên phải sẽ lọc hiển thị danh sách các câu hỏi trực thuộc thư mục đó.
    *   Hành động: Click "Thêm câu hỏi mới" mở Dialog điền nội dung Rich-Text, định nghĩa 4 phương án, chọn đáp án đúng và phần giải thích chi tiết.
    *   Hành động chỉnh sửa/xóa câu hỏi đơn lẻ trực tiếp từ hàng bảng.

### 15.2.5. Phân hệ Nhập file hàng loạt (Bulk Import Console)
*   **Giao diện vùng thả file (Drag & Drop Zone):**
    *   Kéo và thả file Word (`.docx`), Excel (`.xlsx`) hoặc JSON.
    *   Hiển thị thanh tiến trình xử lý tải lên (Progress Bar).
*   **Bảng điều khiển lỗi (Error Diagnostics Panel):**
    *   Nếu tệp tải lên có lỗi cú pháp, hiển thị thông báo chi tiết mã lỗi và dòng bị lỗi để Admin nhận diện nhanh.
*   **Khung xem trước dữ liệu (Data Preview Grid):**
    *   Nếu dữ liệu hợp lệ, hiển thị toàn bộ nội dung đã parse thành công dưới dạng danh sách thu gọn. Admin có thể click nút "Xác nhận Lưu" để tiến hành lưu trữ hàng loạt vào Database.
