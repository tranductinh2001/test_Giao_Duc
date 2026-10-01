/**
 * Basic Commands
 *
 * Fundamental document manipulation commands
 */

import type { DocumentNode } from "../../document/types";
import type { CommandContext, CommandResult } from "../Command";
import { BaseCommand, CommandType } from "../Command";

// ============================================================================
// Insert Node Command
// ============================================================================

export class InsertNodeCommand extends BaseCommand {
  type = CommandType.InsertNode;
  canUndo = true;

  constructor(
    private parentPath: number[],
    private index: number,
    private node: DocumentNode,
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  execute(context: CommandContext): CommandResult {
    try {
      const newTree = context.tree.insertNode(this.parentPath, this.index, this.node);
      return this.success(newTree, {
        insertedNodeId: this.node.id,
        path: [...this.parentPath, this.index],
      });
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Insert failed");
    }
  }

  undo(context: CommandContext): CommandResult {
    try {
      const path = [...this.parentPath, this.index];
      const newTree = context.tree.deleteNode(path);
      return this.success(newTree);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Undo insert failed");
    }
  }
}

// ============================================================================
// Delete Node Command
// ============================================================================

export class DeleteNodeCommand extends BaseCommand {
  type = CommandType.DeleteNode;
  canUndo = true;
  private deletedNode?: DocumentNode;

  constructor(
    private path: number[],
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  execute(context: CommandContext): CommandResult {
    try {
      // Store deleted node for undo
      this.deletedNode = context.tree.getNodeAt(this.path) || undefined;

      if (!this.deletedNode) {
        return this.failure("Node not found at path");
      }

      const newTree = context.tree.deleteNode(this.path);
      return this.success(newTree, {
        deletedNodeId: this.deletedNode.id,
      });
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Delete failed");
    }
  }

  undo(context: CommandContext): CommandResult {
    if (!this.deletedNode) {
      return this.failure("Cannot undo: no deleted node stored");
    }

    try {
      const parentPath = this.path.slice(0, -1);
      const index = this.path[this.path.length - 1];
      const newTree = context.tree.insertNode(parentPath, index, this.deletedNode);
      return this.success(newTree);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Undo delete failed");
    }
  }
}

// ============================================================================
// Replace Node Command
// ============================================================================

export class ReplaceNodeCommand extends BaseCommand {
  type = CommandType.ReplaceNode;
  canUndo = true;
  private oldNode?: DocumentNode;

  constructor(
    private path: number[],
    private newNode: DocumentNode,
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  execute(context: CommandContext): CommandResult {
    try {
      // Store old node for undo
      this.oldNode = context.tree.getNodeAt(this.path) || undefined;

      if (!this.oldNode) {
        return this.failure("Node not found at path");
      }

      const newTree = context.tree.replaceNode(this.path, this.newNode);
      return this.success(newTree, {
        oldNodeId: this.oldNode.id,
        newNodeId: this.newNode.id,
      });
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Replace failed");
    }
  }

  undo(context: CommandContext): CommandResult {
    if (!this.oldNode) {
      return this.failure("Cannot undo: no old node stored");
    }

    try {
      const newTree = context.tree.replaceNode(this.path, this.oldNode);
      return this.success(newTree);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Undo replace failed");
    }
  }
}

// ============================================================================
// Update Attributes Command
// ============================================================================

export class UpdateAttrsCommand extends BaseCommand {
  type = CommandType.UpdateAttrs;
  canUndo = true;
  private oldAttrs?: Record<string, any>;

  constructor(
    private path: number[],
    private newAttrs: Record<string, any>,
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  execute(context: CommandContext): CommandResult {
    try {
      const node = context.tree.getNodeAt(this.path);

      if (!node) {
        return this.failure("Node not found at path");
      }

      // Store old attrs for undo
      this.oldAttrs = { ...node.attrs };

      const newTree = context.tree.updateAttrs(this.path, this.newAttrs);
      return this.success(newTree);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Update attrs failed");
    }
  }

  undo(context: CommandContext): CommandResult {
    if (!this.oldAttrs) {
      return this.failure("Cannot undo: no old attrs stored");
    }

    try {
      const newTree = context.tree.updateAttrs(this.path, this.oldAttrs);
      return this.success(newTree);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Undo update attrs failed");
    }
  }
}

// ============================================================================
// Insert Text Command
// ============================================================================

export class InsertTextCommand extends BaseCommand {
  type = CommandType.InsertText;
  canUndo = true;

  constructor(
    private path: number[],
    private offset: number,
    private text: string,
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  execute(context: CommandContext): CommandResult {
    try {
      const node = context.tree.getNodeAt(this.path);

      if (!node || node.type !== "text") {
        return this.failure("Target is not a text node");
      }

      const textNode = node as any;
      const newText =
        textNode.text.slice(0, this.offset) +
        this.text +
        textNode.text.slice(this.offset);

      const newNode = {
        ...textNode,
        text: newText,
      };

      const newTree = context.tree.replaceNode(this.path, newNode);
      return this.success(newTree);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Insert text failed");
    }
  }

  undo(context: CommandContext): CommandResult {
    try {
      const node = context.tree.getNodeAt(this.path);

      if (!node || node.type !== "text") {
        return this.failure("Target is not a text node");
      }

      const textNode = node as any;
      const newText =
        textNode.text.slice(0, this.offset) +
        textNode.text.slice(this.offset + this.text.length);

      const newNode = {
        ...textNode,
        text: newText,
      };

      const newTree = context.tree.replaceNode(this.path, newNode);
      return this.success(newTree);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Undo insert text failed");
    }
  }
}

// ============================================================================
// Delete Text Command
// ============================================================================

export class DeleteTextCommand extends BaseCommand {
  type = CommandType.DeleteText;
  canUndo = true;
  private deletedText?: string;

  constructor(
    private path: number[],
    private offset: number,
    private length: number,
    metadata?: Record<string, any>
  ) {
    super(metadata);
  }

  execute(context: CommandContext): CommandResult {
    try {
      const node = context.tree.getNodeAt(this.path);

      if (!node || node.type !== "text") {
        return this.failure("Target is not a text node");
      }

      const textNode = node as any;
      this.deletedText = textNode.text.slice(this.offset, this.offset + this.length);

      const newText =
        textNode.text.slice(0, this.offset) +
        textNode.text.slice(this.offset + this.length);

      const newNode = {
        ...textNode,
        text: newText,
      };

      const newTree = context.tree.replaceNode(this.path, newNode);
      return this.success(newTree);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Delete text failed");
    }
  }

  undo(context: CommandContext): CommandResult {
    if (!this.deletedText) {
      return this.failure("Cannot undo: no deleted text stored");
    }

    try {
      const node = context.tree.getNodeAt(this.path);

      if (!node || node.type !== "text") {
        return this.failure("Target is not a text node");
      }

      const textNode = node as any;
      const newText =
        textNode.text.slice(0, this.offset) +
        this.deletedText +
        textNode.text.slice(this.offset);

      const newNode = {
        ...textNode,
        text: newText,
      };

      const newTree = context.tree.replaceNode(this.path, newNode);
      return this.success(newTree);
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : "Undo delete text failed");
    }
  }
}
