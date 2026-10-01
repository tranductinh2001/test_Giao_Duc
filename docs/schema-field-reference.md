# Schema Field Reference - Quick Guide

## ❌ Common Mistakes Fixed

### Annotation Model
```prisma
model Annotation {
  id              String
  reviewResultId  String           // ✅ Has this (links to ReviewResult)
  sectionId       String           // ✅ Has this
  ruleId          String?          // ✅ Has this (nullable)
  
  // ❌ Does NOT have:
  // lessonPlanId  - Must access via reviewResult.lessonPlanId
  // issue         - Field is called `message`
  // ruleCode      - Must access via rule.ruleCode
  // rejectionReason - Not in schema
  
  // ✅ Correct fields:
  message         String           // Not "issue"
  highlightedText String?          // Nullable
  severity        Severity
  status          AnnotationStatus
  resolvedBy      String?
  resolvedAt      DateTime?
  
  // Relations:
  reviewResult ReviewResult
  section      LessonPlanSection
  rule         ReviewRule?        // Nullable
  resolver     User?
}
```

**How to query:**
```typescript
// ❌ Wrong:
await prisma.annotation.findMany({
  where: { lessonPlanId: id }
})

// ✅ Correct:
await prisma.annotation.findMany({
  where: {
    reviewResult: {
      lessonPlanId: id
    }
  }
})

// Access ruleCode:
await prisma.annotation.findMany({
  include: {
    rule: {
      select: { ruleCode: true }
    }
  }
})
```

---

### ReviewRuleSet Model
```prisma
model ReviewRuleSet {
  id          String
  name        String
  code        String @unique    // ✅ Field is "code"
  
  // ❌ Does NOT have:
  // ruleSetCode - Field is called `code`
}
```

**How to query:**
```typescript
// ❌ Wrong:
select: { ruleSetCode: true }

// ✅ Correct:
select: { code: true }
```

---

### LessonPlanSection Model
```prisma
model LessonPlanSection {
  id           String
  sectionTitle String?        // ✅ Nullable
  sectionType  SectionType
  rawContent   String
}
```

**How to handle nullable:**
```typescript
// When interface expects string:
const sections = await prisma.lessonPlanSection.findMany({
  select: { sectionTitle: true }
})

// Map to convert null:
const mapped = sections.map(s => ({
  ...s,
  sectionTitle: s.sectionTitle || ""
}))
```

---

### ExportHistory Model
```prisma
model ExportHistory {
  id                  String
  lessonPlanId        String
  exportFormat        ExportFormat
  filePath            String
  fileSize            BigInt
  includeAnnotations  Boolean      // ✅ Direct field
  includeTrackChanges Boolean      // ✅ Direct field
  exportedBy          String
  
  // ❌ Does NOT have:
  // exportOptions - Options are separate fields
}
```

**How to create:**
```typescript
// ❌ Wrong:
await prisma.exportHistory.create({
  data: {
    exportOptions: {
      includeAnnotations: true
    }
  }
})

// ✅ Correct:
await prisma.exportHistory.create({
  data: {
    includeAnnotations: true,
    includeTrackChanges: false
  }
})
```

---

## 🔍 How to Check Schema

### Method 1: Grep Prisma Schema
```bash
# Find model definition
grep -A 20 "model Annotation" prisma/schema.prisma

# Find all fields
grep -E "^\s+\w+\s+" prisma/schema.prisma
```

### Method 2: Check Prisma Client Types
- TypeScript errors show exact type from Prisma Client
- Trust the error message - it shows actual schema

---

## ✅ Best Practices

1. **Always verify field names in schema first**
   - Don't assume field names
   - Check for nullable fields (`?`)
   - Check for relations vs direct fields

2. **Handle nullable fields properly**
   - Use `|| ""` for strings
   - Use `|| 0` for numbers
   - Or make interface fields optional

3. **Use nested where for relations**
   - If field not directly on model, access via relation
   - Example: `reviewResult.lessonPlanId` not `lessonPlanId`

4. **Include relations when needed**
   - Use `include` or nested `select` for related data
   - Example: `rule: { select: { ruleCode: true } }`

5. **Map query results to match interfaces**
   - Don't assume DB types match code interfaces
   - Always map nullable → non-null when required
   - Convert field names if different

---

## 📝 Files Modified in This Session

All fixed to match actual Prisma schema:
1. ✅ `src/app/lesson-plans/[id]/review/page.tsx`
2. ✅ `src/app/api/admin/review-rules/rules/[ruleId]/route.ts`
3. ✅ `src/app/api/lesson-plans/[id]/annotations/[annotationId]/accept/route.ts`
4. ✅ `src/app/api/lesson-plans/[id]/annotations/[annotationId]/reject/route.ts`
5. ✅ `src/app/api/lesson-plans/[id]/export/route.ts`

**Total Errors Fixed:** 10
**Build Attempts:** 10
**Status:** Final build running...
