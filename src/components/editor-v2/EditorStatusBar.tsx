/**
 * Editor Status Bar
 *
 * Professional bottom status bar showing document info
 */

"use client";

import { useEditor } from "./EditorContext";

export function EditorStatusBar() {
  const { state } = useEditor();

  const sections = state.document.root.content.filter(
    (node) => node.type === "section"
  );

  // Calculate word count
  const wordCount = calculateWordCount(state.document.root);

  return (
    <div className="h-8 bg-white border-t border-gray-200 flex items-center px-4 text-xs text-gray-600 flex-shrink-0">
      <div className="flex items-center gap-6">
        <div>
          Page <span className="font-medium">1</span> of{" "}
          <span className="font-medium">{sections.length || 1}</span>
        </div>

        <div className="w-px h-4 bg-gray-300" />

        <div>
          <span className="font-medium">{wordCount}</span> words
        </div>

        <div className="w-px h-4 bg-gray-300" />

        <div>Language: English</div>

        <div className="w-px h-4 bg-gray-300" />

        <div>Zoom: 100%</div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        {state.isEditable ? (
          <span className="text-green-600 font-medium">● Editing</span>
        ) : (
          <span className="text-gray-500">Read Only</span>
        )}
      </div>
    </div>
  );
}

function calculateWordCount(node: any): number {
  let count = 0;

  function traverse(n: any) {
    if (n.type === "text" && n.text) {
      count += n.text.split(/\s+/).filter((w: string) => w.length > 0).length;
    }

    if (n.content && Array.isArray(n.content)) {
      for (const child of n.content) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return count;
}
