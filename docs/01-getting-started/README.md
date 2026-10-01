# 🚀 Getting Started

Welcome! This guide will help you set up and run the Education Platform on your local machine.

---

## 📋 What You'll Need

Before you start, make sure you have:
- **Node.js** 18.0 or higher
- **PostgreSQL** 14.0 or higher
- **Git** for version control
- A code editor (VS Code recommended)
- 2GB free disk space

**Estimated setup time:** 15-30 minutes

---

## 📚 Quick Links

1. **[Prerequisites](./01-prerequisites.md)** - System requirements & installations
2. **[Installation](./02-installation.md)** - Clone, install dependencies, database setup
3. **[Configuration](./03-configuration.md)** - Environment variables & API keys
4. **[First Run](./04-first-run.md)** - Start the dev server & verify everything works

---

## 🎯 Quick Start (TL;DR)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/education-platform.git
cd education-platform

# 2. Install dependencies
npm install

# 3. Set up database
createdb education_platform
cp .env.example .env
# Edit .env with your database credentials

# 4. Run migrations & seed
npx prisma migrate deploy
npx prisma db seed

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Default admin credentials:
- **Email:** admin@example.com
- **Password:** admin123

---

## 🗺️ What's Next?

After completing the setup:

1. **Explore the platform:**
   - Browse to `/admin` to see the admin panel
   - Try creating a test question at `/admin/questions/new`
   - Take a practice exam at `/exams`

2. **Understand the architecture:**
   - Read [Architecture Overview](../02-architecture/README.md)
   - Review the [Database Schema](../03-database/README.md)

3. **Start developing:**
   - Check [Development Guide](../07-development/README.md)
   - Follow [Coding Standards](../07-development/01-coding-standards.md)

---

## 🆘 Having Issues?

**Common problems:**
- Database connection fails → Check PostgreSQL is running: `pg_isready`
- Port 3000 already in use → Kill the process: `npx kill-port 3000`
- Migration errors → Reset database: `npx prisma migrate reset`

See the full [Troubleshooting Guide](../07-development/05-troubleshooting.md) for more solutions.

---

**Ready to begin? → [Start with Prerequisites](./01-prerequisites.md)**
