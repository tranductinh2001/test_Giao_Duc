/**
 * Editor Core
 *
 * Main orchestration layer that ties everything together
 */

import { DocumentTree } from "../document/DocumentTree";
import type { DocumentRootNode, DocumentNode } from "../document/types";
import { SelectionState } from "../selection/SelectionState";
import type { Selection } from "../selection/SelectionState";
import { HistoryManager } from "../history/HistoryManager";
import type { Command } from "../commands/Command";
import { ReviewEngine } from "../review/ReviewEngine";
import type { ReviewRule, AIProvider } from "../review/ReviewEngine";
import type { Annotation } from "../annotations/Annotation";

// ============================================================================
// Editor State
// ============================================================================

export interface EditorState {
  /** Document tree */
  document: DocumentTree;
  /** Selection state */
  selection: SelectionState;
  /** Whether editor is focused */
  isFocused: boolean;
  /** Whether editor is editable */
  isEditable: boolean;
  /** Whether document is dirty (has unsaved changes) */
  isDirty: boolean;
}

// ============================================================================
// Editor Config
// ============================================================================

export interface EditorConfig {
  /** Whether editor is editable */
  editable?: boolean;
  /** Max history size */
  maxHistorySize?: number;
  /** Auto-save interval in ms */
  autoSaveInterval?: number;
  /** AI provider for reviews */
  aiProvider?: AIProvider;
}

// ============================================================================
// Editor Events
// ============================================================================

export type EditorEventType =
  | "update"
  | "focus"
  | "blur"
  | "selection"
  | "command"
  | "review"
  | "save";

export interface EditorEvent {
  type: EditorEventType;
  data?: any;
}

export type EditorEventHandler = (event: EditorEvent) => void;

// ============================================================================
// Editor Core
// ============================================================================

export class EditorCore {
  private state: EditorState;
  private config: EditorConfig;
  private history: HistoryManager;
  private reviewEngine: ReviewEngine;
  private eventHandlers: Map<EditorEventType, Set<EditorEventHandler>> = new Map();
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(initialDocument: DocumentRootNode, config: EditorConfig = {}) {
    const tree = new DocumentTree(initialDocument);

    this.state = {
      document: tree,
      selection: SelectionState.cursor([0], 0),
      isFocused: false,
      isEditable: config.editable !== false,
      isDirty: false,
    };

    this.config = config;
    this.history = new HistoryManager(tree, {
      maxSize: config.maxHistorySize,
    });
    this.reviewEngine = new ReviewEngine({
      aiProvider: config.aiProvider,
    });

    // Setup auto-save
    if (config.autoSaveInterval) {
      this.startAutoSave();
    }
  }

  // ==========================================================================
  // State Access
  // ==========================================================================

  /**
   * Get current state
   */
  getState(): EditorState {
    return { ...this.state };
  }

  /**
   * Get document tree
   */
  getDocument(): DocumentTree {
    return this.state.document;
  }

  /**
   * Get selection
   */
  getSelection(): SelectionState {
    return this.state.selection;
  }

  /**
   * Get whether editor is focused
   */
  isFocused(): boolean {
    return this.state.isFocused;
  }

  /**
   * Get whether editor is editable
   */
  isEditable(): boolean {
    return this.state.isEditable;
  }

  /**
   * Get whether document is dirty
   */
  isDirty(): boolean {
    return this.state.isDirty;
  }

  // ==========================================================================
  // Commands
  // ==========================================================================

  /**
   * Execute command
   */
  executeCommand(command: Command): boolean {
    if (!this.state.isEditable) {
      console.warn("Editor is not editable");
      return false;
    }

    const result = this.history.execute(command);

    if (result.success && result.tree) {
      this.state.document = result.tree;
      this.state.isDirty = true;
      this.emit("command", { command, result });
      this.emit("update", { document: this.state.document });
      return true;
    }

    return false;
  }

  /**
   * Undo last command
   */
  undo(): boolean {
    if (!this.history.canUndo()) {
      return false;
    }

    const result = this.history.undo();

    if (result.success && result.tree) {
      this.state.document = result.tree;
      this.state.isDirty = true;
      this.emit("update", { document: this.state.document });
      return true;
    }

    return false;
  }

  /**
   * Redo last undone command
   */
  redo(): boolean {
    if (!this.history.canRedo()) {
      return false;
    }

    const result = this.history.redo();

    if (result.success && result.tree) {
      this.state.document = result.tree;
      this.state.isDirty = true;
      this.emit("update", { document: this.state.document });
      return true;
    }

    return false;
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.history.canUndo();
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.history.canRedo();
  }

  // ==========================================================================
  // Selection
  // ==========================================================================

  /**
   * Update selection
   */
  setSelection(selection: SelectionState): void {
    this.state.selection = selection;
    this.emit("selection", { selection });
  }

  /**
   * Move cursor to position
   */
  moveCursor(path: number[], offset = 0): void {
    this.setSelection(SelectionState.cursor(path, offset));
  }

  /**
   * Select range
   */
  selectRange(fromPath: number[], toPath: number[], fromOffset = 0, toOffset = 0): void {
    this.setSelection(
      SelectionState.range(
        { path: fromPath, offset: fromOffset },
        { path: toPath, offset: toOffset }
      )
    );
  }

  // ==========================================================================
  // Focus
  // ==========================================================================

  /**
   * Focus editor
   */
  focus(): void {
    this.state.isFocused = true;
    this.emit("focus", {});
  }

  /**
   * Blur editor
   */
  blur(): void {
    this.state.isFocused = false;
    this.emit("blur", {});
  }

  // ==========================================================================
  // Review
  // ==========================================================================

  /**
   * Start document review
   */
  async review(
    rules: ReviewRule[],
    options?: {
      onProgress?: (progress: any) => void;
      onSectionComplete?: (sectionId: string, annotations: Annotation[]) => void;
    }
  ) {
    const result = await this.reviewEngine.review(this.state.document, rules, options);
    this.emit("review", { result });
    return result;
  }

  /**
   * Get review annotations
   */
  getAnnotations(): Annotation[] {
    return this.reviewEngine.getAnnotations();
  }

  /**
   * Accept annotation
   */
  acceptAnnotation(annotationId: string): boolean {
    return this.reviewEngine.acceptAnnotation(annotationId);
  }

  /**
   * Reject annotation
   */
  rejectAnnotation(annotationId: string): boolean {
    return this.reviewEngine.rejectAnnotation(annotationId);
  }

  // ==========================================================================
  // Document Management
  // ==========================================================================

  /**
   * Load new document
   */
  loadDocument(document: DocumentRootNode, clearHistory = true): void {
    const tree = new DocumentTree(document);
    this.state.document = tree;
    this.history.setCurrentTree(tree, clearHistory);
    this.state.isDirty = false;
    this.state.selection = SelectionState.cursor([0], 0);
    this.emit("update", { document: this.state.document });
  }

  /**
   * Mark document as saved
   */
  markAsSaved(): void {
    this.state.isDirty = false;
    this.emit("save", {});
  }

  /**
   * Get JSON representation
   */
  toJSON(): string {
    return this.state.document.toJSON();
  }

  // ==========================================================================
  // Config
  // ==========================================================================

  /**
   * Set editable
   */
  setEditable(editable: boolean): void {
    this.state.isEditable = editable;
    this.emit("update", { isEditable: editable });
  }

  /**
   * Set AI provider
   */
  setAIProvider(provider: AIProvider): void {
    this.reviewEngine.setAIProvider(provider);
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  /**
   * Register event handler
   */
  on(type: EditorEventType, handler: EditorEventHandler): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }

    this.eventHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * Emit event
   */
  private emit(type: EditorEventType, data?: any): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      const event: EditorEvent = { type, data };
      for (const handler of handlers) {
        handler(event);
      }
    }
  }

  // ==========================================================================
  // Auto-save
  // ==========================================================================

  /**
   * Start auto-save
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      if (this.state.isDirty) {
        this.emit("save", { auto: true });
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroy editor instance
   */
  destroy(): void {
    this.stopAutoSave();
    this.eventHandlers.clear();
    this.reviewEngine.clear();
    this.history.clear();
  }
}
