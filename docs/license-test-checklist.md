# License Management - Quick Test Checklist

## ✅ Pre-Test Setup
- [ ] Build completed successfully
- [ ] Dev server running (`npm run dev`)
- [ ] Database connected
- [ ] Admin account ready
- [ ] Regular user account ready

---

## 🔧 Admin Tests (Priority)

### Generate & View
- [ ] Generate 1 license (basic)
- [ ] Generate 10 licenses with prefix
- [ ] View all licenses in table
- [ ] Check stats cards update correctly

### Filter & Search
- [ ] Filter by UNUSED
- [ ] Filter by ACTIVATED
- [ ] Search by partial code
- [ ] Search by full code

### Actions
- [ ] Delete an UNUSED license
- [ ] Verify cannot delete ACTIVATED license
- [ ] Export CSV and check contents

---

## 👤 User Tests (Priority)

### First Activation
- [ ] Navigate to `/licenses/activate`
- [ ] Check shows "Chưa có license"
- [ ] Enter valid UNUSED code
- [ ] Click "Kích hoạt ngay"
- [ ] Verify success toast
- [ ] Verify status updates to "License đang hoạt động"
- [ ] Check expiry date displayed
- [ ] Check days remaining displayed

### Error Cases
- [ ] Try activate same code again → should fail "đã được sử dụng"
- [ ] Try activate invalid code → should fail "không tồn tại"
- [ ] Try activate with empty code → button disabled or error

---

## 🐛 Critical Bugs to Watch

### Build Issues
- [x] Duplicate imports in review page → FIXED
- [x] Wrong schema field `ruleSetCode` → FIXED to `code`
- [ ] Any other TypeScript errors?

### Runtime Issues
- [ ] License activation API working?
- [ ] License status check API working?
- [ ] Toast notifications appearing?
- [ ] Back buttons navigating correctly?

---

## 📊 Success Criteria

**Build:** ✅ Passes TypeScript check
**Admin:** ✅ Can generate and manage licenses
**User:** ✅ Can activate and view license status
**Security:** ✅ Non-admin cannot access admin APIs
**UX:** ✅ All buttons, toasts, navigation working

---

## 🚀 If All Pass → Move to Next Module

**Next Module:** Lesson Plans CRUD
- Add create lesson plan
- Add edit lesson plan
- Add delete lesson plan
- Add back buttons
- Test thoroughly

---

## 📝 Notes

Build Errors Fixed:
1. ✅ Duplicate imports removed from review page
2. ✅ Fixed `ruleSetCode` → `code` in review-rules API
3. ⏳ Waiting for build to complete...

Current Status: Testing Phase
