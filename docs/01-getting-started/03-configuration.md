# Configuration

Configure the Education Platform with API keys, environment variables, and application settings.

---

## Environment Variables

All configuration is done via the `.env` file in the project root.

### 1. Copy Template

```bash
cp .env.example .env
```

### 2. Edit Configuration

Open `.env` in your editor and configure:

---

## Required Variables

### Database Connection

```env
DATABASE_URL="postgresql://education_user:your_password@localhost:5432/education_platform"
```

**Format:**
```
postgresql://[username]:[password]@[host]:[port]/[database_name]
```

**Production example:**
```env
DATABASE_URL="postgresql://user:pass@db.example.com:5432/prod_db?schema=public"
```

---

### NextAuth.js (Authentication)

```env
NEXTAUTH_SECRET="your-random-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Generate a secure secret:**
```bash
# Using openssl
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Production:**
```env
NEXTAUTH_URL="https://yourdomain.com"
```

---

## Optional Variables

### Google Gemini AI (Lesson Plan Review)

```env
GEMINI_API_KEY="your-gemini-api-key"
```

**Get API key:**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google
3. Click "Create API Key"
4. Copy and paste here

**Without this key:**
- Lesson plan AI review won't work
- Other features work normally

---

### Google OAuth (Social Login)

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

**Without this:**
- Email/password login still works
- Users can't sign in with Google

---

### SendGrid (Email Notifications)

```env
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@yourdomain.com"
```

**Setup:**
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Verify sender email
3. Create API key in Settings → API Keys

**Without this:**
- Password reset emails won't send
- Notification emails won't work

---

### File Upload Configuration

```env
# Maximum file size (in bytes)
MAX_FILE_SIZE=10485760  # 10MB default

# Upload directory (relative to project root)
UPLOAD_DIR="./uploads"
```

---

### Application Settings

```env
# Node environment
NODE_ENV="development"  # development | production | test

# Server port
PORT=3000

# Enable debug logging
DEBUG=false

# Enable Prisma query logging
DATABASE_LOGGING=false
```

---

## Complete .env Example

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://education_user:password123@localhost:5432/education_platform"
DATABASE_LOGGING=false

# ============================================
# AUTHENTICATION
# ============================================
NEXTAUTH_SECRET="UzI1NiIsInR5cCI6IkpXVCJ9eyJzdWIiOiIxMj"
NEXTAUTH_URL="http://localhost:3000"

# ============================================
# GOOGLE OAUTH (Optional)
# ============================================
GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcdefghijklmnop"

# ============================================
# AI SERVICES
# ============================================
GEMINI_API_KEY="AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567"

# ============================================
# EMAIL (Optional)
# ============================================
SENDGRID_API_KEY="SG.abcdefghijklmnopqrstuvwxyz1234567890"
SENDGRID_FROM_EMAIL="noreply@educationplatform.com"

# ============================================
# FILE UPLOADS
# ============================================
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"

# ============================================
# APPLICATION
# ============================================
NODE_ENV="development"
PORT=3000
DEBUG=false
```

---

## Verify Configuration

### 1. Check Database Connection

```bash
npx prisma studio
```

Should open browser at `http://localhost:5555` showing database tables.

---

### 2. Test Gemini API (if configured)

```bash
# Create test script: test-gemini.js
cat > test-gemini.js << 'EOF'
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const result = await model.generateContent("Say hello!");
  console.log(result.response.text());
}

test().catch(console.error);
EOF

# Run test
node test-gemini.js

# Clean up
rm test-gemini.js
```

Should output: "Hello! 👋" or similar greeting.

---

### 3. Check Environment Loading

```bash
# Create test script: test-env.js
node -e "console.log(process.env.DATABASE_URL ? '✅ DATABASE_URL loaded' : '❌ DATABASE_URL missing')"
node -e "console.log(process.env.NEXTAUTH_SECRET ? '✅ NEXTAUTH_SECRET loaded' : '❌ NEXTAUTH_SECRET missing')"
```

Both should show ✅.

---

## Security Best Practices

### ✅ DO:
- Use strong random secrets (32+ characters)
- Keep `.env` out of version control (already in `.gitignore`)
- Use different secrets for development and production
- Rotate API keys periodically
- Use environment-specific values

### ❌ DON'T:
- Commit `.env` to Git
- Share secrets in chat/email
- Use default/example secrets in production
- Hard-code secrets in source files
- Reuse secrets across projects

---

## Environment-Specific Configs

### Development (.env.development)

```env
NODE_ENV="development"
NEXTAUTH_URL="http://localhost:3000"
DEBUG=true
DATABASE_LOGGING=true
```

### Production (.env.production)

```env
NODE_ENV="production"
NEXTAUTH_URL="https://yourdomain.com"
DEBUG=false
DATABASE_LOGGING=false

# Use production database
DATABASE_URL="postgresql://user:pass@production-db:5432/prod_db?sslmode=require"

# Production API keys (different from dev)
GEMINI_API_KEY="production-key-different-from-dev"
```

### Testing (.env.test)

```env
NODE_ENV="test"
DATABASE_URL="postgresql://user:pass@localhost:5432/education_platform_test"
```

---

## Troubleshooting

### Issue: "NEXTAUTH_SECRET is not defined"

**Solution:**
```bash
# Generate new secret
openssl rand -base64 32

# Add to .env
echo 'NEXTAUTH_SECRET="<generated-secret>"' >> .env

# Restart dev server
npm run dev
```

---

### Issue: "Invalid DATABASE_URL"

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Test connection manually
psql "postgresql://user:pass@localhost:5432/education_platform"

# If connection works, copy exact URL to .env
```

---

### Issue: ".env not loaded"

**Solution:**
```bash
# Make sure .env is in project root
ls -la .env

# Check file has no BOM (Windows issue)
file .env  # Should say "ASCII text"

# Restart dev server
npm run dev
```

---

## Next Steps

✅ Configuration complete!

**Continue to:** [First Run](./04-first-run.md) to start the application.
