/**
 * Core Document Module
 *
 * Main entry point for document model
 */

// Types
export * from "./types";

// Node factory
export * from "./nodes/factory";

// Document tree
export { DocumentTree, isValidPath, comparePaths, isAncestor } from "./DocumentTree";

// Re-export commonly used types
export type {
  DocumentNode,
  DocumentRootNode,
  SectionNode,
  ParagraphNode,
  TextNode,
  HeadingNode,
  ListNode,
  ListItemNode,
  TableNode,
  Mark,
  NodePosition,
  NodeRange,
} from "./types";
