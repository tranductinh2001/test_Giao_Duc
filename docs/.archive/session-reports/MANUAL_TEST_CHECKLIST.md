# 🧪 MANUAL TEST CHECKLIST

Đây là checklist cho các test cases cần chạy thủ công trong browser để verify toàn bộ hệ thống.

---

## 🚀 BEFORE TESTING

### 1. Start Development Server
```bash
npm run dev
```

### 2. Check Database Connection
```bash
# Verify Prisma can connect
npx prisma db pull
```

### 3. Seed Test Data (if needed)
- Tạo 1 ADMIN account
- Tạo 2-3 LEARNER accounts
- Tạo categories với questions
- Tạo exams
- Tạo licenses

---

## ✅ TEST CASES TO RUN

### 🔐 A. AUTHENTICATION FLOW

#### A1. Landing Page → Login → Dashboard
- [ ] Mở `/` khi chưa đăng nhập → Hiển thị landing page
- [ ] Click "Đăng nhập" → Chuyển đến `/login`
- [ ] Đăng nhập với LEARNER account → Redirect `/dashboard`
- [ ] Đăng xuất → Quay về landing page
- [ ] Đăng nhập lại với ADMIN account → Redirect `/admin`

#### A2. Direct Access When Logged In
- [ ] Đăng nhập xong, paste `/` vào URL → Auto redirect về dashboard
- [ ] Paste `/login` khi đã đăng nhập → Redirect về dashboard

**Expected:** Landing page chỉ hiện cho non-authenticated users

---

### 🏠 B. LEARNER DASHBOARD

#### B1. Gamification Display
- [ ] Header hiển thị: Level, XP progress bar, Streak 🔥
- [ ] XP progress bar animation smooth
- [ ] Streak counter hiển thị đúng

#### B2. Stats Cards
- [ ] 5 cards hiển thị: Lần làm bài, Điểm cao nhất, Điểm TB, Bookmark, Câu thành thạo
- [ ] Data load đúng (số liệu hợp lý)

#### B3. Quick Actions
- [ ] Button "Trung tâm thi thử" → `/dashboard/exams`
- [ ] Button "Luyện tập" → `/practice`
- [ ] Button "Báo cáo năng lực" → `/dashboard/insights`

#### B4. Support Section
- [ ] Section "Hỗ trợ & Hướng dẫn" hiển thị
- [ ] 3 buttons: Chat, Hướng dẫn, FAQ
- [ ] Email & Hotline hiển thị

#### B5. Badge Display
- [ ] Nếu user có badges → Hiển thị grid badges với custom icons
- [ ] Badges có màu sắc đúng (theo BADGES config)

#### B6. License Card
- [ ] Card "Kích hoạt License" hiển thị
- [ ] Status badge: "Đã kích hoạt" (green) hoặc "Chưa mở khóa" (amber)
- [ ] Expiry date hiển thị đúng (nếu có)

**Expected:** UI professional, data accurate

---

### 🎯 C. EXAM ROOM

#### C1. Start Exam
- [ ] Vào `/dashboard/exams`
- [ ] Click "Bắt đầu thi" trên 1 exam
- [ ] Loading → Chuyển đến phòng thi `/exam/[id]`
- [ ] Timer bắt đầu chạy ngược

#### C2. UI Elements
- [ ] Header: Level/XP, Timer (màu trắng)
- [ ] Timer < 5 phút → Chuyển màu vàng
- [ ] Timer < 1 phút → Chuyển màu đỏ
- [ ] Progress bar hiển thị % hoàn thành
- [ ] Navigation grid: màu phân biệt (chưa làm/đã làm/bookmark)
- [ ] Nút "Thoát phòng thi" góc trên

#### C3. Answer Questions
- [ ] Click vào choice → Highlight với animation
- [ ] Click "Câu trước"/"Câu sau" → Navigation hoạt động
- [ ] Click vào số câu trong grid → Jump đến câu đó

#### C4. Bookmark
- [ ] Click bookmark icon → Toggle bookmark
- [ ] Câu bookmark có icon sao vàng
- [ ] Grid hiển thị bookmark với màu vàng

#### C5. Keyboard Shortcuts
- [ ] Press `A` → Chọn đáp án A
- [ ] Press `B` → Chọn đáp án B
- [ ] Press `C` → Chọn đáp án C
- [ ] Press `D` → Chọn đáp án D
- [ ] Press `Arrow Left` → Câu trước
- [ ] Press `Arrow Right` → Câu sau
- [ ] Press `Space` → Toggle bookmark
- [ ] Press `Ctrl+Enter` → Hiện confirm dialog submit

#### C6. Exit Button
- [ ] Click "Thoát phòng thi" → Confirm dialog
- [ ] Click "Hủy" → Ở lại phòng thi
- [ ] Click "Thoát" → Quay về `/dashboard/exams`

#### C7. Auto-Save (Check Network Tab)
- [ ] Làm vài câu
- [ ] Mở DevTools → Network tab
- [ ] Đợi 30s → Thấy POST request đến `/api/attempts/[id]/save`
- [ ] Request status 200 OK
- [ ] Không có toast notification (silent save)

#### C8. Submit
- [ ] Click "Nộp bài" → Confirm dialog
- [ ] Dialog hiện số câu đã trả lời (X/Y)
- [ ] Click "Nộp bài" → Chuyển đến result page
- [ ] Không thể submit 2 lần (button disabled khi submitting)

#### C9. Time Expired Auto-Submit
- [ ] Đợi timer về 0:00
- [ ] Tự động submit (không cần click)
- [ ] Chuyển đến result page
- [ ] Result hiển thị badge "Nộp quá giờ"

**Expected:** Smooth UX, no crashes, auto-save silent

---

### 🏆 D. RESULT PAGE

#### D1. Score Display
- [ ] Circular progress bar animation
- [ ] Điểm số hiển thị to, rõ ràng
- [ ] Status: "🎉 Đạt yêu cầu" (≥50đ) hoặc "❌ Chưa đạt" (<50đ)
- [ ] Màu xanh (pass) hoặc đỏ (fail)

#### D2. Stats
- [ ] 3 stats: Điểm số, Đúng, Sai
- [ ] Số liệu chính xác

#### D3. Category Analysis
- [ ] Section "Phân tích theo chuyên đề"
- [ ] Progress bars cho mỗi category
- [ ] Màu: xanh (≥80%), vàng (60-80%), đỏ (<60%)
- [ ] Accuracy % chính xác

#### D4. Recommendations
- [ ] Section "Lời khuyên cho bạn"
- [ ] Có gợi ý các chuyên đề cần ôn

#### D5. Gamification Award (Check Dashboard After)
- [ ] Làm xong bài thi
- [ ] Quay về `/dashboard`
- [ ] XP tăng (check số XP mới)
- [ ] Level tăng (nếu đủ XP)
- [ ] Streak update (nếu là ngày mới)
- [ ] Badge mới unlock (nếu đủ điều kiện)

#### D6. View Detailed Answers
- [ ] Click "Xem đáp án chi tiết"
- [ ] Hiển thị từng câu hỏi
- [ ] Câu đúng: highlight xanh
- [ ] Câu sai: highlight đỏ, hiển thị đáp án đúng
- [ ] Giải thích hiển thị (nếu có)

**Expected:** Professional result page, accurate data, gamification works

---

### 📝 E. PRACTICE MODE

#### E1. Start Practice
- [ ] Click "Luyện tập" từ dashboard
- [ ] Loading → Load 10 câu random
- [ ] Không có timer
- [ ] UI đơn giản hơn exam room

#### E2. Answer Flow
- [ ] Chọn đáp án → Click "Kiểm tra đáp án"
- [ ] Hiển thị đúng/sai ngay lập tức
- [ ] Đúng: background xanh, icon ✓
- [ ] Sai: background đỏ, icon ✗, hiển thị đáp án đúng
- [ ] Giải thích hiển thị (nếu có)

#### E3. Navigation
- [ ] Sau khi check → Button "Câu tiếp theo"
- [ ] Nếu chưa trả lời → Button "Bỏ qua"
- [ ] Câu cuối cùng → Alert điểm → Redirect `/dashboard`

#### E4. Smart Algorithm (Multi-session Test)
- [ ] Session 1: Làm practice, cố ý trả lời sai 3 câu cụ thể
- [ ] Session 2: Làm practice lại
- [ ] Verify: 3 câu sai xuất hiện lại với xác suất cao hơn

**Expected:** Instant feedback, no timer, smart questions

---

### 💳 F. LICENSE ACTIVATION

#### F1. Valid License
- [ ] Vào dashboard
- [ ] Card "Kích hoạt License"
- [ ] Nhập valid license code (tạo từ admin panel)
- [ ] Click "Kích hoạt tài khoản"
- [ ] Success message green
- [ ] Expiry date update
- [ ] Refresh page → Status badge = "Đã kích hoạt"

#### F2. Invalid License
- [ ] Nhập code "INVALID123"
- [ ] Click activate
- [ ] Error message: "Không tìm thấy mã license."
- [ ] Status không đổi

#### F3. Already Used License
- [ ] User A activate code "ABC123"
- [ ] User B (account khác) activate cùng code "ABC123"
- [ ] Error message: "Mã license này đã được sử dụng."

#### F4. Extend License
- [ ] User có license expires 2026-07-01
- [ ] Activate thêm license 30 ngày
- [ ] New expiry = 2026-07-31 (extend, không replace)

**Expected:** Validation works, error messages clear

---

### 🔐 G. AUTHORIZATION

#### G1. Learner Access Admin Route
- [ ] Login as LEARNER
- [ ] Paste `/admin` vào URL
- [ ] Expected: Redirect `/dashboard` hoặc 403 error
- [ ] Không được truy cập admin panel

#### G2. Access Other User's Attempt
- [ ] User A tạo attemptId = "abc123"
- [ ] User B login
- [ ] User B gọi API: `GET /api/attempts/abc123/submit`
- [ ] Expected: 403 Forbidden

**Expected:** Proper authorization, no data leak

---

### 📱 H. MOBILE RESPONSIVE

#### H1. Mobile Navigation
- [ ] Mở dashboard trên mobile (hoặc resize browser < 1024px)
- [ ] Thấy floating menu button (bottom-right)
- [ ] Click menu button → Bottom sheet slide up
- [ ] Backdrop overlay hiển thị
- [ ] User info hiển thị
- [ ] Navigation links theo role (ADMIN/LEARNER)
- [ ] Click "Đăng xuất" → Logout

#### H2. Exam Room on Mobile
- [ ] Start exam trên mobile
- [ ] UI responsive
- [ ] Navigation grid không bị overflow
- [ ] Timer hiển thị rõ ràng
- [ ] Choices không bị tràn
- [ ] Scroll smooth

#### H3. Different Screen Sizes
- [ ] iPhone SE (375px): Kiểm tra dashboard, exam room
- [ ] iPad (768px): Kiểm tra tất cả pages
- [ ] Desktop (1920px): Kiểm tra tất cả pages

**Expected:** Responsive trên mọi device

---

### ⚠️ I. ERROR HANDLING

#### I1. Network Error During Exam
- [ ] Bắt đầu thi
- [ ] Mở DevTools → Network → Throttling → Offline
- [ ] Chọn đáp án
- [ ] Expected: Auto-save fail silent (không crash)
- [ ] Bật lại network → Submit thành công

#### I2. Invalid Exam ID
- [ ] Paste URL `/exam/invalid-id-123`
- [ ] Expected: Error message "Không tìm thấy đề thi"
- [ ] Không crash app

#### I3. Expired Session
- [ ] Đăng nhập
- [ ] DevTools → Application → Cookies → Delete session cookie
- [ ] Refresh page
- [ ] Expected: Redirect `/login`

**Expected:** Graceful error handling, no crashes

---

## 📊 TEST RESULTS TRACKING

| Test Suite | Status | Pass | Fail | Notes |
|------------|--------|------|------|-------|
| A. Auth Flow | ⏳ | 0 | 0 | |
| B. Dashboard | ⏳ | 0 | 0 | |
| C. Exam Room | ⏳ | 0 | 0 | |
| D. Result Page | ⏳ | 0 | 0 | |
| E. Practice Mode | ⏳ | 0 | 0 | |
| F. License | ⏳ | 0 | 0 | |
| G. Authorization | ⏳ | 0 | 0 | |
| H. Mobile | ⏳ | 0 | 0 | |
| I. Error Handling | ⏳ | 0 | 0 | |

Status: ⏳ Pending | ✅ Passed | ❌ Failed | ⚠️ Partial

---

## 🐛 BUGS FOUND

| # | Test Case | Description | Severity | Status |
|---|-----------|-------------|----------|--------|
| - | - | - | - | - |

Severity: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## ✅ SIGN-OFF

- [ ] All critical tests passed
- [ ] No major bugs found
- [ ] Performance acceptable
- [ ] UI/UX smooth
- [ ] Ready for production

**Tested by:** _________________  
**Date:** _________________  
**Build:** _________________
