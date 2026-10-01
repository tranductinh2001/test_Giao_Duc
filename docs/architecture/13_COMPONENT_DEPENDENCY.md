# Component Dependency

## Overview

This document maps the dependencies between key components in the Education Platform.

---

## Frontend Dependencies

### Pages → Components

| Page | Components Used |
|------|-----------------|
| `src/app/page.tsx` | modern-hero, modern-navbar, modern-categories, modern-features, modern-pricing, modern-faq, modern-footer |
| `src/app/(auth)/login/page.tsx` | Button, Input, Form |
| `src/app/admin/layout.tsx` | MobileMenu |
| `src/app/lesson-plans/upload/page.tsx` | Input, Button, Select |

### Components → UI

| Component | UI Components |
|-----------|---------------|
| modern-hero | Button, Input |
| modern-navbar | Button, Dialog |
| modern-categories | Card, Badge |
| modern-pricing | Card, Button |
| modern-faq | Accordion |
| Dashboard | HeroCard, NotificationTicker, ExamsClient |

---

## API Route Dependencies

### Route → Services

| Route | Services |
|-------|----------|
| `/api/lesson-plans/upload` | File handling, Prisma |
| `/api/workflow/stream` | WorkflowService, WorkflowOrchestrator |
| `/api/workflow/process` | TextbookWorkflow, BrightOneAdapter |
| `/api/admin/textbooks` | TextbookService |

### Route → Adapters

| Route | Adapters |
|-------|----------|
| `/api/lesson-plans/upload` | BrightOneAdapter, DocxAdapter |
| `/api/rule-engine/v2/parse` | SectionParser |

---

## Core Module Dependencies

### Workflow → Core Modules

```
WorkflowOrchestrator
    ├── ReviewContextBuilder
    │   └── ContextOptimizer
    ├── GeminiClient
    │   └── PromptBuilder
    ├── MappingEngine
    │   └── KnowledgeRepository
    ├── ReviewAnnotationEngine
    └── SuggestionEngine
        └── FixGenerator
```

### Document Processing Pipeline

```
BrightOneAdapter
    └── BrightOne API (external)

DocxAdapter
    └── mammoth (npm package)

SectionParser
    └── UnifiedDocument types

ActivityDetector
    └── Section content
```

### Book Intelligence

```
Matcher
    ├── Validator
    └── Database (chapters)

Extractor
    ├── pdf-lib
    └── Cache

Indexer
    └── pdf-lib

Validator
    └── Database

Optimizer
    └── Text processing

Queue
    └── Database (jobs)

Monitoring
    └── Database (metrics)
```

---

## Service Layer

### workflow-service.ts

```typescript
Dependencies:
├── Prisma (database)
├── WorkflowOrchestrator (core/workflow)
├── ReviewTemplateRepository
├── LessonPlanRepository
└── WorkflowSession model
```

### textbook-workflow.ts

```typescript
Dependencies:
├── Matcher (textbook)
├── Extractor (textbook)
├── Optimizer (textbook)
├── BrightOneAdapter (document-adapters)
├── Prisma
└── Textbook models
```

---

## Database Models

### Relationships

```
User
  ├── Account (1:N)
  ├── Session (1:N)
  └── LessonPlan (1:N)

LessonPlan
  ├── LessonPlanSection (1:N)
  ├── LessonPlanVersion (1:N)
  ├── ReviewResult (1:1)
  ├── Annotation (1:N)
  ├── Suggestion (1:N)
  ├── MappingResult (1:N)
  ├── Circular (N:1)
  └── TextbookBook (N:1)

ReviewResult
  ├── Annotation (1:N)
  └── Suggestion (1:N)

TextbookBook
  ├── TextbookChapter (1:N)
  └── TextbookCacheEntry (1:N)

KnowledgeBook
  ├── KnowledgeGrade (1:N)
  └── KnowledgeSubject (1:N)
      └── KnowledgeLesson (1:N)
          └── MappingResult (1:N)

ReviewTemplate
  ├── SectionStructureRule (1:N)
  ├── SectionScoringRule (1:N)
  └── SectionFixRule (1:N)
```

---

## External Dependencies

### NPM Packages

| Package | Purpose |
|---------|---------|
| `@prisma/client` | Database ORM |
| `next-auth` | Authentication |
| `next-themes` | Dark/Light mode |
| `lucide-react` | Icons |
| `framer-motion` | Animations |
| `gsap` | Advanced animations |
| `@syncfusion/ej2-react-documenteditor` | Document editor |
| `pdf-lib` | PDF manipulation |
| `mammoth` | DOCX parsing |
| `zod` | Validation |
| `tailwindcss` | Styling |

### External APIs

| API | Purpose |
|-----|---------|
| BrightOne (Beeknoee) | PDF/Image OCR & parsing |
| Gemini | AI review |

### External Services

| Service | Purpose |
|---------|---------|
| Neon PostgreSQL | Database |
| Upstash Redis | Rate limiting |

---

## Config Dependencies

### Environment

```
.env
├── DATABASE_URL → Prisma
├── NEXTAUTH_SECRET → NextAuth.js
├── GEMINI_API_KEY → GeminiClient
├── BEEKNOEE_API_KEY → BrightOneAdapter
├── UPSTASH_REDIS_REST_URL → RateLimiter
└── BEE_BASE_URL → BrightOneAdapter
```

---

## Build Dependencies

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate"
  }
}
```

### Dependencies Tree

```
next
├── react
├── react-dom
├── @prisma/client
├── next-auth
└── ...

prisma
├── @prisma/client
└── (dev) prisma
```

---

## Testing Dependencies

### Test Framework

```
jest / vitest
├── @testing-library/react
├── @testing-library/jest-dom
└── jest-environment-jsdom
```

---

## Component Hierarchy

```
Root Layout (layout.tsx)
├── ThemeProvider
│   ├── AuthProvider
│   │   ├── Navbar (modern-navbar)
│   │   │   ├── MobileMenu
│   │   │   └── AuthButtons
│   │   │
│   │   └── Page Content
│   │       ├── Landing Page
│   │       │   ├── Hero
│   │       │   ├── Categories
│   │       │   ├── Features
│   │       │   ├── Pricing
│   │       │   ├── FAQ
│   │       │   └── Footer
│   │       │
│   │       ├── Auth Pages
│   │       │   ├── Login Form
│   │       │   └── Register Form
│   │       │
│   │       ├── Dashboard
│   │       │   ├── HeroCard
│   │       │   ├── NotificationTicker
│   │       │   └── ExamsClient
│   │       │
│   │       ├── Admin
│   │       │   ├── Sidebar
│   │       │   ├── ThemeSettingsPanel
│   │       │   └── Content
│   │       │
│   │       └── Lesson Plans
│   │           ├── Upload Form
│   │           ├── List View
│   │           ├── Workspace
│   │           ├── Review Interface
│   │           └── Quick View
│   │           │
│   │           └── Editor (Syncfusion)
│   │
│   └── Footer (if applicable)
```
