# PROJECT ROADMAP - Lesson Plan Editor Refactoring

## Project Vision
Replace the existing Tiptap-based editor with a modern, AI-first, modular editor architecture specifically designed for reviewing educational lesson plans.

---

## Timeline Overview
- **Total Duration**: 8-12 weeks (estimated)
- **Current Phase**: Phase 0 - Analysis & Planning
- **Start Date**: 2026-07-01
- **Target Completion**: 2026-09-01

---

## PHASE 0: ANALYSIS & PLANNING
**Duration**: 2-3 days  
**Status**: 🔄 IN PROGRESS (0%)  
**Dependencies**: None

### Milestones

#### ✅ Milestone 0.0: AI Memory Setup
- [x] Create `.ai/` directory structure
- [x] Initialize AGENT_STATE.md
- [x] Initialize ARCHITECTURE.md
- [ ] Initialize ROADMAP.md (this file)
- [ ] Initialize DECISIONS.md
- [ ] Initialize CHANGELOG.md

#### 🔄 Milestone 0.1: Code Analysis
**Status**: IN PROGRESS (30%)
- [x] Count and list all editor components (17 components)
- [x] Identify Tiptap dependencies (5 packages)
- [x] Map current data flow
- [x] Document current architecture
- [ ] Analyze component dependencies (import graph)
- [ ] Identify reusable components
- [ ] Identify dead code
- [ ] Create removal checklist

#### ⏳ Milestone 0.2: Architecture Design
**Status**: PENDING
- [ ] Design new document model structure
- [ ] Design command pattern API
- [ ] Design review engine architecture
- [ ] Design import/export adapters
- [ ] Design UI component hierarchy
- [ ] Document all interfaces
- [ ] Create UML diagrams
- [ ] Review with stakeholders

#### ⏳ Milestone 0.3: Implementation Plan
**Status**: PENDING
- [ ] Break down into small tasks
- [ ] Estimate effort for each task
- [ ] Define acceptance criteria
- [ ] Create test plan
- [ ] Identify risks
- [ ] Plan rollback strategy

---

## PHASE 1: CLEANUP & PREPARATION
**Duration**: 3-5 days  
**Status**: ⏳ PLANNED (0%)  
**Dependencies**: Phase 0 complete

### Milestones

#### ⏳ Milestone 1.1: Fix Broken Build
**Priority**: 🔴 CRITICAL  
**Status**: PENDING
- [ ] Remove broken `word-review` route
- [ ] Remove reference to missing WordReviewWorkspace
- [ ] Verify build passes
- [ ] Run type check
- [ ] Run lint

#### ⏳ Milestone 1.2: Remove Tiptap Dependencies
**Status**: PENDING
- [ ] Remove `@tiptap/react`
- [ ] Remove `@tiptap/starter-kit`
- [ ] Remove `@tiptap/extension-color`
- [ ] Remove `@tiptap/extension-highlight`
- [ ] Remove `@tiptap/extension-text-style`
- [ ] Run `npm install`
- [ ] Verify no broken imports

#### ⏳ Milestone 1.3: Remove Old Editor Components (Batch 1)
**Files to Remove**:
- [ ] LessonPlanEditor.tsx
- [ ] AnnotatedEditor.tsx
- [ ] RichAnnotatedEditor.tsx
- [ ] EditorWorkspace.tsx
- [ ] ReviewPanel.tsx
- [ ] Verify build after each removal

#### ⏳ Milestone 1.4: Remove Old Editor Components (Batch 2)
**Files to Remove**:
- [ ] FullDocumentViewer.tsx
- [ ] SectionEvaluationPanel.tsx
- [ ] AnnotationSummaryDashboard.tsx
- [ ] ShareModal.tsx
- [ ] EditLessonPlanModal.tsx
- [ ] EditSectionModal.tsx
- [ ] VersionHistoryModal.tsx
- [ ] ModelSelectionModal.tsx

#### ⏳ Milestone 1.5: Remove Old Editor Core
**Files to Remove**:
- [ ] src/lib/editor/schema/nodes.ts
- [ ] src/lib/editor/schema/marks.ts
- [ ] src/lib/editor/commands/index.ts
- [ ] src/lib/editor/ (if empty)

#### ⏳ Milestone 1.6: Remove Old Routes
**Routes to Remove**:
- [ ] src/app/lesson-plans/[id]/editor/page.tsx
- [ ] src/app/lesson-plans/[id]/new-editor/page.tsx
- [ ] src/app/lesson-plans/[id]/word-review/page.tsx

#### ⏳ Milestone 1.7: Clean Up & Verify
- [ ] Remove unused imports across project
- [ ] Run `npm run build` - verify success
- [ ] Run `npm run lint` - verify no errors
- [ ] Test application manually
- [ ] Verify lesson plan list still works
- [ ] Verify upload still works
- [ ] Verify parse still works

---

## PHASE 2: NEW DOCUMENT MODEL
**Duration**: 5-7 days  
**Status**: ⏳ PLANNED (0%)  
**Dependencies**: Phase 1 complete

### Milestones

#### ⏳ Milestone 2.1: Core Document Model
**Location**: `src/core/document/`
- [ ] Create DocumentNode interface
- [ ] Create Section, Paragraph, Text node types
- [ ] Create Heading, List, Table node types
- [ ] Create node factory functions
- [ ] Create node validation logic
- [ ] Write unit tests (90% coverage)

#### ⏳ Milestone 2.2: Document Tree
**Location**: `src/core/document/`
- [ ] Create DocumentTree class
- [ ] Implement tree traversal (DFS, BFS)
- [ ] Implement node query methods
- [ ] Implement node manipulation methods
- [ ] Implement tree serialization/deserialization
- [ ] Write unit tests

#### ⏳ Milestone 2.3: Selection & Range
**Location**: `src/core/selection/`
- [ ] Create Selection interface
- [ ] Create Range interface
- [ ] Implement selection validation
- [ ] Implement range operations (union, intersection)
- [ ] Implement cursor positioning
- [ ] Write unit tests

#### ⏳ Milestone 2.4: Document State Manager
**Location**: `src/core/document/`
- [ ] Create DocumentState class
- [ ] Implement state immutability
- [ ] Implement state snapshots
- [ ] Implement state comparison
- [ ] Write unit tests

---

## PHASE 3: COMMAND LAYER
**Duration**: 4-6 days  
**Status**: ⏳ PLANNED (0%)  
**Dependencies**: Phase 2 complete

### Milestones

#### ⏳ Milestone 3.1: Command Pattern Foundation
**Location**: `src/core/commands/`
- [ ] Create Command interface
- [ ] Create CommandResult type
- [ ] Create CommandContext interface
- [ ] Implement base command executor
- [ ] Write unit tests

#### ⏳ Milestone 3.2: Basic Commands
**Location**: `src/core/commands/`
- [ ] InsertTextCommand
- [ ] DeleteTextCommand
- [ ] InsertNodeCommand
- [ ] DeleteNodeCommand
- [ ] UpdateNodeCommand
- [ ] Write unit tests for each

#### ⏳ Milestone 3.3: Advanced Commands
**Location**: `src/core/commands/`
- [ ] SplitParagraphCommand
- [ ] MergeParagraphCommand
- [ ] IndentCommand
- [ ] OutdentCommand
- [ ] WrapInListCommand
- [ ] Write unit tests

#### ⏳ Milestone 3.4: History System
**Location**: `src/core/history/`
- [ ] Create HistoryStack class
- [ ] Implement undo/redo
- [ ] Implement command batching
- [ ] Implement history limits
- [ ] Write unit tests

---

## PHASE 4: REVIEW ENGINE
**Duration**: 5-7 days  
**Status**: ⏳ PLANNED (0%)  
**Dependencies**: Phase 3 complete

### Milestones

#### ⏳ Milestone 4.1: Annotation Model
**Location**: `src/core/review/`
- [ ] Create Annotation interface
- [ ] Create Comment, Suggestion, Issue types
- [ ] Create severity levels
- [ ] Create status types
- [ ] Write unit tests

#### ⏳ Milestone 4.2: Annotation Manager
**Location**: `src/core/review/`
- [ ] Create AnnotationRegistry class
- [ ] Implement add/remove/update annotations
- [ ] Implement annotation queries
- [ ] Implement annotation-to-node mapping
- [ ] Write unit tests

#### ⏳ Milestone 4.3: Review Commands
**Location**: `src/core/commands/review/`
- [ ] AddAnnotationCommand
- [ ] RemoveAnnotationCommand
- [ ] AcceptSuggestionCommand
- [ ] RejectSuggestionCommand
- [ ] ResolveIssueCommand
- [ ] Write unit tests

#### ⏳ Milestone 4.4: AI Integration Layer
**Location**: `src/core/ai/`
- [ ] Create AIProvider interface
- [ ] Create BeeknoeeProvider implementation
- [ ] Create AI command dispatcher
- [ ] Implement AI → Annotation conversion
- [ ] Write unit tests

---

## PHASE 5: IMPORT/EXPORT ADAPTERS
**Duration**: 4-5 days  
**Status**: ⏳ PLANNED (0%)  
**Dependencies**: Phase 2 complete (can run parallel to Phase 3-4)

### Milestones

#### ⏳ Milestone 5.1: Import Adapter Interface
**Location**: `src/adapters/import/`
- [ ] Create ImportAdapter interface
- [ ] Create ImportResult type
- [ ] Create error handling
- [ ] Write adapter tests framework

#### ⏳ Milestone 5.2: DOCX Import Adapter
**Location**: `src/adapters/import/`
- [ ] Implement DocxImportAdapter
- [ ] Convert DOCX → DocumentTree
- [ ] Handle sections, paragraphs, lists
- [ ] Handle tables, images
- [ ] Preserve formatting metadata
- [ ] Write unit tests

#### ⏳ Milestone 5.3: Export Adapter Interface
**Location**: `src/adapters/export/`
- [ ] Create ExportAdapter interface
- [ ] Create ExportOptions type
- [ ] Write adapter tests framework

#### ⏳ Milestone 5.4: DOCX Export Adapter
**Location**: `src/adapters/export/`
- [ ] Implement DocxExportAdapter
- [ ] Convert DocumentTree → DOCX
- [ ] Include annotations as comments
- [ ] Include track changes
- [ ] Write unit tests

#### ⏳ Milestone 5.5: HTML Export Adapter
**Location**: `src/adapters/export/`
- [ ] Implement HtmlExportAdapter
- [ ] Convert DocumentTree → HTML
- [ ] Apply CSS styling
- [ ] Include annotations as highlights
- [ ] Write unit tests

---

## PHASE 6: UI COMPONENTS
**Duration**: 6-8 days  
**Status**: ⏳ PLANNED (0%)  
**Dependencies**: Phase 2 complete

### Milestones

#### ⏳ Milestone 6.1: Document Renderer
**Location**: `src/features/editor/components/`
- [ ] Create DocumentRenderer component
- [ ] Render document tree recursively
- [ ] Render sections, paragraphs, text
- [ ] Apply styling
- [ ] Optimize rendering (React.memo)
- [ ] Write component tests

#### ⏳ Milestone 6.2: Annotation Renderer
**Location**: `src/features/editor/components/`
- [ ] Create AnnotationHighlight component
- [ ] Create AnnotationPopover component
- [ ] Apply severity colors
- [ ] Handle click events
- [ ] Write component tests

#### ⏳ Milestone 6.3: Editor Toolbar
**Location**: `src/features/editor/components/`
- [ ] Create EditorToolbar component
- [ ] Add Save, Undo, Redo buttons
- [ ] Add Review, Export buttons
- [ ] Add keyboard shortcuts
- [ ] Write component tests

#### ⏳ Milestone 6.4: Review Panel
**Location**: `src/features/review/components/`
- [ ] Create ReviewSidebar component
- [ ] Display annotation list
- [ ] Filter by severity/status
- [ ] Navigate to annotations
- [ ] Accept/Reject actions
- [ ] Write component tests

#### ⏳ Milestone 6.5: AI Analysis Panel
**Location**: `src/features/ai/components/`
- [ ] Create AIAnalysisPanel component
- [ ] Display overall score
- [ ] Display issue counts
- [ ] Display progress (streaming)
- [ ] Write component tests

---

## PHASE 7: EDITOR CONTROLLER
**Duration**: 4-5 days  
**Status**: ⏳ PLANNED (0%)  
**Dependencies**: Phase 2, 3, 6 complete

### Milestones

#### ⏳ Milestone 7.1: Editor Core
**Location**: `src/features/editor/core/`
- [ ] Create EditorController class
- [ ] Initialize document state
- [ ] Initialize command executor
- [ ] Initialize history system
- [ ] Wire up UI event handlers

#### ⏳ Milestone 7.2: React Integration
**Location**: `src/features/editor/hooks/`
- [ ] Create useEditor hook
- [ ] Create useDocumentState hook
- [ ] Create useAnnotations hook
- [ ] Create useSelection hook
- [ ] Write hook tests

#### ⏳ Milestone 7.3: Editor Context
**Location**: `src/features/editor/context/`
- [ ] Create EditorContext
- [ ] Provide editor instance
- [ ] Provide command dispatcher
- [ ] Handle cleanup

---

## PHASE 8: API INTEGRATION
**Duration**: 3-4 days  
**Status**: ⏳ PLANNED (0%)  
**Dependencies**: Phase 7 complete

### Milestones

#### ⏳ Milestone 8.1: Update Parse API
**Location**: `src/app/api/lesson-plans/[id]/parse/`
- [ ] Use new DOCX import adapter
- [ ] Save to DocumentTree format
- [ ] Update database schema if needed
- [ ] Test end-to-end

#### ⏳ Milestone 8.2: Update Review API
**Location**: `src/app/api/lesson-plans/[id]/review-stream/`
- [ ] Use new annotation model
- [ ] Stream annotations properly
- [ ] Update response format
- [ ] Test streaming

#### ⏳ Milestone 8.3: Update Export API
**Location**: `src/app/api/lesson-plans/[id]/export/`
- [ ] Use new DOCX export adapter
- [ ] Include annotations as comments
- [ ] Test export quality

#### ⏳ Milestone 8.4: Create New Editor Route
**Location**: `src/app/lesson-plans/[id]/editor/`
- [ ] Create new editor page
- [ ] Use EditorController
- [ ] Wire up all components
- [ ] Test full workflow

---

## PHASE 9: TESTING & POLISH
**Duration**: 5-7 days  
**Status**: ⏳ PLANNED (0%)  
**Dependencies**: Phase 8 complete

### Milestones

#### ⏳ Milestone 9.1: Unit Tests
- [ ] Achieve 90% coverage on core/
- [ ] Achieve 80% coverage on features/
- [ ] Fix all failing tests

#### ⏳ Milestone 9.2: Integration Tests
- [ ] Upload → Parse → Edit workflow
- [ ] Parse → Review → Accept/Reject workflow
- [ ] Edit → Export workflow

#### ⏳ Milestone 9.3: Performance Optimization
- [ ] Profile render performance
- [ ] Optimize large document rendering
- [ ] Implement virtualization if needed
- [ ] Optimize command execution

#### ⏳ Milestone 9.4: Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] ARIA labels
- [ ] Focus management

#### ⏳ Milestone 9.5: UI Polish
- [ ] Responsive design
- [ ] Loading states
- [ ] Error states
- [ ] Animations
- [ ] Dark mode support

---

## PHASE 10: DEPLOYMENT
**Duration**: 2-3 days  
**Status**: ⏳ PLANNED (0%)  
**Dependencies**: Phase 9 complete

### Milestones

#### ⏳ Milestone 10.1: Production Build
- [ ] Run production build
- [ ] Fix build warnings
- [ ] Optimize bundle size
- [ ] Test production build locally

#### ⏳ Milestone 10.2: Database Migration
- [ ] Create migration scripts (if schema changed)
- [ ] Test migration on staging
- [ ] Backup production data
- [ ] Run migration on production

#### ⏳ Milestone 10.3: Deploy to Production
- [ ] Deploy to staging
- [ ] QA testing on staging
- [ ] Deploy to production
- [ ] Monitor logs
- [ ] Smoke test production

#### ⏳ Milestone 10.4: Documentation
- [ ] Update README
- [ ] Write user guide
- [ ] Document architecture
- [ ] Document API changes

---

## RISK MANAGEMENT

### High Risk Items
1. **Performance with large documents** (500+ paragraphs)
   - Mitigation: Virtualization, lazy loading
   
2. **Data migration** from old format to new
   - Mitigation: Write migration script, test thoroughly
   
3. **Breaking changes** to existing workflows
   - Mitigation: Feature flag, gradual rollout

### Contingency Plans
- If performance issues: Implement virtualization early
- If timeline slips: Cut nice-to-have features
- If bugs discovered: Rollback to previous version

---

## SUCCESS CRITERIA

### Must Have (MVP)
- [ ] Upload DOCX
- [ ] Parse to new document model
- [ ] Edit document (basic editing)
- [ ] AI review with annotations
- [ ] Accept/Reject annotations
- [ ] Export DOCX with comments

### Should Have
- [ ] Undo/Redo
- [ ] Keyboard shortcuts
- [ ] Real-time collaboration prep
- [ ] Version history

### Nice to Have
- [ ] Auto-save
- [ ] Offline mode
- [ ] Mobile responsive
- [ ] Export to PDF

---

## PROGRESS TRACKING

### Overall Progress: 0%
- Phase 0: 30% (in progress)
- Phase 1: 0%
- Phase 2: 0%
- Phase 3: 0%
- Phase 4: 0%
- Phase 5: 0%
- Phase 6: 0%
- Phase 7: 0%
- Phase 8: 0%
- Phase 9: 0%
- Phase 10: 0%

---

**Last Updated**: 2026-07-01  
**Next Review**: After Phase 0 completion
