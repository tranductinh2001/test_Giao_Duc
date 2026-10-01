# Book Intelligence

## Overview

The Book Intelligence module enables automatic textbook detection, chapter matching, and content extraction for lesson plans.

### Components

| Component | File | Purpose |
|-----------|------|---------|
| Matcher | `src/core/textbook/matcher.ts` | Match lessons to chapters |
| Extractor | `src/core/textbook/extractor.ts` | Extract pages from PDFs |
| Cache | `src/core/textbook/cache.ts` | Cache extracted content |
| Indexer | `src/core/textbook/indexer.ts` | Index textbook TOC |
| Validator | `src/core/textbook/validator.ts` | Validate TOC structure |
| Optimizer | `src/core/textbook/optimizer.ts` | Optimize extracted content |
| Queue | `src/core/textbook/queue.ts` | Background job management |
| Monitoring | `src/core/textbook/monitoring.ts` | Track metrics |

---

## Book Management

### Database Models

```prisma
model TextbookBook {
  id              String   @id @default(uuid())
  name            String
  grade           String?
  subject         String?
  pdfPath         String?
  pageCount       Int      @default(0)
  tocStatus       String   @default("PENDING")  // PENDING, PROCESSING, COMPLETED, FAILED
  isActive        Boolean  @default(true)
  // ...
  chapters        TextbookChapter[]
}

model TextbookChapter {
  id              String   @id @default(uuid())
  bookId          String
  title           String
  chapterNumber   Int?
  aliases         String[] @default([])
  startPage       Int
  endPage         Int
  confidence      Float    @default(0)
  isActive        Boolean  @default(true)
  // ...
}
```

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/textbooks` | List all textbooks |
| POST | `/api/admin/textbooks` | Create new textbook |
| GET | `/api/admin/textbooks/[id]` | Get textbook details |
| PUT | `/api/admin/textbooks/[id]` | Update textbook |
| DELETE | `/api/admin/textbooks/[id]` | Delete textbook |
| POST | `/api/admin/textbooks/[id]/rebuild-index` | Rebuild TOC index |

---

## TOC Indexing

### Indexing Process

**File:** `src/core/textbook/indexer.ts`

```typescript
export async function runTocIndexing(bookId: string): Promise<void>
```

### Steps

1. **Load PDF**
   - Read from `public/uploads/textbooks/{bookId}/`
   - Load with pdf-lib

2. **Extract TOC**
   - Parse table of contents
   - Extract chapter titles and page numbers

3. **Create Chapters**
   - Store in TextbookChapter table
   - Set page ranges

4. **Update Status**
   - Set `tocStatus` to "COMPLETED"

### Index Status

```typescript
interface IndexStatus {
  bookStatus: "NEW" | "UPDATED" | "UNCHANGED";
  totalChapters: number;
  newChapters: number;
  updatedChapters: number;
  unchangedChapters: number;
  lastIndexed: Date | null;
}
```

---

## Lesson Matching

### Matching Algorithm

**File:** `src/core/textbook/matcher.ts`

### Smart Match

```typescript
export async function smartMatch(
  lessonTitle: string,
  options: {
    bookId: string;
    requireAllStages?: boolean;
  }
): Promise<MatchResult>
```

### Matching Methods

| Method | Description | Priority |
|--------|-------------|----------|
| exact | Exact title match | 1 |
| fuzzy | Fuzzy string matching | 2 |
| number_word | Vietnamese numbers (Một, Hai, Ba...) | 3 |
| sequence | Page sequence position | 4 |
| advanced_heuristic | Combined scoring | 5 |

### Match Result

```typescript
interface MatchResult {
  success: boolean;
  confidence: number;
  matchedBy: MatchMethod;
  chapter?: TextbookChapter;
  book?: TextbookBook;
}
```

### Find Textbook Context

```typescript
export async function findTextbookContext(
  grade: string,
  subject: string,
  lessonTitle?: string
): Promise<{
  book?: TextbookBook;
  chapter?: TextbookChapter;
  method: string;
}>
```

---

## Page Extraction

### Extract Pages

**File:** `src/core/textbook/extractor.ts`

```typescript
export async function extractPages(
  bookId: string,
  startPage: number,
  endPage: number,
  options?: ExtractionOptions
): Promise<ExtractionResult>
```

### Options

```typescript
interface ExtractionOptions {
  useCache?: boolean;      // Use cached PDF (default: true)
  cacheTtlHours?: number; // Cache TTL in hours
}
```

### Result

```typescript
interface ExtractionResult {
  success: boolean;
  buffer?: Buffer;
  tempPath?: string;
  pageCount: number;
  size: number;
  originalPages: { start: number; end: number };
  fromCache: boolean;
  extractionTime: number;
  error?: string;
}
```

### Extract Chapter

```typescript
export async function extractChapter(
  chapterId: string,
  options?: ExtractionOptions
): Promise<ExtractionResult>
```

---

## Cache

### Cache Entry

**File:** `src/core/textbook/cache.ts`

```typescript
// Key: chapterId
// Value: Extracted PDF buffer
// TTL: 7 days
```

### Cache Operations

```typescript
// Get cached PDF
const result = await getCachedPdf(bookId, chapterId);
if (result.found && result.buffer) {
  // Use cached version
}

// Store in cache
await setCachedPdf(bookId, chapterId, buffer);
```

### Database Model

```prisma
model TextbookCacheEntry {
  id              String   @id @default(uuid())
  chapterId       String   @unique
  filePath        String
  fileSize        Int
  startPage       Int
  endPage         Int
  hitCount        Int      @default(0)
  expiresAt       DateTime
  lastAccessedAt  DateTime?
}
```

---

## Optimization

### Payload Optimizer

**File:** `src/core/textbook/optimizer.ts`

```typescript
interface OptimizeOptions {
  deduplicate?: boolean;
  compressWhitespace?: boolean;
  removeHeadersAndFooters?: boolean;
  preserveFormatting?: boolean;
}

interface OptimizedPayload {
  content: string;
  originalLength: number;
  optimizedLength: number;
  savings: number;
}
```

### OCR Optimizer

**File:** `src/core/textbook/ocr-optimizer.ts`

- Pre-processes images for better OCR
- Applies filters and transformations

---

## Incremental Indexing

### Use Case

When a textbook is updated with new chapters, only process new content.

### Process

```typescript
// 1. Check which chapters need indexing
const chaptersToProcess = await getChaptersToProcess(bookId);

// 2. Index only new chapters
for (const chapterId of chaptersToProcess) {
  await extractChapter(chapterId);
  await markChapterIndexed(chapterId, contentHash);
}

// 3. Get stats
const stats = await getIndexStats(bookId);
```

---

## Background Queue

### Job Types

```typescript
type JobType =
  | "TEXTBOOK_INDEX"    // Index textbook TOC
  | "TEXTBOOK_EXTRACT"  // Extract chapter pages
  | "OCR_PROCESS"       // Process OCR
  | "LESSON_PLAN_PROCESS"  // Process lesson
  | "WORKFLOW_EXECUTE"; // Run workflow
```

### Queue Operations

```typescript
// Create job
const jobId = await createJob("TEXTBOOK_INDEX", { bookId }, { priority: 5 });

// Get next job
const job = await getNextJob(["TEXTBOOK_INDEX"]);

// Process
await startJob(job.id);
// ... do work ...
await completeJob(job.id, { result: "done" });

// Or fail with retry
await failJob(job.id, "Error message", { shouldRetry: true });
```

### Job States

| State | Description |
|-------|-------------|
| PENDING | Waiting to be processed |
| RUNNING | Currently executing |
| PAUSED | Temporarily paused |
| COMPLETED | Successfully finished |
| FAILED | Failed (no retries left) |
| RETRY | Scheduled for retry |
| CANCELLED | Cancelled by user |

---

## Monitoring

### Metrics Tracked

**File:** `src/core/textbook/monitoring.ts`

```typescript
interface ExecutionMetrics {
  timestamp: Date;
  duration: number;
  success: boolean;
  tokensUsed?: number;
  error?: string;
}
```

### Track Execution

```typescript
await trackExecution("MATCHING", {
  duration: 150,
  success: true,
  tokensUsed: 500
});
```

### Get Metrics

```typescript
const metrics = await getMetrics("MATCHING", {
  startDate: new Date("2024-01-01"),
  endDate: new Date()
});
```

---

## Textbook Workflow

### Full Workflow

**File:** `src/lib/textbook-workflow.ts`

```typescript
export async function executeTextbookWorkflow(options: {
  lessonPlanId: string;
  userId: string;
  autoMatch?: boolean;
  requireExactMatch?: boolean;
}): Promise<TextbookWorkflowResult>
```

### Detection

```typescript
export async function detectTextbook(
  pdfBuffer: Buffer,
  fileName: string
): Promise<{
  detected: boolean;
  bookId?: string;
  bookName?: string;
  confidence: number;
}>
```

---

## API Integration

### Workflow Integration

The textbook matching is integrated into the upload workflow:

```typescript
// In /api/workflow/process
// 1. Detect textbook
const textbookResult = await detectTextbook(fileBuffer, fileName);

// 2. Match chapter
const matchResult = await smartMatch(lessonTitle, { bookId });

// 3. Extract pages (with cache)
const extraction = await extractChapter(chapterId);

// 4. Optimize
const optimized = optimizePayload(content, options);
```

---

## Validation

### TOC Validation

**File:** `src/core/textbook/validator.ts`

```typescript
export async function validateToc(bookId: string): Promise<TocValidationResult>
```

### Checks Performed

| Check | Type | Description |
|-------|------|-------------|
| NO_CHAPTERS | ERROR | Book has no chapters |
| INVALID_RANGE | ERROR | Chapter endPage < startPage |
| PAGE_EXCEEDS_BOOK | ERROR | Page number exceeds book pages |
| INVALID_PAGE_NUMBER | ERROR | Page number <= 0 |
| DUPLICATE_CHAPTER_NUMBER | WARNING | Duplicate chapter numbers |
| WRONG_ORDER | WARNING | Pages not in ascending order |
| PAGE_GAP | INFO | Gap in page numbering |
| OVERLAPPING_PAGES | WARNING | Page ranges overlap |
| MISSING_CHAPTERS | WARNING | Missing chapter numbers |

### Fix Issues

```typescript
export async function fixTocIssues(bookId: string): Promise<{
  fixed: number;
  issues: ValidationIssue[];
}>
```
