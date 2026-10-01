# 🗂️ Folder Structure

Complete guide to the project's file organization and where to find everything.

---

## Root Directory

```
education-platform/
├── .next/                    # Next.js build output (auto-generated)
├── node_modules/             # Dependencies (auto-generated)
├── prisma/                   # Database schema & migrations
├── public/                   # Static assets (images, fonts)
├── src/                      # Source code (main application)
├── uploads/                  # User uploaded files (runtime)
├── .env                      # Environment variables (not in Git)
├── .env.example              # Environment template
├── .eslintrc.json            # ESLint configuration
├── .gitignore                # Git ignore rules
├── components.json           # shadcn/ui configuration
├── next.config.ts            # Next.js configuration
├── package.json              # Dependencies & scripts
├── postcss.config.mjs        # PostCSS configuration
├── README.md                 # Project overview
├── tailwind.config.ts        # Tailwind CSS configuration
└── tsconfig.json             # TypeScript configuration
```

---

## Source Directory (`src/`)

### Overview

```
src/
├── app/                      # Next.js App Router (pages + API)
├── components/               # React components
├── lib/                      # Utilities & business logic
├── types/                    # TypeScript type definitions
├── hooks/                    # Custom React hooks
├── styles/                   # Global styles
├── middleware.ts             # Next.js middleware
└── auth.ts                   # NextAuth configuration
```

---

## App Directory (`src/app/`)

### File-Based Routing

```
app/
├── layout.tsx                     # Root layout (wraps all pages)
├── page.tsx                       # Homepage (/)
├── globals.css                    # Global styles
│
├── (auth)/                        # Route group (no URL segment)
│   ├── login/
│   │   └── page.tsx              # Login page (/login)
│   └── register/
│       └── page.tsx              # Register page (/register)
│
├── (dashboard)/                   # Protected routes
│   ├── layout.tsx                # Dashboard layout
│   └── dashboard/
│       └── page.tsx              # User dashboard (/dashboard)
│
├── admin/                         # Admin section
│   ├── layout.tsx                # Admin layout
│   ├── page.tsx                  # Admin dashboard (/admin)
│   ├── questions/
│   │   ├── page.tsx              # Questions list (/admin/questions)
│   │   ├── new/
│   │   │   └── page.tsx          # Create question (/admin/questions/new)
│   │   └── [id]/
│   │       ├── page.tsx          # Question detail (/admin/questions/123)
│   │       └── edit/
│   │           └── page.tsx      # Edit question (/admin/questions/123/edit)
│   ├── exams/
│   ├── users/
│   └── review-rules/             # Lesson plan rules management
│
├── exams/                         # Exams section
│   ├── page.tsx                  # Exams list (/exams)
│   ├── [id]/
│   │   ├── page.tsx              # Exam detail (/exams/123)
│   │   └── take/
│   │       └── page.tsx          # Take exam (/exams/123/take)
│   └── results/
│       └── [attemptId]/
│           └── page.tsx          # Exam results (/exams/results/456)
│
├── lesson-plans/                  # Lesson plans section
│   ├── page.tsx                  # Lesson plans list (/lesson-plans)
│   ├── upload/
│   │   └── page.tsx              # Upload page (/lesson-plans/upload)
│   └── [id]/
│       ├── page.tsx              # Lesson plan detail (/lesson-plans/123)
│       └── review/
│           └── page.tsx          # Review interface (/lesson-plans/123/review)
│
└── api/                           # API routes
    ├── auth/
    │   └── [...nextauth]/
    │       └── route.ts          # NextAuth endpoints
    ├── questions/
    │   ├── route.ts              # GET /api/questions, POST /api/questions
    │   └── [id]/
    │       └── route.ts          # GET/PUT/DELETE /api/questions/123
    ├── exams/
    │   ├── route.ts
    │   └── [id]/
    │       ├── route.ts
    │       ├── start/
    │       │   └── route.ts      # POST /api/exams/123/start
    │       └── submit/
    │           └── route.ts      # POST /api/exams/123/submit
    ├── lesson-plans/
    │   ├── upload/
    │   │   └── route.ts          # POST /api/lesson-plans/upload
    │   ├── route.ts              # GET /api/lesson-plans
    │   └── [id]/
    │       ├── route.ts          # GET/DELETE /api/lesson-plans/123
    │       ├── parse/
    │       │   └── route.ts      # POST /api/lesson-plans/123/parse
    │       ├── review/
    │       │   └── route.ts      # POST /api/lesson-plans/123/review
    │       ├── export/
    │       │   └── route.ts      # POST /api/lesson-plans/123/export
    │       └── annotations/
    │           ├── route.ts      # GET /api/lesson-plans/123/annotations
    │           └── [annotationId]/
    │               ├── accept/
    │               │   └── route.ts
    │               └── reject/
    │                   └── route.ts
    └── admin/
        └── review-rules/
            ├── sets/
            │   ├── route.ts
            │   └── [setId]/
            │       ├── route.ts
            │       └── rules/
            │           └── route.ts
            └── rules/
                └── [ruleId]/
                    └── route.ts
```

---

## Components Directory (`src/components/`)

```
components/
├── ui/                           # shadcn/ui components (auto-generated)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── textarea.tsx
│   └── toast.tsx
│
├── layout/                       # Layout components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   └── Navigation.tsx
│
├── questions/                    # Question-related components
│   ├── QuestionList.tsx
│   ├── QuestionCard.tsx
│   ├── QuestionForm.tsx
│   └── QuestionFilter.tsx
│
├── exams/                        # Exam-related components
│   ├── ExamList.tsx
│   ├── ExamCard.tsx
│   ├── ExamTimer.tsx
│   └── ExamSubmitButton.tsx
│
├── lesson-plans/                 # Lesson plan components
│   ├── LessonPlanList.tsx
│   ├── LessonPlanUpload.tsx
│   ├── ReviewInterface.tsx
│   ├── SectionNavigator.tsx
│   ├── ContentDisplay.tsx
│   └── AnnotationPanel.tsx
│
└── common/                       # Reusable components
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    ├── Pagination.tsx
    └── StatusBadge.tsx
```

---

## Lib Directory (`src/lib/`)

### Utilities & Business Logic

```
lib/
├── auth.ts                       # Authentication helpers
├── prisma.ts                     # Prisma client singleton
├── utils.ts                      # Generic utilities
│
├── docx-parser.ts                # DOCX file parser (mammoth.js)
├── gemini.ts                     # Google Gemini AI integration
├── export-docx.ts                # DOCX export generator
│
├── validators/                   # Zod schemas
│   ├── question.ts
│   ├── exam.ts
│   └── lesson-plan.ts
│
├── services/                     # Business logic services
│   ├── question-service.ts
│   ├── exam-service.ts
│   └── lesson-plan-service.ts
│
└── constants/                    # Constants
    ├── roles.ts
    ├── licenses.ts
    └── exam-statuses.ts
```

---

## Types Directory (`src/types/`)

```
types/
├── index.ts                      # Re-exports all types
├── auth.ts                       # Authentication types
├── user.ts                       # User-related types
├── question.ts                   # Question types
├── exam.ts                       # Exam types
├── lesson-plan.ts                # Lesson plan types
└── api.ts                        # API response types
```

---

## Prisma Directory (`prisma/`)

```
prisma/
├── schema.prisma                 # Database schema
├── seed.ts                       # Seed script
├── seed-rules.sql                # Lesson plan rules SQL
└── migrations/                   # Migration history
    ├── 20240101_init/
    │   └── migration.sql
    ├── 20240115_add_exams/
    │   └── migration.sql
    └── 20260626_add_lesson_plan_review/
        └── migration.sql
```

---

## Public Directory (`public/`)

```
public/
├── images/
│   ├── logo.svg
│   ├── hero-bg.jpg
│   └── placeholder.png
├── fonts/
│   └── custom-font.woff2
└── favicon.ico
```

---

## Uploads Directory (`uploads/`)

```
uploads/                          # Created at runtime
├── lesson-plans/                 # Uploaded DOCX files
│   └── user-123/
│       └── lesson-plan-456.docx
├── exports/                      # Exported documents
│   └── lesson-plan-456-export.docx
└── temp/                         # Temporary files
```

**Note:** This directory is auto-created and excluded from Git (`.gitignore`).

---

## Configuration Files

### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    domains: ["localhost"],
  },
};

export default nextConfig;
```

### `tailwind.config.ts`
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    },
    "strict": true
  }
}
```

---

## File Naming Conventions

### Components
- **PascalCase** for component files: `QuestionCard.tsx`
- **camelCase** for utility files: `formatDate.ts`
- **kebab-case** for route folders: `lesson-plans/`

### API Routes
- **route.ts** for all API endpoints
- Dynamic segments use brackets: `[id]/route.ts`
- Catch-all segments: `[...slug]/route.ts`

### Types
- **kebab-case** for type files: `lesson-plan.ts`
- Match the domain: `question.ts` for Question types

---

## Import Aliases

Configured in `tsconfig.json`:

```typescript
// Instead of:
import { Button } from "../../../components/ui/button"

// Use:
import { Button } from "@/components/ui/button"
```

**Available aliases:**
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/types` → `src/types`
- `@/app` → `src/app`

---

## Special Files

### Next.js Conventions

| File | Purpose |
|------|---------|
| `layout.tsx` | Shared layout wrapper |
| `page.tsx` | Route page |
| `loading.tsx` | Loading UI |
| `error.tsx` | Error boundary |
| `not-found.tsx` | 404 page |
| `route.ts` | API route handler |
| `middleware.ts` | Request middleware |

### Prisma Conventions

| File | Purpose |
|------|---------|
| `schema.prisma` | Database schema |
| `seed.ts` | Seed data script |
| `migrations/` | Version controlled schema changes |

---

## Git Ignored Files

```
.gitignore:
├── .next/                        # Build output
├── node_modules/                 # Dependencies
├── .env                          # Environment variables
├── uploads/                      # User uploads
├── *.log                         # Log files
└── .DS_Store                     # macOS files
```

---

## Quick Reference

**Find a feature:**
1. Check `src/app/[feature]/` for pages
2. Check `src/components/[feature]/` for components
3. Check `src/lib/services/[feature]-service.ts` for business logic
4. Check `prisma/schema.prisma` for database models

**Add a new feature:**
1. Create page in `src/app/[feature]/page.tsx`
2. Create components in `src/components/[feature]/`
3. Create API routes in `src/app/api/[feature]/route.ts`
4. Add types in `src/types/[feature].ts`
5. Update `prisma/schema.prisma` if needed

---

**Next:** Learn about [Design Patterns](./04-design-patterns.md) →
