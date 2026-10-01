# 🏗️ Architecture

Understanding the system design, structure, and technical decisions behind the Education Platform.

---

## 📋 Overview

The Education Platform is a modern full-stack web application built with the **Next.js App Router**, designed for scalability, maintainability, and developer experience.

**Key Architectural Principles:**
- **Monolithic** with clear separation of concerns
- **API-first** design for future mobile apps
- **Database-centric** with Prisma ORM
- **Server-side rendering** for performance and SEO
- **Type-safe** end-to-end with TypeScript

---

## 📚 Quick Links

1. **[System Overview](./01-system-overview.md)** - High-level architecture diagram
2. **[Tech Stack](./02-tech-stack.md)** - Technologies and why we chose them
3. **[Folder Structure](./03-folder-structure.md)** - Where everything lives
4. **[Design Patterns](./04-design-patterns.md)** - Common patterns used throughout
5. **[Security Architecture](./05-security-architecture.md)** - Authentication, authorization, data protection

---

## 🎯 Architectural Layers

```
┌─────────────────────────────────────────────┐
│          Frontend (Next.js + React)         │
│  - Server Components (RSC)                  │
│  - Client Components                        │
│  - shadcn/ui + Tailwind CSS                 │
└─────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────┐
│         API Layer (Next.js Routes)          │
│  - Route Handlers                           │
│  - Server Actions                           │
│  - Middleware                               │
└─────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────┐
│        Business Logic (Services)            │
│  - Authentication (NextAuth.js)             │
│  - Validation (Zod)                         │
│  - AI Integration (Gemini)                  │
└─────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────┐
│          Data Layer (Prisma ORM)            │
│  - Type-safe queries                        │
│  - Migrations                               │
│  - Relationships                            │
└─────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────┐
│       Database (PostgreSQL)                 │
│  - 35+ tables                               │
│  - Indexes                                  │
│  - Constraints                              │
└─────────────────────────────────────────────┘
```

---

## 🔑 Key Design Decisions

### Why Next.js 16?
- **Server Components** for better performance
- **App Router** for intuitive file-based routing
- **Built-in API routes** eliminates separate backend
- **Edge runtime** support for global deployment
- **Image optimization** out of the box

### Why Prisma?
- **Type safety** with auto-generated types
- **Migrations** for version-controlled schema changes
- **Relations** handled elegantly
- **Studio** for visual database management
- **Multi-database** support (currently PostgreSQL)

### Why PostgreSQL?
- **Relational data** fits our domain model
- **ACID compliance** for exam integrity
- **JSON support** for flexible data
- **Full-text search** for questions
- **Mature ecosystem** and tooling

### Why NextAuth.js?
- **Batteries included** OAuth, JWT, sessions
- **Provider agnostic** (Google, GitHub, Email)
- **Secure by default** CSRF protection, encrypted cookies
- **Database sessions** for revocation
- **TypeScript support** for type safety

---

## 🎨 Frontend Architecture

### Component Hierarchy

```
App Shell (layout.tsx)
├── Navigation
├── Sidebar (Admin)
└── Page Content
    ├── Server Components (default)
    │   ├── Data fetching
    │   ├── Static content
    │   └── SEO-critical content
    └── Client Components ("use client")
        ├── Interactive forms
        ├── Real-time features
        └── Browser-only APIs
```

### State Management

- **Server state:** React Server Components (no client state needed)
- **Form state:** React Hook Form + Zod validation
- **Client state:** React hooks (useState, useReducer)
- **Global state:** React Context (minimal, for theme/user)
- **URL state:** Next.js searchParams (for filters, pagination)

---

## 🔄 Data Flow

### Read Flow (Get Questions)

```
User clicks "Questions" page
        ↓
Server Component fetches data (no API call)
        ↓
Prisma query: SELECT * FROM Question
        ↓
PostgreSQL returns rows
        ↓
Prisma transforms to TypeScript objects
        ↓
React renders HTML on server
        ↓
Browser receives fully rendered page
```

**Advantages:**
- Zero client-side JavaScript for data
- Instant page loads
- SEO friendly
- No loading spinners

---

### Write Flow (Create Question)

```
User fills form and clicks "Save"
        ↓
Client validates with Zod schema
        ↓
Fetch POST /api/questions
        ↓
Middleware checks authentication
        ↓
Route handler validates request body
        ↓
Prisma creates record
        ↓
PostgreSQL inserts row
        ↓
Response sent to client
        ↓
Client revalidates page (revalidatePath)
        ↓
Server re-renders with fresh data
```

**Advantages:**
- Type-safe end-to-end
- Validation at multiple layers
- Optimistic updates possible
- Automatic cache invalidation

---

## 📂 Module Structure

Each major feature follows this structure:

```
feature-name/
├── components/          # UI components
│   ├── FeatureList.tsx
│   ├── FeatureForm.tsx
│   └── FeatureCard.tsx
├── lib/                 # Business logic
│   ├── actions.ts       # Server actions
│   ├── queries.ts       # Database queries
│   └── validation.ts    # Zod schemas
├── types/               # TypeScript types
│   └── feature.ts
└── app/                 # Routes
    └── feature/
        ├── page.tsx     # List page
        ├── [id]/
        │   └── page.tsx # Detail page
        └── new/
            └── page.tsx # Create page
```

---

## 🔐 Security Layers

### 1. Network Layer
- HTTPS in production
- CORS configuration
- Rate limiting (middleware)

### 2. Authentication Layer
- JWT tokens (NextAuth)
- Session validation
- CSRF protection

### 3. Authorization Layer
- Role-based access (RBAC)
- Resource ownership checks
- Admin-only routes

### 4. Data Layer
- SQL injection prevention (Prisma)
- Input validation (Zod)
- Output sanitization
- Soft deletes (paranoid mode)

See [Security Architecture](./05-security-architecture.md) for details.

---

## 📊 Performance Optimizations

### Server-Side
- **Database indexes** on frequently queried columns
- **Connection pooling** with Prisma
- **Query optimization** with select/include
- **Caching** (ISR, Edge Cache)

### Client-Side
- **Code splitting** automatic with Next.js
- **Image optimization** with next/image
- **Font optimization** with next/font
- **Bundle analysis** with @next/bundle-analyzer

### Network
- **CDN** for static assets
- **Compression** gzip/brotli
- **HTTP/2** multiplexing
- **Lazy loading** for below-the-fold content

---

## 🧪 Testing Strategy

```
Testing Pyramid

              ┌──────────────┐
              │     E2E      │  Playwright (critical paths)
              │   (10 tests) │
              └──────────────┘
            ┌──────────────────┐
            │   Integration    │  API route testing
            │   (50 tests)     │  Component integration
            └──────────────────┘
        ┌────────────────────────┐
        │       Unit Tests       │  Business logic
        │     (200+ tests)       │  Utilities, validators
        └────────────────────────┘
```

See [Testing Guide](../07-development/03-testing.md) for implementation details.

---

## 🚀 Deployment Architecture

### Development
```
Local Machine
├── Next.js Dev Server (localhost:3000)
├── PostgreSQL (localhost:5432)
└── Prisma Studio (localhost:5555)
```

### Production (Vercel Example)
```
┌─────────────────────────────────────────────┐
│             Vercel Edge Network             │
│  - CDN                                      │
│  - Serverless Functions                     │
│  - Edge Middleware                          │
└─────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────┐
│         PostgreSQL (Supabase/Neon)          │
│  - Connection pooling                       │
│  - Automated backups                        │
└─────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────┐
│        File Storage (S3/R2/Vercel)          │
│  - User uploads                             │
│  - Static assets                            │
└─────────────────────────────────────────────┘
```

See [Deployment Guide](../08-deployment/README.md) for details.

---

## 🔄 Data Consistency

### Transactions
Used for multi-table operations:
```typescript
await prisma.$transaction([
  prisma.exam.create({ ... }),
  prisma.examQuestion.createMany({ ... }),
  prisma.userAttempt.create({ ... })
])
```

### Soft Deletes
Preserve data integrity:
```typescript
model Question {
  deletedAt DateTime?
}

// Query excludes soft-deleted by default
where: { deletedAt: null }
```

### Audit Trail
Track all changes:
```typescript
model ReviewHistory {
  actionType   String
  actionData   Json
  performedBy  String
  performedAt  DateTime
}
```

---

## 📈 Scalability Considerations

### Current (MVP)
- Single server
- Monolithic architecture
- Vertical scaling

### Future (High Traffic)
- **Horizontal scaling:** Multiple Next.js instances
- **Database:** Read replicas
- **Cache layer:** Redis for sessions/API responses
- **Queue system:** Background jobs (Bull/BullMQ)
- **Search:** Elasticsearch for full-text search
- **CDN:** CloudFront/Cloudflare for static assets

---

## 🛠️ Development Workflow

```
1. Pull latest code (git pull)
2. Create feature branch (git checkout -b feature/xyz)
3. Install dependencies (npm install)
4. Run migrations (npx prisma migrate dev)
5. Start dev server (npm run dev)
6. Make changes
7. Run tests (npm test)
8. Run linter (npm run lint)
9. Commit (git commit)
10. Push (git push)
11. Create PR
12. CI/CD runs tests
13. Review & merge
14. Deploy to staging
15. QA testing
16. Deploy to production
```

See [Development Guide](../07-development/README.md) for details.

---

## 📚 Further Reading

- **[System Overview](./01-system-overview.md)** - Visual architecture diagrams
- **[Tech Stack](./02-tech-stack.md)** - Complete technology breakdown
- **[Folder Structure](./03-folder-structure.md)** - File organization
- **[Design Patterns](./04-design-patterns.md)** - Common patterns
- **[Security](./05-security-architecture.md)** - Security in depth

---

**Next:** Learn about the [Tech Stack](./02-tech-stack.md) →
