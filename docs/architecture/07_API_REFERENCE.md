# API Reference

## Authentication

### Register
**POST** `/api/auth/register`

```typescript
// Request
{
  email: string;
  password: string;
  name: string;
}

// Response
{
  success: boolean;
  user: { id: string; email: string; name: string };
}
```

### Login
**POST** `/api/auth/login` (via NextAuth.js)

```typescript
// Uses NextAuth.js credentials provider
// Returns session with JWT token
```

### Forgot Password
**POST** `/api/auth/forgot-password`

```typescript
// Request
{ email: string }

// Response
{ success: boolean; message: string }
```

### Reset Password
**POST** `/api/auth/reset-password`

```typescript
// Request
{
  token: string;
  password: string;
}

// Response
{ success: boolean }
```

---

## Lesson Plans

### List Lesson Plans
**GET** `/api/lesson-plans`

```typescript
// Query Params
?status=REVIEWED&subject=Toán&gradeLevel=Lớp+10&page=1&limit=20

// Response
{
  success: true;
  data: LessonPlan[];
  pagination: { page: number; limit: number; total: number };
}
```

### Upload Lesson Plan
**POST** `/api/lesson-plans/upload`

```typescript
// FormData
{
  file: File;
  title?: string;
  subject?: string;
  gradeLevel?: string;
  schoolYear?: string;
  circularId?: string;
  textbookBookId?: string;
  textbookLessonTitle?: string;
}

// Response
{
  success: true;
  data: {
    id: string;
    title: string;
    filePath: string;
    status: string;
  };
}
```

### Get Lesson Plan
**GET** `/api/lesson-plans/[id]`

```typescript
// Response
{
  success: true;
  data: LessonPlan & {
    sections: LessonPlanSection[];
    user: { id: string; name: string };
  };
}
```

### Update Lesson Plan
**PUT** `/api/lesson-plans/[id]`

```typescript
// Request
{
  title?: string;
  subject?: string;
  gradeLevel?: string;
  status?: string;
}

// Response
{ success: true; data: LessonPlan }
```

### Delete Lesson Plan
**DELETE** `/api/lesson-plans/[id]`

```typescript
// Response
{ success: true }
```

---

## Lesson Plan Sections

### List Sections
**GET** `/api/lesson-plans/[id]/sections`

```typescript
// Response
{
  success: true;
  data: LessonPlanSection[];
}
```

### Create Section
**POST** `/api/lesson-plans/[id]/sections`

```typescript
// Request
{
  sectionType?: string;
  sectionTitle?: string;
  rawContent?: string;
  sectionOrder?: number;
}

// Response
{ success: true; data: LessonPlanSection }
```

### Update Section
**PUT** `/api/lesson-plans/[id]/sections/[sectionId]`

```typescript
// Request
{
  sectionTitle?: string;
  rawContent?: string;
  parsedContent?: object;
}

// Response
{ success: true; data: LessonPlanSection }
```

### Delete Section
**DELETE** `/api/lesson-plans/[id]/sections/[sectionId]`

```typescript
// Response
{ success: true }
```

---

## Annotations

### Get Annotations
**GET** `/api/lesson-plans/[id]/annotations`

```typescript
// Response
{
  success: true;
  data: Annotation[];
}
```

### Accept Annotation
**POST** `/api/lesson-plans/[id]/annotations/[annotationId]/accept`

```typescript
// Response
{ success: true }
```

### Reject Annotation
**POST** `/api/lesson-plans/[id]/annotations/[annotationId]/reject`

```typescript
// Response
{ success: true }
```

---

## Review

### Start Review
**POST** `/api/workflow/stream`

```typescript
// Request
{
  lessonPlanId: string;
  templateCode?: string;     // Default: "5STEP"
  aiModel?: string;         // Default: "gemini-2.0-flash-exp"
  skipStructureValidation?: boolean;
  skipContentReview?: boolean;
  textbookBookId?: string;
  textbookLessonTitle?: string;
}

// Response
{
  success: true;
  sessionId: string;
  status: "PENDING";
}
```

### Get Review Status
**GET** `/api/workflow/stream?sessionId={sessionId}`

```typescript
// Response
{
  success: true;
  data: {
    sessionId: string;
    status: "PENDING" | "PARSING" | "MAPPING" | "AI_REVIEWING" | "COMPLETED" | "FAILED";
    progress: number;
    parseResult?: object;
    reviewResult?: object;
    metrics: {
      totalAiCalls: number;
      totalTokens: number;
      totalCost: number;
      executionTime: number;
    };
  };
}
```

### Cancel Review
**DELETE** `/api/workflow/[sessionId]`

```typescript
// Response
{ success: true }
```

---

## Suggestions

### Get Suggestions
**GET** `/api/review/[sessionId]/suggestions`

```typescript
// Response
{
  success: true;
  data: Suggestion[];
}
```

### Accept Suggestion
**POST** `/api/suggestions/[id]/accept`

```typescript
// Response
{ success: true; data: Suggestion }
```

### Reject Suggestion
**POST** `/api/suggestions/[id]/reject`

```typescript
// Response
{ success: true; data: Suggestion }
```

### Regenerate Suggestion
**POST** `/api/suggestions/[id]/regenerate`

```typescript
// Response
{ success: true; data: Suggestion }
```

---

## User

### Get Profile
**GET** `/api/user/profile`

```typescript
// Response
{
  success: true;
  data: User;
}
```

### Update Profile
**PUT** `/api/user/profile`

```typescript
// Request
{
  name?: string;
  // other fields
}

// Response
{ success: true; data: User }
```

### Get User Stats
**GET** `/api/user/stats`

```typescript
// Response
{
  success: true;
  data: {
    totalLessonPlans: number;
    reviewedPlans: number;
    totalExams: number;
    // ...
  };
}
```

### Get User Quota
**GET** `/api/user/quota`

```typescript
// Response
{
  success: true;
  data: {
    used: number;
    limit: number;
    remaining: number;
  };
}
```

---

## Admin - Users

### List Users
**GET** `/api/admin/users`

```typescript
// Query Params
?search=john&role=ADMIN&page=1&limit=20

// Response
{
  success: true;
  data: User[];
  pagination: { page: number; limit: number; total: number };
}
```

### Create User
**POST** `/api/admin/users`

```typescript
// Request
{
  email: string;
  name: string;
  password: string;
  role: "ADMIN" | "LEARNER";
}

// Response
{ success: true; data: User }
```

### Update User
**PUT** `/api/admin/users/[id]`

```typescript
// Request
{
  name?: string;
  role?: string;
  // ...
}

// Response
{ success: true; data: User }
```

### Delete User
**DELETE** `/api/admin/users/[id]`

```typescript
// Response
{ success: true }
```

---

## Admin - Questions

### List Questions
**GET** `/api/admin/questions`

```typescript
// Query Params
?category=Toán&difficulty=MEDIUM&type=MULTIPLE_CHOICE&page=1&limit=20

// Response
{
  success: true;
  data: Question[];
  pagination: { page: number; limit: number; total: number };
}
```

### Create Question
**POST** `/api/admin/questions`

```typescript
// Request
{
  content: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  correctAnswer?: string;
  explanation?: string;
  categoryId?: string;
  tags?: string[];
}

// Response
{ success: true; data: Question }
```

### Update Question
**PUT** `/api/admin/questions/[id]`

```typescript
// Request
{
  content?: string;
  type?: string;
  // ...
}

// Response
{ success: true; data: Question }
```

### Delete Question
**DELETE** `/api/admin/questions/[id]`

```typescript
// Response
{ success: true }
```

### Bulk Delete Questions
**POST** `/api/admin/questions/bulk-delete`

```typescript
// Request
{ ids: string[] }

// Response
{ success: true; deletedCount: number }
```

### Import Questions
**POST** `/api/admin/questions/import`

```typescript
// FormData
{ file: File }

// Response
{ success: true; imported: number }
```

### Export Questions
**GET** `/api/admin/questions/export`

```typescript
// Query Params
?format=xlsx&category=Toán

// Returns file download
```

---

## Admin - Exams

### List Exams
**GET** `/api/admin/exams`

```typescript
// Query Params
?status=DRAFT&page=1&limit=20

// Response
{
  success: true;
  data: Exam[];
}
```

### Create Exam
**POST** `/api/admin/exams`

```typescript
// Request
{
  title: string;
  description?: string;
  duration?: number;
  questionIds?: string[];
}

// Response
{ success: true; data: Exam }
```

### Get Exam
**GET** `/api/admin/exams/[id]`

```typescript
// Response
{
  success: true;
  data: Exam & { questions: ExamQuestion[] };
}
```

### Update Exam
**PUT** `/api/admin/exams/[id]`

```typescript
// Request
{
  title?: string;
  description?: string;
  status?: string;
}

// Response
{ success: true; data: Exam }
```

### Delete Exam
**DELETE** `/api/admin/exams/[id]`

```typescript
// Response
{ success: true }
```

---

## Admin - Templates

### List Templates
**GET** `/api/admin/templates`

```typescript
// Response
{
  success: true;
  data: ReviewTemplate[];
}
```

### Create Template
**POST** `/api/admin/templates`

```typescript
// Request
{
  code: string;
  name: string;
  description?: string;
}

// Response
{ success: true; data: ReviewTemplate }
```

### Get Template
**GET** `/api/admin/templates/[id]`

```typescript
// Response
{
  success: true;
  data: ReviewTemplate & {
    structureRules: SectionStructureRule[];
    scoringRules: SectionScoringRule[];
    fixRules: SectionFixRule[];
  };
}
```

### Update Template
**PUT** `/api/admin/templates/[id]`

```typescript
// Request
{
  name?: string;
  description?: string;
  isActive?: boolean;
}

// Response
{ success: true; data: ReviewTemplate }
```

### Add Section to Template
**POST** `/api/admin/templates/[id]/sections`

```typescript
// Request
{
  ruleType: string;
  sectionCode: string;
  targetSection?: string;
  position?: number;
}

// Response
{ success: true; data: SectionStructureRule }
```

---

## Admin - Textbooks

### List Textbooks
**GET** `/api/admin/textbooks`

```typescript
// Query Params
?subject=Toán&grade=Lớp+10&status=COMPLETED

// Response
{
  success: true;
  data: TextbookBook[];
}
```

### Create Textbook
**POST** `/api/admin/textbooks`

```typescript
// FormData
{
  name: string;
  grade?: string;
  subject?: string;
  file: File;
}

// Response
{ success: true; data: TextbookBook }
```

### Get Textbook
**GET** `/api/admin/textbooks/[id]`

```typescript
// Response
{
  success: true;
  data: TextbookBook & { chapters: TextbookChapter[] };
}
```

### Update Textbook
**PUT** `/api/admin/textbooks/[id]`

```typescript
// Request
{
  name?: string;
  grade?: string;
  subject?: string;
  isActive?: boolean;
}

// Response
{ success: true; data: TextbookBook }
```

### Delete Textbook
**DELETE** `/api/admin/textbooks/[id]`

```typescript
// Response
{ success: true }
```

### Rebuild Index
**POST** `/api/admin/textbooks/[id]/rebuild-index`

```typescript
// Response
{ success: true; message: "Index rebuild started" }
```

---

## Admin - Section Rules

### List Rules
**GET** `/api/admin/section-rules`

```typescript
// Query Params
?templateCode=5STEP&ruleType=ORDER

// Response
{
  success: true;
  data: SectionStructureRule[];
}
```

### Create Rule
**POST** `/api/admin/section-rules`

```typescript
// Request
{
  templateId: string;
  ruleType: "ORDER" | "REQUIRED" | "FORBIDDEN";
  sectionCode: string;
  targetSection?: string;
  position?: number;
}

// Response
{ success: true; data: SectionStructureRule }
```

### Update Rule
**PUT** `/api/admin/section-rules/[id]`

```typescript
// Request
{
  ruleType?: string;
  sectionCode?: string;
  targetSection?: string;
  position?: number;
}

// Response
{ success: true; data: SectionStructureRule }
```

### Delete Rule
**DELETE** `/api/admin/section-rules/[id]`

```typescript
// Response
{ success: true }
```

---

## Admin - Circulars

### List Circulars
**GET** `/api/admin/circulars`

```typescript
// Response
{
  success: true;
  data: Circular[];
}
```

### Create Circular
**POST** `/api/admin/circulars`

```typescript
// Request
{
  name: string;
  number?: string;
  issuedBy?: string;
  issuedDate?: Date;
  content?: string;
}

// Response
{ success: true; data: Circular }
```

### Get Circular Rules
**GET** `/api/admin/circulars/[id]/rules`

```typescript
// Response
{
  success: true;
  data: SectionStructureRule[];
}
```

---

## Admin - Categories

### List Categories
**GET** `/api/admin/categories`

```typescript
// Response
{
  success: true;
  data: Category[];
}
```

### Create Category
**POST** `/api/admin/categories`

```typescript
// Request
{
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
}

// Response
{ success: true; data: Category }
```

### Update Category
**PUT** `/api/admin/categories/[id]`

```typescript
// Request
{
  name?: string;
  description?: string;
  parentId?: string;
}

// Response
{ success: true; data: Category }
```

### Delete Category
**DELETE** `/api/admin/categories/[id]`

```typescript
// Response
{ success: true }
```

---

## Admin - Knowledge Center

### List Knowledge
**GET** `/api/admin/knowledge-center`

```typescript
// Response
{
  success: true;
  data: {
    books: KnowledgeBook[];
    grades: KnowledgeGrade[];
    subjects: KnowledgeSubject[];
    lessons: KnowledgeLesson[];
  };
}
```

### Search Knowledge
**GET** `/api/admin/knowledge-center/search`

```typescript
// Query Params
?q=Đại+số&grade=Lớp+10&subject=Toán

// Response
{
  success: true;
  data: KnowledgeLesson[];
}
```

### Import Knowledge
**POST** `/api/admin/knowledge-center/import`

```typescript
// FormData
{ file: File }

// Response
{ success: true; imported: number }
```

---

## Admin - Stats

### Get Admin Stats
**GET** `/api/admin/stats`

```typescript
// Response
{
  success: true;
  data: {
    totalUsers: number;
    totalLessonPlans: number;
    totalQuestions: number;
    totalExams: number;
    // ...
  };
}
```

### Get Usage Stats
**GET** `/api/admin/usage-stats`

```typescript
// Query Params
?period=month&startDate=2024-01-01&endDate=2024-12-31

// Response
{
  success: true;
  data: {
    lessonPlans: { date: string; count: number }[];
    users: { date: string; count: number }[];
  };
}
```

---

## Exams

### List Exams
**GET** `/api/exams`

```typescript
// Query Params
?status=PUBLISHED&page=1&limit=20

// Response
{
  success: true;
  data: Exam[];
}
```

### Get Exam
**GET** `/api/exams/[id]`

```typescript
// Response
{
  success: true;
  data: Exam & { questions: ExamQuestion[] };
}
```

### Start Exam
**POST** `/api/exams/[id]/start`

```typescript
// Response
{
  success: true;
  data: {
    attemptId: string;
    examId: string;
    duration: number;
  };
}
```

### Submit Exam
**POST** `/api/attempts/[id]/submit`

```typescript
// Request
{
  answers: { questionId: string; answer: string }[];
}

// Response
{
  success: true;
  data: {
    score: number;
    totalPoints: number;
    earnedPoints: number;
  };
}
```

### Get Attempt Review
**GET** `/api/attempts/[id]/review`

```typescript
// Response
{
  success: true;
  data: {
    exam: Exam;
    attempt: ExamAttempt;
    answers: object[];
  };
}
```

---

## Feedback

### Submit Feedback
**POST** `/api/feedback`

```typescript
// Request
{
  type: "BUG" | "FEATURE" | "IMPROVEMENT";
  subject: string;
  content: string;
  email?: string;
}

// Response
{ success: true; data: Feedback }
```

### List Feedback (Admin)
**GET** `/api/feedback`

```typescript
// Query Params
?type=BUG&status=PENDING&page=1

// Response
{
  success: true;
  data: Feedback[];
}
```

---

## Announcements

### List Announcements
**GET** `/api/announcements`

```typescript
// Query Params
?isActive=true

// Response
{
  success: true;
  data: Announcement[];
}
```

---

## Categories (Public)

### List Categories
**GET** `/api/categories`

```typescript
// Response
{
  success: true;
  data: Category[];
}
```

---

## Rule Engine

### Parse Document
**POST** `/api/rule-engine/v2/parse`

```typescript
// Request
{
  content: string;
  templateCode?: string;
}

// Response
{
  success: true;
  data: {
    sections: ParsedSection[];
    structure: object;
    issues: object[];
  };
}
```

---

## Textbook Monitoring

### Get Metrics
**GET** `/api/textbook/monitoring`

```typescript
// Query Params
?startDate=2024-01-01&endDate=2024-12-31

// Response
{
  success: true;
  data: {
    matchings: ExecutionMetrics[];
    extractions: ExecutionMetrics[];
  };
}
```

---

## Workflow Process

### Process Lesson Plan
**POST** `/api/workflow/process`

```typescript
// Request
{
  lessonPlanId: string;
  autoMatch?: boolean;
  requireExactMatch?: boolean;
}

// Response
{
  success: true;
  data: {
    lessonPlanId: string;
    status: string;
    processingTime: number;
  };
}
```

---

## Common Error Responses

### 400 Bad Request
```typescript
{
  success: false;
  message: "Validation error";
  errors: [{ field: "email", message: "Invalid email" }];
}
```

### 401 Unauthorized
```typescript
{
  success: false;
  message: "Unauthorized";
}
```

### 403 Forbidden
```typescript
{
  success: false;
  message: "Forbidden";
}
```

### 404 Not Found
```typescript
{
  success: false;
  message: "Resource not found";
}
```

### 429 Too Many Requests
```typescript
{
  success: false;
  message: "Rate limit exceeded";
  retryAfter: number;
}
```

### 500 Internal Server Error
```typescript
{
  success: false;
  message: "Internal server error";
  error?: string;
}
```
