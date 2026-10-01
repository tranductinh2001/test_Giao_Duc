# License Management - Manual Testing Plan

## 🧪 Test Environment Setup

**Prerequisites:**
- ✅ Database running
- ✅ Admin account created
- ✅ Regular user account created
- ✅ App running on localhost

**Test Data:**
- Admin email: [your-admin@example.com]
- User email: [test-user@example.com]
- Test codes will be generated during testing

---

## 📝 Test Cases

### Category 1: Admin - Generate Licenses

#### TC-1.1: Generate Single License (Basic)
**Steps:**
1. Login as Admin
2. Navigate to `/admin/licenses`
3. Click "Tạo licenses" button
4. Enter:
   - Count: 1
   - Duration: 365 days
   - Prefix: (leave empty)
5. Click "Tạo ngay"

**Expected:**
- ✅ Success toast: "Đã tạo 1 license codes"
- ✅ New license appears in table
- ✅ Code format: XXXX-XXXX-XXXX-XXXX
- ✅ Status: UNUSED
- ✅ Duration: 365 days
- ✅ Stats card "Chưa dùng" increments by 1

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-1.2: Generate Multiple Licenses with Prefix
**Steps:**
1. In admin licenses page
2. Click "Tạo licenses"
3. Enter:
   - Count: 10
   - Duration: 90 days
   - Prefix: TEST2026
4. Click "Tạo ngay"

**Expected:**
- ✅ Success toast: "Đã tạo 10 license codes"
- ✅ 10 new licenses appear
- ✅ All codes start with "TEST2026-"
- ✅ All have 90 days duration
- ✅ All status UNUSED
- ✅ Stats updated correctly

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-1.3: Bulk Generate 100 Licenses
**Steps:**
1. Click "Tạo licenses"
2. Enter:
   - Count: 100
   - Duration: 365
   - Prefix: BULK
3. Click "Tạo ngay"

**Expected:**
- ✅ Success toast
- ✅ 100 licenses created
- ✅ No duplicate codes
- ✅ Performance acceptable (< 5s)

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-1.4: Validation - Invalid Count
**Steps:**
1. Try count = 0
2. Try count = 1001
3. Try count = -5

**Expected:**
- ✅ Error: "Số lượng phải từ 1-1000"
- ✅ No licenses created

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-1.5: Validation - Invalid Duration
**Steps:**
1. Try duration = 0
2. Try duration = -10

**Expected:**
- ✅ Error: "Thời hạn phải lớn hơn 0"
- ✅ No licenses created

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

### Category 2: Admin - Manage Licenses

#### TC-2.1: Filter by Status
**Steps:**
1. Click each filter button:
   - ALL
   - UNUSED
   - ACTIVATED
   - EXPIRED
   - REVOKED

**Expected:**
- ✅ Table shows only matching licenses
- ✅ Filter button highlighted
- ✅ Count matches stats card

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-2.2: Search by Code
**Steps:**
1. Generate a license, note its code
2. Type partial code in search box
3. Type full code

**Expected:**
- ✅ Table filters in real-time
- ✅ Shows matching license
- ✅ Search is case-insensitive

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-2.3: Delete Unused License
**Steps:**
1. Find an UNUSED license
2. Click "Xóa" button
3. Confirm dialog

**Expected:**
- ✅ Confirmation: "Xác nhận xóa license {code}?"
- ✅ After confirm: Success toast
- ✅ License removed from table
- ✅ Stats updated

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-2.4: Try Delete Activated License
**Steps:**
1. Find an ACTIVATED license
2. Look for delete button

**Expected:**
- ✅ No delete button shown
- ✅ Only "Thu hồi" button available

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-2.5: Revoke Activated License
**Steps:**
1. Find an ACTIVATED license
2. Click "Thu hồi"
3. Confirm

**Expected:**
- ✅ Confirmation dialog
- ✅ Success toast
- ✅ Status changes to REVOKED
- ✅ Stats updated

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-2.6: Export CSV
**Steps:**
1. Click "Export CSV" button
2. Check downloaded file

**Expected:**
- ✅ CSV file downloads
- ✅ Filename: licenses-{timestamp}.csv
- ✅ Contains: Code, Duration, Status, Activated By, Activated At
- ✅ Includes filtered results only

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

### Category 3: User - Activate License

#### TC-3.1: First Activation (No Existing License)
**Steps:**
1. Login as regular user
2. Get an UNUSED license code from admin
3. Navigate to `/licenses/activate`
4. Enter the code
5. Click "Kích hoạt ngay"

**Expected:**
- ✅ Current status shows "Chưa có license"
- ✅ Success toast: "Kích hoạt license thành công!"
- ✅ Status updates to "License đang hoạt động"
- ✅ Shows expiry date
- ✅ Shows days remaining (365)
- ✅ Shows activated code

**Result:** [ ] Pass [ ] Fail
**Activated Code:** _______________
**Expiry Date:** _______________

---

#### TC-3.2: Check License Status API
**Steps:**
1. After activation
2. Refresh page
3. Check status display

**Expected:**
- ✅ Status persists (from API)
- ✅ Shows correct expiry
- ✅ Days remaining accurate
- ✅ Active license info shown

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-3.3: Try Activate Already Used Code
**Steps:**
1. Use same code from TC-3.1
2. Try to activate again

**Expected:**
- ✅ Error toast: "Mã license đã được sử dụng"
- ✅ No changes to current license
- ✅ Status remains same

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-3.4: Try Activate with Active License
**Steps:**
1. User already has active license
2. Get a different UNUSED code
3. Try to activate

**Expected:**
- ✅ Error: "Bạn đã có license đang hoạt động đến {date}"
- ✅ Current license unchanged
- ✅ New code not consumed

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-3.5: Try Activate Invalid Code
**Steps:**
1. Enter: "INVALID-CODE-1234"
2. Submit

**Expected:**
- ✅ Error: "Mã license không tồn tại"

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-3.6: Try Activate Empty Code
**Steps:**
1. Leave code field empty
2. Try to submit

**Expected:**
- ✅ Button disabled OR
- ✅ Error: "Vui lòng nhập mã license"

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-3.7: Try Activate Revoked Code
**Steps:**
1. Admin: Create license, activate it, revoke it
2. User: Try to use that code

**Expected:**
- ✅ Error: "Mã license đã bị thu hồi"

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

### Category 4: Database & Backend

#### TC-4.1: Verify License in Database
**Steps:**
1. After activation
2. Check database:
   ```sql
   SELECT * FROM "License" WHERE code = '{code}';
   SELECT * FROM "User" WHERE id = '{userId}';
   ```

**Expected:**
- ✅ License.status = 'ACTIVATED'
- ✅ License.activatedAt = [timestamp]
- ✅ License.activatedByUserId = [userId]
- ✅ User.licenseExpiresAt = [correct date]

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-4.2: Transaction Safety (Concurrent Activation)
**Steps:**
1. Open 2 browser tabs
2. Same user, same code
3. Click activate simultaneously

**Expected:**
- ✅ Only one succeeds
- ✅ Other gets error
- ✅ Code used only once
- ✅ No race condition

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

### Category 5: Edge Cases

#### TC-5.1: Expired License Check
**Steps:**
1. Manually update User.licenseExpiresAt to past date
2. Go to /licenses/activate
3. Check status display

**Expected:**
- ✅ Shows "License đã hết hạn"
- ✅ Shows expiry date
- ✅ isActive = false
- ✅ Can activate new code

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-5.2: Auto-Uppercase Code
**Steps:**
1. Enter code in lowercase: "abcd-efgh-ijkl"
2. Observe input field

**Expected:**
- ✅ Automatically converts to: "ABCD-EFGH-IJKL"

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-5.3: Code with Spaces
**Steps:**
1. Enter: " TEST-1234-5678 " (with spaces)
2. Submit

**Expected:**
- ✅ Spaces trimmed automatically
- ✅ Activation succeeds if valid

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-5.4: Non-Admin Access Admin APIs
**Steps:**
1. Login as regular user
2. Try to access:
   - GET /api/admin/licenses
   - POST /api/admin/licenses

**Expected:**
- ✅ 403 Forbidden
- ✅ Error: "Không có quyền truy cập"

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

### Category 6: UI/UX

#### TC-6.1: Responsive Design
**Steps:**
1. Test on:
   - Desktop (1920x1080)
   - Tablet (768px)
   - Mobile (375px)

**Expected:**
- ✅ Tables scroll horizontally on mobile
- ✅ Buttons stack properly
- ✅ Modals fit screen
- ✅ No text overflow

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-6.2: Loading States
**Steps:**
1. Slow network: Throttle to 3G
2. Generate licenses
3. Activate license

**Expected:**
- ✅ Buttons show "Đang tạo..." / "Đang kích hoạt..."
- ✅ Buttons disabled during loading
- ✅ No double-submit possible

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-6.3: Toast Notifications
**Steps:**
1. Test all success/error actions
2. Verify toast messages

**Expected:**
- ✅ Success: Green toast, clear message
- ✅ Error: Red toast, helpful message
- ✅ Auto-dismiss after 3-5s
- ✅ Can manually dismiss

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

#### TC-6.4: Back Button Navigation
**Steps:**
1. From admin licenses page, click "← Quay lại"
2. From user activate page, click "← Quay lại"

**Expected:**
- ✅ Goes to previous page
- ✅ router.back() works correctly

**Result:** [ ] Pass [ ] Fail
**Notes:** _______________

---

## 📊 Test Summary

**Total Test Cases:** 30+

**Pass Rate:** _____ / _____ (____%)

**Critical Issues:** _____

**Minor Issues:** _____

**Blockers:** _____

---

## 🐛 Bugs Found

### Bug #1
**Severity:** [ ] Critical [ ] High [ ] Medium [ ] Low
**Description:** 
**Steps to Reproduce:**
**Expected:**
**Actual:**
**Screenshot:**

### Bug #2
**Severity:** [ ] Critical [ ] High [ ] Medium [ ] Low
**Description:**
**Steps to Reproduce:**
**Expected:**
**Actual:**
**Screenshot:**

---

## ✅ Sign-off

**Tester Name:** _____________________

**Date:** _____________________

**Status:** [ ] Ready for Production [ ] Needs Fixes

**Notes:**
