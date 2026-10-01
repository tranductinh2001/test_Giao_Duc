# System Overview

## Project Purpose

The Education Platform is a comprehensive lesson plan management system designed for Vietnamese educators. It enables:

- **Lesson Plan Management**: Create, edit, review, and collaborate on lesson plans
- **AI-Powered Review**: Automated review using Gemini AI with customizable rules
- **Book Intelligence**: Automatic textbook detection, chapter matching, and content extraction
- **Knowledge Center**: Organize educational content by books, grades, subjects, and lessons
- **Rule Studio**: Create and manage review rules for different lesson types

## Main Modules

### 1. Lesson Plan Module
- Upload DOCX, DOC, PDF, and images (PNG, JPG, JPEG, WEBP, TIFF)
- Parse and extract structured content
- Version control and collaboration
- Export to multiple formats

### 2. Review Module
- AI-powered content review using Gemini
- Rule-based validation
- Annotation and suggestion system
- Score calculation and reporting

### 3. Book Intelligence Module
- Textbook management (upload, index, search)
- TOC (Table of Contents) indexing
- Automatic lesson-to-chapter matching
- Page extraction with caching

### 4. Workflow Module
- Orchestrates the entire upload-to-review pipeline
- Session-based progress tracking
- Error handling and recovery

### 5. Knowledge Center Module
- Hierarchical content organization (Book → Grade → Subject → Lesson)
- Content mapping and relationships

### 6. Rule Engine Module
- Section structure rules
- Content scoring rules
- Fix generation rules

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Admin    │  Teacher   │  Workspace  │  Dashboard  │  Public   │
└─────┬──────┴─────┬─────┴──────┬─────┴──────┬─────┴────┬─────┘
      │            │            │            │          │
      └────────────┴────────────┴────────────┴──────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Next.js API      │
                    │   (Route Handlers) │
                    └─────────┬─────────┘
                              │
      ┌───────────────────────┼───────────────────────┐
      │                       │                       │
┌─────▼─────┐      ┌────────▼────────┐    ┌────────▼────────┐
│  Auth     │      │  Workflow        │    │  Knowledge      │
│  Service  │      │  Orchestrator    │    │  Mapping        │
└───────────┘      └────────┬────────┘    └─────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌───────▼───────┐  ┌──────▼──────┐
│  BrightOne    │  │  Rule Engine   │  │  Book       │
│  Adapter      │  │  V2            │  │  Intelligence│
└───────────────┘  └────────────────┘  └──────────────┘
        │                                    │
        └────────────────┬───────────────────┘
                         │
              ┌──────────▼──────────┐
              │   PostgreSQL        │
              │   (Prisma ORM)      │
              └─────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 16.2.9 (App Router)
- **UI Library**: React 19.2.4
- **Styling**: Tailwind CSS 3.4.19
- **State Management**: React hooks + Context
- **Icons**: Lucide React 1.21.0
- **Animations**: Framer Motion 12.42.0, GSAP 3.15.0
- **Document Editor**: Syncfusion DocumentEditor 34.1.30

### Backend
- **Runtime**: Next.js API Routes
- **Language**: TypeScript 5.x
- **ORM**: Prisma 7.8.0
- **Authentication**: NextAuth.js 5.0 (JWT strategy)
- **Validation**: Zod 4.4.3

### Database
- **Database**: PostgreSQL (Neon)
- **Caching**: Upstash Redis (rate limiting)

### AI Services
- **Document Parsing**: BrightOne (Beeknoee) API
- **AI Review**: Google Gemini 2.5 Flash Lite

### File Processing
- **PDF**: pdf-lib, mammoth (DOCX)
- **DOCX**: docx, mammoth
- **OCR**: BrightOne built-in

### Infrastructure
- **Deployment**: Vercel (configured)
- **Database Hosting**: Neon (PostgreSQL)
- **Rate Limiting**: Upstash

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API route handlers
│   │   ├── admin/         # Admin APIs
│   │   ├── auth/          # Authentication APIs
│   │   ├── lesson-plans/  # Lesson plan APIs
│   │   ├── workflow/      # Workflow APIs
│   │   └── ...
│   ├── dashboard/         # Teacher dashboard
│   ├── lesson-plans/      # Lesson plan pages
│   └── ...
│
├── core/                   # Core business logic
│   ├── annotations/       # Annotation handling
│   ├── ai-review/        # AI review services
│   ├── ai-suggestion/    # AI suggestion engine
│   ├── document-adapters/ # File parsing adapters
│   ├── knowledge-mapping/ # Knowledge mapping
│   ├── lesson-plan-pipeline/ # Legacy pipeline
│   ├── review-annotation/ # Review annotations
│   ├── review-context/    # Review context builder
│   ├── rule-engine-v2/   # Rule engine
│   ├── textbook/         # Book Intelligence
│   └── workflow/         # Workflow orchestration
│
├── components/            # React components
│   ├── admin/           # Admin components
│   ├── dashboard/       # Dashboard components
│   ├── editor-v2/       # Editor components
│   ├── landing/         # Landing page components
│   └── ui/              # Shared UI components
│
├── features/             # Feature modules
│   ├── exams/           # Exam features
│   ├── licenses/        # License features
│   └── questions/       # Question features
│
├── lib/                  # Utility libraries
│   ├── prisma.ts        # Database client
│   ├── auth.ts          # Auth configuration
│   ├── workflow-service.ts # Workflow service
│   ├── textbook-workflow.ts # Textbook workflow
│   └── ...
│
└── types/               # TypeScript types
```

## Data Flow

### Upload Flow
```
1. User uploads file via UI
   ↓
2. API validates file type/size
   ↓
3. File saved to public/uploads/
   ↓
4. LessonPlan record created
   ↓
5. Workflow triggered (/api/workflow/process)
   ↓
   ├─ Load file from storage
   ├─ Detect textbook (optional)
   ├─ Match chapter (if textbook)
   ├─ Extract pages from cache or PDF
   ├─ Optimize payload
   ├─ Send to BrightOne for parsing
   ├─ Save sections to database
   └─ Update status to PARSED
```

### Review Flow
```
1. User clicks "Review" button
   ↓
2. API starts workflow (/api/workflow/stream)
   ↓
   ├─ Create WorkflowSession
   ├─ Get document from sections
   ├─ Find textbook context (optional)
   ├─ Load template (5STEP)
   ├─ Execute WorkflowOrchestrator
   │   ├─ Parse document
   │   ├─ Knowledge mapping
   │   ├─ AI review
   │   ├─ Generate suggestions
   │   └─ Create annotations
   ├─ Save results to database
   └─ Update status to REVIEWED
```

## Key Configuration

### Environment Variables
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=...
BEEKNOEE_API_KEY=...
BEE_BASE_URL=https://platform.beeknoee.com
UPSTASH_REDIS_REST_URL=...
```

### Supported File Types
- **Documents**: DOCX, DOC, PDF
- **Images**: PNG, JPG, JPEG, WEBP, BMP, TIFF

### File Size Limits
- Maximum: 10MB per file

## Database Models

The system uses 70+ Prisma models including:
- User, Account, Session (authentication)
- LessonPlan, LessonPlanSection, LessonPlanVersion (lesson plans)
- ReviewResult, Annotation, Suggestion (reviews)
- WorkflowSession, WorkflowStep (workflows)
- TextbookBook, TextbookChapter (book intelligence)
- Question, Exam, ExamAttempt (assessments)
- And many more for licensing, recruitment, feedback, etc.
