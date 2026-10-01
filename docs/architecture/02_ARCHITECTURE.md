# Architecture

## Frontend Architecture

### Tech Stack
- **Framework**: Next.js 16.2.9 (App Router)
- **React**: 19.2.4
- **Styling**: Tailwind CSS 3.4.19 with custom design system

### Page Structure

#### Public Pages
- `/` - Landing page with features, categories, pricing
- `/login` - Authentication
- `/register` - User registration
- `/faq` - Frequently asked questions

#### Admin Pages (`/admin`)
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/questions` - Question bank
- `/admin/exams` - Exam management
- `/admin/templates` - Lesson plan templates
- `/admin/textbooks` - Textbook management
- `/admin/categories` - Category management
- `/admin/circulars` - Circular documents
- `/admin/section-rules` - Rule studio
- `/admin/knowledge-center` - Knowledge base
- `/admin/recruitment` - Recruitment
- `/admin/feedback` - Feedback
- `/admin/licenses` - License management

#### Teacher Pages (`/dashboard`)
- `/dashboard` - Teacher dashboard
- `/dashboard/exams` - Exam history
- `/dashboard/insights` - Analytics

#### Lesson Plans (`/lesson-plans`)
- `/lesson-plans` - Lesson plan list
- `/lesson-plans/upload` - Upload new lesson
- `/lesson-plans/[id]` - View lesson plan
- `/lesson-plans/[id]/workspace` - Edit workspace
- `/lesson-plans/[id]/review` - Review interface
- `/lesson-plans/[id]/word-editor` - Word editor
- `/lesson-plans/[id]/quick-view` - Quick preview

### Component Architecture

```
src/components/
├── ui/                    # Base UI components
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   └── ...
│
├── admin/                # Admin-specific components
│   ├── ThemeSettingsPanel.tsx
│   └── ...
│
├── dashboard/            # Dashboard components
│   ├── HeroCard.tsx
│   ├── NotificationTicker.tsx
│   ├── ExamsClient.tsx
│   └── ...
│
├── editor-v2/           # Editor components
│   └── nodes/
│       └── TextNode.tsx
│
├── landing/             # Landing page components
│   ├── modern-hero.tsx
│   ├── modern-navbar.tsx
│   ├── modern-categories.tsx
│   ├── modern-features.tsx
│   ├── modern-pricing.tsx
│   ├── modern-faq.tsx
│   └── modern-footer.tsx
│
└── error-boundary.tsx
```

### State Management
- **Local State**: React useState/useReducer
- **Server State**: React Server Components + fetch
- **Auth State**: NextAuth.js session provider
- **Theme State**: next-themes (dark/light mode)

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## Backend Architecture

### API Structure

The backend uses Next.js Route Handlers organized by feature:

```
src/app/api/
├── auth/                    # Authentication
│   ├── [...nextauth]/       # NextAuth.js handler
│   ├── register/           # User registration
│   ├── forgot-password/   # Password reset
│   └── reset-password/   # Password change
│
├── admin/                   # Admin APIs
│   ├── users/             # User management
│   ├── questions/         # Question bank
│   ├── exams/             # Exam management
│   ├── templates/         # Template management
│   ├── textbooks/         # Textbook management
│   ├── section-rules/     # Rule management
│   ├── knowledge-center/  # Knowledge center
│   └── stats/            # Statistics
│
├── lesson-plans/           # Lesson plan APIs
│   ├── upload/           # File upload
│   └── [id]/             # CRUD operations
│       ├── sections/     # Section management
│       ├── annotations/  # Annotations
│       ├── review/       # Review
│       └── export/       # Export
│
├── workflow/              # Workflow APIs
│   ├── stream/           # Start & monitor workflow
│   ├── process/          # Process lesson plan
│   └── [sessionId]/     # Session management
│
├── textbook/             # Textbook APIs
│   └── monitoring/      # Monitoring
│
└── user/                 # User-specific APIs
    ├── profile/
    ├── quota/
    └── stats/
```

### Request Flow
```
Client Request
       ↓
Next.js Route Handler
       ↓
Authentication (NextAuth.js)
       ↓
Validation (Zod)
       ↓
Business Logic (Service/Repository)
       ↓
Database (Prisma)
       ↓
Response
```

### Authentication
- **Strategy**: JWT (JSON Web Token)
- **Provider**: NextAuth.js with Prisma Adapter
- **Session**: HTTP-only cookies
- **Token Rotation**: Every 24 hours

---

## Workflow Architecture

### Components

#### 1. WorkflowOrchestrator (`src/core/rule-engine-v2/workflow/WorkflowOrchestrator.ts`)
Main orchestrator that coordinates the entire review pipeline:
- Parse document structure
- Knowledge mapping
- Content review
- Score calculation
- Fix generation
- Annotation creation

#### 2. Workflow Service (`src/lib/workflow-service.ts`)
Database-backed workflow management:
- Creates WorkflowSession records
- Tracks progress via WorkflowStep
- Persists results (parse, review, annotation)
- Handles errors and recovery

#### 3. Workflow API (`src/app/api/workflow/stream/route.ts`)
HTTP endpoints:
- POST: Start workflow
- GET: Get workflow result
- DELETE: Cancel workflow

### Workflow States
```typescript
enum WorkflowStatus {
  PENDING = "PENDING",
  PARSING = "PARSING",
  MAPPING = "MAPPING",
  AI_REVIEWING = "AI_REVIEWING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED"
}
```

### Pipeline Steps
1. **PARSING**: Extract document structure using BrightOne
2. **MAPPING**: Map content to knowledge base
3. **AI_REVIEWING**: Run AI review with Gemini
4. **ANNOTATION**: Create annotations for issues
5. **COMPLETED**: All steps finished

---

## AI Architecture

### Document Parsing

#### BrightOneAdapter (`src/core/document-adapters/BrightOneAdapter.ts`)
- Handles PDF and image files
- Uses BrightOne (Beeknoee) API
- Extracts markdown with layout markers
- Returns UnifiedDocument structure

**Flow:**
```
File (Buffer) → BrightOne API → Markdown → UnifiedDocument
```

**Markers Used:**
```
[SECTION] - New section
[HEADING:1/2/3] - Headings
[PARAGRAPH] - Paragraphs
[TABLE_START/ROW/TABLE_END] - Tables
[LIST/ITEM] - Lists
[PAGE:N] - Page markers
```

### AI Review

#### ReviewContextBuilder (`src/core/review-context/engine/ReviewContextBuilder.ts`)
- Builds context for AI review
- Optimizes payload size
- Chunks large documents

#### GeminiClient (`src/core/ai-review/services/GeminiClient.ts`)
- Communicates with Gemini API
- Handles retry logic
- Tracks token usage

#### PromptBuilder (`src/core/ai-review/services/PromptBuilder.ts`)
- Constructs review prompts
- Includes rules and templates
- Formats context

### Model Selection
- **Document Parsing**: google/gemini-2.5-flash-lite (via BrightOne)
- **AI Review**: gemini-2.0-flash-exp (configurable)

---

## Book Intelligence Architecture

### Components

#### 1. Matcher (`src/core/textbook/matcher.ts`)
Matches lesson titles to textbook chapters:
- `smartMatch()` - Primary matching function
- `findTextbookContext()` - Find textbook for grade/subject
- `getAvailableTextbooks()` - List textbooks
- Matching methods: exact, fuzzy, number_word, sequence, advanced_heuristic

#### 2. Extractor (`src/core/textbook/extractor.ts`)
Extracts pages from PDFs:
- `extractPages()` - Extract specific page range
- `extractChapter()` - Extract by chapter ID
- Uses pdf-lib for PDF manipulation

#### 3. Cache (`src/core/textbook/cache.ts`)
Caches extracted content:
- `getCachedPdf()` - Retrieve cached PDF
- `setCachedPdf()` - Store extracted PDF
- 7-day TTL

#### 4. Indexer (`src/core/textbook/indexer.ts`)
Indexes textbook TOC:
- `runTocIndexing()` - Index all chapters
- `getIndexStats()` - Get indexing status

#### 5. Validator (`src/core/textbook/validator.ts`)
Validates TOC structure:
- `validateToc()` - Check chapter ordering
- `fixTocIssues()` - Auto-fix issues

#### 6. Optimizer (`src/core/textbook/optimizer.ts`)
Optimizes extracted content:
- Deduplication
- Whitespace compression
- Header/footer removal

#### 7. Queue (`src/core/textbook/queue.ts`)
Background job management:
- `createJob()` - Create job
- `processQueue()` - Process jobs
- States: PENDING, RUNNING, COMPLETED, FAILED, RETRY

#### 8. Monitoring (`src/core/textbook/monitoring.ts`)
Tracks execution metrics:
- Token usage
- Execution time
- Success/failure rates

### Textbook Workflow (`src/lib/textbook-workflow.ts`)
- `executeTextbookWorkflow()` - Full workflow
- `detectTextbook()` - Auto-detect from file
- `processTextbookJob()` - Process queue job

---

## Security Architecture

### Authentication
- NextAuth.js with JWT strategy
- HTTP-only session cookies
- 24-hour token rotation

### Authorization
- Role-based access control (RBAC)
- Roles: ADMIN, LEARNER
- Session-based permission check

### Input Validation
- Zod schemas for all inputs
- File type validation (MIME types)
- File size limits (10MB max)

### Rate Limiting
- Upstash Redis for rate limiting
- Per-user limits on AI operations

### File Security
- Files stored outside web root
- UUID-based filenames
- Extension validation

---

## Caching Architecture

### Types of Cache

#### 1. PDF Cache (`TextbookCacheEntry`)
- Stores extracted PDF pages
- Key: chapterId
- TTL: 7 days

#### 2. Workflow Results (`WorkflowSession`)
- Stores parse/review results
- Permanent until deleted

#### 3. Rate Limiting (`Upstash Redis`)
- Per-user rate limits
- Sliding window algorithm

#### 4. Knowledge Mapping Cache (`LessonCache`)
- Caches lesson lookups
- Reduces DB queries

---

## Storage Architecture

### File Storage
```
public/uploads/
├── lesson-plans/       # Uploaded lesson plans
│   └── {year}/{month}/{uuid}.{ext}
│
└── textbooks/          # Textbook PDFs
    └── {bookId}/{filename}
```

### Database Storage
- Neon PostgreSQL (cloud-hosted)
- Prisma ORM for queries

### Configuration Storage
- Environment variables
- SystemConfig database table for runtime config
