# REFACTOR PLAN - AI SECTION DETECTOR & RULE ENGINE

## Phân tích Schema Hiện Tại

### Models giữ lại (không thay đổi):
- `LessonPlan` - Core entity
- `LessonPlanSection` - Lưu sections đã phân tích
- `LessonPlanVersion` - Version history
- `LessonPlanCollaborator` - Phân quyền
- `ReviewResult` - Kết quả review
- `Annotation` - Góp ý của AI
- `AIRequest` / `AIResponse` - Cache

### Models sẽ loại bỏ khỏi UI (giữ lại DB để backward compatible):
- `CircularDocument` - Không còn hiển thị cho user
- `CircularSectionRequirement` - Không còn sử dụng
- `CircularType` enum

### Models sẽ tạo mới:
- `SectionRule` - Rule cho từng phần giáo án (thay thế CircularSectionRequirement)
- `SectionDetectionResult` - Lưu kết quả phân tích Section từ AI

### SectionType hiện tại:
```
HEADER
OBJECTIVES
PREPARATION
TEACHING_PROCESS
EVALUATION
```

**Cần mở rộng thành:**
```
HEADER
OBJECTIVES                  // Mục tiêu
PREPARATION                 // Chuẩn bị
WARM_UP                    // Khởi động
KNOWLEDGE_FORMATION        // Hình thành kiến thức
PRACTICE                   // Luyện tập
APPLICATION                // Vận dụng
EVALUATION                 // Đánh giá
HOMEWORK                   // Dặn dò
TEACHING_EQUIPMENT         // Thiết bị dạy học
LEARNING_MATERIALS         // Học liệu
OTHER                      // Khác
```

## Database Changes

### 1. Tạo bảng SectionRule

```prisma
model SectionRule {
  id                String      @id @default(uuid())
  sectionType       SectionType // Phần giáo án áp dụng
  title             String      // Tiêu đề Rule (VD: "Kiểm tra năng lực chung")
  requirements      String      @db.Text // Nội dung yêu cầu chi tiết
  correctExample    String?     @db.Text // Ví dụ đúng
  incorrectExample  String?     @db.Text // Ví dụ sai
  aiPrompt          String      @db.Text // Prompt cụ thể cho AI
  priority          Int         @default(0) // Độ ưu tiên (cao hơn = quan trọng hơn)
  weight            Float       @default(1.0) // Trọng số điểm (0.0 - 1.0)
  isActive          Boolean     @default(true)
  createdBy         String
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  creator     User         @relation(fields: [createdBy], references: [id], onDelete: Cascade)
  annotations Annotation[]
  
  @@index([sectionType])
  @@index([isActive])
  @@index([priority])
}
```

### 2. Tạo bảng SectionDetectionResult (optional - có thể lưu trong parsedContent của LessonPlanSection)

```prisma
model SectionDetectionResult {
  id                String   @id @default(uuid())
  lessonPlanId      String
  detectedSections  Json     // Array of detected sections with confidence scores
  detectionMethod   String   // "HEADING" | "SEMANTIC" | "HYBRID"
  confidence        Float    // 0.0 - 1.0
  createdAt         DateTime @default(now())
  
  lessonPlan LessonPlan @relation(fields: [lessonPlanId], references: [id], onDelete: Cascade)
  
  @@index([lessonPlanId])
}
```

## Workflow Mới

### Phase 1: Upload & Section Detection
```
User uploads DOCX
  ↓
Parse DOCX structure (mammoth + custom parser)
  ↓
AI Section Detector analyzes:
  - Heading styles (H1, H2, H3)
  - Font size/weight
  - Numbering patterns (I., II., 1., 2., a., b.)
  - Table structure
  - Keywords matching
  - Semantic analysis (Gemini)
  ↓
Map detected sections to SectionType
  ↓
Save to LessonPlanSection with confidence scores
  ↓
Status: PARSED
```

### Phase 2: Review Execution
```
User clicks "Review"
  ↓
For each Section in LessonPlanSection:
  ↓
  Load active SectionRules for that sectionType
    ↓
  Build prompt with all applicable rules
    ↓
  Send to Gemini
    ↓
  Stream result back (SSE)
    ↓
  Save annotations
    ↓
  Update ReviewResult
  ↓
Next section
```

### Phase 3: Editor & Export
```
Unchanged - existing 3-panel editor works
Export DOCX/PDF works as before
```

## Module: AI Section Detector

### Location: `src/lib/section-detector.ts`

### Functions:

#### 1. `parseDocxStructure(buffer: Buffer)`
```typescript
interface DocxElement {
  type: 'heading' | 'paragraph' | 'table';
  level?: number; // H1=1, H2=2, etc
  text: string;
  style?: {
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
  };
  numbering?: {
    level: number;
    format: string; // 'decimal', 'lowerLetter', etc
  };
}
```

#### 2. `detectSectionsHeuristic(elements: DocxElement[])`
- Pattern matching với keywords
- Phân tích heading hierarchy
- Numbering patterns
- Returns: Section candidates với confidence

#### 3. `detectSectionsSemantic(content: string, candidates: Section[])`
- Gửi Gemini để phân loại semantic
- Prompt: "Phân loại các đoạn văn sau vào các Section của giáo án"
- Returns: Refined sections với semantic confidence

#### 4. `mergeSectionResults(heuristic: Section[], semantic: Section[])`
- Kết hợp kết quả từ 2 methods
- Xử lý conflicts
- Final confidence score

### Section Detection Prompt for Gemini:

```
BẠN LÀ CHUYÊN GIA PHÂN TÍCH CẤU TRÚC GIÁO ÁN VIỆT NAM.

NHIỆM VỤ: Phân loại các đoạn văn sau vào đúng Section của giáo án.

CÁC SECTION HỢP LỆ:
- OBJECTIVES: Mục tiêu bài học (kiến thức, kỹ năng, thái độ, năng lực)
- PREPARATION: Chuẩn bị (thiết bị dạy học, học liệu, tài liệu)
- WARM_UP: Hoạt động khởi động
- KNOWLEDGE_FORMATION: Hình thành kiến thức mới
- PRACTICE: Luyện tập, thực hành
- APPLICATION: Vận dụng kiến thức
- EVALUATION: Đánh giá, nhận xét
- HOMEWORK: Dặn dò, bài tập về nhà

LƯU Ý:
- Tiêu đề Section có thể khác nhau: "Mục tiêu", "Mục tiêu bài học", "Yêu cầu cần đạt"
- Phân loại dựa trên NỘI DUNG, không chỉ tiêu đề
- Nếu không chắc chắn, trả về "OTHER"

INPUT:
{các đoạn văn với index}

OUTPUT (JSON):
{
  "sections": [
    {
      "index": 0,
      "sectionType": "OBJECTIVES",
      "confidence": 0.95,
      "reasoning": "Đoạn văn này liệt kê kiến thức, kỹ năng, thái độ học sinh cần đạt"
    },
    ...
  ]
}
```

## Admin UI Flow

### Page: `/admin/section-rules`

**Layout:**
```
┌─────────────────────────────────────────────┐
│ ← Quay lại Settings                         │
│                                             │
│ Quản lý Yêu cầu Giáo án                    │
│                                             │
│ [+ Tạo yêu cầu mới]                         │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Mục tiêu (OBJECTIVES)           [+ Thêm]│ │
│ │                                         │ │
│ │ □ Kiểm tra năng lực chung    [Sửa][Xóa]│ │
│ │ □ Kiểm tra năng lực đặc thù  [Sửa][Xóa]│ │
│ │ □ Kiểm tra phẩm chất         [Sửa][Xóa]│ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Khởi động (WARM_UP)             [+ Thêm]│ │
│ │                                         │ │
│ │ □ Kiểm tra tính hấp dẫn      [Sửa][Xóa]│ │
│ │ □ Kiểm tra tình huống        [Sửa][Xóa]│ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ... (các section khác)                      │
└─────────────────────────────────────────────┘
```

### Form tạo/sửa Rule:

```
Phần giáo án: [Dropdown: Mục tiêu, Khởi động, ...]
Tiêu đề: [Input]
Nội dung yêu cầu: [Textarea]
Ví dụ đúng: [Textarea]
Ví dụ sai: [Textarea]
Prompt AI: [Textarea with placeholder]
Độ ưu tiên: [Number: 0-100]
Trọng số: [Number: 0.0-1.0]
[✓] Kích hoạt

[Lưu] [Hủy]
```

## API Endpoints

### Admin APIs:
- `GET /api/admin/section-rules` - List all rules
- `POST /api/admin/section-rules` - Create rule
- `GET /api/admin/section-rules/[id]` - Get rule detail
- `PUT /api/admin/section-rules/[id]` - Update rule
- `DELETE /api/admin/section-rules/[id]` - Delete rule
- `GET /api/admin/section-rules/by-section/[sectionType]` - Get rules by section

### User APIs (modified):
- `POST /api/lesson-plans/upload` - Add section detection
- `POST /api/lesson-plans/[id]/detect-sections` - Re-run section detection
- `POST /api/lesson-plans/[id]/review-stream` - Modify to use SectionRule

## Migration Strategy

### Step 1: Add SectionRule table
```sql
-- Will be generated by Prisma
```

### Step 2: Migrate existing data (optional)
```sql
-- Convert CircularSectionRequirement to SectionRule
INSERT INTO "SectionRule" (...)
SELECT ... FROM "CircularSectionRequirement"
WHERE isActive = true;
```

### Step 3: Update SectionType enum
```prisma
enum SectionType {
  HEADER
  OBJECTIVES
  PREPARATION
  WARM_UP
  KNOWLEDGE_FORMATION
  PRACTICE
  APPLICATION
  EVALUATION
  HOMEWORK
  TEACHING_EQUIPMENT
  LEARNING_MATERIALS
  OTHER
}
```

## Testing Checklist

### Section Detection:
- [ ] Upload DOCX với heading styles chuẩn
- [ ] Upload DOCX với tiêu đề custom ("Yêu cầu cần đạt" thay vì "Mục tiêu")
- [ ] Upload DOCX với numbering (I., II., 1., 2.)
- [ ] Upload DOCX với table structure
- [ ] Verify confidence scores
- [ ] Verify fallback to semantic detection

### Admin Rules:
- [ ] Create rule for each section type
- [ ] Edit rule
- [ ] Delete rule
- [ ] Toggle active/inactive
- [ ] Verify priority ordering
- [ ] Verify weight calculation

### Review Flow:
- [ ] Review with multiple rules per section
- [ ] Verify streaming per section
- [ ] Verify annotations created correctly
- [ ] Verify rule matching in prompt
- [ ] Cache working correctly

### UI/UX:
- [ ] Navigation: Settings → Section Rules → Back
- [ ] Rule list grouped by section
- [ ] Create/Edit form validation
- [ ] Delete confirmation
- [ ] Toast notifications

## Backward Compatibility

- Giữ nguyên bảng `CircularDocument`, `CircularSectionRequirement` trong DB
- Không xóa data cũ
- Admin pages cũ (`/admin/circulars`) có thể truy cập nhưng không hiển thị trong menu
- Migration script để convert data sang SectionRule nếu cần

## Implementation Order

1. ✅ Task #39: Phân tích schema (DONE - this doc)
2. Task #40: Database migration (SectionRule table + SectionType enum)
3. Task #41: Build AI Section Detector module
4. Task #42: Admin UI (/admin/section-rules)
5. Task #46: Update Upload workflow
6. Task #43: Refactor Review Engine
7. Task #44: Update Streaming API
8. Task #45: Update Editor UI
9. Task #47: End-to-end testing
10. Task #48: Documentation

---

**Status:** Phase 1 Analysis Complete ✅
**Next:** Start database schema design
