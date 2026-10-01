# 09. Quản lý Ngân hàng Câu hỏi (Question Bank Management)

Ngân hàng câu hỏi là trái tim của hệ thống ôn thi. Kiến trúc ngân hàng câu hỏi được thiết kế để phân loại khoa học theo sơ đồ cây danh mục, hỗ trợ đa định dạng nội dung và tích hợp media.

---

## 9.1. Sơ đồ cây Danh mục Câu hỏi (Category Hierarchy)

Các câu hỏi được sắp xếp theo cấu trúc phân cấp nhiều tầng (Multi-level Tree) giúp người học dễ dàng chọn chuyên đề để luyện tập và giúp thuật toán sinh đề chọn chính xác số lượng câu hỏi theo ma trận.

```
📁 Root (Ví dụ: Công chức Hành chính Văn phòng)
└── 📁 Kiến thức chung
    ├── 📁 Hiến pháp 2013
    │   ├── 📄 Chương I: Chế độ chính trị
    │   └── 📄 Chương II: Quyền con người, quyền công dân
    └── 📁 Luật Cán bộ, công chức 2008 (sửa đổi 2019)
        ├── 📄 Chương I: Những quy định chung
        └── 📄 Chương II: Nghĩa vụ, quyền của cán bộ, công chức
└── 📁 Ngoại ngữ (Tiếng Anh)
    ├── 📄 Trắc nghiệm ngữ pháp
    └── 📄 Đọc hiểu
```

Trong database, cấu trúc này được thực hiện thông qua liên kết tự thân `parentId` trong bảng `Category`.

---

## 9.2. Giải phẫu cấu trúc một câu hỏi (Question Anatomy)

Mỗi câu hỏi trắc nghiệm trong ngân hàng bao gồm các thành phần sau:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [Mã ID]: q-uuid-99238                                                 │
│  [Chuyên mục]: Luật Viên chức 2010 - Chương II                         │
│  [Mức độ]: Trung bình (MEDIUM)                                         │
├────────────────────────────────────────────────────────────────────────┤
│  Nội dung câu hỏi (Hỗ trợ HTML):                                       │
│  "Theo Luật Viên chức 2010, việc tuyển dụng viên chức phải căn cứ      │
│   vào những yếu tố nào sau đây?"                                       │
├────────────────────────────────────────────────────────────────────────┤
│  Các lựa chọn phương án:                                               │
│  [ ] A. Nhu cầu công việc, vị trí việc làm, tiêu chuẩn chức danh...    │
│  [ ] B. Chỉ tiêu biên chế được giao, mối quan hệ cá nhân...            │
│  [ ] C. Nguyện vọng cá nhân và bằng cấp hiện có...                      │
│  [ ] D. Đề xuất của người đứng đầu đơn vị sự nghiệp công lập...        │
│  *(Đáp án đúng là A)*                                                  │
├────────────────────────────────────────────────────────────────────────┤
│  Giải thích chi tiết (Explanation):                                    │
│  "Căn cứ Điều 20 Luật Viên chức 2010: Việc tuyển dụng viên chức phải   │
│   căn cứ vào nhu cầu công việc, vị trí việc làm, tiêu chuẩn chức danh  │
│   nghề nghiệp và quỹ tiền lương của đơn vị sự nghiệp công lập."        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9.3. Giao diện Quản trị và Lọc câu hỏi

Giao diện quản lý câu hỏi dành cho Admin hỗ trợ bộ lọc đa chiều (Advanced Filters):
1.  **Lọc theo Chuyên đề (Category Filter):** Chọn danh mục cha sẽ tự động liệt kê câu hỏi của các danh mục con trực thuộc.
2.  **Lọc theo Độ khó (Difficulty Filter):** Dễ, Trung bình, Khó.
3.  **Tìm kiếm toàn văn (Full-text Search):** Tìm kiếm theo từ khóa trong nội dung câu hỏi hoặc phần giải thích.

**Lưu ý:** Hệ thống không còn yêu cầu phê duyệt câu hỏi. Khi Admin thêm câu hỏi vào ngân hàng (thủ công hoặc import từ Excel/Word), câu hỏi sẽ ngay lập tức được tính vào danh mục và có thể sử dụng cho các bài thi.

---

## 9.4. Xử lý Rich-Text và Đính kèm File Media

*   **Định dạng lưu trữ:** Nội dung câu hỏi (`content`) và giải thích (`explanation`) được lưu dưới dạng chuỗi Rich-Text HTML trong PostgreSQL. Điều này cho phép định dạng văn bản (in đậm, in nghiêng, gạch chân, kẻ bảng) hoặc nhúng công thức toán học/ảnh minh họa.
*   **Tải ảnh đính kèm:** Khi Admin tạo/sửa câu hỏi và chèn ảnh:
    1.  Client gửi tệp tin ảnh lên `/api/admin/media/upload`.
    2.  Server xử lý tải ảnh lên **Supabase Storage** (hoặc Cloudinary) và trả về đường dẫn URL công khai tuyệt đối.
    3.  Client chèn thẻ `<img src="https://supabase.co/.../public-url.png" alt="Question Image" />` trực tiếp vào mã nguồn HTML của câu hỏi.
*   **Sanitization:** Trước khi render nội dung HTML trên trình duyệt của học viên, Client sử dụng thư viện `dompurify` để làm sạch mã độc (XSS), đảm bảo an toàn tuyệt đối cho thiết bị của người dùng.
