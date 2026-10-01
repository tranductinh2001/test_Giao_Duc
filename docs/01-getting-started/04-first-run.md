# First Run

Start the Education Platform and verify everything works correctly.

---

## Start Development Server

```bash
npm run dev
```

**Expected output:**
```
   ▲ Next.js 16.0.0
   - Local:        http://localhost:3000
   - Network:      http://192.168.1.100:3000

 ✓ Ready in 2.3s
```

---

## Verify Installation

### 1. Open Homepage

Navigate to [http://localhost:3000](http://localhost:3000)

**You should see:**
- Education Platform homepage
- Navigation menu (Home, Exams, Questions, Admin)
- Login/Register buttons

---

### 2. Test Login

**Default admin credentials:**
- **Email:** admin@example.com
- **Password:** admin123

**Steps:**
1. Click "Đăng nhập" (Login)
2. Enter credentials
3. Click "Đăng nhập" button

**Expected result:**
- Redirect to dashboard
- See "Chào mừng, Admin" (Welcome, Admin)
- Navigation shows admin menu

---

### 3. Check Admin Panel

Navigate to [http://localhost:3000/admin](http://localhost:3000/admin)

**You should see:**
- Dashboard with statistics
- Sidebar menu:
  - Tổng quan (Overview)
  - Câu hỏi (Questions)
  - Đề thi (Exams)
  - Người dùng (Users)
  - Giáo án (Lesson Plans)
  - Cấu hình (Settings)

---

### 4. Test Database Connection

Open Prisma Studio:
```bash
npx prisma studio
```

**Expected:**
- Opens [http://localhost:5555](http://localhost:5555)
- Shows all tables with data
- Can browse Users, Questions, Categories, etc.

---

### 5. Verify File Uploads

Check upload directories exist:
```bash
ls -la uploads/
```

**Expected output:**
```
drwxr-xr-x  5 user  staff   160 Jun 27 10:00 .
drwxr-xr-x 20 user  staff   640 Jun 27 09:58 ..
drwxr-xr-x  2 user  staff    64 Jun 27 09:59 exports
drwxr-xr-x  2 user  staff    64 Jun 27 09:59 lesson-plans
drwxr-xr-x  2 user  staff    64 Jun 27 09:59 temp
```

---

## Test Core Features

### 1. Question Bank

**Steps:**
1. Go to [http://localhost:3000/admin/questions](http://localhost:3000/admin/questions)
2. Should see list of 50 sample questions
3. Click "Thêm câu hỏi" (Add question)
4. Fill form and submit
5. New question appears in list

---

### 2. Create Exam

**Steps:**
1. Go to [http://localhost:3000/admin/exams/new](http://localhost:3000/admin/exams/new)
2. Fill exam details:
   - Title: "Test Exam"
   - Duration: 60 minutes
   - Question count: 10
3. Click "Tạo đề thi" (Create exam)
4. Exam created successfully

---

### 3. Take Exam

**Steps:**
1. Go to [http://localhost:3000/exams](http://localhost:3000/exams)
2. Click on any exam
3. Click "Bắt đầu làm bài" (Start exam)
4. Answer questions
5. Submit exam
6. See score and review

---

### 4. Test Lesson Plan Upload (if Gemini configured)

**Steps:**
1. Create sample DOCX file with Vietnamese lesson plan structure
2. Go to [http://localhost:3000/lesson-plans/upload](http://localhost:3000/lesson-plans/upload)
3. Drag & drop file
4. Fill metadata
5. Click "Upload giáo án"
6. File uploads successfully

---

## Check Logs

### Development Logs

In the terminal where you ran `npm run dev`, you should see:

```
GET /api/auth/session 200 in 45ms
POST /api/questions 201 in 123ms
GET /api/exams 200 in 67ms
```

No errors should appear.

---

### Database Query Logs (if enabled)

If `DATABASE_LOGGING=true` in `.env`:

```
prisma:query SELECT * FROM "User" WHERE "email" = $1
prisma:query INSERT INTO "Question" ...
```

---

## Build Production Version

Test that production build works:

```bash
# Build
npm run build

# Expected output:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages (25/25)
# ✓ Finalizing page optimization

# Run production server
npm run start
```

Navigate to [http://localhost:3000](http://localhost:3000) and verify it works.

---

## Common Issues

### Issue: Port 3000 already in use

**Solution:**
```bash
# Kill process using port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

---

### Issue: "Module not found: Can't resolve 'X'"

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

---

### Issue: Database connection error

**Solution:**
```bash
# Check PostgreSQL running
pg_isready

# Test connection
psql $DATABASE_URL

# If fails, check .env DATABASE_URL is correct
cat .env | grep DATABASE_URL
```

---

### Issue: Authentication not working

**Solution:**
```bash
# Check NEXTAUTH_SECRET is set
cat .env | grep NEXTAUTH_SECRET

# If missing, generate and add:
openssl rand -base64 32
# Add to .env: NEXTAUTH_SECRET="generated-secret"

# Restart server
npm run dev
```

---

### Issue: Build fails with TypeScript errors

**Solution:**
```bash
# Check for type errors
npm run type-check

# Fix errors shown
# Then rebuild
npm run build
```

---

## Performance Check

### Development Mode
- Homepage load: < 1 second
- API response: < 500ms
- Database queries: < 100ms

### Production Mode
- Homepage load: < 500ms
- API response: < 200ms
- First paint: < 1 second

**If slower:**
- Check database indexes: `npm run db:check-indexes`
- Profile with Chrome DevTools
- Check network latency

---

## Next Steps

✅ **Platform is running!**

**Now you can:**

1. **Explore features:**
   - Browse all pages
   - Try user flows
   - Test different roles

2. **Learn the architecture:**
   - Read [Architecture Overview](../02-architecture/README.md)
   - Study [Database Schema](../03-database/README.md)
   - Review [API Documentation](../04-api/README.md)

3. **Start developing:**
   - Check [Development Guide](../07-development/README.md)
   - Follow [Coding Standards](../07-development/01-coding-standards.md)
   - Set up your IDE

4. **Deploy to production:**
   - Read [Deployment Guide](../08-deployment/README.md)
   - Configure production environment
   - Set up monitoring

---

## Quick Command Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Run production server
npm run lint             # Run ESLint
npm run type-check       # Check TypeScript

# Database
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create migration
npx prisma db seed       # Seed database
npx prisma generate      # Generate Prisma Client

# Maintenance
npx kill-port 3000       # Kill port 3000
rm -rf .next             # Clear Next.js cache
rm -rf node_modules      # Remove dependencies
npm install              # Reinstall dependencies
```

---

**Congratulations! Your Education Platform is ready to use! 🎉**

**Questions?** Check the [Troubleshooting Guide](../07-development/05-troubleshooting.md)
