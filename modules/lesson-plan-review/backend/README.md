# Lesson Plan Review Module - Backend

## Architecture

This module follows a **Modular Monolith** architecture pattern, ensuring high cohesion within the module while maintaining clean boundaries with the rest of the application.

## Technology Stack

- **Java**: 21
- **Framework**: Spring Boot 3.x
- **Database**: MySQL 8.0+
- **Object Storage**: MinIO
- **AI Service**: Google Gemini API
- **Document Processing**: Apache POI (DOCX), Apache PDFBox (PDF)
- **Security**: Spring Security + JWT

## Module Structure

```
backend/
├── config/                          # Module-specific configuration
│   ├── MinIOConfig.java
│   ├── GeminiConfig.java
│   └── SecurityConfig.java
├── domain/                          # Domain models (entities)
│   ├── LessonPlan.java
│   ├── LessonPlanVersion.java
│   ├── LessonPlanSection.java
│   ├── ReviewRuleSet.java
│   ├── ReviewRule.java
│   ├── ReviewResult.java
│   ├── Annotation.java
│   ├── AIRequest.java
│   ├── AIResponse.java
│   ├── ExportHistory.java
│   └── ReviewHistory.java
├── repository/                      # Data access layer
│   ├── LessonPlanRepository.java
│   ├── LessonPlanSectionRepository.java
│   ├── ReviewRuleSetRepository.java
│   ├── ReviewRuleRepository.java
│   ├── ReviewResultRepository.java
│   ├── AnnotationRepository.java
│   └── AIRequestRepository.java
├── service/                         # Business logic
│   ├── LessonPlanService.java
│   ├── DocumentParserService.java
│   ├── AIReviewService.java
│   ├── AnnotationService.java
│   ├── ExportService.java
│   ├── ReviewRuleService.java
│   └── impl/
│       ├── LessonPlanServiceImpl.java
│       ├── DocumentParserServiceImpl.java
│       ├── AIReviewServiceImpl.java
│       ├── AnnotationServiceImpl.java
│       ├── ExportServiceImpl.java
│       └── ReviewRuleServiceImpl.java
├── controller/                      # REST API endpoints
│   ├── LessonPlanController.java
│   ├── ReviewController.java
│   ├── AnnotationController.java
│   ├── ExportController.java
│   └── admin/
│       └── ReviewRuleController.java
├── dto/                            # Data Transfer Objects
│   ├── request/
│   │   ├── UploadLessonPlanRequest.java
│   │   ├── UpdateSectionRequest.java
│   │   ├── CreateReviewRuleRequest.java
│   │   └── ExportRequest.java
│   └── response/
│       ├── LessonPlanResponse.java
│       ├── ReviewResultResponse.java
│       ├── AnnotationResponse.java
│       └── ExportResponse.java
├── exception/                       # Custom exceptions
│   ├── LessonPlanNotFoundException.java
│   ├── InvalidDocumentFormatException.java
│   ├── AIServiceException.java
│   └── ExportException.java
├── integration/                     # External service integrations
│   ├── minio/
│   │   ├── MinIOService.java
│   │   └── MinIOServiceImpl.java
│   └── gemini/
│       ├── GeminiService.java
│       ├── GeminiServiceImpl.java
│       └── model/
│           ├── GeminiRequest.java
│           ├── GeminiResponse.java
│           └── ReviewAnalysis.java
└── util/                           # Utilities
    ├── DocumentUtil.java
    ├── CacheUtil.java
    └── ValidationUtil.java
```

## Key Components

### 1. Document Parser Service
- Extracts content from DOCX files
- Identifies document structure (headings, paragraphs, tables)
- Segments document into logical sections
- Preserves formatting metadata

### 2. AI Review Service
- Manages Gemini API integration
- Implements intelligent chunking for long documents
- Caches AI responses to reduce API calls
- Validates AI response structure
- Implements retry logic with exponential backoff

### 3. Annotation Service
- Creates, updates, and resolves annotations
- Maps annotations to document positions
- Supports accept/reject workflow
- Tracks annotation history

### 4. Export Service
- Generates DOCX with annotations as comments
- Preserves original formatting
- Optionally includes track changes
- Supports PDF export

### 5. Review Rule Service
- CRUD operations for rule sets and rules
- Supports multiple active rule sets
- Import/export rule configurations
- Rule validation and testing

## API Design Principles

1. **RESTful**: Follow REST conventions
2. **Versioned**: API version in URL (`/api/v1/lesson-plans`)
3. **Paginated**: Default pagination for list endpoints
4. **Filtered**: Support query parameters for filtering
5. **Secured**: JWT-based authentication
6. **Documented**: OpenAPI/Swagger documentation

## Security

- JWT token validation on all endpoints
- Role-based access control (USER/ADMIN)
- File upload validation (type, size, content)
- Rate limiting on AI endpoints
- Document ownership verification

## Performance Considerations

1. **Caching**: Redis/in-memory cache for AI responses
2. **Async Processing**: Heavy operations run asynchronously
3. **Batch Processing**: Group AI requests when possible
4. **Database Indexing**: Proper indexes on frequently queried fields
5. **Connection Pooling**: Optimized database connections

## Testing Strategy

- **Unit Tests**: 80%+ coverage for services
- **Integration Tests**: API endpoint testing
- **AI Response Mocks**: Predictable test data
- **Performance Tests**: Load testing for document processing

## Deployment

Module can be deployed as part of the monolith or extracted to a separate service in the future due to clean boundaries.
