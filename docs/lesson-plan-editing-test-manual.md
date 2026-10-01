# Test Manual - Chức năng Chỉnh Sửa Giáo Án

## Chuẩn bị

### 1. Database Setup
- Đảm bảo có ít nhất 1 user trong database
- Có ít nhất 1 lesson plan đã parse (status = "PARSED" hoặc "REVIEWED")
- Lesson plan đó có ít nhất 2-3 sections

### 2. Login
- Đăng nhập vào hệ thống với user là owner của lesson plan
- URL: http://localhost:3000/login

## Test Case 1: Xem Chi Tiết Giáo Án

**Mục đích:** Kiểm tra hiển thị sections và các nút chức năng

**Steps:**
1. Vào trang danh sách giáo án: http://localhost:3000/lesson-plans
2. Click vào một giáo án đã parse
3. Kiểm tra hiển thị:
   - ✅ Header có đầy đủ thông tin (title, subject, grade, year)
   - ✅ Status badge hiển thị đúng
   - ✅ Permission badge (Owner/Editor/Viewer/Admin)
   - ✅ Nút "Lịch sử", "Sửa", "Xóa" (nếu là Owner/Admin)
   - ✅ Nút "Chia sẻ" (nếu là Owner/Admin)
   - ✅ Danh sách sections với word count, char count
   - ✅ Nút "Chỉnh sửa" trên mỗi section (nếu có quyền EDITOR trở lên)

**Expected:** Tất cả hiển thị đúng, không có lỗi console

---

## Test Case 2: Chỉnh Sửa Metadata Giáo Án

**Mục đích:** Test modal chỉnh sửa thông tin cơ bản

**Steps:**
1. Ở trang chi tiết giáo án, click nút "Sửa" (icon Edit)
2. Modal "Chỉnh sửa thông tin giáo án" xuất hiện
3. Thay đổi các trường:
   - Title: "Giáo án Test - Updated"
   - Subject: "Toán học"
   - Grade: "Lớp 5"
   - Year: "2024-2025"
4. Click "Lưu thay đổi"
5. Đợi toast "Đã cập nhật thông tin giáo án"
6. Modal đóng lại
7. Kiểm tra header đã cập nhật

**Expected:**
- ✅ Modal mở/đóng mượt mà
- ✅ Toast notification hiển thị
- ✅ Data được cập nhật trên UI
- ✅ Network tab: PATCH `/api/lesson-plans/[id]` return 200

---

## Test Case 3: Chỉnh Sửa Section - Không Tạo Version

**Mục đích:** Test chức năng edit section cơ bản

**Steps:**
1. Click nút "Chỉnh sửa" trên section đầu tiên
2. Modal "Chỉnh sửa section" xuất hiện
3. Kiểm tra hiển thị:
   - ✅ Tiêu đề section hiện tại
   - ✅ Nội dung hiện tại trong textarea
   - ✅ Word count và char count (so sánh với cũ)
   - ✅ Checkbox "Tạo version mới" (unchecked)
4. Sửa nội dung: Thêm 1 đoạn văn mới (~50 từ)
5. Quan sát:
   - ✅ Word count tăng real-time
   - ✅ Char count tăng real-time
6. Giữ checkbox "Tạo version mới" UNCHECKED
7. Click "Lưu thay đổi"
8. Đợi toast "Đã cập nhật section"
9. Modal đóng, section list refresh

**Expected:**
- ✅ Nội dung section được cập nhật
- ✅ Word count mới hiển thị trên card section
- ✅ Network: PATCH `/api/lesson-plans/[id]/sections/[sectionId]` return 200
- ✅ Response body có `data.wordCount` và `data.charCount` mới

**Verify Database:**
```sql
SELECT * FROM "LessonPlanVersion" WHERE "lessonPlanId" = '<id>' ORDER BY "versionNumber" DESC;
-- Không có version mới (versionNumber không tăng)

SELECT status FROM "LessonPlan" WHERE id = '<id>';
-- status = 'EDITING'
```

---

## Test Case 4: Chỉnh Sửa Section - Tạo Version Mới

**Mục đích:** Test version control

**Steps:**
1. Click nút "Chỉnh sửa" trên section thứ 2
2. Modal mở ra
3. Ghi nhớ version hiện tại (xem ở header hoặc check DB)
4. Sửa nội dung đáng kể (thay đổi >50% nội dung)
5. **CHECK** checkbox "Tạo version mới"
6. Click "Lưu thay đổi"
7. Đợi toast success
8. Modal đóng

**Expected:**
- ✅ Section được cập nhật
- ✅ Network: Response có success=true
- ✅ Status lesson plan = "EDITING"

**Verify Database:**
```sql
SELECT * FROM "LessonPlanVersion" WHERE "lessonPlanId" = '<id>' ORDER BY "versionNumber" DESC;
-- Có 1 record mới với versionNumber = (cũ + 1)
-- changeSummary = "Chỉnh sửa section: [tên section]"

SELECT "currentVersion" FROM "LessonPlan" WHERE id = '<id>';
-- currentVersion đã tăng lên

SELECT * FROM "ReviewHistory" 
WHERE "lessonPlanId" = '<id>' AND "actionType" = 'EDITED' 
ORDER BY "createdAt" DESC LIMIT 1;
-- Có record log với actionData chứa sectionId, wordCount
```

---

## Test Case 5: Xem Lịch Sử Versions

**Mục đích:** Test VersionHistoryModal

**Steps:**
1. Ở trang chi tiết giáo án, click nút "Lịch sử" (icon History)
2. Modal "Lịch sử phiên bản" mở ra
3. Kiểm tra hiển thị:
   - ✅ Danh sách versions (nếu có)
   - ✅ Version cao nhất có badge "Hiện tại"
   - ✅ Mỗi version hiển thị:
     - Version number (v1, v2, v3...)
     - Change summary
     - Người tạo (name)
     - Thời gian (format vi-VN)
     - File size
   - ✅ Nút Download (hiện tại chưa hoạt động, show toast)
4. Click nút Download
5. Toast hiển thị "Chức năng tải xuống đang được phát triển"
6. Click "Đóng"

**Expected:**
- ✅ Modal hiển thị đúng data
- ✅ Versions sắp xếp giảm dần (mới nhất trước)
- ✅ UI đẹp, responsive

---

## Test Case 6: Permissions - Editor Role

**Mục đích:** Test quyền chỉnh sửa của Editor

**Setup:**
1. Tạo user mới (user B)
2. Share lesson plan cho user B với role = EDITOR
3. Logout user hiện tại
4. Login với user B

**Steps:**
1. Vào trang chi tiết lesson plan (được share)
2. Kiểm tra:
   - ✅ Badge hiển thị "✏️ Chỉnh sửa"
   - ✅ Nút "Chỉnh sửa" trên sections HIỂN THỊ
   - ✅ Nút "Lịch sử" HIỂN THỊ
   - ✅ Nút "Xóa" KHÔNG HIỂN THỊ
3. Click nút "Chỉnh sửa" trên 1 section
4. Sửa nội dung và lưu
5. Kiểm tra có lưu thành công không

**Expected:**
- ✅ Editor có thể sửa sections
- ✅ Editor có thể xem lịch sử versions
- ✅ Editor KHÔNG thể xóa giáo án
- ✅ Editor KHÔNG thể xóa sections

---

## Test Case 7: Permissions - Viewer Role

**Mục đích:** Test quyền xem của Viewer

**Setup:**
1. Share lesson plan cho user C với role = VIEWER
2. Login với user C

**Steps:**
1. Vào trang chi tiết lesson plan
2. Kiểm tra:
   - ✅ Badge hiển thị "👁️ Xem"
   - ✅ Nút "Chỉnh sửa" trên sections KHÔNG HIỂN THỊ
   - ✅ Nút "Lịch sử" KHÔNG HIỂN THỊ
   - ✅ Nút "Sửa", "Xóa", "Chia sẻ" KHÔNG HIỂN THỊ
3. Thử call API trực tiếp (dùng browser console hoặc Postman):
   ```javascript
   fetch('/api/lesson-plans/[id]/sections/[sectionId]', {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ rawContent: 'hack' })
   })
   ```

**Expected:**
- ✅ Viewer chỉ xem được
- ✅ API trả về 403 Forbidden khi Viewer cố gắng sửa

---

## Test Case 8: Validation & Error Handling

**Mục đích:** Test các trường hợp lỗi

### 8.1: Nội dung rỗng
1. Mở modal edit section
2. Xóa hết nội dung (để trống)
3. Click "Lưu thay đổi"
4. **Expected:** Toast error "Vui lòng nhập nội dung"

### 8.2: Network Error
1. Mở DevTools > Network > Offline
2. Sửa section và lưu
3. **Expected:** Toast error "Lỗi khi cập nhật section"
4. Modal vẫn mở (không đóng)

### 8.3: Section không tồn tại
1. Sửa URL thành `/api/lesson-plans/[id]/sections/invalid-id`
2. Call API
3. **Expected:** 404 Not Found, message "Không tìm thấy section"

### 8.4: Section không thuộc lesson plan
1. Lấy sectionId từ lesson plan A
2. Call PATCH với lessonPlanId của lesson plan B
3. **Expected:** 400 Bad Request, message "Section không thuộc giáo án này"

---

## Test Case 9: Concurrent Edits

**Mục đích:** Test khi nhiều người sửa cùng lúc

**Steps:**
1. Mở 2 browser tabs (hoặc 2 browsers khác nhau)
2. Login user A ở tab 1, user B (Editor) ở tab 2
3. Cả 2 vào cùng 1 lesson plan
4. Tab 1: Mở modal edit section 1
5. Tab 2: Mở modal edit section 1 (cùng section)
6. Tab 1: Sửa và lưu trước
7. Tab 2: Sửa (nội dung khác) và lưu sau

**Expected:**
- ✅ Cả 2 lần save đều thành công
- ✅ Lần save sau ghi đè lần save trước (last-write-wins)
- ⚠️ Không có conflict resolution (đây là limitation hiện tại)

**Note:** Để implement proper concurrent edit, cần:
- Optimistic locking (thêm field `version` hoặc `updatedAt` check)
- Hoặc real-time collaboration với WebSocket

---

## Test Case 10: Large Content

**Mục đích:** Test với nội dung lớn

**Steps:**
1. Mở modal edit section
2. Paste nội dung rất dài (>10,000 ký tự)
3. Kiểm tra:
   - ✅ Textarea scroll được
   - ✅ Word count và char count tính đúng
   - ✅ Không lag khi nhập
4. Click "Lưu thay đổi"
5. Đợi response

**Expected:**
- ✅ Lưu thành công
- ✅ Không timeout
- ✅ Performance chấp nhận được (<3s)

---

## Test Case 11: XSS Protection

**Mục đích:** Test bảo mật

**Steps:**
1. Mở modal edit section
2. Nhập nội dung chứa script:
   ```
   <script>alert('XSS')</script>
   <img src=x onerror="alert('XSS')">
   ```
3. Lưu
4. Reload trang và xem section

**Expected:**
- ✅ Script KHÔNG được execute
- ✅ Content hiển thị dạng text thuần (escaped)
- ✅ Không có alert box xuất hiện

---

## Checklist Tổng Hợp

### Functional
- [ ] Edit metadata (title, subject, grade, year)
- [ ] Edit section content
- [ ] Create version on demand
- [ ] View version history
- [ ] Real-time word/char count
- [ ] Toast notifications

### Permissions
- [ ] Owner: Full access
- [ ] Editor: Edit sections, view history
- [ ] Viewer: Read only
- [ ] Admin: Full access

### UI/UX
- [ ] Modals mở/đóng mượt
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design
- [ ] Accessible (keyboard navigation)

### Security
- [ ] Authentication check
- [ ] Permission check
- [ ] XSS protection
- [ ] SQL injection protection (Prisma handles)

### Performance
- [ ] Fast load (<1s)
- [ ] No memory leaks
- [ ] Large content handling

---

## Bugs Found

_(Ghi lại các bugs phát hiện trong quá trình test)_

| # | Mô tả | Severity | Status |
|---|-------|----------|--------|
| 1 | ... | High/Medium/Low | Open/Fixed |

---

## Kết quả Test

**Date:** [Ngày test]  
**Tester:** [Tên người test]  
**Environment:** Development / Staging / Production  
**Test Coverage:** __% (số test pass / tổng số test)

**Summary:**
- Passed: __
- Failed: __
- Blocked: __
- Skipped: __

**Notes:**
[Ghi chú chung về quá trình test]
