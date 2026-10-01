# Sequence Diagrams

## Upload Flow

### Document Upload

```
User              Browser              API                  Storage    Database
 │                   │                   │                    │           │
 │  Select File      │                   │                    │           │
 │─────────────────>│                   │                    │           │
 │                   │  POST /upload     │                    │           │
 │                   │─────────────────>│                    │           │
 │                   │                   │  Validate file     │           │
 │                   │                   │───────────────────>│           │
 │                   │                   │<───────────────────│           │
 │                   │                   │                    │           │
 │                   │                   │  Save to storage   │           │
 │                   │                   │───────────────────>│           │
 │                   │                   │<───────────────────│           │
 │                   │                   │                    │           │
 │                   │                   │  Create record     │           │
 │                   │                   │─────────────────────────────────>│
 │                   │                   │<─────────────────────────────────│
 │                   │                   │                    │           │
 │                   │  Response         │                    │           │
 │                   │<─────────────────│                    │           │
 │  Success          │                   │                    │           │
 │<─────────────────│                   │                    │           │
 │                   │                   │                    │           │
```

---

## Review Flow

### Start AI Review

```
User              Browser              API              Workflow Service    Database
 │                   │                   │                    │                 │
 │  Click Review     │                   │                    │                 │
 │─────────────────>│                   │                    │                 │
 │                   │  POST /stream    │                    │                 │
 │                   │─────────────────>│                    │                 │
 │                   │                   │  Create session   │                 │
 │                   │                   │─────────────────>│                 │
 │                   │                   │<─────────────────│                 │
 │                   │                   │                    │                 │
 │                   │  Session ID      │                    │                 │
 │                   │<─────────────────│                    │                 │
 │  Show polling    │                   │                    │                 │
 │<─────────────────│                   │                    │                 │
 │                   │                   │                    │                 │
 │                   │  GET /stream?sessionId=xxx            │                 │
 │                   │─────────────────>│                    │                 │
 │                   │                   │  Check status    │                 │
 │                   │                   │─────────────────────────────────────>│
 │                   │                   │<─────────────────────────────────────│
 │                   │                   │                    │                 │
 │                   │  Status: PENDING  │                    │                 │
 │                   │<─────────────────│                    │                 │
 │                   │                   │                    │                 │
 │                   │                   │  Execute workflow │                 │
 │                   │                   │─────────────────>│                 │
 │                   │                   │                    │                 │
 │                   │                   │  ┌────────────────────────────────┐  │
 │                   │                   │  │ PARSING                        │  │
 │                   │                   │  │  ├─ Load document             │  │
 │                   │                   │  │  ├─ BrightOne parse          │  │
 │                   │                   │  │  └─ Extract sections         │  │
 │                   │                   │  ├─ MAPPING                     │  │
 │                   │                   │  │  ├─ Extract entities         │  │
 │                   │                   │  │  └─ Match knowledge base     │  │
 │                   │                   │  ├─ AI_REVIEWING               │  │
 │                   │                   │  │  ├─ Build context           │  │
 │                   │                   │  │  ├─ Gemini review           │  │
 │                   │                   │  │  └─ Generate annotations    │  │
 │                   │                   │  └─ COMPLETED                  │  │
 │                   │                   │  └─────────────────────────────>│  │
 │                   │                   │                    │                 │
 │                   │  Status: COMPLETED                    │                 │
 │                   │<─────────────────│                    │                 │
 │  Show results    │                   │                    │                 │
 │<─────────────────│                   │                    │                 │
 │                   │                   │                    │                 │
```

---

## Textbook Matching

```
User              System                Matcher              Database
 │                   │                     │                    │
 │  Upload lesson   │                     │                    │
 │  with title     │                     │                    │
 │─────────────────>│                     │                    │
 │                   │  smartMatch()      │                    │
 │                   │───────────────────>│                    │
 │                   │                     │                    │
 │                   │                     │  1. exactMatch()   │
 │                   │                     │─────────────────>│
 │                   │                     │<─────────────────│
 │                   │                     │                    │
 │                   │                     │  2. fuzzyMatch()  │
 │                   │                     │─────────────────>│
 │                   │                     │<─────────────────│
 │                   │                     │                    │
 │                   │                     │  3. numberWord()  │
 │                   │                     │─────────────────>│
 │                   │                     │<─────────────────│
 │                   │                     │                    │
 │                   │                     │  4. heuristic()   │
 │                   │                     │─────────────────>│
 │                   │                     │<─────────────────│
 │                   │                     │                    │
 │                   │  MatchResult       │                    │
 │                   │<───────────────────│                    │
 │  Chapter matched │                     │                    │
 │<─────────────────│                     │                    │
 │                   │                     │                    │
```

---

## Page Extraction

```
Request              Extractor            Cache             Database
 │                       │                   │                  │
 │  extractChapter()     │                   │                  │
 │─────────────────────>│                   │                  │
 │                       │                   │                  │
 │                       │  getCachedPdf()  │                  │
 │                       │─────────────────>│                  │
 │                       │<─────────────────│                  │
 │                       │                   │                  │
 │  Cache hit           │                   │                  │
 │<─────────────────────│                   │                  │
 │                       │                   │                  │
 │                       │                   │                  │
 │  Cache miss          │                   │                  │
 │<─────────────────────│                   │                  │
 │                       │                   │                  │
 │                       │  setCachedPdf()  │                  │
 │                       │─────────────────>│                  │
 │                       │<─────────────────│                  │
 │                       │                   │                  │
 │  ExtractionResult    │                   │                  │
 │<─────────────────────│                   │                  │
 │                       │                   │                  │
```

---

## Authentication Flow

```
User              Browser              NextAuth              Database
 │                   │                   │                    │
 │  Login form       │                   │                    │
 │─────────────────>│                   │                    │
 │                   │  POST /api/auth/callback/credentials   │
 │                   │─────────────────>│                    │
 │                   │                   │  Verify credentials│
 │                   │                   │─────────────────>│
 │                   │                   │<─────────────────│
 │                   │                   │                    │
 │                   │                   │  Create session    │
 │                   │                   │─────────────────>│
 │                   │                   │<─────────────────│
 │                   │                   │                    │
 │                   │  Set-Cookie      │                    │
 │                   │<─────────────────│                    │
 │  Redirect         │                   │                    │
 │<─────────────────│                   │                    │
 │                   │                   │                    │
```

---

## File Processing Pipeline

```
Upload              Parser               AI                 Database
  │                   │                   │                   │
  │  File received    │                   │                   │
  │─────────────────>│                   │                   │
  │                   │                   │                   │
  │                   │  Detect type      │                   │
  │                   │  (DOCX/PDF/IMG)  │                   │
  │                   │                   │                   │
  │                   │                   │                   │
  │                   │  Route to adapter│                   │
  │                   │  ├─ DOCX → Mammoth                   │
  │                   │  ├─ PDF → BrightOne                 │
  │                   │  └─ IMG → BrightOne                 │
  │                   │                   │                   │
  │                   │                   │                   │
  │                   │  POST to BrightOne                  │
  │                   │─────────────────────────────────────>│
  │                   │<─────────────────────────────────────│
  │                   │                   │                   │
  │                   │  Parse response  │                   │
  │                   │  to UnifiedDoc  │                   │
  │                   │                   │                   │
  │                   │                   │                   │
  │                   │  Save sections   │                   │
  │                   │─────────────────────────────────────>│
  │                   │<─────────────────────────────────────│
  │                   │                   │                   │
  │  Complete         │                   │                   │
  │<─────────────────│                   │                   │
  │                   │                   │                   │
```

---

## Annotation Flow

```
Review              Annotation Engine     Database           User
  │                       │                   │                │
  │  AI Review complete  │                   │                │
  │─────────────────────>│                   │                │
  │                       │                   │                │
  │                       │  Parse issues    │                │
  │                       │  from response  │                │
  │                       │                   │                │
  │                       │                   │                │
  │                       │  Create annotations              │
  │                       │─────────────────────────────────>│
  │                       │<─────────────────────────────────│
  │                       │                   │                │
  │  Annotations ready   │                   │                │
  │<─────────────────────│                   │                │
  │                       │                   │                │
  │                       │                   │  View in UI    │
  │                       │                   │<───────────────│
  │                       │                   │                │
  │                       │  Accept/Reject  │                │
  │                       │<────────────────│                │
  │                       │                   │                │
  │                       │  Update status  │                │
  │                       │─────────────────────────────────>│
  │                       │<─────────────────────────────────│
  │                       │                   │                │
```

---

## Queue Processing

```
Job Creator          Queue              Worker              Service
  │                   │                   │                   │
  │  Create job       │                   │                   │
  │─────────────────>│                   │                   │
  │                   │  Job queued       │                   │
  │                   │<─────────────────│                   │
  │                   │                   │                   │
  │                   │  Job ready       │                   │
  │                   │─────────────────>│                   │
  │                   │                   │                   │
  │                   │                   │  Process job     │
  │                   │                   │─────────────────>│
  │                   │                   │<─────────────────│
  │                   │                   │                   │
  │                   │  Complete/Fail   │                   │
  │                   │<─────────────────│                   │
  │                   │                   │                   │
  │  Job status      │                   │                   │
  │<─────────────────│                   │                   │
  │                   │                   │                   │
```
