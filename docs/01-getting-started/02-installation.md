# Installation

Step-by-step guide to installing the Education Platform on your local machine.

---

## 1. Clone Repository

```bash
# HTTPS
git clone https://github.com/yourusername/education-platform.git

# Or SSH (if you have keys set up)
git clone git@github.com:yourusername/education-platform.git

# Navigate into directory
cd education-platform
```

---

## 2. Install Dependencies

```bash
# Using npm (default)
npm install

# Or using pnpm (faster)
pnpm install

# Or using yarn
yarn install
```

**This will install:**
- Next.js 16
- React 19
- Prisma ORM
- TypeScript
- Tailwind CSS
- shadcn/ui components
- 50+ other packages

**Expected time:** 2-5 minutes depending on internet speed

---

## 3. Database Setup

### Create Database

**Using psql:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE education_platform;

# Create user (if not already created)
CREATE USER education_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE education_platform TO education_user;

# Exit
\q
```

**Or using command line:**
```bash
createdb education_platform
```

---

### Configure Database Connection

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

**Update the DATABASE_URL:**
```env
DATABASE_URL="postgresql://education_user:your_secure_password@localhost:5432/education_platform"
```

**Format explained:**
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

---

## 4. Run Database Migrations

```bash
# Apply all migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

**This creates:**
- 35+ tables
- Indexes for performance
- Foreign key relationships
- Enum types

**Expected time:** 10-30 seconds

---

## 5. Seed Database (Optional but Recommended)

```bash
# Run seed script
npx prisma db seed
```

**This creates:**
- Admin user (email: admin@example.com, password: admin123)
- 5 sample categories
- 10 sample subjects
- 50 sample questions
- 3 license types (Free, Premium, Pro)
- Sample review rules for lesson plans

**Expected time:** 5-10 seconds

---

## 6. Seed Lesson Plan Review Rules (Optional)

If you want to use the Lesson Plan Review module:

```bash
# Using psql
psql $DATABASE_URL -f prisma/seed-rules.sql

# Or manually
psql -U education_user -d education_platform -f prisma/seed-rules.sql
```

**This adds:**
- 1 rule set: "Công văn 5512"
- 10 review rules for Vietnamese lesson plans

---

## 7. Create Upload Directories

```bash
# Create directories for file uploads
mkdir -p uploads/lesson-plans
mkdir -p uploads/exports
mkdir -p uploads/temp

# Set permissions (Linux/macOS)
chmod 755 uploads
chmod 755 uploads/*
```

**On Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force -Path uploads/lesson-plans
New-Item -ItemType Directory -Force -Path uploads/exports
New-Item -ItemType Directory -Force -Path uploads/temp
```

---

## 8. Verify Installation

```bash
# Check database connection
npx prisma studio

# This should open http://localhost:5555
# You should see all tables listed
```

**Expected tables:**
- User, UserProfile, Session, Account
- Question, QuestionOption, Category, Subject
- Exam, ExamAttempt, ExamQuestion, ExamAnswer
- LessonPlan, LessonPlanSection, Annotation
- License, UserLicense
- Badge, Achievement, Leaderboard
- And more...

---

## 9. Build Verification (Optional)

```bash
# Test that the build works
npm run build

# This should complete without errors
# Expected time: 30-60 seconds
```

---

## Troubleshooting

### Issue: "Cannot find module 'prisma'"

**Solution:**
```bash
npm install --save-dev prisma
npx prisma generate
```

---

### Issue: "Database connection failed"

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# If not running, start it:
# macOS:
brew services start postgresql@14

# Linux:
sudo systemctl start postgresql

# Windows: Open Services and start "postgresql-x64-14"
```

---

### Issue: "Migration failed"

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Then rerun migrations
npx prisma migrate deploy
npx prisma db seed
```

---

### Issue: "Port 5432 already in use"

**Solution:**
```bash
# Check what's using the port
lsof -i :5432  # macOS/Linux
netstat -ano | findstr :5432  # Windows

# If it's another PostgreSQL instance, stop it
# or change the port in your DATABASE_URL
```

---

## Directory Structure After Installation

```
education-platform/
├── node_modules/           # Dependencies (auto-generated)
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Seed script
│   ├── seed-rules.sql     # Lesson plan rules
│   └── migrations/        # Migration history
├── src/
│   ├── app/               # Next.js pages & API
│   ├── components/        # React components
│   ├── lib/               # Utility functions
│   └── types/             # TypeScript types
├── public/                # Static assets
├── uploads/               # File uploads (created by you)
│   ├── lesson-plans/
│   ├── exports/
│   └── temp/
├── .env                   # Environment variables (created by you)
├── .env.example           # Environment template
├── package.json           # Dependencies list
├── tsconfig.json          # TypeScript config
└── tailwind.config.ts     # Tailwind config
```

---

## Next Steps

✅ Installation complete!

**Continue to:** [Configuration Guide](./03-configuration.md) to set up API keys and environment variables.
