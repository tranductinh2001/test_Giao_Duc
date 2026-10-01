# 📋 Section Requirements System - Config yêu cầu chi tiết cho giáo án

**Tính năng:** Hệ thống config yêu cầu chi tiết cho từng phần của giáo án  
**Mục đích:** Admin có thể cấu hình yêu cầu cụ thể cho từng section (Mục tiêu, Chuẩn bị, Hoạt động...) để AI review theo đúng chuẩn

---

## 🎯 Tổng quan

Hệ thống cho phép admin:
1. Quản lý công văn (Thông tư 32/2018, Công văn 2345...)
2. **Config yêu cầu chi tiết cho từng phần** của giáo án
3. AI sẽ nhận yêu cầu này và review theo đúng mẫu

---

## 📊 Database Schema

### CircularSectionRequirement Model

```prisma
model CircularSectionRequirement {
  id               String   @id @default(uuid())
  circularId       String
  sectionType      String   // OBJECTIVES, PREPARATION, ACTIVITIES, etc.
  title            String   // "Yêu cầu về mục tiêu bài học"
  requirements     String   @db.Text // Yêu cầu chi tiết
  correctExample   String?  @db.Text // Ví dụ đúng
  incorrectExample String?  @db.Text // Ví dụ sai
  priority         Int      @default(0)
  isActive         Boolean  @default(true)
  
  circular CircularDocument @relation(fields: [circularId], references: [id])
  
  @@unique([circularId, sectionType])
}
```

**Section Types:**
- `OBJECTIVES` - Mục tiêu
- `PREPARATION` - Chuẩn bị
- `ACTIVITIES` - Hoạt động dạy học
- `ASSESSMENT` - Đánh giá
- `HOMEWORK` - Bài tập về nhà
- `CONSOLIDATION` - Củng cố
- `OTHER` - Khác

---

## 🔗 API Endpoints

### 1. GET /api/admin/circulars/[id]/requirements
Lấy danh sách yêu cầu cho một công văn

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sectionType": "OBJECTIVES",
      "title": "Yêu cầu về mục tiêu bài học",
      "requirements": "Phải có đủ 3 thành phần...",
      "correctExample": "Học sinh hiểu được...",
      "incorrectExample": "Học sinh biết về...",
      "priority": 10,
      "isActive": true
    }
  ]
}
```

### 2. POST /api/admin/circulars/[id]/requirements
Tạo yêu cầu mới

**Body:**
```json
{
  "sectionType": "OBJECTIVES",
  "title": "Yêu cầu về mục tiêu bài học",
  "requirements": "1. Phải có kiến thức\n2. Phải có kỹ năng\n3. Phải có thái độ",
  "correctExample": "Học sinh hiểu được phương trình bậc nhất",
  "incorrectExample": "Học sinh biết về phương trình",
  "priority": 10,
  "isActive": true
}
```

### 3. PATCH /api/admin/circulars/[id]/requirements/[requirementId]
Cập nhật yêu cầu

### 4. DELETE /api/admin/circulars/[id]/requirements/[requirementId]
Xóa yêu cầu

---

## 🖥️ Admin UI

### Trang chính: /admin/circulars
- Danh sách công văn
- **Button "Settings" (bánh răng)** → Vào trang config requirements

### Trang config: /admin/circulars/[id]/requirements
- CRUD yêu cầu cho từng section
- Form fields:
  - Phần của giáo án (dropdown)
  - Tiêu đề
  - Yêu cầu chi tiết (textarea)
  - Ví dụ đúng (textarea)
  - Ví dụ sai (textarea)
  - Độ ưu tiên (number)
  - Kích hoạt (checkbox)

---

## 🤖 AI Integration Flow

### Khi user click "Review" giáo án:

1. **Load circulars** dựa trên gradeLevel
   ```typescript
   const circulars = await prisma.circularDocument.findMany({
     where: { 
       isActive: true,
       applicableLevel: { has: "PRIMARY" }
     }
   });
   ```

2. **Load section requirements** cho circular đó
   ```typescript
   const requirements = await prisma.circularSectionRequirement.findMany({
     where: { 
       circularId: { in: circularIds },
       isActive: true 
     }
   });
   ```

3. **Group by sectionType**
   ```typescript
   const reqsBySection = requirements.reduce((acc, req) => {
     acc[req.sectionType] = acc[req.sectionType] || [];
     acc[req.sectionType].push(req);
     return acc;
   }, {});
   ```

4. **Inject vào AI prompt** cho từng section
   ```
   YÊU CẦU CHI TIẾT CHO PHẦN OBJECTIVES:
   
   1. Yêu cầu về mục tiêu bài học
   Phải có đủ 3 thành phần: Kiến thức, Kỹ năng, Thái độ...
   
   ✓ VÍ DỤ ĐÚNG:
   Học sinh hiểu được phương trình bậc nhất
   
   ✗ VÍ DỤ SAI (CẦN TRÁNH):
   Học sinh biết về phương trình
   
   Bạn PHẢI kiểm tra theo yêu cầu trên và đề xuất sửa theo ĐÚNG mẫu.
   ```

5. **AI review** và trả về findings với proposedContent theo mẫu

---

## 📝 Ví dụ Config Yêu cầu

### Phần OBJECTIVES (Mục tiêu)

**Yêu cầu:**
```
1. Phải có đủ 3 thành phần bắt buộc:
   - Kiến thức: Học sinh hiểu được/nắm được/biết được (kiến thức cụ thể)
   - Kỹ năng: Học sinh có khả năng/làm được/thực hiện được (kỹ năng cụ thể)
   - Thái độ: Phát triển phẩm chất (giá trị sống, đạo đức, thái độ học tập)

2. Mỗi thành phần phải cụ thể, rõ ràng, đo lường được

3. Sử dụng động từ hành động: hiểu được, phân tích được, vận dụng được

4. Tránh mơ hồ: "học sinh biết về...", "làm quen với..."
```

**Ví dụ đúng:**
```
a) Kiến thức:
- Học sinh hiểu được khái niệm phương trình bậc nhất một ẩn
- Học sinh nắm được cách giải phương trình bậc nhất

b) Kỹ năng:
- Học sinh giải được các phương trình bậc nhất dạng cơ bản
- Học sinh vận dụng được phương trình vào bài toán thực tế

c) Thái độ:
- Rèn luyện tính cẩn thận, chính xác trong tính toán
- Phát triển tư duy logic, khả năng suy luận
```

**Ví dụ sai:**
```
- Học sinh biết về phương trình (không cụ thể)
- Học sinh làm quen với phương trình (không đo lường được)
- Học sinh hiểu bài (mơ hồ, không rõ hiểu gì)
```

### Phần PREPARATION (Chuẩn bị)

**Yêu cầu:**
```
1. Phải nêu rõ chuẩn bị của giáo viên:
   - Phương tiện dạy học (slide, video, mô hình...)
   - Tài liệu tham khảo
   - Đồ dùng dạy học cụ thể

2. Phải nêu rõ chuẩn bị của học sinh:
   - SGK, vở ghi
   - Đồ dùng học tập cần thiết
   - Kiến thức cần ôn tập

3. Nội dung cụ thể, không chung chung
```

**Ví dụ đúng:**
```
a) Giáo viên:
- Slide bài giảng về phương trình bậc nhất
- Video minh họa cách giải phương trình
- Bảng phụ vẽ trục số

b) Học sinh:
- SGK Toán 8, trang 15-20
- Vở bài tập, thước kẻ
- Ôn lại kiến thức về phép biến đổi đại số
```

---

## 🔧 Code Files

### Backend
- `prisma/schema.prisma` - CircularSectionRequirement model
- `src/app/api/admin/circulars/[id]/requirements/route.ts` - GET, POST
- `src/app/api/admin/circulars/[id]/requirements/[requirementId]/route.ts` - PATCH, DELETE
- `src/app/api/lesson-plans/[id]/review/route.ts` - Load requirements, pass to AI
- `src/lib/gemini.ts` - Inject requirements vào prompt

### Frontend
- `src/app/admin/circulars/page.tsx` - Button Settings
- `src/app/admin/circulars/[id]/requirements/page.tsx` - CRUD UI

---

## 📚 Hướng dẫn sử dụng

### Cho Admin:

1. **Vào quản lý công văn**
   - URL: http://localhost:3000/admin/circulars
   - Xem danh sách công văn (Thông tư 32, Công văn 2345...)

2. **Click icon Settings (bánh răng)** bên cạnh công văn muốn config

3. **Thêm yêu cầu cho từng phần:**
   - Click "Thêm yêu cầu"
   - Chọn phần: OBJECTIVES, PREPARATION, ACTIVITIES...
   - Điền tiêu đề: "Yêu cầu về mục tiêu bài học"
   - Điền yêu cầu chi tiết
   - Thêm ví dụ đúng/sai
   - Set độ ưu tiên
   - Lưu

4. **Khi user review giáo án**, AI sẽ tự động:
   - Load yêu cầu tương ứng với section
   - Review theo yêu cầu
   - Đưa ra góp ý với proposedContent theo đúng mẫu

### Cho User (khi review):

1. Upload giáo án tiểu học
2. Click "Review"
3. AI sẽ review dựa trên:
   - Công văn 5512, 2345 (toàn bộ nội dung)
   - **Yêu cầu chi tiết cho từng phần** (từ CircularSectionRequirement)
   - Ví dụ đúng/sai
4. Nhận góp ý CỤ THỂ, có mẫu sửa đúng

---

## ✅ Benefits

1. **Admin control:** Admin tự config yêu cầu, không cần code
2. **Flexible:** Thêm/sửa/xóa yêu cầu dễ dàng
3. **Specific:** AI review theo yêu cầu CỤ THỂ, không chung chung
4. **Examples:** Có ví dụ đúng/sai để AI học
5. **Priority:** Sắp xếp theo độ ưu tiên

---

## 🚀 Next Steps

1. **Seed data mẫu** cho section requirements
2. **Test AI review** với requirements
3. **Thêm settings page** trong quản lý giáo án cho:
   - Config API Gemini
   - Config review rules
   - Config circular requirements
   - Các settings khác

---

## 📊 Database Queries

### Load requirements khi review:
```typescript
// Get circulars
const circulars = await prisma.circularDocument.findMany({
  where: {
    isActive: true,
    applicableLevel: { has: lessonPlan.gradeLevel }
  },
  include: {
    sectionRequirements: {
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    }
  }
});

// Group by sectionType
const reqsBySection = circulars
  .flatMap(c => c.sectionRequirements)
  .reduce((acc, req) => {
    acc[req.sectionType] = acc[req.sectionType] || [];
    acc[req.sectionType].push(req);
    return acc;
  }, {});

// Use when reviewing each section
const sectionReqs = reqsBySection[section.sectionType] || [];
```

---

**Status:** ✅ Implemented  
**Last updated:** 2026-06-28
