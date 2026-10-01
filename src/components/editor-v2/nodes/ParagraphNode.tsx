/**
 * Paragraph Node Component
 */

"use client";

import type { ParagraphNode as ParagraphNodeType } from "@/core/document/types";

interface ParagraphNodeProps {
  node: ParagraphNodeType;
  path: number[];
}

export function ParagraphNode({ node }: ParagraphNodeProps) {
  const align = node.attrs?.align || "left";

  return (
    <p
      className="editor-paragraph"
      style={{
        marginBottom: "0.75rem",
        textAlign: align,
        lineHeight: 1.6,
      }}
      data-node-id={node.id}
    >
      {/* Content will be rendered by DocumentRenderer */}
    </p>
  );
}
