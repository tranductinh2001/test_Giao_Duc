/**
 * Text Node Component
 */

"use client";

import type { TextNode as TextNodeType } from "@/core/document/types";

interface TextNodeProps {
  node: TextNodeType;
  path: number[];
}

export function TextNode({ node }: TextNodeProps) {
  const marks = node.marks || [];

  const style: React.CSSProperties = {};
  const className = "editor-text";

  // Apply marks
  if (marks.some((m) => m.type === "bold")) {
    style.fontWeight = 700;
  }
  if (marks.some((m) => m.type === "italic")) {
    style.fontStyle = "italic";
  }
  if (marks.some((m) => m.type === "underline")) {
    style.textDecoration = "underline";
  }
  if (marks.some((m) => m.type === "strike")) {
    style.textDecoration = "line-through";
  }
  if (marks.some((m) => m.type === "code")) {
    style.fontFamily = "monospace";
    style.backgroundColor = "#f3f4f6";
    style.padding = "0.125rem 0.25rem";
    style.borderRadius = "0.25rem";
  }

  const highlightMark = marks.find((m) => m.type === "highlight");
  if (highlightMark) {
    style.backgroundColor = (highlightMark as any).attrs?.color || "#fef08a";
  }

  const linkMark = marks.find((m) => m.type === "link");
  if (linkMark) {
    return (
      <a
        href={(linkMark as any).attrs?.href || "#"}
        target={(linkMark as any).attrs?.target || "_self"}
        style={{ ...style, color: "#3b82f6", textDecoration: "underline" }}
        data-node-id={node.id}
      >
        {node.text}
      </a>
    );
  }

  return (
    <span className={className} style={style} data-node-id={node.id}>
      {node.text}
    </span>
  );
}
