# 🎯 TEST PLAN - TOÀN BỘ LUỒNG HỆ THỐNG

## ✅ Build Status
- ✅ TypeScript compile: PASSED
- ✅ No ESLint errors
- ✅ No warnings
- ✅ All routes generated successfully

## 📋 Test Cases

### 1. AUTHENTICATION FLOW
**Test:** Đăng nhập & Redirect
- [ ] Truy cập `/` khi chưa đăng nhập → Hiển thị landing page
- [ ] Đăng nhập thành công → Redirect `/dashboard` (LEARNER) hoặc `/admin` (ADMIN)
- [ ] Truy cập `/` sau khi đăng nhập → Auto redirect về dashboard
- [ ] Đăng xuất → Quay về landing page

**Expected Result:**
- Landing page chỉ hiện cho người chưa đăng nhập
- Redirect đúng theo role

---

### 2. DASHBOARD (LEARNER)
**Test:** Giao diện & Gamification
- [ ] Hiển thị Level, XP progress bar, Streak 🔥
- [ ] 5 stats cards: Lần làm bài, Điểm cao nhất, Điểm TB, Bookmark, Câu thành thạo
- [ ] Quick actions: 3 buttons (Thi thử, Luyện tập, Báo cáo)
- [ ] Section "Hỗ trợ & Hướng dẫn" với 3 nút + Email/Hotline
- [ ] Hiển thị Badges (nếu có)
- [ ] License status & expiry date

**Expected Result:**
- UI hiển thị đầy đủ gamification elements
- Tất cả links hoạt động
- Data load đúng

---

### 3. PHÒNG THI (EXAM ROOM)
**Test:** UI & Features
- [ ] Nút "Thoát phòng thi" có confirm dialog
- [ ] Header: Level/XP, timer (đổi màu khi < 5 phút, < 1 phút)
- [ ] Thanh tiến trình (% hoàn thành)
- [ ] Navigation câu hỏi: màu sắc phân biệt (đã làm/chưa làm/đang làm/bookmark)
- [ ] Chọn đáp án: animation scale, glow effect
- [ ] Bookmark button hoạt động
- [ ] Auto-save mỗi 30s (check Network tab)

**Test:** Phím tắt
- [ ] A/B/C/D → Chọn đáp án
- [ ] Arrow Left/Right → Previous/Next câu
- [ ] Space → Toggle bookmark
- [ ] Ctrl+Enter → Submit bài

**Test:** Nộp bài
- [ ] Confirm dialog khi nhấn "Nộp bài"
- [ ] Auto-submit khi hết giờ
- [ ] Toast notification (nếu có lỗi)

**Expected Result:**
- UI mượt mà, responsive
- Phím tắt hoạt động
- Auto-save silent (không gián đoạn)

---

### 4. TRANG KẾT QUẢ (RESULT PAGE)
**Test:** Thống kê & Phân tích
- [ ] Circular score với animation
- [ ] 3 stats: Điểm số, Đúng, Sai
- [ ] Section "Lời khuyên cho bạn"
- [ ] Section "Phân tích theo chuyên đề" với progress bars
- [ ] Section "Chuyên đề cần ôn tập" (nếu có)
- [ ] Button "Xem đáp án chi tiết"
- [ ] Đáp án chi tiết: highlight đúng/sai, giải thích

**Test:** Gamification Awards
- [ ] XP được cộng sau khi nộp bài (check Dashboard sau khi thi)
- [ ] Streak được update
- [ ] Badge unlock (nếu đủ điều kiện)

**Expected Result:**
- Phân tích category chính xác
- XP/Streak/Badges update realtime
- UI professional

---

### 5. CHẾ ĐỘ LUYỆN TẬP (PRACTICE MODE)
**Test:** Flow
- [ ] Load 10 câu hỏi random (dùng smart algorithm)
- [ ] Chọn đáp án → Button "Kiểm tra đáp án"
- [ ] Hiển thị đúng/sai ngay lập tức
- [ ] Hiển thị giải thích (nếu có)
- [ ] Button "Câu tiếp theo" sau khi kiểm tra
- [ ] Button "Bỏ qua" nếu chưa trả lời
- [ ] Khi hết câu → Alert điểm → Redirect dashboard

**Expected Result:**
- Không có timer
- Feedback tức thì
- Smart algorithm ưu tiên câu chưa làm/câu sai

---

### 6. THUẬT TOÁN SINH ĐỀ THÔNG MINH
**Test:** Priority Logic
- [ ] Câu chưa gặp bao giờ → weight = 100 (highest)
- [ ] Câu thường sai (accuracy < 60%) → high weight
- [ ] Câu lâu chưa ôn (> 30 ngày) → high weight
- [ ] Câu thành thạo (accuracy >= 90%) → low weight

**How to test:**
1. Làm 1 đề thi lần đầu → Ghi nhận câu nào sai
2. Làm lại đề khác → Check xem câu sai có xuất hiện nhiều hơn không

**Expected Result:**
- UserQuestionProgress được tạo/update sau mỗi lần thi
- Đề thi sau ưu tiên câu yếu

---

### 7. LICENSE & PAYMENT
**Test:** Activation Flow
- [ ] Card "Kích hoạt License" trong dashboard
- [ ] Nhập mã license → Success/Error message
- [ ] License expiry date update sau khi kích hoạt
- [ ] Hiển thị "Còn X ngày" trong header

**Expected Result:**
- Validation chính xác
- Toast notification khi thành công/thất bại

---

### 8. ADMIN PANEL
**Test:** Core Functions
- [ ] Quản lý Users: list, create, lock/unlock
- [ ] Quản lý Questions: list, create, edit, delete, import
- [ ] Quản lý Exams: list, create
- [ ] Quản lý Categories: tree structure
- [ ] Tạo License codes
- [ ] Thống kê: total users, questions, exams

**Expected Result:**
- CRUD operations hoạt động
- Import questions không lỗi
- Pagination/filter hoạt động

---

### 9. RESPONSIVE & PERFORMANCE
**Test:** Cross-device
- [ ] Desktop (1920x1080)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

**Test:** Performance
- [ ] Dashboard load < 2s
- [ ] Exam room load < 1s
- [ ] No console errors
- [ ] No memory leaks

**Expected Result:**
- UI responsive trên mọi device
- Loading fast

---

### 10. ERROR HANDLING
**Test:** Edge Cases
- [ ] Mất kết nối internet khi đang thi → Lỗi rõ ràng
- [ ] Hết giờ thi → Auto-submit
- [ ] Submit khi đã submit rồi → Error message
- [ ] Truy cập exam không tồn tại → 404
- [ ] Truy cập route không có permission → Redirect login

**Expected Result:**
- Error messages thân thiện
- Không crash app

---

## 🎯 PRIORITY TEST ORDER
1. ✅ Build & Deploy check
2. Authentication flow
3. Dashboard UI
4. Exam room (core feature)
5. Result page & Gamification
6. Practice mode
7. Smart algorithm verification
8. Admin panel
9. Edge cases

---

## 📝 BUG TRACKING
| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | TBD | - | - |

---

## ✅ FINAL CHECKLIST
- [ ] All 15 tasks completed
- [ ] Build successful
- [ ] No TypeScript errors
- [ ] No runtime errors in dev
- [ ] Core flows tested
- [ ] Edge cases handled
- [ ] Performance acceptable
