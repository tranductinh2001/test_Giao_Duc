# Lesson Plan Review Module - Development Continuation Guide

> **Mục đích:** Document này giúp AI/developer mới tiếp tục phát triển module mà không cần đọc lại toàn bộ code

**Date Created:** 2026-06-26  
**Current Status:** Phase 1 Complete (60% done)  
**Next Phase:** Phase 2 - DOCX Parser & AI Integration

---

## 📍 TÓM TẮT HIỆN TRẠNG

### ✅ Đã Hoàn Thành (Phase 1)

**Database (Prisma + PostgreSQL):**
- ✅ 10 models: LessonPlan, LessonPlanVersion, LessonPlanSection, ReviewRuleSet, ReviewRule, ReviewResult, Annotation, AIRequest, AIResponse, ExportHistory, ReviewHistory
- ✅ Migration: `20260626024024_add_lesson_plan_review_module`
- ✅ File: `prisma/schema.prisma` (dòng 437-892)

**API Routes (10 endpoints):**
- ✅ `POST /api/lesson-plans/upload` - Upload DOCX
- ✅ `GET /api/lesson-plans` - List với pagination
- ✅ `GET /api/lesson-plans/[id]` - Chi tiết
- ✅ `DELETE /api/lesson-plans/[id]` - Soft delete
- ✅ `GET /api/lesson-plans/[id]/sections` - Lấy sections
- ✅ `POST /api/lesson-plans/[id]/parse` - Parse (đang dùng sample data)
- ✅ `GET /api/lesson-plans/[id]/annotations` - Lấy annotations
- ✅ `POST /api/lesson-plans/[lessonPlanId]/annotations/[annotationId]/accept`
- ✅ `POST /api/lesson-plans/[lessonPlanId]/annotations/[annotationId]/reject`
- ✅ `GET|POST /api/admin/review-rules/sets` - Admin rule sets

**Frontend Pages:**
- ✅ `/lesson-plans` - List page
- ✅ `/lesson-plans/upload` - Upload page với drag & drop

**Types:**
- ✅ `src/types/lesson-plan.ts` - 30+ TypeScript interfaces

---

## 🎯 PHASE 2: DOCX PARSER & AI INTEGRATION (Tiếp Theo)

### Task 52: Implement DOCX Parser

**Vị trí code cần sửa:**
- File: `src/app/api/lesson-plans/[id]/parse/route.ts`
- Function: `createSampleSections()` (dòng 95-147)

**Cần làm:**

1. **Install package:**
```bash
npm install mammoth
npm install @types/mammoth --save-dev
```

2. **Tạo parser service mới:**
```
src/lib/docx-parser.ts
```

3. **Logic cần implement:**
```typescript
// src/lib/docx-parser.ts
import mammoth from "mammoth";
import { readFile } from "fs/promises";

export async function parseDocx(filePath: string) {
  // 1. Read file
  const buffer = await readFile(filePath);
  
  // 2. Extract with mammoth
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  
  // 3. Split by headings (detect by patterns)
  const sections = detectSections(text);
  
  // 4. Return structured data
  return sections.map((section, index) => ({
    sectionType: detectSectionType(section.title),
    sectionTitle: section.title,
    sectionOrder: index + 1,
    contentType: "TEXT",
    rawContent: section.content,
    wordCount: countWords(section.content),
    charCount: section.content.length,
  }));
}

function detectSectionType(title: string): SectionType {
  const normalized = title.toLowerCase();
  if (normalized.includes("mục tiêu")) return "OBJECTIVES";
  if (normalized.includes("chuẩn bị")) return "PREPARATION";
  if (normalized.includes("tiến trình")) return "TEACHING_PROCESS";
  if (normalized.includes("đánh giá")) return "EVALUATION";
  return "OTHER";
}

function detectSections(text: string) {
  // Split by common heading patterns
  // Vietnamese lesson plans usually have:
  // I. Mục tiêu
  // II. Chuẩn bị
  // III. Tiến trình dạy học
  // IV. Đánh giá
}
```

4. **Update parse route:**
```typescript
// src/app/api/lesson-plans/[id]/parse/route.ts
import { parseDocx } from "@/lib/docx-parser";

// Replace createSampleSections() call:
const sections = await parseDocx(path.join(process.cwd(), lessonPlan.filePath));

await prisma.lessonPlanSection.createMany({
  data: sections.map(section => ({
    lessonPlanId: id,
    versionNumber: lessonPlan.currentVersion,
    ...section,
  })),
});
```

**Test:**
- Upload real DOCX file
- Click Parse
- Check sections in database
- Verify section types detected correctly

---

### Task 53: Integrate Gemini AI

**Vị trí code cần tạo:**
- File mới: `src/lib/gemini.ts`
- File mới: `src/app/api/lesson-plans/[id]/review/route.ts`

**Cần làm:**

1. **Setup environment:**
```bash
# .env.local
GEMINI_API_KEY=your_api_key_here
```

2. **Install SDK:**
```bash
npm install @google/generative-ai
```

3. **Tạo Gemini service:**
```typescript
// src/lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function reviewSection(
  sectionContent: string,
  sectionType: string,
  rules: any[]
) {
  // 1. Build prompt
  const prompt = buildPrompt(sectionContent, sectionType, rules);
  
  // 2. Check cache
  const cacheKey = crypto.createHash("md5").update(prompt).digest("hex");
  const cached = await checkCache(cacheKey);
  if (cached) return cached;
  
  // 3. Call Gemini
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-pro",
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });
  
  const result = await model.generateContent(prompt);
  const response = JSON.parse(result.response.text());
  
  // 4. Cache result
  await cacheResult(cacheKey, response);
  
  return response;
}

function buildPrompt(content: string, type: string, rules: any[]) {
  return `
SYSTEM ROLE:
Bạn là chuyên gia đánh giá giáo án Việt Nam.

SECTION TYPE: ${type}
SECTION CONTENT:
---
${content}
---

REVIEW CRITERIA:
${rules.map(r => `- [${r.ruleCode}] ${r.ruleName}: ${r.aiPrompt}`).join("\n")}

OUTPUT FORMAT (JSON):
{
  "sectionAnalysis": {
    "hasRequiredComponents": boolean,
    "missingComponents": string[],
    "structureScore": number,
    "contentScore": number,
    "formatScore": number
  },
  "findings": [
    {
      "ruleCode": string,
      "severity": "INFO" | "WARNING" | "ERROR" | "CRITICAL",
      "position": { "startChar": number, "endChar": number },
      "highlightedText": string,
      "issue": string,
      "explanation": string,
      "suggestion": string,
      "proposedContent": string
    }
  ],
  "strengths": string[],
  "weaknesses": string[],
  "overallScore": number
}

IMPORTANT: Return ONLY valid JSON, no markdown.
`;
}
```

4. **Tạo review API route:**
```typescript
// src/app/api/lesson-plans/[id]/review/route.ts
import { reviewSection } from "@/lib/gemini";

export async function POST(req: NextRequest, context: RouteContext) {
  // 1. Get lesson plan & sections
  // 2. Get rule set
  // 3. For each section:
  //    - Call reviewSection()
  //    - Create annotations from findings
  // 4. Calculate overall score
  // 5. Create ReviewResult
  // 6. Return summary
}
```

**Prompt templates theo section:**

```typescript
// Objectives section
const objectivesPrompt = `
REQUIREMENTS (Công văn 5512):
1. Phải có 3 thành phần:
   - Kiến thức: Học sinh hiểu/nắm được gì
   - Kỹ năng: Học sinh có khả năng làm gì
   - Thái độ: Phát triển phẩm chất gì
2. Mỗi thành phần phải cụ thể, đo lường được
3. Dùng động từ hành động: "hiểu được", "phân tích được", "vận dụng được"
`;

// Teaching Process section
const teachingProcessPrompt = `
REQUIREMENTS:
1. Phải có các hoạt động:
   - Khởi động (5-10 phút)
   - Hình thành kiến thức (20-25 phút)
   - Luyện tập (10-15 phút)
   - Vận dụng (5-10 phút)
2. Mỗi hoạt động phải nêu:
   - Thời gian
   - Hoạt động của giáo viên
   - Hoạt động của học sinh
   - Phương pháp dạy học
`;
```

**Test:**
- Parse một lesson plan
- Tạo rule set mẫu trong database
- Call review API
- Check annotations được tạo
- Verify JSON structure

---

## 🎯 PHASE 3: REVIEW UI (3-Panel Interface)

### Task: Build Review Interface

**Vị trí code cần tạo:**
- File: `src/app/lesson-plans/[id]/review/page.tsx`
- Components trong: `src/components/lesson-plan/`

**Cần làm:**

1. **Install rich text editor:**
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-highlight
```

2. **Tạo 3-panel layout:**
```typescript
// src/app/lesson-plans/[id]/review/page.tsx
export default function ReviewPage() {
  return (
    <div className="flex h-screen">
      {/* Left: Section Navigator */}
      <aside className="w-64 border-r">
        <SectionNavigator sections={sections} />
      </aside>
      
      {/* Center: Content Editor */}
      <main className="flex-1">
        <ContentEditor content={content} annotations={annotations} />
      </main>
      
      {/* Right: Review Panel */}
      <aside className="w-96 border-l">
        <ReviewPanel reviewResult={result} />
      </aside>
    </div>
  );
}
```

3. **Components cần tạo:**

```typescript
// src/components/lesson-plan/SectionNavigator.tsx
export function SectionNavigator({ sections }: Props) {
  return (
    <nav className="p-4">
      {sections.map(section => (
        <button
          key={section.id}
          className={cn(
            "w-full p-3 rounded-lg mb-2",
            activeSection === section.id && "bg-primary text-primary-foreground"
          )}
        >
          <div className="flex justify-between items-center">
            <span>{section.sectionTitle}</span>
            {section.annotationCount > 0 && (
              <span className="text-xs bg-destructive px-2 py-0.5 rounded">
                {section.annotationCount}
              </span>
            )}
          </div>
        </button>
      ))}
    </nav>
  );
}
```

```typescript
// src/components/lesson-plan/ContentEditor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";

export function ContentEditor({ content, annotations }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Highlight],
    content,
    editable: true,
  });
  
  // Apply highlights for annotations
  useEffect(() => {
    annotations.forEach(ann => {
      editor?.commands.setTextSelection({
        from: ann.startPosition,
        to: ann.endPosition,
      });
      editor?.commands.setHighlight({ 
        color: getSeverityColor(ann.severity) 
      });
    });
  }, [annotations]);
  
  return <EditorContent editor={editor} />;
}
```

```typescript
// src/components/lesson-plan/ReviewPanel.tsx
export function ReviewPanel({ reviewResult }: Props) {
  return (
    <div className="flex flex-col h-full">
      <ReviewSummary result={reviewResult} />
      <AnnotationList annotations={annotations} />
    </div>
  );
}
```

4. **Annotation highlighting:**
```typescript
// Severity colors
const colors = {
  CRITICAL: "#dc2626", // red-600
  ERROR: "#ef4444",    // red-500
  WARNING: "#f59e0b",  // amber-500
  INFO: "#3b82f6",     // blue-500
};
```

**Test:**
- Open review page
- See 3 panels
- Click section → content loads
- Annotations highlighted correctly
- Can accept/reject annotations

---

## 🎯 PHASE 4: EXPORT FUNCTIONALITY

### Task: Implement DOCX/PDF Export

**Vị trí code cần tạo:**
- File: `src/lib/export-docx.ts`
- File: `src/app/api/lesson-plans/[id]/export/route.ts`

**Cần làm:**

1. **Install packages:**
```bash
npm install docx
npm install puppeteer  # For PDF
```

2. **DOCX Export:**
```typescript
// src/lib/export-docx.ts
import { Document, Paragraph, TextRun, Comment } from "docx";

export async function exportToDocx(
  lessonPlan: any,
  sections: any[],
  annotations: any[]
) {
  const doc = new Document({
    sections: [{
      children: [
        // Title
        new Paragraph({
          text: lessonPlan.title,
          heading: "Heading1",
        }),
        
        // Sections with annotations as comments
        ...sections.flatMap(section => 
          createSectionWithAnnotations(section, annotations)
        ),
      ],
    }],
  });
  
  return doc;
}

function createSectionWithAnnotations(section: any, annotations: any[]) {
  const sectionAnnotations = annotations.filter(a => a.sectionId === section.id);
  
  // Add section title
  const paragraphs = [
    new Paragraph({
      text: section.sectionTitle,
      heading: "Heading2",
    }),
  ];
  
  // Add content with highlights
  const content = section.rawContent;
  let lastPos = 0;
  
  sectionAnnotations.forEach(ann => {
    // Text before annotation
    if (ann.startPosition > lastPos) {
      paragraphs.push(new Paragraph({
        children: [new TextRun(content.substring(lastPos, ann.startPosition))],
      }));
    }
    
    // Annotated text with comment
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: content.substring(ann.startPosition, ann.endPosition),
          highlight: ann.severity === "ERROR" ? "red" : "yellow",
          // Add comment here
        }),
      ],
    }));
    
    lastPos = ann.endPosition;
  });
  
  return paragraphs;
}
```

3. **Export API:**
```typescript
// src/app/api/lesson-plans/[id]/export/route.ts
import { exportToDocx } from "@/lib/export-docx";

export async function POST(req: NextRequest, context: RouteContext) {
  const { format, includeAnnotations } = await req.json();
  
  // Get data
  const lessonPlan = await prisma.lessonPlan.findUnique({...});
  const sections = await prisma.lessonPlanSection.findMany({...});
  const annotations = includeAnnotations 
    ? await prisma.annotation.findMany({...})
    : [];
  
  // Generate file
  if (format === "DOCX") {
    const doc = await exportToDocx(lessonPlan, sections, annotations);
    // Save to disk
    // Return download URL
  }
  
  // Log export
  await prisma.exportHistory.create({...});
}
```

**Test:**
- Click Export button
- Choose DOCX with annotations
- Download file
- Open in Word → see comments
- Verify formatting preserved

---

## 🎯 PHASE 5: ADMIN RULE MANAGEMENT

### Task: Build Admin CRUD Interface

**Vị trí code cần tạo:**
- File: `src/app/admin/review-rules/page.tsx`
- File: `src/app/admin/review-rules/[setId]/page.tsx`
- API: `src/app/api/admin/review-rules/sets/[setId]/rules/route.ts`

**Cần làm:**

1. **Rule Set List Page:**
```typescript
// src/app/admin/review-rules/page.tsx
export default function AdminRuleSetsPage() {
  return (
    <div>
      <h1>Quản lý bộ tiêu chí đánh giá</h1>
      
      <Button onClick={createNew}>Tạo bộ tiêu chí mới</Button>
      
      {ruleSets.map(set => (
        <RuleSetCard 
          key={set.id}
          set={set}
          onEdit={() => router.push(`/admin/review-rules/${set.id}`)}
        />
      ))}
    </div>
  );
}
```

2. **Rule Editor Page:**
```typescript
// src/app/admin/review-rules/[setId]/page.tsx
export default function RuleEditorPage() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Rule List */}
      <aside>
        <RuleList rules={rules} onSelect={setSelected} />
        <Button onClick={createRule}>Thêm quy tắc</Button>
      </aside>
      
      {/* Center: Rule Form */}
      <main className="col-span-2">
        <RuleForm rule={selectedRule} onSave={handleSave} />
      </main>
    </div>
  );
}
```

3. **Rule Form:**
```typescript
// Components for rule editing
- Rule Code (required)
- Rule Name (required)
- Description
- Category dropdown
- Severity dropdown
- Priority number
- Applicable Sections (multi-select)
- AI Prompt (textarea)
- Correct Examples
- Incorrect Examples
```

4. **API Routes:**
```typescript
// GET/POST /api/admin/review-rules/sets/[setId]/rules
// GET/PUT/DELETE /api/admin/review-rules/rules/[ruleId]
// POST /api/admin/review-rules/sets/[setId]/toggle  // Enable/disable
```

**Sample Rule Data:**
```json
{
  "ruleCode": "CV5512_OBJ_01",
  "ruleName": "Mục tiêu phải có 3 thành phần",
  "category": "STRUCTURE",
  "severity": "ERROR",
  "priority": 10,
  "applicableSections": ["OBJECTIVES"],
  "aiPrompt": "Kiểm tra xem phần mục tiêu có đủ 3 thành phần: kiến thức, kỹ năng, thái độ không. Trả về JSON với findings.",
  "correctExamples": "Kiến thức: ...\nKỹ năng: ...\nThái độ: ...",
  "incorrectExamples": "Chỉ có kiến thức, thiếu kỹ năng và thái độ"
}
```

---

## 📝 CHECKLIST HOÀN THÀNH TỪNG PHASE

### Phase 2: DOCX & AI
- [ ] Install mammoth.js
- [ ] Create `src/lib/docx-parser.ts`
- [ ] Update parse route to use real parser
- [ ] Test với file DOCX thật
- [ ] Install Gemini SDK
- [ ] Create `src/lib/gemini.ts`
- [ ] Create review API route
- [ ] Test AI review với sample rules
- [ ] Verify annotations created correctly

### Phase 3: Review UI
- [ ] Install TipTap
- [ ] Create review page `/lesson-plans/[id]/review`
- [ ] Build SectionNavigator component
- [ ] Build ContentEditor with TipTap
- [ ] Build ReviewPanel component
- [ ] Implement annotation highlighting
- [ ] Wire up accept/reject actions
- [ ] Test full review flow

### Phase 4: Export
- [ ] Install docx package
- [ ] Create `src/lib/export-docx.ts`
- [ ] Create export API route
- [ ] Add annotations as Word comments
- [ ] Test DOCX export
- [ ] Optional: Add PDF export
- [ ] Add download button to UI

### Phase 5: Admin
- [ ] Create rule sets list page
- [ ] Create rule editor page
- [ ] Create rule form components
- [ ] Add CRUD API routes
- [ ] Implement toggle active/inactive
- [ ] Add import/export rules
- [ ] Test full CRUD flow

---

## 🔗 LIÊN KẾT QUAN TRỌNG

**Documents:**
- Summary: `/LESSON-PLAN-MODULE-SUMMARY.md`
- Original design: `/modules/lesson-plan-review/` (nếu còn)

**Key Files:**
- Schema: `prisma/schema.prisma` (dòng 437-892)
- Types: `src/types/lesson-plan.ts`
- Parse API: `src/app/api/lesson-plans/[id]/parse/route.ts`

**External Docs:**
- Mammoth.js: https://github.com/mwilliamson/mammoth.js
- Gemini API: https://ai.google.dev/tutorials/node_quickstart
- TipTap: https://tiptap.dev/docs/editor/getting-started/install/nextjs
- docx.js: https://docx.js.org/

---

## 💬 CÂU LỆNH CHO AI SESSION MỚI

Khi bắt đầu session mới, hãy nói:

> "Tiếp tục phát triển Lesson Plan Review module. 
> Đọc file `LESSON-PLAN-CONTINUATION-GUIDE.md` để biết cần làm gì tiếp.
> Hiện tại đang ở Phase 2 - cần implement DOCX Parser và Gemini AI integration."

Hoặc cụ thể hơn:

> "Implement Task 52: DOCX Parser. 
> Theo hướng dẫn trong `LESSON-PLAN-CONTINUATION-GUIDE.md`, 
> cài mammoth.js và tạo `src/lib/docx-parser.ts` để parse DOCX thật thay vì sample data."

---

**Last Updated:** 2026-06-26  
**Next Task:** Task 52 - DOCX Parser  
**Estimated Time to Complete All Phases:** 2-3 weeks
