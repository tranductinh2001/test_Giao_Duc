"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, X, ChevronLeft, FileCheck, Info, BookOpen, GraduationCap, Lightbulb } from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Circular {
  id: string;
  code: string;
  title: string;
  type: string;
  applicableLevel: string[];
  applicableSubjects: string[];
}

interface Textbook {
  id: string;
  code: string;
  name: string;
  grade: string;
  subject: string;
  version: string;
  pageCount: number;
}

interface Chapter {
  id: string;
  chapterNumber: number | null;
  title: string;
  aliases: string[];
  startPage: number;
  endPage: number;
  description: string | null;
}

interface TeachingMethod {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  source: "chapter" | "textbook";
  priority: number;
  note: string | null;
  isRecommended: boolean;
}

export default function UploadLessonPlanPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [circularId, setCircularId] = useState<string>("");
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loadingCirculars, setLoadingCirculars] = useState(true);

  // Textbook selection state
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [filteredGrades, setFilteredGrades] = useState<string[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<string[]>([]);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedTextbookId, setSelectedTextbookId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [teachingMethods, setTeachingMethods] = useState<TeachingMethod[]>([]);
  const [loadingTeachingMethods, setLoadingTeachingMethods] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTextbooks, setLoadingTextbooks] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Fetch metadata and circulars on mount
  useEffect(() => {
    fetchMetadata();
    loadCirculars();
  }, []);

  const loadCirculars = async () => {
    try {
      const res = await fetch("/api/lesson-plans/upload");
      const data = await res.json();
      if (data.success) {
        setCirculars(data.data);
      }
    } catch (error) {
      console.error("Error fetching circulars:", error);
    } finally {
      setLoadingCirculars(false);
    }
  };

  // Fetch grades when subject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchGradesForSubject(selectedSubject);
    } else {
      setFilteredGrades([]);
    }
  }, [selectedSubject]);

  // Fetch subjects when grade changes
  useEffect(() => {
    if (selectedGrade) {
      fetchSubjectsForGrade(selectedGrade);
    } else {
      setFilteredSubjects([]);
    }
  }, [selectedGrade]);

  // Fetch textbooks when subject or grade changes
  useEffect(() => {
    if (selectedSubject || selectedGrade) {
      fetchTextbooks();
    } else {
      setTextbooks([]);
    }
  }, [selectedSubject, selectedGrade]);

  // Fetch chapters when textbook changes
  useEffect(() => {
    if (selectedTextbookId) {
      fetchChapters();
    }
  }, [selectedTextbookId]);

  // Fetch teaching methods when chapter is selected
  useEffect(() => {
    if (selectedTextbookId && selectedChapterId) {
      fetchTeachingMethods();
    } else {
      setTeachingMethods([]);
    }
  }, [selectedTextbookId, selectedChapterId]);

  const fetchTeachingMethods = async () => {
    if (!selectedTextbookId) return;
    setLoadingTeachingMethods(true);
    try {
      const params = new URLSearchParams();
      if (selectedChapterId) params.append("chapterId", selectedChapterId);

      const res = await fetch(`/api/textbook/books/${selectedTextbookId}/teaching-methods?${params}`);
      const data = await res.json();
      if (data.success) {
        setTeachingMethods(data.data.methods || []);
      }
    } catch (error) {
      console.error("Error fetching teaching methods:", error);
      setTeachingMethods([]);
    } finally {
      setLoadingTeachingMethods(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      // Include all textbooks (including not approved) for upload flow
      const res = await fetch("/api/textbook/metadata?includeAll=true");
      const data = await res.json();
      if (data.success) {
        setAvailableSubjects(data.data.subjects || []);
        setAvailableGrades(data.data.grades || []);
      }
    } catch (error) {
      console.error("Error fetching metadata:", error);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const fetchGradesForSubject = async (subject: string) => {
    setLoadingGrades(true);
    try {
      const res = await fetch(`/api/textbook/metadata?subject=${encodeURIComponent(subject)}&includeAll=true`);
      const data = await res.json();
      if (data.success) {
        setFilteredGrades(data.data.grades || []);
      }
    } catch (error) {
      console.error("Error fetching grades for subject:", error);
      setFilteredGrades([]);
    } finally {
      setLoadingGrades(false);
    }
  };

  const fetchSubjectsForGrade = async (grade: string) => {
    setLoadingSubjects(true);
    try {
      const res = await fetch(`/api/textbook/metadata?grade=${encodeURIComponent(grade)}&includeAll=true`);
      const data = await res.json();
      if (data.success) {
        setFilteredSubjects(data.data.subjects || []);
      }
    } catch (error) {
      console.error("Error fetching subjects for grade:", error);
      setFilteredSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchTextbooks = async () => {
    setLoadingTextbooks(true);
    try {
      const params = new URLSearchParams();
      params.append("includeAll", "true");
      if (selectedSubject) params.append("subject", selectedSubject);
      if (selectedGrade) params.append("grade", selectedGrade);

      const res = await fetch(`/api/textbook/books?${params}`);
      const data = await res.json();
      if (data.success) {
        setTextbooks(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching textbooks:", error);
    } finally {
      setLoadingTextbooks(false);
    }
  };

  const fetchChapters = async () => {
    if (!selectedTextbookId || selectedTextbookId.trim() === "") {
      setChapters([]);
      return;
    }
    setLoadingChapters(true);
    setChapters([]);
    setSelectedChapterId("");
    try {
      // Include all chapters (including not approved) for upload flow
      const url = `/api/textbook/books/${encodeURIComponent(selectedTextbookId)}/chapters?includeAll=true`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error("Error fetching chapters:", res.status, res.statusText);
        setChapters([]);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setChapters(data.data || []);
      } else {
        console.error("Error response:", data.message);
        setChapters([]);
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };

  const selectedCircular = circulars.find(c => c.id === circularId);
  const selectedTextbook = textbooks.find(t => t.id === selectedTextbookId);
  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ];

  const maxSizes: Record<string, number> = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 30 * 1024 * 1024,
    "application/msword": 30 * 1024 * 1024,
    "application/pdf": 100 * 1024 * 1024,
    "image/png": 30 * 1024 * 1024,
    "image/jpeg": 30 * 1024 * 1024,
    "image/jpg": 30 * 1024 * 1024,
    "image/webp": 30 * 1024 * 1024,
    "image/bmp": 30 * 1024 * 1024,
    "image/tiff": 30 * 1024 * 1024,
  };

  const getFileTypeDisplay = (mimeType: string): string => {
    const typeMap: Record<string, string> = {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
      "application/msword": "Word Document",
      "application/pdf": "PDF Document",
      "image/png": "Image (PNG)",
      "image/jpeg": "Image (JPEG)",
      "image/jpg": "Image (JPEG)",
      "image/webp": "Image (WEBP)",
      "image/bmp": "Image (BMP)",
      "image/tiff": "Image (TIFF)",
    };
    return typeMap[mimeType] || "Unknown";
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!allowedMimeTypes.includes(selectedFile.type)) {
      toast.error("Định dạng không được hỗ trợ. Hỗ trợ: DOC, DOCX, PDF, PNG, JPG, JPEG, WEBP, BMP, TIFF");
      return;
    }

    const maxSize = maxSizes[selectedFile.type] || 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      toast.error(`File không được vượt quá ${maxSizeMB}MB`);
      return;
    }

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.(docx|doc|pdf|png|jpg|jpeg|webp|bmp|tiff)$/i, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Vui lòng chọn file");
      return;
    }

    if (!circularId) {
      toast.error("Vui lòng chọn Công văn để review");
      return;
    }

    // Require textbook selection for proper review
    if (!selectedTextbookId || !selectedChapterId) {
      toast.error("Vui lòng chọn Sách giáo khoa và Bài học để review với AI");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);
      // Use textbook data for subject and grade
      if (selectedTextbook) {
        formData.append("subject", selectedTextbook.subject);
        formData.append("gradeLevel", selectedTextbook.grade);
      }
      formData.append("circularId", circularId);
      formData.append("textbookBookId", selectedTextbookId);
      formData.append("textbookLessonTitle", selectedChapter?.title || "");

      const res = await fetch("/api/lesson-plans/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Upload giáo án thành công!");
        router.push(`/lesson-plans/${data.data.id}`);
      } else {
        toast.error(data.message || "Upload thất bại");
      }
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Lỗi khi upload file");
    } finally {
      setUploading(false);
    }
  };

  const clearTextbookSelection = () => {
    setSelectedTextbookId("");
    setSelectedChapterId("");
    setChapters([]);
    setTeachingMethods([]);
    // Note: We don't clear filteredSubjects/filteredGrades here
    // because they should persist to help users understand what combinations exist
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/lesson-plans"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Danh sách giáo án
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">Upload mới</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Upload giáo án
          </h1>
          <p className="text-muted-foreground">
            Tải lên file Word, PDF hoặc hình ảnh để bắt đầu review với AI
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            } ${file ? "bg-card" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 bg-primary/10 text-primary px-4 py-3 rounded-lg">
                  <FileText className="w-6 h-6" />
                  <span className="font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="ml-2 hover:text-destructive transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                    {getFileTypeDisplay(file.type)}
                  </span>
                  <span className="text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground mb-2">
                  Kéo thả file vào đây
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  hoặc click để chọn file
                </p>
                <p className="text-xs text-muted-foreground">
                  Hỗ trợ: DOC, DOCX, PDF, PNG, JPG, JPEG, WEBP, BMP, TIFF (tối đa 100MB)
                </p>
              </>
            )}

            <input
              type="file"
              accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/bmp,image/tiff"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Textbook Selection - Required for AI Review */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Chọn Sách giáo khoa <span className="text-destructive">*</span>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  AI sẽ sử dụng nội dung bài học từ SGK để review giáo án
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                Bắt buộc
              </div>
            </div>

            {loadingMetadata ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Subject and Grade Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Môn học
                    </label>
                    <Select
                      value={selectedSubject}
                      onValueChange={(v) => { setSelectedSubject(v); clearTextbookSelection(); }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingSubjects ? "Đang tải..." : "Chọn môn học"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedGrade ? filteredSubjects : availableSubjects).length === 0 ? (
                          <div className="py-2 px-4 text-sm text-muted-foreground text-center">
                            Chưa có dữ liệu
                          </div>
                        ) : (
                          (selectedGrade ? filteredSubjects : availableSubjects).map((subj) => (
                            <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Lớp
                    </label>
                    <Select
                      value={selectedGrade}
                      onValueChange={(v) => { setSelectedGrade(v); clearTextbookSelection(); }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingGrades ? "Đang tải..." : "Chọn lớp"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedSubject ? filteredGrades : availableGrades).length === 0 ? (
                          <div className="py-2 px-4 text-sm text-muted-foreground text-center">
                            Chưa có dữ liệu
                          </div>
                        ) : (
                          (selectedSubject ? filteredGrades : availableGrades).map((grade) => (
                            <SelectItem key={grade} value={grade}>Lớp {grade}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Textbook Selection */}
                {selectedSubject || selectedGrade ? (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Sách giáo khoa
                    </label>
                    {loadingTextbooks ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : textbooks.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Không có sách phù hợp
                      </div>
                    ) : (
                      <Select value={selectedTextbookId} onValueChange={(v) => { setSelectedTextbookId(v); setSelectedChapterId(""); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn sách giáo khoa" />
                        </SelectTrigger>
                        <SelectContent>
                          {textbooks.map((book) => (
                            <SelectItem key={book.id} value={book.id}>
                              {book.name} (v{book.version})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : null}

                {/* Chapter/Lesson Selection */}
                {selectedTextbookId && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Bài học <span className="text-destructive">*</span>
                    </label>
                    {loadingChapters ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : chapters.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Không có bài học nào
                      </div>
                    ) : (
                      <ScrollArea className="h-48">
                        <div className="space-y-1">
                          {chapters.map((chapter) => (
                            <button
                              key={chapter.id}
                              type="button"
                              onClick={() => setSelectedChapterId(chapter.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                selectedChapterId === chapter.id
                                  ? "bg-primary/10 border border-primary"
                                  : "border border-transparent hover:bg-muted"
                              }`}
                            >
                              <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {chapter.chapterNumber && `Bài ${chapter.chapterNumber}: `}{chapter.title}
                                </div>
                                {chapter.description && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {chapter.description}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex-shrink-0">
                                Trang {chapter.startPage}-{chapter.endPage}
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected Textbook Info */}
            {selectedTextbookId && selectedChapter && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {selectedTextbook?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Đã chọn: <strong>{selectedChapter.title}</strong>
                      <span className="mx-2">|</span>
                      Trang {selectedChapter.startPage}-{selectedChapter.endPage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Teaching Methods - Auto-loaded after Bai hoc selection */}
            {selectedChapterId && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <h4 className="font-semibold text-foreground">
                      Phương pháp giảng dạy được áp dụng
                    </h4>
                  </div>
                  {teachingMethods.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {teachingMethods.length} phương pháp
                    </span>
                  )}
                </div>

                {loadingTeachingMethods ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : teachingMethods.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <p>Chưa có phương pháp giảng dạy nào được liên kết với bài học này.</p>
                    <p className="text-xs mt-1">Liên hệ admin để thêm phương pháp phù hợp.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {teachingMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          method.isRecommended
                            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                            : "bg-muted/30 border-border"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground truncate">
                              {method.name}
                            </span>
                            {method.isRecommended && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">
                                Đề xuất
                              </span>
                            )}
                          </div>
                          {method.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {method.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Circular Selection - Required */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Chọn Công văn <span className="text-destructive">*</span>
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Giáo án sẽ được review theo tiêu chí của Công văn được chọn
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="w-4 h-4" />
                Bắt buộc
              </div>
            </div>

            {loadingCirculars ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : circulars.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Chưa có Công văn nào. Vui lòng liên hệ admin.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {circulars.map((circular) => (
                  <label
                    key={circular.id}
                    className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      circularId === circular.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="circular"
                      value={circular.id}
                      checked={circularId === circular.id}
                      onChange={(e) => setCircularId(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {circular.code}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          circular.type === "CURRICULUM" ? "bg-primary/10 text-primary" :
                          circular.type === "REGULATION" ? "bg-destructive/10 text-destructive" :
                          circular.type === "GUIDELINE" ? "bg-success/10 text-success" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {circular.type}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1">
                        {circular.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {circular.applicableLevel.length > 0 && (
                          <span>Lớp: {circular.applicableLevel.join(", ")}</span>
                        )}
                        {circular.applicableSubjects.length > 0 && (
                          <span>Môn: {circular.applicableSubjects.join(", ")}</span>
                        )}
                      </div>
                    </div>
                    {circularId === circular.id && (
                      <div className="absolute top-4 right-4">
                        <FileCheck className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selected Circular Info */}
          {selectedCircular && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Đã chọn: {selectedCircular.code}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Giáo án sẽ được review theo tiêu chí của Công văn này.
                    {selectedCircular.applicableLevel.length > 0 && (
                      <> Áp dụng cho lớp: {selectedCircular.applicableLevel.join(", ")}.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Metadata - Auto-filled from textbook */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <h3 className="text-lg font-semibold text-foreground">
              Thông tin giáo án
            </h3>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Tên giáo án <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Bài 1 - Sinh học tế bào"
                className="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>

            {/* Auto-detected from textbook selection - Read only */}
            {selectedTextbook && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Môn học
                  </label>
                  <div className="h-12 px-4 rounded-xl border border-border bg-muted/30 flex items-center text-foreground">
                    {selectedTextbook.subject}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Lớp
                  </label>
                  <div className="h-12 px-4 rounded-xl border border-border bg-muted/30 flex items-center text-foreground">
                    Lớp {selectedTextbook.grade}
                  </div>
                </div>
              </div>
            )}

            {/* Hidden fields for form submission - use textbook data */}
            {selectedTextbook && (
              <>
                <input type="hidden" name="subject" value={selectedTextbook.subject} />
                <input type="hidden" name="gradeLevel" value={selectedTextbook.grade} />
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Link href="/lesson-plans" className="flex-1">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
              >
                Hủy
              </Button>
            </Link>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={uploading}
              disabled={!file || !circularId || !selectedTextbookId || !selectedChapterId || uploading}
              className="flex-1"
            >
              {uploading ? "Đang upload..." : "Upload giáo án"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
