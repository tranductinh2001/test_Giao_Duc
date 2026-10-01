# Fix: Gemini API Key Configuration & DOCX Parse Error

## Ngày: 27/06/2026

---

## Vấn đề được báo cáo

1. ❌ **Không có mục config Gemini API key**
2. ❌ **Lỗi parse giáo án**: "Could not find the body element: are you sure this is a docx file?"

---

## Giải pháp đã triển khai

### 1. Tạo trang Admin Settings ⚙️

**File:** `src/app/admin/settings/page.tsx`

**Tính năng:**
- ✅ Form nhập Gemini API key
- ✅ Hiển thị API key hiện tại (masked)
- ✅ Test API key trước khi lưu
- ✅ Lưu vào file .env
- ✅ Warning nếu chưa có key
- ✅ Hướng dẫn lấy API key từ Google AI Studio
- ✅ UI đẹp với icons và color states

**UI Components:**
- Badge hiển thị trạng thái (có key / chưa có key)
- Input password cho API key
- 2 buttons: "Test API Key" và "Lưu cài đặt"
- Instructions box với link Google AI Studio
- Info box với tips bảo mật

---

### 2. API Endpoints

#### A. GET/POST `/api/admin/settings`
**File:** `src/app/api/admin/settings/route.ts`

**GET - Lấy cài đặt hiện tại:**
- Permission: Admin only
- Đọc API key từ file .env
- Trả về masked key (an toàn)
- Response: `{ geminiApiKey, hasKey }`

**POST - Lưu API key:**
- Permission: Admin only
- Validate input
- Update/add GEMINI_API_KEY trong .env
- Update process.env
- Yêu cầu restart server

**Security:**
- ✅ Admin-only access
- ✅ Validation
- ✅ File .env được bảo vệ (gitignore)

#### B. POST `/api/admin/settings/test`
**File:** `src/app/api/admin/settings/test/route.ts`

**Test API key:**
- Gọi Gemini API với request đơn giản
- Verify response hợp lệ
- Trả về error message cụ thể nếu fail
- Model test: gemini-1.5-flash

**Test flow:**
```
1. Nhận API key từ request
2. Call: POST generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
3. Body: { contents: [{ parts: [{ text: "Hello" }] }] }
4. Check response.candidates
5. Return success/fail
```

---

### 3. Cải thiện DOCX Parser

**File:** `src/lib/docx-parser.ts`

**Enhancements:**
- ✅ Check file exists trước khi đọc
- ✅ Check file không rỗng
- ✅ Verify file signature (PK = ZIP format)
- ✅ Better error messages
- ✅ Hướng dẫn khắc phục trong error message

**Validation steps:**
```typescript
1. File exists? → "File không tồn tại"
2. File size > 0? → "File rỗng"
3. File signature = PK? → "Không phải DOCX hợp lệ"
4. Mammoth parse OK? → "File DOCX bị lỗi cấu trúc"
5. Has text content? → "Không có nội dung văn bản"
```

**Error messages cải thiện:**
```
❌ Trước: "Could not find the body element"
✅ Sau: "File DOCX bị lỗi cấu trúc. Vui lòng thử:
1. Mở file trong Microsoft Word
2. Save As → chọn định dạng .docx
3. Upload lại file mới"
```

---

### 4. Admin Layout Update

**File:** `src/app/admin/layout.tsx`

**Thay đổi:**
- ✅ Thêm menu item "Cài đặt hệ thống" với icon ⚙️
- ✅ Link đến `/admin/settings`
- ✅ Position: cuối danh sách navigation

---

### 5. Documentation

**File:** `docs/parse-lesson-plan-troubleshooting.md`

**Nội dung:**
- ✅ Hướng dẫn khắc phục lỗi parse
- ✅ Hướng dẫn lấy Gemini API key (chi tiết)
- ✅ Hướng dẫn config API key (2 options)
- ✅ Quy trình parse giáo án
- ✅ Troubleshooting các lỗi thường gặp
- ✅ Best practices
- ✅ Checklist trước khi parse

---

## Workflow sử dụng

### Lần đầu setup
1. Login với tài khoản Admin
2. Vào **Admin Panel** → **Cài đặt hệ thống**
3. Click link "Google AI Studio" để lấy API key
4. Paste API key vào form
5. Click **"Test API Key"** → chờ "API key hợp lệ ✓"
6. Click **"Lưu cài đặt"**
7. Restart server: Stop (Ctrl+C) và `npm run dev`
8. Quay lại Settings để verify có badge "✅ API key hiện tại"

### Parse giáo án
1. Đảm bảo file là .docx (không phải .doc)
2. Upload giáo án
3. Click "Parse giáo án"
4. Nếu lỗi "body element":
   - Mở file trong Word
   - Save As → Word Document (.docx)
   - Upload lại

---

## Files tạo/sửa

### New Files (4)
1. `src/app/admin/settings/page.tsx` - Settings UI
2. `src/app/api/admin/settings/route.ts` - Get/Set API
3. `src/app/api/admin/settings/test/route.ts` - Test API
4. `docs/parse-lesson-plan-troubleshooting.md` - Documentation

### Modified Files (2)
1. `src/app/admin/layout.tsx` - Add menu item
2. `src/lib/docx-parser.ts` - Better error handling

**Total:** 6 files, ~600 lines of code

---

## Testing

### Manual Tests Completed
✅ 1. Access settings page (Admin only)
✅ 2. Display current key (masked)
✅ 3. Input new key
✅ 4. Test API key functionality
✅ 5. Save API key to .env
✅ 6. UI states (loading, success, error)
✅ 7. Error messages display correctly

### To Test (Cần user test)
- [ ] Lấy real Gemini API key từ Google
- [ ] Test parse với file .docx hợp lệ
- [ ] Test parse với file .doc (expect error)
- [ ] Test parse với file corrupt
- [ ] Verify restart server apply new key

---

## Known Limitations

1. ⚠️ **Cần restart server** sau khi save API key
   - Hiện tại: Update process.env runtime (có thể không đủ)
   - Tốt hơn: Hot reload hoặc database config
   
2. ⚠️ **File .env security**
   - Đã có trong .gitignore
   - Cần đảm bảo không deploy .env lên production
   
3. ⚠️ **DOCX format support**
   - Chỉ support .docx (Office 2007+)
   - Không support .doc (Office 97-2003)
   - Cần Microsoft Word/Google Docs để convert

---

## Next Steps

### Immediate (Cần làm ngay)
1. **User cần lấy Gemini API key:**
   - Truy cập: https://aistudio.google.com/app/apikey
   - Tạo API key
   - Config trong Admin Settings
   
2. **Test parse giáo án:**
   - Upload file .docx mẫu
   - Parse và verify sections
   
3. **Verify Review functionality:**
   - Sau khi parse, test Review với AI

### Future Enhancements
- [ ] Store API key trong database (encrypted)
- [ ] Hot reload config without restart
- [ ] Support .doc conversion (thông qua LibreOffice)
- [ ] Batch parse multiple files
- [ ] Progress bar cho parse operation
- [ ] Queue system cho heavy operations

---

## Security Checklist

✅ Admin-only access cho settings
✅ API key masked trong UI
✅ Password input type cho API key
✅ .env trong .gitignore
✅ No API key in frontend bundle
✅ HTTPS required for production
⚠️ Consider encrypting API key in DB (future)

---

## Environment Variables

### Required in .env
```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Gemini AI (NEW - Required for lesson plan review)
GEMINI_API_KEY="AIza..." 
```

### .env.example update needed
Cần thêm vào `.env.example`:
```bash
# Gemini AI API Key for lesson plan review
GEMINI_API_KEY="your-gemini-api-key-here"
```

---

## API Key Info

### Gemini API
- **Provider:** Google AI
- **Docs:** https://ai.google.dev/docs
- **Free tier:** 60 requests/minute
- **Model used:** gemini-1.5-flash (fast, cheap)
- **Fallback:** gemini-1.5-pro (more capable)

### Get API Key
1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with Google
3. Create API Key → Select/Create project
4. Copy key (format: `AIza...`)
5. Keep it secret!

---

## Error Messages Reference

### Parse Errors
| Error | Cause | Solution |
|-------|-------|----------|
| "Could not find body element" | File not valid DOCX | Convert in Word → Save As .docx |
| "File không tồn tại" | File path wrong | Check upload success |
| "File rỗng" | Empty file | Use file with content |
| "Không phải DOCX hợp lệ" | File is .doc or renamed | Convert to .docx |
| "Không có nội dung văn bản" | Only images | Add text content |

### API Key Errors
| Error | Cause | Solution |
|-------|-------|----------|
| "API key không hợp lệ" | Wrong key or revoked | Get new key |
| "API_KEY_INVALID" | Key format wrong | Check key format |
| "Permission denied" | API not enabled | Enable Generative Language API |

---

## Summary

✅ **Solved:** Gemini API key configuration  
✅ **Solved:** Better DOCX parse error messages  
✅ **Added:** Admin settings page  
✅ **Added:** API test functionality  
✅ **Added:** Comprehensive documentation  

**Status:** Ready for testing with real API key

**Next:** User needs to get Gemini API key and configure it
