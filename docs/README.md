# 📚 Documentation Hub

> **Comprehensive documentation for rebuilding and maintaining the Education Platform**

Welcome to the complete technical documentation. This guide is structured to take you from zero to production, with everything you need to understand, build, deploy, and maintain the entire system.

---

## 🎯 Quick Navigation

| Section | Description | Start Here |
|---------|-------------|------------|
| **[01. Getting Started](#01-getting-started)** | Setup, installation, first run | [→ Quick Start](./01-getting-started/README.md) |
| **[02. Architecture](#02-architecture)** | System design, patterns, structure | [→ Overview](./02-architecture/README.md) |
| **[03. Database](#03-database)** | Schema, entities, migrations | [→ Schema](./03-database/README.md) |
| **[04. API](#04-api)** | Endpoints, authentication, specs | [→ API Docs](./04-api/README.md) |
| **[05. Features](#05-features)** | All features explained in detail | [→ Features](./05-features/README.md) |
| **[06. Frontend](#06-frontend)** | UI/UX, components, styling | [→ Frontend](./06-frontend/README.md) |
| **[07. Development](#07-development)** | Coding standards, testing, debugging | [→ Dev Guide](./07-development/README.md) |
| **[08. Deployment](#08-deployment)** | Production deployment guide | [→ Deploy](./08-deployment/README.md) |
| **[09. Maintenance](#09-maintenance)** | Updates, backups, optimization | [→ Maintain](./09-maintenance/README.md) |
| **[10. References](#10-references)** | API reference, schemas, glossary | [→ Reference](./10-references/README.md) |

---

## 📖 Reading Paths

### 🚀 For New Developers (Complete Rebuild)

**Follow this order to understand and rebuild the entire system:**

1. **[Getting Started](./01-getting-started/README.md)** (1-2 hours)
   - Prerequisites & tech stack
   - Installation & configuration
   - First run & verification

2. **[Architecture](./02-architecture/README.md)** (2-3 hours)
   - System overview & design decisions
   - Folder structure & patterns
   - Security architecture

3. **[Database](./03-database/README.md)** (3-4 hours)
   - Complete schema understanding
   - Entity relationships
   - Migration strategy

4. **[API](./04-api/README.md)** (2-3 hours)
   - Authentication & authorization
   - All endpoints explained
   - Request/response formats

5. **[Features](./05-features/README.md)** (8-10 hours)
   - Core features implementation
   - Lesson Plan Review module
   - Integration points

6. **[Frontend](./06-frontend/README.md)** (4-5 hours)
   - Design system
   - Component architecture
   - State management

7. **[Development](./07-development/README.md)** (2 hours)
   - Coding standards
   - Testing strategies
   - Debugging tools

8. **[Deployment](./08-deployment/README.md)** (2-3 hours)
   - Environment setup
   - Build & deploy process
   - Monitoring

**Total estimated time: 24-32 hours** of focused reading and hands-on practice.

### 🔧 For Feature Development

**Building a new feature? Read:**
1. [Architecture → Design Patterns](./02-architecture/04-design-patterns.md)
2. [Development → Coding Standards](./07-development/01-coding-standards.md)
3. [API → Endpoints Reference](./04-api/03-endpoints-reference.md)
4. [Frontend → Components](./06-frontend/02-components.md)

### 🐛 For Bug Fixes

**Debugging an issue? Check:**
1. [Development → Troubleshooting](./07-development/05-troubleshooting.md)
2. [Development → Debugging](./07-development/04-debugging.md)
3. [Maintenance → Performance](./09-maintenance/03-performance-optimization.md)

### 📦 For Deployment

**Deploying to production? Follow:**
1. [Deployment → Environment Setup](./08-deployment/01-environment-setup.md)
2. [Deployment → Build Process](./08-deployment/02-build-process.md)
3. [Deployment → Production](./08-deployment/03-production-deployment.md)
4. [Deployment → Monitoring](./08-deployment/04-monitoring.md)

---

## 🎓 What This Platform Does

**Education Platform** is a comprehensive online exam preparation system for Vietnamese civil service candidates (công chức/viên chức).

**Core Capabilities:**
- 📝 Question bank management (10,000+ questions)
- 📊 Auto-generate exams with AI
- ⏱️ Real-time exam taking with timer
- 🎯 Auto-grading & detailed analytics
- 📈 Progress tracking & statistics
- 🎮 Gamification (levels, badges, leaderboard)
- 💳 License system (Free/Premium/Pro)
- 📄 Word/Excel import for bulk questions
- 🤖 **NEW:** AI-powered lesson plan review (Gemini)

---

## 🛠️ Tech Stack at a Glance

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 + TypeScript + React 19 | Modern SSR framework |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first CSS + components |
| **Backend** | Next.js API Routes | Serverless API |
| **Database** | PostgreSQL + Prisma | Relational DB + ORM |
| **Auth** | NextAuth.js | Authentication & sessions |
| **AI** | Google Gemini 1.5 Pro | Lesson plan review |
| **Storage** | Local filesystem | File uploads (DOCX, Excel) |
| **Validation** | Zod | Type-safe validation |
| **State** | React hooks + Context | Client state |
| **Charts** | Recharts | Analytics visualization |

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| **Database Models** | 35+ models |
| **API Endpoints** | 60+ endpoints |
| **Frontend Pages** | 40+ pages |
| **Components** | 80+ components |
| **Features** | 15+ major features |
| **Lines of Code** | ~30,000 lines |
| **Documentation** | 74+ markdown files |

---

## 🔑 Key Features Breakdown

### Core Platform Features

1. **[Authentication System](./05-features/01-authentication-system.md)**
   - JWT-based auth with NextAuth.js
   - Role-based access control (RBAC)
   - Social login (Google)

2. **[License System](./05-features/02-license-system.md)**
   - 3 tiers: Free, Premium, Pro
   - Feature gating
   - License key activation

3. **[Question Bank](./05-features/03-question-bank.md)**
   - Multi-choice questions with explanations
   - Categories, subjects, difficulty levels
   - Rich text support with images

4. **[Exam Engine](./05-features/04-exam-engine.md)**
   - AI-powered exam generation
   - Real-time timer
   - Auto-save progress

5. **[Scoring System](./05-features/05-scoring-system.md)**
   - Instant grading
   - Detailed answer review
   - Historical scores

6. **[Analytics](./05-features/06-statistics-analytics.md)**
   - Performance charts
   - Subject-wise breakdown
   - Progress tracking

7. **[Import System](./05-features/07-import-word-excel.md)**
   - Bulk import from Word/Excel
   - Template validation
   - Error handling

8. **[Gamification](./05-features/08-gamification.md)**
   - XP and levels
   - Badges and achievements
   - Leaderboard

### Lesson Plan Review Module (NEW)

9. **[Lesson Plan Review](./05-features/09-lesson-plan-review/README.md)** ⭐
   - DOCX parsing with Mammoth.js
   - AI review with Google Gemini
   - 3-panel review interface
   - Annotation accept/reject workflow
   - Export with comments
   - Admin rule management

---

## 🗺️ Documentation Map

```
docs/
├── 01-getting-started/        # Start here for setup
│   ├── 01-prerequisites.md
│   ├── 02-installation.md
│   ├── 03-configuration.md
│   └── 04-first-run.md
│
├── 02-architecture/           # Understand system design
│   ├── 01-system-overview.md
│   ├── 02-tech-stack.md
│   ├── 03-folder-structure.md
│   ├── 04-design-patterns.md
│   └── 05-security-architecture.md
│
├── 03-database/               # Database deep dive
│   ├── 01-schema-overview.md
│   ├── 02-core-entities.md
│   ├── 03-relationships.md
│   ├── 04-migrations.md
│   └── 05-data-seeding.md
│
├── 04-api/                    # API documentation
│   ├── 01-api-overview.md
│   ├── 02-authentication.md
│   ├── 03-endpoints-reference.md
│   ├── 04-request-response.md
│   └── 05-error-handling.md
│
├── 05-features/               # Feature documentation
│   ├── 01-authentication-system.md
│   ├── 02-license-system.md
│   ├── 03-question-bank.md
│   ├── 04-exam-engine.md
│   ├── 05-scoring-system.md
│   ├── 06-statistics-analytics.md
│   ├── 07-import-word-excel.md
│   ├── 08-gamification.md
│   └── 09-lesson-plan-review/     # NEW module
│       ├── 01-overview.md
│       ├── 02-docx-parser.md
│       ├── 03-gemini-integration.md
│       ├── 04-review-interface.md
│       ├── 05-export-system.md
│       └── 06-admin-rules.md
│
├── 06-frontend/               # Frontend guide
│   ├── 01-ui-design-system.md
│   ├── 02-components.md
│   ├── 03-pages-routing.md
│   ├── 04-state-management.md
│   └── 05-styling.md
│
├── 07-development/            # Developer guide
│   ├── 01-coding-standards.md
│   ├── 02-git-workflow.md
│   ├── 03-testing.md
│   ├── 04-debugging.md
│   └── 05-troubleshooting.md
│
├── 08-deployment/             # Deployment guide
│   ├── 01-environment-setup.md
│   ├── 02-build-process.md
│   ├── 03-production-deployment.md
│   └── 04-monitoring.md
│
├── 09-maintenance/            # Maintenance guide
│   ├── 01-database-backups.md
│   ├── 02-security-updates.md
│   ├── 03-performance-optimization.md
│   └── 04-changelog.md
│
└── 10-references/             # Quick references
    ├── 01-product-requirements.md
    ├── 02-user-flows.md
    ├── 03-api-reference.md
    ├── 04-database-schema.md
    └── 05-glossary.md
```

---

## 🎯 Documentation Goals

This documentation is designed to be:

✅ **Complete** - Everything needed to rebuild from scratch
✅ **Organized** - Logical hierarchy and clear navigation
✅ **Practical** - Real examples and code snippets
✅ **Maintainable** - Single source of truth, no duplication
✅ **Searchable** - Clear naming and cross-references
✅ **Progressive** - Beginner to advanced content

---

## 🤝 How to Use This Documentation

### For Complete Beginners

1. Start with [Getting Started](./01-getting-started/README.md)
2. Follow the numbered sections in order (01 → 10)
3. Build the project as you learn
4. Use [References](./10-references/README.md) as needed

### For Experienced Developers

1. Skim [Architecture](./02-architecture/README.md) for high-level overview
2. Deep dive into specific [Features](./05-features/README.md)
3. Reference [API](./04-api/README.md) and [Database](./03-database/README.md) as needed
4. Use [Development](./07-development/README.md) for standards

### For System Administrators

1. Read [Deployment](./08-deployment/README.md) thoroughly
2. Set up [Monitoring](./08-deployment/04-monitoring.md)
3. Follow [Maintenance](./09-maintenance/README.md) schedule
4. Keep [Security Updates](./09-maintenance/02-security-updates.md) current

---

## 📮 Documentation Updates

**Last Major Update:** 2026-06-27
**Current Version:** 1.0
**Status:** ✅ Complete restructure & consolidation

**Recent Changes:**
- ✅ Reorganized 74 files into 10 logical sections
- ✅ Created master navigation hub
- ✅ Consolidated duplicate content
- ✅ Added Lesson Plan Review module docs
- ✅ Archived temporary session files
- ✅ Created reading paths for different roles

---

## 🔍 Quick Links

**Essential Files:**
- [Project README](../README.md) - Project overview
- [Installation Guide](./01-getting-started/02-installation.md)
- [API Reference](./10-references/03-api-reference.md)
- [Database Schema](./10-references/04-database-schema.md)
- [Troubleshooting](./07-development/05-troubleshooting.md)
- [Changelog](./09-maintenance/04-changelog.md)

**External Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs)

---

## 💡 Tips for Success

1. **Don't skip prerequisites** - Set up your environment properly first
2. **Follow the order** - Documentation builds on previous sections
3. **Try examples** - Code snippets are meant to be tested
4. **Keep notes** - Document your learnings and customizations
5. **Ask questions** - Use issues/discussions for clarification
6. **Contribute back** - Improve docs as you learn

---

**Ready to start? → [Begin with Getting Started](./01-getting-started/README.md)**

---

*This documentation structure follows industry best practices for large-scale application documentation. Inspired by: Stripe Docs, AWS Docs, and Vercel Docs.*
