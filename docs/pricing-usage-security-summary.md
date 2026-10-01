# Tổng Kết Hệ Thống Pricing, Usage Tracking và Security

## 🎯 Tổng Quan

Đã triển khai thành công hệ thống quản lý gói dịch vụ, theo dõi sử dụng AI, và bảo mật API cho nền tảng đánh giá giáo án.

---

## ✅ Đã Hoàn Thành

### 1. **Database Schema Updates**

#### Models Mới:
- **UsageLog**: Theo dõi mọi lần sử dụng AI (parse/review)
  - Lưu tokens, cost, success/failure
  - Indexed by userId, createdAt, lessonPlanId
  
- **SystemConfig**: Cấu hình hệ thống cho admin
  - Key-value store dạng JSON
  - Dùng cho tiêu chí đánh giá, settings
  
- **EvaluationCriteria**: Tiêu chí đánh giá theo công văn 5512
  - Phân theo level (C1, C2)
  - Category (objectives, content, method, etc.)
  - JSONB criteria cho flexibility

#### User Model Updates:
```prisma
enum PricingTier {
  FREE
  BASIC
  PREMIUM
  UNLIMITED
}

model User {
  pricingTier           PricingTier @default(FREE)
  subscriptionStartDate DateTime?
  subscriptionEndDate   DateTime?
  monthlyReviewsUsed    Int         @default(0)
  lastResetDate         DateTime    @default(now())
  usageLogs             UsageLog[]
}
```

**Migration**: `add_pricing_usage_tracking_evaluation_criteria` đã chạy thành công ✅

---

### 2. **Pricing Tiers System** (`src/lib/ai-models.ts`)

```typescript
PRICING_TIERS = {
  FREE: {
    price: 0,
    quota: {
      monthlyReviews: 3,
      allowedModels: ["gemini-2.5-flash-lite", "gemini-2.0-flash-exp"]
    }
  },
  BASIC: {
    price: 99000, // VNĐ/tháng
    quota: {
      monthlyReviews: 20,
      allowedModels: ["flash-lite", "flash", "experimental"]
    }
  },
  PREMIUM: {
    price: 299000,
    quota: {
      monthlyReviews: 100,
      allowedModels: ALL_MODELS // Bao gồm Pro
    }
  },
  UNLIMITED: {
    price: 999000,
    quota: {
      monthlyReviews: -1, // Không giới hạn
      allowedModels: ALL_MODELS
    }
  }
}
```

#### Gemini Models:
- **Gemini 2.5 Flash Lite**: $0.10/1M input, $0.40/1M output
- **Gemini 2.5 Flash** ⭐: $0.30/1M input, $2.50/1M output (recommended)
- **Gemini 2.5 Pro**: $1.25/1M input, $10.00/1M output

---

### 3. **Usage Tracking System** (`src/lib/usage-tracking.ts`)

#### Core Functions:

**checkUserQuota(userId)**
- Kiểm tra quota còn lại
- Tự động reset hàng tháng
- Returns: `{ canUse, remaining, total, tier }`

**incrementUsageCount(userId)**
- Tăng counter mỗi khi review/parse thành công
- Chỉ tính khi success = true

**logUsage(params)**
- Log mọi AI operation (thành công/thất bại)
- Track: tokens, cost, model, operation type
- Dùng cho analytics và billing

**canUseModel(userId, modelType)**
- Check xem user có quyền dùng model hay không
- Returns: `{ canUse, reason? }`

**getUserMonthlyUsage(userId)**
- Thống kê tháng hiện tại
- Returns: reviewsUsed, totalCost, success/fail counts

**getSystemUsageStats()**
- Admin dashboard statistics
- Total requests, costs, most used models

---

### 4. **Rate Limiting** (`src/lib/rate-limit.ts`)

#### Configs:
```typescript
RATE_LIMITS = {
  AI_OPERATIONS: {
    windowMs: 60000,  // 1 phút
    maxRequests: 5    // 5 requests/phút
  },
  API_WRITE: {
    windowMs: 60000,
    maxRequests: 30
  },
  API_READ: {
    windowMs: 60000,
    maxRequests: 100
  },
  AUTH: {
    windowMs: 900000, // 15 phút
    maxRequests: 5
  }
}
```

#### Features:
- In-memory store (production: dùng Redis)
- Auto cleanup expired entries
- Rate limit headers: X-RateLimit-*
- Per-user và per-IP tracking

---

### 5. **Security Enhancements** (`src/lib/security.ts`)

#### Validation Functions:

**validateModelName(model)**
- Whitelist allowed models
- Prevent injection attacks

**isValidUUID(uuid)**
- Validate format trước khi query DB
- Prevent SQL injection

**detectSuspiciousPatterns(input)**
- SQL injection patterns
- Path traversal (../)
- Script injection (<script>, onerror=)

**validateFileUpload(file)**
- Max 10MB
- MIME type check
- Extension verification

**logSecurityEvent(params)**
- Log suspicious activities
- Severity levels: low, medium, high, critical
- Track userId, IP, details

---

### 6. **API Endpoints**

#### User APIs:
**GET /api/user/quota**
- Hiển thị quota, usage, tier info
- Shows allowed models
- Monthly cost tracking

#### Admin APIs:
**PATCH /api/admin/users/[id]/tier**
- Update user pricing tier
- Set subscription dates

**GET /api/admin/usage-stats**
- System-wide statistics
- Date range filtering
- Model usage breakdown

**GET/POST /api/admin/evaluation-criteria**
- Manage công văn 5512 criteria
- CRUD operations for criteria

**GET/PATCH/DELETE /api/admin/evaluation-criteria/[id]**
- Single criteria operations

---

### 7. **Updated Parse & Review APIs**

#### Parse API (`/api/lesson-plans/[id]/parse`)
**Bảo mật:**
✅ Rate limiting (5 requests/phút)
✅ Quota checking
✅ Model validation
✅ UUID validation
✅ Security logging

**Flow:**
1. Auth check
2. Rate limit check
3. UUID validation
4. Model validation
5. Quota check
6. Model permission check
7. Parse DOCX
8. Log usage
9. Increment counter

#### Review API (`/api/lesson-plans/[id]/review`)
**Giống Parse + thêm:**
✅ RuleSetId validation
✅ Token counting per section
✅ Total cost calculation
✅ Success/failure logging

---

### 8. **Error Handling**

**Quota Exceeded:**
```json
{
  "success": false,
  "message": "Bạn đã hết quota (3 giáo án). Vui lòng nâng cấp.",
  "quota": {
    "used": 3,
    "total": 3,
    "remaining": 0
  }
}
```

**Rate Limited:**
```json
{
  "success": false,
  "message": "Quá nhiều request. Vui lòng thử lại sau.",
  "retryAfter": 45
}
```
Headers: `Retry-After`, `X-RateLimit-*`

**Invalid Model:**
```json
{
  "success": false,
  "message": "Model không khả dụng cho gói FREE. Vui lòng nâng cấp."
}
```

---

## 📊 Usage Flow

```
User makes request
    ↓
Rate limit check → [429 if exceeded]
    ↓
Auth check → [401 if not logged in]
    ↓
Input validation → [400 if invalid]
    ↓
Quota check → [403 if exhausted]
    ↓
Model permission check → [403 if not allowed]
    ↓
Process request (parse/review)
    ↓
Calculate tokens & cost
    ↓
Log usage to UsageLog
    ↓
Increment monthlyReviewsUsed
    ↓
Return response with rate limit headers
```

---

## 🔐 Security Measures

### Input Validation:
- ✅ UUID format validation
- ✅ Model name whitelist
- ✅ Request body sanitization
- ✅ File type/size validation

### Rate Limiting:
- ✅ Per-user limits
- ✅ Per-IP fallback
- ✅ Separate limits for AI ops vs normal API

### Logging:
- ✅ All AI operations logged
- ✅ Security events tracked
- ✅ Failed attempts recorded
- ✅ IP addresses logged

### Attack Prevention:
- ✅ SQL injection detection
- ✅ Path traversal blocking
- ✅ XSS prevention
- ✅ CSRF token (via NextAuth)

---

## 🚀 Next Steps (Recommended)

### Immediate:
1. **Fix TypeScript errors** in old code:
   - `Annotation` model fields (lessonPlanId, ruleCode)
   - `ReviewResult.versionNumber` field
   - Enum mismatches (AI_SUGGESTION → SUGGESTION)

2. **Add Redis** for production rate limiting
   - Current in-memory store won't scale
   - Use `@upstash/redis` or `ioredis`

3. **Frontend integration**:
   - Show quota in user dashboard
   - Display cost estimates before review
   - Upgrade prompts when quota exhausted

### Short-term:
4. **Payment integration**:
   - Stripe/VNPay for subscription
   - Auto-upgrade on payment
   - Invoice generation

5. **Admin dashboard**:
   - Usage statistics visualization
   - User tier management UI
   - Cost tracking charts

6. **Monitoring**:
   - Sentry for error tracking
   - Logging service (Logtail, LogRocket)
   - Alert on suspicious activities

### Long-term:
7. **Optimization**:
   - Cache review results
   - Batch operations discount
   - Usage-based pricing tiers

8. **Advanced features**:
   - API access for UNLIMITED tier
   - Webhook notifications
   - Custom evaluation criteria per user

---

## 📝 Configuration Notes

### Environment Variables:
```env
GEMINI_API_KEY=your_key_here
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
```

### Admin Actions:
```typescript
// Set user tier
await prisma.user.update({
  where: { id: userId },
  data: {
    pricingTier: "PREMIUM",
    subscriptionStartDate: new Date(),
    subscriptionEndDate: addMonths(new Date(), 1),
  }
})

// Reset usage (manual)
await prisma.user.update({
  where: { id: userId },
  data: {
    monthlyReviewsUsed: 0,
    lastResetDate: new Date(),
  }
})
```

---

## 🐛 Known Issues

1. **TypeScript errors**: Một số old code chưa update schema
2. **In-memory rate limit**: Không persistent, restart mất data
3. **No payment gateway**: Chỉ manual tier assignment
4. **Cost estimation**: Approximate, không exact từ Gemini API
5. **No email notifications**: Khi hết quota hoặc subscription expires

---

## 💰 Cost Analysis

### Example: User dùng gói BASIC (99k/tháng, 20 reviews)

**Scenario 1: Giáo án nhỏ (500 từ) với Flash**
- Input: ~2,670 tokens
- Output: ~4,000 tokens
- Cost: ~$0.0014 = ~34 đ/review
- 20 reviews = 680 đ AI cost
- Profit: 99,000 - 680 = ~98,320 đ

**Scenario 2: Giáo án lớn (2000 từ) với Pro**
- Input: ~4,667 tokens
- Output: ~4,000 tokens
- Cost: ~$0.0258 = ~620 đ/review
- 20 reviews = 12,400 đ AI cost
- Profit: 99,000 - 12,400 = ~86,600 đ

**Margin rất tốt** với mô hình hiện tại! 🎉

---

## ✨ Summary

**Đã implement:**
- ✅ 4 pricing tiers với quota riêng
- ✅ Usage tracking và cost calculation
- ✅ Rate limiting cho API security
- ✅ Input validation và attack prevention
- ✅ Evaluation criteria system
- ✅ Admin management APIs
- ✅ Security logging

**Production-ready với:**
- Redis for rate limiting
- Payment gateway integration
- Fix TypeScript errors
- Frontend UI updates
- Monitoring setup

**Estimated effort**: ~15 giờ implementation + 10 giờ testing/polish
