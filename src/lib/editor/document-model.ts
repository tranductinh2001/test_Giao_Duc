// Core Document Model for Lesson Plan Editor
// This is the single source of truth for document structure

export interface DocumentNode {
  type: string;
  attrs?: Record<string, any>;
  content?: DocumentNode[];
  text?: string;
  marks?: Mark[];
}

export interface Mark {
  type: string;
  attrs?: Record<string, any>;
}

// Lesson Plan specific node types
export enum NodeType {
  Document = "doc",
  Section = "section",
  Heading = "heading",
  Paragraph = "paragraph",
  Text = "text",
  Objective = "objective",
  Activity = "activity",
  Table = "table",
  TableRow = "tableRow",
  TableCell = "tableCell",
  BulletList = "bulletList",
  OrderedList = "orderedList",
  ListItem = "listItem",
  Image = "image",
}

// Review-specific mark types
export enum MarkType {
  Highlight = "highlight",
  Comment = "comment",
  Suggestion = "suggestion",
  Link = "link",
  Bold = "bold",
  Italic = "italic",
}

// Review annotation model
export interface ReviewAnnotation {
  id: string;
  type: "comment" | "suggestion" | "issue";
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  range: {
    from: number;
    to: number;
  };
  content: {
    message: string;
    explanation?: string;
    suggestion?: string;
    proposedContent?: string;
  };
  metadata: {
    sectionId?: string;
    ruleId?: string;
    createdAt: Date;
    createdBy: string;
  };
}

// Section metadata
export interface SectionMetadata {
  id: string;
  type: string;
  title: string;
  order: number;
  score?: number;
  issueCount?: number;
}

// Document structure
export interface LessonPlanDocument {
  id: string;
  title: string;
  content: DocumentNode;
  sections: SectionMetadata[];
  annotations: ReviewAnnotation[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
}
