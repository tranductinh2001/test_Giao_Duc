# 🔍 DEBUG: 403 Error khi Parse Giáo Án

## ❌ LỖI

```
POST /api/lesson-plans/[id]/parse 403 Forbidden
```

## 🔎 NGUYÊN NHÂN CÓ THỂ

### 1. Model Check Failed (Line 98-103)
User chọn model không được phép với tier hiện tại:

**FREE tier chỉ được:**
- ✅ `gemini-3.1-flash-lite`
- ✅ `gemini-3.1-flash-lite-preview`

**Không được:**
- ❌ `gemini-2.5-flash` (cần BASIC)
- ❌ `gemini-3.1-pro-preview` (cần PREMIUM)

### 2. Ownership Check Failed (Line 124-129)
- User không phải owner của giáo án
- User role không phải ADMIN

## ✅ ĐÃ THÊM DEBUG LOGS

Bây giờ khi gặp 403, server console sẽ log chi tiết:

### Log 1: Model Check Failed
```javascript
[Parse API] Model check failed: {
  userId: "...",
  model: "gemini-3.1-pro-preview",
  reason: "Model gemini-3.1-pro-preview không khả dụng cho gói Miễn phí..."
}
```

### Log 2: Ownership Check Failed
```javascript
[Parse API] Ownership check failed: {
  userId: "user-id-1",
  lessonPlanOwnerId: "user-id-2", // Different!
  userRole: "LEARNER",
  lessonPlanId: "..."
}
```

## 🧪 CÁCH DEBUG

### 1. Khởi động lại dev server
```bash
npm run dev
```

### 2. Thử parse lại giáo án

Mở browser console và check:
- Model đang chọn là gì?
- User tier là gì?

### 3. Check server console

Nếu lỗi 403, server sẽ log ngay lý do:
- Model không được phép → Chọn model khác
- Không phải owner → Đăng nhập đúng account

## 🎯 GIẢI PHÁP

### Nếu lỗi Model Check:
```
❌ Lỗi: "Model gemini-2.5-flash không khả dụng cho gói Miễn phí"

✅ Giải pháp:
1. Chọn model FREE: gemini-3.1-flash-lite
2. Hoặc nâng cấp lên BASIC/PREMIUM
```

### Nếu lỗi Ownership:
```
❌ Lỗi: "Không có quyền truy cập"

✅ Giải pháp:
1. Đăng nhập đúng account owner
2. Hoặc yêu cầu owner share quyền Collaborator
3. Hoặc dùng account ADMIN
```

## 📊 FLOW CHECK

```
User gọi /api/lesson-plans/[id]/parse
  ↓
✓ Auth check (401 nếu chưa login)
  ↓
✓ Rate limit check
  ↓
✓ UUID validation
  ↓
✓ Model validation
  ↓
✓ Quota check
  ↓
→ Model permission check ← ❌ 403 (Model không được phép)
  ↓
→ Ownership check ← ❌ 403 (Không phải owner)
  ↓
✓ Parse file
```

## 🔄 NEXT STEPS

1. **Restart dev server:** `npm run dev`
2. **Try parse again**
3. **Check server console** để xem log chi tiết
4. **Báo lại lỗi** với log từ console

## 📝 NOTES

- Logs chỉ hiện trong dev mode (`npm run dev`)
- Production sẽ dùng proper logging service
- 403 khác 401: 403 = authenticated nhưng không có permission

## 🎉 SAU KHI FIX

Server logs sẽ giúp identify chính xác:
- ✅ Model nào bị reject
- ✅ User tier nào
- ✅ Ownership mismatch
- ✅ Easy to fix!
