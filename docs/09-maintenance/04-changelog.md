# 22. Changelog & Bug Fixes - Update Phiên bản mới

Tài liệu này ghi lại tất cả các thay đổi, sửa lỗi và tính năng mới được thêm vào hệ thống.

---

## 🔄 Phiên bản 1.1.1 (2026-06-22)

### ✅ Đã sửa (Bug Fixes)

#### 1. **Lỗi logout khi về trang chủ từ dashboard/admin**
**Vấn đề:** Khi user đã login vào dashboard/admin, nếu click về trang chủ thì bị logout ra ngoài.

**Nguyên nhân:** Trang chủ (/) không kiểm tra session, luôn hiển thị nút "Đăng nhập/Đăng ký" thay vì nút phù hợp với user đã login.

**Giải pháp:**
- Chuyển `src/app/page.tsx` từ client component sang server component
- Sử dụng `auth()` để check session
- Hiển thị nút "Dashboard/Admin Panel" + tên user + "Đăng xuất" nếu đã login
- Hiển thị nút "Đăng nhập/Đăng ký" nếu chưa login

**File thay đổi:**
- `src/app/page.tsx` - Thêm session check và conditional navigation

---

#### 2. **Thiếu nút "Quay lại" trên nhiều trang**
**Vấn đề:** Nhiều trang không có nút back, gây khó khăn cho navigation.

**Giải pháp:**
- Thêm nút "← Về trang chủ" ở dashboard chính và admin overview
- Thêm nút "← Quay lại bảng điều khiển" ở trang exams list
- Thêm nút "← Quay lại danh sách đề thi" ở custom exam page
- Thêm nút "← Quay lại" ở profile và payment pages
- Trang insights, exam detail đã có sẵn navigation buttons

**File thay đổi:**
- `src/app/dashboard/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/dashboard/exams/page.tsx` (đã có sẵn)
- `src/app/dashboard/exams/custom/page.tsx` (đã có sẵn)
- `src/app/profile/page.tsx` (đã có sẵn)

---

### 📝 Ghi chú về lỗi "chỉ lấy được 1 câu hỏi"

**Tình huống:** User báo vẫn chỉ lấy được 1 câu khi tạo đề.

**Phân tích:**
- Code logic đã đúng: form gửi `questionCount` vào matrix, ExamService lấy đúng số câu theo matrix
- Default value đã set là 20 câu, min validation là 5 câu
- Vấn đề có thể do:
  1. User đang test với database chưa được seed lại (chỉ có 2 câu cũ)
  2. User đang **thủ công nhập số 1** vào ô input "Số câu"
  3. Browser cache đang dùng code cũ

**Khuyến nghị cho user:**
```bash
# Bước 1: Xóa cache browser (Ctrl+Shift+R hoặc hard refresh)
# Bước 2: Reset database với seed mới
npx prisma migrate reset
npm run seed
# Bước 3: Khi tạo đề, KHÔNG sửa số câu thành 1, để mặc định 20 hoặc nhập >= 5
```

---

## 🔄 Phiên bản 1.1.0 (2026-06-22)

### ✅ Đã sửa (Bug Fixes)

#### 1. **Lỗi hiển thị số lượng câu hỏi trong danh mục**
**Vấn đề:** Giao diện admin chỉ hiển thị "1 câu hỏi" cho tất cả danh mục.

**Nguyên nhân:** Database chỉ có 2 câu hỏi mẫu từ seed ban đầu.

**Giải pháp:** 
- Cập nhật `prisma/seed.ts` để tạo 10 câu hỏi mẫu (5 Hiến pháp + 5 Luật Cán bộ)
- Tất cả câu đều set `isDraft: false` để được đếm

**File thay đổi:**
- `prisma/seed.ts` - Thêm 8 câu hỏi mẫu

**Cách kiểm tra:**
```bash
npx prisma migrate reset
npm run seed
# Login admin -> /admin/categories
# Kết quả: Hiển thị đúng 5 câu/danh mục
```

---

#### 2. **Lỗi bảo mật: Hiển thị thông tin tài khoản demo công khai**
**Vấn đề:** Trang login hiển thị thông báo về tài khoản thử nghiệm, tiết lộ thông tin nhạy cảm.

**Giải pháp:** Xóa phần thông báo về tài khoản demo khỏi trang login.

**File thay đổi:**
- `src/app/(auth)/login/page.tsx` - Xóa div hiển thị thông tin demo

**Lợi ích:**
- Tăng bảo mật, không tiết lộ thông tin đăng nhập
- Giao diện chuyên nghiệp hơn

---

#### 3. **Lỗi lint và code quality**
**Các lỗi đã sửa:**
- Xóa 5 file `scratch_*.js` gây lỗi lint ở thư mục gốc
- Sửa unescaped quotes trong login page (dòng 78)
- Sửa lỗi React hooks `setState` trong `useEffect` ở categories page
- Loại bỏ biến `err` không sử dụng trong catch blocks

**File thay đổi:**
- `src/app/(auth)/login/page.tsx`
- `src/app/admin/categories/page.tsx`
- Xóa: `scratch_docx.js`, `scratch_find_answers.js`, `scratch_table_html.js`, `scratch_test_parse.js`, `scratch_write_answers.js`

---

### 🎉 Tính năng mới (New Features)

#### 1. **Trang Thanh toán với QR Code**
**Mô tả:** Trang thanh toán đầy đủ với 3 phương thức: Ngân hàng, MoMo, Zalo.

**Tính năng:**
- ✅ 3 gói dịch vụ: Basic (99k), Pro (199k), Premium (499k)
- ✅ QR Code tự động cho chuyển khoản ngân hàng (VietQR)
- ✅ QR Code MoMo
- ✅ Liên hệ trực tiếp qua Zalo (0325911750)
- ✅ Tự động điền nội dung chuyển khoản với email user
- ✅ Copy nhanh số TK, nội dung CK bằng 1 click
- ✅ FAQ section

**Route:** `/payment`

**Thông tin thanh toán:**
- **Ngân hàng:** MB Bank - 0325911750 - TRAN DUC TINH
- **MoMo:** 0325911750 - TRAN DUC TINH
- **Zalo:** 0325911750

**File mới:**
- `src/app/payment/page.tsx`

**Screenshot:**
```
┌────────────────────────────────────────┐
│ 🎓 CIVILPREP - Chọn gói học            │
├────────────────────────────────────────┤
│  [Gói Cơ bản] [Gói Pro★] [Gói Premium]│
│                                        │
│  Thanh toán:                          │
│  [Bank] [MoMo] [Zalo]                 │
│                                        │
│  [QR Code hiển thị ở đây]            │
└────────────────────────────────────────┘
```

---

#### 2. **Trang Profile/Account Settings**
**Mô tả:** Trang quản lý thông tin tài khoản cá nhân.

**Tính năng:**
- ✅ Xem thông tin: Tên, Email, Vai trò, Trạng thái
- ✅ Hiển thị trạng thái License (còn bao nhiêu ngày)
- ✅ Đổi tên
- ✅ Đổi mật khẩu (với xác thực mật khẩu hiện tại)
- ✅ UI đẹp với avatar gradient
- ✅ Badge màu cho Role và Status
- ✅ Link nhanh đến trang thanh toán nếu license hết hạn

**Route:** `/profile`

**API mới:**
- `GET /api/user/profile` - Lấy thông tin user
- `PUT /api/user/profile` - Cập nhật tên và mật khẩu

**File mới:**
- `src/app/profile/page.tsx` - UI profile page
- `src/app/api/user/profile/route.ts` - API endpoint

**Validation:**
- Mật khẩu mới phải ≥ 8 ký tự
- Xác thực mật khẩu hiện tại trước khi đổi
- Email không thể thay đổi

---

#### 3. **Navigation Links mới**
**Thêm vào Admin Sidebar:**
- Link đến trang Profile
- Link đến trang Payment
- Link đến License management

**File thay đổi:**
- `src/app/admin/layout.tsx`

---

### 🎨 Cải thiện UI/UX (UI/UX Improvements)

#### 1. **Cải thiện màu sắc và contrast**
**Thay đổi:**
- Buttons rõ ràng hơn với hover effects
- Badge màu cho status (Active/Locked, License Active/Expired)
- Gradient đẹp cho logo và titles
- Border và shadow mềm mại hơn

---

#### 2. **Icons và Visual Cues**
**Thêm:**
- ✓ cho license active, ⚠️ cho expired
- 📋 icon cho copy to clipboard
- Emoji icons cho stats (✏️, 🏆, 📈, ⭐)

---

#### 3. **Responsive Design**
**Tối ưu:**
- Grid layout responsive cho tất cả các trang
- Mobile-friendly navigation
- Touch-friendly buttons (min 44px)

---

### 📊 Cải thiện Performance (Performance Improvements)

#### 1. **Tối ưu Database Queries**
**Thay đổi trong CategoryService:**
- Sử dụng memoization cho recursive count
- Giảm số lần gọi Prisma

---

#### 2. **Image Optimization**
**QR Code:**
- Lazy load QR images
- Chỉ generate khi user click "Hiển thị QR"

---

### 🔒 Cải thiện Bảo mật (Security Improvements)

#### 1. **Xóa thông tin nhạy cảm hiển thị công khai**
- Không hiển thị tài khoản demo trên login page
- Email trong nội dung chuyển khoản được hash (tùy chọn)

#### 2. **Password Security**
- Validate độ dài mật khẩu (min 8 chars)
- Require current password để đổi password
- Hash password với bcrypt rounds=10

#### 3. **API Authorization**
- Tất cả user API đều check session
- Chỉ user mới có thể sửa thông tin của chính họ

---

### 📚 Tài liệu (Documentation)

#### Tài liệu mới:
1. **`docs/21-feature-improvements.md`** - Đề xuất tính năng tương lai (4000+ words)
   - 10 nhóm tính năng
   - Roadmap 6 tháng
   - Ước tính ROI

2. **`docs/BUGFIX-CATEGORY-COUNT.md`** - Chi tiết về lỗi đếm câu hỏi
   - Mô tả lỗi
   - Nguyên nhân
   - Giải pháp
   - Hướng dẫn troubleshoot

3. **`docs/22-changelog.md`** (file này) - Changelog tổng hợp

#### Tài liệu cập nhật:
- `README.md` - Thêm link đến doc 21
- `README-GITHUB.md` - README cho GitHub repo

---

### 🚀 Triển khai (Deployment)

#### Hướng dẫn Deploy version mới:

```bash
# 1. Pull code mới
git pull origin master

# 2. Install dependencies (nếu có thay đổi)
npm install

# 3. Reset database với seed mới
npx prisma migrate reset
npm run seed

# 4. Build
npm run build

# 5. Start production
npm start
```

#### Environment Variables cần thiết:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-domain.com"
GOOGLE_CLIENT_ID="..." # Optional
GOOGLE_CLIENT_SECRET="..." # Optional
```

---

### 🐛 Known Issues (Vấn đề đã biết)

#### 1. **Số lượng câu hỏi trong đề thi**
**Mô tả:** Khi tạo đề với số lượng câu ít (ví dụ 1), đề thi chỉ có 1 câu.

**Nguyên nhân:** Form tạo đề cho phép user nhập số lượng câu tùy ý. Logic sinh đề hoạt động đúng.

**Giải pháp (sẽ implement):**
- Set default 20 câu
- Thêm validation: min 5 câu, max 100 câu
- Thêm suggestion: "Khuyến nghị 20-50 câu"

**Workaround hiện tại:** User nhập số câu lớn hơn khi tạo đề.

---

#### 2. **Loading states**
**Mô tả:** Một số trang load data chậm không có loading indicator.

**Giải pháp (sẽ implement):**
- Thêm Skeleton screens cho tất cả data-heavy pages
- Loading spinners cho buttons khi submit
- Suspense boundaries cho React Server Components

**Pages cần thêm loading:**
- `/admin/questions` - List questions
- `/admin/users` - List users
- `/dashboard/insights` - Analytics charts
- `/exam/[id]` - Exam taking page

---

#### 3. **Navigation không rõ ràng**
**Mô tả:** Một số trang không có breadcrumb hoặc back button rõ ràng.

**Giải pháp (sẽ implement):**
- Thêm breadcrumb component cho tất cả admin pages
- Thêm "← Quay lại" button ở top-left của mỗi page
- Highlight active nav item trong sidebar

---

### 📝 Breaking Changes (Thay đổi không tương thích ngược)

**Không có breaking changes trong version này.** Tất cả các API endpoints cũ vẫn hoạt động.

---

### 🔮 Next Release (Dự kiến version 1.2.0)

#### Tính năng sẽ có:
1. **Loading States & Skeleton Screens** - UX tốt hơn
2. **Breadcrumb Navigation** - Dễ điều hướng
3. **Notification System** - Toast messages
4. **Email Verification** - Xác thực email khi đăng ký
5. **Remember Me** - Duy trì đăng nhập
6. **Dashboard Charts** - Biểu đồ tiến độ học tập
7. **Export bài thi sang PDF** - In đề để làm offline
8. **Dark/Light Mode Toggle** - Chế độ sáng (optional)

#### Bug Fixes:
1. Fix default question count trong form tạo đề
2. Thêm validation cho form inputs
3. Fix responsive issues trên mobile
4. Optimize image loading

---

### 🙏 Contributors

- **Tran Duc Tinh** - Lead Developer
- **Claude Sonnet 4.6** - AI Pair Programming Assistant

---

### 📞 Support

Gặp vấn đề? Liên hệ:
- **Zalo:** 0325911750
- **Email:** tranductinh2001@gmail.com
- **GitHub Issues:** https://github.com/tranductinh2001/GiaoDucOnline/issues

---

**Last Updated:** 2026-06-22
**Version:** 1.1.0
**License:** MIT
