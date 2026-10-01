"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  List,
  GraduationCap,
  CheckCircle,
  History,
  BarChart3,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Settings,
  Upload,
  Trash2,
  Archive,
  RefreshCw,
  Loader2,
  Save,
  X,
  Plus,
  Minus,
  Move,
  Copy,
  Search,
  Download,
  Upload as UploadIcon,
  Eye,
  Edit,
  AlertCircle,
  Check,
  Clock,
  Filter,
  MoreVertical,
  ArrowUpDown,
  Layers,
  CopyIcon,
  FileJson,
  FileSpreadsheet,
  Edit3,
  Play,
  CheckSquare,
  Square,
  ExternalLink,
} from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { getActiveModels, type AIModelConfig } from "@/lib/ai-models";
import toast from "react-hot-toast";

// Types
interface TextbookBook {
  id: string;
  code: string;
  name: string;
  description?: string;
  grade: string;
  subject: string;
  pdfPath: string;
  pageCount: number;
  fileSize: number;
  version: string;
  tocStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  ocrStatus: "NOT_NEEDED" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  tocSource?: string;
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { chapters: number };
}

interface TextbookChapter {
  id: string;
  chapterNumber?: number;
  title: string;
  aliases: string[];
  keywords: string[];
  description?: string;
  startPage: number;
  endPage: number;
  level: number;
  parentId?: string;
  source: string;
  confidence: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  isApproved: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface Version {
  id: string;
  version: string;
  pageCount: number;
  fileSize: number;
  tocStatus: string;
  isApproved: boolean;
  createdAt: string;
}

// Tab types
type TabType = "general" | "pdf" | "toc" | "lessons" | "approval" | "history" | "metrics" | "versions";

// TOC Mode types
type TocMode = "manual" | "pages" | "csv" | "json" | "hybrid";

export default function BookStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = use(params);
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<TextbookBook | null>(null);
  const [chapters, setChapters] = useState<TextbookChapter[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);

  // TOC Configuration state
  const [tocMode, setTocMode] = useState<TocMode>("manual");
  const [tocStartPage, setTocStartPage] = useState<string>("");
  const [tocEndPage, setTocEndPage] = useState<string>("");
  const [selectedTocModel, setSelectedTocModel] = useState<string>("gemini-2.5-flash");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pendingChapters, setPendingChapters] = useState<any[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Chapter editing state
  const [editingChapter, setEditingChapter] = useState<TextbookChapter | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    startPage: 0,
    endPage: 0,
    aliases: [] as string[],
    keywords: [] as string[],
    description: "",
  });

  // Manual chapter creation
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    startPage: 1,
    endPage: 1,
    aliases: "",
    keywords: "",
    description: "",
  });

  // CSV/JSON upload
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadMode, setUploadMode] = useState<"csv" | "json">("csv");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);

  // Approval state
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());

  // PDF viewer state
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  // Fetch book data
  useEffect(() => {
    if (bookId) {
      fetchBook();
      fetchChapters();
      fetchVersions();
    }
  }, [bookId]);

  const fetchBook = async () => {
    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}`);
      const data = await res.json();
      if (data.success) {
        setBook(data.data);
        // Set default TOC page range based on book (empty by default, user must input)
        // This allows user to enter custom values instead of forced defaults
      }
    } catch (error) {
      console.error("Error fetching book:", error);
      toast.error("Lỗi khi tải thông tin sách");
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async () => {
    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}/chapters`);
      const data = await res.json();
      if (data.success) {
        setChapters(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
    }
  };

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}/versions`);
      const data = await res.json();
      if (data.success) {
        setVersions(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "APPROVED":
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Hoàn thành</Badge>;
      case "PROCESSING":
        return <Badge variant="info"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang xử lý</Badge>;
      case "FAILED":
      case "REJECTED":
        return <Badge variant="danger"><AlertCircle className="w-3 h-3 mr-1" /> Thất bại</Badge>;
      case "PENDING":
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Chờ duyệt</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Chờ xử lý</Badge>;
    }
  };

  // TOC Import handlers
  const handlePreviewPages = async () => {
    if (!book) return;

    const startPage = parseInt(tocStartPage) || 0;
    const endPage = parseInt(tocEndPage) || 0;

    if (!tocStartPage || !tocEndPage) {
      toast.error("Vui lòng nhập trang bắt đầu và kết thúc");
      return;
    }
    if (startPage < 1 || endPage > book.pageCount || startPage > endPage) {
      toast.error("Invalid page range");
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}/import-toc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "PAGES",
          tocStartPage: startPage,
          tocEndPage: endPage,
          model: selectedTocModel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingChapters(data.data.pendingChapters || []);
        toast.success(`Extracted ${data.data.pendingChapters.length} chapters from pages ${startPage}-${endPage}`);
      } else {
        toast.error(data.message || "Extraction failed");
      }
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Lỗi khi trích xuất");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!book || pendingChapters.length === 0) return;

    setPreviewLoading(true);
    try {
      // Save chapters with the full structure including hierarchy
      const chaptersToSave = pendingChapters.map((ch: any, index: number) => {
        const sp = ch.pageStart || ch.startPage;
        const ep = ch.pageEnd || ch.endPage;
        console.log("[Save] Chapter", index, { title: ch.title, pageStart: sp, pageEnd: ep });
        return {
          title: ch.title,
          level: ch.level || 1,
          parentId: ch.parentId || null,
          startPage: sp,
          endPage: ep,
          aliases: ch.aliases || [],
          keywords: ch.keywords || [],
          description: ch.description || "",
          confidence: ch.confidence || 0.5,
          source: ch.source || "AI",
        };
      });

      const res = await fetch(`/api/admin/textbooks/${bookId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chaptersToSave),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Imported ${data.data.length} chapters`);
        setShowConfirmDialog(false);
        setPendingChapters([]);
        fetchChapters();
        fetchBook();
      } else {
        toast.error(data.message || "Import failed");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Lỗi khi nhập");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Manual chapter creation
  const handleCreateChapter = async () => {
    if (!createForm.title || !book) return;

    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title,
          startPage: createForm.startPage,
          endPage: createForm.endPage,
          aliases: createForm.aliases.split(",").map((a) => a.trim()).filter(Boolean),
          keywords: createForm.keywords.split(",").map((k) => k.trim()).filter(Boolean),
          description: createForm.description || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã thêm chương");
        setShowCreateDialog(false);
        setCreateForm({ title: "", startPage: 1, endPage: 1, aliases: "", keywords: "", description: "" });
        fetchChapters();
        fetchBook();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Create error:", error);
      toast.error("Lỗi khi tạo");
    }
  };

  // CSV/JSON Import
  const handleUploadFile = async () => {
    if (!uploadFile || !book) return;

    const text = await uploadFile.text();
    let chaptersToImport: any[] = [];

    if (uploadMode === "csv") {
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        toast.error("Invalid CSV format");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const startIdx = headers.findIndex((h) => h.includes("start"));
      const endIdx = headers.findIndex((h) => h.includes("end"));

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length < 2) continue;
        chaptersToImport.push({
          title: values[0] || `Chapter ${i}`,
          startPage: startIdx >= 0 ? parseInt(values[startIdx]) || 0 : 0,
          endPage: endIdx >= 0 ? parseInt(values[endIdx]) || 0 : 0,
        });
      }
    } else {
      try {
        const json = JSON.parse(text);
        chaptersToImport = Array.isArray(json) ? json : json.chapters || json.toc || [];
      } catch {
        toast.error("Invalid JSON format");
        return;
      }
    }

    setUploadPreview(chaptersToImport);
  };

  const handleConfirmUpload = async () => {
    if (uploadPreview.length === 0) return;

    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapters: uploadPreview,
          replaceExisting: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Imported ${data.data.length} chapters`);
        setShowUploadDialog(false);
        setUploadPreview([]);
        fetchChapters();
        fetchBook();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Lỗi khi nhập");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Edit chapter
  const handleEditChapter = (chapter: TextbookChapter) => {
    setEditingChapter(chapter);
    setEditForm({
      title: chapter.title,
      startPage: chapter.startPage,
      endPage: chapter.endPage,
      aliases: chapter.aliases,
      keywords: chapter.keywords,
      description: chapter.description || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingChapter) return;

    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}/chapters/${editingChapter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          startPage: editForm.startPage,
          endPage: editForm.endPage,
          aliases: editForm.aliases,
          keywords: editForm.keywords,
          description: editForm.description || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã cập nhật");
        setEditingChapter(null);
        fetchChapters();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Lỗi khi cập nhật");
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm("Delete this chapter?")) return;

    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}/chapters/${chapterId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã xóa");
        fetchChapters();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Lỗi khi xóa");
    }
  };

  // Approval handlers
  const handleApproveChapter = async (chapterId: string) => {
    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}/chapters/${chapterId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã phê duyệt");
        fetchChapters();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Lỗi khi phê duyệt");
    }
  };

  const handleRejectChapter = async (chapterId: string) => {
    const reason = prompt("Nhập lý do từ chối:");
    if (!reason) return;

    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}/chapters/${chapterId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã từ chối");
        fetchChapters();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Reject error:", error);
      toast.error("Lỗi khi từ chối");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedChapters.size === 0) return;

    setPreviewLoading(true);
    try {
      for (const chapterId of selectedChapters) {
        await fetch(`/api/admin/textbooks/${bookId}/chapters/${chapterId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        });
      }
      toast.success(`Đã phê duyệt ${selectedChapters.size} chương`);
      setSelectedChapters(new Set());
      fetchChapters();
    } catch (error) {
      console.error("Bulk approve error:", error);
      toast.error("Lỗi khi phê duyệt");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Book approval
  const handleApproveBook = async () => {
    try {
      const res = await fetch(`/api/admin/textbooks/${bookId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã phê duyệt sách");
        fetchBook();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Approve book error:", error);
      toast.error("Lỗi khi phê duyệt");
    }
  };

  // Toggle chapter selection
  const toggleSelection = (chapterId: string) => {
    const newSet = new Set(selectedChapters);
    if (newSet.has(chapterId)) {
      newSet.delete(chapterId);
    } else {
      newSet.add(chapterId);
    }
    setSelectedChapters(newSet);
  };

  // Filter chapters
  const filteredChapters = chapters.filter((ch) => {
    if (approvalFilter === "all") return true;
    if (approvalFilter === "approved") return ch.status === "APPROVED";
    if (approvalFilter === "pending") return ch.status === "PENDING";
    if (approvalFilter === "rejected") return ch.status === "REJECTED";
    return true;
  });

  // Tab definitions
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "general", label: "Tổng quan", icon: Settings },
    { id: "pdf", label: "PDF", icon: FileText },
    { id: "toc", label: "Mục lục", icon: List },
    { id: "lessons", label: "Bài học", icon: GraduationCap },
    { id: "approval", label: "Phê duyệt", icon: CheckCircle },
    { id: "history", label: "Lịch sử", icon: History },
    { id: "metrics", label: "Thống kê", icon: BarChart3 },
    { id: "versions", label: "Phiên bản", icon: GitBranch },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500">Không tìm thấy sách</p>
          <Link href="/admin/textbooks">
            <Button variant="outline" className="mt-4">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/textbooks">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Quay lại
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {book.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {book.code} · {book.grade} · {book.subject} · v{book.version}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(book.isApproved ? "APPROVED" : book.tocStatus)}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <nav className="flex space-x-1 px-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Thông tin sách</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Mã sách</label>
                  <p className="font-mono font-medium">{book.code}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Tên sách</label>
                  <p className="font-medium">{book.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phiên bản</label>
                  <p className="font-medium">v{book.version}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Lớp</label>
                  <p className="font-medium">{book.grade}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Môn</label>
                  <p className="font-medium">{book.subject}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Số trang</label>
                  <p className="font-medium">{book.pageCount} trang</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Dung lượng</label>
                  <p className="font-medium">{formatFileSize(book.fileSize)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Ngày tạo</label>
                  <p className="font-medium">{formatDate(book.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Cập nhật lần cuối</label>
                  <p className="font-medium">{formatDate(book.updatedAt)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Trạng thái TOC</label>
                  <div className="mt-1">{getStatusBadge(book.tocStatus)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Nguồn TOC</label>
                  <p className="font-medium">{book.tocSource || "Chưa có"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Đường dẫn</label>
                  <p className="font-mono text-xs text-gray-500 truncate">{book.pdfPath}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Thao tác</h2>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Thay thế PDF
                </Button>
                <Button variant="outline">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Tạo phiên bản mới
                </Button>
                <Button variant="outline">
                  <Archive className="w-4 h-4 mr-2" />
                  Lưu trữ
                </Button>
                {!book.isApproved && (
                  <Button onClick={handleApproveBook}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Phê duyệt sách
                  </Button>
                )}
                <Button variant="danger">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa sách
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Tab */}
        {activeTab === "pdf" && (
          <div className="space-y-4">
            {/* PDF Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value);
                          if (page >= 1 && page <= book.pageCount) {
                            setCurrentPage(page);
                          }
                        }}
                        className="w-16 text-center"
                        min={1}
                        max={book.pageCount}
                      />
                      <span className="text-gray-500">/ {book.pageCount}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(book.pageCount, currentPage + 1))}
                      disabled={currentPage >= book.pageCount}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoom(Math.max(50, zoom - 25))}
                    >
                      -
                    </Button>
                    <span className="text-sm w-14 text-center">{zoom}%</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoom(Math.min(200, zoom + 25))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={selectionMode ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setSelectionMode(!selectionMode)}
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Chọn trang
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectionStart && selectionEnd) {
                        setShowCreateDialog(true);
                        setCreateForm({
                          ...createForm,
                          startPage: Math.min(selectionStart, selectionEnd),
                          endPage: Math.max(selectionStart, selectionEnd),
                        });
                      }
                    }}
                    disabled={!selectionStart || !selectionEnd}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tạo bài học
                  </Button>
                </div>
              </div>

              {/* Selection info */}
              {selectionMode && selectionStart && selectionEnd && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                  Đã chọn: Trang {Math.min(selectionStart, selectionEnd)} - {Math.max(selectionStart, selectionEnd)}
                </div>
              )}
            </div>

            {/* PDF Viewer */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {book.pdfPath ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                    <span className="text-sm text-gray-600">
                      {book.pageCount} trang
                    </span>
                    <a
                      href={`/api/admin/textbooks/${bookId}/pdf-proxy`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Mở trong tab mới
                    </a>
                  </div>
                  <iframe
                    src={`/api/admin/textbooks/${bookId}/pdf-proxy`}
                    className="w-full h-[700px] border-0"
                    title="PDF Viewer"
                  />
                </div>
              ) : (
                <div className="h-[700px] flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">Không có file PDF</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOC Tab */}
        {activeTab === "toc" && (
          <div className="space-y-6">
            {/* TOC Mode Selector */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Chế độ nhập mục lục</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={tocMode === "manual" ? "primary" : "outline"}
                  onClick={() => setTocMode("manual")}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Thủ công
                </Button>
                <Button
                  variant={tocMode === "pages" ? "primary" : "outline"}
                  onClick={() => setTocMode("pages")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Import từ trang
                </Button>
                <Button
                  variant={tocMode === "csv" ? "primary" : "outline"}
                  onClick={() => { setTocMode("csv"); setUploadMode("csv"); }}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant={tocMode === "json" ? "primary" : "outline"}
                  onClick={() => { setTocMode("json"); setUploadMode("json"); }}
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  JSON
                </Button>
                <Button
                  variant={tocMode === "hybrid" ? "primary" : "outline"}
                  onClick={() => setTocMode("hybrid")}
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Hybrid
                </Button>
              </div>
            </div>

            {/* Manual Mode */}
            {tocMode === "manual" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Tạo chương mới</h3>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm chương
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  {chapters.length} chương đã được tạo
                </div>
              </div>
            )}

            {/* Pages Mode */}
            {tocMode === "pages" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold mb-4">Import từ trang mục lục</h3>

                {/* Model Selection - only show models that support PDF input */}
                <div className="mb-4">
                  <label className="text-sm font-medium">Model AI</label>
                  <Select value={selectedTocModel} onValueChange={setSelectedTocModel}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Chọn model AI" />
                    </SelectTrigger>
                    <SelectContent>
                      {getActiveModels()
                        .filter(m => !m.id.includes("lite") && !m.id.includes("gemma"))
                        .map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.displayName} (${model.inputPrice}/${model.outputPrice})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium">Trang bắt đầu TOC</label>
                    <Input
                      type="number"
                      value={tocStartPage}
                      onChange={(e) => setTocStartPage(e.target.value)}
                      placeholder="VD: 1"
                      min={1}
                      max={book.pageCount}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Trang kết thúc TOC</label>
                    <Input
                      type="number"
                      value={tocEndPage}
                      onChange={(e) => setTocEndPage(e.target.value)}
                      placeholder="VD: 10"
                      min={1}
                      max={book.pageCount}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Hệ thống sẽ trích xuất chỉ các trang {tocStartPage || "..."}-{tocEndPage || "..."} và gửi đến AI.
                  Không có trang nào khác được gửi.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePreviewPages}
                    disabled={previewLoading}
                  >
                    {previewLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Xem trước
                  </Button>
                  {pendingChapters.length > 0 && (
                    <Button onClick={() => setShowConfirmDialog(true)}>
                      <Check className="w-4 h-4 mr-2" />
                      Xác nhận import ({pendingChapters.length})
                    </Button>
                  )}
                </div>

                {/* Preview result */}
                {pendingChapters.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <p className="font-medium text-yellow-800 mb-2">
                      Tìm thấy {pendingChapters.length} chương
                    </p>
                    <p className="text-sm text-yellow-700">
                      Cần cung cấp trang bắt đầu và kết thúc cho mỗi chương
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CSV/JSON Mode */}
            {(tocMode === "csv" || tocMode === "json") && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold mb-4">
                  Import từ {uploadMode === "csv" ? "CSV" : "JSON"}
                </h3>

                {/* Mode toggle */}
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={uploadMode === "csv" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => { setUploadMode("csv"); setUploadFile(null); setUploadPreview([]); }}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant={uploadMode === "json" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => { setUploadMode("json"); setUploadFile(null); setUploadPreview([]); }}
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                </div>

                {/* Instructions */}
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Hướng dẫn import {uploadMode.toUpperCase()}
                  </h4>
                  {uploadMode === "csv" ? (
                    <div className="text-sm text-blue-700">
                      <p className="mb-2"><strong>Cấu trúc file CSV:</strong></p>
                      <code className="block bg-white p-2 rounded text-xs overflow-x-auto">
                        title,startPage,endPage,aliases,keywords,description<br/>
                        "Chương 1: Giới thiệu",1,5,"c1,intro","giới thiệu","Giới thiệu về môn học"<br/>
                        "Chương 2: Cơ bản",6,20,"c2,basic","cơ bản","Các khái niệm cơ bản"
                      </code>
                      <p className="mt-2">
                        <a
                          href="data:text/csv;charset=utf-8,title,startPage,endPage,aliases,keywords,description%0A%22Ch%C6%B0%C6%A1ng%201%3A%20Gi%E1%BB%9Bi%20thi%E1%BB%87u%22,1,5,%22c1,intro%22,%22gi%E1%BB%9Bi%20thi%E1%BB%87u%22,%22Gi%E1%BB%9Bi%20thi%E1%BB%87u%20v%E1%BB%81%20m%C3%B4n%20h%E1%BB%8Dc%22%0A%22Ch%C6%B0%C6%A1ng%202%3A%20C%C6%A1%20b%E1%BB%89n%22,6,20,%22c2,basic%22,%22c%C6%A1%20b%E1%BB%89n%22,%22C%C3%A1c%20kh%C3%A1i%20ni%E1%BB%87m%20c%C6%A1%20b%E1%BB%89n%22"
                          download="toc-template.csv"
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          Tải mẫu CSV
                        </a>
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-700">
                      <p className="mb-2"><strong>Cấu trúc file JSON:</strong></p>
                      <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
{`[
  {
    "title": "Chương 1: Giới thiệu",
    "startPage": 1,
    "endPage": 5,
    "aliases": ["c1", "intro"],
    "keywords": ["giới thiệu"],
    "description": "Giới thiệu về môn học"
  }
]`}
                      </pre>
                      <p className="mt-2">
                        <a
                          href="data:text/json;charset=utf-8,%5B%7B%22title%22%3A%22Ch%C6%B0%C6%A1ng%201%3A%20Gi%E1%BB%9Bi%20thi%E1%BB%87u%22%2C%22startPage%22%3A1%2C%22endPage%22%3A5%2C%22aliases%22%3A%5B%22c1%22%2C%22intro%22%5D%2C%22keywords%22%3A%5B%22gi%E1%BB%9Bi%20thi%E1%BB%87u%22%5D%2C%22description%22%3A%22Gi%E1%BB%9Bi%20thi%E1%BB%87u%20v%E1%BB%81%20m%C3%B4n%20h%E1%BB%8Dc%22%7D%5D"
                          download="toc-template.json"
                          className="text-blue-600 underline hover:text-blue-800"
                        >
                          Tải mẫu JSON
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                {/* File upload */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept={uploadMode === "csv" ? ".csv" : ".json"}
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="toc-file-upload"
                    />
                    <label htmlFor="toc-file-upload">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                        {uploadFile ? (
                          <div>
                            <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <p className="text-sm">{uploadFile.name}</p>
                          </div>
                        ) : (
                          <div>
                            <UploadIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                              Click để chọn file {uploadMode.toUpperCase()}
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
                <Button
                  onClick={handleUploadFile}
                  disabled={!uploadFile || previewLoading}
                  variant="outline"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Xem trước
                </Button>

                {uploadPreview.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">
                      {uploadPreview.length} chương được tìm thấy
                    </p>
                    <Button onClick={handleConfirmUpload} disabled={previewLoading}>
                      <Check className="w-4 h-4 mr-2" />
                      Xác nhận import
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Hybrid Mode */}
            {tocMode === "hybrid" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold mb-4">Chế độ Hybrid</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Import từ file sau đó cho phép chỉnh sửa thủ công
                </p>
                <Button variant="outline" onClick={() => { setTocMode("pages"); }}>
                  Bắt đầu import
                </Button>
              </div>
            )}

            {/* Chapter List */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold mb-4">Danh sách chương ({chapters.length})</h3>
              {chapters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <List className="w-8 h-8 mx-auto mb-2" />
                  <p>Chưa có chương nào</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {chapters.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 w-6">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{chapter.title}</p>
                          <p className="text-sm text-gray-500">
                            Trang {chapter.startPage} - {chapter.endPage}
                            {chapter.aliases.length > 0 && (
                              <span className="ml-2">({chapter.aliases.join(", ")})</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(chapter.status)}
                        <Button variant="ghost" size="sm" onClick={() => handleEditChapter(chapter)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteChapter(chapter.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lessons Tab */}
        {activeTab === "lessons" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Danh sách bài học</h2>
              {chapters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2" />
                  <p>Chưa có bài học nào</p>
                  <p className="text-sm">Tạo chương trong tab Mục lục</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{chapter.title}</p>
                        <p className="text-sm text-gray-500">
                          Trang {chapter.startPage} - {chapter.endPage}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Xem
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Trích xuất
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approval Tab */}
        {activeTab === "approval" && (
          <div className="space-y-6">
            {/* Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Lọc theo trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="pending">Chờ duyệt</SelectItem>
                      <SelectItem value="approved">Đã duyệt</SelectItem>
                      <SelectItem value="rejected">Từ chối</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-500">
                    {filteredChapters.length} chương
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedChapters.size > 0 && (
                    <>
                      <Button onClick={handleBulkApprove} disabled={previewLoading}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Phê duyệt ({selectedChapters.size})
                      </Button>
                      <span className="text-gray-300">|</span>
                    </>
                  )}
                  <Button variant="outline" onClick={() => setSelectedChapters(new Set(chapters.map((c) => c.id)))}>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Chọn tất cả
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedChapters(new Set())}>
                    <Square className="w-4 h-4 mr-2" />
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            </div>

            {/* Chapter list with approval */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Phê duyệt chương</h2>
              {filteredChapters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Không có chương nào</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredChapters.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedChapters.has(chapter.id)
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleSelection(chapter.id)}>
                          {selectedChapters.has(chapter.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <span className="text-sm font-medium text-gray-500 w-6">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{chapter.title}</p>
                          <p className="text-sm text-gray-500">
                            Trang {chapter.startPage} - {chapter.endPage}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(chapter.status)}
                        {chapter.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveChapter(chapter.id)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Duyệt
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectChapter(chapter.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Từ chối
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Book approval */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Phê duyệt sách</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Trạng thái: {book.isApproved ? "Đã phê duyệt" : "Chưa phê duyệt"}</p>
                  {book.approvedAt && (
                    <p className="text-sm text-gray-500">
                      Ngày phê duyệt: {formatDate(book.approvedAt)}
                    </p>
                  )}
                </div>
                {!book.isApproved && (
                  <Button onClick={handleApproveBook}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Phê duyệt sách
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Lịch sử thay đổi</h2>
              <div className="text-center py-8 text-gray-500">
                <History className="w-8 h-8 mx-auto mb-2" />
                <p>Chưa có lịch sử</p>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tổng chương</p>
                    <p className="text-2xl font-bold">{chapters.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Đã phê duyệt</p>
                    <p className="text-2xl font-bold">
                      {chapters.filter((c) => c.status === "APPROVED").length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Số trang</p>
                    <p className="text-2xl font-bold">{book.pageCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Thống kê sử dụng</h2>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                <p>Chưa có dữ liệu</p>
              </div>
            </div>
          </div>
        )}

        {/* Versions Tab */}
        {activeTab === "versions" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Quản lý phiên bản</h2>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo phiên bản mới
                </Button>
              </div>
              {versions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <GitBranch className="w-8 h-8 mx-auto mb-2" />
                  <p>Chỉ có phiên bản hiện tại</p>
                  <p className="text-sm">v{book.version}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">v{version.version}</p>
                        <p className="text-sm text-gray-500">
                          {version.pageCount} trang · {formatFileSize(version.fileSize)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(version.isApproved ? "APPROVED" : version.tocStatus)}
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Chapter Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo chương mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tên chương *</label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="VD: Chương 1: Đại số"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Trang bắt đầu *</label>
                <Input
                  type="number"
                  value={createForm.startPage}
                  onChange={(e) => setCreateForm({ ...createForm, startPage: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={book?.pageCount}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Trang kết thúc *</label>
                <Input
                  type="number"
                  value={createForm.endPage}
                  onChange={(e) => setCreateForm({ ...createForm, endPage: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={book?.pageCount}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Alias (cách gọi khác)</label>
              <Input
                value={createForm.aliases}
                onChange={(e) => setCreateForm({ ...createForm, aliases: e.target.value })}
                placeholder="Các tên gọi khác, cách nhau bằng dấu phẩy"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Từ khóa</label>
              <Input
                value={createForm.keywords}
                onChange={(e) => setCreateForm({ ...createForm, keywords: e.target.value })}
                placeholder="Từ khóa, cách nhau bằng dấu phẩy"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mô tả</label>
              <Input
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Mô tả ngắn"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateChapter} disabled={!createForm.title}>
              <Save className="w-4 h-4 mr-2" />
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Chapter Dialog */}
      <Dialog open={!!editingChapter} onOpenChange={(open) => !open && setEditingChapter(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa chương</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tên chương *</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Trang bắt đầu *</label>
                <Input
                  type="number"
                  value={editForm.startPage}
                  onChange={(e) => setEditForm({ ...editForm, startPage: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={book?.pageCount}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Trang kết thúc *</label>
                <Input
                  type="number"
                  value={editForm.endPage}
                  onChange={(e) => setEditForm({ ...editForm, endPage: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={book?.pageCount}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChapter(null)}>
              Hủy
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="w-4 h-4 mr-2" />
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Import Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Xác nhận import mục lục</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Info banner */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-800">
                Import {pendingChapters.length} mục từ trang {tocStartPage}-{tocEndPage}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Chỉ các trang {tocStartPage}-{tocEndPage} được gửi đến AI. Không có trang nào khác được gửi.
              </p>
            </div>

            {/* Validation summary */}
            {(() => {
              const itemsWithPages = pendingChapters.filter((c: any) => c.pageStart || c.startPage).length;
              const itemsWithoutPages = pendingChapters.length - itemsWithPages;
              return (
                <div className="flex gap-4">
                  <div className="flex-1 p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-semibold text-green-700">{itemsWithPages}</p>
                    <p className="text-sm text-green-600">Có trang</p>
                  </div>
                  <div className="flex-1 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-lg font-semibold text-yellow-700">{itemsWithoutPages}</p>
                    <p className="text-sm text-yellow-600">Chưa có trang</p>
                  </div>
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-semibold text-gray-700">{pendingChapters.length}</p>
                    <p className="text-sm text-gray-600">Tổng cộng</p>
                  </div>
                </div>
              );
            })()}

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Chỉnh sửa trước khi import
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPendingChapters([
                      ...pendingChapters,
                      {
                        title: "Chương mới",
                        level: 1,
                        pageStart: null,
                        pageEnd: null,
                        aliases: [],
                        keywords: [],
                      },
                    ]);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm chương
                </Button>
                {pendingChapters.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500"
                    onClick={() => {
                      if (confirm("Xóa tất cả chương?")) {
                        setPendingChapters([]);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Xóa tất cả
                  </Button>
                )}
              </div>
            </div>

            {/* Chapters list with inline edit */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
              {pendingChapters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Chưa có chương nào</p>
                  <p className="text-sm">Nhấn "Xem trước" để trích xuất từ PDF hoặc "Thêm chương" để tạo thủ công</p>
                </div>
              ) : pendingChapters.map((ch: any, index: number) => {
                const levelLabels = ["", "Phần", "Chương", "Bài", "Hoạt động", "Bài tập"];
                const levelLabel = levelLabels[ch.level] || "Mục";
                const hasPage = ch.pageStart || ch.startPage;

                return (
                  <div key={ch.id || index} className={`p-3 rounded-lg border ${hasPage ? 'bg-white border-gray-200' : 'bg-yellow-50 border-yellow-300'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{levelLabel}</span>
                          {ch.status === "MissingPage" && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Thiếu trang</span>
                          )}
                          {ch.status === "Estimated" && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Ước tính</span>
                          )}
                          {ch.reason?.includes("Calculated") && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Tính toán</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {Math.round((ch.confidence || 0.5) * 100)}%
                          </span>
                        </div>
                        <Input
                          className="font-medium h-auto py-1"
                          value={ch.title}
                          onChange={(e) => {
                            const newChapters = [...pendingChapters];
                            newChapters[index] = { ...newChapters[index], title: e.target.value };
                            setPendingChapters(newChapters);
                          }}
                        />
                        {ch.reason && (
                          <p className="text-xs text-gray-500 mt-1">{ch.reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm whitespace-nowrap">Từ trang:</label>
                        <Input
                          type="number"
                          className="w-20"
                          placeholder="?"
                          value={ch.pageStart || ch.startPage || ""}
                          onChange={(e) => {
                            const newChapters = [...pendingChapters];
                            newChapters[index] = { ...newChapters[index], pageStart: parseInt(e.target.value) || null, startPage: parseInt(e.target.value) || null };
                            setPendingChapters(newChapters);
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm whitespace-nowrap">Đến trang:</label>
                        <Input
                          type="number"
                          className="w-20"
                          placeholder="?"
                          value={ch.pageEnd || ch.endPage || ""}
                          onChange={(e) => {
                            const newChapters = [...pendingChapters];
                            newChapters[index] = { ...newChapters[index], pageEnd: parseInt(e.target.value) || null, endPage: parseInt(e.target.value) || null };
                            setPendingChapters(newChapters);
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
                        onClick={() => {
                          const newChapters = pendingChapters.filter((_: any, i: number) => i !== index);
                          setPendingChapters(newChapters);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleConfirmImport} disabled={previewLoading}>
              {previewLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Xác nhận và lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
