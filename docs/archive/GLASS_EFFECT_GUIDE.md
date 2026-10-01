# Glass Effect Implementation Guide

## Hướng Dẫn Áp Dụng Glass Effect Để Theme Background Hiển Thị

Tài liệu này mô tả cách fix TUYỆT ĐỐI để theme background không bị che bởi các cards/panels.

---

## ✅ **Đã Hoàn Thành: Admin Dashboard (`/admin/page.tsx`)**

### Các thay đổi đã áp dụng:

#### 1. **Container chính:**
```tsx
// ❌ TRƯỚC (che background):
<div className="min-h-screen bg-background p-4 lg:p-8">

// ✅ SAU (hiển thị background):
<div className="min-h-screen p-4 lg:p-8" style={{ background: 'transparent' }}>
```

#### 2. **Tất cả cards/panels:**
```tsx
// ❌ TRƯỚC:
<div className="bg-card border border-border rounded-xl p-6 shadow-subtle">

// ✅ SAU:
<div
  className="border border-border rounded-xl p-6 shadow-subtle"
  style={{
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)'
  }}
>
```

#### 3. **Stats cards:**
```tsx
// ❌ TRƯỚC:
<Link className="bg-card border ...">

// ✅ SAU:
<Link
  className="border ..."
  style={{
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation'
  }}
>
```

#### 4. **Quick action cards:**
```tsx
// ❌ TRƯỚC:
<div className="bg-card border ...">

// ✅ SAU:
<div
  className="border ..."
  style={{
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)'
  }}
>
```

#### 5. **Small action buttons:**
```tsx
// ❌ TRƯỚC:
<Link className="... bg-accent/50 ...">

// ✅ SAU:
<Link
  className="... border ..."
  style={{
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)'
  }}
>
```

---

## 📋 **Pattern Cần Áp Dụng Cho TẤT CẢ Trang**

### **Nguyên tắc:**
1. **XÓA tất cả class:** `bg-background`, `bg-card`, `bg-white`, `bg-accent`
2. **SET container chính:** `style={{ background: 'transparent' }}`
3. **THÊM inline style cho cards:**
   ```tsx
   style={{
     backgroundColor: 'rgba(255, 255, 255, 0.85)',
     backdropFilter: 'blur(10px)',
     WebkitBackdropFilter: 'blur(10px)'
   }}
   ```

### **Độ trong suốt khuyến nghị:**
- **Main cards/panels:** `0.85` (85% opacity)
- **Nested/small cards:** `0.75` (75% opacity)
- **Hover overlays:** `0.90` (90% opacity)

---

## 🎯 **Danh Sách Pages Cần Fix**

### **Admin Pages (12 trang):**
- [x] `/admin/page.tsx` - ✅ HOÀN THÀNH
- [ ] `/admin/users/page.tsx`
- [ ] `/admin/exams/page.tsx`
- [ ] `/admin/questions/page.tsx`
- [ ] `/admin/questions/import/page.tsx`
- [ ] `/admin/categories/page.tsx`
- [ ] `/admin/licenses/page.tsx`
- [ ] `/admin/feedback/page.tsx`
- [ ] `/admin/recruitment/page.tsx`
- [ ] `/admin/settings/page.tsx`
- [ ] `/admin/lesson-plans/page.tsx`
- [ ] `/admin/section-rules/page.tsx`

### **Dashboard Pages (6 trang):**
- [ ] `/dashboard/page.tsx`
- [ ] `/dashboard/exams/page.tsx`
- [ ] `/dashboard/exams/custom/page.tsx`
- [ ] `/dashboard/exams/history/page.tsx`
- [ ] `/dashboard/exams/review/[attemptId]/page.tsx`
- [ ] `/dashboard/insights/page.tsx`

### **Auth Pages (2 trang):**
- [ ] `/(auth)/login/page.tsx`
- [ ] `/(auth)/register/page.tsx`

### **Exam Pages (1 trang):**
- [ ] `/exam/[id]/page.tsx`

### **Other Pages:**
- [ ] `/profile/page.tsx`
- [ ] Landing page (nếu có)

---

## 🔍 **Cách Tìm và Thay Thế**

### **Bước 1: Tìm các class cần fix**
```bash
grep -r "bg-background" src/app/
grep -r "bg-card" src/app/
grep -r "bg-white" src/app/
grep -r "bg-accent" src/app/
```

### **Bước 2: Pattern thay thế**

#### **Container chính:**
```tsx
// Tìm:
className="min-h-screen bg-background"

// Thay bằng:
className="min-h-screen" style={{ background: 'transparent' }}
```

#### **Cards/Panels:**
```tsx
// Tìm:
className="bg-card border border-border rounded-xl p-6"

// Thay bằng:
className="border border-border rounded-xl p-6"
style={{
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)'
}}
```

#### **Links với background:**
```tsx
// Tìm:
className="... bg-card ..."

// Thay bằng:
className="... border ..."
style={{
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)'
}}
```

---

## ✨ **Kết Quả Mong Đợi**

Sau khi áp dụng:
- ✅ Theme background (solid/gradient/mesh/pattern) **HIỂN THỊ RÕ RÀNG** phía sau tất cả cards
- ✅ Glass effect (blur 10px) trên tất cả UI elements
- ✅ Text vẫn đọc rõ với background semi-transparent
- ✅ Smooth transitions 0.6s khi thay đổi theme
- ✅ Consistent design across toàn bộ website

---

## 🧪 **Test Checklist**

Sau khi fix từng trang, test:
1. Mở trang đã fix
2. Settings → Background → Chọn Gradient (Purple #9333ea → Pink #ec4899)
3. Click "Hoàn tất"
4. **Verify:** Gradient purple→pink hiển thị rõ ràng phía sau TẤT CẢ cards
5. **Verify:** Glass effect (blur) visible trên cards
6. **Verify:** Text readable và có contrast tốt

---

## 📝 **Notes**

- **Không dùng Tailwind class** `bg-*` cho cards (sẽ che background)
- **Phải dùng inline style** với rgba + backdrop-filter
- **WebkitBackdropFilter** cần thiết cho Safari
- **Opacity 0.85** là best balance giữa visibility và readability
- **Border giữ lại** để cards vẫn có definition

---

## 🚀 **Next Steps**

Khi user nói "hoàn thiện", áp dụng pattern này cho **TẤT CẢ 21 trang** còn lại theo danh sách trên.
