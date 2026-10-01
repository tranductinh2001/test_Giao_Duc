/**
 * Document Renderer
 *
 * Renders the document tree to React components
 */

"use client";

import type { DocumentTree } from "@/core/document/DocumentTree";
import type { DocumentNode } from "@/core/document/types";
import { SectionNode } from "./nodes/SectionNode";
import { ParagraphNode } from "./nodes/ParagraphNode";
import { HeadingNode } from "./nodes/HeadingNode";
import { TextNode } from "./nodes/TextNode";

// ============================================================================
// Document Renderer
// ============================================================================

interface DocumentRendererProps {
  document: DocumentTree;
}

export function DocumentRenderer({ document }: DocumentRendererProps) {
  const root = document.root;

  return (
    <div className="document-renderer">
      {root.content.map((node, index) => (
        <NodeRenderer key={node.id} node={node} path={[index]} />
      ))}
    </div>
  );
}

// ============================================================================
// Node Renderer
// ============================================================================

interface NodeRendererProps {
  node: DocumentNode;
  path: number[];
}

function NodeRenderer({ node, path }: NodeRendererProps) {
  switch (node.type) {
    case "section":
      return <SectionNode node={node as any} path={path} />;

    case "heading":
      return <HeadingNode node={node as any} path={path} />;

    case "paragraph":
      return <ParagraphNode node={node as any} path={path} />;

    case "text":
      return <TextNode node={node as any} path={path} />;

    case "list": {
      const list = node as any;
      return (
        <ul className="editor-list" style={{ marginLeft: "1.5rem" }}>
          {list.content?.map((item: DocumentNode, index: number) => (
            <li key={item.id}>
              <NodeRenderer node={item} path={[...path, index]} />
            </li>
          ))}
        </ul>
      );
    }

    case "listItem": {
      const listItem = node as any;
      return (
        <div className="editor-list-item">
          {listItem.content?.map((child: DocumentNode, index: number) => (
            <NodeRenderer key={child.id} node={child} path={[...path, index]} />
          ))}
        </div>
      );
    }

    case "objective": {
      const objective = node as any;
      return (
        <div className="editor-objective" style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f0f9ff", borderLeft: "3px solid #3b82f6", borderRadius: "0.25rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#1e40af" }}>
            Objective
          </div>
          {objective.content?.map((child: DocumentNode, index: number) => (
            <NodeRenderer key={child.id} node={child} path={[...path, index]} />
          ))}
        </div>
      );
    }

    case "activity": {
      const activity = node as any;
      return (
        <div className="editor-activity" style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f0fdf4", borderLeft: "3px solid #10b981", borderRadius: "0.25rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#065f46" }}>
            Activity {activity.attrs?.duration && `(${activity.attrs.duration} min)`}
          </div>
          {activity.content?.map((child: DocumentNode, index: number) => (
            <NodeRenderer key={child.id} node={child} path={[...path, index]} />
          ))}
        </div>
      );
    }

    case "table": {
      const table = node as any;
      return (
        <table className="editor-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
          <tbody>
            {table.content?.map((row: DocumentNode, index: number) => (
              <NodeRenderer key={row.id} node={row} path={[...path, index]} />
            ))}
          </tbody>
        </table>
      );
    }

    case "tableRow": {
      const row = node as any;
      return (
        <tr>
          {row.content?.map((cell: DocumentNode, index: number) => (
            <NodeRenderer key={cell.id} node={cell} path={[...path, index]} />
          ))}
        </tr>
      );
    }

    case "tableCell": {
      const cell = node as any;
      return (
        <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
          {cell.content?.map((child: DocumentNode, index: number) => (
            <NodeRenderer key={child.id} node={child} path={[...path, index]} />
          ))}
        </td>
      );
    }

    case "image": {
      const image = node as any;
      return (
        <img
          src={image.attrs?.src}
          alt={image.attrs?.alt || ""}
          style={{
            maxWidth: "100%",
            height: "auto",
            marginBottom: "1rem",
          }}
        />
      );
    }

    default:
      return null;
  }
}
