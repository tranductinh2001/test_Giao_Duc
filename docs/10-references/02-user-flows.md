# 03. Luồng người dùng (User Flow & State Diagrams)

Tài liệu này mô phỏng các hành trình trải nghiệm của người dùng (User Journeys) và sơ đồ trạng thái (State Diagrams) của các thực thể quan trọng trong hệ thống.

---

## 3.1. Luồng Xác thực & Kích hoạt License (Auth & License Flow)

Sơ đồ dưới đây mô tả luồng từ khi người học đăng ký tài khoản mới cho đến khi kích hoạt mã License thành công để truy cập vào kho bài thi có phí.

```mermaid
graph TD
    A[Người dùng mới] --> B{Đã có tài khoản?}
    B -- Không --> C[Đăng ký: Email, Mật khẩu]
    B -- Có --> D[Đăng nhập: Email/Mật khẩu hoặc Google]
    C --> E[Xác thực email gửi link kích hoạt]
    E --> D
    D --> F[Trang chủ Học viên]
    F --> G{Trạng thái License?}
    G -- Hết hạn / Chưa có --> H[Yêu cầu nhập mã kích hoạt]
    G -- Còn hạn --> I[Bắt đầu ôn luyện full tính năng]
    H --> J[Nhập mã License]
    J --> K{Mã hợp lệ & Chưa dùng?}
    K -- Không --> L[Hiển thị báo lỗi]
    L --> H
    K -- Có --> M[Kích hoạt thành công]
    M --> N[Cập nhật thời hạn sử dụng tài khoản]
    N --> I
```

---

## 3.2. Luồng Luyện tập & Thi thử của Người học (Exam Taking Flow)

Sơ đồ mô tả quy trình người học lựa chọn chế độ luyện tập hoặc thi thử có bấm giờ.

```mermaid
graph TD
    A[Học viên truy cập Dashboard] --> B{Chọn chế độ?}
    
    %% Chế độ luyện tập tự do
    B -- Luyện tập tự do --> C[Chọn chuyên đề luật học]
    C --> D[Lấy danh sách câu hỏi tự do]
    D --> E[Hiển thị câu hỏi đầu tiên]
    E --> F[Người học chọn đáp án]
    F --> G[Hiển thị Đúng/Sai & Giải thích ngay lập tức]
    G --> H{Lưu bookmark?}
    H -- Có --> I[Lưu vào danh sách yêu thích]
    H -- Không --> J{Còn câu tiếp theo?}
    I --> J
    J -- Có --> K[Chuyển câu tiếp theo]
    K --> F
    J -- Không --> L[Kết thúc luyện tập & Thống kê số câu đúng]

    %% Chế độ thi thử
    B -- Thi thử / Sinh đề tự động --> M[Chọn cấu trúc đề thi/Ma trận]
    M --> N[Server sinh đề không trùng lặp & Đảo vị trí]
    N --> O[Bắt đầu đếm ngược thời gian làm bài]
    O --> P[Giao diện làm bài thi trắc nghiệm]
    P --> Q[Học viên tích chọn các câu]
    Q --> R{Hết giờ hoặc click Nộp bài?}
    R -- Chưa --> P
    R -- Rồi --> S[Server thu bài & Chấm điểm tự động]
    S --> T[Lưu lịch sử bài thi & Cập nhật thống kê]
    T --> U[Hiển thị kết quả chi tiết & Phân tích mạnh/yếu]
    U --> V[Lưu các câu làm sai vào kho ôn tập riêng]
```

---

## 3.3. Luồng Import dữ liệu của Admin (Question Bank Import Flow)

Sơ đồ quy trình Admin chuẩn bị và tải lên tệp tin câu hỏi dạng Word/Excel.

```mermaid
graph TD
    A[Admin truy cập Question Management] --> B[Click Import dữ liệu]
    B --> C{Chọn định dạng?}
    C -- Word .docx --> D[Chọn file Word chuẩn mẫu]
    C -- Excel .xlsx --> E[Chọn file Excel chuẩn mẫu]
    C -- JSON --> F[Chọn file JSON chứa array cấu trúc]
    
    D --> G[Upload file lên Server]
    E --> G
    F --> G
    
    G --> H[Bộ máy phân tích Parser bóc tách dữ liệu]
    H --> I{Dữ liệu hợp lệ?}
    I -- Không --> J[Báo lỗi chi tiết số dòng/vị trí lỗi]
    J --> K[Admin sửa lại file và upload lại]
    K --> G
    
    I -- Có --> L[Hiển thị danh sách Preview trên UI]
    L --> M[Admin xác nhận lưu]
    M --> N[Lưu toàn bộ vào Database & Gán thẻ chuyên đề]
    N --> O[Hoàn tất & Hiển thị thông báo thành công]
```

---

## 3.4. Sơ đồ trạng thái Bài thi thử (Exam Attempt State Machine)

Trạng thái của một lượt thi thử (`ExamAttempt`) được theo dõi chặt chẽ để chống gian lận và tính toán đúng thời gian nộp bài.

```mermaid
stateDiagram-v2
    [*] --> CREATED : Người dùng chọn sinh đề
    CREATED --> IN_PROGRESS : Bắt đầu đếm ngược thời gian (Client & Server)
    IN_PROGRESS --> SUBMITTED : Click nộp bài trước thời hạn
    IN_PROGRESS --> SYSTEM_AUTO_SUBMITTED : Hết thời gian đếm ngược
    IN_PROGRESS --> ABANDONED : Người học thoát ngang quá thời gian thi mà không nộp bài (cron tự động nộp bài sau)
    
    SUBMITTED --> GRADED : Hệ thống tính điểm và lưu kết quả
    SYSTEM_AUTO_SUBMITTED --> GRADED
    ABANDONED --> GRADED
    
    GRADED --> [*]
```
