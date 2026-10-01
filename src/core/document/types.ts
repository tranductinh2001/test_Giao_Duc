/**
 * Core Document Model
 *
 * This is the single source of truth for the document structure.
 * All components, commands, and AI interact through this model.
 *
 * Design Principles:
 * - Immutable: Every change creates a new node
 * - Type-safe: Full TypeScript typing
 * - Serializable: Can be saved/loaded as JSON
 * - Semantic: Represents document meaning, not rendering
 */

// ============================================================================
// Base Node Types
// ============================================================================

/**
 * Base node interface that all document nodes extend
 */
export interface BaseNode {
  /** Unique identifier for the node */
  id: string;

  /** Node type discriminator */
  type: NodeType;

  /** Arbitrary attributes for the node */
  attrs?: Record<string, any>;

  /** Optional metadata */
  metadata?: {
    createdAt?: Date;
    updatedAt?: Date;
    [key: string]: any;
  };
}

/**
 * Node that can contain other nodes
 */
export interface ContainerNode extends BaseNode {
  /** Child nodes */
  content: DocumentNode[];
}

/**
 * Node that contains text
 */
export interface TextNode extends BaseNode {
  type: NodeType.Text;
  /** Text content */
  text: string;
  /** Text marks (bold, italic, etc.) */
  marks?: Mark[];
}

/**
 * Union type of all possible document nodes
 */
export type DocumentNode =
  | DocumentRootNode
  | SectionNode
  | HeadingNode
  | ParagraphNode
  | TextNode
  | ListNode
  | ListItemNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | ObjectiveNode
  | ActivityNode
  | ImageNode;

// ============================================================================
// Node Type Enum
// ============================================================================

export enum NodeType {
  Document = "document",
  Section = "section",
  Heading = "heading",
  Paragraph = "paragraph",
  Text = "text",
  List = "list",
  ListItem = "listItem",
  Table = "table",
  TableRow = "tableRow",
  TableCell = "tableCell",

  // Lesson plan specific
  Objective = "objective",
  Activity = "activity",

  // Media
  Image = "image",
}

// ============================================================================
// Specific Node Definitions
// ============================================================================

/**
 * Root document node
 */
export interface DocumentRootNode extends ContainerNode {
  type: NodeType.Document;
  attrs: {
    title?: string;
    version?: number;
  };
}

/**
 * Section node - represents major sections of the lesson plan
 */
export interface SectionNode extends ContainerNode {
  type: NodeType.Section;
  attrs: {
    /** Section type (e.g., "objective", "activity", "assessment") */
    sectionType: string;
    /** Section title */
    title: string;
    /** Section order in document */
    order: number;
    /** Section level (1-6) */
    level?: number;
  };
}

/**
 * Heading node
 */
export interface HeadingNode extends ContainerNode {
  type: NodeType.Heading;
  attrs: {
    /** Heading level (1-6) */
    level: 1 | 2 | 3 | 4 | 5 | 6;
  };
}

/**
 * Paragraph node
 */
export interface ParagraphNode extends ContainerNode {
  type: NodeType.Paragraph;
  attrs?: {
    /** Text alignment */
    align?: "left" | "center" | "right" | "justify";
    /** Indentation level */
    indent?: number;
  };
}

/**
 * List node (bullet or ordered)
 */
export interface ListNode extends ContainerNode {
  type: NodeType.List;
  attrs: {
    /** List type */
    listType: "bullet" | "ordered";
    /** Starting number for ordered lists */
    start?: number;
  };
}

/**
 * List item node
 */
export interface ListItemNode extends ContainerNode {
  type: NodeType.ListItem;
  attrs?: {
    /** Whether this item is checked (for task lists) */
    checked?: boolean;
  };
}

/**
 * Table node
 */
export interface TableNode extends ContainerNode {
  type: NodeType.Table;
  attrs?: {
    /** Number of columns */
    columns?: number;
    /** Whether first row is header */
    hasHeader?: boolean;
  };
}

/**
 * Table row node
 */
export interface TableRowNode extends ContainerNode {
  type: NodeType.TableRow;
  attrs?: {
    /** Whether this is a header row */
    isHeader?: boolean;
  };
}

/**
 * Table cell node
 */
export interface TableCellNode extends ContainerNode {
  type: NodeType.TableCell;
  attrs?: {
    /** Column span */
    colspan?: number;
    /** Row span */
    rowspan?: number;
    /** Cell alignment */
    align?: "left" | "center" | "right";
  };
}

/**
 * Objective node - lesson plan specific
 */
export interface ObjectiveNode extends ContainerNode {
  type: NodeType.Objective;
  attrs: {
    /** Objective type (e.g., "knowledge", "skills", "attitude") */
    objectiveType?: string;
  };
}

/**
 * Activity node - lesson plan specific
 */
export interface ActivityNode extends ContainerNode {
  type: NodeType.Activity;
  attrs: {
    /** Activity type (e.g., "warm-up", "practice", "production") */
    activityType?: string;
    /** Duration in minutes */
    duration?: number;
  };
}

/**
 * Image node
 */
export interface ImageNode extends BaseNode {
  type: NodeType.Image;
  attrs: {
    /** Image source URL */
    src: string;
    /** Alt text */
    alt?: string;
    /** Width in pixels or percentage */
    width?: number | string;
    /** Height in pixels or percentage */
    height?: number | string;
    /** Title */
    title?: string;
  };
}

// ============================================================================
// Text Marks
// ============================================================================

/**
 * Mark type enum
 */
export enum MarkType {
  Bold = "bold",
  Italic = "italic",
  Underline = "underline",
  Strike = "strike",
  Code = "code",
  Link = "link",
  Highlight = "highlight",
  Comment = "comment",
}

/**
 * Base mark interface
 */
export interface BaseMark {
  type: MarkType;
  attrs?: Record<string, any>;
}

/**
 * Link mark
 */
export interface LinkMark extends BaseMark {
  type: MarkType.Link;
  attrs: {
    href: string;
    title?: string;
    target?: "_blank" | "_self";
  };
}

/**
 * Highlight mark
 */
export interface HighlightMark extends BaseMark {
  type: MarkType.Highlight;
  attrs?: {
    color?: string;
  };
}

/**
 * Comment mark (for AI annotations)
 */
export interface CommentMark extends BaseMark {
  type: MarkType.Comment;
  attrs: {
    /** Comment ID */
    commentId: string;
  };
}

/**
 * Union type of all marks
 */
export type Mark =
  | BaseMark
  | LinkMark
  | HighlightMark
  | CommentMark;

// ============================================================================
// Node Type Guards
// ============================================================================

export function isContainerNode(node: DocumentNode): node is DocumentRootNode | SectionNode | HeadingNode | ParagraphNode | ListNode | ListItemNode | TableNode | TableRowNode | TableCellNode | ObjectiveNode | ActivityNode {
  return "content" in node && Array.isArray(node.content);
}

export function isTextNode(node: DocumentNode): node is TextNode {
  return node.type === NodeType.Text;
}

export function isSectionNode(node: DocumentNode): node is SectionNode {
  return node.type === NodeType.Section;
}

export function isParagraphNode(node: DocumentNode): node is ParagraphNode {
  return node.type === NodeType.Paragraph;
}

export function isHeadingNode(node: DocumentNode): node is HeadingNode {
  return node.type === NodeType.Heading;
}

export function isListNode(node: DocumentNode): node is ListNode {
  return node.type === NodeType.List;
}

export function isTableNode(node: DocumentNode): node is TableNode {
  return node.type === NodeType.Table;
}

// ============================================================================
// Node Position
// ============================================================================

/**
 * Position in the document
 */
export interface NodePosition {
  /** Path to the node (array of indices) */
  path: number[];
  /** Character offset within text node (if applicable) */
  offset?: number;
}

/**
 * Range in the document
 */
export interface NodeRange {
  /** Start position */
  from: NodePosition;
  /** End position */
  to: NodePosition;
}

// ============================================================================
// Node Validation
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Validate node structure
 */
export function validateNode(node: DocumentNode): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!node.id) {
    errors.push("Node must have an id");
  }
  if (!node.type) {
    errors.push("Node must have a type");
  }

  // Check container nodes have content
  if (isContainerNode(node)) {
    if (!Array.isArray(node.content)) {
      errors.push("Container node must have content array");
    }
  }

  // Check text nodes have text
  if (isTextNode(node)) {
    if (typeof node.text !== "string") {
      errors.push("Text node must have text string");
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
