# 🔐 Hướng Dẫn Tạo và Bảo Mật Tài Khoản Admin

## 📌 TÓM TẮT NHANH

### Tạo Admin mới
```bash
npm run admin:create
```

### Reset mật khẩu Admin (khi bị lộ)
```bash
npm run admin:reset
```

### Seed database (chỉ dùng development)
```bash
npm run db:seed
```

---

## 1️⃣ TẠO TÀI KHOẢN ADMIN

### ✅ Cách 1: Dùng Script CLI (KHUYẾN NGHỊ CHO PRODUCTION)

```bash
npm run admin:create
```

**Script sẽ hỏi:**
1. Tên Admin (ví dụ: "Nguyễn Văn A")
2. Email Admin (ví dụ: "admin@congty.com")
3. Chọn cách tạo mật khẩu:
   - **Tùy chọn 1:** Tự nhập mật khẩu (ít nhất 8 ký tự)
   - **Tùy chọn 2:** Tự động sinh mật khẩu mạnh 16 ký tự ⭐ **KHUYẾN NGHỊ**

**Kết quả:**
```
✅ Tài khoản Admin đã được tạo thành công!
================================================
📧 Email:    admin@congty.com
👤 Tên:      Nguyễn Văn A
🔑 Role:     ADMIN
📊 Status:   ACTIVE

⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠
🔐 MẬT KHẨU: aB3$xK9#mN2@pQ8!
⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠⚠

⚠️  LƯU Ý: Hãy lưu mật khẩu này ngay! Nó sẽ không hiển thị lại.
```

---

### ✅ Cách 2: Dùng Seed Script (CHỈ CHO DEVELOPMENT)

```bash
npm run db:seed
```

**Tài khoản mặc định được tạo:**
- 📧 Email: `admin@gmail.com`
- 🔑 Password: `admin12345`
- 👤 Role: `ADMIN`

**⚠️ CẢNH BÁO:** 
- **KHÔNG BAO GIỜ** dùng tài khoản này cho production
- Phải đổi mật khẩu ngay sau khi deploy
- Nên xóa tài khoản này và tạo admin mới

---

### ✅ Cách 3: Tạo qua Giao diện Admin (Yêu cầu đã có Admin)

1. Đăng nhập với tài khoản Admin
2. Vào **Admin Dashboard** → **Quản lý Người dùng**
3. Click nút **"Tạo người dùng mới"**
4. Điền thông tin:
   - Tên: `Admin Mới`
   - Email: `newadmin@example.com`
   - Mật khẩu: Tạo mật khẩu mạnh
   - **Vai trò:** Chọn `ADMIN` ⚠️
   - Trạng thái: `ACTIVE`
5. Click **"Tạo"**

---

### ✅ Cách 4: Tạo trực tiếp trong Database (KHẨN CẤP)

**⚠️ CHỈ DÙNG KHI MẤT HẾT TÀI KHOẢN ADMIN!**

**Bước 1:** Tạo password hash

Vào website: https://bcrypt-generator.com/
- Nhập mật khẩu muốn dùng
- Chọn **Rounds: 10**
- Copy chuỗi hash (bắt đầu bằng `$2b$10$...`)

**Bước 2:** Kết nối PostgreSQL

```bash
# Linux/Mac
psql $DATABASE_URL

# Windows (PowerShell)
$env:DATABASE_URL = "postgresql://..."
psql $env:DATABASE_URL
```

**Bước 3:** Chạy SQL

```sql
INSERT INTO "User" (id, name, email, password, role, status, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Emergency Admin',
  'emergency@example.com',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdLiLp3nO',
  'ADMIN',
  'ACTIVE',
  NOW(),
  NOW()
);
```

**Thông tin đăng nhập:**
- Email: `emergency@example.com`
- Password: `TempPass@2026` (nếu dùng hash ví dụ ở trên)

⚠️ **ĐỔI MẬT KHẨU NGAY SAU KHI ĐĂNG NHẬP!**

---

## 2️⃣ XỬ LÝ KHI BỊ LỘ MẬT KHẨU ADMIN

### 🚨 Script Reset Khẩn Cấp

```bash
npm run admin:reset
```

**Script sẽ:**
1. Hiển thị danh sách tất cả Admin
2. Cho phép chọn Admin cần reset
3. **Tự động thực hiện:**
   - ✅ Tạo mật khẩu mới mạnh (20 ký tự)
   - ✅ Xóa tất cả sessions hiện tại (đăng xuất khỏi mọi thiết bị)
   - ✅ Xóa tất cả OAuth connections
4. Hiển thị mật khẩu mới **1 lần duy nhất**

**Ví dụ output:**
```
🚨 EMERGENCY: Reset mật khẩu Admin

Bạn có chắc muốn tiếp tục? (yes/no): yes

📋 Danh sách tài khoản Admin:
1. admin@gmail.com (Admin Quản trị) - ACTIVE
2. admin@congty.com (Nguyễn Văn A) - ACTIVE

Chọn tài khoản cần reset (1-2): 1

⏳ Đang xử lý...

================================================
✅ Mật khẩu đã được reset thành công!
================================================
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
```

---

### 📋 Checklist Xử lý Sự cố Bảo mật

**⏱ Ngay lập tức (5 phút):**
- [ ] Chạy `npm run admin:reset` để reset password
- [ ] Lưu lại mật khẩu mới
- [ ] Đăng nhập và đổi mật khẩu thành mật khẩu cá nhân

**🔍 Điều tra (30 phút):**
- [ ] Kiểm tra logs để tìm dấu hiệu truy cập trái phép
- [ ] Xem lịch sử thay đổi dữ liệu gần đây
- [ ] Kiểm tra danh sách người dùng có bất thường không
- [ ] Review các thay đổi trong ngân hàng câu hỏi

**🛡 Tăng cường bảo mật:**
- [ ] Đổi email Admin (nếu email cũ bị lộ)
- [ ] Bật 2FA (xác thực 2 yếu tố)
- [ ] Cấu hình IP whitelist
- [ ] Thay đổi database password
- [ ] Thông báo cho team về sự cố

---

## 3️⃣ BẢO MẬT PHÒNG NGỪA

### ✅ Yêu cầu Mật khẩu Mạnh

**Mật khẩu Admin PHẢI:**
- ✅ Ít nhất 12 ký tự (khuyến nghị 16+)
- ✅ Có chữ HOA (A-Z)
- ✅ Có chữ thường (a-z)
- ✅ Có số (0-9)
- ✅ Có ký tự đặc biệt (!@#$%^&*)

**KHÔNG được:**
- ❌ Dùng từ điển: "admin", "password", "123456"
- ❌ Dùng thông tin cá nhân: tên, ngày sinh
- ❌ Tái sử dụng mật khẩu cũ
- ❌ Chia sẻ cho người khác

**Ví dụ mật khẩu MẠNH:**
- ✅ `aB3$xK9#mN2@pQ8!`
- ✅ `MyC0mpany@2026!Sec`
- ✅ `Vn#Admin$2026!Xyz`

**Ví dụ mật khẩu YẾU (KHÔNG DÙNG):**
- ❌ `admin123`
- ❌ `password`
- ❌ `congchuc2024`
- ❌ `admin@gmail.com` (trùng email)

---

### ✅ Đổi Thông tin Mặc định

**KHÔNG BAO GIỜ dùng trên Production:**
- ❌ Email: `admin@gmail.com`
- ❌ Password: `admin12345`
- ❌ Username: `admin`, `administrator`

**NÊN dùng:**
- ✅ Email doanh nghiệp: `baomat@congty.com`
- ✅ Email khó đoán: `nguyen.van.a.it@congty.com`
- ✅ Email riêng cho hệ thống: `he.thong.onluyen@congty.com`

---

### ✅ Các Biện pháp Bảo mật Nâng cao

**1. Giới hạn số lần đăng nhập sai:**
- Hệ thống tự động chặn sau 3 lần đăng nhập sai
- Phải đợi 15 phút trước khi thử lại
- ➡️ Đã được tích hợp sẵn trong middleware

**2. Chỉ cho phép truy cập từ IP cố định (IP Whitelist):**
```env
# File .env
ADMIN_ALLOWED_IPS=192.168.1.100,113.161.xxx.xxx,10.0.0.5
```
- Chỉ những IP trong danh sách mới đăng nhập được Admin
- Thích hợp cho văn phòng có IP tĩnh

**3. Xác thực 2 yếu tố (2FA):**
- Sau khi nhập mật khẩu đúng, phải nhập mã từ app
- Dùng Google Authenticator hoặc Microsoft Authenticator
- ➡️ Tài liệu chi tiết trong `docs/ADMIN_SECURITY.md`

**4. Chỉ dùng HTTPS:**
- ✅ Production: `https://domain.com` (có SSL)
- ❌ KHÔNG dùng: `http://domain.com` (không SSL)

**5. Monitoring và Logging:**
- Ghi lại mọi hành động của Admin
- Cảnh báo khi có đăng nhập bất thường
- Review logs định kỳ hàng tuần

---

## 4️⃣ CÂU HỎI THƯỜNG GẶP

### ❓ Làm sao để test hệ thống Admin?

**Development:**
```bash
# 1. Chạy seed để có tài khoản test
npm run db:seed

# 2. Đăng nhập với:
Email: admin@gmail.com
Password: admin12345

# 3. Test các chức năng Admin
```

**Production:**
```bash
# 1. Tạo tài khoản Admin riêng
npm run admin:create

# 2. Không bao giờ dùng tài khoản test trên production
```

---

### ❓ Quên mất mật khẩu Admin thì làm sao?

**Cách 1: Dùng script reset (Khuyến nghị)**
```bash
npm run admin:reset
```

**Cách 2: Tạo Admin mới**
- Nếu còn 1 Admin khác có thể đăng nhập → Dùng Admin đó tạo tài khoản mới
- Nếu mất hết tất cả Admin → Dùng Cách 4 (tạo trực tiếp trong database)

---

### ❓ Có thể có nhiều tài khoản Admin không?

✅ **Có!** Hệ thống hỗ trợ nhiều Admin.

**Khuyến nghị:**
- Mỗi người quản trị có 1 tài khoản riêng
- KHÔNG chia sẻ chung 1 tài khoản
- Dễ dàng theo dõi ai làm gì (audit trail)

**Tạo Admin thứ 2, thứ 3...:**
```bash
npm run admin:create
# Hoặc qua giao diện Admin Dashboard
```

---

### ❓ Người dùng phát hiện mật khẩu Admin thì sao?

**⚠️ ĐÂY LÀ SỰ CỐ BẢO MẬT NGHIÊM TRỌNG!**

**Xử lý ngay:**
1. Chạy `npm run admin:reset` ngay lập tức
2. Kiểm tra logs xem tài khoản đó có bị truy cập trái phép không
3. Review lại tất cả thay đổi trong hệ thống gần đây
4. Xem xét thay đổi email Admin
5. Bật 2FA ngay lập tức
6. Tăng cường bảo mật (IP whitelist, etc.)

**Phòng ngừa:**
- Không bao giờ để mật khẩu trong code
- Không commit file `.env` lên Git
- Không chia sẻ mật khẩu qua email, chat
- Dùng password manager để lưu mật khẩu
- Thay đổi mật khẩu định kỳ (3-6 tháng)

---

### ❓ Làm sao biết tài khoản Admin có bị hack không?

**Dấu hiệu cảnh báo:**
- 🚨 Xuất hiện dữ liệu lạ (người dùng, câu hỏi) mà bạn không tạo
- 🚨 Có email thông báo đăng nhập từ IP lạ
- 🚨 Dữ liệu quan trọng bị xóa
- 🚨 Mật khẩu không đăng nhập được (bị đổi)
- 🚨 Vai trò bị thay đổi (Admin → Learner)

**Kiểm tra định kỳ:**
```bash
# Xem logs đăng nhập
tail -f logs/security-*.log | grep "ADMIN"

# Xem các thay đổi gần đây trong database
# (Có thể dùng Prisma Studio)
npx prisma studio
```

---

### ❓ Có nên đổi mật khẩu định kỳ không?

✅ **NÊN** - Khuyến nghị:
- Đổi mật khẩu Admin **mỗi 3-6 tháng**
- Đổi ngay nếu nghi ngờ bị lộ
- Đổi ngay khi nhân viên quản trị nghỉ việc

**Cách đổi mật khẩu:**
1. Đăng nhập Admin Dashboard
2. Vào **Profile** / **Tài khoản của tôi**
3. Click **"Đổi mật khẩu"**
4. Nhập mật khẩu cũ và mật khẩu mới

---

## 5️⃣ CHECKLIST BẢO MẬT

### 📋 Setup lần đầu
- [ ] Chạy `npm run admin:create` tạo Admin mới
- [ ] Xóa hoặc vô hiệu hóa tài khoản test `admin@gmail.com`
- [ ] Đổi mật khẩu thành mật khẩu mạnh riêng
- [ ] Lưu mật khẩu vào password manager (LastPass, 1Password, Bitwarden)
- [ ] Test đăng nhập Admin Dashboard

### 📋 Trước khi Deploy Production
- [ ] Đảm bảo KHÔNG dùng tài khoản test
- [ ] Email Admin là email doanh nghiệp
- [ ] Mật khẩu ít nhất 16 ký tự
- [ ] Bật HTTPS (SSL Certificate)
- [ ] Cấu hình rate limiting
- [ ] Setup IP whitelist (nếu có)
- [ ] Bật 2FA (khuyến nghị cao)
- [ ] Cấu hình backup database tự động

### 📋 Định kỳ hàng tháng
- [ ] Review logs bảo mật
- [ ] Kiểm tra danh sách Admin (xóa tài khoản không dùng)
- [ ] Update dependencies (security patches)
- [ ] Test backup & restore
- [ ] Review quyền truy cập

### 📋 Khi có nhân sự mới
- [ ] Tạo tài khoản Admin riêng cho họ
- [ ] Hướng dẫn về bảo mật
- [ ] KHÔNG chia sẻ tài khoản chung

### 📋 Khi nhân sự nghỉ việc
- [ ] Xóa hoặc khóa tài khoản Admin của họ ngay lập tức
- [ ] Review lại các thay đổi họ đã làm gần đây
- [ ] Thay đổi mật khẩu các tài khoản quan trọng khác

---

## 6️⃣ LIÊN HỆ VÀ TÀI LIỆU

### 📚 Tài liệu chi tiết
- `docs/ADMIN_SECURITY.md` - Tài liệu bảo mật đầy đủ (tiếng Anh)
- `docs/02-product-requirements.md` - Yêu cầu hệ thống
- `docs/07-authentication.md` - Cơ chế xác thực

### 🛠 Scripts hữu ích
```bash
# Tạo Admin mới
npm run admin:create

# Reset mật khẩu Admin
npm run admin:reset

# Seed database (dev only)
npm run db:seed

# Mở Prisma Studio (xem database)
npx prisma studio

# Xem logs
tail -f logs/security-*.log
```

### 🆘 Khi cần hỗ trợ khẩn cấp
1. Document lại vấn đề đang gặp
2. Chụp screenshot (KHÔNG chụp mật khẩu!)
3. Lưu logs liên quan
4. Liên hệ team lead hoặc tech support

---

## ⚡ QUICK START

**1. Setup lần đầu:**
```bash
# Tạo Admin
npm run admin:create

# Nhập thông tin khi được hỏi
# Lưu lại mật khẩu
```

**2. Đăng nhập:**
- Vào: `http://localhost:3000/login` (dev) hoặc `https://yourdomain.com/login` (prod)
- Nhập email và password
- Vào Admin Dashboard

**3. Nếu quên mật khẩu:**
```bash
npm run admin:reset
```

**4. Nếu bị hack:**
```bash
npm run admin:reset
# Sau đó bật 2FA ngay lập tức
```

---

**🔒 LƯU Ý CUỐI CÙNG:**
- Bảo mật là ưu tiên hàng đầu
- Không bao giờ chia sẻ mật khẩu Admin
- Thay đổi mật khẩu định kỳ
- Bật 2FA là bắt buộc cho production
- Khi nghi ngờ → Reset ngay lập tức

---

**Cập nhật:** 22/06/2026
**Phiên bản:** 1.0.0
