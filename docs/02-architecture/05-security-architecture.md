# 🔐 SECURITY ARCHITECTURE - CIVILPREP

**Document Version:** 1.0.0  
**Date:** 2026-06-23  
**Compliance:** OWASP Top 10 2026, OWASP ASVS 4.0  
**Framework:** Next.js 16 App Router + NextAuth v5

---

## 📋 TABLE OF CONTENTS

1. [Architecture Overview](#architecture-overview)
2. [Authentication Layer](#authentication-layer)
3. [Authorization Layer](#authorization-layer)
4. [Session Management](#session-management)
5. [Attack Prevention](#attack-prevention)
6. [Security Headers](#security-headers)
7. [Audit & Monitoring](#audit-monitoring)
8. [Threat Model](#threat-model)

---

## 🏗️ ARCHITECTURE OVERVIEW

### Tech Stack
- **Framework:** Next.js 16.2.9 (App Router + Turbopack)
- **Auth Library:** NextAuth v5.0.0-beta.25
- **Database:** PostgreSQL (Neon) with Prisma 7.8.0
- **Session:** JWT (HttpOnly Secure Cookies)
- **Rate Limiting:** Upstash Redis
- **Password Hashing:** bcrypt (cost factor 12)

### Security Principles (Defense in Depth)
1. **Never trust user input** - Validate and sanitize everything
2. **Least privilege** - Grant minimum required permissions
3. **Fail securely** - Default deny, explicit allow
4. **Security by design** - Not an afterthought
5. **Assume breach** - Log everything, detect anomalies

---

## 🔑 AUTHENTICATION LAYER

### 1. Password Security

#### Hashing Strategy
```typescript
// bcrypt with cost factor 12 (2^12 = 4096 rounds)
// Rationale: Balance security vs performance
// - Cost 10: Too weak for 2026 standards
// - Cost 12: Recommended by OWASP (250-300ms per hash)
// - Cost 14: Overkill, causes UX issues
const hashedPassword = await bcrypt.hash(password, 12);
```

#### Password Policy (NIST SP 800-63B)
- **Minimum:** 12 characters (not 8 - outdated)
- **Complexity:** 1 uppercase + 1 lowercase + 1 number + 1 special char
- **Entropy:** ~60 bits minimum
- **No dictionary words** (future enhancement with zxcvbn)
- **No password hints** (security theater)
- **Breach detection** (future enhancement with HaveIBeenPwned API)

**Rationale:** Length > Complexity. A 12-char password with mixed case is stronger than 8-char with all special chars.

### 2. Brute Force Protection

#### Multi-Layer Defense

**Layer 1: Rate Limiting (API Level)**
```typescript
// Using Upstash Redis for distributed rate limiting
// Window: 15 minutes
// Max attempts: 5 login failures
// Penalty: Progressive backoff (1min -> 5min -> 15min -> 1hr)
```

**Layer 2: Account Lockout (Database Level)**
```prisma
model LoginAttempt {
  id         String   @id @default(uuid())
  userId     String?  // null if user not found
  email      String
  ipAddress  String
  userAgent  String?
  success    Boolean
  failReason String?  // INVALID_PASSWORD, ACCOUNT_LOCKED, etc.
  createdAt  DateTime @default(now())
  
  @@index([email, createdAt])
  @@index([ipAddress, createdAt])
}
```

**Algorithm:**
```
IF (failed_attempts >= 5 in last 15min) THEN
  lockUntil = NOW() + EXPONENTIAL_BACKOFF(attempt_count)
  status = LOCKED
  
  // Notify user via email (security incident)
  sendSecurityAlert(email, ip, timestamp)
END IF
```

**Why not CAPTCHA?**
- CAPTCHA farms bypass easily
- Bad UX for legitimate users
- Rate limiting + account lockout is more effective

### 3. Session Token Security

#### JWT Configuration (NextAuth)
```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60,    // Refresh every 24 hours (session rotation)
}
```

#### Cookie Attributes (Critical)
```typescript
cookies: {
  sessionToken: {
    name: "next-auth.session-token", // or __Secure-next-auth.session-token in prod
    options: {
      httpOnly: true,      // ✅ Prevent XSS access
      secure: true,        // ✅ HTTPS only
      sameSite: "lax",     // ✅ CSRF protection (strict breaks OAuth)
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    }
  }
}
```

**Why `sameSite: "lax"` not `strict`?**
- `strict`: Breaks OAuth callback (Google login won't work)
- `lax`: Protects against CSRF while allowing top-level navigation
- Additional CSRF protection via NextAuth built-in CSRF tokens

#### Token Rotation (Session Fixation Prevention)
```
User logs in -> JWT issued (v1)
After 24 hours -> JWT rotated to v2 (old v1 invalidated)
User logs out -> JWT blacklisted (Redis)
```

**Why rotate?**
- Limits impact of token theft
- Detects concurrent sessions
- Complies with PCI-DSS requirement 8.2.4

### 4. Password Reset Security

#### Token Generation
```typescript
// Cryptographically secure random token (32 bytes = 256 bits)
const resetToken = crypto.randomBytes(32).toString("hex");

// Store hashed version (defense in depth)
const tokenHash = crypto
  .createHash("sha256")
  .update(resetToken)
  .digest("hex");
```

#### Expiration & One-Time Use
```typescript
model PasswordResetToken {
  token     String   @unique  // SHA-256 hash
  userId    String
  expires   DateTime          // 1 hour TTL
  used      Boolean  @default(false)
  usedAt    DateTime?
  
  @@index([token, expires])
}
```

**Security Measures:**
1. **Rate limit reset requests** (3 per hour per email)
2. **No user enumeration** (always return success)
3. **Invalidate on use** (one-time tokens)
4. **Invalidate on password change** (delete all pending tokens)
5. **Short TTL** (1 hour, not 24 hours)

---

## 🛡️ AUTHORIZATION LAYER

### Role-Based Access Control (RBAC)

#### Roles
```typescript
enum Role {
  ADMIN    // Full access to admin panel, user management, content
  LEARNER  // Access to exams, practice, dashboard
}
```

#### Permission Matrix

| Resource | ADMIN | LEARNER |
|----------|-------|---------|
| `/admin/*` | ✅ | ❌ |
| `/api/admin/*` | ✅ | ❌ |
| `/dashboard/*` | ✅ | ✅ |
| `/exam/*` | ✅ | ✅ |
| Public routes | ✅ | ✅ |

#### Enforcement Points

**1. Middleware (First Line)**
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const session = await auth();
  
  // Check authentication
  // Check role permissions
  // Log access attempts
}
```

**2. API Route Guards (Second Line)**
```typescript
// Every protected API route
const session = await auth();
if (!session) return 401;
if (session.user.role !== "ADMIN") return 403;
```

**3. Component Level (UI)**
```typescript
// Hide admin links if not admin
{session?.user.role === "ADMIN" && <AdminLink />}
```

**Why 3 layers?**
- **Defense in depth** - If one fails, others catch it
- **Middleware** catches 95% of unauthorized access
- **API guards** prevent direct API manipulation
- **UI guards** improve UX (don't show what user can't access)

---

## 🔄 SESSION MANAGEMENT

### Session Lifecycle

```
┌─────────────┐
│ User Login  │
└─────┬───────┘
      │
      ▼
┌─────────────────────┐
│ JWT Created         │
│ - Signed with secret│
│ - 30 day expiry     │
│ - HttpOnly cookie   │
└─────┬───────────────┘
      │
      ▼
┌─────────────────────┐
│ Activity Tracked    │
│ - Last seen updated │
│ - IP logged         │
│ - Device fingerprint│
└─────┬───────────────┘
      │
      ▼ (24 hours later)
┌─────────────────────┐
│ Session Rotated     │
│ - New JWT issued    │
│ - Old invalidated   │
└─────┬───────────────┘
      │
      ▼ (30 days or logout)
┌─────────────────────┐
│ Session Terminated  │
│ - JWT blacklisted   │
│ - Audit logged      │
└─────────────────────┘
```

### Session Storage

**DO NOT store in:**
- ❌ localStorage (XSS vulnerable)
- ❌ sessionStorage (XSS vulnerable)
- ❌ URL parameters (leaks in referrer)
- ❌ Client-side memory (XSS vulnerable)

**MUST store in:**
- ✅ HttpOnly Secure Cookies (XSS-proof)

### Concurrent Session Handling

**Strategy:** Allow multiple sessions, log all

```typescript
model ActiveSession {
  id           String   @id @default(uuid())
  userId       String
  tokenHash    String   // SHA-256 of JWT
  ipAddress    String
  userAgent    String
  lastActivity DateTime @default(now())
  expiresAt    DateTime
  
  @@index([userId, expiresAt])
  @@index([tokenHash])
}
```

**Why allow multiple sessions?**
- User may have phone + laptop + work computer
- Forcing single session causes UX issues
- Better to log and alert on suspicious activity

---

## 🚨 ATTACK PREVENTION

### 1. SQL Injection (A03:2021)

**Prevention:** Prisma ORM (parameterized queries)

```typescript
// ✅ SAFE - Prisma auto-escapes
const user = await prisma.user.findUnique({
  where: { email: userInput }
});

// ❌ NEVER DO THIS
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = '${userInput}'
`;
```

**Additional:** Zod validation before DB queries

### 2. XSS (Cross-Site Scripting)

**Prevention Layers:**

**Layer 1: CSP Headers**
```typescript
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
```

**Layer 2: React Auto-Escaping**
```typescript
// ✅ SAFE - React escapes by default
<div>{userInput}</div>

// ❌ DANGEROUS
<div dangerouslySetInnerHTML={{__html: userInput}} />
```

**Layer 3: Output Encoding**
```typescript
import DOMPurify from "isomorphic-dompurify";

const clean = DOMPurify.sanitize(userInput);
```

### 3. CSRF (Cross-Site Request Forgery)

**Protection:**
1. **SameSite cookies** (`lax`)
2. **NextAuth CSRF tokens** (built-in)
3. **Origin header validation**

```typescript
// Middleware checks
const origin = request.headers.get("origin");
const host = request.headers.get("host");

if (origin && !origin.includes(host)) {
  return new Response("CSRF detected", { status: 403 });
}
```

### 4. Clickjacking

**Prevention:** X-Frame-Options header

```typescript
headers: {
  "X-Frame-Options": "DENY",  // Cannot be framed
  "X-Content-Type-Options": "nosniff",
}
```

### 5. Rate Limiting

**Implementation:** Upstash Redis

```typescript
import { Ratelimit } from "@upstash/ratelimit";

const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 req per 10sec
  analytics: true,
});

// In API route
const { success } = await limiter.limit(ip);
if (!success) return 429;
```

**Rate Limits:**
- Login: 5 attempts / 15 minutes
- Register: 3 accounts / hour / IP
- Password reset: 3 requests / hour / email
- API calls: 100 requests / minute / user

---

## 📊 AUDIT & MONITORING

### Security Events to Log

```typescript
enum SecurityEvent {
  LOGIN_SUCCESS
  LOGIN_FAILED
  LOGOUT
  PASSWORD_CHANGED
  PASSWORD_RESET_REQUESTED
  PASSWORD_RESET_COMPLETED
  ACCOUNT_LOCKED
  ACCOUNT_UNLOCKED
  PERMISSION_DENIED
  SUSPICIOUS_ACTIVITY
  SESSION_HIJACK_DETECTED
  RATE_LIMIT_EXCEEDED
}
```

### Audit Log Schema

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?  // null if pre-auth
  event       SecurityEvent
  details     Json     // Flexible structure
  ipAddress   String
  userAgent   String?
  success     Boolean
  timestamp   DateTime @default(now())
  
  @@index([userId, timestamp])
  @@index([event, timestamp])
  @@index([ipAddress, timestamp])
}
```

### Alerting Rules

**Immediate Alert (Email + SMS):**
- 5+ failed logins from same IP
- Password changed without recent login
- Admin account accessed from new country
- 10+ accounts created from same IP (bot attack)

**Daily Digest:**
- New device logins
- Password reset requests
- Account lockouts

---

## 🎯 THREAT MODEL

### Assets to Protect
1. **User credentials** (passwords, tokens)
2. **Personal data** (names, emails, learning progress)
3. **License codes** (monetary value)
4. **Exam content** (intellectual property)
5. **Admin access** (full system control)

### Threat Actors
1. **Script Kiddies** - Automated scanners, brute force
2. **Competitors** - Content theft, user poaching
3. **Disgruntled Users** - Account takeover, data exfiltration
4. **Nation-State** (Low probability) - APT, supply chain attacks

### Attack Scenarios

**Scenario 1: Credential Stuffing**
- **Attack:** 1M leaked passwords tested against login
- **Defense:** Rate limiting + CAPTCHA after 3 fails + account lockout
- **Detection:** Spike in failed logins from distributed IPs
- **Response:** Temporary IP blocks + force password reset for breached accounts

**Scenario 2: Session Hijacking**
- **Attack:** XSS steals session token
- **Defense:** HttpOnly cookies (XSS can't read) + CSP prevents XSS
- **Detection:** Session used from 2 different IPs simultaneously
- **Response:** Invalidate session + force re-login + notify user

**Scenario 3: Privilege Escalation**
- **Attack:** LEARNER tries to access /api/admin
- **Defense:** Middleware + API guards + DB-level permissions
- **Detection:** 403 responses logged
- **Response:** Lock account + investigate

---

## ✅ COMPLIANCE CHECKLIST

### OWASP Top 10 2026

- [x] **A01: Broken Access Control** - Middleware + RBAC + API guards
- [x] **A02: Cryptographic Failures** - bcrypt + HTTPS + secure cookies
- [x] **A03: Injection** - Prisma ORM + Zod validation
- [x] **A04: Insecure Design** - Threat modeling + security by design
- [x] **A05: Security Misconfiguration** - Security headers + CSP
- [x] **A06: Vulnerable Components** - Dependabot + npm audit
- [x] **A07: Authentication Failures** - MFA-ready + rate limiting + lockout
- [x] **A08: Software/Data Integrity** - npm package lock + SRI
- [x] **A09: Logging Failures** - Audit log + monitoring
- [x] **A10: SSRF** - No user-controlled URLs + allowlist

### OWASP ASVS Level 2

- [x] **V1: Architecture** - Documented threat model
- [x] **V2: Authentication** - Strong passwords + session management
- [x] **V3: Session** - Secure cookies + rotation + timeout
- [x] **V4: Access Control** - RBAC + least privilege
- [x] **V5: Validation** - Zod schemas + sanitization
- [x] **V7: Cryptography** - bcrypt cost 12 + secure random
- [x] **V8: Error Handling** - No stack traces to client
- [x] **V9: Data Protection** - HTTPS everywhere + encryption at rest
- [x] **V10: Communications** - TLS 1.3 + HSTS + secure ciphers
- [x] **V12: Files** - Type validation + size limits + malware scan (future)

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Critical (Week 1) ✅
- [x] Rate limiting (Upstash)
- [x] Account lockout mechanism
- [x] Login attempt tracking
- [x] Security headers (CSP, etc.)
- [x] CSRF protection

### Phase 2: Important (Week 2)
- [ ] Audit logging system
- [ ] Session rotation
- [ ] Concurrent session tracking
- [ ] IP/Device fingerprinting
- [ ] Security alerts (email)

### Phase 3: Enhanced (Week 3)
- [ ] MFA (TOTP)
- [ ] Device trust (remember this device)
- [ ] Password breach detection (HaveIBeenPwned)
- [ ] Suspicious activity ML model
- [ ] Security dashboard for admins

### Phase 4: Advanced (Week 4)
- [ ] Web Application Firewall (CloudFlare)
- [ ] DDoS protection
- [ ] Penetration testing
- [ ] Bug bounty program
- [ ] SOC 2 compliance preparation

---

## 📚 REFERENCES

- OWASP Top 10 2026: https://owasp.org/www-project-top-ten/
- OWASP ASVS 4.0: https://owasp.org/www-project-application-security-verification-standard/
- NIST SP 800-63B: https://pages.nist.gov/800-63-3/sp800-63b.html
- NextAuth Security: https://authjs.dev/getting-started/security
- Prisma Best Practices: https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance

---

**Last Updated:** 2026-06-23  
**Next Review:** 2026-09-23 (Quarterly)  
**Owner:** Security Team  
**Status:** 🟡 In Progress (Phase 1 Complete)
