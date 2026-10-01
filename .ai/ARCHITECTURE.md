# ARCHITECTURE DOCUMENTATION

## Current Architecture (To Be Removed)

### Overview
The existing system uses **Tiptap** (ProseMirror wrapper) as the primary editor with a mixed HTML/DOCX workflow.

---

## Current System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  - React Components (17 in lesson-plans/)                   │
│  - Tiptap Editor Wrapper (LessonPlanEditor.tsx)            │
│  - Review Panels, Modals, Toolbars                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      EDITOR CORE LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  - Tiptap Editor Instance                                   │
│  - ProseMirror (underlying)                                 │
│  - Custom Nodes (section, objective, activity)             │
│  - Custom Marks (highlight, comment, suggestion)           │
│  - Commands (addReviewHighlight, navigateToAnnotation)     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOCUMENT MODEL LAYER                     │
├─────────────────────────────────────────────────────────────┤
│  - DocumentNode (Tiptap/ProseMirror structure)             │
│  - ReviewAnnotation (comments, suggestions)                │
│  - SectionMetadata (section info)                          │
│  - LessonPlanDocument (top-level wrapper)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     PERSISTENCE LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  - Prisma ORM                                               │
│  - PostgreSQL Database                                      │
│  - Tables: LessonPlan, LessonPlanSection, Annotation       │
└─────────────────────────────────────────────────────────────┘
```

---

## Current Data Flow

### Upload & Parse Flow
```
1. User uploads DOCX
   ↓
2. API: /api/lesson-plans/upload
   ↓
3. File saved to uploads/
   ↓
4. Parse button clicked
   ↓
5. API: /api/lesson-plans/[id]/parse
   ↓
6. mammoth.js converts DOCX → HTML
   ↓
7. section-detector.ts detects sections
   ↓
8. Sections saved to database
   ↓
9. Status: PARSED
```

### Review Flow (Current)
```
1. User clicks "Review"
   ↓
2. Navigate to /lesson-plans/[id]/review
   ↓
3. Component: FullDocumentViewer.tsx
   ↓
4. Load sections from API
   ↓
5. Render HTML content
   ↓
6. User clicks "Start Review"
   ↓
7. API: /api/lesson-plans/[id]/review-stream
   ↓
8. Beeknoee AI analyzes each section
   ↓
9. Annotations created (streaming)
   ↓
10. Highlights applied to HTML
   ↓
11. Annotations saved to database
```

### Editor Flow (Attempted, Incomplete)
```
1. User clicks "Mở trong Word Editor" (planned)
   ↓
2. Navigate to /lesson-plans/[id]/word-review (BROKEN)
   ↓
3. Component: WordReviewWorkspace.tsx (MISSING)
   ↓
4. Would load ONLYOFFICE Editor (not implemented)
   ↓
5. Would stream AI analysis (not implemented)
   ↓
6. Would inject comments (not implemented)
```

---

## Current Module Structure

### src/components/lesson-plans/
```
lesson-plans/
├── AnnotatedEditor.tsx           [OLD - Tiptap based]
├── RichAnnotatedEditor.tsx       [OLD - Tiptap based]
├── LessonPlanEditor.tsx          [OLD - Main Tiptap wrapper]
├── EditorWorkspace.tsx           [OLD - Layout component]
├── ReviewPanel.tsx               [OLD - Sidebar UI]
├── FullDocumentViewer.tsx        [OLD - HTML viewer]
├── SectionEvaluationPanel.tsx    [OLD - Section UI]
├── AnnotationSummaryDashboard.tsx [OLD - Stats UI]
├── EditorToolbar.tsx             [ANALYZE - May reuse]
├── AIAnalysisPanel.tsx           [ANALYZE - May reuse]
├── VersionHistory.tsx            [ANALYZE - May reuse]
├── ShareModal.tsx                [OLD - Feature modal]
├── EditLessonPlanModal.tsx       [OLD - CRUD modal]
├── EditSectionModal.tsx          [OLD - Section modal]
├── VersionHistoryModal.tsx       [OLD - Version modal]
└── ModelSelectionModal.tsx       [OLD - AI picker]
```

### src/lib/editor/
```
editor/
├── document-model.ts             [PARTIAL REUSE - Types]
├── schema/
│   ├── nodes.ts                  [OLD - Tiptap nodes]
│   └── marks.ts                  [OLD - Tiptap marks]
└── commands/
    └── index.ts                  [OLD - Tiptap commands]
```

### src/app/lesson-plans/[id]/
```
[id]/
├── page.tsx                      [KEEP - Detail page]
├── editor/
│   └── page.tsx                  [OLD - Remove]
├── review/
│   └── page.tsx                  [OLD - Will replace]
├── word-review/
│   └── page.tsx                  [BROKEN - Remove]
└── new-editor/
    └── page.tsx                  [OLD - Remove]
```

---

## Current Technology Stack

### Frontend
- **Next.js 16.2.9** - React framework
- **React 19.2.4** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 3.4.19** - Styling
- **Framer Motion 12.42.0** - Animations

### Editor (Current - To Remove)
- **Tiptap 3.27.1** - Rich text editor
- **ProseMirror** - (via Tiptap)

### Document Processing
- **mammoth.js 1.12.0** - DOCX → HTML conversion
- **docx 9.7.1** - DOCX generation
- **pizzip 3.2.0** - ZIP handling for DOCX

### AI Integration
- **Beeknoee API** - AI analysis (custom)
- Models: gemini-3.1-flash-lite (default)

### Database
- **Prisma 7.8.0** - ORM
- **PostgreSQL** - Database
- **@prisma/client 7.8.0**

---

## Current Database Schema (Relevant Tables)

### LessonPlan
```prisma
model LessonPlan {
  id          String   @id @default(cuid())
  title       String
  description String?
  filePath    String   // uploads/lesson-plans/xxx.docx
  status      String   // UPLOADED, PARSING, PARSED, REVIEWING, REVIEWED
  createdAt   DateTime
  updatedAt   DateTime
  
  sections    LessonPlanSection[]
  annotations Annotation[]
  reviewResults ReviewResult[]
}
```

### LessonPlanSection
```prisma
model LessonPlanSection {
  id             String   @id @default(cuid())
  lessonPlanId   String
  sectionType    String   // OBJECTIVE, ACTIVITY, etc.
  sectionTitle   String
  sectionOrder   Int
  content        String?  // HTML content
  rawContent     String?  // Original text
  
  lessonPlan     LessonPlan @relation(...)
  annotations    Annotation[]
}
```

### Annotation
```prisma
model Annotation {
  id               String   @id @default(cuid())
  lessonPlanId     String
  sectionId        String?
  annotationType   String   // COMMENT, SUGGESTION, ISSUE
  severity         String   // INFO, WARNING, ERROR, CRITICAL
  status           String   // PENDING, ACCEPTED, REJECTED
  issue            String?
  message          String?
  explanation      String?
  suggestion       String?
  proposedContent  String?
  startPosition    Int?
  endPosition      Int?
  ruleId           String?
  
  lessonPlan       LessonPlan @relation(...)
  section          LessonPlanSection? @relation(...)
}
```

---

## Current API Routes (Lesson Plans)

### Core Routes
- `POST /api/lesson-plans` - Create lesson plan
- `GET /api/lesson-plans/[id]` - Get lesson plan details
- `DELETE /api/lesson-plans/[id]` - Delete lesson plan

### Parse & Section Routes
- `POST /api/lesson-plans/[id]/parse` - Parse DOCX to sections
- `GET /api/lesson-plans/[id]/sections` - Get all sections
- `PUT /api/lesson-plans/[id]/sections` - Update sections

### Review Routes
- `POST /api/lesson-plans/[id]/review` - Start review (non-streaming)
- `GET /api/lesson-plans/[id]/review-stream` - Start review (streaming)
- `GET /api/lesson-plans/[id]/annotations` - Get all annotations
- `PUT /api/lesson-plans/[id]/annotations/[annotationId]` - Update annotation

### Export Routes
- `GET /api/lesson-plans/[id]/export?format=docx` - Export DOCX
- `GET /api/lesson-plans/[id]/export?format=pdf` - Export PDF

### Version Routes
- `GET /api/lesson-plans/[id]/versions` - Get version history
- `POST /api/lesson-plans/[id]/versions` - Create version

---

## Current Problems (Why Refactoring)

### 1. Tightly Coupled Architecture
- Tiptap editor directly manipulates DOM
- AI logic mixed with rendering logic
- No clear separation of concerns

### 2. No Internal Document Model
- Relies on Tiptap's ProseMirror structure
- AI cannot work independently of UI
- Hard to test business logic

### 3. Mixed Responsibilities
- Components do too many things
- LessonPlanEditor.tsx has 162 lines doing rendering + state + commands
- EditorWorkspace.tsx mixes layout + data loading + API calls

### 4. Incomplete ONLYOFFICE Migration
- Previous attempt to add ONLYOFFICE abandoned mid-implementation
- Left broken routes and missing components
- Build currently failing

### 5. Vendor Lock-in
- Hard dependency on Tiptap/ProseMirror
- Cannot easily switch editor libraries
- Custom nodes/marks tied to Tiptap API

### 6. Poor Extensibility
- Adding new review features requires modifying core editor
- No plugin system
- Hard to add new annotation types

### 7. Performance Issues
- Re-renders entire document on every annotation
- No virtualization for large documents
- Expensive highlighting operations

---

## Target Architecture (New System)

### Layered Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER (UI)                     │
│  - Pure React components (no editor logic)                  │
│  - Toolbar, Panels, Modals (UI only)                       │
│  - Document Renderer (reads from model)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      EDITOR CORE                             │
│  - Editor Controller (orchestration)                        │
│  - View Synchronization (model → UI)                        │
│  - Event Handling (UI → commands)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   DOCUMENT MODEL (Core)                      │
│  - Immutable Document Tree                                  │
│  - Section Nodes, Paragraph Nodes, Text Nodes              │
│  - Annotation Registry                                      │
│  - Selection State                                          │
│  - **SINGLE SOURCE OF TRUTH**                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     COMMAND LAYER                            │
│  - Command Pattern (Insert, Delete, Update, etc.)          │
│  - Undo/Redo Stack                                          │
│  - Transaction Management                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     REVIEW ENGINE                            │
│  - Annotation Manager                                       │
│  - AI Integration (provider-agnostic)                       │
│  - Review Workflow                                          │
│  - Suggestion System                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 IMPORT / EXPORT ADAPTERS                     │
│  - DOCX Adapter (mammoth + docx)                           │
│  - HTML Adapter                                             │
│  - JSON Adapter                                             │
│  - Future: PDF, Markdown, etc.                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  PERSISTENCE LAYER                           │
│  - Repository Pattern                                       │
│  - Prisma ORM                                               │
│  - PostgreSQL                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles
1. **Immutable Document Model** - No direct DOM manipulation
2. **Command Pattern** - All changes via commands
3. **Layered Separation** - Clear boundaries between layers
4. **Provider Agnostic** - No vendor lock-in
5. **AI-First** - AI works with model, not UI
6. **Testable** - Each layer independently testable

---

## Migration Strategy

### Phase 1: Remove Old (Milestones 2-3)
- Remove all Tiptap dependencies
- Remove all old editor components
- Remove old routes
- Clean up imports

### Phase 2: Build New Core (Milestones 4-6)
- Implement new document model
- Implement command layer
- Implement review engine

### Phase 3: Build New UI (Milestones 7-9)
- Create new UI components
- Create new renderer
- Create new toolbar/panels

### Phase 4: Integration (Milestones 10-11)
- Connect UI to core
- Implement import/export
- Migrate API routes

### Phase 5: Testing & Launch (Milestone 12)
- End-to-end testing
- Performance optimization
- Production deployment

---

**End of Architecture Document**
