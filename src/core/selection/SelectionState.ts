/**
 * Selection System
 *
 * Manages cursor position and text selection in the document.
 * Immutable - all operations return new instances.
 */

import type { DocumentNode, NodePosition } from "../document/types";
import { DocumentTree, comparePaths, isAncestor } from "../document/DocumentTree";
import { isTextNode, isContainerNode } from "../document/types";

// ============================================================================
// Selection Types
// ============================================================================

/**
 * Selection represents a cursor position or text range
 */
export interface Selection {
  /** Anchor position (where selection started) */
  anchor: NodePosition;
  /** Head position (where selection ends, can be before anchor) */
  head: NodePosition;
  /** Whether selection is empty (cursor) */
  isEmpty: boolean;
  /** Whether selection is reversed (head before anchor) */
  isReversed: boolean;
}

/**
 * Range represents a normalized selection (from < to)
 */
export interface Range {
  /** Start position (always before end) */
  from: NodePosition;
  /** End position (always after start) */
  to: NodePosition;
}

// ============================================================================
// Selection Class
// ============================================================================

export class SelectionState {
  constructor(
    public readonly anchor: NodePosition,
    public readonly head: NodePosition
  ) {}

  /**
   * Check if selection is empty (cursor)
   */
  get isEmpty(): boolean {
    return (
      comparePaths(this.anchor.path, this.head.path) === 0 &&
      (this.anchor.offset || 0) === (this.head.offset || 0)
    );
  }

  /**
   * Check if selection is reversed
   */
  get isReversed(): boolean {
    const pathCompare = comparePaths(this.anchor.path, this.head.path);
    if (pathCompare !== 0) {
      return pathCompare > 0;
    }
    return (this.anchor.offset || 0) > (this.head.offset || 0);
  }

  /**
   * Get normalized range (from < to)
   */
  get range(): Range {
    if (this.isReversed) {
      return {
        from: this.head,
        to: this.anchor,
      };
    }
    return {
      from: this.anchor,
      to: this.head,
    };
  }

  /**
   * Create cursor selection at position
   */
  static cursor(path: number[], offset = 0): SelectionState {
    const pos: NodePosition = { path, offset };
    return new SelectionState(pos, pos);
  }

  /**
   * Create range selection
   */
  static range(from: NodePosition, to: NodePosition): SelectionState {
    return new SelectionState(from, to);
  }

  /**
   * Move cursor to position
   */
  moveTo(path: number[], offset = 0): SelectionState {
    const pos: NodePosition = { path, offset };
    return new SelectionState(pos, pos);
  }

  /**
   * Extend selection to position
   */
  extendTo(path: number[], offset = 0): SelectionState {
    const pos: NodePosition = { path, offset };
    return new SelectionState(this.anchor, pos);
  }

  /**
   * Collapse to anchor
   */
  collapseToAnchor(): SelectionState {
    return new SelectionState(this.anchor, this.anchor);
  }

  /**
   * Collapse to head
   */
  collapseToHead(): SelectionState {
    return new SelectionState(this.head, this.head);
  }

  /**
   * Collapse to start
   */
  collapseToStart(): SelectionState {
    const { from } = this.range;
    return new SelectionState(from, from);
  }

  /**
   * Collapse to end
   */
  collapseToEnd(): SelectionState {
    const { to } = this.range;
    return new SelectionState(to, to);
  }

  /**
   * Select all content in node
   */
  selectAll(tree: DocumentTree, nodePath: number[]): SelectionState {
    const node = tree.getNodeAt(nodePath);
    if (!node) {
      return this;
    }

    if (isTextNode(node)) {
      return SelectionState.range(
        { path: nodePath, offset: 0 },
        { path: nodePath, offset: node.text.length }
      );
    }

    if (isContainerNode(node)) {
      const firstChild = node.content[0];
      const lastChild = node.content[node.content.length - 1];

      if (!firstChild || !lastChild) {
        return this;
      }

      return SelectionState.range(
        { path: [...nodePath, 0], offset: 0 },
        { path: [...nodePath, node.content.length - 1], offset: 0 }
      );
    }

    return this;
  }

  /**
   * Check if selection contains position
   */
  contains(pos: NodePosition): boolean {
    const { from, to } = this.range;

    const fromCompare = this.comparePositions(from, pos);
    const toCompare = this.comparePositions(pos, to);

    return fromCompare <= 0 && toCompare <= 0;
  }

  /**
   * Check if selection overlaps with range
   */
  overlaps(range: Range): boolean {
    const thisRange = this.range;

    // Check if ranges overlap
    const fromCompare = this.comparePositions(thisRange.from, range.to);
    const toCompare = this.comparePositions(range.from, thisRange.to);

    return fromCompare < 0 && toCompare < 0;
  }

  /**
   * Compare two positions
   */
  private comparePositions(a: NodePosition, b: NodePosition): number {
    const pathCompare = comparePaths(a.path, b.path);
    if (pathCompare !== 0) {
      return pathCompare;
    }
    return (a.offset || 0) - (b.offset || 0);
  }

  /**
   * Clone selection
   */
  clone(): SelectionState {
    return new SelectionState(
      { ...this.anchor },
      { ...this.head }
    );
  }

  /**
   * Serialize to JSON
   */
  toJSON(): string {
    return JSON.stringify({
      anchor: this.anchor,
      head: this.head,
    });
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json: string): SelectionState {
    const data = JSON.parse(json);
    return new SelectionState(data.anchor, data.head);
  }
}

// ============================================================================
// Range Operations
// ============================================================================

/**
 * Check if two ranges overlap
 */
export function rangesOverlap(a: Range, b: Range): boolean {
  const aFromPath = comparePaths(a.from.path, b.to.path);
  const aToPath = comparePaths(b.from.path, a.to.path);

  if (aFromPath > 0 || aToPath > 0) {
    return false;
  }

  // Check offsets if paths are equal
  if (comparePaths(a.from.path, b.to.path) === 0) {
    if ((a.from.offset || 0) >= (b.to.offset || 0)) {
      return false;
    }
  }

  if (comparePaths(b.from.path, a.to.path) === 0) {
    if ((b.from.offset || 0) >= (a.to.offset || 0)) {
      return false;
    }
  }

  return true;
}

/**
 * Get union of two ranges (smallest range containing both)
 */
export function rangeUnion(a: Range, b: Range): Range {
  const fromCompare = comparePaths(a.from.path, b.from.path);
  const toCompare = comparePaths(a.to.path, b.to.path);

  const from =
    fromCompare < 0 ? a.from : fromCompare > 0 ? b.from :
    (a.from.offset || 0) < (b.from.offset || 0) ? a.from : b.from;

  const to =
    toCompare > 0 ? a.to : toCompare < 0 ? b.to :
    (a.to.offset || 0) > (b.to.offset || 0) ? a.to : b.to;

  return { from, to };
}

/**
 * Get intersection of two ranges (null if no overlap)
 */
export function rangeIntersection(a: Range, b: Range): Range | null {
  if (!rangesOverlap(a, b)) {
    return null;
  }

  const fromCompare = comparePaths(a.from.path, b.from.path);
  const toCompare = comparePaths(a.to.path, b.to.path);

  const from =
    fromCompare > 0 ? a.from : fromCompare < 0 ? b.from :
    (a.from.offset || 0) > (b.from.offset || 0) ? a.from : b.from;

  const to =
    toCompare < 0 ? a.to : toCompare > 0 ? b.to :
    (a.to.offset || 0) < (b.to.offset || 0) ? a.to : b.to;

  return { from, to };
}

/**
 * Check if range contains position
 */
export function rangeContains(range: Range, pos: NodePosition): boolean {
  const fromCompare = comparePaths(range.from.path, pos.path);
  const toCompare = comparePaths(pos.path, range.to.path);

  if (fromCompare > 0 || toCompare > 0) {
    return false;
  }

  if (fromCompare === 0) {
    if ((range.from.offset || 0) > (pos.offset || 0)) {
      return false;
    }
  }

  if (toCompare === 0) {
    if ((pos.offset || 0) > (range.to.offset || 0)) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Position Validation
// ============================================================================

/**
 * Validate position in tree
 */
export function isValidPosition(tree: DocumentTree, pos: NodePosition): boolean {
  const node = tree.getNodeAt(pos.path);
  if (!node) {
    return false;
  }

  // Check offset for text nodes
  if (isTextNode(node)) {
    const offset = pos.offset || 0;
    return offset >= 0 && offset <= node.text.length;
  }

  return true;
}

/**
 * Normalize position (ensure valid)
 */
export function normalizePosition(
  tree: DocumentTree,
  pos: NodePosition
): NodePosition {
  const node = tree.getNodeAt(pos.path);
  if (!node) {
    // Return start of document
    return { path: [0], offset: 0 };
  }

  if (isTextNode(node)) {
    const offset = Math.max(0, Math.min(pos.offset || 0, node.text.length));
    return { path: pos.path, offset };
  }

  return { path: pos.path, offset: 0 };
}
