"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Upload,
  FileText,
  Image,
  Table,
  Database,
  BookOpen,
  GraduationCap,
  BookMarked,
  ListOrdered,
  Activity,
  Layers,
  Folder,
  File,
  X,
  RefreshCw,
  Command,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  FileUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Hash,
  Tag,
  Target,
  Brain,
  Sparkles,
  FileIcon,
  MoreVertical,
  ArrowUpDown,
} from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface Book {
  id: string;
  code: string;
  name: string;
  description?: string;
  grades: Grade[];
  _count?: { subjects?: number };
}

interface Grade {
  id: string;
  code: string;
  name: string;
  subjects?: Subject[];
  _count?: { subjects?: number };
}

interface Subject {
  id: string;
  code: string;
  name: string;
  lessons?: Lesson[];
  _count?: { lessons?: number };
}

interface Lesson {
  id: string;
  code: string;
  title: string;
  description?: string;
  sections?: Section[];
  _count?: { lessonSections?: number };
}

interface Section {
  id: string;
  code: string;
  name: string;
  activities?: Activity[];
  _count?: { activities?: number };
}

interface Activity {
  id: string;
  code: string;
  title: string;
  summary?: string;
  teachingIntent?: string;
  knowledge?: string;
  keywords: string[];
  aliases: string[];
  teachingMethod?: string;
  expectedTeacherActions?: string;
  expectedStudentActions?: string;
  expectedOutcome?: string;
  estimatedMinutes?: number;
}

interface Counts {
  books: number;
  grades: number;
  subjects: number;
  lessons: number;
  sections: number;
  activities: number;
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  path: string;
  [key: string]: any;
}

export default function KnowledgeCenterPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [counts, setCounts] = useState<Counts>({ books: 0, grades: 0, subjects: 0, lessons: 0, sections: 0, activities: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter state
  const [filterBook, setFilterBook] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<string>("idle"); // idle, uploading, parsing, mapping, saving, completed
  const [importStatus, setImportStatus] = useState<string>("");

  // Loading states for lazy loaded data
  const [loadingPath, setLoadingPath] = useState<string[]>([]);

  // Fetch books on mount
  useEffect(() => {
    fetchBooks();
  }, []);

  // Search debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/knowledge-center");
      const data = await res.json();
      if (data.success) {
        setBooks(data.data);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (error) {
      console.error("Error fetching books:", error);
      toast.error("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async (type: string, parentId: string) => {
    const key = `${type}-${parentId}`;
    if (loadingPath.includes(key)) return;

    setLoadingPath(prev => [...prev, key]);
    try {
      const url = `/api/admin/knowledge-center?${type}Id=${parentId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        return data.data;
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      toast.error(`Lỗi khi tải ${type}`);
    } finally {
      setLoadingPath(prev => prev.filter(p => p !== key));
    }
    return [];
  };

  const toggleExpand = async (type: string, parent: any, id: string) => {
    const key = `${type}-${id}`;
    const newExpanded = new Set(expandedNodes);

    if (expandedNodes.has(key)) {
      newExpanded.delete(key);
      setExpandedNodes(newExpanded);
    } else {
      newExpanded.add(key);
      setExpandedNodes(newExpanded);

      // Fetch children if not loaded
      if (type === "book" && !parent.grades?.length) {
        const grades = await fetchChildren("grade", id);
        setBooks(prev => prev.map(b => b.id === id ? { ...b, grades } : b));
      } else if (type === "grade" && !parent.subjects?.length) {
        const subjects = await fetchChildren("subject", id);
        setBooks(prev => prev.map(b => {
          const updatedGrades = b.grades.map(g => g.id === id ? { ...g, subjects } : g);
          return { ...b, grades: updatedGrades };
        }));
      } else if (type === "subject" && !parent.lessons?.length) {
        const lessons = await fetchChildren("lesson", id);
        setBooks(prev => prev.map(b => ({
          ...b,
          grades: b.grades.map(g => ({
            ...g,
            subjects: g.subjects?.map(s => s.id === id ? { ...s, lessons } : s)
          }))
        })));
      } else if (type === "lesson" && !parent.sections?.length) {
        const sections = await fetchChildren("section", id);
        setBooks(prev => prev.map(b => ({
          ...b,
          grades: b.grades.map(g => ({
            ...g,
            subjects: g.subjects?.map(s => ({
              ...s,
              lessons: s.lessons?.map(l => l.id === id ? { ...l, sections } : l)
            }))
          }))
        })));
      } else if (type === "section" && !parent.activities?.length) {
        const activities = await fetchChildren("activity", id);
        setBooks(prev => prev.map(b => ({
          ...b,
          grades: b.grades.map(g => ({
            ...g,
            subjects: g.subjects?.map(s => ({
              ...s,
              lessons: s.lessons?.map(l => ({
                ...l,
                sections: l.sections?.map(sec => sec.id === id ? { ...sec, activities } : sec)
              }))
            }))
          }))
        })));
      }
    }
  };

  const selectActivity = (activity: Activity) => {
    setSelectedActivity(activity);
  };

  const performSearch = async (query: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/knowledge-center/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    // Navigate to the result
    if (result.type === "activity") {
      // Find the activity in the tree
      const pathParts = result.path.split(" > ");
      // For now, just show it in the panel
      setSelectedActivity(result as unknown as Activity);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportProgress("uploading");
    setImportStatus("Đang tải file lên...");

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      setImportProgress("parsing");
      setImportStatus("Đang phân tích file...");

      const res = await fetch("/api/admin/knowledge-center/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setImportProgress("saving");
        setImportStatus("Đang lưu dữ liệu...");

        // Small delay for UX
        await new Promise(r => setTimeout(r, 500));

        setImportProgress("completed");
        setImportStatus("Hoàn tất!");
        toast.success(data.message || "Import thành công!");
        fetchBooks();

        // Reset after showing completion
        setTimeout(() => {
          setImportDialogOpen(false);
          setImportFile(null);
          setImportProgress("idle");
          setImportStatus("");
        }, 1000);
      } else {
        toast.error(data.message || "Import thất bại");
        setImportProgress("idle");
        setImportStatus("");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Lỗi khi import");
      setImportProgress("idle");
      setImportStatus("");
    } finally {
      setImporting(false);
    }
  };

  const getImportStatusDisplay = () => {
    const statusConfig = {
      uploading: { icon: "📤", text: "Đang tải file lên...", color: "text-blue-600" },
      parsing: { icon: "🔍", text: "Đang phân tích nội dung...", color: "text-amber-600" },
      mapping: { icon: "🗺️", text: "Đang ánh xạ tri thức...", color: "text-purple-600" },
      saving: { icon: "💾", text: "Đang lưu dữ liệu...", color: "text-emerald-600" },
      completed: { icon: "✅", text: "Hoàn tất!", color: "text-green-600" },
    };
    return statusConfig[importProgress as keyof typeof statusConfig] || null;
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "book": return <BookOpen className="w-4 h-4" />;
      case "grade": return <GraduationCap className="w-4 h-4" />;
      case "subject": return <BookMarked className="w-4 h-4" />;
      case "lesson": return <ListOrdered className="w-4 h-4" />;
      case "section": return <Layers className="w-4 h-4" />;
      case "activity": return <Activity className="w-4 h-4" />;
      default: return <Folder className="w-4 h-4" />;
    }
  };

  const filteredBooks = books.filter(book => {
    if (filterBook !== "all" && book.id !== filterBook) return false;
    if (filterGrade !== "all") {
      const hasGrade = book.grades?.some(g => g.id === filterGrade);
      if (!hasGrade) return false;
    }
    return true;
  });

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
                <PanelLeftOpen className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Knowledge Center</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Quản lý dữ liệu AI</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Tìm kiếm hoạt động, bài học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-zinc-100 dark:bg-zinc-800 border-0"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 bg-zinc-200 dark:bg-zinc-700 rounded">
              <Command className="w-3 h-3" />K
            </kbd>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                >
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSearchResultClick(result)}
                      className="w-full flex items-start gap-3 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left"
                    >
                      {getNodeIcon(result.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {result.path}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {result.type}
                      </Badge>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFilterBook("all")}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
            <Button variant="primary" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Bar */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-4 overflow-x-auto">
          <StatItem label="Bộ sách" value={counts.books} icon={<BookOpen className="w-3 h-3" />} />
          <StatItem label="Lớp" value={counts.grades} icon={<GraduationCap className="w-3 h-3" />} />
          <StatItem label="Môn" value={counts.subjects} icon={<BookMarked className="w-3 h-3" />} />
          <StatItem label="Bài" value={counts.lessons} icon={<ListOrdered className="w-3 h-3" />} />
          <StatItem label="Hoạt động" value={counts.activities} icon={<Activity className="w-3 h-3" />} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Tree Navigation */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
            >
              <div className="h-full flex flex-col">
                {/* Tree Header */}
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Cấu trúc dữ liệu</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                    <PanelLeftClose className="w-4 h-4" />
                  </Button>
                </div>

                {/* Filters */}
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
                  <Select value={filterBook} onValueChange={setFilterBook}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Lọc theo bộ sách" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả bộ sách</SelectItem>
                      {books.map(book => (
                        <SelectItem key={book.id} value={book.id}>{book.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tree */}
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {loading ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    ) : filteredBooks.length === 0 ? (
                      <EmptyState
                        icon={<Database className="w-8 h-8" />}
                        title="Chưa có dữ liệu"
                        description="Import dữ liệu để bắt đầu"
                      />
                    ) : (
                      <div className="space-y-1">
                        {filteredBooks.map((book) => (
                          <TreeNode
                            key={book.id}
                            type="book"
                            data={book}
                            label={book.name}
                            count={book.grades?.length || 0}
                            expanded={expandedNodes.has(`book-${book.id}`)}
                            onToggle={() => toggleExpand("book", book, book.id)}
                            selectedId={selectedActivity?.id}
                            onSelect={selectActivity}
                            loading={loadingPath.includes(`book-${book.id}`)}
                            level={0}
                          >
                            {book.grades?.map((grade) => (
                              <TreeNode
                                key={grade.id}
                                type="grade"
                                data={grade}
                                label={grade.name}
                                count={grade.subjects?.length || 0}
                                expanded={expandedNodes.has(`grade-${grade.id}`)}
                                onToggle={() => toggleExpand("grade", grade, grade.id)}
                                selectedId={selectedActivity?.id}
                                onSelect={selectActivity}
                                loading={loadingPath.includes(`grade-${grade.id}`)}
                                level={1}
                              >
                                {grade.subjects?.map((subject) => (
                                  <TreeNode
                                    key={subject.id}
                                    type="subject"
                                    data={subject}
                                    label={subject.name}
                                    count={subject.lessons?.length || 0}
                                    expanded={expandedNodes.has(`subject-${subject.id}`)}
                                    onToggle={() => toggleExpand("subject", subject, subject.id)}
                                    selectedId={selectedActivity?.id}
                                    onSelect={selectActivity}
                                    loading={loadingPath.includes(`subject-${subject.id}`)}
                                    level={2}
                                  >
                                    {subject.lessons?.map((lesson) => (
                                      <TreeNode
                                        key={lesson.id}
                                        type="lesson"
                                        data={lesson}
                                        label={lesson.title}
                                        count={lesson.sections?.length || 0}
                                        expanded={expandedNodes.has(`lesson-${lesson.id}`)}
                                        onToggle={() => toggleExpand("lesson", lesson, lesson.id)}
                                        selectedId={selectedActivity?.id}
                                        onSelect={selectActivity}
                                        loading={loadingPath.includes(`lesson-${lesson.id}`)}
                                        level={3}
                                      >
                                        {lesson.sections?.map((section) => (
                                          <TreeNode
                                            key={section.id}
                                            type="section"
                                            data={section}
                                            label={section.name}
                                            count={section.activities?.length || 0}
                                            expanded={expandedNodes.has(`section-${section.id}`)}
                                            onToggle={() => toggleExpand("section", section, section.id)}
                                            selectedId={selectedActivity?.id}
                                            onSelect={selectActivity}
                                            loading={loadingPath.includes(`section-${section.id}`)}
                                            level={4}
                                          >
                                            {section.activities?.map((activity) => (
                                              <TreeNode
                                                key={activity.id}
                                                type="activity"
                                                data={activity}
                                                label={activity.title}
                                                count={0}
                                                expanded={false}
                                                onToggle={() => {}}
                                                selectedId={selectedActivity?.id}
                                                onSelect={selectActivity}
                                                loading={false}
                                                level={5}
                                              />
                                            ))}
                                          </TreeNode>
                                        ))}
                                      </TreeNode>
                                    ))}
                                  </TreeNode>
                                ))}
                              </TreeNode>
                            ))}
                          </TreeNode>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Panel - Activity Details */}
        <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
          {selectedActivity ? (
            <ActivityDetailPanel activity={selectedActivity} />
          ) : (
            <EmptyState
              icon={<Sparkles className="w-12 h-12" />}
              title="Chọn một hoạt động"
              description="Chọn hoạt động từ cây bên trái để xem chi tiết"
            />
          )}
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Import Dữ liệu Tri Thức</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Supported formats */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                📄 DOCX
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs font-medium">
                📕 PDF
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-medium">
                🖼️ PNG
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-pink-100 text-pink-700 text-xs font-medium">
                🖼️ JPG
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-100 text-orange-700 text-xs font-medium">
                🖼️ WEBP
              </span>
            </div>

            {/* File upload */}
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".docx,.doc,.pdf,.png,.jpg,.jpeg,.webp,.tiff"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportProgress("idle");
                }}
                className="hidden"
                id="import-file"
              />
              <label htmlFor="import-file" className="cursor-pointer">
                {importFile ? (
                  <div className="space-y-2">
                    <FileText className="w-10 h-10 mx-auto text-blue-500" />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {importFile.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {(importFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <>
                    <FileUp className="w-10 h-10 mx-auto mb-2 text-zinc-400" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Click để chọn file
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      DOCX, PDF, PNG, JPG, WEBP, TIFF
                    </p>
                  </>
                )}
              </label>
            </div>

            {/* Progress */}
            {importing && importProgress !== "idle" && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">{getImportStatusDisplay()?.icon}</span>
                  <span className={`text-sm font-medium ${getImportStatusDisplay()?.color}`}>
                    {getImportStatusDisplay()?.text}
                  </span>
                </div>
                <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{
                      width: importProgress === "completed" ? "100%" : "60%",
                      animation: importProgress !== "completed" ? "pulse 1.5s infinite" : "none"
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setImportDialogOpen(false);
              setImportFile(null);
              setImportProgress("idle");
            }}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleImport} disabled={!importFile || importing}>
              {importing ? "Đang xử lý..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tree Node Component
function TreeNode({
  type,
  data,
  label,
  count,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  loading,
  level,
  children,
}: {
  type: string;
  data: any;
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  selectedId?: string;
  onSelect: (activity: any) => void;
  loading: boolean;
  level: number;
  children?: React.ReactNode;
}) {
  const hasChildren = level < 5;
  const isSelected = type === "activity" && selectedId === data.id;
  const isActivity = type === "activity";

  const handleClick = () => {
    if (isActivity) {
      onSelect(data);
    } else if (hasChildren) {
      onToggle();
    }
  };

  const getIcon = () => {
    switch (type) {
      case "book": return <BookOpen className="w-4 h-4 text-blue-500" />;
      case "grade": return <GraduationCap className="w-4 h-4 text-green-500" />;
      case "subject": return <BookMarked className="w-4 h-4 text-purple-500" />;
      case "lesson": return <ListOrdered className="w-4 h-4 text-orange-500" />;
      case "section": return <Layers className="w-4 h-4 text-pink-500" />;
      case "activity": return <Activity className="w-4 h-4 text-cyan-500" />;
      default: return <Folder className="w-4 h-4" />;
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
          isSelected
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren && (
          <span className="w-4 h-4 flex items-center justify-center">
            {loading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        )}
        {!hasChildren && <span className="w-4" />}
        {getIcon()}
        <span className="flex-1 truncate">{label}</span>
        {count > 0 && (
          <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </button>
      <AnimatePresence>
        {expanded && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Activity Detail Panel
function ActivityDetailPanel({ activity }: { activity: Activity }) {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{activity.title}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{activity.code}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1" />
                Xem
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-1" />
                Sửa
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Summary */}
          {activity.summary && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Tóm tắt
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                {activity.summary}
              </p>
            </div>
          )}

          {/* Teaching Intent */}
          {activity.teachingIntent && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Ý đồ sư phạm
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                {activity.teachingIntent}
              </p>
            </div>
          )}

          {/* Knowledge */}
          {activity.knowledge && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Kiến thức
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                {activity.knowledge}
              </p>
            </div>
          )}

          {/* Keywords */}
          {activity.keywords && activity.keywords.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {activity.keywords.map((kw, i) => (
                  <Badge key={i} variant="secondary">{kw}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Aliases */}
          {activity.aliases && activity.aliases.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Alias
              </h3>
              <div className="flex flex-wrap gap-2">
                {activity.aliases.map((alias, i) => (
                  <Badge key={i} variant="outline" className="text-zinc-600">{alias}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Teaching Method */}
          {activity.teachingMethod && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Phương pháp dạy học
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                {activity.teachingMethod}
              </p>
            </div>
          )}

          {/* Expected Actions */}
          <div className="grid sm:grid-cols-2 gap-4">
            {activity.expectedTeacherActions && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Hoạt động GV
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  {activity.expectedTeacherActions}
                </p>
              </div>
            )}
            {activity.expectedStudentActions && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Hoạt động HS
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  {activity.expectedStudentActions}
                </p>
              </div>
            )}
          </div>

          {/* Expected Outcome */}
          {activity.expectedOutcome && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Kết quả mong đợi
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                {activity.expectedOutcome}
              </p>
            </div>
          )}

          {/* Duration */}
          {activity.estimatedMinutes && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Clock className="w-4 h-4" />
              <span>Thời gian ước tính: {activity.estimatedMinutes} phút</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Item Component
function StatItem({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-zinc-400">{icon}</span>
      <span className="text-zinc-500">{label}:</span>
      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{value.toLocaleString()}</span>
    </div>
  );
}

// Empty State Component
function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-zinc-300 dark:text-zinc-600 mb-3">{icon}</div>
      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
    </div>
  );
}
