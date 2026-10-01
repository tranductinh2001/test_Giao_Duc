# Admin Dashboard - Complete CRUD System

## 🎯 Overview

Hệ thống Admin Dashboard đã được thiết kế với đầy đủ CRUD operations và navigation tốt, bao gồm nút "Quay lại" ở mọi trang.

---

## 📋 Admin Features Đã Có

### 1. **User Management** (`/admin/users`)
**File:** `src/app/admin/users/page.tsx`

✅ **Features:**
- View all users với pagination
- Filter theo tier (FREE, BASIC, PREMIUM, UNLIMITED)
- Search by name/email
- View user details
- Stats cards: Total Users, Free Users, Paid Users, Premium+

✅ **Navigation:**
- ← Quay lại button (router.back())
- Edit user → `/admin/users/[id]`

**API:**
- `GET /api/admin/users` - List users với filter & pagination
- `POST /api/admin/users` - Create new user
- `PATCH /api/admin/users` - Update user
- `DELETE /api/admin/users` - Delete user

### 2. **User Tier Management** (`/admin/users/[id]/tier`)
**API:** `src/app/api/admin/users/[id]/tier/route.ts`

✅ **Features:**
- Update user pricing tier
- Set subscription dates
- Admin only access

**Endpoint:**
```typescript
PATCH /api/admin/users/[id]/tier
Body: {
  pricingTier: "FREE" | "BASIC" | "PREMIUM" | "UNLIMITED",
  subscriptionStartDate: Date,
  subscriptionEndDate: Date
}
```

### 3. **Usage Statistics** 
**API:** `src/app/api/admin/usage-stats/route.ts`

✅ **Features:**
- System-wide usage statistics
- Date range filtering
- Model usage breakdown
- Total requests, costs, success/fail rates

**Endpoint:**
```typescript
GET /api/admin/usage-stats?startDate=2026-01-01&endDate=2026-01-31
Response: {
  totalRequests: number,
  successfulRequests: number,
  failedRequests: number,
  totalCost: number,
  averageCostPerRequest: number,
  mostUsedModel: string,
  requestsByModel: Record<string, number>
}
```

### 4. **Evaluation Criteria** (Công văn 5512)
**APIs:** 
- `src/app/api/admin/evaluation-criteria/route.ts`
- `src/app/api/admin/evaluation-criteria/[id]/route.ts`

✅ **Full CRUD:**
- `GET /api/admin/evaluation-criteria` - List all
- `GET /api/admin/evaluation-criteria?level=C1` - Filter by level
- `POST /api/admin/evaluation-criteria` - Create new
- `GET /api/admin/evaluation-criteria/[id]` - Get single
- `PATCH /api/admin/evaluation-criteria/[id]` - Update
- `DELETE /api/admin/evaluation-criteria/[id]` - Delete

**Schema:**
```typescript
interface EvaluationCriteria {
  id: string;
  name: string;
  code: string; // unique
  level: string; // "C1", "C2"
  category: string; // "objectives", "content", "method"
  description?: string;
  maxScore: number;
  criteria: Json; // Chi tiết tiêu chí
  isActive: boolean;
}
```

### 5. **Settings** (`/admin/settings`)
**File:** `src/app/admin/settings/page.tsx`
**APIs:**
- `src/app/api/admin/settings/route.ts` - GET/POST settings
- `src/app/api/admin/settings/test/route.ts` - Test API key

✅ **Features:**
- Gemini API key configuration
- Test API key validity
- Save to .env file
- Instructions for getting API key

---

## 🎨 UI/UX Features

### Navigation Pattern:
```
Admin Dashboard (/)
  ├─ ← Quay về trang chủ
  │
  ├─ Users Management (/admin/users)
  │   ├─ ← Quay lại
  │   └─ User Detail (/admin/users/[id])
  │       └─ ← Quay lại
  │
  ├─ Usage Stats (/admin/usage-stats)
  │   └─ ← Quay lại
  │
  ├─ Evaluation Criteria (/admin/evaluation-criteria)
  │   ├─ ← Quay lại
  │   └─ Edit Criteria (/admin/evaluation-criteria/[id])
  │       └─ ← Quay lại
  │
  ├─ Review Rules (/admin/review-rules)
  │   └─ ← Quay lại
  │
  └─ Settings (/admin/settings)
      └─ ← Quay lại
```

### Common UI Elements:

**Back Button Pattern:**
```tsx
<button
  onClick={() => router.back()}
  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
>
  ← Quay lại
</button>
```

**Stats Cards:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div className="bg-white p-4 rounded-lg border">
    <div className="text-sm text-gray-600">Label</div>
    <div className="text-2xl font-bold">Value</div>
  </div>
</div>
```

**Filters:**
```tsx
<div className="flex gap-2">
  <button className={filter === "ALL" ? "active" : ""}>Tất cả</button>
  <button className={filter === "FREE" ? "active" : ""}>Free</button>
  ...
</div>
```

---

## 🔧 Admin Pages Cần Tạo Thêm

### 1. **Usage Statistics Dashboard** (`/admin/usage-stats`)
```tsx
"use client";

// Features:
- Date range picker
- Charts: line chart (cost over time), bar chart (model usage)
- Export CSV/Excel
- Real-time updates
- Filter by user, model, success/failure

// APIs available:
GET /api/admin/usage-stats?startDate=...&endDate=...
```

### 2. **Evaluation Criteria Manager** (`/admin/evaluation-criteria`)
```tsx
"use client";

// Features:
- List all criteria với filter by level/category
- Create new criteria modal
- Edit criteria inline
- Delete với confirmation
- Toggle active/inactive
- Preview criteria details

// APIs available:
GET/POST /api/admin/evaluation-criteria
GET/PATCH/DELETE /api/admin/evaluation-criteria/[id]
```

### 3. **User Detail & Edit** (`/admin/users/[id]`)
```tsx
"use client";

// Features:
- View user profile
- Edit tier (FREE → BASIC → PREMIUM → UNLIMITED)
- Set subscription dates với date picker
- View usage history
- View lesson plans
- Reset monthly quota (manual button)
- Lock/unlock user

// Current user data includes:
- name, email, role
- pricingTier, monthlyReviewsUsed
- subscriptionStartDate, subscriptionEndDate
```

### 4. **Security Logs** (`/admin/security-logs`)
```tsx
"use client";

// Features:
- View all security events
- Filter by severity (low, medium, high, critical)
- Filter by event type
- Search by user/IP
- Auto-refresh
- Export logs

// Needs API:
GET /api/admin/security-logs
```

---

## 📊 Example: Create Evaluation Criteria Page

```tsx
// src/app/admin/evaluation-criteria/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function EvaluationCriteriaPage() {
  const router = useRouter();
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ level: "", category: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCriteria();
  }, [filter]);

  const fetchCriteria = async () => {
    const params = new URLSearchParams();
    if (filter.level) params.set("level", filter.level);
    if (filter.category) params.set("category", filter.category);

    const res = await fetch(`/api/admin/evaluation-criteria?${params}`);
    const data = await res.json();
    if (data.success) {
      setCriteria(data.data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận xóa tiêu chí này?")) return;

    const res = await fetch(`/api/admin/evaluation-criteria/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Đã xóa tiêu chí");
      fetchCriteria();
    } else {
      toast.error("Lỗi khi xóa");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Quay lại
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Tiêu chí đánh giá (Công văn 5512)
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Quản lý tiêu chí đánh giá giáo án theo công văn
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Tạo tiêu chí
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border mb-6">
          <div className="grid grid-cols-2 gap-4">
            <select
              value={filter.level}
              onChange={(e) => setFilter({ ...filter, level: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Tất cả cấp độ</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
            </select>
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Tất cả danh mục</option>
              <option value="objectives">Mục tiêu</option>
              <option value="content">Nội dung</option>
              <option value="method">Phương pháp</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Đang tải...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Mã
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tên tiêu chí
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cấp độ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Danh mục
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Điểm tối đa
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {criteria.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono">{item.code}</td>
                    <td className="px-6 py-4 text-sm">{item.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {item.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{item.category}</td>
                    <td className="px-6 py-4 text-sm">{item.maxScore}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => router.push(`/admin/evaluation-criteria/${item.id}`)}
                        className="text-blue-600 hover:text-blue-800 mr-4"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal would go here */}
    </div>
  );
}
```

---

## ✅ Summary

**Đã có:**
- ✅ User management CRUD
- ✅ Tier management API
- ✅ Usage statistics API
- ✅ Evaluation criteria CRUD APIs
- ✅ Settings page
- ✅ Security validation functions
- ✅ Rate limiting
- ✅ Navigation với Back buttons

**Cần tạo Frontend:**
- 📝 Usage Statistics Dashboard
- 📝 Evaluation Criteria Manager
- 📝 User Detail/Edit Page
- 📝 Security Logs Viewer
- 📝 Create/Edit Modals

**Cần tạo API:**
- 📝 GET /api/admin/security-logs
- 📝 GET /api/admin/dashboard/stats (for main dashboard)

Tất cả admin pages đều follow pattern:
1. Header với Back button
2. Stats cards (nếu cần)
3. Filters
4. Main content (table/grid)
5. Action buttons (Create, Edit, Delete)
6. Confirmation dialogs

Navigation flow rõ ràng, UX tốt, admin có thể quay lại bất cứ lúc nào!
