# 🚀 Section Hierarchy Implementation - IN PROGRESS

**Date**: 2026-07-02
**Feature**: Support for nested/hierarchical sections (Parent-Child structure)

---

## 🎯 OBJECTIVE

Enable templates to define hierarchical section structures:

```
I. Mục tiêu (Parent - Level 1)
   1. Kiến thức (Child - Level 2)
   2. Năng lực (Child - Level 2)
   3. Phẩm chất (Child - Level 2)

II. Hoạt động dạy học (Parent - Level 1)
   A. Khởi động (Child - Level 2)
      a) Trò chơi (Grandchild - Level 3)
      b) Câu hỏi (Grandchild - Level 3)
   B. Hình thành kiến thức (Child - Level 2)
```

---

## ✅ COMPLETED

### 1. Database Schema ✅
**File**: `prisma/schema.prisma`

**Added fields to `rule_template_sections`**:
```prisma
parentId  String?  // NULL = root section, value = child of parentId
level     Int      @default(1)  // Depth level (1, 2, 3...)

parent    rule_template_sections?  @relation("SectionHierarchy")
children  rule_template_sections[] @relation("SectionHierarchy")

@@index([parentId])
```

**Self-referencing relation** for tree structure.

### 2. Migration Status ⏳
**Running**: `npx prisma migrate dev --name add_section_hierarchy`

---

## 🔄 IN PROGRESS

### 3. Frontend - Tree View UI (Next)
**File**: `src/app/admin/templates/[id]/page.tsx`

**Features**:
- Tree component with indent visualization
- Drag & drop reordering
- Add child button per section
- Indent/Outdent actions
- Visual level indicators

### 4. API Updates (Next)
**Endpoints to update**:
- `POST /api/admin/templates/[id]/sections` - Accept `parentId`
- `PUT /api/admin/templates/[id]/sections/[sectionId]` - Move section
- `GET /api/admin/templates/[id]/sections` - Return tree structure

### 5. Parser Enhancement (Next)
**Context-aware detection**:
- Indentation detection (spaces/tabs)
- Heading level hierarchy (H1 → H2 → H3)
- Numbering pattern hierarchy (I. → 1. → a) → •)
- Parent context tracking

---

## 📊 TECHNICAL DESIGN

### Numbering Hierarchy
```
Level 1: I., II., III., IV...     (Roman numerals)
Level 2: 1., 2., 3., 4...         (Arabic numerals)
Level 3: A., B., C., D...         (Uppercase letters)
Level 4: a), b), c), d)...        (Lowercase letters)
Level 5: •, -, *                  (Bullets)
```

### Indentation Detection
```
Section 1 (0 spaces)              → Level 1
    Section 1.1 (4 spaces)        → Level 2
        Section 1.1.1 (8 spaces)  → Level 3
```

### Heading Level
```markdown
# Section (H1)     → Level 1
## Subsection (H2) → Level 2
### Detail (H3)    → Level 3
```

---

## 🎨 UI MOCKUP

```
Template: Công văn 5512

Sections:
├─ [1] Mục tiêu [Edit] [Delete] [+ Add Child]
│  ├─ [1.1] Kiến thức [Edit] [Delete] [↑] [↓]
│  ├─ [1.2] Năng lực [Edit] [Delete] [↑] [↓]
│  └─ [1.3] Phẩm chất [Edit] [Delete] [↑] [↓]
├─ [2] Thiết bị dạy học [Edit] [Delete] [+ Add Child]
└─ [3] Tiến trình dạy học [Edit] [Delete] [+ Add Child]
   ├─ [3.1] Khởi động [Edit] [Delete] [+ Add Child]
   │  ├─ [3.1.1] Trò chơi [Edit] [Delete]
   │  └─ [3.1.2] Câu hỏi [Edit] [Delete]
   └─ [3.2] Hình thành kiến thức [Edit] [Delete]
```

---

## 🧪 USE CASES

### Use Case 1: Add Root Section
```
Admin → Template → Click "Add Section"
→ Form: Name, Order
→ parentId = NULL, level = 1
→ Creates root section
```

### Use Case 2: Add Child Section
```
Admin → Click [+ Add Child] on "Mục tiêu"
→ Form: Name (order auto-calculated)
→ parentId = "muc-tieu-id", level = 2
→ Creates child under "Mục tiêu"
```

### Use Case 3: Parser Detection
```
Document content:
I. Mục tiêu
   1. Kiến thức
      Học sinh nắm được...
   2. Năng lực
      Phát triển tư duy...

Parser:
→ Detects "I. Mục tiêu" (Level 1)
→ Detects "1. Kiến thức" (Level 2, parent = Mục tiêu)
→ Content under "1. Kiến thức" until "2. Năng lực"
→ Detects "2. Năng lực" (Level 2, parent = Mục tiêu)
```

---

## ⏭️ NEXT STEPS

1. **Confirm migration success** ✅
2. **Generate Prisma client** 
3. **Update Section API** - Accept parentId/level
4. **Build Tree UI component** - react-dnd or native
5. **Add visual hierarchy** - Indents, lines, badges
6. **Test CRUD operations** - Add/edit/delete with children
7. **Implement Parser** - Context-aware detection
8. **Test with real documents** - Multi-level structures

---

**Status**: 🔄 Migration running, UI implementation next!

**ETA**: 4-5 hours for complete implementation
