# Database

## Overview

The database uses PostgreSQL with Prisma ORM. The schema contains 70+ models organized by functional domain.

## Database Connection

**File:** `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## Core Models

### Authentication

```prisma
model User {
  id            String    @id @default(uuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          String    @default("LEARNER")  // ADMIN, LEARNER
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  lessonPlans   LessonPlan[]
}

model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Lesson Plans

```prisma
model LessonPlan {
  id              String   @id @default(uuid())
  title           String
  filePath        String?
  fileType        String?
  fileSize        Int?
  status          String   @default("UPLOADED")  // UPLOADED, PARSING, PARSED, REVIEWING, REVIEWED, FAILED

  subject         String?
  gradeLevel      String?
  schoolYear      String?

  // Relations
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  circularId      String?
  circular        Circular? @relation(fields: [circularId], references: [id])
  textbookBookId  String?
  textbookBook    TextbookBook? @relation(fields: [textbookBookId], references: [id])

  sections        LessonPlanSection[]
  versions        LessonPlanVersion[]
  reviewResults   ReviewResult[]
  annotations    Annotation[]
  suggestions    Suggestion[]
  mappings       MappingResult[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model LessonPlanSection {
  id              String   @id @default(uuid())
  lessonPlanId    String
  lessonPlan      LessonPlan @relation(fields: [lessonPlanId], references: [id], onDelete: Cascade)

  sectionType     String?
  sectionTitle    String?
  rawContent      String?
  parsedContent   Json?
  sectionOrder    Int      @default(0)

  versionNumber   Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model LessonPlanVersion {
  id              String   @id @default(uuid())
  lessonPlanId    String
  lessonPlan      LessonPlan @relation(fields: [lessonPlanId], references: [id], onDelete: Cascade)

  versionNumber   Int
  title           String
  filePath        String?
  status          String

  createdAt       DateTime @default(now())
  createdById     String?
}
```

---

## Review System

```prisma
model ReviewResult {
  id              String   @id @default(uuid())
  lessonPlanId    String
  lessonPlan      LessonPlan @relation(fields: [lessonPlanId], references: [id], onDelete: Cascade)

  templateCode    String   @default("5STEP")
  overallScore    Float    @default(0)

  structureScore  Float?
  contentScore   Float?
  clarityScore   Float?
  alignmentScore Float?

  structureIssues Int     @default(0)
  contentIssues  Int      @default(0)
  clarityIssues   Int     @default(0)
  alignmentIssues Int      @default(0)

  totalIssues     Int     @default(0)
  status          String  @default("PENDING")

  aiModel         String?
  totalTokens     Int     @default(0)
  totalCost       Float   @default(0)

  completedAt     DateTime?

  annotations     Annotation[]
  suggestions     Suggestion[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Annotation {
  id              String   @id @default(uuid())
  reviewResultId  String
  reviewResult    ReviewResult @relation(fields: [reviewResultId], references: [id], onDelete: Cascade)

  lessonPlanId    String?
  lessonPlan      LessonPlan? @relation(fields: [lessonPlanId], references: [id])

  sectionId       String?
  annotationType  String   // STRUCTURE, CONTENT, FORMAT, SUGGESTION
  severity        String   // CRITICAL, ERROR, WARNING, INFO

  message         String
  explanation     String?
  suggestion      String?
  proposedContent String?

  startPosition   Int?
  endPosition    Int?

  status          String   @default("PENDING")  // PENDING, ACCEPTED, REJECTED

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Suggestion {
  id              String   @id @default(uuid())
  lessonPlanId    String
  lessonPlan      LessonPlan @relation(fields: [lessonPlanId], references: [id], onDelete: Cascade)

  reviewResultId  String?
  reviewResult    ReviewResult? @relation(fields: [reviewResultId], references: [id])

  annotationId    String?
  sectionId       String?

  instruction     String
  originalContent String
  proposedContent String
  confidence      Float    @default(0)

  status          String   @default("PENDING")  // PENDING, APPLIED, REJECTED

  appliedAt       DateTime?
  createdAt       DateTime @default(now())
}
```

---

## Workflow

```prisma
model WorkflowSession {
  id              String   @id @default(uuid())
  lessonPlanId    String
  userId          String

  status          String   @default("PENDING")
  currentStep     String   @default("PENDING")
  progress        Int      @default(0)

  // Results stored as JSON
  parseResult     Json?
  mappingResult   Json?
  reviewResult    Json?
  annotationResult Json?
  suggestionResult Json?

  // Metrics
  totalAiCalls    Int      @default(0)
  totalTokens     Int      @default(0)
  totalCost       Float    @default(0)
  executionTime   Int      @default(0)

  // Error tracking
  errorMessage    String?
  errorDetails    Json?

  // Timestamps
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  steps           WorkflowStep[]
}

model WorkflowStep {
  id              String   @id @default(uuid())
  sessionId       String
  session         WorkflowSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  stepName        String
  status          String   @default("PENDING")
  progress        Int      @default(0)

  inputData       Json?
  outputData      Json?
  errorMessage    String?

  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
}
```

---

## Book Intelligence

```prisma
model TextbookBook {
  id              String   @id @default(uuid())
  name            String
  grade           String?
  subject         String?
  pdfPath         String?
  pageCount       Int      @default(0)

  tocStatus       String   @default("PENDING")  // PENDING, PROCESSING, COMPLETED, FAILED
  tocLastIndexed DateTime?

  isActive        Boolean  @default(true)

  chapters        TextbookChapter[]
  lessonPlans     LessonPlan[]
  cacheEntries    TextbookCacheEntry[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model TextbookChapter {
  id              String   @id @default(uuid())
  bookId          String
  book            TextbookBook @relation(fields: [bookId], references: [id], onDelete: Cascade)

  title           String
  chapterNumber   Int?
  aliases         String[] @default([])

  startPage       Int
  endPage         Int
  confidence      Float    @default(0)

  isActive        Boolean  @default(true)

  cacheEntries    TextbookCacheEntry[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model TextbookCacheEntry {
  id              String   @id @default(uuid())
  chapterId       String   @unique
  chapter         TextbookChapter @relation(fields: [chapterId], references: [id])

  bookId          String
  book            TextbookBook @relation(fields: [bookId], references: [id])

  filePath        String
  fileSize        Int
  startPage       Int
  endPage         Int

  hitCount        Int      @default(0)
  expiresAt       DateTime
  lastAccessedAt  DateTime?

  createdAt       DateTime @default(now())
}

model TextbookQueueJob {
  id              String   @id @default(uuid())
  jobType         String   // TEXTBOOK_INDEX, TEXTBOOK_EXTRACT, OCR_PROCESS
  payload         Json
  status          String   @default("PENDING")

  priority        Int      @default(5)
  retryCount     Int      @default(0)
  maxRetries     Int      @default(3)

  result          Json?
  errorMessage    String?

  startedAt       DateTime?
  completedAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## Knowledge Center

```prisma
model KnowledgeBook {
  id              String   @id @default(uuid())
  name            String
  description     String?
  coverImage      String?
  isActive        Boolean  @default(true)

  grades          KnowledgeGrade[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model KnowledgeGrade {
  id              String   @id @default(uuid())
  bookId          String
  book            KnowledgeBook @relation(fields: [bookId], references: [id], onDelete: Cascade)

  name            String   // e.g., "Lớp 10", "Lớp 11"
  order           Int      @default(0)

  subjects        KnowledgeSubject[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model KnowledgeSubject {
  id              String   @id @default(uuid())
  gradeId         String
  grade           KnowledgeGrade @relation(fields: [gradeId], references: [id], onDelete: Cascade)

  name            String   // e.g., "Toán", "Văn", "Anh"
  code            String?
  order           Int      @default(0)

  lessons         KnowledgeLesson[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model KnowledgeLesson {
  id              String   @id @default(uuid())
  subjectId       String
  subject         KnowledgeSubject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  name            String   // e.g., "Đại số", "Hình học"
  code            String?
  order           Int      @default(0)

  mappings        MappingResult[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model MappingResult {
  id              String   @id @default(uuid())
  lessonPlanId    String
  lessonPlan      LessonPlan @relation(fields: [lessonPlanId], references: [id], onDelete: Cascade)

  lessonId        String?
  lesson          KnowledgeLesson? @relation(fields: [lessonId], references: [id])

  score           Float    @default(0)
  isAutoMatched   Boolean  @default(false)

  createdAt       DateTime @default(now())
}
```

---

## Rule Engine

```prisma
model ReviewTemplate {
  id              String   @id @default(uuid())
  code            String   @unique  // e.g., "5STEP", "4STEP"
  name            String
  description     String?
  isActive        Boolean  @default(true)

  structureRules  SectionStructureRule[]
  scoringRules    SectionScoringRule[]
  fixRules        SectionFixRule[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model SectionStructureRule {
  id              String   @id @default(uuid())
  templateId      String
  template        ReviewTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  ruleType        String   // ORDER, REQUIRED, FORBIDDEN
  sectionCode     String
  targetSection   String?
  position        Int?

  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
}

model SectionScoringRule {
  id              String   @id @default(uuid())
  templateId      String
  template        ReviewTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  sectionCode     String
  criteria        String
  weight          Float    @default(1)

  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
}

model SectionFixRule {
  id              String   @id @default(uuid())
  templateId      String
  template        ReviewTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  sectionCode     String
  issueType       String
  fixTemplate     String

  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
}
```

---

## Assessment

```prisma
model Question {
  id              String   @id @default(uuid())
  content         String
  type            String   // MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER
  difficulty      String   // EASY, MEDIUM, HARD
  correctAnswer   String?
  explanation     String?

  categoryId      String?
  category        Category? @relation(fields: [categoryId], references: [id])

  tags            String[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  examQuestions   ExamQuestion[]
}

model Exam {
  id              String   @id @default(uuid())
  title           String
  description     String?
  status          String   @default("DRAFT")

  totalQuestions  Int      @default(0)
  duration        Int      @default(60)  // minutes

  publishedAt     DateTime?
  expiresAt       DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  questions       ExamQuestion[]
  attempts        ExamAttempt[]
}

model ExamQuestion {
  id              String   @id @default(uuid())
  examId          String
  exam            Exam @relation(fields: [examId], references: [id], onDelete: Cascade)

  questionId      String
  question        Question @relation(fields: [questionId], references: [id])

  order           Int
  points          Float    @default(1)

  @@unique([examId, questionId])
}

model ExamAttempt {
  id              String   @id @default(uuid())
  examId          String
  exam            Exam @relation(fields: [examId], references: [id], onDelete: Cascade)

  userId          String

  score           Float?
  totalPoints     Float    @default(0)
  earnedPoints    Float    @default(0)

  startedAt       DateTime
  completedAt     DateTime?

  answers         Json?

  createdAt       DateTime @default(now())
}
```

---

## Content Management

```prisma
model Circular {
  id              String   @id @default(uuid())
  name            String
  number          String?
  issuedBy        String?
  issuedDate      DateTime?

  content         String?
  filePath        String?

  isActive        Boolean  @default(true)

  lessonPlans     LessonPlan[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Category {
  id              String   @id @default(uuid())
  name            String
  slug            String   @unique
  description     String?

  parentId        String?
  parent          Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children        Category[] @relation("CategoryHierarchy")

  questions       Question[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## Indexes

### Primary Indexes
- All models have `@id` on `id` field (UUID)

### Unique Indexes
- `User.email`
- `Account.provider + providerAccountId`
- `Session.sessionToken`
- `ReviewTemplate.code`
- `Category.slug`
- `TextbookChapter.chapterId` (for cache)

### Foreign Key Indexes
- `LessonPlan.userId`
- `LessonPlan.circularId`
- `LessonPlan.textbookBookId`
- `LessonPlanSection.lessonPlanId`
- `ReviewResult.lessonPlanId`
- `Annotation.reviewResultId`
- `TextbookChapter.bookId`
- `KnowledgeGrade.bookId`
- `KnowledgeSubject.gradeId`
- `KnowledgeLesson.subjectId`

### Query Indexes
- `LessonPlan.status`
- `LessonPlan.userId + status`
- `ReviewResult.lessonPlanId`
- `WorkflowSession.lessonPlanId`
- `WorkflowSession.status`

---

## Migrations

### Running Migrations

```bash
# Generate migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Push schema (development)
npx prisma db push
```

### Schema Files

- `prisma/schema.prisma` - Main schema
- `prisma/schema-additions.prisma` - Additional models

### Seed Data

```bash
npx prisma db seed
```

---

## Connection Pooling

For production (Neon PostgreSQL), the connection is managed via:
- Prisma's built-in connection pooling
- Environment variable: `DATABASE_URL`
