# Lesson Plan Review Module - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the complete Lesson Plan Review module.

---

## Phase 1: Database & Backend Foundation (Week 1-2)

### 1.1 Database Setup

```bash
# Run migration
mysql -u root -p education_platform < modules/lesson-plan-review/docs/database-schema.sql

# Verify tables created
mysql -u root -p education_platform -e "SHOW TABLES LIKE 'lesson%'; SHOW TABLES LIKE 'review%'; SHOW TABLES LIKE 'ai%';"
```

### 1.2 Spring Boot Module Setup

Create module structure:
```
src/main/java/com/education/lessonplanreview/
```

Add dependencies to `pom.xml`:
```xml
<!-- Apache POI for DOCX processing -->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.5</version>
</dependency>

<!-- MinIO Client -->
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>8.5.7</version>
</dependency>

<!-- Google Generative AI (Gemini) -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-aiplatform</artifactId>
    <version>3.35.0</version>
</dependency>

<!-- JSON Schema Validator -->
<dependency>
    <groupId>com.networknt</groupId>
    <artifactId>json-schema-validator</artifactId>
    <version>1.0.87</version>
</dependency>
```

### 1.3 Configuration

Create `application-lessonplanreview.yml`:
```yaml
lessonplan:
  review:
    upload:
      max-file-size: 10MB
      allowed-types:
        - application/vnd.openxmlformats-officedocument.wordprocessingml.document
        - application/msword
    minio:
      endpoint: ${MINIO_ENDPOINT:http://localhost:9000}
      access-key: ${MINIO_ACCESS_KEY}
      secret-key: ${MINIO_SECRET_KEY}
      bucket: lesson-plans
    gemini:
      api-key: ${GEMINI_API_KEY}
      model: gemini-1.5-pro
      temperature: 0.3
      max-tokens: 8192
    cache:
      enabled: true
      ttl: 7d
    processing:
      max-chunk-size: 30000
      chunk-overlap: 500
```

---

## Phase 2: Document Processing (Week 2-3)

### 2.1 Implement DocumentParserService

Key methods:
```java
public class DocumentParserServiceImpl implements DocumentParserService {
    
    public ParsedDocument parseDocx(InputStream inputStream) {
        XWPFDocument document = new XWPFDocument(inputStream);
        List<LessonPlanSection> sections = new ArrayList<>();
        
        // Extract paragraphs
        for (XWPFParagraph paragraph : document.getParagraphs()) {
            String style = paragraph.getStyle();
            String text = paragraph.getText();
            
            // Identify section by heading style
            if (isHeading(style)) {
                SectionType type = detectSectionType(text);
                sections.add(createSection(type, text, paragraph));
            }
        }
        
        // Extract tables
        for (XWPFTable table : document.getTables()) {
            sections.add(parseTable(table));
        }
        
        return new ParsedDocument(sections);
    }
    
    private SectionType detectSectionType(String heading) {
        String normalized = heading.toLowerCase().trim();
        
        if (normalized.contains("mục tiêu")) return SectionType.OBJECTIVES;
        if (normalized.contains("chuẩn bị")) return SectionType.PREPARATION;
        if (normalized.contains("tiến trình")) return SectionType.TEACHING_PROCESS;
        if (normalized.contains("đánh giá")) return SectionType.EVALUATION;
        
        return SectionType.OTHER;
    }
}
```

### 2.2 Implement MinIOService

```java
@Service
public class MinIOServiceImpl implements MinIOService {
    
    private final MinioClient minioClient;
    
    @Value("${lessonplan.review.minio.bucket}")
    private String bucketName;
    
    public String uploadFile(String objectName, InputStream stream, String contentType) 
            throws Exception {
        minioClient.putObject(
            PutObjectArgs.builder()
                .bucket(bucketName)
                .object(objectName)
                .stream(stream, stream.available(), -1)
                .contentType(contentType)
                .build()
        );
        
        return String.format("%s/%s", bucketName, objectName);
    }
    
    public InputStream downloadFile(String objectName) throws Exception {
        return minioClient.getObject(
            GetObjectArgs.builder()
                .bucket(bucketName)
                .object(objectName)
                .build()
        );
    }
}
```

---

## Phase 3: AI Integration (Week 3-4)

### 3.1 Implement GeminiService

```java
@Service
public class GeminiServiceImpl implements GeminiService {
    
    @Value("${lessonplan.review.gemini.api-key}")
    private String apiKey;
    
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    
    public ReviewAnalysis analyzeSectionWithRules(
            String sectionContent, 
            List<ReviewRule> rules
    ) {
        // Build prompt
        String prompt = buildPrompt(sectionContent, rules);
        
        // Generate cache key
        String cacheKey = generateCacheKey(prompt);
        
        // Check cache
        Optional<ReviewAnalysis> cached = checkCache(cacheKey);
        if (cached.isPresent()) {
            return cached.get();
        }
        
        // Call Gemini API
        GeminiRequest request = GeminiRequest.builder()
            .contents(List.of(new Content("user", prompt)))
            .generationConfig(GenerationConfig.builder()
                .temperature(0.3)
                .maxOutputTokens(8192)
                .responseMimeType("application/json")
                .responseSchema(REVIEW_SCHEMA)
                .build())
            .build();
        
        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=" + apiKey;
        
        GeminiResponse response = restTemplate.postForObject(
            endpoint, 
            request, 
            GeminiResponse.class
        );
        
        // Parse and validate response
        String jsonResponse = response.getCandidates().get(0)
            .getContent().getParts().get(0).getText();
        
        ReviewAnalysis analysis = objectMapper.readValue(
            jsonResponse, 
            ReviewAnalysis.class
        );
        
        validateAnalysis(analysis);
        
        // Cache result
        cacheResult(cacheKey, analysis);
        
        return analysis;
    }
    
    private String buildPrompt(String content, List<ReviewRule> rules) {
        StringBuilder prompt = new StringBuilder();
        
        prompt.append("SYSTEM ROLE:\n");
        prompt.append("You are an expert pedagogical reviewer for Vietnamese lesson plans.\n\n");
        
        prompt.append("SECTION CONTENT:\n");
        prompt.append("---\n");
        prompt.append(content);
        prompt.append("\n---\n\n");
        
        prompt.append("REVIEW CRITERIA:\n");
        for (ReviewRule rule : rules) {
            prompt.append(String.format("- [%s] %s: %s\n", 
                rule.getRuleCode(), 
                rule.getRuleName(), 
                rule.getAiPrompt()
            ));
        }
        
        prompt.append("\n");
        prompt.append(RESPONSE_FORMAT_INSTRUCTION);
        
        return prompt.toString();
    }
}
```

### 3.2 Implement Chunking Logic

```java
public class ChunkingService {
    
    private static final int MAX_TOKENS = 30000;
    private static final int CHUNK_OVERLAP = 500;
    
    public List<String> splitIntoChunks(String content) {
        int estimatedTokens = estimateTokenCount(content);
        
        if (estimatedTokens <= MAX_TOKENS) {
            return List.of(content);
        }
        
        List<String> chunks = new ArrayList<>();
        int charLimit = MAX_TOKENS * 4; // Rough estimate: 1 token ≈ 4 chars
        
        int start = 0;
        while (start < content.length()) {
            int end = Math.min(start + charLimit, content.length());
            
            // Find paragraph boundary
            if (end < content.length()) {
                int lastNewline = content.lastIndexOf("\n", end);
                if (lastNewline > start) {
                    end = lastNewline;
                }
            }
            
            chunks.add(content.substring(start, end));
            start = end - CHUNK_OVERLAP;
        }
        
        return chunks;
    }
    
    private int estimateTokenCount(String text) {
        // Simple estimation: ~4 characters per token
        return text.length() / 4;
    }
}
```

---

## Phase 4: API Endpoints (Week 4-5)

### 4.1 LessonPlanController

```java
@RestController
@RequestMapping("/api/v1/lesson-plans")
@RequiredArgsConstructor
public class LessonPlanController {
    
    private final LessonPlanService lessonPlanService;
    
    @PostMapping("/upload")
    public ResponseEntity<LessonPlanResponse> uploadLessonPlan(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String subject,
            @CurrentUser User user
    ) {
        LessonPlan lessonPlan = lessonPlanService.upload(file, title, subject, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(mapToResponse(lessonPlan));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<LessonPlanResponse> getLessonPlan(
            @PathVariable String id,
            @CurrentUser User user
    ) {
        LessonPlan lessonPlan = lessonPlanService.getById(id);
        checkOwnership(lessonPlan, user);
        return ResponseEntity.ok(mapToResponse(lessonPlan));
    }
    
    @GetMapping("/{id}/sections")
    public ResponseEntity<List<SectionResponse>> getSections(
            @PathVariable String id,
            @CurrentUser User user
    ) {
        checkOwnership(id, user);
        List<LessonPlanSection> sections = lessonPlanService.getSections(id);
        return ResponseEntity.ok(sections.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList()));
    }
    
    @PostMapping("/{id}/parse")
    public ResponseEntity<Map<String, Object>> triggerParse(
            @PathVariable String id,
            @CurrentUser User user
    ) {
        checkOwnership(id, user);
        lessonPlanService.triggerParse(id);
        return ResponseEntity.accepted()
            .body(Map.of("message", "Parsing started", "lessonPlanId", id));
    }
}
```

### 4.2 ReviewController

```java
@RestController
@RequestMapping("/api/v1/lesson-plans/{lessonPlanId}/review")
@RequiredArgsConstructor
public class ReviewController {
    
    private final AIReviewService reviewService;
    
    @PostMapping
    public ResponseEntity<Map<String, Object>> startReview(
            @PathVariable String lessonPlanId,
            @RequestBody StartReviewRequest request,
            @CurrentUser User user
    ) {
        checkOwnership(lessonPlanId, user);
        
        String reviewResultId = reviewService.startReview(
            lessonPlanId, 
            request.getRuleSetId(),
            request.getForceReview()
        );
        
        return ResponseEntity.accepted().body(Map.of(
            "message", "Review started",
            "reviewResultId", reviewResultId,
            "estimatedTime", "120 seconds"
        ));
    }
    
    @GetMapping("/status")
    public ResponseEntity<ReviewStatusResponse> getReviewStatus(
            @PathVariable String lessonPlanId,
            @CurrentUser User user
    ) {
        checkOwnership(lessonPlanId, user);
        ReviewStatus status = reviewService.getStatus(lessonPlanId);
        return ResponseEntity.ok(mapToResponse(status));
    }
    
    @GetMapping
    public ResponseEntity<ReviewResultResponse> getReviewResult(
            @PathVariable String lessonPlanId,
            @CurrentUser User user
    ) {
        checkOwnership(lessonPlanId, user);
        ReviewResult result = reviewService.getResult(lessonPlanId);
        return ResponseEntity.ok(mapToResponse(result));
    }
}
```

---

## Phase 5: Frontend Development (Week 5-7)

### 5.1 Setup

```bash
cd modules/lesson-plan-review/frontend
npm install react react-dom typescript
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-highlight
npm install lucide-react
npm install react-dropzone
```

### 5.2 Create Core Components

Follow the component structure in `frontend/README.md`.

Start with:
1. FileUploader component
2. SectionNavigator component
3. ContentEditor with TipTap
4. ReviewPanel with AnnotationList
5. Wire everything together in LessonPlanReviewPage

---

## Phase 6: Export Functionality (Week 7-8)

### 6.1 DOCX Export with Apache POI

```java
@Service
public class ExportServiceImpl implements ExportService {
    
    public File exportToDocx(
            String lessonPlanId, 
            boolean includeAnnotations,
            boolean includeTrackChanges
    ) throws Exception {
        LessonPlan lessonPlan = lessonPlanService.getById(lessonPlanId);
        List<LessonPlanSection> sections = lessonPlanService.getSections(lessonPlanId);
        List<Annotation> annotations = annotationService.getAnnotations(lessonPlanId);
        
        XWPFDocument document = new XWPFDocument();
        
        // Add title
        XWPFParagraph title = document.createParagraph();
        title.setStyle("Heading1");
        XWPFRun titleRun = title.createRun();
        titleRun.setText(lessonPlan.getTitle());
        titleRun.setBold(true);
        
        // Add sections
        for (LessonPlanSection section : sections) {
            addSection(document, section, annotations, includeAnnotations);
        }
        
        // Write to file
        File tempFile = File.createTempFile("lesson-plan-", ".docx");
        try (FileOutputStream out = new FileOutputStream(tempFile)) {
            document.write(out);
        }
        
        return tempFile;
    }
    
    private void addSection(
            XWPFDocument document, 
            LessonPlanSection section,
            List<Annotation> annotations,
            boolean includeAnnotations
    ) {
        // Add section heading
        XWPFParagraph heading = document.createParagraph();
        heading.setStyle("Heading2");
        XWPFRun headingRun = heading.createRun();
        headingRun.setText(section.getSectionTitle());
        
        // Add content with annotations
        String content = section.getRawContent();
        XWPFParagraph contentPara = document.createParagraph();
        
        if (includeAnnotations) {
            addContentWithAnnotations(contentPara, content, 
                getAnnotationsForSection(annotations, section.getId()));
        } else {
            contentPara.createRun().setText(content);
        }
    }
    
    private void addContentWithAnnotations(
            XWPFParagraph para,
            String content,
            List<Annotation> annotations
    ) {
        int lastPos = 0;
        
        for (Annotation annotation : annotations) {
            int start = annotation.getStartPosition();
            int end = annotation.getEndPosition();
            
            // Add text before annotation
            if (start > lastPos) {
                para.createRun().setText(content.substring(lastPos, start));
            }
            
            // Add highlighted text with comment
            XWPFRun annotatedRun = para.createRun();
            annotatedRun.setText(content.substring(start, end));
            
            // Highlight based on severity
            if (annotation.getSeverity() == Severity.ERROR) {
                annotatedRun.setColor("FF0000");
            } else if (annotation.getSeverity() == Severity.WARNING) {
                annotatedRun.setColor("FFA500");
            }
            
            // Add comment
            addComment(para, annotation.getMessage() + "\n\n" + 
                annotation.getExplanation() + "\n\n" + 
                "Đề xuất: " + annotation.getSuggestion());
            
            lastPos = end;
        }
        
        // Add remaining text
        if (lastPos < content.length()) {
            para.createRun().setText(content.substring(lastPos));
        }
    }
}
```

---

## Phase 7: Admin Rule Management (Week 8-9)

### 7.1 Admin API

```java
@RestController
@RequestMapping("/api/v1/admin/review-rules")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class ReviewRuleController {
    
    private final ReviewRuleService ruleService;
    
    @GetMapping("/sets")
    public ResponseEntity<Page<ReviewRuleSetResponse>> getRuleSets(
            Pageable pageable
    ) {
        Page<ReviewRuleSet> ruleSets = ruleService.getRuleSets(pageable);
        return ResponseEntity.ok(ruleSets.map(this::mapToResponse));
    }
    
    @PostMapping("/sets")
    public ResponseEntity<ReviewRuleSetResponse> createRuleSet(
            @RequestBody @Valid CreateRuleSetRequest request,
            @CurrentUser User user
    ) {
        ReviewRuleSet ruleSet = ruleService.createRuleSet(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(mapToResponse(ruleSet));
    }
    
    @PostMapping("/sets/{setId}/rules")
    public ResponseEntity<ReviewRuleResponse> createRule(
            @PathVariable String setId,
            @RequestBody @Valid CreateRuleRequest request
    ) {
        ReviewRule rule = ruleService.createRule(setId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(mapToResponse(rule));
    }
}
```

### 7.2 Admin UI

Create admin pages following existing admin patterns in the platform.

---

## Phase 8: Testing (Week 9-10)

### 8.1 Unit Tests

```java
@SpringBootTest
class DocumentParserServiceTest {
    
    @Autowired
    private DocumentParserService parserService;
    
    @Test
    void shouldParseValidDocx() throws Exception {
        InputStream input = getClass().getResourceAsStream("/sample-lesson-plan.docx");
        ParsedDocument result = parserService.parseDocx(input);
        
        assertNotNull(result);
        assertTrue(result.getSections().size() >= 5);
        
        Optional<LessonPlanSection> objectives = result.getSections().stream()
            .filter(s -> s.getSectionType().equals("OBJECTIVES"))
            .findFirst();
        
        assertTrue(objectives.isPresent());
    }
}
```

### 8.2 Integration Tests

```java
@SpringBootTest
@AutoConfigureMockMvc
class LessonPlanControllerIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    @WithMockUser(roles = "USER")
    void shouldUploadLessonPlan() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "test.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "test content".getBytes()
        );
        
        mockMvc.perform(multipart("/api/v1/lesson-plans/upload")
                .file(file)
                .param("title", "Test Lesson"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.title").value("Test Lesson"));
    }
}
```

---

## Phase 9: Deployment (Week 10)

### 9.1 Environment Setup

```bash
# Production environment variables
export MINIO_ENDPOINT=https://storage.example.com
export MINIO_ACCESS_KEY=xxxxx
export MINIO_SECRET_KEY=xxxxx
export GEMINI_API_KEY=xxxxx

# Database
export DB_HOST=mysql.example.com
export DB_PORT=3306
export DB_NAME=education_platform
export DB_USER=app_user
export DB_PASSWORD=xxxxx
```

### 9.2 Build & Deploy

```bash
# Build backend
mvn clean package -DskipTests

# Build frontend
cd modules/lesson-plan-review/frontend
npm run build

# Deploy
docker-compose up -d
```

---

## Monitoring & Maintenance

### Key Metrics to Track

1. **Performance**
   - Average document parse time
   - Average AI review time per section
   - API response times

2. **Usage**
   - Lesson plans uploaded per day
   - Reviews completed per day
   - Cache hit rate
   - AI API costs

3. **Quality**
   - User acceptance rate of AI suggestions
   - Error rates
   - User satisfaction scores

### Logging

Use structured logging:
```java
log.info("Lesson plan uploaded", Map.of(
    "lessonPlanId", id,
    "userId", userId,
    "fileSize", fileSize,
    "mimeType", mimeType
));

log.info("AI review completed", Map.of(
    "lessonPlanId", id,
    "ruleSetId", ruleSetId,
    "processingTime", duration,
    "totalIssues", issueCount,
    "tokensUsed", tokens
));
```

---

## Security Checklist

- [ ] JWT authentication on all endpoints
- [ ] Role-based access control (USER/ADMIN)
- [ ] File upload validation (type, size, content)
- [ ] Document ownership verification
- [ ] Rate limiting on AI endpoints
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (sanitize user input)
- [ ] CORS configuration
- [ ] HTTPS in production
- [ ] Audit logging for admin actions

---

## Future Enhancements

1. **Real-time collaboration**: Multiple users reviewing same document
2. **Version comparison**: Diff view between document versions
3. **Custom rule creation UI**: Visual rule builder for non-technical admins
4. **Template library**: Pre-approved lesson plan templates
5. **Bulk operations**: Review multiple lesson plans in batch
6. **Mobile app**: React Native app for on-the-go reviews
7. **Integration**: Export to Google Classroom, Canvas LMS
8. **Analytics dashboard**: Aggregated insights across all lesson plans
