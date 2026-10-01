# 🔧 FIX: Support Beeknoee Provider Model IDs

## ❌ VẤN ĐỀ

Beeknoee API hỗ trợ 2 formats cho model names:
- Short format: `gemini-3.1-flash-lite`
- Provider format: `google/gemini-3.1-flash-lite`

Code cũ chỉ gửi short format → có thể gây lỗi tùy Beeknoee API version.

## ✅ GIẢI PHÁP

### 1. Thêm `providerModelId` vào AI_MODELS

**File:** `src/lib/ai-models.ts`

```typescript
export const AI_MODELS = {
  "gemini-3.1-flash-lite": {
    name: "Gemini 3.1 Flash Lite",
    provider: "Beeknoee",
    providerModelId: "google/gemini-3.1-flash-lite", // ✅ Beeknoee format
    pricing: { input: 0, output: 0 },
    tier: "free",
  },
  "gemini-3.1-flash-lite-preview": {
    providerModelId: "google/gemini-3.1-flash-lite-preview",
  },
  "gemini-2.5-flash": {
    providerModelId: "google/gemini-2.5-flash",
  },
  "gemini-3.1-pro-preview": {
    providerModelId: "google/gemini-3.1-pro-preview",
  },
}
```

### 2. Auto-convert khi gọi API

**File:** `src/lib/beeknoee.ts`

```typescript
/**
 * Get Beeknoee provider model ID
 */
function getProviderModelId(modelName: string): string {
  const model = AI_MODELS[modelName as AIModelType];
  if (model && "providerModelId" in model) {
    return model.providerModelId; // ✅ Return google/gemini-xxx
  }
  return modelName; // Fallback
}

async function callBeeknoeeAPI(prompt: string, modelName: string) {
  const providerModelId = getProviderModelId(modelName); // ✅ Convert
  
  const response = await fetch(`${BEE_BASE_URL}/chat/completions`, {
    body: JSON.stringify({
      model: providerModelId, // ✅ Send google/gemini-xxx
      messages: [...],
    }),
  });
}
```

## 🎯 KẾT QUẢ

### ✅ Model Mapping

| User selects | Sent to API |
|--------------|-------------|
| `gemini-3.1-flash-lite` | `google/gemini-3.1-flash-lite` |
| `gemini-3.1-flash-lite-preview` | `google/gemini-3.1-flash-lite-preview` |
| `gemini-2.5-flash` | `google/gemini-2.5-flash` |
| `gemini-3.1-pro-preview` | `google/gemini-3.1-pro-preview` |

### ✅ Backwards Compatible

- User vẫn chọn short names: `gemini-3.1-flash-lite`
- API nhận provider format: `google/gemini-3.1-flash-lite`
- Fallback: Nếu không có providerModelId, gửi as-is

## 🧪 TEST

```bash
# Build
npm run build
✓ Success

# Test API call
User chọn: "gemini-3.1-flash-lite"
→ API receives: "google/gemini-3.1-flash-lite"
→ Beeknoee accepts ✓
```

## 📝 NOTES

- ✅ All models now use provider format
- ✅ Quota checking still uses short names (internal)
- ✅ UI still shows friendly names
- ✅ Zero breaking changes

## 🎉 HOÀN TẤT

✅ Support cả 2 formats
✅ Auto-convert khi gọi API
✅ Build thành công
✅ Backwards compatible
