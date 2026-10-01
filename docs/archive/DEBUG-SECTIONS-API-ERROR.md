# 🔍 DEBUG: "Lỗi khi tải sections"

## ✅ ĐÃ THÊM DEBUG LOGS

Giờ khi gặp lỗi, **server console** (terminal chạy `npm run dev`) sẽ hiển thị:

```
[Sections API] Error: ...
[Sections API] Error details: {
  message: "...",
  stack: "..."
}
```

## 🔍 CÁCH DEBUG

### 1. Check Server Console (Terminal)

**Mở terminal đang chạy `npm run dev`**, tìm logs:

#### Case A: Access Denied
```
[Sections API] Access denied: {
  userId: "user-abc",
  ownerId: "user-xyz",
  role: "LEARNER"
}
```
→ **FIX:** Đăng nhập đúng account owner

#### Case B: Lesson Plan Not Found
```
[Sections API] Lesson plan not found: abc-123
```
→ **FIX:** ID không đúng hoặc giáo án đã xóa

#### Case C: Database Error
```
[Sections API] Error: PrismaClientKnownRequestError
[Sections API] Error details: {
  message: "Invalid `prisma.lessonPlanSection.findMany()` invocation...",
  stack: "..."
}
```
→ **FIX:** Database schema issue

### 2. Check Browser Console

```
[Review] Failed to fetch sections: "Lỗi khi tải sections"
```

Sau đó check **Network tab:**
- Request: `GET /api/lesson-plans/[id]/sections`
- Status: 500? 403? 404?
- Response: `{ success: false, message: "..." }`

### 3. Test API Trực Tiếp

Mở browser console, paste:

```javascript
fetch('/api/lesson-plans/[REPLACE-WITH-ID]/sections')
  .then(r => r.json())
  .then(d => console.log('Sections API:', d))
  .catch(e => console.error('Sections API Error:', e));
```

## 🎯 POSSIBLE CAUSES

### 1. ❌ Permission Issue (403)
**Nguyên nhân:** User không phải owner và không phải admin

**Server log:**
```
[Sections API] Access denied: {
  userId: "user-A",
  ownerId: "user-B",
  role: "LEARNER"
}
```

**Fix:**
- Đăng nhập account đúng (owner)
- Hoặc admin account
- Hoặc được thêm làm collaborator

### 2. ❌ Lesson Plan Not Found (404)
**Nguyên nhân:** ID không tồn tại hoặc đã xóa

**Server log:**
```
[Sections API] Lesson plan not found: abc-123
```

**Fix:**
- Check ID có đúng không
- Check giáo án có bị xóa (deletedAt) không

### 3. ❌ Database Error (500)
**Nguyên nhân:** Lỗi query Prisma

**Server log:**
```
[Sections API] Error: PrismaClientKnownRequestError
```

**Common issues:**
- Thiếu relation trong schema
- Column không tồn tại
- Type mismatch

**Fix:**
```bash
# Reset database
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

### 4. ❌ No Sections Yet
**Nguyên nhân:** Chưa parse

**Server log:**
```
[Sections API] Fetched sections: 0
```

**Browser:**
```json
{
  "success": true,
  "data": []
}
```

**Fix:** Parse giáo án trước

## 📋 DEBUG WORKFLOW

```
1. Reproduce error
   ↓
2. Check BROWSER console
   → "[Review] Failed to fetch sections: ..."
   ↓
3. Check NETWORK tab
   → GET /sections → Status? Response?
   ↓
4. Check SERVER console (terminal)
   → [Sections API] Error: ...
   → [Sections API] Error details: {...}
   ↓
5. Identify cause
   ↓
6. Apply fix
```

## 🆘 NEXT STEPS

### 1. Restart dev server
```bash
# Stop: Ctrl + C
npm run dev
```

### 2. Try again & Check logs

**Server terminal sẽ show:**
```
[Sections API] Access denied: {...}
hoặc
[Sections API] Lesson plan not found: ...
hoặc
[Sections API] Error: ...
```

### 3. Share logs

Nếu vẫn lỗi, copy:
1. ✅ Server console logs (terminal)
2. ✅ Browser console errors
3. ✅ Network tab response

---

## 🎉 SAU KHI FIX

Server log sẽ show:
```
[Sections API] Fetched sections: 5
```

Browser log:
```
[Review] Fetched sections: 5
```

Document hiển thị đầy đủ! ✅

---

**Restart dev server và share server logs!** 🔍
