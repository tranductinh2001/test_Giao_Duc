# Troubleshooting

## Common Issues and Solutions

---

## Authentication

### Error: "Invalid credentials"

**Symptoms:** Login fails with invalid credentials message

**Solutions:**
1. Verify email exists in database
2. Check password hash matches
3. Clear session cookies and retry
4. Check database connection

### Error: "Session expired"

**Symptoms:** Redirected to login mid-session

**Solutions:**
1. Increase session duration in auth config
2. Check NEXTAUTH_SECRET is consistent
3. Verify JWT token expiration settings
4. Clear browser cookies

### Error: "Account locked"

**Symptoms:** Cannot login after multiple attempts

**Solutions:**
1. Wait for lockout period (usually 15-30 minutes)
2. Contact admin to unlock account
3. Check account status in database

---

## File Upload

### Error: "File too large"

**Symptoms:** Upload fails with size limit error

**Solutions:**
1. Reduce file size below 10MB
2. Compress images before upload
3. Split large documents into parts

### Error: "Invalid file type"

**Symptoms:** Upload fails with type error

**Solutions:**
1. Verify file extension matches allowed types
2. Check MIME type is supported:
   - Documents: DOCX, DOC, PDF
   - Images: PNG, JPG, JPEG, WEBP, BMP, TIFF

### Error: "Upload directory not found"

**Symptoms:** 500 error on upload

**Solutions:**
1. Check `public/uploads/` directory exists
2. Verify directory permissions
3. Recreate directory structure

---

## AI Processing

### Error: "BrightOne API failed"

**Symptoms:** Document parsing fails

**Solutions:**
1. Verify BEEKNOEE_API_KEY is correct
2. Check API quota/limits
3. Try again with exponential backoff
4. Check network connectivity

### Error: "Gemini API error"

**Symptoms:** AI review fails

**Solutions:**
1. Verify GEMINI_API_KEY is valid
2. Check API quota remaining
3. Verify request payload size
4. Check model availability

### Error: "Rate limit exceeded"

**Symptoms:** 429 status code

**Solutions:**
1. Wait for rate limit reset
2. Check Upstash Redis connection
3. Review rate limit configuration
4. Implement request throttling

---

## Database

### Error: "Connection refused"

**Symptoms:** Database connection fails

**Solutions:**
1. Verify DATABASE_URL is correct
2. Check Neon project is active
3. Verify SSL configuration
4. Check firewall rules

### Error: "Prisma migration failed"

**Symptoms:** Database schema out of sync

**Solutions:**
1. Run `npx prisma migrate deploy`
2. Check for migration conflicts
3. Verify database user permissions
4. Reset database if needed

### Error: "Query timeout"

**Symptoms:** Slow queries or timeouts

**Solutions:**
1. Add database indexes
2. Optimize query performance
3. Check database connection pool
4. Increase timeout settings

---

## Workflow

### Error: "Workflow stuck in PENDING"

**Symptoms:** Review doesn't start

**Solutions:**
1. Check workflow service is running
2. Verify database connection
3. Check for deadlocks
4. Restart workflow

### Error: "Workflow failed"

**Symptoms:** Review completes with error

**Solutions:**
1. Check error message in WorkflowSession
2. Verify all required data exists
3. Check AI service availability
4. Retry workflow

---

## Book Intelligence

### Error: "Textbook not found"

**Symptoms:** Matching fails

**Solutions:**
1. Verify textbook exists in database
2. Check textbook isActive = true
3. Rebuild TOC index
4. Verify chapter data exists

### Error: "TOC indexing failed"

**Symptoms:** Cannot index textbook

**Solutions:**
1. Verify PDF file exists and is readable
2. Check PDF is not password protected
3. Verify page count is correct
4. Try rebuilding index

### Error: "Chapter extraction failed"

**Symptoms:** Cannot extract pages

**Solutions:**
1. Verify page range is valid
2. Check PDF file is not corrupted
3. Verify cache directory exists
4. Check disk space

---

## Frontend

### Error: " hydration error"

**Symptoms:** Page doesn't render correctly

**Solutions:**
1. Check for date/time on client vs server
2. Verify CSS class names match
3. Check for random values in render
4. Use client-side only for dynamic content

### Error: "Module not found"

**Symptoms:** Build fails with missing module

**Solutions:**
1. Run `npm install`
2. Clear `.next` cache
3. Check import paths
4. Rebuild project

### Error: "Too many re-renders"

**Symptoms:** Component infinite loop

**Solutions:**
1. Check useEffect dependencies
2. Verify state update logic
3. Use useCallback for functions
4. Check for circular dependencies

---

## Performance

### Slow page load

**Solutions:**
1. Check image sizes and optimize
2. Enable Next.js caching
3. Review bundle size
4. Check database queries

### High memory usage

**Solutions:**
1. Check for memory leaks
2. Verify file cleanup on upload
3. Review image processing
4. Check Redis cache size

---

## Vercel

### Build fails on Vercel

**Solutions:**
1. Check build logs
2. Verify environment variables
3. Check Node.js version compatibility
4. Ensure Prisma generates correctly

### Function timeout

**Solutions:**
1. Increase function timeout
2. Split long-running operations
3. Use background jobs
4. Optimize database queries

### 504 Gateway Timeout

**Solutions:**
1. Check API response time
2. Verify database connection
3. Check for infinite loops
4. Increase function memory

---

## Logging

### Enable Debug Logging

```typescript
// Add to API route
console.log('Debug:', { data });
```

### Check Logs

```bash
# Vercel dashboard
# Functions > select function > Logs
```

---

## Getting Help

### Before Reporting

1. Check error messages in console
2. Review server logs
3. Verify configuration
4. Test with minimal case

### Information to Include

1. Full error message
2. Steps to reproduce
3. Environment details
4. Relevant logs
