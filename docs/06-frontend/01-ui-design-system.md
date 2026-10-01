# 19. Thiết kế giao diện UI/UX (UI/UX Design Specifications)

Giao diện hệ thống được thiết kế theo hướng **Rich Aesthetics (Mỹ thuật giàu cảm xúc)**, sử dụng tông màu hiện đại, tối ưu hóa các hiệu ứng tương tác (Micro-interactions) và chế độ Dark Mode cao cấp để người học có cảm giác ôn luyện chuyên nghiệp, không mỏi mắt.

---

## 19.1. Hệ thống Màu sắc & Font chữ (Design Tokens)

Dự án sử dụng bảng màu HSL tùy biến tương thích tốt với Tailwind CSS và hệ thống biến màu của shadcn/ui.

### 1. Bảng màu (Color Palette)

| Loại Màu | Sắc độ Light Mode (HSL) | Sắc độ Dark Mode (HSL) | Ý nghĩa / Ứng dụng |
| :--- | :--- | :--- | :--- |
| **Primary** | `263.4 70% 50.4%` (Indigo) | `263.4 90% 60.4%` (Violet) | Màu chủ đạo của thương hiệu (nút bấm chính, active state). |
| **Secondary**| `215.4 16.3% 46.9%` (Slate) | `215.4 16.3% 86.9%` (Light Slate)| Màu phụ (nút hủy, viền thẻ). |
| **Background**| `0 0% 100%` (White) | `222.2 47.6% 9.5%` (Deep Zinc) | Màu nền giao diện chính. |
| **Card** | `0 0% 98%` (Off-white) | `222.2 47.6% 12%` (Slate Gray) | Nền của các hộp thông tin, đề thi, chuyên mục. |
| **Success** | `142.1 76.2% 36.3%` (Green) | `142.1 70% 45%` (Bright Green) | Phương án đúng, thông báo thành công. |
| **Destructive**| `346.8 77.2% 49.8%` (Crimson) | `346.8 85% 55%` (Rose Red) | Phương án sai, thông báo lỗi, nút xóa. |

### 2. Font chữ & Hệ thống Typography
*   **Font Tiêu đề (Headings):** **Outfit** (Google Fonts) - Tạo cảm giác hiện đại, gọn gàng, cao cấp.
*   **Font Văn bản thường (Body Text):** **Inter** - Đảm bảo khả năng đọc tốt nhất đối với các câu hỏi thi dài và nhiều ký tự luật pháp.

---

## 19.2. Glassmorphism & Hiệu ứng Chuyển động (Micro-animations)

*   **Hiệu ứng Thủy tinh (Glassmorphic Elements):** Các thành phần nổi trên màn hình (Sidebar, Header, Dialog) sử dụng CSS backdrop filter để tạo cảm giác lớp kính phủ mờ cao cấp:
    ```css
    .glass-panel {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    ```
*   **Hiệu ứng Hover trên Thẻ Đề Thi:** Khi di chuột qua các thẻ chọn đề thi hoặc chuyên đề, thẻ sẽ dịch nhẹ lên trên (translate-y-[-4px]) kèm hiệu ứng tỏa sáng nhẹ ở viền (glow border effect) tạo phản hồi tương tác sống động:
    ```css
    .hover-card-glow:hover {
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
    }
    ```
*   **Hiệu ứng Nhịp tim cho Đồng hồ thi thử (Pulse Timer):** Khi đồng hồ đếm ngược bài thi còn dưới **5 phút**, chữ số đồng hồ sẽ chuyển sang màu đỏ và kích hoạt hiệu ứng nhấp nháy chậm (animate-pulse) để nhắc nhở người học tập trung tăng tốc nộp bài.

---

## 19.3. Trải nghiệm làm bài thi tối ưu (Exam UX)

Màn hình thi thử được tối ưu hóa đặc biệt (Exam Room Layout):
1.  **Phần câu hỏi độc lập:** Nội dung câu hỏi và 4 lựa chọn được đặt trong một vùng cuộn (scroll container) độc lập bên trái, đảm bảo người dùng luôn nhìn thấy toàn bộ nội dung mà không phải cuộn toàn trang.
2.  **Lưới phím tắt câu hỏi cố định:** Lưới hiển thị danh sách các câu từ 1 đến 60 được ghim cố định ở thanh bên phải. Mỗi ô vuông đại diện cho 1 câu:
    *   Chưa làm: Viền xám, nền trong suốt.
    *   Đang chọn: Viền xanh đậm, nền xanh nhạt.
    *   Đã làm xong: Nền xám nhạt hoặc xanh lá cây nhạt.
3.  **Tương thích Thiết bị di động (Mobile Exam UX):** Trên màn hình di động, bảng lưới câu hỏi bên phải sẽ được ẩn đi và chuyển thành một nút bấm "Xem lưới câu hỏi" dạng Drawer kéo lên từ cạnh dưới (Bottom Sheet), giúp học viên tận dụng tối đa diện tích màn hình để đọc câu hỏi.
