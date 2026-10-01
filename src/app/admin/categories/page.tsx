"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  X,
  Folder,
  FolderOpen,
  FileText,
  Search,
  RotateCcw,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  questionCount: number;
  children: Category[];
}

interface CategoryFlat {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  questionCount: number;
}

const CategoryNode = ({
  node,
  level = 0,
  expandedIds,
  toggleExpand,
  onEdit,
  onDelete,
  searchQuery,
}: {
  node: Category;
  level?: number;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div>
      {/* Node Row */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={() => toggleExpand(node.id)}
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
          </button>
        ) : (
          <div className="w-6 flex-shrink-0" />
        )}

        {/* Icon */}
        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          )
        ) : (
          <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        )}

        {/* Name & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">
              {highlightText(node.name, searchQuery)}
            </span>
            {node.description && (
              <span className="text-xs text-zinc-400 truncate hidden sm:inline">
                - {node.description}
              </span>
            )}
          </div>
        </div>

        {/* Question Count Badge */}
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
          {node.questionCount} câu
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(node)}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            title="Sửa"
          >
            <Pencil className="w-4 h-4 text-zinc-500" />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="border-l border-zinc-200 dark:border-zinc-700 ml-6">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<CategoryFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search & Expand state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
        // Auto-expand all when loading
        const allIds = new Set<string>();
        const collectIds = (nodes: Category[]) => {
          for (const node of nodes) {
            if (node.children.length > 0) {
              allIds.add(node.id);
              collectIds(node.children);
            }
          }
        };
        collectIds(data.data);
        setExpandedIds(allIds);
      }

      const flatRes = await fetch("/api/admin/categories?flat=true");
      const flatData = await flatRes.json();
      if (flatData.success) setFlatCategories(flatData.data);
    } catch {
      setError("Lỗi khi tải danh mục");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    const matchedIds = new Set<string>();

    const searchNodes = (nodes: Category[], depth = 0): Category[] => {
      const result: Category[] = [];
      for (const node of nodes) {
        const nameMatch = node.name.toLowerCase().includes(query);
        const descMatch = node.description?.toLowerCase().includes(query);

        const filteredChildren = searchNodes(node.children, depth + 1);
        const childMatch = filteredChildren.length > 0;

        if (nameMatch || descMatch || childMatch) {
          result.push({
            ...node,
            children: filteredChildren,
          });
          matchedIds.add(node.id);
        }
      }
      return result;
    };

    const results = searchNodes(categories);

    // Expand all matched paths after render
    if (results.length > 0) {
      const expandPath = (nodes: Category[]) => {
        for (const node of nodes) {
          if (
            node.name.toLowerCase().includes(query) ||
            node.description?.toLowerCase().includes(query) ||
            node.children.length > 0
          ) {
            matchedIds.add(node.id);
            if (node.children.length > 0) {
              expandPath(node.children);
            }
          }
        }
      };
      expandPath(results);
    }

    return { results, matchedIds };
  }, [categories, searchQuery]);

  // Update expanded IDs when search results change
  useEffect(() => {
    if (searchQuery.trim() && typeof filteredCategories === 'object' && 'matchedIds' in filteredCategories) {
      setExpandedIds(filteredCategories.matchedIds);
    }
  }, [filteredCategories, searchQuery]);

  const displayCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    if (typeof filteredCategories === 'object' && 'results' in filteredCategories) {
      return filteredCategories.results;
    }
    return categories;
  }, [categories, filteredCategories, searchQuery]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExpandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: Category[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      }
    };
    collectIds(categories);
    setExpandedIds(allIds);
    setExpandAll(true);
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
    setExpandAll(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const url = editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description.trim() || null,
          parentId: parentId || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(editingId ? "Đã cập nhật danh mục" : "Đã tạo danh mục mới");
        setShowForm(false);
        setEditingId(null);
        setName("");
        setDescription("");
        setParentId("");
        fetchCategories();
      } else {
        setError(data.message || "Có lỗi xảy ra");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setParentId(cat.parentId || "");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa danh mục này?")) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage("Đã xóa danh mục");
        fetchCategories();
      } else {
        setError(data.message || "Không thể xóa danh mục");
      }
    } catch {
      setError("Lỗi kết nối");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setParentId("");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors lg:hidden"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Danh Mục Chuyên Đề
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Cấu trúc phân cấp cây danh mục câu hỏi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tổng quan
          </Link>
          <Button onClick={() => { setShowForm(true); setEditingId(null); }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Thêm danh mục
          </Button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExpandAll}
            className="flex items-center gap-1.5"
          >
            <ChevronsDown className="w-4 h-4" />
            <span className="hidden sm:inline">Mở tất cả</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCollapseAll}
            className="flex items-center gap-1.5"
          >
            <ChevronsUp className="w-4 h-4" />
            <span className="hidden sm:inline">Thu gọn</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCategories}
            className="flex items-center gap-1.5"
            title="Làm mới"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Category Tree */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
            <Folder className="h-8 w-8 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-4">
            Chưa có danh mục nào
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo danh mục đầu tiên
          </Button>
        </div>
      ) : displayCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Không tìm thấy danh mục nào
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {displayCategories.map((cat) => (
            <CategoryNode
              key={cat.id}
              node={cat}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}

      {/* Mobile Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-6 dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {editingId ? "Chỉnh Sửa Danh Mục" : "Tạo Danh Mục Mới"}
              </h2>
              <button onClick={handleCancel} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Hiến pháp 2013"
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Mô tả
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả cho chuyên đề ôn tập"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Danh mục cha
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="">— Là danh mục gốc —</option>
                  {flatCategories
                    .filter((cat) => cat.id !== editingId)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={handleCancel} className="flex-1">
                  Hủy
                </Button>
                <Button type="submit" disabled={saving} isLoading={saving} className="flex-1">
                  {editingId ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Form */}
      <div className="hidden lg:block rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          {editingId ? (
            <><Pencil className="w-5 h-5 text-blue-600" /> Chỉnh Sửa Danh Mục</>
          ) : (
            <><Plus className="w-5 h-5 text-blue-600" /> Tạo Danh Mục Mới</>
          )}
        </h2>
        <form onSubmit={handleSubmit} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tên danh mục
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Hiến pháp 2013"
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div className="w-64">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Mô tả
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả..."
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Danh mục cha
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="">— Gốc —</option>
              {flatCategories
                .filter((cat) => cat.id !== editingId)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>
          <Button type="submit" disabled={saving} isLoading={saving}>
            {editingId ? "Cập nhật" : "Tạo mới"}
          </Button>
        </form>
      </div>
    </div>
  );
}
