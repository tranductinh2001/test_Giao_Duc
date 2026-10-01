# Phase 1: Upload và Parse Công văn PDF/DOC/DOCX

**Status:** ✅ Completed  
**Date:** 2026-06-28

---

## 🎯 Mục tiêu

Cho phép admin upload file công văn (PDF/DOC/DOCX) và hệ thống tự động:
1. Parse nội dung từ file
2. Phát hiện các phần (sections) trong công văn
3. Tự động tạo CircularSectionRequirement cho từng phần

---

## 📁 Files đã tạo/sửa

### 1. API Upload
**File:** `src/app/api/admin/circulars/upload/route.ts`

**Chức năng:**
- POST endpoint nhận multipart/form-data
- Validate file type (PDF/DOC/DOCX) và size (max 10MB)
- Parse DOCX bằng mammoth library
- Tự động phát hiện sections dựa trên pattern matching
- Lưu file vào `/public/uploads/circulars/`
- Tạo CircularDocument và CircularSectionRequirement

**Auto-detect sections:**
```javascript
const patterns = [
  { regex: /(?:I\.|1\.|Điều 1)[\s\S]*?(?:mục tiêu|MỤC TIÊU)/i, type: "OBJECTIVES" },
  { regex: /(?:II\.|2\.|Điều 2)[\s\S]*?(?:chuẩn bị|CHUẨN BỊ)/i, type: "PREPARATION" },
  { regex: /(?:III\.|3\.|Điều 3)[\s\S]*?(?:hoạt động|HOẠT ĐỘNG)/i, type: "ACTIVITIES" },
  { regex: /(?:IV\.|4\.|Điều 4)[\s\S]*?(?:đánh giá|ĐÁNH GIÁ)/i, type: "ASSESSMENT" },
];
```

### 2. Admin UI Update
**File:** `src/app/admin/circulars/page.tsx`

**Thay đổi:**
- Thêm state: `uploadFile`, `useFileUpload`
- Thêm mode chọn: Upload file hoặc Nhập thủ công
- File input với accept PDF/DOC/DOCX
- Logic submit: nếu có file → gọi `/api/admin/circulars/upload`, nếu không → gọi API thường

**UI:**
```tsx
{!editingCircular && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <input type="radio" checked={useFileUpload} />
    📄 Upload file PDF/DOC/DOCX (tự động phân tích)
    
    <input type="radio" checked={!useFileUpload} />
    ✍️ Nhập thủ công
  </div>
)}
```

### 3. Directories
**Created:**
- `public/uploads/circulars/` - Lưu file upload
- `temp/` - Lưu file tạm khi parse

---

## 🔧 Dependencies

**Đã có:**
- ✅ `mammoth` - Parse DOCX files

**Chưa có (cần cài nếu muốn parse PDF):**
- ❌ `pdf-parse` - Parse PDF files

**Cài đặt PDF parsing (optional):**
```bash
npm install pdf-parse
```

Sau đó update `upload/route.ts`:
```typescript
import pdfParse from "pdf-parse";

if (file.type === "application/pdf") {
  const pdfData = await pdfParse(buffer);
  parsedContent = pdfData.text;
  parsedSections = autoDetectSections(parsedContent);
}
```

---

## 🧪 Test Flow

### 1. Upload file DOCX
```
1. Vào http://localhost:3000/admin/circulars
2. Click "Thêm công văn mới"
3. Chọn radio "Upload file PDF/DOC/DOCX"
4. Chọn file DOCX (ví dụ: congvan_5512.docx)
5. Điền: Số công văn, Tiêu đề, Loại, Ngày ban hành, Cấp học
6. Submit
7. Kiểm tra:
   - File được lưu vào /public/uploads/circulars/
   - CircularDocument được tạo với content từ file
   - CircularSectionRequirement được tạo cho các phần tự động phát hiện
   - Toast hiển thị số sections detected
```

### 2. Nhập thủ công (vẫn hoạt động)
```
1. Chọn radio "Nhập thủ công"
2. Điền đầy đủ form bao gồm "Nội dung đầy đủ"
3. Submit → hoạt động như cũ
```

---

## 📊 Response Format

**Success:**
```json
{
  "success": true,
  "message": "Upload và phân tích công văn thành công",
  "data": {
    "circularId": "uuid",
    "code": "5512",
    "parsedContent": "...",
    "sectionsDetected": 4,
    "sections": [
      { "type": "OBJECTIVES", "title": "Mục tiêu" },
      { "type": "PREPARATION", "title": "Chuẩn bị" },
      { "type": "ACTIVITIES", "title": "Hoạt động dạy học" },
      { "type": "ASSESSMENT", "title": "Đánh giá" }
    ]
  }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Chỉ chấp nhận file PDF, DOC, DOCX"
}
```

---

## ⚠️ Known Limitations

1. **PDF Parsing:** Chưa cài `pdf-parse`, hiện tại chỉ hỗ trợ DOCX
2. **Section Detection:** Dựa trên regex pattern, có thể không chính xác 100%
3. **File Storage:** Lưu trong `/public`, production nên dùng S3/Cloud Storage
4. **File Size:** Giới hạn 10MB

---

## 🚀 Next Steps

**Phase 2: Rule Engine**
- Tạo UI quản lý rules chi tiết
- Mỗi rule có: prompt AI, correctExample, incorrectExample
- Link rule với sectionType

**Phase 3: Streaming Review**
- Review từng section tuần tự
- SSE/Streaming response
- Realtime progress updates

**Phase 4: Google Docs Editor**
- Layout 3 cột
- Highlight annotations
- Scroll to position

---

**Tested:** ✅ Build success (chỉ có 1 warning về next.config.ts - không ảnh hưởng)  
**Dev server:** Running on port 3000
