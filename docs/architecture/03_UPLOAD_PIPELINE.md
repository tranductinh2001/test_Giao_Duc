# Upload Pipeline

## Complete Upload Flow

### Overview

The upload pipeline handles the entire process from file upload to parsed lesson plan:

```
User Upload → File Validation → Storage → Database Record → Workflow Processing → Sections Created
```

### Entry Points

1. **Upload Flow** (`POST /api/lesson-plans/upload`)
   - User uploads file via form
   - File saved to storage
   - LessonPlan record created
   - Triggers `/api/workflow/process`

2. **Parse Flow** (`POST /api/workflow/stream`)
   - User clicks "Parse" button
   - Creates WorkflowSession
   - Executes WorkflowOrchestrator

---

## File Upload Flow

### API Endpoint
**POST** `/api/lesson-plans/upload`

### Supported File Types
- DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- DOC: `application/msword`
- PDF: `application/pdf`
- PNG: `image/png`
- JPG/JPEG: `image/jpeg`
- WEBP: `image/webp`
- BMP: `image/bmp`
- TIFF: `image/tiff`

### File Size Limit
- Maximum: 10MB

### Request
```typescript
// FormData
{
  file: File,                    // Required
  title?: string,                // Optional
  subject?: string,              // Optional
  gradeLevel?: string,           // Optional
  schoolYear?: string,           // Optional
  circularId?: string,           // UUID, optional
  textbookBookId?: string,       // UUID, optional
  textbookLessonTitle?: string,  // Optional
}
```

### Response
```typescript
{
  success: true,
  data: {
    id: string,                  // LessonPlan ID
    title: string,
    filePath: string,
    fileSize: number,
    status: "UPLOADED" | "PARSING" | "PARSED" | ...
    // ...
  }
}
```

### Processing Steps

1. **Authentication Check**
   - Validates user session
   - Returns 401 if not logged in

2. **File Validation**
   - Checks file exists
   - Validates MIME type against ALLOWED_MIME_TYPES
   - Validates file size (max 10MB)

3. **File Storage**
   - Generates UUID-based filename
   - Creates directory: `public/uploads/lesson-plans/{year}/{month}/`
   - Saves file to disk

4. **Database Record**
   - Creates LessonPlan record with status "UPLOADED"
   - Stores file metadata (size, type, path)
   - Associates textbook if provided

5. **Workflow Trigger**
   - Optionally triggers `/api/workflow/process`
   - Updates status to "PARSING"

---

## Document Type Flows

### DOCX Flow

```
DOCX File
    ↓
DocxAdapter / Mammoth
    ↓
Extract text and structure
    ↓
Split into sections
    ↓
Save to LessonPlanSection
```

**Implementation:** `src/core/document-adapters/DocxAdapter.ts`

### PDF Flow

```
PDF File
    ↓
BrightOneAdapter
    ↓
BrightOne API (OCR + Layout)
    ↓
Markdown with markers
    ↓
Parse to UnifiedDocument
    ↓
Extract sections, activities, paragraphs
    ↓
Save to LessonPlanSection
```

**Implementation:** `src/core/document-adapters/BrightOneAdapter.ts`

### Image Flow

```
Image File (PNG/JPG/etc)
    ↓
BrightOneAdapter
    ↓
BrightOne API (OCR)
    ↓
Extract text
    ↓
Treat as single section
    ↓
Save to LessonPlanSection
```

---

## BrightOne Flow

### API Configuration
```typescript
// BrightOneAdapter.ts
const BEEKNOEE_API_KEY = process.env.BEEKNOEE_API_KEY;
const BEEKNOEE_BASE_URL = "https://platform.beeknoee.com";
const BEEKNOEE_TIMEOUT = 60000; // 60 seconds
```

### Request Payload
```typescript
{
  model: "google/gemini-2.5-flash-lite",
  messages: [{
    role: "user",
    content: [
      {
        type: "text",
        text: "Instructions with markers..."
      },
      {
        type: "file",
        file: {
          url: "data:{mimeType};base64,{base64Data}",
          mime_type: "{mimeType}"
        }
      }
    ]
  }]
}
```

### Markers Used
```
[SECTION] - New section
[HEADING:1] - Heading level 1
[HEADING:2] - Heading level 2
[HEADING:3] - Heading level 3
[PARAGRAPH] - Paragraph
[TABLE_START] - Table start
[ROW] - Table row
[TABLE_END] - Table end
[LIST] - List
[ITEM] - List item
[PAGE:N] - Page marker
```

### Response Processing
```typescript
{
  success: true,
  document: {
    sections: [
      {
        type: "SECTION",
        title: "Section Title",
        activities: [
          {
            title: "Activity Title",
            paragraphs: [
              { content: "Paragraph text" }
            ]
          }
        ]
      }
    ],
    metadata: {
      wordCount: number,
      pageCount: number
    }
  },
  tokens: number,
  cost: number,
  processingTime: number
}
```

---

## Parser Flow

### Section Parser (`src/core/rule-engine-v2/parsers/SectionParser.ts`)

1. **Input**: Raw text/markdown
2. **Process**:
   - Split by [SECTION] markers
   - Detect headings within sections
   - Identify activities
   - Extract paragraphs
3. **Output**: Structured sections

### Activity Detector (`src/core/lesson-plan-pipeline/parsers/ActivityDetector.ts`)

1. **Input**: Section content
2. **Process**:
   - Detect activity patterns
   - Identify activity types
   - Extract activity metadata
3. **Output**: Activity list

---

## Knowledge Mapping Flow

### Implementation
**File:** `src/core/knowledge-mapping/engine/MappingEngine.ts`

### Process

1. **Extract Entities**
   - Parse lesson content
   - Identify key concepts
   - Extract learning objectives

2. **Match Knowledge Base**
   - Compare with existing knowledge entries
   - Find related concepts
   - Identify gaps

3. **Create Mappings**
   - Link lesson sections to knowledge
   - Store in MappingResult table

### Database
```prisma
model MappingResult {
  id          String   @id
  lessonPlanId String
  lessonId    String?
  score       Float
  // ...
}
```

---

## Rule Engine Flow

### Implementation
**File:** `src/core/rule-engine-v2/workflow/WorkflowOrchestrator.ts`

### Pipeline Steps

1. **Parse** - Extract document structure
2. **Validate Structure** - Check section ordering
3. **Map Knowledge** - Link to knowledge base
4. **Review Content** - AI review with rules
5. **Calculate Score** - Score sections
6. **Generate Fixes** - Suggest improvements
7. **Create Annotations** - Mark issues

### Rules Types

```prisma
// Section Structure Rules
model section_structure_rules {
  id          String
  ruleType    String   // ORDER, REQUIRED, FORBIDDEN
  sectionCode String
  // ...
}

// Content Scoring Rules
model section_scoring_rules {
  id          String
  sectionCode String
  criteria    String
  weight      Float
  // ...
}

// Section Fix Rules
model section_fix_rules {
  id          String
  sectionCode String
  issueType   String
  fixTemplate String
  // ...
}
```

---

## Review Flow

### API Endpoint
**POST** `/api/workflow/stream`

### Request
```typescript
{
  lessonPlanId: string,
  templateCode?: string,    // Default: "5STEP"
  aiModel?: string,         // Default: "gemini-2.0-flash-exp"
  skipStructureValidation?: boolean,
  skipContentReview?: boolean,
  textbookBookId?: string,
  textbookLessonTitle?: string
}
```

### Response
```typescript
{
  success: true,
  sessionId: string,
  status: "PENDING" | "PARSING" | "COMPLETED" | "FAILED"
}
```

### Review Process

1. **Create Session**
   - Create WorkflowSession record
   - Initialize progress tracking
   - Set status to PARSING

2. **Execute Orchestrator**
   - Run through pipeline steps
   - Update progress
   - Log each step

3. **Save Results**
   - Create ReviewResult
   - Create Annotations
   - Update WorkflowSession

4. **Return Results**
   - Session ID for polling
   - Final status

### Polling Status
**GET** `/api/workflow/stream?sessionId={sessionId}`

---

## Workspace Flow

### Page
`/lesson-plans/[id]/workspace`

### Features

1. **Document Display**
   - Show parsed sections
   - Rich text rendering

2. **Annotations**
   - View AI-generated annotations
   - Accept/reject suggestions
   - Add manual annotations

3. **Workflow Status**
   - Show current status
   - Progress indicator
   - Error messages

4. **Actions**
   - Edit content
   - Export document
   - Start new review

---

## Error Recovery

### Error Types

1. **Upload Errors**
   - Invalid file type → Return 400
   - File too large → Return 400
   - Storage failure → Return 500

2. **BrightOne Errors**
   - API failure → Create placeholder section
   - Timeout → Retry with exponential backoff

3. **Workflow Errors**
   - Database error → Rollback transaction
   - AI error → Mark as FAILED, log error
   - Recovery → Re-query session status

### Fallback Strategy

```typescript
// BrightOne failure fallback
if (brightOneResult.success && brightOneResult.document) {
  // Use parsed content
} else {
  // BrightOne failed - create placeholder section
  await prisma.lessonPlanSection.create({
    data: {
      sectionTitle: "Nội dung chính",
      rawContent: lessonPlan.title  // Use title as fallback
    }
  });
}
```

### Retry Logic

```typescript
// Queue job retry (queue.ts)
const canRetry = retry && job.retryCount < job.maxRetries;
await prisma.textbookQueueJob.update({
  where: { id: jobId },
  data: {
    status: canRetry ? "RETRY" : "FAILED",
    retryCount: { increment: 1 }
  }
});
```

---

## Performance Metrics

### Tracked Metrics

| Metric | Description |
|--------|-------------|
| fileLoadTime | Time to read file from disk |
| detectionTime | Time for textbook detection |
| matchingTime | Time for chapter matching |
| extractionTime | Time for PDF extraction |
| optimizationTime | Time for payload optimization |
| brightOneTime | Time for BrightOne API call |
| saveTime | Time for database operations |
| totalTime | Total workflow time |

### Logging

All metrics are logged and returned in API response:
```typescript
console.log(`[Workflow] Loaded file in ${metrics.fileLoadTime}ms`);
console.log(`[Workflow] BrightOne parse: success in ${metrics.brightOneTime}ms`);
```
