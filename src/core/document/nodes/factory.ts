/**
 * Node Factory
 *
 * Factory functions for creating document nodes.
 * All nodes are created through these factories to ensure consistency.
 */

import { nanoid } from "nanoid";
import type {
  DocumentNode,
  DocumentRootNode,
  SectionNode,
  HeadingNode,
  ParagraphNode,
  TextNode,
  ListNode,
  ListItemNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  ObjectiveNode,
  ActivityNode,
  ImageNode,
  Mark,
} from "../types";
import { NodeType } from "../types";

// ============================================================================
// Factory Options
// ============================================================================

interface BaseNodeOptions {
  id?: string;
  attrs?: Record<string, any>;
  metadata?: Record<string, any>;
}

// ============================================================================
// Document Root
// ============================================================================

export function createDocument(
  content: DocumentNode[] = [],
  options: BaseNodeOptions & { title?: string; version?: number } = {}
): DocumentRootNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.Document,
    content,
    attrs: {
      title: options.title,
      version: options.version || 1,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

// ============================================================================
// Section
// ============================================================================

export function createSection(
  sectionType: string,
  title: string,
  content: DocumentNode[] = [],
  options: BaseNodeOptions & { order?: number; level?: number } = {}
): SectionNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.Section,
    content,
    attrs: {
      sectionType,
      title,
      order: options.order || 0,
      level: options.level,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

// ============================================================================
// Heading
// ============================================================================

export function createHeading(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  content: DocumentNode[] = [],
  options: BaseNodeOptions = {}
): HeadingNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.Heading,
    content,
    attrs: {
      level,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

// ============================================================================
// Paragraph
// ============================================================================

export function createParagraph(
  content: DocumentNode[] = [],
  options: BaseNodeOptions & {
    align?: "left" | "center" | "right" | "justify";
    indent?: number;
  } = {}
): ParagraphNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.Paragraph,
    content,
    attrs: {
      align: options.align,
      indent: options.indent,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

// ============================================================================
// Text
// ============================================================================

export function createText(
  text: string,
  marks: Mark[] = [],
  options: BaseNodeOptions = {}
): TextNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.Text,
    text,
    marks,
    attrs: options.attrs,
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

// ============================================================================
// List
// ============================================================================

export function createList(
  listType: "bullet" | "ordered",
  content: ListItemNode[] = [],
  options: BaseNodeOptions & { start?: number } = {}
): ListNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.List,
    content,
    attrs: {
      listType,
      start: options.start,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

export function createListItem(
  content: DocumentNode[] = [],
  options: BaseNodeOptions & { checked?: boolean } = {}
): ListItemNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.ListItem,
    content,
    attrs: {
      checked: options.checked,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

// ============================================================================
// Table
// ============================================================================

export function createTable(
  content: TableRowNode[] = [],
  options: BaseNodeOptions & { columns?: number; hasHeader?: boolean } = {}
): TableNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.Table,
    content,
    attrs: {
      columns: options.columns,
      hasHeader: options.hasHeader,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

export function createTableRow(
  content: TableCellNode[] = [],
  options: BaseNodeOptions & { isHeader?: boolean } = {}
): TableRowNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.TableRow,
    content,
    attrs: {
      isHeader: options.isHeader,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

export function createTableCell(
  content: DocumentNode[] = [],
  options: BaseNodeOptions & {
    colspan?: number;
    rowspan?: number;
    align?: "left" | "center" | "right";
  } = {}
): TableCellNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.TableCell,
    content,
    attrs: {
      colspan: options.colspan,
      rowspan: options.rowspan,
      align: options.align,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

// ============================================================================
// Lesson Plan Specific
// ============================================================================

export function createObjective(
  content: DocumentNode[] = [],
  options: BaseNodeOptions & { objectiveType?: string } = {}
): ObjectiveNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.Objective,
    content,
    attrs: {
      objectiveType: options.objectiveType,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

export function createActivity(
  content: DocumentNode[] = [],
  options: BaseNodeOptions & {
    activityType?: string;
    duration?: number;
  } = {}
): ActivityNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.Activity,
    content,
    attrs: {
      activityType: options.activityType,
      duration: options.duration,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

// ============================================================================
// Image
// ============================================================================

export function createImage(
  src: string,
  options: BaseNodeOptions & {
    alt?: string;
    width?: number | string;
    height?: number | string;
    title?: string;
  } = {}
): ImageNode {
  return {
    id: options.id || nanoid(),
    type: NodeType.Image,
    attrs: {
      src,
      alt: options.alt,
      width: options.width,
      height: options.height,
      title: options.title,
      ...options.attrs,
    },
    metadata: {
      createdAt: new Date(),
      ...options.metadata,
    },
  };
}

// ============================================================================
// Helper: Create node from type
// ============================================================================

export function createNodeByType(
  type: NodeType,
  content: DocumentNode[] = [],
  attrs: Record<string, any> = {}
): DocumentNode {
  const options = { attrs };

  switch (type) {
    case NodeType.Document:
      return createDocument(content, options);
    case NodeType.Section:
      return createSection(
        attrs.sectionType || "unknown",
        attrs.title || "",
        content,
        options
      );
    case NodeType.Heading:
      return createHeading(attrs.level || 1, content, options);
    case NodeType.Paragraph:
      return createParagraph(content, options);
    case NodeType.Text:
      return createText(attrs.text || "", attrs.marks || [], options);
    case NodeType.List:
      return createList(
        attrs.listType || "bullet",
        content as ListItemNode[],
        options
      );
    case NodeType.ListItem:
      return createListItem(content, options);
    case NodeType.Table:
      return createTable(content as TableRowNode[], options);
    case NodeType.TableRow:
      return createTableRow(content as TableCellNode[], options);
    case NodeType.TableCell:
      return createTableCell(content, options);
    case NodeType.Objective:
      return createObjective(content, options);
    case NodeType.Activity:
      return createActivity(content, options);
    case NodeType.Image:
      return createImage(attrs.src || "", options);
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}
