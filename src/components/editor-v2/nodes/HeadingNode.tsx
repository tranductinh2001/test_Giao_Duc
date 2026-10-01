/**
 * Heading Node Component
 */

"use client";

import type { HeadingNode as HeadingNodeType } from "@/core/document/types";
import React from "react";

interface HeadingNodeProps {
  node: HeadingNodeType;
  path: number[];
}

export function HeadingNode({ node }: HeadingNodeProps) {
  const level = node.attrs.level;
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

  const sizes: Record<number, string> = {
    1: "2rem",
    2: "1.75rem",
    3: "1.5rem",
    4: "1.25rem",
    5: "1.125rem",
    6: "1rem",
  };

  return (
    <Tag
      className="editor-heading"
      style={{
        fontSize: sizes[level],
        fontWeight: 700,
        marginBottom: "0.75rem",
        marginTop: "1rem",
        color: "#111827",
      }}
      data-node-id={node.id}
    >
      {/* Content will be rendered by DocumentRenderer */}
    </Tag>
  );
}
