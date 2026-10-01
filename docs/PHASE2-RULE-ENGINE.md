# Phase 2: Rule Engine với AI Prompt tùy chỉnh

**Status:** ✅ Completed  
**Date:** 2026-06-28

---

## 🎯 Mục tiêu

Nâng cấp hệ thống CircularSectionRequirement để admin có thể:
1. Cấu hình prompt AI riêng cho từng phần
2. AI sử dụng prompt tùy chỉnh khi review section tương ứng
3. Linh hoạt hơn trong việc kiểm tra yêu cầu cụ thể

---

## 📁 Files đã sửa

### 1. Database Schema
**File:** `prisma/schema.prisma`

**Thay đổi:**
```prisma
model CircularSectionRequirement {
  id               String   @id @default(uuid())
  circularId       String
  sectionType      String
  title            String
  requirements     String   @db.Text
  correctExample   String?  @db.Text
  incorrectExample String?  @db.Text
  aiPrompt         String?  @db.Text  // ✅ NEW: Prompt tùy chỉnh cho AI
  priority         Int      @default(0)
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  // ...
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_ai_prompt_to_circular_requirements
✅ Migration applied successfully
```

---

### 2. Admin UI - Requirements Page
**File:** `src/app/admin/circulars/[id]/requirements/page.tsx`

**Thay đổi:**
- Thêm state `aiPrompt`
- Form field mới: textarea với background xanh, icon 🤖
- Reset/Edit handlers bao gồm aiPrompt
- Submit payload bao gồm aiPrompt

**UI Component:**
```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <label className="block text-sm font-medium mb-1">
    🤖 Prompt AI tùy chỉnh
  </label>
  <textarea
    value={aiPrompt}
    onChange={(e) => setAiPrompt(e.target.value)}
    className="w-full px-3 py-2 border rounded-lg bg-white"
    rows={5}
    placeholder="Prompt cụ thể cho AI khi review phần này..."
  />
  <p className="text-xs text-blue-600 mt-1">
    💡 Nếu để trống, AI sẽ dùng prompt mặc định. Nhập prompt riêng để kiểm tra cụ thể hơn.
  </p>
</div>
```

---

### 3. API Endpoints
**Files:**
- `src/app/api/admin/circulars/[id]/requirements/route.ts` (POST)
- `src/app/api/admin/circulars/[id]/requirements/[requirementId]/route.ts` (PATCH)

**Thay đổi:**
- Destructure `aiPrompt` từ request body
- Include `aiPrompt` trong Prisma create/update operations

```typescript
const {
  sectionType,
  title,
  requirements,
  correctExample,
  incorrectExample,
  aiPrompt,  // ✅ NEW
  priority,
  isActive,
} = body;

// Create
await prisma.circularSectionRequirement.create({
  data: {
    // ...
    aiPrompt,  // ✅ NEW
    // ...
  },
});

// Update
if (aiPrompt !== undefined) updateData.aiPrompt = aiPrompt;
```

---

### 4. AI Integration - Gemini Library
**File:** `src/lib/gemini.ts`

**Thay đổi trong `buildReviewPrompt()`:**
```typescript
${sectionRequirements.map((req, idx) => `
${idx + 1}. ${req.title}
${req.requirements}

${req.aiPrompt ? `🤖 HƯỚNG DẪN KIỂM TRA:\n${req.aiPrompt}\n` : ""}
${req.correctExample ? `✓ VÍ DỤ ĐÚNG:\n${req.correctExample}\n` : ""}
${req.incorrectExample ? `✗ VÍ DỤ SAI:\n${req.incorrectExample}\n` : ""}
`).join("\n---\n")}
```

**Logic:**
- Nếu `req.aiPrompt` có giá trị → inject vào prompt với header "🤖 HƯỚNG DẪN KIỂM TRA"
- Nếu trống → bỏ qua, AI dùng prompt mặc định từ requirements + examples

---

## 🧪 Test Flow

### 1. Tạo requirement với AI prompt tùy chỉnh
```
1. Vào http://localhost:3000/admin/circulars
2. Click Settings icon bên cạnh công văn
3. Click "Thêm yêu cầu"
4. Chọn phần: OBJECTIVES
5. Điền:
   - Tiêu đề: "Yêu cầu về mục tiêu bài học"
   - Yêu cầu chi tiết: "Phải có đủ 3 thành phần..."
   - Ví dụ đúng: "Học sinh hiểu được..."
   - Ví dụ sai: "Học sinh biết về..."
   - 🤖 Prompt AI: "Kiểm tra xem mục tiêu có đủ 3 thành phần Kiến thức-Kỹ năng-Thái độ không. Nếu thiếu, đề xuất bổ sung."
6. Submit
7. ✅ Yêu cầu được tạo với aiPrompt
```

### 2. Review giáo án với custom prompt
```
1. Upload giáo án có phần OBJECTIVES
2. Click "Review"
3. AI nhận được prompt:
   - Yêu cầu chi tiết
   - 🤖 HƯỚNG DẪN KIỂM TRA: "Kiểm tra xem mục tiêu có đủ 3 thành phần..."
   - ✓ VÍ DỤ ĐÚNG
   - ✗ VÍ DỤ SAI
4. AI review theo hướng dẫn cụ thể
5. ✅ Kết quả chi tiết hơn, đúng trọng tâm
```

---

## 📊 Ví dụ thực tế

### Scenario: Kiểm tra mục tiêu bài học

**Requirements (general):**
```
Phải có đủ 3 thành phần: Kiến thức, Kỹ năng, Thái độ
```

**AI Prompt (specific):**
```
Kiểm tra từng mục tiêu một:
1. Đếm xem có đủ 3 loại mục tiêu không
2. Kiểm tra động từ: "hiểu được", "vận dụng được" (đúng) vs "biết về", "làm quen" (sai)
3. Nếu thiếu thành phần nào, đề xuất bổ sung CỤ THỂ
4. Trả về trong proposedContent theo format:
   a) Kiến thức: ...
   b) Kỹ năng: ...
   c) Thái độ: ...
```

**Result:**
- AI không chỉ nói "thiếu mục tiêu"
- AI chỉ rõ: "Thiếu mục tiêu về Thái độ"
- AI đề xuất: "c) Thái độ: Rèn luyện tính cẩn thận, chính xác trong giải toán"

---

## ✅ Benefits

1. **Linh hoạt:** Admin tùy chỉnh cách AI kiểm tra từng phần
2. **Cụ thể:** Prompt riêng cho yêu cầu đặc biệt (đếm số lượng, format cụ thể)
3. **Không bắt buộc:** Để trống → AI dùng logic mặc định
4. **Backward compatible:** Các requirement cũ không có aiPrompt vẫn hoạt động

---

## 🔗 Integration với Phase 1

**Phase 1 (Upload):**
- Admin upload file DOCX → auto-parse sections
- Tạo CircularSectionRequirement cho từng phần

**Phase 2 (Rule Engine):**
- Admin vào từng requirement đã tạo
- Thêm AI prompt cụ thể cho phần đó
- AI sẽ dùng prompt này khi review

**Next Phase 3 (Streaming):**
- Review từng section tuần tự
- Mỗi section dùng custom prompt tương ứng
- Streaming response realtime

---

## 📈 Database Status

**Migration applied:** ✅  
**Prisma client regenerated:** ✅  
**Build successful:** ✅ Compiled in 11.4s  
**API endpoints tested:** ✅ POST/PATCH working

---

**Phase 2 completed successfully. Ready for Phase 3: Streaming Review.**
