# Lesson Plan Review Module - REST API Specification

## Base URL
```
/api/v1/lesson-plans
```

## Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## 1. Lesson Plan Management

### 1.1 Upload Lesson Plan
```
POST /api/v1/lesson-plans/upload
Content-Type: multipart/form-data

Request:
- file: MultipartFile (required)
- title: string (optional)
- subject: string (optional)
- gradeLevel: string (optional)
- schoolYear: string (optional)

Response: 201 Created
{
  "id": "uuid",
  "userId": "uuid",
  "title": "Bài 1: Sinh học tế bào",
  "subject": "Sinh học",
  "gradeLevel": "10",
  "schoolYear": "2023-2024",
  "originalFilename": "giao-an-sinh-10.docx",
  "fileSize": 524288,
  "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "status": "UPLOADED",
  "currentVersion": 1,
  "createdAt": "2026-06-26T09:00:00",
  "updatedAt": "2026-06-26T09:00:00"
}

Errors:
- 400: Invalid file format or size
- 401: Unauthorized
- 413: File too large
```

### 1.2 Get Lesson Plan Details
```
GET /api/v1/lesson-plans/{id}

Response: 200 OK
{
  "id": "uuid",
  "userId": "uuid",
  "title": "...",
  "status": "REVIEWED",
  "reviewSummary": {
    "reviewResultId": "uuid",
    "ruleSetCode": "CV5512",
    "ruleSetName": "Công văn 5512",
    "overallScore": 85.5,
    "totalIssues": 12,
    "criticalIssues": 0,
    "errorIssues": 2,
    "warningIssues": 10,
    "reviewStatus": "COMPLETED",
    "reviewedAt": "2026-06-26T10:30:00"
  }
}

Errors:
- 401: Unauthorized
- 403: Forbidden (not owner)
- 404: Lesson plan not found
```

### 1.3 List My Lesson Plans
```
GET /api/v1/lesson-plans?page=0&size=20&status=REVIEWED&sort=createdAt,desc

Query Parameters:
- page: int (default: 0)
- size: int (default: 20, max: 100)
- status: enum (optional filter)
- subject: string (optional filter)
- gradeLevel: string (optional filter)
- sort: string (default: createdAt,desc)

Response: 200 OK
{
  "content": [...],
  "page": {
    "size": 20,
    "totalElements": 45,
    "totalPages": 3,
    "number": 0
  }
}
```

### 1.4 Delete Lesson Plan
```
DELETE /api/v1/lesson-plans/{id}

Response: 204 No Content

Errors:
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
```

---

## 2. Document Parsing

### 2.1 Trigger Parse
```
POST /api/v1/lesson-plans/{id}/parse

Response: 202 Accepted
{
  "message": "Parsing started",
  "lessonPlanId": "uuid",
  "status": "PARSING"
}
```

### 2.2 Get Parsed Sections
```
GET /api/v1/lesson-plans/{id}/sections

Response: 200 OK
[
  {
    "id": "uuid",
    "sectionType": "OBJECTIVES",
    "sectionTitle": "Mục tiêu bài học",
    "sectionOrder": 2,
    "contentType": "TEXT",
    "rawContent": "...",
    "wordCount": 150,
    "charCount": 890
  },
  ...
]
```

### 2.3 Get Section Content
```
GET /api/v1/lesson-plans/{lessonPlanId}/sections/{sectionId}

Response: 200 OK
{
  "id": "uuid",
  "sectionType": "TEACHING_PROCESS",
  "sectionTitle": "Tiến trình dạy học",
  "rawContent": "...",
  "parsedContent": {
    "activities": [...],
    "tables": [...],
    "duration": 45
  }
}
```

### 2.4 Update Section Content
```
PUT /api/v1/lesson-plans/{lessonPlanId}/sections/{sectionId}
Content-Type: application/json

Request:
{
  "content": "Updated content here...",
  "changeNote": "Fixed grammar in activity 2"
}

Response: 200 OK
{
  "id": "uuid",
  "rawContent": "Updated content here...",
  "updatedAt": "2026-06-26T11:00:00"
}
```

---

## 3. AI Review

### 3.1 Start Review
```
POST /api/v1/lesson-plans/{id}/review
Content-Type: application/json

Request:
{
  "ruleSetId": "uuid",
  "forceReview": false
}

Response: 202 Accepted
{
  "message": "Review started",
  "reviewResultId": "uuid",
  "estimatedTime": "120 seconds"
}
```

### 3.2 Get Review Status
```
GET /api/v1/lesson-plans/{id}/review/status

Response: 200 OK
{
  "status": "REVIEWING",
  "progress": 45,
  "currentSection": "TEACHING_PROCESS",
  "processedSections": 3,
  "totalSections": 6
}
```

### 3.3 Get Review Results
```
GET /api/v1/lesson-plans/{id}/review

Response: 200 OK
{
  "id": "uuid",
  "lessonPlanId": "uuid",
  "ruleSetCode": "CV5512",
  "ruleSetName": "Công văn 5512",
  "overallScore": 85.5,
  "issueSummary": {
    "total": 12,
    "critical": 0,
    "error": 2,
    "warning": 10,
    "info": 0
  },
  "strengths": [
    "Mục tiêu bài học rõ ràng và cụ thể",
    "Phương pháp giảng dạy đa dạng"
  ],
  "weaknesses": [
    "Thiếu hoạt động đánh giá cuối giờ",
    "Thời gian phân bổ chưa hợp lý"
  ],
  "missingContent": [
    "Phần chuẩn bị của học sinh"
  ],
  "suggestions": [
    "Bổ sung thêm câu hỏi mở để phát triển tư duy",
    "Tăng thời gian cho hoạt động nhóm"
  ],
  "status": "COMPLETED",
  "sectionReviews": [
    {
      "sectionId": "uuid",
      "sectionTitle": "Mục tiêu",
      "sectionType": "OBJECTIVES",
      "annotationCount": 3,
      "criticalCount": 0,
      "errorCount": 1,
      "warningCount": 2
    },
    ...
  ]
}
```

---

## 4. Annotations

### 4.1 Get Annotations for Lesson Plan
```
GET /api/v1/lesson-plans/{id}/annotations?sectionId=uuid&severity=ERROR&status=PENDING

Query Parameters:
- sectionId: string (optional filter)
- severity: enum (optional: INFO, WARNING, ERROR, CRITICAL)
- status: enum (optional: PENDING, ACCEPTED, REJECTED, RESOLVED)
- annotationType: enum (optional)

Response: 200 OK
[
  {
    "id": "uuid",
    "sectionId": "uuid",
    "ruleCode": "CV5512_OBJ_01",
    "ruleName": "Mục tiêu phải có 3 thành phần",
    "annotationType": "ERROR",
    "severity": "ERROR",
    "position": {
      "startPosition": 120,
      "endPosition": 245,
      "lineNumber": 5
    },
    "highlightedText": "Học sinh hiểu được...",
    "message": "Mục tiêu thiếu thành phần kỹ năng",
    "explanation": "Theo Công văn 5512, mục tiêu cần có đủ 3 thành phần: kiến thức, kỹ năng, và thái độ",
    "suggestion": "Bổ sung kỹ năng cụ thể học sinh cần đạt được",
    "proposedContent": "Học sinh hiểu được... và có kỹ năng phân tích...",
    "status": "PENDING",
    "createdAt": "2026-06-26T10:15:00"
  },
  ...
]
```

### 4.2 Accept Annotation
```
POST /api/v1/lesson-plans/{lessonPlanId}/annotations/{annotationId}/accept

Response: 200 OK
{
  "id": "uuid",
  "status": "ACCEPTED",
  "resolvedBy": "uuid",
  "resolvedAt": "2026-06-26T11:30:00"
}
```

### 4.3 Reject Annotation
```
POST /api/v1/lesson-plans/{lessonPlanId}/annotations/{annotationId}/reject
Content-Type: application/json

Request:
{
  "reason": "Không áp dụng cho bối cảnh này"
}

Response: 200 OK
{
  "id": "uuid",
  "status": "REJECTED",
  "resolvedBy": "uuid",
  "resolvedAt": "2026-06-26T11:30:00"
}
```

### 4.4 Apply Suggested Content
```
POST /api/v1/lesson-plans/{lessonPlanId}/annotations/{annotationId}/apply

Response: 200 OK
{
  "annotationId": "uuid",
  "sectionId": "uuid",
  "updatedContent": "...",
  "status": "RESOLVED"
}
```

---

## 5. Export

### 5.1 Export as DOCX
```
POST /api/v1/lesson-plans/{id}/export
Content-Type: application/json

Request:
{
  "format": "DOCX",
  "includeAnnotations": true,
  "includeTrackChanges": true
}

Response: 202 Accepted
{
  "exportId": "uuid",
  "status": "PROCESSING",
  "estimatedTime": "30 seconds"
}
```

### 5.2 Check Export Status
```
GET /api/v1/lesson-plans/{id}/exports/{exportId}/status

Response: 200 OK
{
  "exportId": "uuid",
  "status": "COMPLETED",
  "downloadUrl": "/api/v1/lesson-plans/{id}/exports/{exportId}/download"
}
```

### 5.3 Download Exported File
```
GET /api/v1/lesson-plans/{id}/exports/{exportId}/download

Response: 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="giao-an-reviewed.docx"

[Binary file content]
```

### 5.4 Export History
```
GET /api/v1/lesson-plans/{id}/exports

Response: 200 OK
[
  {
    "id": "uuid",
    "format": "DOCX",
    "fileSize": 628736,
    "includeAnnotations": true,
    "includeTrackChanges": true,
    "exportedBy": "uuid",
    "createdAt": "2026-06-26T12:00:00",
    "downloadUrl": "/api/v1/lesson-plans/{id}/exports/{exportId}/download"
  },
  ...
]
```

---

## 6. Admin - Review Rule Management

### 6.1 List Rule Sets
```
GET /api/v1/admin/review-rules/sets?page=0&size=20

Response: 200 OK
{
  "content": [
    {
      "id": "uuid",
      "name": "Công văn 5512",
      "code": "CV5512",
      "version": "1.0",
      "scope": "GENERAL",
      "isActive": true,
      "isDefault": true,
      "ruleCount": 45,
      "createdAt": "2026-01-01T00:00:00"
    },
    ...
  ]
}
```

### 6.2 Create Rule Set
```
POST /api/v1/admin/review-rules/sets
Content-Type: application/json

Request:
{
  "name": "Công văn 958",
  "description": "Hướng dẫn đánh giá giáo án THPT",
  "code": "CV958",
  "version": "1.0",
  "scope": "HIGH_SCHOOL"
}

Response: 201 Created
{
  "id": "uuid",
  "name": "Công văn 958",
  "code": "CV958",
  ...
}
```

### 6.3 Get Rules in Set
```
GET /api/v1/admin/review-rules/sets/{setId}/rules?category=STRUCTURE&isActive=true

Response: 200 OK
[
  {
    "id": "uuid",
    "ruleCode": "CV5512_OBJ_01",
    "ruleName": "Kiểm tra cấu trúc mục tiêu",
    "category": "STRUCTURE",
    "severity": "ERROR",
    "priority": 10,
    "applicableSections": ["OBJECTIVES"],
    "isActive": true
  },
  ...
]
```

### 6.4 Create Rule
```
POST /api/v1/admin/review-rules/sets/{setId}/rules
Content-Type: application/json

Request:
{
  "ruleCode": "CV5512_OBJ_01",
  "ruleName": "Mục tiêu phải có 3 thành phần",
  "description": "Kiểm tra mục tiêu có đủ kiến thức, kỹ năng, thái độ",
  "category": "STRUCTURE",
  "severity": "ERROR",
  "priority": 10,
  "applicableSections": ["OBJECTIVES"],
  "aiPrompt": "Analyze the objectives section and check if it includes: 1) knowledge goals, 2) skill goals, 3) attitude goals. Return structured JSON with findings.",
  "validationCriteria": {
    "requiredComponents": ["knowledge", "skills", "attitude"],
    "minComponents": 3
  },
  "correctExamples": "Kiến thức: Học sinh hiểu được...\nKỹ năng: Học sinh có kỹ năng...\nThái độ: Học sinh có thái độ...",
  "incorrectExamples": "Học sinh hiểu được... (thiếu kỹ năng và thái độ)"
}

Response: 201 Created
{
  "id": "uuid",
  "ruleCode": "CV5512_OBJ_01",
  ...
}
```

### 6.5 Update Rule
```
PUT /api/v1/admin/review-rules/{ruleId}

Request: [Same as Create]

Response: 200 OK
```

### 6.6 Toggle Rule Status
```
PATCH /api/v1/admin/review-rules/{ruleId}/toggle

Response: 200 OK
{
  "id": "uuid",
  "isActive": false
}
```

### 6.7 Import Rules
```
POST /api/v1/admin/review-rules/sets/{setId}/import
Content-Type: multipart/form-data

Request:
- file: JSON file with rules array

Response: 201 Created
{
  "imported": 25,
  "skipped": 2,
  "errors": []
}
```

### 6.8 Export Rules
```
GET /api/v1/admin/review-rules/sets/{setId}/export

Response: 200 OK
Content-Type: application/json
Content-Disposition: attachment; filename="rules-CV5512.json"

[Array of rules]
```

---

## Error Responses

All endpoints may return these standard error responses:

```json
{
  "timestamp": "2026-06-26T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid file format",
  "path": "/api/v1/lesson-plans/upload"
}
```

Common Status Codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate resource)
- 413: Payload Too Large (file size limit)
- 422: Unprocessable Entity (business logic error)
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error
- 503: Service Unavailable (AI service down)

---

## Rate Limiting

AI-related endpoints are rate-limited:
- Review: 10 requests per minute per user
- Export: 5 requests per minute per user

Headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1719389400
```

---

## WebSocket Support (Future)

For real-time review progress updates:

```
ws://api.example.com/ws/lesson-plans/{id}/review

Message format:
{
  "type": "REVIEW_PROGRESS",
  "data": {
    "progress": 65,
    "currentSection": "EVALUATION",
    "message": "Analyzing evaluation criteria..."
  }
}
```
