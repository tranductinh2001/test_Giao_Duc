/**
 * Document Tree
 *
 * Provides tree traversal, query, and manipulation methods for the document.
 * All operations return new instances (immutable).
 */

import type {
  DocumentNode,
  DocumentRootNode,
  ContainerNode,
  TextNode,
  NodePosition,
  NodeRange,
} from "./types";
import { isContainerNode, isTextNode, NodeType } from "./types";

// ============================================================================
// Document Tree Class
// ============================================================================

export class DocumentTree {
  constructor(public readonly root: DocumentRootNode) {}

  // ==========================================================================
  // Tree Traversal
  // ==========================================================================

  /**
   * Traverse the tree depth-first (pre-order)
   */
  traverse(callback: (node: DocumentNode, path: number[]) => void): void {
    const visit = (node: DocumentNode, path: number[]) => {
      callback(node, path);

      if (isContainerNode(node)) {
        node.content.forEach((child, index) => {
          visit(child, [...path, index]);
        });
      }
    };

    visit(this.root, []);
  }

  /**
   * Traverse the tree breadth-first
   */
  traverseBFS(callback: (node: DocumentNode, path: number[]) => void): void {
    const queue: Array<{ node: DocumentNode; path: number[] }> = [
      { node: this.root, path: [] },
    ];

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      callback(node, path);

      if (isContainerNode(node)) {
        node.content.forEach((child, index) => {
          queue.push({ node: child, path: [...path, index] });
        });
      }
    }
  }

  /**
   * Get all nodes matching a predicate
   */
  findAll(
    predicate: (node: DocumentNode, path: number[]) => boolean
  ): Array<{ node: DocumentNode; path: number[] }> {
    const results: Array<{ node: DocumentNode; path: number[] }> = [];

    this.traverse((node, path) => {
      if (predicate(node, path)) {
        results.push({ node, path });
      }
    });

    return results;
  }

  /**
   * Find first node matching a predicate
   */
  find(
    predicate: (node: DocumentNode, path: number[]) => boolean
  ): { node: DocumentNode; path: number[] } | null {
    let result: { node: DocumentNode; path: number[] } | null = null;

    const visit = (node: DocumentNode, path: number[]): boolean => {
      if (predicate(node, path)) {
        result = { node, path };
        return true; // Stop traversal
      }

      if (isContainerNode(node)) {
        for (let i = 0; i < node.content.length; i++) {
          if (visit(node.content[i], [...path, i])) {
            return true;
          }
        }
      }

      return false;
    };

    visit(this.root, []);
    return result;
  }

  // ==========================================================================
  // Node Queries
  // ==========================================================================

  /**
   * Get node at specific path
   */
  getNodeAt(path: number[]): DocumentNode | null {
    let current: DocumentNode = this.root;

    for (const index of path) {
      if (!isContainerNode(current)) {
        return null;
      }
      if (index < 0 || index >= current.content.length) {
        return null;
      }
      current = current.content[index];
    }

    return current;
  }

  /**
   * Get node by ID
   */
  getNodeById(id: string): { node: DocumentNode; path: number[] } | null {
    return this.find((node) => node.id === id);
  }

  /**
   * Get all text nodes
   */
  getAllTextNodes(): Array<{ node: TextNode; path: number[] }> {
    return this.findAll((node): node is TextNode => isTextNode(node)) as Array<{
      node: TextNode;
      path: number[];
    }>;
  }

  /**
   * Get parent node
   */
  getParent(path: number[]): { node: ContainerNode; path: number[] } | null {
    if (path.length === 0) {
      return null; // Root has no parent
    }

    const parentPath = path.slice(0, -1);
    const parent = this.getNodeAt(parentPath);

    if (!parent || !isContainerNode(parent)) {
      return null;
    }

    return { node: parent, path: parentPath };
  }

  /**
   * Get siblings of a node
   */
  getSiblings(path: number[]): DocumentNode[] {
    const parent = this.getParent(path);
    if (!parent) {
      return [];
    }

    return parent.node.content;
  }

  /**
   * Get previous sibling
   */
  getPreviousSibling(path: number[]): DocumentNode | null {
    if (path.length === 0) {
      return null;
    }

    const siblings = this.getSiblings(path);
    const index = path[path.length - 1];

    if (index === 0) {
      return null;
    }

    return siblings[index - 1] || null;
  }

  /**
   * Get next sibling
   */
  getNextSibling(path: number[]): DocumentNode | null {
    if (path.length === 0) {
      return null;
    }

    const siblings = this.getSiblings(path);
    const index = path[path.length - 1];

    return siblings[index + 1] || null;
  }

  // ==========================================================================
  // Tree Statistics
  // ==========================================================================

  /**
   * Count total nodes
   */
  countNodes(): number {
    let count = 0;
    this.traverse(() => count++);
    return count;
  }

  /**
   * Count nodes of specific type
   */
  countNodesByType(type: NodeType): number {
    let count = 0;
    this.traverse((node) => {
      if (node.type === type) {
        count++;
      }
    });
    return count;
  }

  /**
   * Get tree depth
   */
  getDepth(): number {
    let maxDepth = 0;

    this.traverse((_, path) => {
      maxDepth = Math.max(maxDepth, path.length);
    });

    return maxDepth;
  }

  /**
   * Get text content (concatenated)
   */
  getTextContent(): string {
    const textParts: string[] = [];

    this.traverse((node) => {
      if (isTextNode(node)) {
        textParts.push(node.text);
      }
    });

    return textParts.join("");
  }

  // ==========================================================================
  // Tree Manipulation (returns new tree)
  // ==========================================================================

  /**
   * Replace node at path (immutable)
   */
  replaceNode(path: number[], newNode: DocumentNode): DocumentTree {
    const newRoot = this.replaceNodeRecursive(this.root, path, 0, newNode);
    return new DocumentTree(newRoot as DocumentRootNode);
  }

  private replaceNodeRecursive(
    node: DocumentNode,
    path: number[],
    depth: number,
    newNode: DocumentNode
  ): DocumentNode {
    if (depth === path.length) {
      return newNode;
    }

    if (!isContainerNode(node)) {
      return node;
    }

    const index = path[depth];
    const newContent = [...node.content];
    newContent[index] = this.replaceNodeRecursive(
      newContent[index],
      path,
      depth + 1,
      newNode
    );

    return {
      ...node,
      content: newContent,
    };
  }

  /**
   * Insert node at path (immutable)
   */
  insertNode(parentPath: number[], index: number, newNode: DocumentNode): DocumentTree {
    const parent = this.getNodeAt(parentPath);

    if (!parent || !isContainerNode(parent)) {
      throw new Error("Cannot insert into non-container node");
    }

    const newContent = [...parent.content];
    newContent.splice(index, 0, newNode);

    const newParent = {
      ...parent,
      content: newContent,
    };

    return this.replaceNode(parentPath, newParent);
  }

  /**
   * Delete node at path (immutable)
   */
  deleteNode(path: number[]): DocumentTree {
    if (path.length === 0) {
      throw new Error("Cannot delete root node");
    }

    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];
    const parent = this.getNodeAt(parentPath);

    if (!parent || !isContainerNode(parent)) {
      throw new Error("Parent is not a container node");
    }

    const newContent = [...parent.content];
    newContent.splice(index, 1);

    const newParent = {
      ...parent,
      content: newContent,
    };

    return this.replaceNode(parentPath, newParent);
  }

  /**
   * Update node attributes (immutable)
   */
  updateAttrs(path: number[], attrs: Record<string, any>): DocumentTree {
    const node = this.getNodeAt(path);

    if (!node) {
      throw new Error("Node not found at path");
    }

    const newNode = {
      ...node,
      attrs: {
        ...node.attrs,
        ...attrs,
      },
      metadata: {
        ...node.metadata,
        updatedAt: new Date(),
      },
    } as DocumentNode;

    return this.replaceNode(path, newNode);
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Serialize to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.root, (key, value) => {
      // Convert Date objects to ISO strings
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json: string): DocumentTree {
    const root = JSON.parse(json, (key, value) => {
      // Convert ISO strings back to Date objects
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value);
      }
      return value;
    });

    return new DocumentTree(root);
  }

  /**
   * Clone the tree
   */
  clone(): DocumentTree {
    const json = this.toJSON();
    return DocumentTree.fromJSON(json);
  }

  // ==========================================================================
  // Comparison
  // ==========================================================================

  /**
   * Check if two trees are equal
   */
  equals(other: DocumentTree): boolean {
    return this.toJSON() === other.toJSON();
  }

  /**
   * Get diff between two trees (simplified)
   */
  diff(other: DocumentTree): {
    added: number;
    removed: number;
    modified: number;
  } {
    const thisNodes = new Map<string, DocumentNode>();
    const otherNodes = new Map<string, DocumentNode>();

    this.traverse((node) => {
      thisNodes.set(node.id, node);
    });

    other.traverse((node) => {
      otherNodes.set(node.id, node);
    });

    let added = 0;
    let removed = 0;
    let modified = 0;

    // Check for removed nodes
    thisNodes.forEach((node, id) => {
      if (!otherNodes.has(id)) {
        removed++;
      }
    });

    // Check for added and modified nodes
    otherNodes.forEach((node, id) => {
      if (!thisNodes.has(id)) {
        added++;
      } else {
        const thisNode = thisNodes.get(id)!;
        if (JSON.stringify(thisNode) !== JSON.stringify(node)) {
          modified++;
        }
      }
    });

    return { added, removed, modified };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if path is valid
 */
export function isValidPath(tree: DocumentTree, path: number[]): boolean {
  return tree.getNodeAt(path) !== null;
}

/**
 * Compare two paths
 */
export function comparePaths(a: number[], b: number[]): number {
  const minLength = Math.min(a.length, b.length);

  for (let i = 0; i < minLength; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }

  return a.length - b.length;
}

/**
 * Check if path A is ancestor of path B
 */
export function isAncestor(ancestor: number[], descendant: number[]): boolean {
  if (ancestor.length >= descendant.length) {
    return false;
  }

  for (let i = 0; i < ancestor.length; i++) {
    if (ancestor[i] !== descendant[i]) {
      return false;
    }
  }

  return true;
}
