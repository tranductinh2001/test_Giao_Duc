# Section Rules Architecture

> Replaces the legacy "Công văn" (Circular) system with per-section-type evaluation rules

## Overview

The Section Rules system provides fine-grained evaluation criteria for each of the 14 lesson plan section types. Instead of applying broad circular documents (Công văn 5512, 2345) to entire lesson plans, rules are defined per section type, enabling the AI to evaluate each section against precise, relevant criteria.

### Key Concepts

| Concept | Description |
|---|---|
| Section Type | One of 14 enumerated types (HEADER, OBJECTIVES, PREPARATION, etc.) |
| Section Rule | A single evaluation criterion for a specific section type |
| Rule Group | Rules grouped by section type for admin management |
| AI Prompt | Per-rule custom prompt guiding the AI's evaluation |
| Weight/Score | Numerical priority and scoring weight per rule |

## Architecture Flow

```
DOCX Upload
    |
    v
AI Section Detector (section-detector.ts)
    - Reads DOCX via mammoth library (server-side only)
    - Detects section boundaries using heading patterns & content analysis
    - Classifies each section into one of 14 SectionType values
    |
    v
Section Rules Lookup
    - Fetches SectionRule records from DB matching each section's type
    - Orders rules by priority, groups by section type
    |
    v
Gemini AI Review (gemini.ts)
    - Builds prompt per section: section content + matching rules
    - Each rule contributes: requirements text, correct/incorrect examples, AI prompt
    - Returns structured JSON with findings, scores, suggestions
    |
    v
Annotation Display (editor page)
    - Highlights issues inline with severity coloring
    - Shows AI suggestions with accept/reject controls
    - Supports direct content editing and version tracking
```

## The 14 Section Types

```typescript
enum SectionType {
  HEADER              // Tiêu đề giáo án
  OBJECTIVES          // Mục tiêu bài học
  PREPARATION         // Chuẩn bị (GV + HS)
  TEACHING_EQUIPMENT  // Thiết bị dạy học
  LEARNING_MATERIALS  // Học liệu
  WARM_UP             // Khởi động
  KNOWLEDGE_FORMATION // Hình thành kiến thức
  PRACTICE            // Luyện tập
  APPLICATION         // Vận dụng
  EVALUATION          // Đánh giá
  HOMEWORK            // Bài tập về nhà
  TEACHING_PROCESS    // Tiến trình dạy học
  APPENDIX            // Phụ lục
  OTHER               // Khác
}
```

Vietnamese labels are maintained in `src/lib/section-type-labels.ts` (safe for client components, no Node.js dependencies).

## Database Schema

### SectionRule Model (prisma/schema.prisma ~line 862)

```prisma
model SectionRule {
  id              String    @id @default(cuid())
  title           String
  sectionType     SectionType
  requirements    String
  priority        Int       @default(0)
  weight          Float     @default(1.0)
  aiPrompt        String?
  correctExample  String?
  incorrectExample String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

- `sectionType` links to the SectionType enum — each rule applies to exactly one section type
- `priority` determines evaluation order (higher = checked first)
- `weight` affects scoring calculations
- `correctExample` / `incorrectExample` provide few-shot learning examples for the AI

### Legacy Models (not removed, functionally superseded)

- `CircularDocument` — old circular upload/storage
- `CircularSectionRequirement` — old per-section requirements within a circular

These legacy tables remain for data preservation but are not used in the active review pipeline.

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/section-rules` | List all rules, optionally filter by `sectionType` |
| POST | `/api/admin/section-rules` | Create new rule |
| PUT | `/api/admin/section-rules/[id]` | Update rule |
| DELETE | `/api/admin/section-rules/[id]` | Delete rule |

Admin routes require `ADMIN` role (checked via `getServerSession`).

## Admin UI

### `/admin/section-rules` — Main management page

Full CRUD interface with:
- Grouped listing by section type (accordion panels)
- Vietnamese section type labels displayed throughout
- Modal forms for create/edit (title, requirements, examples, AI prompt, priority, weight, active toggle)
- Confirmation dialogs for delete
- Real-time search/filter across rules

### `/admin/lesson-plans/settings` — System settings

- Section Rules management card (links to `/admin/section-rules`)
- AI review explanation card showing the pipeline: Upload → Section Detection → Rules → AI Review

## AI Integration

In `src/lib/gemini.ts`, the `reviewSection()` function:

1. Receives section content + detected section type
2. Fetches matching `SectionRule` records for that type
3. Calls `buildReviewPrompt()` which constructs a prompt with:
   - Section type guidelines (hardcoded per-type requirements)
   - All matching rules with their requirements, examples, and AI prompts
   - Strict JSON output format specification
4. Sends to Gemini API with `responseMimeType: "application/json"`
5. Returns parsed `SectionReviewResult` with findings, scores, and suggestions

Prompt structure:
```
SYSTEM ROLE → SECTION RULES → SECTION TYPE GUIDELINES → CONTENT → RULES → OUTPUT FORMAT
```

## Migration from Circulars

The old system used `CircularDocument` + `CircularSectionRequirement` to manage review criteria. Migration path:

1. Circular documents were the unit of management (admin uploaded/edited circulars)
2. Each circular contained requirements per section type (old 7-type system)
3. **New approach**: Section Rules are the unit — each rule targets one of 14 section types directly

No automated migration was run since the data models are structurally different. Old circular data remains in the database for reference.

## Development Notes

- **Server-only**: `section-detector.ts` imports `fs` and `mammoth` — never import it in client components
- **Client-safe labels**: `section-type-labels.ts` is safe for `"use client"` components
- **Adding a rule**: Use the admin UI at `/admin/section-rules`
- **New section types**: Must be added to the Prisma `SectionType` enum + `section-type-labels.ts` + `getSectionGuidelines()` in `gemini.ts`
- **Build verification**: Run `npx tsc --noEmit` after schema changes; Prisma generates types automatically on save
