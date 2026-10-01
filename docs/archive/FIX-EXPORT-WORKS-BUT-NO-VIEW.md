# 🔍 FIX: Export thành công nhưng không hiển thị nội dung

## ✅ ĐÃ THÊM DEBUG SCREEN

Giờ khi vào `/lesson-plans/[id]/review` mà không có sections, bạn sẽ thấy:

```
┌─────────────────────────────┐
│   Chưa có nội dung          │
│                             │
│ Giáo án chưa được parse     │
│ hoặc chưa có sections.      │
│                             │
│   [Quay lại chi tiết]       │
│                             │
│ Debug Info:                 │
│ Sections: 0                 │
│ Annotations: 0              │
│ Review Result: No           │
└─────────────────────────────┘
```

## 🔍 NGUYÊN NHÂN

Export file thành công → File DOCX tồn tại ✅
Nhưng view không hiển thị → Sections = 0 ❌

**Kết luận:** Giáo án **chưa được PARSE** hoặc parse failed.

## 🎯 GIẢI PHÁP

### Bước 1: Kiểm tra status giáo án
```
Vào: /lesson-plans/[id]
Xem status: UPLOADED / PARSED / REVIEWED ?
```

**Nếu status = UPLOADED:**
→ Giáo án chưa được parse

**Nếu status = PARSED:**
→ Sections đã được tạo, cần check DB

**Nếu status = REVIEWED:**
→ Cần check console logs

### Bước 2: Parse giáo án
```
1. Vào: /lesson-plans/[id]
2. Nhấn nút "Parse"
3. Chọn model: gemini-3.1-flash-lite
4. Đợi parse hoàn tất
5. Status → PARSED
```

### Bước 3: Review giáo án
```
1. Sau khi parse xong
2. Nhấn nút "Review"
3. Chọn model: gemini-3.1-flash-lite
4. Đợi review hoàn tất (streaming)
5. Status → REVIEWED
```

### Bước 4: Xem kết quả
```
1. Vào: /lesson-plans/[id]/review
2. Giờ sẽ thấy:
   - Sections hiển thị ✅
   - Annotations (nếu có lỗi) ✅
   - Highlights màu vàng/đỏ/cam ✅
```

## 🔄 WORKFLOW ĐÚNG

```
Upload DOCX
    ↓
┌───────────┐
│  UPLOADED │ ← Status ban đầu
└───────────┘
    ↓
  Parse (Bắt buộc!)
    ↓
┌───────────┐
│  PARSED   │ ← Sections được tạo
└───────────┘
    ↓
  Review
    ↓
┌───────────┐
│ REVIEWED  │ ← Annotations được tạo
└───────────┘
    ↓
  View Review Results
    ↓
Hiển thị tài liệu + highlights ✅
```

## ❌ SAI

```
Upload → Export (có file) → View Review (không có gì)
                ↑
            Thiếu Parse & Review!
```

## ✅ ĐÚNG

```
Upload → Parse → Review → View Review (có nội dung)
         ✅       ✅        ✅
```

## 🧪 TEST NHANH

### Check API trực tiếp
```bash
# 1. Check sections (sau khi parse)
GET /api/lesson-plans/[id]/sections

Response mong đợi:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "sectionTitle": "Mục tiêu",
      "rawContent": "...",
      "sectionOrder": 1
    },
    ...
  ]
}

# Nếu data = [] → Chưa parse!
```

```bash
# 2. Check annotations (sau khi review)
GET /api/lesson-plans/[id]/annotations

Response mong đợi:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "sectionId": "...",
      "severity": "ERROR",
      "message": "...",
      ...
    },
    ...
  ]
}

# Nếu data = [] → Chưa review hoặc không có lỗi
```

## 📋 DEBUG CHECKLIST

Khi vào review page, check theo thứ tự:

### 1. Console Logs
```javascript
[Review] Fetched sections: ?  ← Phải > 0
[Review] Fetched annotations: ? ← Có thể = 0 (OK)
```

### 2. Debug Screen
```
Debug Info:
Sections: ?      ← Nếu = 0 → Chưa parse
Annotations: ?   ← Có thể = 0 (nếu không lỗi)
Review Result: ? ← Yes/No
```

### 3. Network Tab (F12)
```
GET /sections → Status 200? Response có data?
GET /annotations → Status 200? Response có data?
```

## 🆘 TROUBLESHOOTING

### Case 1: Sections = 0
**Nguyên nhân:** Chưa parse
**Fix:** Parse giáo án (nút Parse ở detail page)

### Case 2: Sections > 0, nhưng không hiển thị
**Nguyên nhân:** Lỗi render
**Fix:** 
1. Check console errors (màu đỏ)
2. Hard reload: Ctrl + Shift + R
3. Share console logs

### Case 3: Parse failed
**Nguyên nhân:** 
- File DOCX corrupt
- Model quota hết
- API key invalid

**Fix:**
1. Re-upload file DOCX mới
2. Check quota: FREE tier unlimited
3. Check Beeknoee API key trong settings

## 🎉 SAU KHI FIX

Bạn sẽ thấy:
- ✅ Toàn bộ tài liệu từ đầu đến cuối
- ✅ Highlights vàng/đỏ/cam trên text có lỗi
- ✅ Click vào highlight → popup chi tiết
- ✅ Buttons Accept/Reject
- ✅ Sidebar filters hoạt động
- ✅ Stats hiển thị đúng

## 📞 NẾU VẪN KHÔNG WORK

Chụp màn hình:
1. Debug screen (Debug Info section)
2. Console logs (F12)
3. Network tab responses

Và share để debug thêm! 🔍
