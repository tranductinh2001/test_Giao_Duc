"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Loader2,
  Search,
  Settings,
  GraduationCap,
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
  tocStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  ocrStatus: "NOT_NEEDED" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  _count?: { chapters: number };
}

interface TextbookChapter {
  id: string;
  chapterNumber?: number;
  title: string;
  aliases: string[];
  startPage: number;
  endPage: number;
  confidence: number;
}

interface TextbookStats {
  totalBooks: number;
  totalPages: number;
  totalSize: number;
}

interface EducationLevel {
  id: string;
  name: string;
  order: number;
}

interface Grade {
  id: string;
  name: string;
  order: number;
}

interface Subject {
  id: string;
  name: string;
  aliases: string[];
}

export default function TextbooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<TextbookBook[]>([]);
  const [stats, setStats] = useState<TextbookStats>({ totalBooks: 0, totalPages: 0, totalSize: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<TextbookBook | null>(null);
  const [chapters, setChapters] = useState<TextbookChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Education config from database
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [gradesByLevel, setGradesByLevel] = useState<Record<string, Grade[]>>({});
  const [subjectsByLevel, setSubjectsByLevel] = useState<Record<string, Subject[]>>({});
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Filters
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadForm, setUploadForm] = useState({
    code: "",
    name: "",
    description: "",
    educationLevel: "",
    grade: "",
    subject: "",
    autoIndex: "true",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // View dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewBook, setViewBook] = useState<TextbookBook | null>(null);

  // Fetch education config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/admin/education-config");
        const data = await res.json();
        if (data.success) {
          setEducationLevels(data.data.levels || []);
          setGradesByLevel(data.data.gradesByLevel || {});
          setSubjectsByLevel(data.data.subjectsByLevel || {});
        }
      } catch (error) {
        console.error("Error fetching education config:", error);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // Get available grades for selected education level (for upload form)
  const availableGrades = uploadForm.educationLevel
    ? gradesByLevel[uploadForm.educationLevel] || []
    : [];

  // Get available subjects for selected education level (for upload form)
  const availableSubjects = uploadForm.educationLevel
    ? subjectsByLevel[uploadForm.educationLevel] || []
    : [];

  // Get all grades for filter (flatten)
  const allGrades = Object.values(gradesByLevel).flat();
  const allSubjects = Object.values(subjectsByLevel).flat();

  useEffect(() => {
    fetchBooks();
  }, [filterGrade, filterSubject, filterStatus]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterGrade !== "all") params.set("grade", filterGrade);
      if (filterSubject !== "all") params.set("subject", filterSubject);
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/admin/textbooks?${params}`);
      const data = await res.json();
      if (data.success) {
        setBooks(data.data);
        setStats(data.stats || { totalBooks: 0, totalPages: 0, totalSize: 0 });
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEducationLevelChange = (level: string) => {
    setUploadForm({
      ...uploadForm,
      educationLevel: level,
      grade: "", // Reset grade
      subject: "", // Reset subject
    });
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadForm.code || !uploadForm.name || !uploadForm.grade || !uploadForm.subject) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("code", uploadForm.code);
      formData.append("name", uploadForm.name);
      formData.append("description", uploadForm.description);
      formData.append("grade", uploadForm.grade);
      formData.append("subject", uploadForm.subject);
      formData.append("autoIndex", uploadForm.autoIndex);

      setUploadProgress(30);
      const res = await fetch("/api/admin/textbooks", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(70);
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setUploadOpen(false);
        resetUploadForm();
        if (data.data?.id) {
          router.push(`/admin/textbooks/${data.data.id}/studio`);
        } else {
          fetchBooks();
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Lỗi khi upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      code: "",
      name: "",
      description: "",
      educationLevel: "",
      grade: "",
      subject: "",
      autoIndex: "true"
    });
    setUploadFile(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa sách này?")) return;

    try {
      const res = await fetch(`/api/admin/textbooks/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã xóa sách");
        fetchBooks();
        if (selectedBook?.id === id) setSelectedBook(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Lỗi khi xóa");
    }
  };

  const handleRebuildIndex = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/textbooks/${id}/rebuild-index`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã bắt đầu rebuild index");
        setTimeout(fetchBooks, 2000);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Rebuild error:", error);
      toast.error("Lỗi khi rebuild");
    }
  };

  const handleViewChapters = async (book: TextbookBook) => {
    setViewBook(book);
    setViewOpen(true);
    setLoadingChapters(true);

    try {
      const res = await fetch(`/api/admin/textbooks/${book.id}`);
      const data = await res.json();
      if (data.success) {
        setChapters(data.data.chapters || []);
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
    } finally {
      setLoadingChapters(false);
    }
  };

  const filteredBooks = books.filter(book => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        book.name.toLowerCase().includes(query) ||
        book.code.toLowerCase().includes(query) ||
        book.grade.toLowerCase().includes(query) ||
        book.subject.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Hoàn thành</Badge>;
      case "PROCESSING":
        return <Badge variant="info"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang xử lý</Badge>;
      case "FAILED":
        return <Badge variant="danger"><AlertCircle className="w-3 h-3 mr-1" /> Thất bại</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Chờ xử lý</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Quản lý Sách Giáo Khoa
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Upload và quản lý sách giáo khoa PDF cho AI Lesson Review
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Sách
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tổng số sách</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalBooks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tổng số trang</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPages.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dung lượng</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatFileSize(stats.totalSize)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm sách..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả lớp</SelectItem>
                {allGrades.map((g) => (
                  <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Môn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả môn</SelectItem>
                {allSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                <SelectItem value="PROCESSING">Đang xử lý</SelectItem>
                <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                <SelectItem value="FAILED">Thất bại</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Book List */}
      <div className="px-6 pb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Chưa có sách nào</p>
              <Button variant="ghost" onClick={() => setUploadOpen(true)} className="mt-2">
                Upload sách đầu tiên
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {book.name}
                          </h3>
                          {getStatusBadge(book.tocStatus)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-mono">{book.code}</span>
                          <span>{book.grade}</span>
                          <span>{book.subject}</span>
                          <span>{book.pageCount} trang</span>
                          <span>{formatFileSize(book.fileSize)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/textbooks/${book.id}/studio`}>
                        <Button variant="ghost" size="sm" title="Mở Book Studio">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewChapters(book)}
                        disabled={book.tocStatus !== "COMPLETED"}
                        title="Xem chương"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRebuildIndex(book.id)}
                        disabled={book.tocStatus === "PROCESSING"}
                        title="Rebuild index"
                      >
                        <RefreshCw className={`w-4 h-4 ${book.tocStatus === "PROCESSING" ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(book.id)}
                        title="Xóa sách"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Sách Giáo Khoa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mã sách *</label>
              <Input
                placeholder="VD: TOAN_LOP5_CB"
                value={uploadForm.code}
                onChange={(e) => setUploadForm({ ...uploadForm, code: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tên sách *</label>
              <Input
                placeholder="VD: Toán lớp 5 - Cơ bản"
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mô tả</label>
              <Input
                placeholder="Mô tả ngắn về sách"
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Education Level */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cấp học *</label>
              <Select
                value={uploadForm.educationLevel}
                onValueChange={handleEducationLevelChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn cấp học" />
                </SelectTrigger>
                <SelectContent>
                  {educationLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade - dependent on Education Level */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lớp *</label>
              <Select
                value={uploadForm.grade}
                onValueChange={(v) => setUploadForm({ ...uploadForm, grade: v })}
                disabled={!uploadForm.educationLevel}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={uploadForm.educationLevel ? "Chọn lớp" : "Chọn cấp học trước"} />
                </SelectTrigger>
                <SelectContent>
                  {availableGrades.map((g) => (
                    <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject - dependent on Education Level */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Môn *</label>
              <Select
                value={uploadForm.subject}
                onValueChange={(v) => setUploadForm({ ...uploadForm, subject: v })}
                disabled={!uploadForm.educationLevel}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={uploadForm.educationLevel ? "Chọn môn" : "Chọn cấp học trước"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">File PDF *</label>
              <div className="mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  {uploadFile ? (
                    <div>
                      <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">{uploadFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(uploadFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click để chọn file PDF</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoIndex"
                checked={uploadForm.autoIndex === "true"}
                onChange={(e) => setUploadForm({ ...uploadForm, autoIndex: e.target.checked ? "true" : "false" })}
                className="rounded"
              />
              <label htmlFor="autoIndex" className="text-sm text-gray-700 dark:text-gray-300">
                Tự động index TOC sau khi upload
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); resetUploadForm(); }}>
              Hủy
            </Button>
            <Button onClick={handleUpload} disabled={uploading || loadingConfig}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang upload... {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Chapters Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {viewBook?.name} - Mục lục
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {loadingChapters ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : chapters.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Chưa có chương nào được index</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chapters.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-8">
                      {chapter.chapterNumber || index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{chapter.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Trang {chapter.startPage} - {chapter.endPage}
                        {chapter.aliases.length > 0 && (
                          <span className="ml-2 text-xs">
                            (Alias: {chapter.aliases.join(", ")})
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {Math.round(chapter.confidence * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
