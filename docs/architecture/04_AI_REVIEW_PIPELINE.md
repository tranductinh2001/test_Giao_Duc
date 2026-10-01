# AI Review Pipeline

## Review Lifecycle

### Overview

The AI Review Pipeline transforms raw lesson plan content into structured, scored, and annotated review results:

```
Document Text → Context Building → AI Review → Annotations → Suggestions → Results
```

### Trigger Points

1. **Automatic**: After successful upload (when autoMatch enabled)
2. **Manual**: User clicks "Review" button on lesson plan page

### Workflow States

```typescript
enum WorkflowStatus {
  PENDING = "PENDING",           // Created, not started
  PARSING = "PARSING",           // Extracting document structure
  MAPPING = "MAPPING",           // Mapping to knowledge base
  BUILDING_CONTEXT = "BUILDING_CONTEXT",  // Building review context
  AI_REVIEWING = "AI_REVIEWING", // Running AI review
  GENERATING_SUGGESTIONS = "GENERATING_SUGGESTIONS", // Creating fixes
  COMPLETED = "COMPLETED",       // All done
  FAILED = "FAILED",             // Something went wrong
  CANCELLED = "CANCELLED"        // User cancelled
}
```

---

## Prompt Building

### Implementation
**File:** `src/core/ai-review/services/PromptBuilder.ts`

### Prompt Structure

```typescript
interface PromptConfig {
  template: ReviewTemplate;
  documentText: string;
  textbookContext?: TextbookContext;
  rules: ReviewRule[];
  options: ReviewOptions;
}
```

### Prompt Components

1. **System Prompt**
   - Role definition (Vietnamese education expert)
   - Review criteria
   - Output format requirements

2. **Context Section**
   ```
   Bối cảnh sách giáo khoa:
   - Sách: {bookName}
   - Chương: {chapterTitle}
   - Trang: {startPage} - {endPage}
   ```

3. **Document Content**
   - Sections with headings
   - Activities with paragraphs
   - Learning objectives

4. **Rules Section**
   - Template rules (5STEP structure)
   - Custom section rules
   - Scoring criteria

5. **Output Format**
   ```json
   {
     "issues": [...],
     "score": {...},
     "suggestions": [...]
   }
   ```

---

## Model Selection

### Available Models

| Model | Use Case | Config Key |
|-------|----------|------------|
| gemini-2.0-flash-exp | AI Review (default) | `aiModel` parameter |
| google/gemini-2.5-flash-lite | Document Parsing | BrightOne internal |

### Configuration

```typescript
// In workflow-service.ts
const orchestrator = new WorkflowOrchestrator(
  template,
  {
    templateId: template.id,
    skipStructureValidation: false,
    skipContentReview: false,
    aiModel: aiModel || 'gemini-2.0-flash-exp',
  },
  process.env.GEMINI_API_KEY || ''
);
```

### Model Selection Logic

1. **Default**: Use configured model (gemini-2.0-flash-exp)
2. **Fallback**: If API fails, return error with partial results
3. **Retry**: Exponential backoff for transient failures

---

## Context Building

### Implementation
**File:** `src/core/review-context/engine/ReviewContextBuilder.ts`

### Context Components

1. **Document Context**
   ```typescript
   interface DocumentContext {
     title: string;
     sections: SectionData[];
     wordCount: number;
     pageEstimate: number;
   }
   ```

2. **Textbook Context** (if matched)
   ```typescript
   interface TextbookContext {
     bookId: string;
     bookName: string;
     chapterId: string;
     chapterTitle: string;
     startPage: number;
     endPage: number;
     confidence: number;
   }
   ```

3. **Template Context**
   ```typescript
   interface TemplateContext {
     templateCode: string;
     requiredSections: string[];
     scoringRules: ScoringRule[];
   }
   ```

### Context Optimization

**File:** `src/core/review-context/services/ContextOptimizer.ts`

- Truncate long documents
- Split into chunks if exceeding token limit
- Preserve key sections (objectives, content, activities)

---

## Annotation Generation

### Implementation
**File:** `src/core/review-annotation/engine/ReviewAnnotationEngine.ts`

### Annotation Types

| Type | Description | Severity |
|------|-------------|----------|
| STRUCTURE | Section ordering issues | WARNING |
| CONTENT | Content quality issues | ERROR/WARNING/INFO |
| FORMAT | Formatting problems | INFO |
| SUGGESTION | Improvement suggestions | INFO |

### Annotation Structure

```typescript
interface Annotation {
  id: string;
  reviewResultId: string;
  sectionId: string;
  annotationType: 'STRUCTURE' | 'CONTENT' | 'FORMAT' | 'SUGGESTION';
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  startPosition: number;
  endPosition: number;
  message: string;
  explanation?: string;
  suggestion?: string;
  proposedContent?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}
```

### Generation Process

1. **Parse AI Response**
   - Extract issues from JSON
   - Map to annotation format

2. **Create Annotations**
   ```typescript
   // In workflow-service.ts
   for (const issue of result.validationResult.contentIssues) {
     await tx.annotation.create({
       data: {
         reviewResultId: reviewResult.id,
         sectionId: sectionId,
         annotationType: 'CONTENT',
         severity: issue.severity,
         message: issue.message,
         explanation: issue.explanation,
         suggestion: issue.suggestion,
         status: 'PENDING'
       }
     });
   }
   ```

---

## Suggestion Generation

### Implementation
**File:** `src/core/ai-suggestion-engine/engine/SuggestionEngine.ts`

### Suggestion Types

1. **Auto-fixes**: Changes AI can apply automatically
2. **Manual suggestions**: Recommendations for human review
3. **Learning resources**: Related materials to improve content

### JSON Patch Format

```typescript
interface JSONPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy';
  path: string;        // JSON path to target
  value?: any;         // New value for add/replace
  from?: string;       // Source path for move/copy
}
```

### Suggestion Structure

```typescript
interface Suggestion {
  id: string;
  lessonPlanId: string;
  reviewResultId: string;
  sectionId?: string;
  annotationId?: string;
  instruction: string;
  originalContent: string;
  proposedContent: string;
  confidence: number;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
}
```

### Generation Process

1. **Identify Issues**
   - Analyze annotation list
   - Group by type and severity

2. **Generate Fixes**
   ```typescript
   // In FixGenerator.ts
   const fixes = await fixGenerator.generateFixes(issues, document);
   ```

3. **Apply/Reject**
   ```typescript
   // API: POST /api/suggestions/[id]/accept
   // API: POST /api/suggestions/[id]/reject
   ```

---

## Workflow Session

### Database Model

```prisma
model WorkflowSession {
  id              String   @id @default(uuid())
  lessonPlanId    String
  userId          String
  status          String   @default("PENDING")
  currentStep     String   @default("PENDING")
  progress        Int      @default(0)

  // Results (stored as JSON)
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
}
```

### Session Lifecycle

```
1. Create Session (POST /api/workflow/stream)
   ↓
2. Start Background Execution
   ↓
3. Update Progress (per step)
   ↓
4. Store Results (on completion)
   ↓
5. Return Session ID for polling
```

### Polling for Status

```typescript
// GET /api/workflow/stream?sessionId={sessionId}
{
  success: true,
  data: {
    sessionId: string,
    status: "COMPLETED",
    parseResult: { ... },
    reviewResult: { ... },
    metrics: {
      totalAiCalls: number,
      totalTokens: number,
      totalCost: number,
      executionTime: number
    }
  }
}
```

---

## Database Persistence

### Tables Created During Review

1. **LessonPlanSection**
   - Parsed document sections
   - Content and metadata

2. **ReviewResult**
   - Overall review score
   - Issue counts
   - Status

3. **Annotation**
   - Individual issues
   - Positions and messages

4. **Suggestion**
   - Proposed fixes
   - Accept/reject status

5. **WorkflowSession**
   - Progress tracking
   - Full results storage

6. **WorkflowStep** (optional)
   - Detailed step-by-step progress

### Transaction Example

```typescript
const transactionResult = await prisma.$transaction(async (tx) => {
  // Delete old sections
  await tx.lessonPlanSection.deleteMany({ where: { lessonPlanId } });

  // Create new sections
  const sectionData = result.parseResult.sections.map((section, index) => ({
    id: crypto.randomUUID(),
    lessonPlanId,
    versionNumber: 1,
    sectionType: section.sectionCode,
    sectionTitle: section.sectionName,
    rawContent: section.content,
    sectionOrder: index,
  }));
  await tx.lessonPlanSection.createMany({ data: sectionData });

  // Create ReviewResult
  const reviewResult = await tx.reviewResult.create({
    data: {
      lessonPlanId,
      overallScore: result.scoreReport.totalScore,
      // ...
    }
  });

  return { reviewResultId: reviewResult.id };
});
```

---

## Error Handling

### Error Types

| Error | Handling |
|-------|----------|
| API Timeout | Retry with exponential backoff |
| Invalid Response | Return error, partial results |
| Database Error | Rollback transaction |
| Quota Exceeded | Return 429, stop workflow |

### Error Response

```typescript
{
  success: false,
  message: "Lỗi khi xử lý",
  error: {
    code: "AI_REVIEW_FAILED",
    details: "Gemini API error: ...",
    step: "AI_REVIEWING"
  }
}
```

---

## Performance Metrics

### Tracked Metrics

| Metric | Description |
|--------|-------------|
| totalAiCalls | Number of API calls made |
| totalTokens | Total tokens consumed |
| totalCost | Estimated cost in USD |
| executionTime | Total time in milliseconds |

### Token Calculation

```typescript
// Gemini 2.5 Flash Lite pricing
const cost = (promptTokens * 0.0000003) + (completionTokens * 0.0000012);
```

### Logging

```typescript
logger.logWorkflowComplete({
  sessionId,
  lessonPlanId,
  duration: executionTime,
  totalAiCalls: result.totalAiCalls,
  promptTokens,
  completionTokens,
  totalTokens,
  estimatedCost,
});
```
