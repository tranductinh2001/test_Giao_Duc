# 16. Giao diện Người học (User Dashboard Specifications)

Giao diện Người học được thiết kế theo triết lý tập trung tối đa vào trải nghiệm học tập (UX-centric), giao diện trực quan, hạn chế xao nhãng và hoàn toàn tương thích trên cả máy tính lẫn thiết bị di động (Mobile-responsive).

---

## 16.1. Bố cục tổng thể (Learner Layout)

Sử dụng thanh điều hướng trên cùng (Top Navigation) hoặc Sidebar thu gọn trên thiết bị di động để tối ưu không gian hiển thị nội dung câu hỏi.

---

## 16.2. Các phân hệ trang chính (Main Sub-pages)

### 16.2.1. Trang chủ Học tập (Dashboard Home)
*   **Hộp trạng thái Tài khoản (License Status Box):**
    *   Nếu chưa kích hoạt hoặc hết hạn: Hiển thị cảnh báo màu vàng nổi bật kèm nút "Kích hoạt tài khoản" để mở hộp nhập mã License.
    *   Nếu còn hạn: Hiển thị ngày hết hạn và số ngày còn lại (ví dụ: "Hạn dùng còn 45 ngày - Học tập chăm chỉ nhé!").
*   **Tóm tắt Tiến độ (Stats Panel):**
    *   Số bài thi thử đã làm.
    *   Số câu hỏi đã luyện tập thành công.
    *   Tổng số câu hỏi làm sai cần ôn tập lại.
    *   Số câu hỏi đã đánh dấu bookmark.
*   **Phần gợi ý học tập (Smart Recommendations):**
    *   Liệt kê các chương luật/chuyên đề có tỷ lệ trả lời đúng thấp nhất (Năng lực yếu) để gợi ý người dùng click ôn tập ngay lập tức.

### 16.2.2. Trung tâm Ôn luyện (Practice Center)
*   **Giao diện Chọn Chuyên đề:**
    *   Hiển thị danh sách các chương luật theo dạng thẻ lưới (Grid Cards). Mỗi thẻ hiển thị tiến độ hoàn thành (Ví dụ: Luật Viên chức: đã làm 45/120 câu).
*   **Trình luyện tập trắc nghiệm tự do:**
    *   Mỗi lượt hiển thị một câu hỏi đơn lẻ để người học tập trung cao độ.
    *   Khi click chọn đáp án, hệ thống **ngay lập tức** đổi màu phương án: Xanh nếu đúng, Đỏ nếu sai, và hiển thị phần **Giải thích chi tiết** phía dưới câu hỏi.
    *   Có nút "Đánh dấu câu hỏi" (Bookmark) để lưu lại xem sau.
    *   Có nút "Câu tiếp theo" và "Câu trước đó" để di chuyển tự do.

### 16.2.3. Trung tâm Thi thử (Exam Center)
*   **Danh sách Đề thi chuẩn:**
    *   Các đề thi thử tĩnh do Admin biên soạn chuẩn cấu hình kỳ thi chính thức của các năm trước.
    *   Hiển thị thời gian thi (ví dụ: 60 phút) và số lượng câu hỏi (ví dụ: 60 câu).
*   **Bảng điều khiển Tự sinh đề thi (Custom Exam Generator):**
    *   Cho phép người dùng tự phối đề thi theo nhu cầu ôn luyện riêng (ví dụ: Chỉ tạo đề gồm 30 câu Luật Cán bộ công chức và 10 câu Hiến pháp để thi thử nhanh).
*   **Giao diện Phòng thi thử (Exam Room Interface):**
    *   Giao diện toàn màn hình (Zen Mode) ẩn các thanh sidebar điều hướng để học viên không phân tâm.
    *   Đồng hồ đếm ngược (Countdown Timer) màu đỏ nổi bật phía góc trên cùng.
    *   Danh mục lưới phím tắt các câu hỏi bên phải (Question Grid Navigation) giúp người học biết mình đã làm những câu nào, bỏ sót câu nào và click di chuyển nhanh đến câu đó.
    *   Nút "Nộp bài thi" nổi bật. Có hộp thoại cảnh báo xác nhận trước khi nộp thực sự.

### 16.2.4. Lịch sử làm bài & Xem lại bài thi (Attempt Review)
*   **Danh sách Lịch sử:**
    *   Lưu toàn bộ các bài thi thử đã làm kèm Điểm số, Ngày làm, và trạng thái Đạt/Không đạt.
*   **Trình xem lại chi tiết đề thi đã làm (Review Page):**
    *   Giao diện hiển thị lại toàn bộ câu hỏi của đề thi đó, tô đậm phương án người dùng đã chọn và chỉ rõ đáp án đúng của hệ thống.
    *   Hiển thị phần **Giải thích chi tiết** lý do tại sao đúng/sai dựa trên các điều khoản luật pháp.

### 16.2.5. Kho ôn câu sai & Câu hỏi đã lưu (Bookmarks & Wrong Answers)
*   **Kho ôn câu sai:**
    *   Liệt kê toàn bộ các câu hỏi học viên đã từng tích chọn đáp án sai trong quá trình thi thử hoặc luyện tập.
    *   Cho phép học viên làm lại trực tiếp các câu này. Nếu làm đúng, câu hỏi đó sẽ được tự động xóa khỏi danh sách câu sai.
*   **Kho câu hỏi yêu thích (Bookmarks):**
    *   Lưu trữ các câu hỏi học viên tự đánh dấu thủ công. Học viên có thể xem lại hoặc lọc theo danh mục chuyên đề để ôn tập riêng.
