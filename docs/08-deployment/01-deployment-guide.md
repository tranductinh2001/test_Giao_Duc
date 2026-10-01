# 15. Hướng dẫn Deployment (Production Deployment Guide)

Tài liệu này hướng dẫn chi tiết cách triển khai hệ thống lên môi trường production sử dụng **Vercel** (Frontend/Backend) và **Supabase/Neon** (PostgreSQL Database).

---

## 15.1. Kiến trúc Deployment

```mermaid
graph LR
    A[User Browser] --> B[Vercel Edge Network]
    B --> C[Next.js App on Vercel]
    C --> D[PostgreSQL on Supabase]
    C --> E[Upstash Redis]
    C --> F[Google OAuth]
    C --> G[SMTP Email Service]
```

---

## 15.2. Prerequisites (Yêu cầu trước khi deploy)

### 1. Tài khoản cần có:
- ✅ [Vercel Account](https://vercel.com) (Free tier)
- ✅ [Supabase Account](https://supabase.com) hoặc [Neon](https://neon.tech) (Free tier)
- ✅ [Upstash Redis](https://upstash.com) (Free tier) - cho rate limiting
- ✅ [Google Cloud Console](https://console.cloud.google.com) - cho OAuth
- ✅ SMTP Email service (Gmail, SendGrid, Resend)

### 2. Tools cần cài đặt:
```bash
npm install -g vercel
```

---

## 15.3. Bước 1: Setup PostgreSQL Database

### Option A: Supabase (Khuyến nghị)

1. **Tạo project mới trên Supabase:**
   - Truy cập https://supabase.com/dashboard
   - Click "New Project"
   - Chọn region gần nhất (Singapore cho VN)
   - Đặt mật khẩu database mạnh

2. **Lấy Database URL:**
   - Vào Settings > Database
   - Copy "Connection string" (URI format)
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`

3. **Enable Connection Pooling:**
   - Vào Database > Connection Pooling
   - Mode: "Transaction"
   - Copy pooled connection string

### Option B: Neon

1. **Tạo project trên Neon:**
   - Truy cập https://neon.tech
   - Click "Create a project"
   - Chọn region gần nhất

2. **Lấy Connection String:**
   - Copy connection string có dạng:
   - `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb`

---

## 15.4. Bước 2: Setup Google OAuth

1. **Tạo OAuth Client ID:**
   - Truy cập [Google Cloud Console](https://console.cloud.google.com)
   - Create new project hoặc chọn project có sẵn
   - Enable "Google+ API"
   
2. **Configure OAuth Consent Screen:**
   - APIs & Services > OAuth consent screen
   - User Type: External
   - App name: "Education Platform"
   - Add scopes: `email`, `profile`

3. **Create OAuth 2.0 Client:**
   - APIs & Services > Credentials
   - Create Credentials > OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/callback/google
     https://your-domain.vercel.app/api/auth/callback/google
     ```
   - Copy **Client ID** và **Client Secret**

---

## 15.5. Bước 3: Setup Upstash Redis

1. **Tạo Redis Database:**
   - Truy cập https://console.upstash.com
   - Create database
   - Region: chọn gần nhất
   - Type: Regional (Free tier)

2. **Copy credentials:**
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN

---

## 15.6. Bước 4: Configure Environment Variables

### File `.env.local` (Development)

```env
# Database
DATABASE_URL="postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-random-32-char-string-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Email SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="Education Platform <noreply@yourdomain.com>"

# Application
NEXT_PUBLIC_URL="http://localhost:3000"
```

### Vercel Environment Variables (Production)

Truy cập Vercel Dashboard > Project Settings > Environment Variables

**Thêm các biến sau:**

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | Connection string từ Supabase | Production, Preview |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Production |
| `NEXTAUTH_SECRET` | Random 32+ chars | Production, Preview |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Production, Preview |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | Production, Preview |
| `UPSTASH_REDIS_REST_URL` | Upstash URL | Production, Preview |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Token | Production, Preview |
| `SMTP_HOST` | SMTP server | Production |
| `SMTP_PORT` | `587` | Production |
| `SMTP_USER` | SMTP username | Production |
| `SMTP_PASSWORD` | SMTP password | Production |
| `SMTP_FROM` | From email address | Production |
| `NEXT_PUBLIC_URL` | `https://your-domain.vercel.app` | Production |

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## 15.7. Bước 5: Database Migration

### Chạy migrations trên Production Database:

```bash
# 1. Set DATABASE_URL môi trường production
export DATABASE_URL="postgresql://postgres:..."

# 2. Run migrations
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. (Optional) Seed initial data
npx prisma db seed
```

### Seed script (`prisma/seed.ts`)

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Tạo Admin account mặc định
  const adminPassword = await bcrypt.hash("Admin@123456", 12);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "System Administrator",
      password: adminPassword,
      role: "ADMIN",
      status: "ACTIVE"
    }
  });

  console.log("✅ Created admin user:", admin.email);

  // Tạo categories mẫu
  const rootCategory = await prisma.category.create({
    data: {
      name: "Kiến thức chung",
      description: "Các môn kiến thức chung cho thi công chức"
    }
  });

  await prisma.category.createMany({
    data: [
      {
        name: "Luật Viên chức 2010",
        parentId: rootCategory.id
      },
      {
        name: "Luật Công chức 2008",
        parentId: rootCategory.id
      },
      {
        name: "Hiến pháp 2013",
        parentId: rootCategory.id
      }
    ]
  });

  console.log("✅ Created sample categories");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 15.8. Bước 6: Deploy lên Vercel

### Method 1: Deploy qua Vercel CLI

```bash
# 1. Login vào Vercel
vercel login

# 2. Link project với Vercel
vercel link

# 3. Deploy
vercel --prod
```

### Method 2: Deploy qua Git (GitHub Integration)

1. **Push code lên GitHub:**
   ```bash
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```

2. **Import project vào Vercel:**
   - Truy cập https://vercel.com/new
   - Import repository từ GitHub
   - Configure project:
     - Framework Preset: Next.js
     - Root Directory: `./`
     - Build Command: `npm run build`
     - Output Directory: `.next`
   - Add Environment Variables (theo bước 15.6)
   - Click "Deploy"

3. **Vercel sẽ tự động:**
   - Build project
   - Run `prisma generate`
   - Deploy lên production
   - Tạo SSL certificate
   - Generate production URL

---

## 15.9. Bước 7: Setup Custom Domain (Optional)

1. **Mua domain từ Namecheap/GoDaddy/CloudFlare**

2. **Add domain vào Vercel:**
   - Vercel Dashboard > Project > Settings > Domains
   - Add domain: `yourdomain.com`

3. **Configure DNS:**
   - Thêm CNAME record:
     ```
     Type: CNAME
     Name: @
     Value: cname.vercel-dns.com
     ```

4. **Update environment variables:**
   - `NEXTAUTH_URL` → `https://yourdomain.com`
   - `NEXT_PUBLIC_URL` → `https://yourdomain.com`

5. **Update Google OAuth redirect URIs:**
   - Thêm: `https://yourdomain.com/api/auth/callback/google`

---

## 15.10. Post-Deployment Checklist

### Security
- ✅ HTTPS enabled (Vercel tự động)
- ✅ Environment variables đã set đúng
- ✅ NEXTAUTH_SECRET đủ mạnh (32+ chars)
- ✅ Database password mạnh
- ✅ Google OAuth redirect URIs chính xác

### Functionality
- ✅ Đăng ký tài khoản mới hoạt động
- ✅ Đăng nhập Email/Password hoạt động
- ✅ Đăng nhập Google OAuth hoạt động
- ✅ Upload câu hỏi hoạt động
- ✅ Tạo đề thi hoạt động
- ✅ Làm bài thi hoạt động
- ✅ Kích hoạt license hoạt động
- ✅ Email notifications gửi được

### Performance
- ✅ Page load time < 2s
- ✅ API response time < 200ms
- ✅ Database queries optimized (có indexes)
- ✅ Images optimized

### Monitoring
- ✅ Setup Vercel Analytics
- ✅ Setup error tracking (Sentry)
- ✅ Check audit logs
- ✅ Monitor login attempts

---

## 15.11. Monitoring & Logging

### Vercel Analytics

Vercel tự động enable:
- Real User Monitoring (RUM)
- Web Vitals tracking
- Traffic analytics

Xem tại: Vercel Dashboard > Project > Analytics

### Error Tracking với Sentry (Optional)

1. **Create Sentry project:**
   - https://sentry.io
   - Create new project: Next.js

2. **Install Sentry SDK:**
   ```bash
   npm install @sentry/nextjs
   ```

3. **Configure Sentry:**
   ```bash
   npx @sentry/wizard -i nextjs
   ```

4. **Add SENTRY_DSN to Vercel:**
   ```
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

### Database Monitoring

**Supabase:**
- Database > Logs
- Monitor slow queries
- Check connection pool usage

**Prisma:**
```typescript
// Enable query logging in production
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "production" 
    ? ["error", "warn"]
    : ["query", "error", "warn"]
});
```

---

## 15.12. Backup Strategy

### Database Backups (Supabase)

Supabase tự động backup:
- Daily backups (giữ 7 ngày)
- Point-in-time recovery (PITR)

**Manual backup:**
```bash
# Export database
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql

# Import backup
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

### Code Backups

- ✅ Git repository là source of truth
- ✅ Push code thường xuyên
- ✅ Tag releases: `git tag v1.0.0`

---

## 15.13. Scaling Strategy

### Database Scaling

**Vertical Scaling:**
- Supabase Free: 500MB, 2GB bandwidth
- Supabase Pro: 8GB RAM, 50GB storage, unlimited bandwidth

**Connection Pooling:**
- Enable Supabase connection pooler
- Use transaction mode cho Next.js API routes

### Vercel Scaling

Vercel tự động scale:
- Serverless functions
- Edge network CDN
- Global deployment

**Limits (Free tier):**
- 100GB bandwidth/month
- 1000 serverless function invocations/hour

**Nâng cấp Pro khi:**
- Bandwidth > 100GB/month
- Cần analytics nâng cao
- Cần preview deployments unlimited

---

## 15.14. CI/CD Pipeline (Optional)

### GitHub Actions Workflow

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linter
        run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 15.15. Rollback Strategy

### Vercel Instant Rollback

Nếu deploy mới có lỗi:

1. Truy cập Vercel Dashboard > Deployments
2. Tìm deployment trước đó working
3. Click "Promote to Production"
4. Deployment cũ được restore ngay lập tức

### Database Migration Rollback

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Apply previous state
npx prisma migrate deploy
```

---

## 15.16. Cost Estimation (Monthly)

| Service | Free Tier | Paid (if needed) |
|---------|-----------|------------------|
| Vercel | 100GB bandwidth | Pro: $20/month |
| Supabase | 500MB DB, 2GB bandwidth | Pro: $25/month |
| Upstash Redis | 10K commands/day | Pay as you go |
| Domain | - | ~$10-15/year |
| Email (SendGrid) | 100 emails/day | Essentials: $15/month |
| **Total** | **$0/month** | **$60-70/month** |

---

## 15.17. Troubleshooting

### Issue 1: "Invalid redirect URI"

**Nguyên nhân:** Google OAuth redirect URI chưa đúng

**Fix:**
- Kiểm tra Google Console > Credentials
- Thêm đúng URL: `https://your-domain.vercel.app/api/auth/callback/google`
- Wait 5 phút để Google cập nhật

### Issue 2: "Database connection failed"

**Nguyên nhân:** DATABASE_URL sai hoặc database chưa allow connections

**Fix:**
- Kiểm tra connection string đúng format
- Supabase: Enable connection pooling
- Test connection: `psql $DATABASE_URL`

### Issue 3: "Prisma Client not generated"

**Nguyên nhân:** Prisma chưa generate sau deploy

**Fix:**
```bash
npm run vercel-build
# hoặc
npx prisma generate
```

### Issue 4: "Rate limit exceeded"

**Nguyên nhân:** Quá nhiều requests từ 1 IP

**Fix:**
- Kiểm tra Upstash Redis đã connect
- Tăng rate limit nếu cần
- Check audit logs xem có attack không

---

## 15.18. Production Launch Checklist

### Pre-Launch
- ✅ Tất cả tests pass
- ✅ Environment variables đã set
- ✅ Database migrations đã chạy
- ✅ Admin account đã tạo
- ✅ Sample data đã seed
- ✅ Custom domain đã setup
- ✅ SSL certificate active

### Launch Day
- ✅ Deploy to production
- ✅ Test critical user flows
- ✅ Monitor error logs
- ✅ Check performance metrics
- ✅ Announce to users

### Post-Launch
- ✅ Monitor traffic 24h đầu
- ✅ Fix bugs nếu có
- ✅ Collect user feedback
- ✅ Plan next iterations

