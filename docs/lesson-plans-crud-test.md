# Lesson Plans CRUD - Test Documentation

**Module:** Quản lý giáo án (Admin)  
**Date:** 2026-06-27  
**Status:** ✅ Implementation Complete - Ready for Testing

---

## 📋 Implementation Summary

### API Endpoints Created

1. **POST /api/admin/lesson-plans**
   - Create new lesson plan (admin only)
   - Fields: title (required), subject, gradeLevel, schoolYear
   - Returns: Created lesson plan data

2. **PATCH /api/admin/lesson-plans/[id]**
   - Update existing lesson plan (admin only)
   - Validates UUID, checks admin role
   - Partial update support

### Components Created

1. **CreateLessonPlanModal** (`src/components/admin/CreateLessonPlanModal.tsx`)
   - Form với 4 fields
   - Client-side validation
   - Toast notifications

2. **EditLessonPlanModal** (`src/components/admin/EditLessonPlanModal.tsx`)
   - Pre-fill form with existing data
   - Same validation as create
   - Toast notifications

### UI Updates

**Admin Lesson Plans Page** (`src/app/admin/lesson-plans/page.tsx`)
- ✅ Added "Tạo giáo án mới" button (header, top-right)
- ✅ Added Edit button (Pencil icon) to each row
- ✅ Existing View and Delete buttons remain
- ✅ Modal state management

---

## 🧪 Test Plan

### Test Environment
- Server: http://localhost:3000
- Page: http://localhost:3000/admin/lesson-plans
- Role: ADMIN required

---

## ✅ Test Cases

### 1. CREATE Operation

#### TC1.1: Create với tất cả fields
**Steps:**
1. Navigate to http://localhost:3000/admin/lesson-plans
2. Click "Tạo giáo án mới" button
3. Fill form:
   - Tiêu đề: "Giáo án Toán lớp 10"
   - Môn học: "Toán"
   - Khối lớp: "10"
   - Năm học: "2024-2025"
4. Click "Tạo giáo án"

**Expected:**
- ✅ Modal closes
- ✅ Success toast: "Tạo giáo án thành công"
- ✅ New lesson plan appears in list
- ✅ Page reloads/refreshes data

#### TC1.2: Create với chỉ title (required field)
**Steps:**
1. Click "Tạo giáo án mới"
2. Fill only: Tiêu đề: "Giáo án test minimal"
3. Leave other fields empty
4. Click "Tạo giáo án"

**Expected:**
- ✅ Modal closes
- ✅ Success toast
- ✅ New plan created with null values for optional fields

#### TC1.3: Validation - Empty title
**Steps:**
1. Click "Tạo giáo án mới"
2. Leave all fields empty
3. Click "Tạo giáo án"

**Expected:**
- ❌ Error toast: "Vui lòng nhập tiêu đề"
- ❌ Modal stays open
- ❌ No API call made

#### TC1.4: Cancel create
**Steps:**
1. Click "Tạo giáo án mới"
2. Fill some data
3. Click "Hủy" or X button

**Expected:**
- ✅ Modal closes
- ✅ No data saved
- ✅ Form resets for next open

---

### 2. UPDATE Operation

#### TC2.1: Edit tất cả fields
**Steps:**
1. Find a lesson plan in list
2. Click Edit button (Pencil icon)
3. Modify all fields:
   - Tiêu đề: "Giáo án Updated"
   - Môn học: "Văn"
   - Khối lớp: "11"
   - Năm học: "2025-2026"
4. Click "Lưu thay đổi"

**Expected:**
- ✅ Modal closes
- ✅ Success toast: "Cập nhật giáo án thành công"
- ✅ Changes reflect in table
- ✅ Page refreshes data

#### TC2.2: Edit chỉ một field
**Steps:**
1. Click Edit on a plan
2. Change only title
3. Click "Lưu thay đổi"

**Expected:**
- ✅ Only title updates
- ✅ Other fields unchanged

#### TC2.3: Clear optional fields
**Steps:**
1. Click Edit on plan with data in optional fields
2. Clear "Môn học" field
3. Click "Lưu thay đổi"

**Expected:**
- ✅ Field becomes null in database
- ✅ Shows "-" in table

#### TC2.4: Validation - Clear title
**Steps:**
1. Click Edit
2. Clear the title field
3. Click "Lưu thay đổi"

**Expected:**
- ❌ Error toast: "Vui lòng nhập tiêu đề"
- ❌ Modal stays open

#### TC2.5: Cancel edit
**Steps:**
1. Click Edit
2. Make changes
3. Click "Hủy"

**Expected:**
- ✅ Modal closes
- ✅ No changes saved
- ✅ Original data intact

---

### 3. READ Operation (Already Exists)

#### TC3.1: List all plans
**Steps:**
1. Navigate to admin lesson plans page

**Expected:**
- ✅ All lesson plans displayed
- ✅ Shows: title, creator, subject, grade, status, date
- ✅ Pagination works
- ✅ Filters work

#### TC3.2: Search functionality
**Steps:**
1. Type in search box

**Expected:**
- ✅ Filters by title, user name, user email

---

### 4. DELETE Operation (Already Exists)

#### TC4.1: Delete plan
**Steps:**
1. Click Delete (Trash icon)
2. Confirm dialog

**Expected:**
- ✅ Plan deleted (soft delete)
- ✅ Success toast
- ✅ Removed from list

---

## 🔒 Security Tests

### TC5.1: Admin role check - Create
**Steps:**
1. Login as non-admin user
2. Try to POST to /api/admin/lesson-plans

**Expected:**
- ❌ 403 Forbidden
- ❌ Message: "Không có quyền truy cập"

### TC5.2: Admin role check - Update
**Steps:**
1. Login as non-admin
2. Try to PATCH /api/admin/lesson-plans/[id]

**Expected:**
- ❌ 403 Forbidden

### TC5.3: Invalid UUID
**Steps:**
1. PATCH /api/admin/lesson-plans/invalid-id

**Expected:**
- ❌ 400 Bad Request
- ❌ Message: "ID không hợp lệ"

---

## 🎨 UI/UX Tests

### TC6.1: Button placement
**Expected:**
- ✅ "Tạo giáo án mới" button: top-right, next to title
- ✅ Edit button: in action column, before Delete
- ✅ Icons clear and recognizable

### TC6.2: Modal behavior
**Expected:**
- ✅ Backdrop click closes modal
- ✅ ESC key closes modal
- ✅ Smooth animations
- ✅ Form fields properly aligned

### TC6.3: Loading states
**Expected:**
- ✅ Button shows "Đang tạo..." / "Đang lưu..." during submit
- ✅ Button disabled during submit
- ✅ Cannot submit multiple times

### TC6.4: Responsive design
**Test on different screen sizes:**
- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

---

## 🐛 Edge Cases

### TC7.1: Very long title
**Steps:**
1. Enter 500+ character title
2. Submit

**Expected:**
- System handles gracefully (no crash)

### TC7.2: Special characters
**Steps:**
1. Enter title with: `<script>alert('xss')</script>`
2. Submit

**Expected:**
- ✅ HTML tags stripped or escaped
- ✅ No XSS vulnerability

### TC7.3: Unicode characters
**Steps:**
1. Enter Vietnamese with accents: "Giáo án Tiếng Việt"
2. Submit

**Expected:**
- ✅ Properly stored and displayed

### TC7.4: Network error
**Steps:**
1. Open DevTools
2. Go to Network tab
3. Throttle to Offline
4. Try to create/edit

**Expected:**
- ❌ Error toast: "Lỗi khi tạo giáo án" / "Lỗi khi cập nhật giáo án"
- ❌ Modal stays open

---

## 📊 Test Results Template

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC1.1 | ⏳ | |
| TC1.2 | ⏳ | |
| TC1.3 | ⏳ | |
| TC1.4 | ⏳ | |
| TC2.1 | ⏳ | |
| TC2.2 | ⏳ | |
| TC2.3 | ⏳ | |
| TC2.4 | ⏳ | |
| TC2.5 | ⏳ | |
| TC3.1 | ⏳ | |
| TC3.2 | ⏳ | |
| TC4.1 | ⏳ | |
| TC5.1 | ⏳ | |
| TC5.2 | ⏳ | |
| TC5.3 | ⏳ | |
| TC6.1 | ⏳ | |
| TC6.2 | ⏳ | |
| TC6.3 | ⏳ | |
| TC6.4 | ⏳ | |
| TC7.1 | ⏳ | |
| TC7.2 | ⏳ | |
| TC7.3 | ⏳ | |
| TC7.4 | ⏳ | |

Legend:
- ⏳ Not tested yet
- ✅ Passed
- ❌ Failed
- ⚠️ Partial / Issues found

---

## 🚀 Manual Test Instructions

1. **Open the page:**
   ```
   http://localhost:3000/admin/lesson-plans
   ```

2. **Login as admin** (ensure session.user.role === "ADMIN")

3. **Test Create:**
   - Click "Tạo giáo án mới" button
   - Fill form, submit
   - Verify new item in list

4. **Test Edit:**
   - Click Pencil icon on any row
   - Modify fields, save
   - Verify changes in list

5. **Test Delete:**
   - Click Trash icon
   - Confirm
   - Verify removal

6. **Check console:**
   - No errors in browser console
   - No failed API calls

---

## 🔍 Known Issues / Notes

- Build passed with 0 TypeScript errors ✅
- Server running on port 3000 ✅
- All components properly imported ✅
- Modal state management working ✅

---

## 📝 Next Steps After Testing

1. If all tests pass → Mark task #15 as completed
2. Move to next module: **Danh sách đề đã xuất bản (Exams CRUD)**
3. If issues found → Fix and re-test

---

**Implementation complete. Ready for user testing.**
