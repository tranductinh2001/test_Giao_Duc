# 07. Xác thực & Phân quyền (Authentication & Authorization)

Hệ thống sử dụng **Auth.js (NextAuth.js v5)** làm giải pháp xác thực cốt lõi, hỗ trợ cả đăng nhập bằng Email/Mật khẩu truyền thống và Đăng nhập một chạm qua Google (OAuth 2.0).

---

## 7.1. Cấu hình Chiến lược Session (Session Strategy)

Hệ thống sử dụng chiến lược **JWT (JSON Web Token)** để lưu trữ session trên Client. Cấu trúc JWT bao gồm các thông tin phân quyền và bản quyền để giảm thiểu việc truy vấn Database liên tục ở mỗi request.

### Cấu trúc Token (Payload)
```typescript
interface CustomJWT {
  id: string;              // UUID người dùng
  name: string;            // Tên hiển thị
  email: string;           // Email
  role: "ADMIN" | "LEARNER";
  status: "ACTIVE" | "LOCKED";
  licenseExpiresAt: string | null; // Định dạng ISO String
}
```

---

## 7.2. Cấu hình NextAuth (`auth.ts`)

Đoạn mã cấu hình NextAuth tích hợp với Prisma Adapter để tự động tạo tài khoản khi đăng nhập Google và quản lý JWT Session.

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });
        
        if (!user || !user.password) return null;
        
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        
        if (!isValid) return null;
        if (user.status === "LOCKED") throw new Error("ACCOUNT_LOCKED");
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          licenseExpiresAt: user.licenseExpiresAt,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.licenseExpiresAt = user.licenseExpiresAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "LEARNER";
        session.user.status = token.status as "ACTIVE" | "LOCKED";
        session.user.licenseExpiresAt = token.licenseExpiresAt as string | null;
      }
      return session;
    }
  }
});
```

---

## 7.3. Phân quyền Middleware (RBAC Guard Middleware)

Để bảo vệ các tuyến đường (routes) ở cả tầng Client (Giao diện) và API (Route Handlers), chúng ta cấu hình file `middleware.ts` ở thư mục gốc của Next.js:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isApiAdminRoute = nextUrl.pathname.startsWith("/api/admin");
  const isAppRoute = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/exam");
  const isAuthRoute = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");

  // 1. Nếu đang ở trang Auth và đã đăng nhập -> Redirect về dashboard
  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // 2. Yêu cầu đăng nhập đối với các trang Dashboard, Exam, Admin
  if (!isLoggedIn && (isAppRoute || isAdminRoute || isApiAdminRoute)) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl)
    );
  }

  // 3. Bảo vệ các trang Admin và API Admin (Chỉ cho phép ADMIN)
  if ((isAdminRoute || isApiAdminRoute) && userRole !== "ADMIN") {
    if (isApiAdminRoute) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)", "/api/admin/:path*"],
};
```

**Middleware này đảm bảo:**
- Người dùng đã đăng nhập không bị yêu cầu đăng nhập lại khi truy cập các trang được bảo vệ
- Session được duy trì nhất quán giữa các request
- Chuyển hướng tự động về trang đăng nhập nếu chưa xác thực
- Phân quyền chặt chẽ giữa ADMIN và LEARNER

---

## 7.4. Bộ lọc Kích hoạt Bản quyền (License Guard)

Đối với các tính năng ôn luyện có phí như "Thi thử", "Sinh đề tự động", "Luyện tập theo chuyên đề", ta áp dụng một helper kiểm tra xem tài khoản học viên có còn hạn sử dụng hay không.

### Hàm kiểm tra License (Server-side API check)
```typescript
import { auth } from "@/auth";

export async function checkLicenseActive(): Promise<boolean> {
  const session = await auth();
  if (!session || !session.user) {
    return false;
  }
  
  // Admin được quyền miễn phí và không giới hạn
  if (session.user.role === "ADMIN") {
    return true;
  }
  
  const expiresAtStr = session.user.licenseExpiresAt;
  if (!expiresAtStr) {
    return false;
  }
  
  const expiresAt = new Date(expiresAtStr);
  const now = new Date();
  
  return expiresAt > now;
}
```

Nếu hàm trả về `false`, Route Handler lập tức trả về lỗi:
```json
{
  "success": false,
  "error": "LICENSE_REQUIRED",
  "message": "Tính năng này yêu cầu tài khoản đã kích hoạt mã bản quyền ôn luyện."
}
```
Ở Client, hệ thống hiển thị Dialog nhắc nhở nhập mã License để mở khóa.

---

## 7.5. Quy trình Đăng ký tài khoản (Registration Flow)

### API Route: `/api/auth/register`

```typescript
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải dài ít nhất 6 ký tự")
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Kiểm tra email đã tồn tại
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email }
    });

    if (existingUser) {
      return Response.json(
        { success: false, error: "Email đã được sử dụng" },
        { status: 400 }
      );
    }

    // Hash password với bcrypt (cost factor = 12)
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // Tạo user mới
    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: "LEARNER",
        status: "ACTIVE"
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    // Ghi audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        event: "USER_REGISTER",
        details: { email: user.email },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        success: true
      }
    });

    return Response.json({ success: true, data: user }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: "VALIDATION_ERROR", details: error.errors },
        { status: 400 }
      );
    }
    return Response.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
```

---

## 7.6. Quy trình Quên mật khẩu (Password Reset Flow)

### Sơ đồ luồng

```mermaid
sequenceDiagram
    User->>Frontend: Click "Forgot Password"
    Frontend->>API: POST /api/auth/forgot-password {email}
    API->>Database: Tạo PasswordResetToken
    API->>Email Service: Gửi email reset link
    Email Service->>User: Email chứa token
    User->>Frontend: Click reset link
    Frontend->>API: POST /api/auth/reset-password {token, newPassword}
    API->>Database: Validate token (chưa hết hạn?)
    API->>Database: Update password & xóa token
    API->>User: Success message
```

### API: `/api/auth/forgot-password`

```typescript
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  const { email } = await request.json();

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    // Không tiết lộ email có tồn tại hay không (security best practice)
    return Response.json({ success: true });
  }

  // Tạo token ngẫu nhiên 32 bytes
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000); // 1 giờ

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expires
    }
  });

  // Gửi email với link reset
  const resetUrl = `${process.env.NEXT_PUBLIC_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, user.name, resetUrl);

  return Response.json({ success: true });
}
```

### API: `/api/auth/reset-password`

```typescript
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const { token, newPassword } = await request.json();

  // Validate token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!resetToken || resetToken.expires < new Date()) {
    return Response.json(
      { success: false, error: "Token không hợp lệ hoặc đã hết hạn" },
      { status: 400 }
    );
  }

  // Hash password mới
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password và xóa token
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    }),
    prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    })
  ]);

  // Ghi audit log
  await prisma.auditLog.create({
    data: {
      userId: resetToken.userId,
      event: "PASSWORD_RESET",
      details: { method: "email_token" },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      success: true
    }
  });

  return Response.json({ success: true });
}
```

---

## 7.7. Rate Limiting - Chống Brute-force Attacks

### File: `src/lib/ratelimit.ts`

```typescript
import { prisma } from "./prisma";

export async function checkLoginRateLimit(email: string, ipAddress: string) {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // Đếm số lần thất bại trong 5 phút qua theo email
  const failedAttempts = await prisma.loginAttempt.count({
    where: {
      email,
      success: false,
      createdAt: { gte: fiveMinutesAgo }
    }
  });

  // Giới hạn 5 lần thất bại / 5 phút
  if (failedAttempts >= 5) {
    throw new Error(
      "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 5 phút."
    );
  }

  // Đếm theo IP address
  const ipFailedAttempts = await prisma.loginAttempt.count({
    where: {
      ipAddress,
      success: false,
      createdAt: { gte: fiveMinutesAgo }
    }
  });

  // Giới hạn 10 lần thất bại / 5 phút từ cùng 1 IP
  if (ipFailedAttempts >= 10) {
    throw new Error(
      "IP của bạn đã bị tạm khóa do quá nhiều lần đăng nhập thất bại."
    );
  }
}

// Ghi log login attempt
export async function logLoginAttempt(
  email: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  userId?: string,
  failReason?: string
) {
  await prisma.loginAttempt.create({
    data: {
      userId,
      email,
      ipAddress,
      userAgent,
      success,
      failReason
    }
  });
}
```

### Sử dụng trong Login API

```typescript
// Trong authorize function của CredentialsProvider
async authorize(credentials) {
  const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent") || "";
  
  try {
    // Kiểm tra rate limit
    await checkLoginRateLimit(credentials.email, ipAddress);
    
    // ... validate password ...
    
    if (!isValid) {
      await logLoginAttempt(
        credentials.email,
        ipAddress,
        userAgent,
        false,
        undefined,
        "WRONG_PASSWORD"
      );
      return null;
    }
    
    // Success
    await logLoginAttempt(
      credentials.email,
      ipAddress,
      userAgent,
      true,
      user.id
    );
    
    return user;
  } catch (error) {
    // Rate limit exceeded
    throw error;
  }
}
```

---

## 7.8. Security Best Practices

### 1. Password Security
- ✅ Hash passwords với **bcrypt** (cost factor = 12)
- ✅ Không bao giờ lưu plaintext password
- ✅ Minimum 6 ký tự (khuyến nghị 8+ với chữ hoa, số, ký tự đặc biệt)
- ✅ Password reset token expire sau 1 giờ

### 2. JWT Token Security
- ✅ Token lưu trong **httpOnly cookie** (không thể truy cập từ JavaScript)
- ✅ **Secure flag** trên production (chỉ gửi qua HTTPS)
- ✅ **SameSite=lax** để chống CSRF attacks
- ✅ Token expiration: 30 ngày (có thể điều chỉnh)

### 3. Rate Limiting
- ✅ 5 lần thất bại / 5 phút / email
- ✅ 10 lần thất bại / 5 phút / IP address
- ✅ Track LoginAttempt trong database
- ✅ Automatic unlock sau 5 phút

### 4. Account Security
- ✅ Admin có thể khóa tài khoản (status = LOCKED)
- ✅ User bị khóa không thể login
- ✅ Middleware redirect đến /account-locked
- ✅ Audit log cho mọi hành động quan trọng

### 5. Session Security
- ✅ Validate session ở mọi protected route
- ✅ Check license expiration realtime
- ✅ Automatic logout khi token expires
- ✅ Session theft protection với secure cookies

### 6. OAuth Security
- ✅ Verify OAuth state parameter
- ✅ Validate email từ OAuth provider
- ✅ Auto-create account với role LEARNER
- ✅ Link multiple OAuth providers với cùng email

---

## 7.9. Helper Functions

### File: `src/lib/auth-helpers.ts`

```typescript
import { auth } from "./auth";
import { redirect } from "next/navigation";

// Require Admin role
export async function requireAdmin() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }
  
  if (session.user.role !== "ADMIN") {
    redirect("/403");
  }
  
  return session;
}

// Require Active License
export async function requireActiveLicense() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }
  
  // Admin bypass license check
  if (session.user.role === "ADMIN") {
    return session;
  }
  
  const expiresAt = session.user.licenseExpiresAt;
  if (!expiresAt || new Date(expiresAt) < new Date()) {
    redirect("/license-expired");
  }
  
  return session;
}

// Get current user or null
export async function getCurrentUser() {
  const session = await auth();
  return session?.user || null;
}

// Check if user is admin
export async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}
```

---

## 7.10. Environment Variables

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-at-least-32-characters-long

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/education_db

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Application
NEXT_PUBLIC_URL=http://localhost:3000
```

---

## 7.11. Testing Authentication

### Unit Test: Password Hashing

```typescript
import bcrypt from "bcryptjs";

describe("Password Hashing", () => {
  it("should hash password correctly", async () => {
    const password = "Test123456";
    const hash = await bcrypt.hash(password, 12);
    
    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(await bcrypt.compare("WrongPassword", hash)).toBe(false);
  });
});
```

### Integration Test: Login Flow

```typescript
import { signIn } from "next-auth/react";

describe("Login Flow", () => {
  it("should login with valid credentials", async () => {
    const result = await signIn("credentials", {
      email: "test@example.com",
      password: "Test123456",
      redirect: false
    });
    
    expect(result?.ok).toBe(true);
    expect(result?.error).toBeUndefined();
  });
  
  it("should reject invalid credentials", async () => {
    const result = await signIn("credentials", {
      email: "test@example.com",
      password: "WrongPassword",
      redirect: false
    });
    
    expect(result?.ok).toBe(false);
    expect(result?.error).toBeDefined();
  });
});
```
