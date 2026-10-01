# ARCHITECTURAL DECISIONS RECORD (ADR)

## About This Document
This document records all significant architectural decisions made during the Lesson Plan Editor refactoring project. Each decision includes context, the decision itself, reasoning, alternatives considered, and current status.

---

## Decision Index
- [ADR-001] Use Custom Document Model Instead of Tiptap/ProseMirror
- [ADR-002] Implement Command Pattern for All Document Changes
- [ADR-003] Use Immutable Document State
- [ADR-004] Separate Review Engine from Editor Core
- [ADR-005] Provider-Agnostic AI Integration
- [ADR-006] Adapter Pattern for Import/Export

---

## [ADR-001] Use Custom Document Model Instead of Tiptap/ProseMirror

**Date**: 2026-07-01  
**Status**: ✅ ACCEPTED  
**Deciders**: Lead Architect

### Context
The current system uses Tiptap (wrapper for ProseMirror) as the editor. This creates several problems:
- Tight coupling to Tiptap's API and data structures
- AI logic must work with ProseMirror's complex state
- Difficult to test business logic independently of UI
- Vendor lock-in makes switching editors nearly impossible
- ProseMirror's document model is generic, not optimized for lesson plans

### Decision
We will create a **custom document model** specifically designed for lesson plans, independent of any editor library.

The document model will be:
- A tree structure with typed nodes (Section, Paragraph, Text, etc.)
- Immutable (changes create new versions)
- Serializable to JSON
- Independent of rendering layer
- The single source of truth

### Consequences

**Positive**:
- Complete control over document structure
- AI can work directly with semantic nodes
- Easy to test (pure data structures)
- No vendor lock-in
- Can optimize for lesson plan workflows
- Future-proof (can change rendering without affecting model)

**Negative**:
- More upfront work to build the model
- Must implement features that Tiptap provided for free
- Team must learn new architecture

**Mitigation**:
- Start with minimal viable model
- Add features incrementally
- Document thoroughly

### Alternatives Considered

**Alternative 1: Keep using Tiptap**
- Pros: No refactoring needed, feature-complete
- Cons: All the problems listed in Context
- Rejected because: Technical debt too high, blocking AI improvements

**Alternative 2: Switch to another editor library (Slate, Lexical)**
- Pros: Modern, better APIs than Tiptap
- Cons: Still vendor lock-in, still couples UI with data
- Rejected because: Doesn't solve the fundamental architecture problem

**Alternative 3: Use ProseMirror directly (without Tiptap)**
- Pros: More control than Tiptap wrapper
- Cons: Still ProseMirror's complex API, still vendor lock-in
- Rejected because: Doesn't eliminate coupling

---

## [ADR-002] Implement Command Pattern for All Document Changes

**Date**: 2026-07-01  
**Status**: ✅ ACCEPTED  
**Deciders**: Lead Architect

### Context
In the current system, document changes happen through:
- Direct Tiptap API calls (`editor.commands.insertText()`)
- React state updates
- Database updates
- No unified way to track or reverse changes

This creates problems:
- Undo/redo is hard to implement correctly
- Cannot replay changes
- Difficult to test specific operations
- No audit trail
- Cannot batch operations

### Decision
All document changes must go through a **Command Pattern** implementation.

Every change (insert text, delete paragraph, add annotation, etc.) becomes a Command object with:
- `execute()` - applies the change
- `undo()` - reverses the change
- `metadata` - who, when, why

Commands are processed by a CommandExecutor that:
- Validates the command
- Executes it
- Updates the document state
- Pushes to history stack
- Notifies observers

### Consequences

**Positive**:
- Undo/redo comes for free
- Can log all changes (audit trail)
- Can replay changes (debugging, testing)
- Can batch commands (transactions)
- Easy to test (commands are pure functions)
- Can implement macro commands (multi-step operations)

**Negative**:
- More boilerplate code
- Every operation needs a command class
- Slight performance overhead

**Mitigation**:
- Create command generator utilities
- Batch similar operations
- Lazy command creation for performance-critical paths

### Alternatives Considered

**Alternative 1: Direct state mutation**
- Pros: Simpler, faster to write
- Cons: No undo, no audit trail, hard to test
- Rejected because: Doesn't meet requirements for AI review system

**Alternative 2: Event Sourcing**
- Pros: Complete history, can rebuild state from events
- Cons: Overkill for this use case, complex to implement
- Rejected because: Command pattern sufficient for our needs

---

## [ADR-003] Use Immutable Document State

**Date**: 2026-07-01  
**Status**: ✅ ACCEPTED  
**Deciders**: Lead Architect

### Context
Current system mutates document state directly:
- React state updates modify objects in place
- Hard to track what changed
- Race conditions possible
- Difficult to implement time-travel debugging
- Optimistic updates are complex

### Decision
The document state will be **immutable**.

Every change creates a new document state. The old state remains unchanged.

Implementation:
- Use structural sharing (only changed nodes are new)
- Old states can be garbage collected
- History keeps snapshots of past states

### Consequences

**Positive**:
- Easier to reason about changes
- No race conditions
- Time-travel debugging possible
- React optimization easier (reference equality)
- Undo is just restoring old state

**Negative**:
- Memory overhead (keeping multiple states)
- Performance overhead (creating new objects)
- Must be careful with large documents

**Mitigation**:
- Use structural sharing (don't clone entire tree)
- Limit history depth
- Implement garbage collection for old states

### Alternatives Considered

**Alternative 1: Mutable state with deep cloning**
- Pros: Simpler to understand
- Cons: Expensive cloning, still has mutation bugs
- Rejected because: Performance worse than structural sharing

**Alternative 2: Mutable with change tracking**
- Pros: Best performance
- Cons: Complex to implement correctly, error-prone
- Rejected because: Not worth the complexity

---

## [ADR-004] Separate Review Engine from Editor Core

**Date**: 2026-07-01  
**Status**: ✅ ACCEPTED  
**Deciders**: Lead Architect

### Context
Current system mixes review logic with editor logic:
- Annotations are Tiptap marks
- Review UI is coupled with editor UI
- Cannot review without loading the editor
- AI logic is spread across multiple files

### Decision
Create a **separate Review Engine** as an independent module.

The Review Engine will:
- Manage annotations independently of the editor
- Provide APIs for AI to create/update annotations
- Handle review workflow (pending → accepted/rejected)
- Work with document model, not UI

The Editor will:
- Render annotations from the Review Engine
- Send user actions (accept/reject) to Review Engine
- But not own the review logic

### Consequences

**Positive**:
- Can review documents without rendering them
- AI can work independently
- Review logic is testable in isolation
- Can build alternative UIs (mobile, CLI, etc.)
- Cleaner separation of concerns

**Negative**:
- More modules to coordinate
- Need clear API boundaries

**Mitigation**:
- Well-defined interfaces between modules
- Comprehensive integration tests

### Alternatives Considered

**Alternative 1: Keep review coupled with editor**
- Pros: Simpler, fewer files
- Cons: All the problems in Context
- Rejected because: Blocks AI improvements

**Alternative 2: Separate but shared state**
- Pros: Still decoupled
- Cons: Shared state can cause coupling
- Rejected because: Better to have Review Engine own its state

---

## [ADR-005] Provider-Agnostic AI Integration

**Date**: 2026-07-01  
**Status**: ✅ ACCEPTED  
**Deciders**: Lead Architect

### Context
Current system is tightly coupled to Beeknoee API:
- Direct API calls in multiple places
- No abstraction layer
- Hard to add new AI providers
- Cannot A/B test different models
- Cannot fallback if provider fails

### Decision
Create an **AIProvider interface** that abstracts AI integration.

```typescript
interface AIProvider {
  name: string;
  analyze(section: Section, rules: Rule[]): Promise<Annotation[]>;
  generateSuggestion(context: Context): Promise<string>;
}
```

Implementations:
- `BeeknoeeProvider` (current)
- `OpenAIProvider` (future)
- `ClaudeProvider` (future)
- `LocalModelProvider` (future)

The Review Engine uses AIProvider, not specific implementations.

### Consequences

**Positive**:
- Easy to add new AI providers
- Can switch providers without changing Review Engine
- Can implement fallback strategies
- Can A/B test different models
- Future-proof

**Negative**:
- Abstraction overhead
- Must find common API across providers

**Mitigation**:
- Design interface based on current needs
- Extend as needed when adding providers

### Alternatives Considered

**Alternative 1: Keep Beeknoee hardcoded**
- Pros: Simplest
- Cons: Vendor lock-in, no flexibility
- Rejected because: Future plans include multiple providers

**Alternative 2: Plugin system**
- Pros: Maximum flexibility
- Cons: Overkill, complex to implement
- Rejected because: Interface is sufficient for now

---

## [ADR-006] Adapter Pattern for Import/Export

**Date**: 2026-07-01  
**Status**: ✅ ACCEPTED  
**Deciders**: Lead Architect

### Context
Current system:
- Parses DOCX directly in API routes
- Exports DOCX in API routes
- Import/export logic mixed with business logic
- Hard to support new formats
- Cannot test import/export in isolation

### Decision
Use **Adapter Pattern** for import/export.

Create interfaces:
```typescript
interface ImportAdapter {
  import(file: File): Promise<DocumentTree>;
}

interface ExportAdapter {
  export(doc: DocumentTree, options: Options): Promise<Blob>;
}
```

Implementations:
- `DocxImportAdapter` (mammoth.js)
- `DocxExportAdapter` (docx library)
- `HtmlExportAdapter` (custom)
- `JsonImportAdapter` (for testing)
- `JsonExportAdapter` (for testing)

### Consequences

**Positive**:
- Easy to add new formats (PDF, Markdown, etc.)
- Import/export testable independently
- Core editor doesn't know about formats
- Can optimize adapters separately

**Negative**:
- More abstraction
- Must convert all formats to/from DocumentTree

**Mitigation**:
- Start with essential adapters (DOCX, HTML)
- Add others as needed

### Alternatives Considered

**Alternative 1: Direct format handling in editor**
- Pros: Simpler
- Cons: Tight coupling, hard to extend
- Rejected because: Need to support multiple formats

**Alternative 2: Universal format converter**
- Pros: Can convert any format to any format
- Cons: Very complex, many edge cases
- Rejected because: Don't need arbitrary format conversion

---

## Future Decisions (To Be Made)

### [ADR-007] Real-time Collaboration Strategy
**Status**: ⏳ PENDING  
**Context**: Multiple users editing same document
**Options**: Operational Transform (OT), CRDT, Lock-based
**Decision Date**: TBD (Phase 6+)

### [ADR-008] Offline Support Strategy
**Status**: ⏳ PENDING  
**Context**: Users working without internet
**Options**: IndexedDB, LocalStorage, Service Worker
**Decision Date**: TBD (Phase 9+)

### [ADR-009] Mobile Strategy
**Status**: ⏳ PENDING  
**Context**: Support mobile devices
**Options**: Responsive web, Native app, PWA
**Decision Date**: TBD (Phase 9+)

---

## Decision Process

### How to Add a New Decision
1. Copy template below
2. Fill in all sections
3. Discuss with team
4. Update status to ACCEPTED/REJECTED
5. Commit to repository

### Decision Template
```markdown
## [ADR-XXX] Title

**Date**: YYYY-MM-DD
**Status**: 🔄 PROPOSED | ✅ ACCEPTED | ❌ REJECTED | ⚠️ DEPRECATED
**Deciders**: Names

### Context
What is the situation and problem?

### Decision
What is the change we're making?

### Consequences
What are the positive and negative consequences?

### Alternatives Considered
What other options did we evaluate?
```

---

**Last Updated**: 2026-07-01  
**Total Decisions**: 6 accepted, 3 pending
