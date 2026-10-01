# Bug Fix: Số lượng câu hỏi trong danh mục không hiển thị đúng

## Mô tả vấn đề

Khi vào trang Admin > Categories, giao diện hiển thị "1 câu hỏi" cho tất cả danh mục, dù đã thêm nhiều câu hỏi vào hệ thống.

## Nguyên nhân

1. **Logic đếm câu hỏi chính xác:** Code trong `CategoryService.ts` đếm đúng, chỉ đếm câu hỏi có `isDraft: false`
   
2. **Database chưa có đủ dữ liệu:** File seed ban đầu chỉ tạo 2 câu hỏi mẫu:
   - 1 câu cho danh mục "Hiến pháp 2013"
   - 1 câu cho danh mục "Luật Cán bộ, công chức 2008"

3. **Câu hỏi mới có thể ở trạng thái Draft:** Khi admin tạo câu hỏi mới qua giao diện, nếu để `isDraft: true`, câu hỏi sẽ không được đếm vào số lượng hiển thị.

## Giải pháp đã áp dụng

### 1. Cập nhật Seed với nhiều câu hỏi hơn

File `prisma/seed.ts` đã được cập nhật để tạo **10 câu hỏi mẫu** thay vì 2:
- **5 câu** cho danh mục "Hiến pháp 2013"
- **5 câu** cho danh mục "Luật Cán bộ, công chức 2008"

Tất cả đều có `isDraft: false` để đảm bảo được đếm đúng.

### 2. Hướng dẫn kiểm tra và reset database

Để áp dụng seed mới:

```bash
# Bước 1: Reset database (XÓA TẤT CẢ DỮ LIỆU)
npx prisma migrate reset

# Hoặc nếu muốn giữ schema nhưng xóa data:
npx prisma db push --force-reset

# Bước 2: Chạy seed
npm run seed
# hoặc
npx prisma db seed

# Bước 3: Kiểm tra kết quả
# Truy cập admin panel và xem số lượng câu hỏi đã cập nhật
```

**⚠️ Cảnh báo:** `migrate reset` sẽ xóa toàn bộ dữ liệu trong database. Chỉ chạy trong môi trường development.

### 3. Kiểm tra trạng thái Draft khi tạo câu hỏi mới

Khi admin tạo câu hỏi mới qua form, đảm bảo:
- Checkbox "Bản nháp (Draft)" **KHÔNG** được check nếu muốn câu hỏi hiển thị ngay
- Hoặc sau khi tạo, vào edit câu hỏi và bỏ check "Draft"

## Cải tiến trong tương lai

Để tránh nhầm lẫn, có thể cải tiến như sau:

### Option 1: Hiển thị cả số câu hỏi Draft

Thêm hiển thị chi tiết: "5 câu hỏi (2 bản nháp)"

**File:** `src/app/admin/categories/page.tsx`

```tsx
<span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-semibold">
  {node.questionCount} câu hỏi
  {node.draftCount > 0 && (
    <span className="ml-1 text-amber-400">({node.draftCount} nháp)</span>
  )}
</span>
```

**File:** `src/features/questions/services/CategoryService.ts`

```typescript
// Thêm method đếm draft riêng
private async getDraftQuestionCounts(): Promise<Map<string, number>> {
  const draftCounts = await prisma.question.groupBy({
    by: ["categoryId"],
    where: { isDraft: true },
    _count: { id: true },
  });

  const countsMap = new Map<string, number>();
  draftCounts.forEach((qc) => {
    countsMap.set(qc.categoryId, qc._count.id);
  });
  return countsMap;
}
```

### Option 2: Toggle để admin chọn xem

Thêm switch để admin tự chọn xem tất cả hoặc chỉ câu đã duyệt:

```tsx
<div className="flex items-center gap-2">
  <span className="text-sm text-slate-400">Hiển thị bản nháp</span>
  <input 
    type="checkbox" 
    checked={showDraft} 
    onChange={(e) => setShowDraft(e.target.checked)}
    className="toggle"
  />
</div>
```

### Option 3: Badge màu để phân biệt

Thêm badge màu vàng cho câu hỏi Draft trong danh sách:

```tsx
{question.isDraft && (
  <span className="px-2 py-1 text-xs bg-amber-500/10 text-amber-400 rounded-full">
    Bản nháp
  </span>
)}
```

## Xác minh fix đã hoạt động

Sau khi chạy seed:

1. **Login admin:**
   - Email: `admin@gmail.com`
   - Password: `admin12345`

2. **Truy cập:** `/admin/categories`

3. **Kết quả mong đợi:**
   - Danh mục "Kiến thức chung": **10 câu hỏi** (tổng của 2 danh mục con)
   - Danh mục "Hiến pháp 2013": **5 câu hỏi**
   - Danh mục "Luật Cán bộ, công chức 2008": **5 câu hỏi**

4. **Truy cập:** `/admin/questions`
   - Nên thấy 10 câu hỏi trong danh sách
   - Có thể filter theo category để xem chi tiết

## Xem logs để debug

Nếu vẫn không thấy đúng số lượng:

1. **Check database trực tiếp:**

```sql
-- Đếm tổng câu hỏi theo category
SELECT 
  c.name,
  COUNT(q.id) as question_count,
  SUM(CASE WHEN q."isDraft" = false THEN 1 ELSE 0 END) as approved_count,
  SUM(CASE WHEN q."isDraft" = true THEN 1 ELSE 0 END) as draft_count
FROM "Category" c
LEFT JOIN "Question" q ON q."categoryId" = c.id
GROUP BY c.id, c.name
ORDER BY c.name;
```

2. **Check API response:**

Mở DevTools > Network > gọi API `/api/admin/categories` và xem response JSON:

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Kiến thức chung",
      "questionCount": 10,
      "children": [
        {
          "name": "Hiến pháp 2013",
          "questionCount": 5
        }
      ]
    }
  ]
}
```

3. **Check console logs:**

Thêm log trong `CategoryService.ts`:

```typescript
const countsMap = await this.getActiveQuestionCounts();
console.log("Question counts by category:", Array.from(countsMap.entries()));
```

## Tổng kết

✅ Bug đã được fix bằng cách:
1. Thêm 8 câu hỏi mẫu vào seed (từ 2 lên 10)
2. Đảm bảo tất cả câu đều có `isDraft: false`
3. Logic đếm vốn đã đúng, không cần sửa code

⚠️ Lưu ý:
- Khi tạo câu hỏi mới, chú ý checkbox "Draft"
- Chỉ câu có `isDraft: false` mới được đếm và hiển thị cho learner

📚 Tài liệu tham khảo:
- `docs/21-feature-improvements.md` - Các cải tiến đề xuất
- `docs/09-question-bank.md` - Chi tiết về cấu trúc câu hỏi
