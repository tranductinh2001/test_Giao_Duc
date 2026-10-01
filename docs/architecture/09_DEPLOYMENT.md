# Deployment

## Overview

The Education Platform is designed for deployment on Vercel with PostgreSQL (Neon) and Upstash Redis.

---

## Environment

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host.neon.tech/db?sslmode=require"

# Authentication
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="https://your-domain.com"

# AI Services
GEMINI_API_KEY="your-gemini-api-key"
BEEKNOEE_API_KEY="your-beeknoee-api-key"
BEE_BASE_URL="https://platform.beeknoee.com"

# Rate Limiting
UPSTASH_REDIS_REST_URL="your-redis-url"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

### Optional Variables

```bash
# Email (SMTP)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user"
SMTP_PASS="password"
SMTP_FROM="noreply@example.com"

# Storage (if using cloud storage)
UPLOAD_DIR="public/uploads"
```

---

## Vercel Deployment

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com)
2. Import GitHub repository
3. Configure project settings

### 2. Environment Variables

Add all required environment variables in Vercel dashboard:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GEMINI_API_KEY`
- `BEEKNOEE_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### 3. Build Settings

```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### 4. Deploy

Click "Deploy" to trigger deployment.

---

## Database Setup

### Neon PostgreSQL

1. Create account at [Neon](https://neon.tech)
2. Create new project
3. Get connection string
4. Add to environment variables

### Run Migrations

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

### Generate Prisma Client

```bash
npx prisma generate
```

---

## Redis Setup

### Upstash

1. Create account at [Upstash](https://upstash.com)
2. Create new Redis database
3. Get REST URL and token
4. Add to environment variables

---

## Build Configuration

### Build Script

**File:** `package.json`

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

### Next.js Config

**File:** `next.config.ts`

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Turbopack for faster builds
    turbo: {
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
  },
  images: {
    domains: ['your-cdn.com'],
  },
}

export default nextConfig
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Build succeeds locally
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] No TypeScript errors

### Post-Deployment

- [ ] Verify homepage loads
- [ ] Test authentication flow
- [ ] Test file upload
- [ ] Test AI review workflow
- [ ] Verify database connection

---

## Monitoring

### Vercel Analytics

Built-in analytics at vercel.com/dashboard

### Error Tracking

```typescript
// In API routes
console.error('Error:', error);
```

### Performance

- Core Web Vitals monitored by Vercel
- Custom metrics in application

---

## Troubleshooting

### Build Failures

1. Check environment variables
2. Verify Node version (18+)
3. Check Prisma generation

### Runtime Errors

1. Check Vercel function logs
2. Verify database connection
3. Check API key permissions

### Slow Performance

1. Enable caching
2. Check database queries
3. Review function execution time

---

## Rollback

### Vercel Dashboard

1. Go to Deployments
2. Find previous working deployment
3. Click "Promote to Production"

---

## CI/CD

### GitHub Actions (Optional)

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```
