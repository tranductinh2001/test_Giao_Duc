# 📝 Lesson Plan Review Module

> **AI-powered lesson plan review system for Vietnamese teachers**

Complete documentation for the Lesson Plan Review feature - upload DOCX lesson plans, get AI feedback from Google Gemini, review annotations, and export with comments.

---

## 📋 Quick Links

1. **[Overview](./01-overview.md)** - Module introduction & capabilities
2. **[DOCX Parser](./02-docx-parser.md)** - Document parsing with Mammoth.js
3. **[Gemini Integration](./03-gemini-integration.md)** - AI review with Google Gemini
4. **[Review Interface](./04-review-interface.md)** - 3-panel review UI
5. **[Export System](./05-export-system.md)** - DOCX export with annotations
6. **[Section Rules Architecture](./06-section-rules-architecture.md)** - Per-section-type rule system
7. **[Admin Rules](./06-admin-rules.md)** - Rule management interface

---

## 🎯 What This Module Does

The Lesson Plan Review module allows teachers to:

1. **Upload** DOCX lesson plans (Vietnamese format)
2. **Parse** automatically into sections (Mục tiêu, Chuẩn bị, Tiến trình...)
3. **Review** with AI using Google Gemini 1.5 Pro
4. **Annotate** findings with severity levels (CRITICAL, ERROR, WARNING, INFO)
5. **Accept/Reject** suggestions interactively
6. **Export** to Word with inline annotations and appendix

---

## 🏗️ Architecture

```
User uploads DOCX
        ↓
Mammoth.js parses → Sections extracted (14 types)
        ↓
AI Section Detector classifies sections
        ↓
Section Rules matched per section type
        ↓
Gemini AI reviews each section → Annotations created
        ↓
3-panel interface → Accept/Reject workflow
        ↓
Export to DOCX with comments
```

---

## 📊 Features Status

| Feature | Status | Details |
|---------|--------|---------|
| DOCX Upload | ✅ Complete | Drag & drop, file validation |
| DOCX Parser | ✅ Complete | Mammoth.js, section detection |
| AI Review | ✅ Complete | Gemini 1.5 Pro, JSON output |
| Rule Management | ✅ Complete | Admin CRUD interface |
| Review Interface | ✅ Complete | 3-panel layout, filters |
| Annotation Workflow | ✅ Complete | Accept/reject, status tracking |
| DOCX Export | ✅ Complete | Inline markers + appendix |
| Response Caching | ✅ Complete | 7-day TTL |
| Audit Trail | ✅ Complete | ReviewHistory logging |

**Overall:** ✅ **95% Complete - Production Ready**

---

## 🚀 Quick Start

### 1. Setup Gemini API

```bash
# Get API key from https://aistudio.google.com/app/apikey
# Add to .env
GEMINI_API_KEY="your-api-key-here"
```

### 2. Seed Rules

```bash
psql $DATABASE_URL -f prisma/seed-rules.sql
```

Or use the admin UI at `/admin/section-rules` to define per-section-type rules.

### 3. Upload Lesson Plan

1. Go to `/lesson-plans/upload`
2. Upload DOCX file
3. Fill metadata (title, subject, grade)
4. Click "Upload"

### 4. Review with AI

1. Go to `/lesson-plans/[id]`
2. Click "Phân tích giáo án" (runs AI Section Detector — auto-detects all 14 section types)
3. Click "Review với AI"
4. Wait ~20 seconds

### 5. Review Annotations

1. Go to `/lesson-plans/[id]/review`
2. Browse annotations in 3-panel interface
3. Accept/reject suggestions
4. Export to DOCX

---

## 📁 File Structure

```
src/
├── app/
│   ├── lesson-plans/
│   │   ├── page.tsx                    # List page
│   │   ├── upload/page.tsx             # Upload page
│   │   └── [id]/
│   │       ├── page.tsx                # Detail page
│   │       └── editor/page.tsx         # Review/editor interface
│   │
│   ├── admin/
│   │   ├── section-rules/
│   │   │   └── page.tsx                # Section Rules CRUD (replaces circulars)
│   │   ├── review-rules/
│   │   │   ├── page.tsx                # Rule sets list
│   │   │   ├── new/page.tsx            # Create rule set
│   │   │   └── [setId]/page.tsx        # Rule editor
│   │   └── lesson-plans/
│   │       └── settings/page.tsx       # System settings
│   │
│   └── api/
│       ├── lesson-plans/
│       │   ├── upload/route.ts
│       │   └── [id]/
│       │       ├── parse/route.ts      # Parse + section detection
│       │       ├── review/route.ts     # AI review
│       │       ├── sections/route.ts   # Section update
│       │       └── annotations/
│       │           └── [annotationId]/
│       │               ├── accept/route.ts
│       │               └── reject/route.ts
│       └── admin/
│           ├── section-rules/route.ts  # Section Rules CRUD
│           └── review-rules/
│               └── sets/[setId]/route.ts
│
├── components/
│   └── lesson-plans/
│       └── EditSectionModal.tsx        # Section editor with version control
│
├── lib/
│   ├── section-detector.ts            # AI section detection (server-only)
│   ├── section-type-labels.ts          # Vietnamese labels (client-safe)
│   ├── docx-parser.ts                  # DOCX parsing
│   ├── gemini.ts                       # AI integration
│   └── export-docx.ts                  # DOCX generation
│
└── prisma/
    ├── schema.prisma                   # SectionRule + legacy models
    └── seed-rules.sql                  # Sample rules
```

---

## 🎓 User Flows

### Teacher Flow

```
1. Upload DOCX lesson plan
2. System parses into sections
3. Select review rule set
4. AI reviews and creates annotations
5. Review annotations (accept/reject)
6. Export to Word with comments
7. Apply approved changes
```

### Admin Flow

```
1. Go to /admin/section-rules
2. Define per-section-type rules with:
   - Title, requirements, priority, weight
   - Custom AI prompt
   - Correct/incorrect examples
3. Rules auto-apply during AI review for matching section types
```

---

## 💰 Cost Estimation

**Per lesson plan review:**
- 5 sections × ~2000 tokens = 10K tokens
- Input: $0.0003
- Output: $0.0006
- **Total: ~$0.001 per review**

**Monthly (100 users, 10 reviews each):**
- AI: 1000 reviews × $0.001 = $1
- Storage: 10 GB × $0.02 = $0.20
- **Total: ~$1.20/month**

Very affordable! 🎉

---

## 🧪 Testing

**Test DOCX structure:**

```
I. Thông tin bài học
Môn: Sinh học, Lớp: 10

II. Mục tiêu bài học
Kiến thức: Học sinh hiểu được...
Kỹ năng: Học sinh làm được...
Thái độ: Học sinh có thái độ...

III. Chuẩn bị
Giáo viên: Slide, video
Học sinh: SGK, vở

IV. Tiến trình dạy học
Hoạt động 1: Khởi động (5 phút)
Hoạt động 2: Hình thành kiến thức (25 phút)

V. Đánh giá
Đánh giá qua...
```

---

## 📚 Detailed Documentation

- **[01. Overview](./01-overview.md)** - Detailed feature overview
- **[02. DOCX Parser](./02-docx-parser.md)** - Parsing implementation
- **[03. Gemini Integration](./03-gemini-integration.md)** - AI integration
- **[04. Review Interface](./04-review-interface.md)** - UI components
- **[05. Export System](./05-export-system.md)** - DOCX generation
- **[06. Section Rules Architecture](./06-section-rules-architecture.md)** - Per-section-type rule system
- **[07. Admin Rules](./06-admin-rules.md)** - Rule management interface

---

## 🔗 Related Documentation

- [Database Schema](../../03-database/05-database-schema.md) - LessonPlan models
- [API Reference](../../04-api/01-api-overview.md) - API endpoints
- [Architecture](../../02-architecture/README.md) - System design

---

## 📦 Archive

Complete historical documentation available at:
`docs/.archive/lesson-plan-module/`

Including:
- Complete implementation summary
- Continuation guide
- Phase reports
- API specifications
- Backend/frontend details

---

**Module Status:** ✅ Production Ready  
**Last Updated:** 2026-06-27  
**Coverage:** 95% Complete
