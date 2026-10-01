# Troubleshooting Guide

## Next.js 16 Edge Runtime Issues

### Problem: `Failed to load external module node:util/types`

**Symptom:**
```
⨯ Error: Failed to load external module node:util/types: TypeError: Native module not found: node:util/types
```

**Root Cause:**
- Next.js 16 middleware ALWAYS runs in Edge Runtime (cannot be changed to Node.js runtime)
- Edge Runtime does NOT support Node.js native modules (`util`, `crypto`, `fs`, etc.)
- Turbopack may bundle transitive dependencies into Edge Runtime even if not directly imported

**Solutions:**

1. **Avoid middleware entirely** - Use `next.config.ts` headers instead:
   ```typescript
   // next.config.ts
   async headers() {
     return [{
       source: "/:path*",
       headers: [
         { key: "X-Content-Type-Options", value: "nosniff" },
         { key: "X-Frame-Options", value: "DENY" },
       ],
     }];
   }
   ```

2. **If middleware is required** - Keep it ultra-minimal:
   - ✅ Only import from `next/server`
   - ❌ Never import: `prisma`, `bcrypt`, `crypto`, `fs`, or any library using Node.js modules
   - ❌ Never import your own files that use above dependencies

3. **Force Node.js runtime on API routes** (not middleware):
   ```typescript
   // src/app/api/*/route.ts
   export const runtime = "nodejs"; // Only works for API routes, NOT middleware
   ```

4. **Clear `.next` cache after changes:**
   ```bash
   rm -rf .next && npm run dev
   ```

---

## Testing Checklist After Code Changes

Before reporting completion, ALWAYS:

1. ✅ **Build succeeds**: `npm run build`
2. ✅ **Dev server starts**: `npm run dev` (wait 10 seconds, check for errors)
3. ✅ **Visit http://localhost:3000** in browser (check console for runtime errors)
4. ✅ **Test the changed feature** (manual smoke test)
5. ✅ **Check logs** for warnings/errors

**Why this matters:**
- Build-time errors ≠ runtime errors
- TypeScript passing ≠ code working
- Server starting ≠ routes functioning

**Example workflow:**
```bash
# After making changes
npm run build                # Must pass
rm -rf .next                 # Clear cache
npm run dev                  # Wait 10s, check output
# Then open browser and test the feature
```

---

## Common Issues

### Issue: Middleware causes Edge Runtime errors

**Quick check:**
```bash
# Test without middleware
mv src/middleware.ts src/middleware.ts.disabled
rm -rf .next && npm run dev
```

If it works → middleware is the problem. Rewrite it to be Edge-compatible or remove it.

---

### Issue: Build passes but runtime fails

**Common causes:**
1. Environment variables missing at runtime (check `.env`)
2. Database not accessible
3. Dependency using Node.js modules in Edge Runtime context

**Debug steps:**
```bash
# Check environment variables
cat .env

# Check database connection
npx prisma studio

# Check build output
npm run build
# Look for warnings about Edge Runtime
```

---

## Prevention Best Practices

### 1. Test immediately after changes
Don't wait until "all done" - test each major change:
- After adding new dependency → test build + dev
- After modifying middleware → test dev server
- After changing API routes → test the endpoint

### 2. Use the right runtime
- **Edge Runtime** (default for middleware): No Node.js modules, fast, global deployment
- **Node.js Runtime** (API routes): Full Node.js access, database, crypto, fs

### 3. Keep middleware minimal
Middleware runs on EVERY request. Keep it:
- ✅ Lightweight (header manipulation, redirects)
- ❌ No database queries
- ❌ No heavy computation
- ❌ No Node.js modules

---

## Emergency Recovery

If dev server won't start:

```bash
# 1. Clear all caches
rm -rf .next
rm -rf node_modules/.cache

# 2. Disable middleware temporarily
mv src/middleware.ts src/middleware.ts.disabled

# 3. Restart
npm run dev

# 4. If still fails, check recent changes
git diff HEAD~1

# 5. Revert suspect files one by one
git checkout HEAD~1 -- src/middleware.ts
```

---

## Resources

- [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)
- [Middleware Limitations](https://nextjs.org/docs/app/building-your-application/routing/middleware#runtime)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
