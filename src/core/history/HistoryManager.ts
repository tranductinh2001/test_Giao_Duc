/**
 * History System
 *
 * Manages undo/redo stack with command history
 */

import type { Command, CommandContext, CommandResult } from "../commands/Command";
import { CommandExecutor } from "../commands/Command";
import type { DocumentTree } from "../document/DocumentTree";

// ============================================================================
// History State
// ============================================================================

export interface HistoryState {
  /** Stack of executed commands (for undo) */
  undoStack: Command[];
  /** Stack of undone commands (for redo) */
  redoStack: Command[];
  /** Current document tree */
  currentTree: DocumentTree;
  /** Maximum history size */
  maxSize: number;
}

// ============================================================================
// History Manager
// ============================================================================

export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private currentTree: DocumentTree;
  private maxSize: number;
  private executor: CommandExecutor;

  constructor(
    initialTree: DocumentTree,
    options: {
      maxSize?: number;
    } = {}
  ) {
    this.currentTree = initialTree;
    this.maxSize = options.maxSize || 100;
    this.executor = new CommandExecutor();
  }

  /**
   * Execute a command and add to history
   */
  execute(command: Command, context?: Partial<CommandContext>): CommandResult {
    const fullContext: CommandContext = {
      tree: this.currentTree,
      timestamp: new Date(),
      ...context,
    };

    const result = this.executor.execute(command, fullContext);

    if (result.success && result.tree) {
      // Update current tree
      this.currentTree = result.tree;

      // Add to undo stack if command is undoable
      if (command.canUndo) {
        this.undoStack.push(command);

        // Limit stack size
        if (this.undoStack.length > this.maxSize) {
          this.undoStack.shift();
        }

        // Clear redo stack
        this.redoStack = [];
      }
    }

    return result;
  }

  /**
   * Undo last command
   */
  undo(): CommandResult {
    if (this.undoStack.length === 0) {
      return {
        success: false,
        error: "Nothing to undo",
      };
    }

    const command = this.undoStack.pop()!;

    const context: CommandContext = {
      tree: this.currentTree,
      timestamp: new Date(),
    };

    const result = this.executor.undo(command, context);

    if (result.success && result.tree) {
      this.currentTree = result.tree;
      this.redoStack.push(command);
    } else {
      // Put command back if undo failed
      this.undoStack.push(command);
    }

    return result;
  }

  /**
   * Redo last undone command
   */
  redo(): CommandResult {
    if (this.redoStack.length === 0) {
      return {
        success: false,
        error: "Nothing to redo",
      };
    }

    const command = this.redoStack.pop()!;

    const context: CommandContext = {
      tree: this.currentTree,
      timestamp: new Date(),
    };

    const result = this.executor.execute(command, context);

    if (result.success && result.tree) {
      this.currentTree = result.tree;
      this.undoStack.push(command);
    } else {
      // Put command back if redo failed
      this.redoStack.push(command);
    }

    return result;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get current tree
   */
  getCurrentTree(): DocumentTree {
    return this.currentTree;
  }

  /**
   * Get history state
   */
  getState(): HistoryState {
    return {
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
      currentTree: this.currentTree,
      maxSize: this.maxSize,
    };
  }

  /**
   * Get undo stack size
   */
  getUndoSize(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   */
  getRedoSize(): number {
    return this.redoStack.length;
  }

  /**
   * Set current tree (useful for loading document)
   */
  setCurrentTree(tree: DocumentTree, clearHistory = true): void {
    this.currentTree = tree;
    if (clearHistory) {
      this.clear();
    }
  }
}

// ============================================================================
// History Snapshot
// ============================================================================

export interface HistorySnapshot {
  timestamp: Date;
  tree: DocumentTree;
  commandType: string;
}

/**
 * Extended history manager with snapshots
 */
export class SnapshotHistoryManager extends HistoryManager {
  private snapshots: HistorySnapshot[] = [];
  private maxSnapshots: number;

  constructor(
    initialTree: DocumentTree,
    options: {
      maxSize?: number;
      maxSnapshots?: number;
    } = {}
  ) {
    super(initialTree, options);
    this.maxSnapshots = options.maxSnapshots || 20;
  }

  /**
   * Execute and create snapshot
   */
  executeWithSnapshot(command: Command, context?: Partial<CommandContext>): CommandResult {
    const result = this.execute(command, context);

    if (result.success && result.tree) {
      this.createSnapshot(result.tree, command.type);
    }

    return result;
  }

  /**
   * Create a snapshot
   */
  private createSnapshot(tree: DocumentTree, commandType: string): void {
    this.snapshots.push({
      timestamp: new Date(),
      tree: tree.clone(),
      commandType,
    });

    // Limit snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): HistorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Restore from snapshot
   */
  restoreSnapshot(index: number): boolean {
    if (index < 0 || index >= this.snapshots.length) {
      return false;
    }

    const snapshot = this.snapshots[index];
    this.setCurrentTree(snapshot.tree.clone(), true);
    return true;
  }

  /**
   * Clear snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }
}
