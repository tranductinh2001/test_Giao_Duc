# DEPENDENCY ANALYSIS - Component & Import Graph

## Tiptap Dependencies

### Files Using Tiptap (6 files - ALL MUST BE REMOVED)
1. ✅ `src/components/lesson-plans/LessonPlanEditor.tsx` - Main editor wrapper
2. ✅ `src/components/lesson-plans/AnnotatedEditor.tsx` - Annotated editor
3. ✅ `src/components/lesson-plans/annotation-utils.ts` - Tiptap utilities
4. ✅ `src/lib/editor/commands/index.ts` - Tiptap commands
5. ✅ `src/lib/editor/schema/marks.ts` - Tiptap marks
6. ✅ `src/lib/editor/schema/nodes.ts` - Tiptap nodes

**Impact**: Removing these 6 files will eliminate all Tiptap usage.

---

## Component Import Graph

### Route → Component Dependencies

#### `/lesson-plans/[id]/word-review/` (BROKEN)
- ❌ Imports: `WordReviewWorkspace` (MISSING)
- 🔴 Status: BLOCKING BUILD
- ✅ Action: **DELETE ENTIRE ROUTE**

#### `/lesson-plans/[id]/new-editor/` (OLD)
- Imports: `EditorWorkspace`
- Status: Old experimental route
- ✅ Action: **DELETE ENTIRE ROUTE**

#### `/lesson-plans/[id]/review/` (CURRENT)
- Imports: `FullDocumentViewer`
- Status: Current review page, will be replaced
- ⚠️ Action: **KEEP FOR NOW** (remove in Phase 8)

#### `/lesson-plans/[id]/` (DETAIL PAGE - KEEP)
- Imports:
  - `ShareModal`
  - `EditLessonPlanModal`
  - `EditSectionModal`
  - `VersionHistoryModal`
  - `ModelSelectionModal`
- Status: Main detail page, modals are feature-specific
- ⚠️ Action: **KEEP PAGE**, analyze modals individually

---

## Component Dependency Tree

### Group 1: Tiptap Editor Components (REMOVE ALL)
```
LessonPlanEditor.tsx (Tiptap wrapper)
  └─ Uses: @tiptap/react, schema/nodes, schema/marks, commands/
  └─ Used by: EditorWorkspace.tsx

AnnotatedEditor.tsx (Tiptap with annotations)
  └─ Uses: @tiptap/react, annotation-utils.ts
  └─ Used by: (check needed)

annotation-utils.ts (Tiptap utilities)
  └─ Uses: @tiptap/core
  └─ Used by: AnnotatedEditor.tsx
```

### Group 2: Layout Components (REMOVE)
```
EditorWorkspace.tsx
  ├─ Uses: LessonPlanEditor.tsx, ReviewPanel.tsx
  └─ Used by: new-editor/page.tsx (OLD ROUTE)

ReviewPanel.tsx
  └─ Used by: EditorWorkspace.tsx
```

### Group 3: Viewer Components (KEEP TEMPORARILY)
```
FullDocumentViewer.tsx
  └─ Used by: review/page.tsx (current review page)
  └─ Status: Keep until Phase 8 (new editor ready)
```

### Group 4: Feature Modals (ANALYZE INDIVIDUALLY)
```
ShareModal.tsx - Share lesson plan with others
EditLessonPlanModal.tsx - Edit lesson plan metadata
EditSectionModal.tsx - Edit individual section
VersionHistoryModal.tsx - View version history
ModelSelectionModal.tsx - Select AI model
```

### Group 5: AI/Review Components (ANALYZE FOR REUSE)
```
AIAnalysisPanel.tsx
  └─ Pure UI component, may be reusable
  └─ Status: ANALYZE

EditorToolbar.tsx
  └─ Pure UI component, may be reusable
  └─ Status: ANALYZE

SectionEvaluationPanel.tsx
  └─ Section-specific UI
  └─ Status: LIKELY REMOVE (replaced by new design)

AnnotationSummaryDashboard.tsx
  └─ Stats UI
  └─ Status: LIKELY REMOVE (replaced by AIAnalysisPanel)
```

### Group 6: Old/Unused Components (REMOVE)
```
RichAnnotatedEditor.tsx - Old annotated editor
  └─ Status: REMOVE (obsolete)

VersionHistory.tsx
  └─ Status: CHECK if used, else REMOVE
```

---

## Removal Plan - Phase 1

### Step 1: Fix Broken Build (IMMEDIATE)
**Files to Delete**:
- ✅ `src/app/lesson-plans/[id]/word-review/page.tsx` - Broken route

**Verification**:
- Run `npm run build`
- Should pass after this removal

**Estimated Time**: 5 minutes

---

### Step 2: Remove Old Routes
**Files to Delete**:
- ✅ `src/app/lesson-plans/[id]/editor/page.tsx` - Old editor route
- ✅ `src/app/lesson-plans/[id]/new-editor/page.tsx` - Experimental route

**Verification**:
- Check no other files import from these routes
- Run `npm run build`

**Estimated Time**: 10 minutes

---

### Step 3: Remove Tiptap Core Files
**Files to Delete**:
- ✅ `src/lib/editor/schema/nodes.ts`
- ✅ `src/lib/editor/schema/marks.ts`
- ✅ `src/lib/editor/commands/index.ts`
- ✅ `src/lib/editor/schema/` (directory, if empty)

**Verification**:
- Grep for imports of these files
- Should only be used by components we're removing

**Estimated Time**: 10 minutes

---

### Step 4: Remove Tiptap Component Layer
**Files to Delete**:
- ✅ `src/components/lesson-plans/annotation-utils.ts`
- ✅ `src/components/lesson-plans/AnnotatedEditor.tsx`
- ✅ `src/components/lesson-plans/LessonPlanEditor.tsx`
- ✅ `src/components/lesson-plans/RichAnnotatedEditor.tsx`

**Verification**:
- Check for imports (should only be EditorWorkspace)
- Run build

**Estimated Time**: 15 minutes

---

### Step 5: Remove Layout Components
**Files to Delete**:
- ✅ `src/components/lesson-plans/EditorWorkspace.tsx`
- ✅ `src/components/lesson-plans/ReviewPanel.tsx`

**Verification**:
- Check imports (should be none after routes removed)
- Run build

**Estimated Time**: 10 minutes

---

### Step 6: Remove Old UI Components
**Files to Delete**:
- ✅ `src/components/lesson-plans/SectionEvaluationPanel.tsx`
- ✅ `src/components/lesson-plans/AnnotationSummaryDashboard.tsx`

**Check First (may be in use)**:
- `src/components/lesson-plans/VersionHistory.tsx`

**Verification**:
- Grep for imports
- Run build

**Estimated Time**: 15 minutes

---

### Step 7: Analyze Modals (MANUAL REVIEW NEEDED)

**Files to Check**:
1. `ShareModal.tsx`
   - Used by: detail page
   - Function: Share lesson plan
   - Decision: Keep or remove?

2. `EditLessonPlanModal.tsx`
   - Used by: detail page
   - Function: Edit metadata
   - Decision: Keep or remove?

3. `EditSectionModal.tsx`
   - Used by: detail page
   - Function: Edit section
   - Decision: Keep or remove?

4. `VersionHistoryModal.tsx`
   - Used by: detail page
   - Function: View versions
   - Decision: Keep or remove?

5. `ModelSelectionModal.tsx`
   - Used by: detail page
   - Function: Select AI model
   - Decision: Keep or refactor?

**Action Required**: Manual review of detail page to determine which modals are still needed.

**Estimated Time**: 30 minutes

---

### Step 8: Analyze Reusable Components

**Files to Evaluate**:
1. `AIAnalysisPanel.tsx`
   - 193 lines, pure UI component
   - Props: `overallScore`, `sections`, `issues`, `analyzing`
   - Dependencies: lucide-react, severity-labels
   - Decision: **LIKELY KEEP** - good design, reusable

2. `EditorToolbar.tsx`
   - 113 lines, pure UI component
   - Props: toolbar actions (onAnalyze, onSave, etc.)
   - Dependencies: button, lucide-react
   - Decision: **LIKELY KEEP** - generic toolbar, reusable

**Action**: Deep dive analysis in separate step

**Estimated Time**: 45 minutes

---

### Step 9: Remove Tiptap Dependencies
**Package.json Changes**:
- ❌ `"@tiptap/react": "^3.27.1"`
- ❌ `"@tiptap/starter-kit": "^3.27.1"`
- ❌ `"@tiptap/extension-color": "^3.27.1"`
- ❌ `"@tiptap/extension-highlight": "^3.27.1"`
- ❌ `"@tiptap/extension-text-style": "^3.27.1"`

**Commands**:
```bash
npm uninstall @tiptap/react @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-highlight @tiptap/extension-text-style
npm install
```

**Verification**:
- Check package.json
- Check package-lock.json
- Run build

**Estimated Time**: 5 minutes

---

### Step 10: Clean Up Imports
**Action**: Scan entire codebase for any remaining imports of removed files

**Commands**:
```bash
# Search for imports
grep -r "from.*lesson-plans/LessonPlanEditor" src/
grep -r "from.*lesson-plans/EditorWorkspace" src/
grep -r "@tiptap" src/
```

**Estimated Time**: 15 minutes

---

### Step 11: Final Verification
**Checklist**:
- [ ] `npm run build` - Success
- [ ] `npm run lint` - No errors
- [ ] No TypeScript errors
- [ ] No @tiptap imports remaining
- [ ] No imports of deleted files
- [ ] Application starts (`npm run dev`)
- [ ] Can navigate to lesson plans list
- [ ] Can view lesson plan detail page
- [ ] Can upload new lesson plan

**Estimated Time**: 20 minutes

---

## Total Estimated Time for Phase 1
- **Minimum**: 2.5 hours (if everything goes smoothly)
- **Maximum**: 4 hours (if issues found)
- **Recommended**: Work in 30-minute focused sessions

---

## Risk Assessment

### Low Risk (Safe to Remove)
- ✅ Broken word-review route (already not working)
- ✅ Old editor/new-editor routes (unused)
- ✅ Tiptap schema files (only used by removed components)
- ✅ Tiptap component files (isolated)

### Medium Risk (Check First)
- ⚠️ VersionHistory.tsx (may be used elsewhere)
- ⚠️ Modals (used by detail page, need individual review)

### High Risk (Keep Until Later)
- 🔴 FullDocumentViewer.tsx (current review page depends on it)
- 🔴 review/page.tsx (current review route, keep until replacement ready)

---

## Success Criteria for Phase 1

After Phase 1 completion:
- ✅ Build passes without errors
- ✅ No Tiptap dependencies in package.json
- ✅ No @tiptap imports in codebase
- ✅ Application runs and basic navigation works
- ✅ 10-15 files deleted
- ✅ 5 npm packages removed
- ✅ Codebase ready for new architecture

---

**Analysis Complete**: 2026-07-01  
**Ready to Proceed**: Phase 1 - Cleanup
