/**
 * Section Node Component
 */

"use client";

import type { SectionNode as SectionNodeType } from "@/core/document/types";

interface SectionNodeProps {
  node: SectionNodeType;
  path: number[];
}

export function SectionNode({ node }: SectionNodeProps) {
  return (
    <section
      className="editor-section"
      style={{
        marginBottom: "2rem",
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: "1.5rem",
      }}
      data-section-type={node.attrs.sectionType}
      data-node-id={node.id}
    >
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "1rem",
          color: "#111827",
        }}
      >
        {node.attrs.title}
      </h2>

      <div className="section-content">
        {/* Content will be rendered by DocumentRenderer */}
      </div>
    </section>
  );
}
