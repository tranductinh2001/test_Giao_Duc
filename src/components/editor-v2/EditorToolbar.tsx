/**
 * Editor Ribbon Toolbar
 *
 * Modern, lightweight toolbar with essential editing actions
 */

"use client";

import { useEditor } from "./EditorContext";
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image,
  MessageSquare,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export function EditorToolbar() {
  const { editor } = useEditor();

  const toolbarGroups = [
    {
      name: "History",
      items: [
        {
          icon: Undo,
          label: "Undo",
          onClick: () => editor.undo(),
          disabled: !editor.canUndo(),
        },
        {
          icon: Redo,
          label: "Redo",
          onClick: () => editor.redo(),
          disabled: !editor.canRedo(),
        },
      ],
    },
    {
      name: "Format",
      items: [
        { icon: Bold, label: "Bold", onClick: () => {}, disabled: false },
        { icon: Italic, label: "Italic", onClick: () => {}, disabled: false },
        { icon: Underline, label: "Underline", onClick: () => {}, disabled: false },
      ],
    },
    {
      name: "Align",
      items: [
        { icon: AlignLeft, label: "Align Left", onClick: () => {}, disabled: false },
        { icon: AlignCenter, label: "Align Center", onClick: () => {}, disabled: false },
        { icon: AlignRight, label: "Align Right", onClick: () => {}, disabled: false },
      ],
    },
    {
      name: "Lists",
      items: [
        { icon: List, label: "Bullet List", onClick: () => {}, disabled: false },
        { icon: ListOrdered, label: "Numbered List", onClick: () => {}, disabled: false },
      ],
    },
    {
      name: "Insert",
      items: [
        { icon: Image, label: "Image", onClick: () => {}, disabled: false },
        { icon: MessageSquare, label: "Comment", onClick: () => {}, disabled: false },
      ],
    },
    {
      name: "View",
      items: [
        { icon: Search, label: "Search", onClick: () => {}, disabled: false },
        { icon: ZoomIn, label: "Zoom In", onClick: () => {}, disabled: false },
        { icon: ZoomOut, label: "Zoom Out", onClick: () => {}, disabled: false },
      ],
    },
  ];

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-1 flex-shrink-0">
      {toolbarGroups.map((group, groupIndex) => (
        <div key={group.name} className="flex items-center">
          {groupIndex > 0 && (
            <div className="w-px h-6 bg-gray-200 mx-2" />
          )}
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                disabled={item.disabled}
                className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={item.label}
              >
                <Icon className="w-4 h-4 text-gray-700" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
