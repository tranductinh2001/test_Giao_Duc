# 🔍 DEBUG: Review Page Không Hiển thị

## ✅ ĐÃ FIX

1. **API annotations filter** - Thêm support cho severity & status query params
2. **Debug logs** - Console logs để track data flow
3. **Empty state** - Message khi không có sections

## 🧪 CÁCH DEBUG

### 1. Mở Browser Console (F12)

Khi vào `/lesson-plans/[id]/review`, bạn sẽ thấy:

```javascript
[Review] Fetched sections: X
[Review] Fetched annotations: Y
[FullDocumentViewer] Annotations updated: Y
[FullDocumentViewer] Sections: X
[FullDocumentViewer] Current annotations: Y
```

### 2. Kiểm tra từng trường hợp

#### Case 1: Sections = 0
```
[Review] Fetched sections: 0
→ Hiển thị: "Không có nội dung để hiển thị"
→ FIX: Parse giáo án trước (POST /api/lesson-plans/[id]/parse)
```

#### Case 2: Annotations = 0
```
[Review] Fetched sections: 5
[Review] Fetched annotations: 0
→ Hiển thị: Tài liệu nguyên bản (không highlights)
→ OK: Chưa có review hoặc không có lỗi
```

#### Case 3: Có cả sections và annotations
```
[Review] Fetched sections: 5
[Review] Fetched annotations: 15
→ Hiển thị: Tài liệu + highlights
→ OK: Đúng như mong đợi
```

### 3. Kiểm tra API trực tiếp

#### Get Sections
```bash
GET /api/lesson-plans/[id]/sections
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "sectionTitle": "Mục tiêu",
      "rawContent": "...",
      "sectionOrder": 1
    }
  ]
}
```

#### Get Annotations
```bash
GET /api/lesson-plans/[id]/annotations
GET /api/lesson-plans/[id]/annotations?severity=ERROR
GET /api/lesson-plans/[id]/annotations?status=PENDING
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "sectionId": "...",
      "severity": "ERROR",
      "status": "PENDING",
      "startPosition": 0,
      "endPosition": 10,
      "message": "...",
      "highlightedText": "..."
    }
  ]
}
```

## 🔧 TROUBLESHOOTING

### Vấn đề 1: Không thấy gì cả
**Nguyên nhân:** Chưa parse hoặc chưa review
**Fix:**
1. Parse: `POST /api/lesson-plans/[id]/parse`
2. Review: `POST /api/lesson-plans/[id]/review-stream`

### Vấn đề 2: Có sections nhưng không có highlights
**Nguyên nhân:** Chưa có annotations
**Fix:** Chạy review để tạo annotations

### Vấn đề 3: API 403 Forbidden
**Nguyên nhân:** 
- Model không được phép cho tier
- Không phải owner

**Fix:**
- Chọn model FREE (gemini-3.1-flash-lite)
- Đăng nhập đúng account owner

### Vấn đề 4: API 404 Not Found
**Nguyên nhân:** Không có review result
**Fix:** Chạy review trước khi xem kết quả

## 📝 WORKFLOW ĐÚNG

```mermaid
1. Upload DOCX
   ↓
2. Parse (POST /parse)
   ↓ sections created
3. Review (POST /review-stream)
   ↓ annotations created
4. View Results (/review)
   ↓ FullDocumentViewer displays
```

## 🎯 KIỂM TRA NHANH

### Console Commands
```javascript
// Check current state
console.log("Sections:", sections.length);
console.log("Annotations:", allAnnotations.length);

// Manually trigger fetch
fetchSections();
fetchAllAnnotations();
```

### Network Tab
- Xem request `/sections` → Status 200?
- Xem request `/annotations` → Status 200?
- Xem response data → Có data không?

## ✅ EXPECTED BEHAVIOR

**Khi vào review page lần đầu:**
1. Loading spinner hiển thị
2. Fetch sections + annotations + review result
3. Console logs xuất hiện
4. Document hiển thị với/không highlights

**Khi có annotations:**
- Text bị lỗi có màu highlight (đỏ/cam/vàng/xanh)
- Click vào highlight → popup chi tiết
- Buttons Accept/Reject hoạt động

**Khi không có annotations:**
- Document hiển thị nguyên bản
- Không có highlights
- Sidebar shows: "0 nhận xét"

## 🆘 NẾU VẪN KHÔNG HIỂN THỊ

1. **Clear cache & reload**
   ```
   Ctrl + Shift + R (hard reload)
   ```

2. **Check console errors**
   ```
   F12 → Console tab → Có errors màu đỏ?
   ```

3. **Verify data**
   ```javascript
   // Paste vào console:
   fetch('/api/lesson-plans/[ID]/sections')
     .then(r => r.json())
     .then(d => console.log('Sections:', d));
   
   fetch('/api/lesson-plans/[ID]/annotations')
     .then(r => r.json())
     .then(d => console.log('Annotations:', d));
   ```

4. **Share console logs**
   - Copy toàn bộ console output
   - Share để debug thêm

## 🎉 SAU KHI FIX

Bạn sẽ thấy:
- ✅ Toàn bộ tài liệu hiển thị
- ✅ Highlights trên text có lỗi
- ✅ Click vào highlight → popup detail
- ✅ Accept/Reject buttons
- ✅ Filters hoạt động
- ✅ Sidebar stats đúng
