# Workflow Refactor - Implementation Progress

**Project:** Education Platform - Lesson Plan Review System  
**Start Date:** 2026-06-28  
**Current Status:** Phase 2 Completed ✅

---

## 🎯 Overall Goal

Refactor workflow theo spec của user:
- Upload circular files (PDF/DOC/DOCX) với auto-parse
- Rule Engine system (database-driven)
- Section-by-section AI review với streaming
- Google Docs-style editor (3-panel)
- Cache mechanism
- Export DOCX/PDF
- Version history

**Critical Constraints:**
- ❌ KHÔNG viết lại từ đầu
- ❌ KHÔNG thay đổi kiến trúc hiện tại
- ❌ KHÔNG phá vỡ API và chức năng đang hoạt động
- ✅ CHỈ refactor những phần cần thiết
- ✅ Tái sử dụng tối đa code đã có

---

## ✅ Phase 1: Upload & Parse Công văn (COMPLETED)

**Status:** ✅ Done  
**Files:**
- `src/app/api/admin/circulars/upload/route.ts` - Upload API
- `src/app/admin/circulars/page.tsx` - UI with file upload mode
- `public/uploads/circulars/` - Storage directory
- `docs/PHASE1-UPLOAD-PARSE.md` - Full documentation

**Features:**
- ✅ Upload PDF/DOC/DOCX (max 10MB)
- ✅ Parse DOCX with mammoth
- ✅ Auto-detect sections (OBJECTIVES, PREPARATION, ACTIVITIES, ASSESSMENT)
- ✅ Auto-create CircularSectionRequirement
- ✅ Dual mode: Upload file OR manual input
- ✅ Build passed, no errors

**Limitations:**
- PDF parsing requires `pdf-parse` library (not installed yet)
- Section detection uses regex patterns (may need refinement)
- File stored in `/public` (production should use S3/Cloud Storage)

---

## ✅ Phase 2: Rule Engine - AI Prompt Customization (COMPLETED)

**Status:** ✅ Done  
**Files:**
- `prisma/schema.prisma` - Added `aiPrompt` field
- `src/app/admin/circulars/[id]/requirements/page.tsx` - UI with custom prompt field
- `src/app/api/admin/circulars/[id]/requirements/route.ts` - POST with aiPrompt
- `src/app/api/admin/circulars/[id]/requirements/[requirementId]/route.ts` - PATCH with aiPrompt
- `src/lib/gemini.ts` - Inject aiPrompt into review prompt
- `docs/PHASE2-RULE-ENGINE.md` - Full documentation

**Features:**
- ✅ `aiPrompt` field in CircularSectionRequirement model
- ✅ Migration applied successfully
- ✅ Admin UI: textarea with blue background, 🤖 icon
- ✅ API endpoints updated to accept/save aiPrompt
- ✅ AI integration: inject custom prompt if provided
- ✅ Backward compatible: works without aiPrompt
- ✅ Build passed (11.4s)

**How it works:**
```
Admin tạo requirement → nhập AI prompt tùy chỉnh → Lưu vào DB
↓
User click Review → Load requirement với aiPrompt → Inject vào Gemini prompt
↓
AI nhận được:
  - Requirements (general)
  - 🤖 HƯỚNG DẪN KIỂM TRA (specific)
  - ✓ VÍ DỤ ĐÚNG
  - ✗ VÍ DỤ SAI
↓
AI review theo hướng dẫn chi tiết → Trả về findings cụ thể
```

---

## 🚧 Phase 3: Streaming Review (NEXT)

**Status:** 🔄 Not started  
**Goal:** Review từng section tuần tự với realtime progress updates

**Planned approach:**
1. **API Route with Streaming:**
   - Change `/api/lesson-plans/[id]/review` to return `ReadableStream`
   - Use `TransformStream` to send progress events
   - Format: `data: {"type": "progress", "section": "OBJECTIVES", "status": "reviewing"}\n\n`

2. **Frontend:**
   - Replace fetch with EventSource or custom streaming fetch
   - Display progress: "Đang review phần Mục tiêu... 1/7"
   - Show each section result as it completes

3. **Backend Logic:**
   - Keep existing section-by-section loop
   - After each `reviewSection()` call → stream progress event
   - After each annotation creation → stream completion event

**Files to modify:**
- `src/app/api/lesson-plans/[id]/review/route.ts` - Add streaming
- `src/app/lesson-plans/[id]/page.tsx` - Handle streaming response
- NO breaking changes to existing flow

---

## 🔮 Phase 4: Google Docs Editor (PLANNED)

**Status:** 📝 Planned  
**Goal:** 3-panel layout with left sidebar, center editor, right AI panel

**Layout:**
```
┌────────────┬──────────────────┬────────────┐
│  Sections  │   Editor         │  AI Review │
│  (Left)    │   (Center)       │  (Right)   │
│            │                  │            │
│ □ Mục tiêu │ [Rich text...]   │ ⚠ Issues   │
│ □ Chuẩn bị │                  │ ✓ Strengths│
│ □ Hoạt động│                  │ 💡 Suggest │
│            │                  │            │
└────────────┴──────────────────┴────────────┘
```

**Approach:**
- Use existing TipTap editor (already in project)
- Add left sidebar with section navigation
- Add right sidebar with annotation display
- Highlight + scroll to position when clicking annotation

---

## 📦 Phase 5: Cache Mechanism (PARTIALLY DONE)

**Current Status:** ⚠️ Partial  
**Existing:**
- `src/lib/gemini.ts` has `checkCache()` and `cacheResult()` functions
- Uses MD5 hash of (prompt + sectionId + modelName)
- Cache stored in AIRequest/AIResponse models
- 7-day expiration

**Issue:**
- `cacheResult()` currently skipped due to AIRequest integration complexity
- Comment: `// TODO: Properly integrate with AIRequest/AIResponse flow`

**Next step:**
- Implement proper AIRequest creation before calling `reviewSection()`
- Link AIResponse to AIRequest
- Enable cache save

---

## 📄 Phase 6: Export DOCX/PDF (PLANNED)

**Status:** 📝 Planned  
**Libraries available:**
- `docx` - DOCX generation
- `jspdf` - PDF generation

**Approach:**
- Export API: `/api/lesson-plans/[id]/export?format=docx|pdf`
- Use existing section data + applied annotations
- Generate formatted document with changes highlighted
- Return download link

---

## 🕰️ Phase 7: Version History (EXISTING)

**Status:** ✅ Already exists  
**Tables:**
- `LessonPlanVersion` - stores each version
- `ReviewHistory` - tracks review actions
- `currentVersion` field in LessonPlan

**No changes needed - already functional**

---

## 📊 Architecture Check

**Database (Prisma):**
- ✅ CircularDocument
- ✅ CircularSectionRequirement (with aiPrompt)
- ✅ LessonPlan, LessonPlanSection
- ✅ ReviewRuleSet, ReviewRule
- ✅ ReviewResult, Annotation
- ✅ AIRequest, AIResponse (for cache)

**API Endpoints:**
- ✅ `/api/admin/circulars` - CRUD circulars
- ✅ `/api/admin/circulars/upload` - Upload & parse
- ✅ `/api/admin/circulars/[id]/requirements` - CRUD requirements
- ✅ `/api/lesson-plans/[id]/review` - Trigger review (needs streaming update)

**Frontend:**
- ✅ `/admin/circulars` - Manage circulars
- ✅ `/admin/circulars/[id]/requirements` - Configure requirements
- ✅ `/admin/lesson-plans/settings` - Settings hub
- 🚧 `/lesson-plans/[id]` - Needs 3-panel editor update

---

## 🎯 Next Immediate Steps

1. **Start Phase 3: Streaming Review**
   - Modify review route to support streaming
   - Add progress events
   - Test with frontend

2. **Complete Cache Mechanism (Phase 5)**
   - Fix AIRequest/AIResponse integration
   - Enable cache save

3. **Start Phase 4: Google Docs Editor**
   - Design 3-panel layout
   - Implement section navigation
   - Add annotation display

---

## ✅ Verified Working

- ✅ Build passes (no errors)
- ✅ Migration applied (aiPrompt field added)
- ✅ Upload API functional
- ✅ Admin UI for circulars and requirements
- ✅ AI review with custom prompts
- ✅ Existing APIs not broken

---

**Last Updated:** 2026-06-28  
**Next Phase:** Phase 3 - Streaming Review
