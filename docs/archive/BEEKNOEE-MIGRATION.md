# Migration từ Gemini API sang Beeknoee Chat Completions API

## Tổng quan

Đã thực hiện migration hoàn toàn từ Google Gemini API sang Beeknoee Chat Completions API. Toàn bộ logic nghiệp vụ, prompts, và workflow đều được giữ nguyên.

## Thay đổi chính

### 1. Environment Variables

**Trước đây:**
```bash
GEMINI_API_KEY="your-gemini-api-key"
```

**Hiện tại:**
```bash
BEE_API_KEY="sk-bee-505771c8ec52db97d1b357d79a126cf0849149349af42b2e3f0de938b9a23711"
BEE_BASE_URL="https://platform.beeknoee.com/api/v1"
AI_MODEL="gemini-3.1-flash-lite"
```

### 2. AI Models

**Models cũ (Gemini):**
- `gemini-2.0-flash-exp` (experimental)
- `gemini-2.5-flash` (free)
- `gemini-1.5-flash` (standard)
- `gemini-1.5-pro` (premium)

**Models mới (Beeknoee):**
- `gemini-3.1-flash-lite` (free, recommended)
- `gemini-3.1-flash-lite-preview` (experimental)
- `gemini-2.5-flash` (standard)
- `gemini-3.1-pro-preview` (premium)

### 3. Files đã thay đổi

#### Core AI Library
- **Tạo mới:** `src/lib/beeknoee.ts` - Thay thế hoàn toàn `src/lib/gemini.ts`
- **Cập nhật:** `src/lib/ai-models.ts` - Models configuration
- **Cập nhật:** `src/lib/section-detector.ts` - Semantic section detection

#### API Routes
- `src/app/api/lesson-plans/[id]/review-stream/route.ts` - Streaming review
- `src/app/api/lesson-plans/[id]/review/route.ts` - Standard review
- `src/app/api/admin/settings/route.ts` - Admin settings

#### Frontend Components
- `src/components/lesson-plans/ModelSelectionModal.tsx` - Default model selection
- `src/app/lesson-plans/[id]/page.tsx` - Review triggers

#### Configuration
- `.env` - Environment variables
- `.env.example` - Template
- `package.json` - Removed `@google/generative-ai` dependency

## Chi tiết kỹ thuật

### API Request Format

**Beeknoee Chat Completions:**
```typescript
const response = await fetch(`${BEE_BASE_URL}/chat/completions`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${BEE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: modelName,
    messages: [
      {
        role: "system",
        content: "System prompt..."
      },
      {
        role: "user",
        content: "User prompt..."
      }
    ],
    temperature: 0.2,
    max_tokens: 8192,
    stream: false
  })
});
```

### Response Parsing

**Luôn đọc từ:**
```typescript
const content = data.choices?.[0]?.message?.content;
```

**JSON parsing với cleanup:**
```typescript
let cleanedResponse = responseText.trim();
if (cleanedResponse.startsWith("```json")) {
  cleanedResponse = cleanedResponse.replace(/^```json\n/, "").replace(/\n```$/, "");
} else if (cleanedResponse.startsWith("```")) {
  cleanedResponse = cleanedResponse.replace(/^```\n/, "").replace(/\n```$/, "");
}
const result = JSON.parse(cleanedResponse);
```

## Không thay đổi

✅ **Prompts** - Giữ nguyên 100%
✅ **Business Logic** - Không thay đổi workflow
✅ **Output Schema** - Cấu trúc JSON response giống hệt
✅ **Database Schema** - Không cần migration
✅ **Frontend UI** - Không thay đổi giao diện
✅ **Caching Logic** - Sử dụng lại hệ thống cache hiện có
✅ **Token Estimation** - Logic ước tính giữ nguyên
✅ **Rate Limiting** - Không thay đổi
✅ **Security Validation** - Giữ nguyên

## Model Configuration

Model có thể được cấu hình qua:

1. **Environment Variable:**
   ```bash
   AI_MODEL="gemini-3.1-flash-lite"
   ```

2. **Frontend Selection:**
   Người dùng có thể chọn model khi trigger review

3. **API Parameter:**
   Truyền model name trong request body

**Không hardcode model trong source code.**

## Testing Checklist

- [ ] Parse lesson plan với model mặc định
- [ ] Review lesson plan với model mặc định
- [ ] Test với các models khác nhau
- [ ] Verify annotations được tạo đúng
- [ ] Check caching hoạt động
- [ ] Verify streaming review
- [ ] Test section detection với Beeknoee
- [ ] Admin settings page hoạt động

## Rollback Plan

Nếu cần rollback về Gemini API:

1. Restore `src/lib/gemini.ts` từ git history
2. Update imports từ `beeknoee` về `gemini`
3. Restore environment variables
4. Restore model configurations trong `ai-models.ts`
5. Cài lại `@google/generative-ai` package

## Notes

- API Key đã được cấu hình sẵn trong `.env`
- Default model: `gemini-3.1-flash-lite` (free tier)
- Beeknoee API endpoint: `https://platform.beeknoee.com/api/v1`
- Tất cả existing functionality được giữ nguyên
- Không có breaking changes với database hoặc frontend

## Support

Nếu gặp vấn đề:
1. Kiểm tra `BEE_API_KEY` trong `.env`
2. Verify model name hợp lệ
3. Check API response format
4. Review error logs
