/**
 * Editor V2 Test Page
 *
 * Demo page to test the new editor
 */

"use client";

import { EditorRoot } from "@/components/editor-v2";
import { createDocument, createSection, createParagraph, createText, createHeading, MarkType } from "@/core";

export default function EditorTestPage() {
  // Create sample document
  const sampleDoc = createDocument(
    [
      createSection(
        "objective",
        "Lesson Objectives",
        [
          createParagraph([
            createText("Students will be able to identify and use "),
            createText("past simple tense", [{ type: MarkType.Bold }]),
            createText(" in sentences."),
          ]),
          createParagraph([
            createText("Students will understand the difference between "),
            createText("regular", [{ type: MarkType.Italic }]),
            createText(" and "),
            createText("irregular", [{ type: MarkType.Italic }]),
            createText(" verbs."),
          ]),
        ],
        { order: 0 }
      ),
      createSection(
        "activity",
        "Warm-up Activity",
        [
          createParagraph([
            createText("Show students a picture and ask them to describe what happened yesterday."),
          ]),
          createParagraph([
            createText("Example: "),
            createText("Yesterday, I went to the park.", [{ type: MarkType.Code }]),
          ]),
        ],
        { order: 1 }
      ),
      createSection(
        "practice",
        "Practice Exercises",
        [
          createHeading(2, [createText("Exercise 1: Fill in the blanks")]),
          createParagraph([
            createText("Complete the sentences with the correct form of the verb in brackets."),
          ]),
          createParagraph([
            createText("1. Yesterday, I _____ (go) to the cinema."),
          ]),
          createParagraph([
            createText("2. She _____ (eat) breakfast at 7am."),
          ]),
        ],
        { order: 2 }
      ),
    ],
    { title: "Past Simple Tense - Lesson Plan" }
  );

  const handleSave = (doc: any) => {
    console.log("Saving document:", doc);
    alert("Document saved! (Check console)");
  };

  const handleUpdate = (doc: any) => {
    console.log("Document updated");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Editor V2 - Test Page</h1>
            <p className="text-gray-600">
              New architecture with immutable document model, command pattern, and full undo/redo.
            </p>
          </div>

          <div className="mb-4 flex gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              ✅ Document Model
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              ✅ Commands
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              ✅ History
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              ✅ React Components
            </span>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <EditorRoot
              initialDocument={sampleDoc}
              config={{
                editable: true,
                maxHistorySize: 100,
              }}
              onSave={handleSave}
              onUpdate={handleUpdate}
              className="editor-test"
            />
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold mb-2">Keyboard Shortcuts:</h3>
            <ul className="text-sm space-y-1">
              <li>• <kbd className="px-2 py-1 bg-white rounded border">Ctrl/Cmd + Z</kbd> - Undo</li>
              <li>• <kbd className="px-2 py-1 bg-white rounded border">Ctrl/Cmd + Shift + Z</kbd> - Redo</li>
              <li>• <kbd className="px-2 py-1 bg-white rounded border">Ctrl/Cmd + S</kbd> - Save</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold mb-2">✅ Architecture Complete:</h3>
            <ul className="text-sm space-y-1">
              <li>• Document Model (Immutable tree structure)</li>
              <li>• Selection System (Cursor & ranges)</li>
              <li>• Command Layer (Undo/redo ready)</li>
              <li>• History Manager (100-level stack)</li>
              <li>• Annotation System (AI review ready)</li>
              <li>• Review Engine (AI integration)</li>
              <li>• Import/Export (DOCX support)</li>
              <li>• Editor Core (Orchestration)</li>
              <li>• React Components (UI rendering)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
