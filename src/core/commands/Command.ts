/**
 * Command Interface
 *
 * All document changes must go through commands.
 * Commands are undoable and can be logged.
 */

import type { DocumentTree } from "../document/DocumentTree";

// ============================================================================
// Command Types
// ============================================================================

/**
 * Result of command execution
 */
export interface CommandResult {
  /** Whether command succeeded */
  success: boolean;
  /** New document tree (if successful) */
  tree?: DocumentTree;
  /** Error message (if failed) */
  error?: string;
  /** Metadata about the execution */
  metadata?: Record<string, any>;
}

/**
 * Command context - passed to all commands
 */
export interface CommandContext {
  /** Current document tree */
  tree: DocumentTree;
  /** Optional user context */
  userId?: string;
  /** Timestamp */
  timestamp?: Date;
  /** Additional metadata */
  [key: string]: any;
}

/**
 * Base command interface
 */
export interface Command {
  /** Command type/name */
  type: string;
  /** Execute the command */
  execute(context: CommandContext): CommandResult;
  /** Undo the command */
  undo(context: CommandContext): CommandResult;
  /** Whether this command can be undone */
  canUndo: boolean;
  /** Command metadata */
  metadata?: Record<string, any>;
}

/**
 * Batch command - executes multiple commands as one
 */
export interface BatchCommand extends Command {
  type: "batch";
  commands: Command[];
}

// ============================================================================
// Command Executor
// ============================================================================

export class CommandExecutor {
  /**
   * Execute a command
   */
  execute(command: Command, context: CommandContext): CommandResult {
    try {
      const result = command.execute(context);

      if (!result.success) {
        console.error(`Command failed: ${command.type}`, result.error);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Undo a command
   */
  undo(command: Command, context: CommandContext): CommandResult {
    if (!command.canUndo) {
      return {
        success: false,
        error: "Command cannot be undone",
      };
    }

    try {
      const result = command.undo(context);

      if (!result.success) {
        console.error(`Undo failed: ${command.type}`, result.error);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute a batch of commands
   */
  executeBatch(commands: Command[], context: CommandContext): CommandResult {
    const currentContext = { ...context };

    for (const command of commands) {
      const result = this.execute(command, currentContext);

      if (!result.success) {
        // Rollback previous commands
        return {
          success: false,
          error: `Batch failed at command: ${command.type}. ${result.error}`,
        };
      }

      if (result.tree) {
        currentContext.tree = result.tree;
      }
    }

    return {
      success: true,
      tree: currentContext.tree,
      metadata: {
        commandCount: commands.length,
      },
    };
  }

  /**
   * Validate command before execution
   */
  validate(command: Command, context: CommandContext): boolean {
    // Basic validation
    if (!command.type) {
      return false;
    }

    if (!context.tree) {
      return false;
    }

    return true;
  }
}

// ============================================================================
// Abstract Base Command
// ============================================================================

export abstract class BaseCommand implements Command {
  abstract type: string;
  abstract canUndo: boolean;
  metadata?: Record<string, any>;

  constructor(metadata?: Record<string, any>) {
    this.metadata = {
      createdAt: new Date(),
      ...metadata,
    };
  }

  abstract execute(context: CommandContext): CommandResult;
  abstract undo(context: CommandContext): CommandResult;

  protected success(tree: DocumentTree, metadata?: Record<string, any>): CommandResult {
    return {
      success: true,
      tree,
      metadata,
    };
  }

  protected failure(error: string): CommandResult {
    return {
      success: false,
      error,
    };
  }
}

// ============================================================================
// Command Types Enum
// ============================================================================

export enum CommandType {
  // Basic
  InsertNode = "insertNode",
  DeleteNode = "deleteNode",
  ReplaceNode = "replaceNode",
  UpdateAttrs = "updateAttrs",
  InsertText = "insertText",
  DeleteText = "deleteText",

  // Advanced
  SplitNode = "splitNode",
  MergeNodes = "mergeNodes",
  WrapNodes = "wrapNodes",
  UnwrapNode = "unwrapNode",
  MoveNode = "moveNode",

  // Marks
  AddMark = "addMark",
  RemoveMark = "removeMark",

  // Batch
  Batch = "batch",
}
