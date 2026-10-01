# Hệ thống Bảo mật Admin - Tài liệu Đầy đủ

## 📋 Mục lục
1. [Tạo tài khoản Admin](#1-tạo-tài-khoản-admin)
2. [Bảo mật phòng ngừa](#2-bảo-mật-phòng-ngừa)
3. [Xử lý khi bị lộ credentials](#3-xử-lý-khi-bị-lộ-credentials)
4. [Monitoring và Logging](#4-monitoring-và-logging)
5. [Checklist bảo mật](#5-checklist-bảo-mật)

---

## 1. Tạo tài khoản Admin

### Phương pháp 1: Sử dụng Seed Script (Development)

**Tài khoản mặc định đã có sẵn:**
```bash
npx prisma db seed
```

**Thông tin đăng nhập:**
- Email: `admin@gmail.com`
- Password: `admin12345`

⚠️ **CHỈ DÙNG CHO DEVELOPMENT! Không dùng cho production!**

---

### Phương pháp 2: Script CLI An toàn (Production)

**Tạo Admin mới:**
```bash
npx tsx scripts/create-admin.ts
```

**Script này sẽ:**
- Cho phép tùy chỉnh email và tên
- Tự động sinh mật khẩu mạnh (16-20 ký tự)
- Hoặc cho phép nhập mật khẩu tùy chỉnh
- Kiểm tra trùng lặp email
- Hash mật khẩu với bcrypt (10 rounds)

---

### Phương pháp 3: Tạo trực tiếp qua API Admin (Yêu cầu có Admin đang đăng nhập)

**Endpoint:** `POST /api/admin/users`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Cookie": "session_token=..."
}
```

**Body:**
```json
{
  "name": "Admin Mới",
  "email": "newadmin@example.com",
  "password": "MatKhauManhNhat@2026",
  "role": "ADMIN",
  "status": "ACTIVE"
}
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "name": "Admin Mới",
    "email": "newadmin@example.com",
    "role": "ADMIN",
    "status": "ACTIVE",
    "createdAt": "2026-06-22T...",
    "updatedAt": "2026-06-22T..."
  }
}
```

---

### Phương pháp 4: Tạo trực tiếp trong Database (Emergency)

**⚠️ CHỈ DÙNG KHI MẤT HẾT TÀI KHOẢN ADMIN!**

```bash
# 1. Kết nối PostgreSQL
psql $DATABASE_URL

# 2. Tạo password hash (dùng bcrypt online hoặc script)
# Ví dụ hash của "TempPass@2026" với bcrypt cost=10:
# $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdLiLp3nO

# 3. Insert Admin user
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

**Hoặc dùng Prisma Studio:**
```bash
npx prisma studio
```

---

## 2. Bảo mật Phòng ngừa

### 2.1. Mật khẩu Mạnh

**Yêu cầu tối thiểu:**
- Ít nhất 12 ký tự (khuyến nghị 16+)
- Bao gồm: Chữ hoa, chữ thường, số, ký tự đặc biệt
- Không dùng từ điển, tên, ngày sinh
- Không tái sử dụng mật khẩu cũ

**Tạo mật khẩu mạnh:**
```bash
# Linux/Mac
openssl rand -base64 24

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) + (33,35,36,37,38,42,64) | Get-Random -Count 16 | % {[char]$_})

# Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

---

### 2.2. Thay đổi Thông tin Mặc định

**KHÔNG BAO GIỜ dùng:**
- ❌ Username: `admin`, `administrator`, `root`
- ❌ Email: `admin@domain.com`, `admin@gmail.com`
- ❌ Password mặc định từ seed script

**NÊN dùng:**
- ✅ Email doanh nghiệp: `security@company.com`
- ✅ Hoặc email cá nhân khó đoán: `j.nguyen.system@company.com`

---

### 2.3. Rate Limiting cho Login (ĐÃ CÓ SẴN)

File: `src/middleware.ts` (hoặc cần thêm)

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Tạo rate limiter cho admin login
const adminLoginLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "15 m"), // 3 lần / 15 phút
  analytics: true,
});

// Trong middleware hoặc API route
export async function POST(req: Request) {
  const { email } = await req.json();
  
  // Nếu là admin email, áp dụng rate limit nghiêm ngặt
  if (email && email.includes("admin")) {
    const identifier = `admin-login:${email}`;
    const { success, remaining } = await adminLoginLimiter.limit(identifier);
    
    if (!success) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again in 15 minutes." },
        { status: 429 }
      );
    }
  }
  
  // ... tiếp tục xử lý login
}
```

---

### 2.4. IP Whitelist (Khuyến nghị cho Production)

**Cách 1: Environment Variable**

`.env.production`:
```env
ADMIN_ALLOWED_IPS=192.168.1.100,10.0.0.5,113.161.xxx.xxx
```

`src/middleware.ts`:
```typescript
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(",") || [];

export default auth((req) => {
  const { nextUrl } = req;
  const isAdminRoute = nextUrl.pathname.startsWith("/admin") || 
                       nextUrl.pathname.startsWith("/api/admin");
  
  if (isAdminRoute && req.auth?.user?.role === "ADMIN") {
    const clientIP = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    if (ADMIN_ALLOWED_IPS.length > 0 && !ADMIN_ALLOWED_IPS.includes(clientIP)) {
      console.warn(`[SECURITY] Unauthorized admin access from IP: ${clientIP}`);
      
      return NextResponse.json(
        { error: "Access denied from this IP address" },
        { status: 403 }
      );
    }
  }
  
  return NextResponse.next();
});
```

---

### 2.5. Two-Factor Authentication (2FA) - Khuyến nghị cao

**Cài đặt thư viện:**
```bash
npm install speakeasy qrcode
```

**Thêm field vào User model:**

`prisma/schema.prisma`:
```prisma
model User {
  // ... existing fields
  twoFactorSecret   String?
  twoFactorEnabled  Boolean   @default(false)
  twoFactorBackupCodes String[] // Array backup codes
}
```

**API để enable 2FA:**

`src/app/api/admin/2fa/setup/route.ts`:
```typescript
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tạo secret mới
  const secret = speakeasy.generateSecret({
    name: `EducationPlatform (${session.user.email})`,
    issuer: "EducationPlatform",
  });

  // Tạo QR code
  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

  // Lưu secret vào database (chưa enable)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: secret.base32 },
  });

  return NextResponse.json({
    success: true,
    qrCode: qrCodeDataUrl,
    secret: secret.base32, // Để user có thể nhập thủ công
  });
}
```

**Verify và enable 2FA:**

`src/app/api/admin/2fa/verify/route.ts`:
```typescript
import speakeasy from "speakeasy";

export async function POST(req: Request) {
  const session = await auth();
  const { token } = await req.json();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true },
  });

  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
  }

  // Verify token
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time steps before/after
  });

  if (!verified) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );

  // Enable 2FA
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: backupCodes,
    },
  });

  return NextResponse.json({
    success: true,
    backupCodes, // Hiển thị 1 lần duy nhất!
  });
}
```

**Update login flow để check 2FA:**

`src/auth.ts`:
```typescript
// Trong authorize callback của CredentialsProvider
async authorize(credentials) {
  // ... existing validation

  const user = await prisma.user.findUnique({
    where: { email: credentials.email as string },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      status: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });

  // ... password validation

  // Nếu 2FA được bật cho Admin
  if (user.role === "ADMIN" && user.twoFactorEnabled) {
    const token2FA = credentials.token2FA as string | undefined;

    if (!token2FA) {
      throw new Error("2FA_REQUIRED");
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: "base32",
      token: token2FA,
      window: 2,
    });

    if (!verified) {
      // Check backup codes
      const backupCodes = await prisma.user.findUnique({
        where: { id: user.id },
        select: { twoFactorBackupCodes: true },
      });

      if (!backupCodes?.twoFactorBackupCodes.includes(token2FA)) {
        throw new Error("INVALID_2FA_TOKEN");
      }

      // Remove used backup code
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorBackupCodes: backupCodes.twoFactorBackupCodes.filter(
            (code) => code !== token2FA
          ),
        },
      });
    }
  }

  return { ...user };
}
```

---

## 3. Xử lý Khi Bị Lộ Credentials

### 3.1. Script Emergency Reset Password

**Chạy ngay:**
```bash
npx tsx scripts/reset-admin-password.ts
```

Script này sẽ:
- ✅ Reset mật khẩu Admin
- ✅ Xóa tất cả sessions hiện tại
- ✅ Xóa tất cả OAuth accounts
- ✅ Tạo mật khẩu mạnh mới (20 ký tự)

---

### 3.2. Checklist Xử lý Sự cố

**Bước 1: Cô lập (Ngay lập tức - 5 phút)**
```bash
# 1. Reset password admin
npx tsx scripts/reset-admin-password.ts

# 2. Vô hiệu hóa tài khoản tạm thời (nếu cần)
psql $DATABASE_URL -c "UPDATE \"User\" SET status = 'LOCKED' WHERE role = 'ADMIN' AND email = 'admin@gmail.com';"

# 3. Clear tất cả sessions
psql $DATABASE_URL -c "DELETE FROM \"Session\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE role = 'ADMIN');"
```

**Bước 2: Điều tra (15-30 phút)**
```bash
# Xem lịch sử đăng nhập gần đây
psql $DATABASE_URL -c "SELECT * FROM \"Session\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE role = 'ADMIN') ORDER BY expires DESC LIMIT 20;"

# Check logs (nếu có Winston/Pino)
tail -f logs/security.log | grep "ADMIN"

# Kiểm tra các thay đổi trong database gần đây
psql $DATABASE_URL -c "SELECT * FROM \"User\" WHERE \"updatedAt\" > NOW() - INTERVAL '24 hours' ORDER BY \"updatedAt\" DESC;"
```

**Bước 3: Phục hồi (30 phút - 2 giờ)**
- Tạo admin mới với email khác
- Enable 2FA ngay lập tức
- Cập nhật IP whitelist
- Thông báo cho team
- Document lại incident

**Bước 4: Phòng ngừa (Dài hạn)**
- Audit lại tất cả quyền truy cập
- Review logs định kỳ
- Thiết lập monitoring alerts
- Training team về bảo mật

---

## 4. Monitoring và Logging

### 4.1. Thêm Security Logging

**Cài đặt Winston:**
```bash
npm install winston winston-daily-rotate-file
```

**Tạo logger:**

`src/lib/security-logger.ts`:
```typescript
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const securityLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: "logs/security-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
      level: "warn",
    }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export function logSecurityEvent(event: {
  type: "LOGIN_ATTEMPT" | "LOGIN_SUCCESS" | "LOGIN_FAILED" | 
        "PASSWORD_RESET" | "ADMIN_ACTION" | "SUSPICIOUS_ACTIVITY";
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
}) {
  securityLogger.warn({
    timestamp: new Date().toISOString(),
    ...event,
  });
}

export default securityLogger;
```

**Sử dụng trong auth:**

`src/auth.ts`:
```typescript
import { logSecurityEvent } from "@/lib/security-logger";

async authorize(credentials) {
  const ip = req?.headers?.get("x-forwarded-for") || "unknown";
  const userAgent = req?.headers?.get("user-agent") || "unknown";

  try {
    // ... validation logic

    logSecurityEvent({
      type: "LOGIN_SUCCESS",
      email: user.email,
      userId: user.id,
      ip,
      userAgent,
    });

    return user;
  } catch (error) {
    logSecurityEvent({
      type: "LOGIN_FAILED",
      email: credentials.email as string,
      ip,
      userAgent,
      details: { reason: error.message },
    });

    throw error;
  }
}
```

---

### 4.2. Monitoring Dashboard

**Track các metrics quan trọng:**
- Failed login attempts (đặc biệt admin accounts)
- Admin actions (create/update/delete users)
- Unusual access patterns (truy cập ngoài giờ làm việc)
- Multiple IPs cùng 1 tài khoản

**Có thể dùng:**
- Grafana + Loki (self-hosted)
- DataDog (cloud)
- Sentry (cho errors)

---

## 5. Checklist Bảo mật

### Development Environment
- [ ] Không commit `.env` file
- [ ] Dùng mật khẩu mạnh ngay cả trong dev
- [ ] Enable SSL/TLS cho database connection
- [ ] Không expose database port ra ngoài

### Production Environment
- [ ] Đổi tất cả credentials mặc định
- [ ] Enable 2FA cho tất cả Admin accounts
- [ ] Setup IP whitelist
- [ ] Cấu hình rate limiting
- [ ] Enable security headers (HSTS, CSP, X-Frame-Options)
- [ ] Chỉ dùng HTTPS (không HTTP)
- [ ] Backup database định kỳ
- [ ] Monitor logs liên tục
- [ ] Có incident response plan

### Định kỳ (Hàng tháng)
- [ ] Review user permissions
- [ ] Audit admin actions logs
- [ ] Check for unused admin accounts
- [ ] Update dependencies (security patches)
- [ ] Test backup & restore procedure
- [ ] Review và rotate secrets/API keys

---

## 6. Quick Reference

### Tạo Admin mới
```bash
npx tsx scripts/create-admin.ts
```

### Reset password Admin
```bash
npx tsx scripts/reset-admin-password.ts
```

### Seed database (dev only)
```bash
npx prisma db seed
```

### View logs
```bash
tail -f logs/security-*.log
```

### Emergency disable admin
```sql
UPDATE "User" SET status = 'LOCKED' WHERE email = 'compromised@email.com';
```

### Emergency create admin (database trực tiếp)
```sql
-- Generate hash online: https://bcrypt-generator.com/
INSERT INTO "User" (id, name, email, password, role, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Emergency Admin', 'emergency@example.com', 
        '$2b$10$...hash...', 'ADMIN', 'ACTIVE', NOW(), NOW());
```

---

## 7. Liên hệ và Support

**Nếu gặp sự cố bảo mật nghiêm trọng:**
1. Chạy script reset ngay lập tức
2. Thông báo cho team lead
3. Document lại toàn bộ quá trình
4. Review và cải thiện security measures

**Tài liệu tham khảo:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/security
- Prisma Security: https://www.prisma.io/docs/guides/security

---

**Cập nhật lần cuối:** 2026-06-22
**Version:** 1.0.0
