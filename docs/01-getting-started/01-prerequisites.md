# Prerequisites

Before installing the Education Platform, ensure your system meets these requirements.

---

## System Requirements

### Minimum Hardware
- **CPU:** 2 cores
- **RAM:** 4GB
- **Storage:** 2GB free space
- **Internet:** Stable connection for package downloads

### Recommended Hardware
- **CPU:** 4+ cores
- **RAM:** 8GB+
- **Storage:** 10GB+ free space (for uploads & database)

---

## Required Software

### 1. Node.js (v18.0+)

**Check if installed:**
```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show v9.0.0 or higher
```

**Installation:**

**Windows:**
```powershell
# Download installer from https://nodejs.org/
# Or use Chocolatey
choco install nodejs-lts
```

**macOS:**
```bash
# Using Homebrew
brew install node@18
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

### 2. PostgreSQL (v14.0+)

**Check if installed:**
```bash
psql --version  # Should show 14.0 or higher
pg_isready      # Should say "accepting connections"
```

**Installation:**

**Windows:**
```powershell
# Download installer from https://www.postgresql.org/download/windows/
# Or use Chocolatey
choco install postgresql
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Create database user:**
```bash
# Switch to postgres user
sudo -u postgres psql

# In psql shell:
CREATE USER education_user WITH PASSWORD 'your_password';
CREATE DATABASE education_platform OWNER education_user;
GRANT ALL PRIVILEGES ON DATABASE education_platform TO education_user;
\q
```

---

### 3. Git

**Check if installed:**
```bash
git --version
```

**Installation:**

**Windows:**
```powershell
choco install git
```

**macOS:**
```bash
brew install git
```

**Linux:**
```bash
sudo apt install git
```

---

## Optional Tools

### 1. pnpm (Faster alternative to npm)

```bash
npm install -g pnpm
```

Use `pnpm install` instead of `npm install` throughout this guide.

---

### 2. Prisma Studio (Database GUI)

Already included in dependencies. Run with:
```bash
npx prisma studio
```

---

### 3. VS Code Extensions (Recommended)

If using Visual Studio Code, install these extensions:
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Prisma** - Database schema syntax highlighting
- **Tailwind CSS IntelliSense** - CSS autocomplete
- **TypeScript Vue Plugin (Volar)** - TypeScript support

---

## API Keys (for full functionality)

### Required for Lesson Plan Review Module

**Google Gemini API:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (you'll add it to `.env` later)

**Free tier includes:**
- 60 requests per minute
- Perfect for development

---

### Optional for Email Features

**SendGrid API (for email notifications):**
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create API key
3. Verify sender email

---

## Verify Installation

Run this checklist:

```bash
# Check Node.js
node --version

# Check npm
npm --version

# Check PostgreSQL
psql --version
pg_isready

# Check Git
git --version

# Check disk space
df -h .  # Linux/macOS
```

All commands should return version numbers without errors.

---

## Next Steps

✅ All prerequisites installed?

**Continue to:** [Installation Guide](./02-installation.md)
