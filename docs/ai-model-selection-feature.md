# Tính Năng Lựa Chọn AI Model và Ước Tính Chi Phí

## Tổng quan

Người dùng giờ đây có thể lựa chọn AI model phù hợp với nhu cầu và ngân sách trước khi thực hiện parse hoặc review giáo án. Hệ thống sẽ hiển thị ước tính chi phí cho mỗi model.

---

## AI Models Hỗ Trợ

### 1. Gemini 1.5 Flash (Khuyên dùng) ⭐
- **Tốc độ:** Rất nhanh
- **Chất lượng:** Tốt
- **Chi phí:** ~50-200 đ/giáo án
- **Phù hợp:** Hầu hết các trường hợp, giáo án thông thường

**Giá:**
- Input: $0.000075 / 1K tokens (~1.8 đ/1K tokens)
- Output: $0.0003 / 1K tokens (~7.2 đ/1K tokens)

### 2. Gemini 1.5 Pro
- **Tốc độ:** Trung bình
- **Chất lượng:** Rất tốt
- **Chi phí:** ~800-3,000 đ/giáo án
- **Phù hợp:** Giáo án phức tạp, cần phân tích sâu

**Giá:**
- Input: $0.00125 / 1K tokens (~30 đ/1K tokens)
- Output: $0.005 / 1K tokens (~120 đ/1K tokens)

### 3. Gemini 2.0 Flash Experimental 🆓
- **Tốc độ:** Rất nhanh
- **Chất lượng:** Tốt
- **Chi phí:** MIỄN PHÍ (trong thời gian thử nghiệm)
- **Phù hợp:** Thử nghiệm, tiết kiệm chi phí

**Lưu ý:** Model experimental có thể thay đổi hoặc ngừng miễn phí bất cứ lúc nào.

---

## Workflow Sử Dụng

### Parse Giáo Án
1. Upload file DOCX
2. Click **"Parse giáo án"**
3. Modal "Chọn AI Model" xuất hiện
4. Xem ước tính chi phí cho mỗi model
5. Chọn model phù hợp
6. Click **"Xác nhận và phân tích"**
7. Đợi kết quả parse

### Review Giáo Án
1. Giáo án đã parse (status = PARSED)
2. Chọn bộ tiêu chí review
3. Click **"Review với AI"**
4. Modal "Chọn AI Model" xuất hiện
5. Xem ước tính chi phí
6. Chọn model
7. Click **"Xác nhận và review"**
8. Đợi kết quả review

---

## UI Model Selection Modal

### Thông tin hiển thị cho mỗi model:

**Card Layout:**
```
┌─────────────────────────────────────────────────┐
│ ○ Gemini 1.5 Flash          [Khuyên dùng]      │
│                                                 │
│ Nhanh, hiệu quả, phù hợp cho hầu hết...        │
│                                                 │
│ ⏱ Tốc độ: Rất nhanh  ✓ Chất lượng: Tốt       │
│ 💵 Chi phí: 120 đ ($0.005)                     │
│                                                 │
│ Ước tính: ~5,200 tokens đầu vào,              │
│ ~4,000 tokens đầu ra                          │
└─────────────────────────────────────────────────┘
```

**Features:**
- Radio button để chọn
- Badge "Khuyên dùng" / "Miễn phí" / "Thử nghiệm"
- Icons cho speed, quality, cost
- Chi phí hiển thị cả VNĐ và USD
- Token estimate

---

## Ước Tính Chi Phí

### Công thức tính:

```typescript
// 1. Ước tính input tokens
const contentChars = wordCount * 4; // Trung bình 4 ký tự/từ
const inputTokens = Math.ceil(contentChars / 3) + 2000; // +2000 cho system prompt

// 2. Ước tính output tokens
const outputTokens = 4000; // Annotations + review result

// 3. Tính chi phí
const inputCost = (inputTokens / 1000) * model.pricing.input;
const outputCost = (outputTokens / 1000) * model.pricing.output;
const totalCost = inputCost + outputCost;

// 4. Convert sang VNĐ
const vndCost = totalCost * 24000; // 1 USD = 24,000 VNĐ
```

### Ví dụ:

**Giáo án 500 từ với Gemini 1.5 Flash:**
```
Input tokens: ~670 tokens (500 từ * 4 / 3 + 2000)
Output tokens: ~4000 tokens

Input cost: (2670 / 1000) * 0.000075 = $0.0002
Output cost: (4000 / 1000) * 0.0003 = $0.0012
Total: $0.0014 ≈ 34 đ
```

**Giáo án 2000 từ với Gemini 1.5 Pro:**
```
Input tokens: ~4,667 tokens
Output tokens: ~4,000 tokens

Input cost: (4667 / 1000) * 0.00125 = $0.0058
Output cost: (4000 / 1000) * 0.005 = $0.02
Total: $0.0258 ≈ 620 đ
```

---

## Implementation Details

### Files Created/Modified

**New Files:**
1. `src/lib/ai-models.ts` - Model definitions, pricing, calculations
2. `src/components/lesson-plans/ModelSelectionModal.tsx` - UI modal

**Modified Files:**
1. `src/app/lesson-plans/[id]/page.tsx` - Integration
2. `src/app/api/lesson-plans/[id]/parse/route.ts` - Accept model param
3. `src/app/api/lesson-plans/[id]/review/route.ts` - Accept model param
4. `src/lib/gemini.ts` - Pass model to API

### Data Flow

```
User clicks Parse/Review
    ↓
handleOpenModelSelection()
    ↓
ModelSelectionModal opens
    ↓
Calculate costs for all models
    ↓
User selects model
    ↓
handleModelSelected(model)
    ↓
handleParse(model) or handleReview(model)
    ↓
API call with model param
    ↓
reviewSection(..., model)
    ↓
Gemini API with specified model
```

---

## Code Examples

### 1. Calculate Cost

```typescript
import { estimateLessonPlanReviewCost } from "@/lib/ai-models";

const wordCount = 1500;
const model = "gemini-1.5-flash";

const cost = estimateLessonPlanReviewCost(wordCount, model);
// {
//   inputTokens: 4000,
//   outputTokens: 4000,
//   totalCost: 0.0015,
//   costVND: "36 đ",
//   costUSD: "$0.002"
// }
```

### 2. Using ModelSelectionModal

```tsx
import ModelSelectionModal from "@/components/lesson-plans/ModelSelectionModal";

<ModelSelectionModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  onConfirm={(model) => handleReview(model)}
  wordCount={2000}
  operation="review" // "parse" or "review"
/>
```

### 3. API Call with Model

```typescript
// Parse
await fetch(`/api/lesson-plans/${id}/parse`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "gemini-1.5-flash" }),
});

// Review
await fetch(`/api/lesson-plans/${id}/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ruleSetId: "...",
    model: "gemini-1.5-pro"
  }),
});
```

---

## Best Practices

### Khi nào dùng model nào?

**Gemini 1.5 Flash:**
- ✅ Giáo án thông thường (< 3000 từ)
- ✅ Cần kết quả nhanh
- ✅ Ngân sách hạn chế
- ✅ Review định kỳ nhiều giáo án

**Gemini 1.5 Pro:**
- ✅ Giáo án phức tạp, nhiều phần
- ✅ Cần phân tích chi tiết
- ✅ Giáo án quan trọng (thi giảng, kiểm tra)
- ✅ Có ngân sách cho chất lượng cao

**Gemini 2.0 Flash Experimental:**
- ✅ Thử nghiệm tính năng
- ✅ Tiết kiệm chi phí tối đa
- ✅ Không quan trọng nếu có lỗi
- ⚠️ Không dùng cho production quan trọng

---

## Cost Optimization Tips

1. **Dùng Flash cho bulk operations**
   - Review nhiều giáo án cùng lúc → dùng Flash
   - Tiết kiệm ~80% chi phí so với Pro

2. **Chỉ dùng Pro khi cần thiết**
   - Giáo án đầu tiên → Flash
   - Nếu kết quả không tốt → Re-review với Pro

3. **Tận dụng model miễn phí**
   - Experimental model cho testing
   - Nhưng verify kết quả kỹ

4. **Giảm wordCount không cần thiết**
   - Loại bỏ phần phụ lục không cần review
   - Focus vào các section quan trọng

---

## Troubleshooting

### Modal không hiển thị chi phí
**Nguyên nhân:** wordCount = 0 hoặc sections chưa load
**Giải pháp:** Đảm bảo fetch sections trước khi mở modal

### Chi phí thực tế khác với ước tính
**Nguyên nhân:** Token count thực tế khác với estimate
**Giải pháp:** Ước tính là gần đúng, chênh lệch ±20% là bình thường

### Model không hoạt động
**Nguyên nhân:** API key không support model đó
**Giải pháp:** Kiểm tra API key có quyền với model

### Cost quá cao
**Nguyên nhân:** Giáo án quá dài hoặc dùng Pro model
**Giải pháp:** Dùng Flash hoặc giảm nội dung không cần thiết

---

## Future Enhancements

### Short-term
- [ ] Lưu lịch sử chi phí thực tế
- [ ] Compare estimated vs actual cost
- [ ] Model usage analytics
- [ ] Budget tracking per user

### Medium-term
- [ ] Batch pricing (discount cho nhiều giáo án)
- [ ] Monthly cost report
- [ ] Auto model selection based on budget
- [ ] Cost alerts

### Long-term
- [ ] Support thêm models (Claude, GPT-4)
- [ ] A/B testing models
- [ ] ML model recommendation
- [ ] Cost forecasting

---

## Security & Privacy

✅ **Model selection là client-side**
✅ **API key không expose ra frontend**
✅ **Chi phí chỉ là ước tính, không thanh toán thực**
⚠️ **Cần monitor actual cost từ Google AI Studio**

---

## Support

Nếu có vấn đề:
1. Check console logs
2. Verify API key còn hiệu lực
3. Check Google AI Studio quota
4. Liên hệ support với thông tin chi tiết

---

## Summary

✅ **3 AI models** để lựa chọn
✅ **Ước tính chi phí** trước khi thực hiện
✅ **UI trực quan** với model comparison
✅ **Flexible** - dùng model phù hợp cho từng case
✅ **Cost-effective** - tiết kiệm đến 80% với Flash

**Impact:** Người dùng có thể kiểm soát chi phí và chất lượng theo nhu cầu cụ thể của mình! 🎉
