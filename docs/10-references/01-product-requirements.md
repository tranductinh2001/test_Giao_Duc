# 01. Tổng quan dự án (Project Overview)

## 1.1. Bối cảnh dự án (Background)
Kỳ thi tuyển dụng công chức, viên chức tại Việt Nam là kỳ thi có tính cạnh tranh rất cao và khối lượng kiến thức cần ôn tập cực kỳ lớn. Nội dung thi thường chia thành nhiều phần bao gồm:
*   **Kiến thức chung:** Hệ thống chính trị, Hiến pháp, các luật chuyên ngành (Luật Cán bộ công chức, Luật Viên chức, Luật Tổ chức Chính phủ, v.v.).
*   **Ngoại ngữ:** Thường là Tiếng Anh bậc 2 hoặc bậc 3.
*   **Nghiệp vụ chuyên ngành:** Kiến thức sâu về vị trí việc làm.

Người ôn tập thường gặp các vấn đề lớn:
1.  **Tài liệu phân tán:** Các văn bản luật liên tục thay đổi, cập nhật; các tài liệu trôi nổi trên mạng không được kiểm chứng hoặc đã lỗi thời.
2.  **Phương pháp ôn luyện thủ công:** Học viên chủ yếu đọc văn bản giấy hoặc làm đề PDF không có giải thích chi tiết, dẫn đến việc khó ghi nhớ và không đo lường được tiến độ.
3.  **Không biết điểm yếu của bản thân:** Thiếu hệ thống phân tích xem mình đang yếu ở chuyên đề luật nào để tập trung ôn luyện.
4.  **Tốn thời gian tìm đề:** Không có công cụ tự sinh đề ngẫu nhiên chuẩn theo ma trận đề thi của Bộ Nội vụ hoặc từng địa phương.

Do đó, việc xây dựng một **Nền tảng luyện thi công chức, viên chức trực tuyến** hiện đại, đáng tin cậy và cá nhân hóa là vô cùng cần thiết.

---

## 1.2. Mục tiêu dự án (Objectives)
*   **Số hóa ngân hàng câu hỏi:** Xây dựng hệ thống quản lý câu hỏi thông minh phân loại theo danh mục luật, chuyên đề, mức độ khó/dễ và hỗ trợ import hàng loạt từ các file Word, Excel hoặc JSON.
*   **Tối ưu hóa trải nghiệm ôn luyện:** Cung cấp nhiều chế độ học (luyện tập theo chuyên đề, thi thử theo thời gian thực, ôn lại câu sai, bookmark câu hỏi hay).
*   **Cá nhân hóa lộ trình ôn tập:** Ứng dụng phân tích dữ liệu để báo cáo điểm mạnh, điểm yếu theo từng chương luật/chuyên đề dựa trên lịch sử làm bài.
*   **Đảm bảo tính chính xác và tin cậy:** Hệ thống phân quyền chặt chẽ (RBAC) cho phép các Admin chuyên môn kiểm duyệt và cập nhật nội dung đề thi liên tục.

---

## 1.3. Phạm vi dự án (Scope of Work)

### Trong phạm vi (In-Scope)
*   Hệ thống xác thực người dùng (Đăng ký, đăng nhập, phân quyền Admin và Học viên).
*   Tính năng quản lý và phân phối License (mã kích hoạt gói dịch vụ) để thương mại hóa nền tảng.
*   Trình import đề thi thông minh hỗ trợ bóc tách cấu trúc câu hỏi từ Word (.docx), Excel (.xlsx) và JSON.
*   Bộ máy sinh đề thi tự động theo ma trận cấu trúc (ví dụ: 30% Luật Viên chức, 40% Luật Cán bộ công chức, 30% Kiến thức chung).
*   Giao diện thi thử và luyện tập tương tác cao, hỗ trợ đảo câu hỏi và đảo đáp án ngẫu nhiên.
*   Hệ thống chấm điểm tức thời, cung cấp giải thích chi tiết cho từng câu hỏi.
*   Trang thống kê tiến độ học tập, biểu đồ phân tích năng lực (điểm mạnh/yếu theo chuyên đề) và bộ lọc ôn tập câu hỏi làm sai.

### Ngoài phạm vi (Out-of-Scope)
*   Thanh toán trực tuyến tự động (Trong giai đoạn đầu, việc bán license sẽ thực hiện thủ công thông qua chuyển khoản, Admin sẽ kích hoạt hoặc tạo license code gửi cho học viên).
*   Ứng dụng di động Native App (Giai đoạn đầu tối ưu giao diện Responsive Web hoạt động mượt mà trên Mobile Safari/Chrome).
*   Hệ thống thi tập trung quy mô lớn có giám thị (Proctoring) với camera giám sát (Hệ thống tập trung hoàn toàn vào tự học và tự thi thử).

---

## 1.4. Chỉ số thành công (Success Metrics - KPIs)
1.  **Hiệu năng hệ thống:** Thời gian phản hồi API trung bình < 200ms; Tải trang ban đầu < 1.5s.
2.  **Độ chính xác:** Bộ parser Word/Excel đạt tỷ lệ bóc tách chính xác > 98% đối với các file tuân thủ đúng định dạng mẫu.
3.  **Mức độ tương tác (Engagement):** Người dùng thực hiện trung bình ít nhất 3 lượt luyện tập/thi thử mỗi tuần.
4.  **Tỷ lệ giữ chân người dùng (Retention Rate):** > 60% học viên tiếp tục sử dụng hệ thống ôn luyện cho đến ngày thi chính thức.
5.  **Khả năng mở rộng:** Cấu trúc cơ sở dữ liệu và API chịu tải được ít nhất 2,000 người dùng làm bài thi đồng thời (concurrent users) mà không bị nghẽn mạng hay treo DB.
