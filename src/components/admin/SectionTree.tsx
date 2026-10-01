/**
 * Section Tree Component
 * Hierarchical section management with drag & drop
 */

"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, GripVertical } from "lucide-react";
import Button from "@/components/ui/button";

interface Section {
  id: string;
  code: string;
  name: string;
  order: number;
  level: number;
  parentId: string | null;
  isRequired: boolean;
  children?: Section[];
}

interface SectionTreeProps {
  sections: Section[];
  templateId: string;
  onAdd: (parentId?: string) => void;
  onEdit: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
  onReorder?: (sections: Section[]) => void;
}

export default function SectionTree({
  sections,
  templateId,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
}: SectionTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build tree structure from flat list
  const buildTree = (items: Section[]): Section[] => {
    const map = new Map<string, Section>();
    const roots: Section[] = [];

    // First pass: create map
    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    // Second pass: build tree
    items.forEach(item => {
      const node = map.get(item.id)!;
      if (item.parentId) {
        const parent = map.get(item.parentId);
        if (parent) {
          parent.children!.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // Sort by order
    const sortByOrder = (nodes: Section[]) => {
      nodes.sort((a, b) => a.order - b.order);
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortByOrder(node.children);
        }
      });
    };

    sortByOrder(roots);
    return roots;
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderSection = (section: Section, depth: number = 0) => {
    const hasChildren = section.children && section.children.length > 0;
    const isExpanded = expandedIds.has(section.id);
    const indent = depth * 24;

    return (
      <div key={section.id}>
        {/* Section Row */}
        <div
          className="group flex items-center gap-2 py-2 px-3 hover:bg-muted/30 rounded-lg transition-colors"
          style={{ paddingLeft: `${indent + 12}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(section.id)}
              className="w-5 h-5 flex items-center justify-center hover:bg-muted rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Drag Handle */}
          <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* Level Badge */}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
            {section.order}
          </div>

          {/* Section Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">
              {section.name}
            </h4>
            <p className="text-sm text-muted-foreground">
              {section.code}
              {section.isRequired && (
                <span className="ml-2 text-xs text-destructive">• Bắt buộc</span>
              )}
              <span className="ml-2 text-xs text-muted-foreground">
                Level {section.level}
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAdd(section.id)}
              title="Add child section"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(section.id)}
              title="Edit section"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(section.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete section"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {section.children!.map(child => renderSection(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(sections);

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-xl">
        <p className="text-muted-foreground mb-4">Chưa có section nào</p>
        <Button variant="primary" onClick={() => onAdd()}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm Section Đầu Tiên
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map(section => renderSection(section))}

      {/* Add Root Section Button */}
      <div className="pt-4">
        <Button variant="outline" onClick={() => onAdd()} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Thêm Section Gốc
        </Button>
      </div>
    </div>
  );
}
