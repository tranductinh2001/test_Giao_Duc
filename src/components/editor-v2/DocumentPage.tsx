/**
 * Document Page Component
 *
 * Renders a single A4-sized page with:
 * - White background
 * - Subtle shadow
 * - Rounded corners
 * - Page margins
 * - Realistic spacing
 */

"use client";

import type { SectionNode } from "@/core/document/types";
import { ParagraphNode } from "./nodes/ParagraphNode";
import { HeadingNode } from "./nodes/HeadingNode";
import { TextNode } from "./nodes/TextNode";

interface DocumentPageProps {
  section: SectionNode;
}

export function DocumentPage({ section }: DocumentPageProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      style={{
        width: "210mm", // A4 width
        minHeight: "297mm", // A4 height
      }}
    >
      {/* Page Content with Margins */}
      <div
        className="p-20"
        style={{
          // A4 standard margins: 2.5cm = ~25mm
          paddingTop: "25mm",
          paddingBottom: "25mm",
          paddingLeft: "25mm",
          paddingRight: "25mm",
        }}
      >
        {/* Section Title */}
        {section.attrs?.title && (
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-gray-200">
            {section.attrs.title}
          </h2>
        )}

        {/* Section Content */}
        <div className="space-y-4">
          {section.content?.map((node, index) => {
            switch (node.type) {
              case "heading":
                return <HeadingNode key={node.id} node={node as any} path={[index]} />;
              case "paragraph":
                return <ParagraphNode key={node.id} node={node as any} path={[index]} />;
              case "text":
                return <TextNode key={node.id} node={node as any} path={[index]} />;
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}
