# Hướng Dẫn Khắc Phục Lỗi Parse Giáo Án

## 1. Lỗi: "Could not find the body element"

### Nguyên nhân
- File không phải là DOCX thật (có thể là DOC cũ hoặc file bị rename)
- File DOCX bị lỗi cấu trúc
- File được tạo bằng phần mềm không tương thích

### Giải pháp

#### A. Chuyển đổi file đúng cách
1. Mở file trong **Microsoft Word** (khuyến nghị) hoặc Google Docs
2. Chọn **File** → **Save As** (Lưu như)
3. Chọn định dạng: **Word Document (.docx)**
4. **KHÔNG** chọn: Word 97-2003 (.doc)
5. Lưu file mới
6. Upload file mới lên hệ thống

#### B. Nếu dùng Google Docs
1. Mở file trong Google Docs
2. **File** → **Download** → **Microsoft Word (.docx)**
3. Upload file đã download

#### C. Nếu dùng LibreOffice/OpenOffice
1. Mở file
2. **File** → **Save As**
3. Format: **Microsoft Word 2007-2019 (.docx)**
4. Upload file mới

### Kiểm tra file DOCX
Để đảm bảo file là DOCX hợp lệ:
- File extension phải là `.docx` (không phải `.doc`)
- Kích thước file > 0 bytes
- Có thể mở được trong Word/Google Docs
- Có nội dung văn bản (không chỉ hình ảnh)

---

## 2. Cấu hình Gemini API Key

### Tại sao cần API key?
Hệ thống sử dụng Google Gemini AI để:
- Parse và phân tích cấu trúc giáo án
- Review nội dung giáo án theo tiêu chí
- Tạo annotations và suggestions

### Cách lấy Gemini API Key

#### Bước 1: Truy cập Google AI Studio
- URL: https://aistudio.google.com/app/apikey
- Đăng nhập bằng tài khoản Google

#### Bước 2: Tạo API Key
1. Click **"Get API Key"** hoặc **"Create API Key"**
2. Chọn Google Cloud Project (hoặc tạo mới)
3. API key sẽ được tạo tự động
4. **Copy** API key (format: `AIza...`)

#### Bước 3: Nhập vào hệ thống
**Option 1: Qua giao diện Admin (Khuyến nghị)**
1. Đăng nhập với tài khoản Admin
2. Vào **Admin Panel** → **Cài đặt hệ thống**
3. Paste API key vào ô "API Key mới"
4. Click **"Test API Key"** để kiểm tra
5. Nếu hợp lệ, click **"Lưu cài đặt"**
6. **Restart server** để áp dụng

**Option 2: Qua file .env (Thủ công)**
1. Mở file `.env` ở root của project
2. Tìm dòng: `GEMINI_API_KEY="your-gemini-api-key-here"`
3. Thay thế bằng: `GEMINI_API_KEY="AIza..."`
4. Save file
5. **Restart server**

#### Restart Server
```bash
# Stop server (Ctrl+C)
# Start lại
npm run dev
```

### Kiểm tra API Key hoạt động
1. Vào **Admin** → **Cài đặt hệ thống**
2. Nếu có badge "✅ API key hiện tại", nghĩa là đã config
3. Thử parse 1 giáo án để test

---

## 3. Quy trình Parse Giáo Án

### Workflow chuẩn
1. **Upload giáo án** (file .docx)
2. Hệ thống lưu file vào `/uploads`
3. Status: `UPLOADED`
4. User click **"Parse giáo án"**
5. Hệ thống:
   - Đọc file DOCX
   - Trích xuất văn bản
   - Phân tích cấu trúc sections
   - Lưu vào database
6. Status: `PARSED`
7. Có thể review hoặc chỉnh sửa

### Các status của giáo án
- `UPLOADED`: Mới upload, chưa parse
- `PARSING`: Đang parse (processing)
- `PARSED`: Đã parse xong, sẵn sàng review
- `REVIEWING`: Đang review bởi AI
- `REVIEWED`: Đã review xong
- `EDITING`: Đang chỉnh sửa
- `COMPLETED`: Hoàn thành
- `FAILED`: Lỗi

---

## 4. Troubleshooting

### Lỗi: "API key không hợp lệ"
**Nguyên nhân:**
- API key sai
- API key đã revoked
- Chưa enable Gemini API

**Giải pháp:**
1. Kiểm tra API key còn hiệu lực
2. Tạo API key mới
3. Enable Gemini API trong Google Cloud Console:
   - Vào: https://console.cloud.google.com/apis/library
   - Search: "Generative Language API"
   - Click "Enable"

### Lỗi: "File không có nội dung"
**Nguyên nhân:**
- File chỉ có hình ảnh, không có text
- File trống

**Giải pháp:**
- Đảm bảo file có nội dung văn bản
- Copy text từ hình ảnh nếu cần

### Lỗi: "Đang trong quá trình parse"
**Nguyên nhân:**
- Có request parse khác đang chạy
- Process bị treo

**Giải pháp:**
1. Đợi 1-2 phút
2. Refresh trang
3. Nếu vẫn bị, check database:
```sql
SELECT id, status FROM "LessonPlan" WHERE status = 'PARSING';
```
4. Nếu bị treo lâu (>5 phút), update status:
```sql
UPDATE "LessonPlan" 
SET status = 'UPLOADED' 
WHERE id = '<id>' AND status = 'PARSING';
```

### Lỗi: "Timeout"
**Nguyên nhân:**
- File quá lớn (>10MB)
- Gemini API chậm

**Giải pháp:**
- Giảm kích thước file
- Loại bỏ hình ảnh không cần thiết
- Thử lại sau

---

## 5. Best Practices

### Khi upload giáo án
✅ **Nên:**
- Dùng file DOCX (không phải DOC)
- File có cấu trúc rõ ràng với headings
- Kích thước < 5MB
- Có nội dung văn bản

❌ **Không nên:**
- Upload file DOC cũ
- File chỉ có hình scan
- File quá lớn (>10MB)
- File password-protected

### Cấu trúc giáo án tốt
```
I. Mục tiêu
   - Kiến thức: ...
   - Kỹ năng: ...

II. Chuẩn bị
   - Giáo viên: ...
   - Học sinh: ...

III. Tiến trình dạy học
   1. Hoạt động khởi động
   2. Hoạt động hình thành kiến thức
   3. Hoạt động luyện tập
   4. Hoạt động vận dụng

IV. Đánh giá
   - ...
```

### Bảo mật API Key
⚠️ **Quan trọng:**
- KHÔNG commit file `.env` lên Git
- KHÔNG share API key công khai
- Revoke và tạo key mới nếu bị lộ
- Sử dụng `.env.local` cho dev environment

---

## 6. Support

### Nếu vẫn gặp lỗi
1. Check server logs:
```bash
npm run dev
# Xem console output
```

2. Check browser console (F12)

3. Liên hệ support với thông tin:
   - Mô tả lỗi chi tiết
   - Screenshot
   - File mẫu (nếu có thể)
   - Server logs

### Resources
- Gemini API Docs: https://ai.google.dev/docs
- API Key Management: https://aistudio.google.com/app/apikey
- Mammoth.js (DOCX parser): https://github.com/mwilliamson/mammoth.js

---

## 7. Checklist

Trước khi parse giáo án, đảm bảo:
- [ ] Đã config Gemini API key
- [ ] API key đã test thành công
- [ ] Server đã restart sau khi config
- [ ] File là .docx (không phải .doc)
- [ ] File mở được trong Word/Google Docs
- [ ] File có nội dung văn bản
- [ ] Kích thước file hợp lý (<5MB)
- [ ] Đã đăng nhập với user có quyền
