# Gemini AI Integration Specification

## Overview

This document specifies how the Lesson Plan Review module integrates with Google Gemini API for AI-powered document analysis.

---

## Core Principles

1. **JSON-Only Responses**: Gemini must return structured JSON, never plain text or Markdown
2. **Smart Chunking**: Automatically split long sections to fit token limits
3. **Caching**: Cache AI responses by content hash to reduce costs
4. **Retry Logic**: Implement exponential backoff for transient failures
5. **Validation**: Validate all AI responses against expected schema

---

## Gemini Configuration

```java
Model: gemini-1.5-pro
Temperature: 0.3  // Low for consistent, factual analysis
Top-P: 0.8
Top-K: 40
Max Output Tokens: 8192
```

---

## Request Structure

### Section Analysis Request

```java
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "[SYSTEM PROMPT + SECTION CONTENT + RULES]"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.3,
    "topK": 40,
    "topP": 0.8,
    "maxOutputTokens": 8192,
    "responseMimeType": "application/json",
    "responseSchema": {
      // JSON Schema for structured output
    }
  }
}
```

---

## Prompt Templates

### 1. Section Structure Analysis

```
SYSTEM ROLE:
You are an expert pedagogical reviewer analyzing Vietnamese lesson plans according to official Ministry of Education guidelines.

TASK:
Analyze the following section from a lesson plan and evaluate it against the provided criteria.

SECTION TYPE: {sectionType}
SECTION CONTENT:
---
{sectionContent}
---

REVIEW CRITERIA:
{rules}

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "sectionAnalysis": {
    "hasRequiredComponents": boolean,
    "missingComponents": string[],
    "structureScore": number,  // 0-100
    "contentScore": number,    // 0-100
    "formatScore": number      // 0-100
  },
  "findings": [
    {
      "ruleCode": string,
      "severity": "INFO" | "WARNING" | "ERROR" | "CRITICAL",
      "position": {
        "startChar": number,
        "endChar": number
      },
      "highlightedText": string,
      "issue": string,
      "explanation": string,
      "suggestion": string,
      "proposedContent": string
    }
  ],
  "strengths": string[],
  "weaknesses": string[],
  "overallAssessment": string
}

IMPORTANT:
- Return ONLY valid JSON, no markdown formatting
- Highlight specific text positions for each finding
- Provide actionable suggestions
- Use Vietnamese for all text fields
```

### 2. Objectives Analysis (Specific Example)

```
SYSTEM ROLE:
You are analyzing the "Objectives" section of a Vietnamese lesson plan.

REQUIREMENTS (Công văn 5512):
1. Must include three components:
   - Kiến thức (Knowledge): What students will know
   - Kỹ năng (Skills): What students will be able to do
   - Phẩm chất, thái độ (Qualities, Attitudes): Student character development
2. Each component must be specific and measurable
3. Use active verbs: "hiểu được", "phân tích được", "vận dụng được"
4. Align with curriculum standards

SECTION CONTENT:
---
{objectivesContent}
---

OUTPUT FORMAT:
{
  "hasKnowledgeComponent": boolean,
  "hasSkillsComponent": boolean,
  "hasAttitudeComponent": boolean,
  "knowledgeVerbs": string[],  // Verbs found like "hiểu được", "nắm được"
  "skillsVerbs": string[],     // Verbs found like "phân tích", "vận dụng"
  "findings": [
    {
      "ruleCode": "CV5512_OBJ_01",
      "severity": "ERROR",
      "position": {"startChar": 0, "endChar": 150},
      "highlightedText": "entire objectives section",
      "issue": "Thiếu thành phần kỹ năng",
      "explanation": "Mục tiêu chỉ đề cập đến kiến thức và thái độ, không nêu rõ kỹ năng học sinh cần đạt được",
      "suggestion": "Bổ sung mục tiêu kỹ năng cụ thể, ví dụ: 'Học sinh có kỹ năng phân tích, so sánh...'",
      "proposedContent": "Kỹ năng: Học sinh có khả năng phân tích cấu trúc tế bào và so sánh sự khác biệt giữa tế bào động vật và thực vật."
    }
  ],
  "strengths": ["Mục tiêu kiến thức rõ ràng", "Sử dụng động từ chuẩn xác"],
  "weaknesses": ["Thiếu thành phần kỹ năng", "Mục tiêu thái độ quá chung chung"],
  "overallScore": 65
}
```

### 3. Teaching Process Analysis

```
SYSTEM ROLE:
You are analyzing the "Teaching Process" section of a lesson plan.

REQUIREMENTS:
1. Must follow 3-stage structure:
   - Hoạt động khởi động (Warm-up/Introduction)
   - Hoạt động hình thành kiến thức (Knowledge Formation)
   - Hoạt động luyện tập (Practice)
   - Hoạt động vận dụng (Application)
2. Each activity must specify:
   - Duration (thời gian)
   - Teacher activities (hoạt động của giáo viên)
   - Student activities (hoạt động của học sinh)
   - Teaching methods (phương pháp)
3. Total time must match lesson duration (usually 45 minutes)

SECTION CONTENT:
---
{teachingProcessContent}
---

OUTPUT FORMAT:
{
  "stages": [
    {
      "stageName": string,
      "duration": number,
      "hasTeacherActivities": boolean,
      "hasStudentActivities": boolean,
      "hasMethod": boolean
    }
  ],
  "totalDuration": number,
  "durationIssues": boolean,
  "findings": [...],
  "timeAllocation": {
    "warmup": number,
    "formation": number,
    "practice": number,
    "application": number,
    "isBalanced": boolean
  },
  "overallScore": number
}
```

### 4. Assessment Analysis

```
SYSTEM ROLE:
You are analyzing the "Assessment" section of a lesson plan.

REQUIREMENTS:
1. Must include formative assessment strategies
2. Should specify assessment criteria
3. Must align with learning objectives
4. Should include diverse assessment methods

SECTION CONTENT:
---
{assessmentContent}
---

OUTPUT FORMAT:
{
  "hasFormativeAssessment": boolean,
  "hasSummativeAssessment": boolean,
  "assessmentMethods": string[],
  "alignsWithObjectives": boolean,
  "findings": [...],
  "overallScore": number
}
```

---

## Response Schema Definitions

### Base Review Response Schema

```json
{
  "type": "object",
  "properties": {
    "sectionAnalysis": {
      "type": "object",
      "properties": {
        "hasRequiredComponents": {"type": "boolean"},
        "missingComponents": {
          "type": "array",
          "items": {"type": "string"}
        },
        "structureScore": {"type": "number", "minimum": 0, "maximum": 100},
        "contentScore": {"type": "number", "minimum": 0, "maximum": 100},
        "formatScore": {"type": "number", "minimum": 0, "maximum": 100}
      },
      "required": ["hasRequiredComponents", "structureScore", "contentScore", "formatScore"]
    },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "ruleCode": {"type": "string"},
          "severity": {
            "type": "string",
            "enum": ["INFO", "WARNING", "ERROR", "CRITICAL"]
          },
          "position": {
            "type": "object",
            "properties": {
              "startChar": {"type": "integer"},
              "endChar": {"type": "integer"}
            },
            "required": ["startChar", "endChar"]
          },
          "highlightedText": {"type": "string"},
          "issue": {"type": "string"},
          "explanation": {"type": "string"},
          "suggestion": {"type": "string"},
          "proposedContent": {"type": "string"}
        },
        "required": ["ruleCode", "severity", "position", "issue", "explanation", "suggestion"]
      }
    },
    "strengths": {
      "type": "array",
      "items": {"type": "string"}
    },
    "weaknesses": {
      "type": "array",
      "items": {"type": "string"}
    },
    "overallAssessment": {"type": "string"},
    "overallScore": {"type": "number", "minimum": 0, "maximum": 100}
  },
  "required": ["sectionAnalysis", "findings", "strengths", "weaknesses", "overallScore"]
}
```

---

## Chunking Strategy

For sections exceeding token limits:

1. **Split by logical units**: paragraphs, activities, or tables
2. **Maintain context**: Include section header in each chunk
3. **Sequential processing**: Process chunks in order
4. **Result aggregation**: Merge findings, avoiding duplicates

```java
int MAX_TOKENS = 30000;  // Conservative limit for input
int CHUNK_OVERLAP = 500; // Characters overlap between chunks

if (estimatedTokens(content) > MAX_TOKENS) {
    List<String> chunks = splitIntoChunks(content, MAX_TOKENS, CHUNK_OVERLAP);
    List<ReviewResult> results = new ArrayList<>();
    
    for (int i = 0; i < chunks.size(); i++) {
        String contextualChunk = buildChunkWithContext(chunks.get(i), i, chunks.size());
        ReviewResult result = callGemini(contextualChunk);
        results.add(result);
    }
    
    return aggregateResults(results);
}
```

---

## Caching Strategy

```java
String cacheKey = MD5(ruleSetId + sectionContent);

// Check cache first
Optional<AIResponse> cached = aiResponseCache.get(cacheKey);
if (cached.isPresent() && !forceReview) {
    return cached.get();
}

// Call API
AIResponse response = callGeminiAPI(request);

// Cache for 7 days
aiResponseCache.put(cacheKey, response, Duration.ofDays(7));

return response;
```

---

## Error Handling

### Retry Logic

```java
int MAX_RETRIES = 3;
int BASE_DELAY_MS = 1000;

for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
        return callGeminiAPI(request);
    } catch (RateLimitException e) {
        if (attempt == MAX_RETRIES) throw e;
        Thread.sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
    } catch (TransientException e) {
        if (attempt == MAX_RETRIES) throw e;
        Thread.sleep(BASE_DELAY_MS);
    }
}
```

### Response Validation

```java
void validateResponse(String jsonResponse) throws InvalidResponseException {
    JsonNode node = objectMapper.readTree(jsonResponse);
    
    // Check required fields
    if (!node.has("findings") || !node.has("overallScore")) {
        throw new InvalidResponseException("Missing required fields");
    }
    
    // Validate score range
    double score = node.get("overallScore").asDouble();
    if (score < 0 || score > 100) {
        throw new InvalidResponseException("Score out of range: " + score);
    }
    
    // Validate findings structure
    for (JsonNode finding : node.get("findings")) {
        if (!finding.has("position") || !finding.has("severity")) {
            throw new InvalidResponseException("Invalid finding structure");
        }
    }
}
```

---

## Cost Optimization

1. **Cache aggressively**: Store results for unchanged content
2. **Batch when possible**: Combine multiple rules into one prompt
3. **Smart sampling**: For large documents, analyze representative samples first
4. **User feedback loop**: Learn from accepted/rejected annotations

---

## Testing Strategy

### Mock Responses for Testing

```json
{
  "sectionAnalysis": {
    "hasRequiredComponents": false,
    "missingComponents": ["Kỹ năng"],
    "structureScore": 70,
    "contentScore": 80,
    "formatScore": 90
  },
  "findings": [
    {
      "ruleCode": "CV5512_OBJ_01",
      "severity": "ERROR",
      "position": {"startChar": 0, "endChar": 200},
      "highlightedText": "Mục tiêu bài học...",
      "issue": "Thiếu thành phần kỹ năng",
      "explanation": "Theo Công văn 5512...",
      "suggestion": "Bổ sung mục tiêu kỹ năng",
      "proposedContent": "Kỹ năng: Học sinh có khả năng..."
    }
  ],
  "strengths": ["Mục tiêu kiến thức rõ ràng"],
  "weaknesses": ["Thiếu kỹ năng"],
  "overallAssessment": "Cần bổ sung thành phần kỹ năng",
  "overallScore": 75
}
```

### Integration Tests

1. Test with real Công văn 5512 examples
2. Test with incomplete sections
3. Test with malformed content
4. Test chunking with long documents
5. Test cache hit/miss scenarios
6. Test retry logic with simulated failures

---

## Monitoring

Track these metrics:

- Average response time per section
- Token usage per request
- Cache hit rate
- API error rate
- Cost per lesson plan review
- User acceptance rate of AI suggestions

---

## Security Considerations

1. **Never send PII** in prompts (student names, teacher personal info)
2. **Sanitize content** before sending to API
3. **Encrypt cached responses** at rest
4. **Rate limit** per user to prevent abuse
5. **Audit log** all AI requests for compliance
