# Lesson Plan Review - Frontend Architecture

## Overview

The frontend is built with React, TypeScript, and TailwindCSS, following the existing design system. It provides a rich document editor experience similar to Google Docs Review mode.

---

## Technology Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS (existing design system)
- **Rich Text Editor**: TipTap (recommended) or Lexical
- **State Management**: React Context + Hooks
- **HTTP Client**: fetch API with custom hooks
- **Real-time**: WebSocket (future) for live review progress
- **File Upload**: Dropzone

---

## Directory Structure

```
frontend/
├── components/
│   ├── editor/
│   │   ├── LessonPlanEditor.tsx
│   │   ├── EditorToolbar.tsx
│   │   ├── SectionNavigator.tsx
│   │   └── ContentEditor.tsx
│   ├── review/
│   │   ├── ReviewPanel.tsx
│   │   ├── AnnotationList.tsx
│   │   ├── AnnotationCard.tsx
│   │   ├── ReviewSummary.tsx
│   │   └── IssueFilter.tsx
│   ├── upload/
│   │   ├── FileUploader.tsx
│   │   └── UploadProgress.tsx
│   ├── admin/
│   │   ├── RuleSetManager.tsx
│   │   ├── RuleEditor.tsx
│   │   └── RuleList.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── ConfirmDialog.tsx
├── hooks/
│   ├── useLessonPlan.ts
│   ├── useReview.ts
│   ├── useAnnotations.ts
│   ├── useExport.ts
│   └── useReviewRules.ts
├── contexts/
│   ├── EditorContext.tsx
│   ├── ReviewContext.tsx
│   └── AnnotationContext.tsx
├── services/
│   ├── lessonPlanService.ts
│   ├── reviewService.ts
│   ├── annotationService.ts
│   ├── exportService.ts
│   └── adminService.ts
├── types/
│   ├── lessonPlan.ts
│   ├── review.ts
│   ├── annotation.ts
│   └── rule.ts
├── utils/
│   ├── annotationHelper.ts
│   ├── documentParser.ts
│   └── positionCalculator.ts
└── pages/
    ├── LessonPlanListPage.tsx
    ├── LessonPlanUploadPage.tsx
    ├── LessonPlanReviewPage.tsx
    ├── ExportPage.tsx
    └── admin/
        ├── RuleSetListPage.tsx
        └── RuleEditorPage.tsx
```

---

## Core Components

### 1. LessonPlanReviewPage (Main Layout)

Three-panel layout:

```tsx
<div className="flex h-screen bg-background">
  {/* Left Panel: Section Navigator */}
  <aside className="w-64 border-r border-border overflow-y-auto">
    <SectionNavigator 
      sections={sections}
      activeSection={activeSection}
      onSectionClick={setActiveSection}
    />
  </aside>

  {/* Center Panel: Content Editor */}
  <main className="flex-1 overflow-y-auto">
    <EditorToolbar />
    <ContentEditor 
      content={currentContent}
      annotations={visibleAnnotations}
      onContentChange={handleContentChange}
      onAnnotationClick={handleAnnotationClick}
    />
  </main>

  {/* Right Panel: AI Review Panel */}
  <aside className="w-96 border-l border-border overflow-y-auto">
    <ReviewPanel 
      reviewResult={reviewResult}
      selectedAnnotation={selectedAnnotation}
      onAccept={handleAcceptAnnotation}
      onReject={handleRejectAnnotation}
      onApply={handleApplySuggestion}
    />
  </aside>
</div>
```

### 2. SectionNavigator

```tsx
interface Section {
  id: string;
  type: string;
  title: string;
  order: number;
  annotationCount: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
}

export function SectionNavigator({ 
  sections, 
  activeSection, 
  onSectionClick 
}: Props) {
  return (
    <nav className="p-4">
      <h2 className="text-lg font-semibold mb-4">Cấu trúc giáo án</h2>
      {sections.map(section => (
        <button
          key={section.id}
          onClick={() => onSectionClick(section.id)}
          className={cn(
            "w-full text-left p-3 rounded-lg mb-2 transition-colors",
            activeSection === section.id 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-accent"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{section.title}</span>
            {section.annotationCount > 0 && (
              <div className="flex gap-1">
                {section.criticalCount > 0 && (
                  <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                    {section.criticalCount}
                  </span>
                )}
                {section.errorCount > 0 && (
                  <span className="text-xs bg-destructive/80 text-destructive-foreground px-2 py-0.5 rounded">
                    {section.errorCount}
                  </span>
                )}
                {section.warningCount > 0 && (
                  <span className="text-xs bg-warning text-warning-foreground px-2 py-0.5 rounded">
                    {section.warningCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </button>
      ))}
    </nav>
  );
}
```

### 3. ContentEditor (TipTap Integration)

```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Highlight } from '@tiptap/extension-highlight';

export function ContentEditor({ 
  content, 
  annotations, 
  onContentChange,
  onAnnotationClick 
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
      // Custom extension for annotations
      AnnotationExtension.configure({
        annotations,
        onAnnotationClick,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
  });

  // Apply annotation highlights
  useEffect(() => {
    if (!editor) return;
    
    annotations.forEach(annotation => {
      const { startPosition, endPosition } = annotation.position;
      const color = getSeverityColor(annotation.severity);
      
      editor
        .chain()
        .focus()
        .setTextSelection({ from: startPosition, to: endPosition })
        .setHighlight({ color })
        .run();
    });
  }, [annotations, editor]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <EditorContent editor={editor} className="prose prose-slate max-w-none" />
    </div>
  );
}
```

### 4. ReviewPanel

```tsx
export function ReviewPanel({ 
  reviewResult, 
  selectedAnnotation,
  onAccept,
  onReject,
  onApply 
}: Props) {
  const [filter, setFilter] = useState<AnnotationFilter>({
    severity: null,
    status: 'PENDING',
  });

  return (
    <div className="flex flex-col h-full">
      {/* Review Summary */}
      <div className="p-4 border-b border-border">
        <ReviewSummary result={reviewResult} />
      </div>

      {/* Filter Controls */}
      <div className="p-4 border-b border-border">
        <IssueFilter filter={filter} onFilterChange={setFilter} />
      </div>

      {/* Annotation List */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedAnnotation ? (
          <AnnotationDetail
            annotation={selectedAnnotation}
            onAccept={() => onAccept(selectedAnnotation.id)}
            onReject={() => onReject(selectedAnnotation.id)}
            onApply={() => onApply(selectedAnnotation.id)}
            onBack={() => setSelectedAnnotation(null)}
          />
        ) : (
          <AnnotationList
            annotations={filteredAnnotations}
            onAnnotationClick={setSelectedAnnotation}
          />
        )}
      </div>
    </div>
  );
}
```

### 5. AnnotationCard

```tsx
export function AnnotationCard({ annotation, onClick }: Props) {
  const severityIcon = {
    CRITICAL: <AlertTriangle className="w-4 h-4 text-destructive" />,
    ERROR: <XCircle className="w-4 h-4 text-destructive" />,
    WARNING: <AlertCircle className="w-4 h-4 text-warning" />,
    INFO: <Info className="w-4 h-4 text-muted-foreground" />,
  };

  return (
    <button
      onClick={() => onClick(annotation)}
      className="w-full text-left p-4 rounded-lg border border-border hover:bg-accent transition-colors mb-3"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {severityIcon[annotation.severity]}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded",
              getSeverityBadgeClass(annotation.severity)
            )}>
              {annotation.severity}
            </span>
            <span className="text-xs text-muted-foreground">
              {annotation.ruleCode}
            </span>
          </div>
          
          <p className="text-sm font-medium text-foreground mb-1">
            {annotation.message}
          </p>
          
          {annotation.highlightedText && (
            <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
              "{annotation.highlightedText}"
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
```

### 6. AnnotationDetail

```tsx
export function AnnotationDetail({ 
  annotation, 
  onAccept, 
  onReject, 
  onApply, 
  onBack 
}: Props) {
  return (
    <div className="space-y-4">
      {/* Back button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" />
        Quay lại
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded",
            getSeverityBadgeClass(annotation.severity)
          )}>
            {annotation.severity}
          </span>
          <span className="text-xs text-muted-foreground">
            {annotation.ruleCode}
          </span>
        </div>
        <h3 className="text-lg font-semibold">{annotation.message}</h3>
      </div>

      {/* Highlighted text */}
      {annotation.highlightedText && (
        <div className="p-3 rounded-lg bg-muted">
          <p className="text-xs text-muted-foreground mb-1">Đoạn văn được đánh dấu:</p>
          <p className="text-sm font-mono">{annotation.highlightedText}</p>
        </div>
      )}

      {/* Explanation */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Giải thích:</h4>
        <p className="text-sm text-muted-foreground">{annotation.explanation}</p>
      </div>

      {/* Suggestion */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Đề xuất:</h4>
        <p className="text-sm text-muted-foreground">{annotation.suggestion}</p>
      </div>

      {/* Proposed content */}
      {annotation.proposedContent && (
        <div className="p-4 rounded-lg border-2 border-success bg-success/5">
          <h4 className="text-sm font-semibold mb-2 text-success">Nội dung đề xuất:</h4>
          <p className="text-sm">{annotation.proposedContent}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-border">
        {annotation.proposedContent && (
          <Button
            variant="primary"
            onClick={onApply}
            className="flex-1"
          >
            Áp dụng đề xuất
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onAccept}
          className="flex-1"
        >
          Chấp nhận
        </Button>
        <Button
          variant="ghost"
          onClick={onReject}
          className="flex-1"
        >
          Từ chối
        </Button>
      </div>
    </div>
  );
}
```

---

## Custom Hooks

### useLessonPlan

```tsx
export function useLessonPlan(lessonPlanId: string) {
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [planData, sectionsData] = await Promise.all([
          lessonPlanService.getById(lessonPlanId),
          lessonPlanService.getSections(lessonPlanId),
        ]);
        setLessonPlan(planData);
        setSections(sectionsData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [lessonPlanId]);

  const updateSection = async (sectionId: string, content: string) => {
    await lessonPlanService.updateSection(lessonPlanId, sectionId, content);
    // Update local state
    setSections(prev =>
      prev.map(s => s.id === sectionId ? { ...s, rawContent: content } : s)
    );
  };

  return { lessonPlan, sections, loading, error, updateSection };
}
```

### useReview

```tsx
export function useReview(lessonPlanId: string) {
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [progress, setProgress] = useState(0);

  const startReview = async (ruleSetId: string) => {
    setIsReviewing(true);
    setProgress(0);
    
    try {
      await reviewService.startReview(lessonPlanId, ruleSetId);
      
      // Poll for progress
      const pollInterval = setInterval(async () => {
        const status = await reviewService.getReviewStatus(lessonPlanId);
        setProgress(status.progress);
        
        if (status.status === 'COMPLETED') {
          clearInterval(pollInterval);
          const result = await reviewService.getReviewResult(lessonPlanId);
          setReviewResult(result);
          setIsReviewing(false);
        }
      }, 2000);
    } catch (error) {
      setIsReviewing(false);
      throw error;
    }
  };

  return { reviewResult, isReviewing, progress, startReview };
}
```

### useAnnotations

```tsx
export function useAnnotations(lessonPlanId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnotations() {
      setLoading(true);
      try {
        const data = await annotationService.getAnnotations(lessonPlanId);
        setAnnotations(data);
      } finally {
        setLoading(false);
      }
    }
    fetchAnnotations();
  }, [lessonPlanId]);

  const acceptAnnotation = async (annotationId: string) => {
    await annotationService.acceptAnnotation(lessonPlanId, annotationId);
    setAnnotations(prev =>
      prev.map(a => a.id === annotationId ? { ...a, status: 'ACCEPTED' } : a)
    );
  };

  const rejectAnnotation = async (annotationId: string) => {
    await annotationService.rejectAnnotation(lessonPlanId, annotationId);
    setAnnotations(prev =>
      prev.map(a => a.id === annotationId ? { ...a, status: 'REJECTED' } : a)
    );
  };

  const applyS suggestion = async (annotationId: string) => {
    const result = await annotationService.applySuggestion(lessonPlanId, annotationId);
    setAnnotations(prev =>
      prev.map(a => a.id === annotationId ? { ...a, status: 'RESOLVED' } : a)
    );
    return result;
  };

  return { 
    annotations, 
    loading, 
    acceptAnnotation, 
    rejectAnnotation, 
    applySuggestion 
  };
}
```

---

## State Management

Use React Context for global state:

```tsx
interface EditorContextValue {
  activeSection: string | null;
  setActiveSection: (id: string) => void;
  selectedAnnotation: Annotation | null;
  setSelectedAnnotation: (annotation: Annotation | null) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <EditorContext.Provider value={{
      activeSection,
      setActiveSection,
      selectedAnnotation,
      setSelectedAnnotation,
      isEditing,
      setIsEditing,
    }}>
      {children}
    </EditorContext.Provider>
  );
}
```

---

## Styling Guidelines

Follow existing design system:

- Use semantic color tokens (`bg-card`, `text-foreground`, `border-border`)
- Match button styles from existing UI
- Use consistent spacing scale
- Support light/dark mode automatically
- Responsive breakpoints as per existing patterns

---

## Performance Optimizations

1. **Virtualized lists** for large annotation counts
2. **Debounced auto-save** for content changes
3. **Lazy load** sections on demand
4. **Memoize** expensive calculations
5. **Code splitting** by route

---

## Accessibility

- **Keyboard navigation**: Full keyboard support for editor and annotations
- **ARIA labels**: Proper labels for all interactive elements
- **Focus management**: Logical focus order
- **Screen reader**: Announce review status and annotation updates
- **Color contrast**: WCAG AA compliance (already enforced by design system)

---

## Testing Strategy

- **Component tests**: React Testing Library for all UI components
- **Hook tests**: Test custom hooks in isolation
- **Integration tests**: Test complete flows (upload → parse → review → export)
- **E2E tests**: Playwright for critical user journeys
- **Accessibility tests**: axe-core integration
