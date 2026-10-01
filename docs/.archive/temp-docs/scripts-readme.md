# Scripts Utilities

Thư mục này chứa các script tiện ích để quản lý hệ thống.

## 📂 Danh sách Scripts

### 1. `create-admin.ts` - Tạo tài khoản Admin
Tạo tài khoản Admin mới với mật khẩu mạnh.

**Chạy:**
```bash
npm run admin:create
# hoặc
npx tsx scripts/create-admin.ts
```

**Tính năng:**
- ✅ Nhập tên và email tùy chỉnh
- ✅ Tự động sinh mật khẩu mạnh (16 ký tự) hoặc nhập thủ công
- ✅ Kiểm tra email trùng lặp
- ✅ Hash mật khẩu với bcrypt
- ✅ Hiển thị mật khẩu 1 lần duy nhất

**Sử dụng khi:**
- Setup hệ thống lần đầu
- Tạo Admin mới cho nhân viên
- Thay thế tài khoản Admin cũ

---

### 2. `reset-admin-password.ts` - Reset mật khẩu Admin khẩn cấp
Reset mật khẩu Admin khi bị lộ hoặc quên.

**Chạy:**
```bash
npm run admin:reset
# hoặc
npx tsx scripts/reset-admin-password.ts
```

**Tính năng:**
- ✅ Hiển thị danh sách tất cả Admin
- ✅ Chọn Admin cần reset
- ✅ Tự động tạo mật khẩu mạnh mới (20 ký tự)
- ✅ Xóa tất cả sessions (đăng xuất khỏi mọi thiết bị)
- ✅ Xóa tất cả OAuth connections
- ✅ Ghi log bảo mật

**Sử dụng khi:**
- Phát hiện mật khẩu Admin bị lộ
- Admin quên mật khẩu
- Nghi ngờ tài khoản bị xâm nhập
- Nhân viên quản trị nghỉ việc

---

## 🔒 Yêu cầu

**Environment Variables:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

**Dependencies:**
- `@prisma/client` - Database ORM
- `@prisma/adapter-pg` - PostgreSQL adapter
- `bcrypt` - Password hashing
- `pg` - PostgreSQL driver
- `tsx` - TypeScript executor

---

## 🛡 Bảo mật

**Lưu ý quan trọng:**
- ⚠️ Scripts này chỉ chạy được trên server (có quyền truy cập database)
- ⚠️ KHÔNG expose scripts này qua HTTP/API
- ⚠️ Chỉ admin server mới có quyền chạy
- ⚠️ Mật khẩu chỉ hiển thị 1 lần, không log vào file
- ⚠️ Sử dụng bcrypt với cost factor = 10 (an toàn và nhanh)

---

## 📝 Ví dụ Sử dụng

### Tạo Admin lần đầu
```bash
$ npm run admin:create

🔐 Script tạo tài khoản Admin

==================================================
Tên Admin (mặc định: 'Admin'): Nguyễn Văn A
Email Admin (mặc định: 'admin@example.com'): admin@congty.vn

Chọn cách tạo mật khẩu:
1. Tự nhập mật khẩu
2. Tự động sinh mật khẩu mạnh (16 ký tự)

Lựa chọn (1/2): 2

✅ Mật khẩu đã được tạo tự động.

==================================================
✅ Tài khoản Admin đã được tạo thành công!
==================================================
📧 Email:    admin@congty.vn
👤 Tên:      Nguyễn Văn A
🔑 Role:     ADMIN
📊 Status:   ACTIVE

⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠
🔐 MẬT KHẨU: aB3$xK9#mN2@pQ8!
⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠

⚠️  LƯU Ý: Hãy lưu mật khẩu này ngay! Nó sẽ không hiển thị lại.

💡 Khuyến nghị bảo mật:
   1. Đổi mật khẩu ngay sau lần đăng nhập đầu tiên
   2. Bật xác thực 2 yếu tố (2FA) nếu có
   3. KHÔNG chia sẻ thông tin đăng nhập này
   4. Sử dụng email doanh nghiệp, không dùng email cá nhân
```

### Reset mật khẩu khẩn cấp
```bash
$ npm run admin:reset

🚨 EMERGENCY: Reset mật khẩu Admin

==================================================
⚠️  Script này sẽ:
   1. Reset mật khẩu cho tài khoản Admin
   2. Vô hiệu hóa tất cả sessions hiện tại
   3. Tạo log bảo mật
==================================================

Bạn có chắc muốn tiếp tục? (yes/no): yes

📋 Danh sách tài khoản Admin:
1. admin@gmail.com (Admin Quản trị) - ACTIVE
2. admin@congty.vn (Nguyễn Văn A) - ACTIVE

Chọn tài khoản cần reset (1-2): 1

⏳ Đang xử lý...

==================================================
✅ Mật khẩu đã được reset thành công!
==================================================
📧 Email:    admin@gmail.com
👤 Tên:      Admin Quản trị
⏰ Reset at: 22/06/2026, 21:30:45

🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐
MẬT KHẨU MỚI: xR9$mK3#nP7@qL2&zW8!
🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐🔐

⚠️  QUAN TRỌNG:
   • Tất cả sessions hiện tại đã bị vô hiệu hóa
   • Admin phải đăng nhập lại bằng mật khẩu mới
   • Lưu mật khẩu này ngay! Nó sẽ không hiển thị lại
   • Đổi mật khẩu ngay sau khi đăng nhập
   • Kiểm tra logs để phát hiện truy cập trái phép

📝 Các bước tiếp theo:
   1. Kiểm tra logs hệ thống tìm dấu hiệu bất thường
   2. Review lại quyền truy cập của Admin
   3. Cân nhắc thay đổi email Admin nếu cần
   4. Bật 2FA ngay lập tức
   5. Thông báo cho team về sự cố bảo mật
```

---

## 🆘 Troubleshooting

### Lỗi: "Database connection failed"
```bash
# Kiểm tra DATABASE_URL
echo $DATABASE_URL

# Test kết nối
psql $DATABASE_URL -c "SELECT 1;"

# Kiểm tra Prisma đã generate chưa
npx prisma generate
```

### Lỗi: "Email already exists"
Script `create-admin.ts` sẽ hỏi có muốn update tài khoản cũ không. Chọn `y` để update hoặc `n` để hủy.

### Lỗi: "No admin found"
Nếu script `reset-admin-password.ts` báo không tìm thấy Admin, có nghĩa database không có Admin nào. Dùng `create-admin.ts` để tạo mới.

### Script không chạy được
```bash
# Đảm bảo tsx đã được cài
npm install -D tsx

# Hoặc chạy trực tiếp
npx tsx scripts/create-admin.ts
```

---

## 📚 Tài liệu liên quan

- [HUONG_DAN_ADMIN.md](../docs/HUONG_DAN_ADMIN.md) - Hướng dẫn đầy đủ bằng tiếng Việt
- [ADMIN_SECURITY.md](../docs/ADMIN_SECURITY.md) - Tài liệu bảo mật chi tiết (English)
- [07-authentication.md](../docs/07-authentication.md) - Cơ chế xác thực hệ thống

---

## 🔧 Development

Nếu bạn muốn tùy chỉnh scripts:

**Thay đổi độ dài mật khẩu:**
```typescript
// Trong create-admin.ts hoặc reset-admin-password.ts
function generateSecurePassword(length: number = 16) { // Đổi 16 thành số khác
  // ...
}
```

**Thay đổi bcrypt rounds:**
```typescript
// Mặc định: 10 rounds (khuyến nghị)
const hashedPassword = await bcrypt.hash(password, 10);

// Tăng bảo mật (chậm hơn): 12 rounds
const hashedPassword = await bcrypt.hash(password, 12);
```

**Thêm logging:**
```typescript
import winston from "winston";
// Thêm log vào các hành động quan trọng
```

---

**Cập nhật:** 22/06/2026
