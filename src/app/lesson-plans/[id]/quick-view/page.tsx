/**
 * Professional Quick View - Complete Rewrite
 *
 * Features:
 * - Supports DOCX, PDF, and Images
 * - Client-side DOCX parsing with mammoth.js
 * - Beautiful loading states
 * - Professional document display
 * - Error handling
 * - Fallback options
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, Download, Loader2, AlertCircle, Image as ImageIcon, File } from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import mammoth from "mammoth";

interface LessonPlanInfo {
  id: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  status: string;
}

// Detect file type from MIME type or filename
function getFileType(mimeType: string, filename: string): "docx" | "pdf" | "image" | "unknown" {
  const ext = filename.toLowerCase().split(".").pop() || "";

  if (mimeType.includes("pdf") || ext === "pdf") return "pdf";
  if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "bmp", "tiff"].includes(ext)) return "image";
  if (mimeType.includes("word") || ["docx", "doc"].includes(ext)) return "docx";

  return "unknown";
}

export default function QuickViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [lessonPlan, setLessonPlan] = useState<LessonPlanInfo | null>(null);

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  const loadDocument = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Get lesson plan info
      console.log("[QuickView] Fetching lesson plan info...");
      const infoRes = await fetch(`/api/lesson-plans/${id}`);
      const infoData = await infoRes.json();

      if (!infoData.success) {
        throw new Error(infoData.message || "Failed to load lesson plan");
      }

      const planInfo = infoData.data;
      setLessonPlan(planInfo);
      console.log("[QuickView] Lesson plan:", planInfo.title);

      // 2. Download file
      console.log("[QuickView] Downloading file...");
      const fileRes = await fetch(`/api/lesson-plans/${id}/file`);

      if (!fileRes.ok) {
        const errorData = await fileRes.json();
        throw new Error(errorData.message || "Failed to load file");
      }

      const blob = await fileRes.blob();
      console.log("[QuickView] File downloaded, size:", blob.size, "type:", blob.type);

      // 3. Detect file type and process accordingly
      const fileType = getFileType(planInfo.mimeType || "", planInfo.originalFilename || "");
      console.log("[QuickView] File type detected:", fileType);

      if (fileType === "docx") {
        // 3a. Convert DOCX to HTML with mammoth
        console.log("[QuickView] Converting DOCX to HTML...");
        const arrayBuffer = await blob.arrayBuffer();

        const result = await mammoth.convertToHtml({ arrayBuffer });

        console.log("[QuickView] Conversion complete");
        console.log("[QuickView] HTML length:", result.value.length);
        console.log("[QuickView] Messages:", result.messages);

        if (!result.value || result.value.trim().length === 0) {
          throw new Error("Document is empty or could not be converted");
        }

        setHtmlContent(result.value);
      } else if (fileType === "pdf") {
        // 3b. For PDF, show embedded viewer
        const pdfUrl = URL.createObjectURL(blob);
        setHtmlContent(`<div class="pdf-viewer"><iframe src="${pdfUrl}#toolbar=0&view=FitH" style="width:100%;height:80vh;border:none;"></iframe></div>`);
      } else if (fileType === "image") {
        // 3c. For images, show directly
        const imageUrl = URL.createObjectURL(blob);
        setHtmlContent(`<div class="image-viewer"><img src="${imageUrl}" style="max-width:100%;height:auto;" /></div>`);
      } else {
        // Unknown type - just show download option
        setHtmlContent(`<div class="unknown-viewer"><p>Không thể xem trực tiếp loại file này.</p><p>Vui lòng tải xuống để xem.</p></div>`);
      }

      toast.success("Đã tải giáo án!");
    } catch (err) {
      console.error("[QuickView] Error:", err);
      const message = err instanceof Error ? err.message : "Lỗi khi tải file";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/file`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = lessonPlan?.originalFilename || "document.docx";
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);

      toast.success("Đã tải xuống!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Lỗi khi tải xuống");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Đang tải giáo án...
          </h2>
          <p className="text-gray-600">
            Đang tải file...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Không thể tải giáo án
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={loadDocument} variant="primary">
              Thử lại
            </Button>
            <Link href={`/lesson-plans/${id}`}>
              <Button variant="outline">Quay lại</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success - Display document
  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-zinc-900">
      {/* Header Bar */}
      <div className="h-auto min-h-[56px] sm:h-14 bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 sticky top-0 z-10 shadow-sm">
        <div className="h-full max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 w-full">
            <Link href={`/lesson-plans/${id}`}>
              <Button variant="ghost" size="sm" className="min-h-[40px]">
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Quay lại</span>
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                {lessonPlan?.title || "Xem trước giáo án"}
              </h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400 hidden sm:block">
                Xem nhanh - Không cần parse AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button onClick={handleExport} size="sm" variant="outline" className="flex-1 sm:flex-initial min-h-[40px]">
              <Download className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Tải xuống</span>
              <span className="sm:hidden">Tải</span>
            </Button>

            {lessonPlan?.status === "UPLOADED" && (
              <Link href={`/lesson-plans/${id}`} className="flex-1 sm:flex-initial">
                <Button size="sm" variant="primary" className="w-full min-h-[40px]">
                  Parse
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="py-8">
        <div className="max-w-[210mm] mx-auto px-8">
          {/* A4 Page */}
          <div
            className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            style={{
              minHeight: "297mm",
              padding: "25mm",
            }}
          >
            {/* Rendered HTML Content */}
            <div
              className="docx-content prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{
                fontFamily: "'Times New Roman', serif",
                fontSize: "12pt",
                lineHeight: "1.6",
                color: "#000",
              }}
            />
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                💡 Xem nhanh file Word
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                Đây là bản xem nhanh được chuyển đổi trực tiếp từ file Word.
                Để sử dụng đầy đủ tính năng AI review, kiểm tra lỗi, và chỉnh sửa,
                bạn cần parse giáo án.
              </p>
              {lessonPlan?.status === "UPLOADED" && (
                <Link href={`/lesson-plans/${id}`}>
                  <Button size="sm" variant="primary">
                    Parse với AI để Review →
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for Word content */}
      <style jsx global>{`
        .docx-content p {
          margin-bottom: 0.75em;
        }

        .docx-content h1,
        .docx-content h2,
        .docx-content h3 {
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          color: #111;
        }

        .docx-content h1 {
          font-size: 16pt;
        }

        .docx-content h2 {
          font-size: 14pt;
        }

        .docx-content h3 {
          font-size: 13pt;
        }

        .docx-content ul,
        .docx-content ol {
          margin-left: 1.5em;
          margin-bottom: 0.75em;
        }

        .docx-content li {
          margin-bottom: 0.25em;
        }

        .docx-content strong {
          font-weight: 600;
        }

        .docx-content em {
          font-style: italic;
        }

        .docx-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }

        .docx-content table td,
        .docx-content table th {
          border: 1px solid #ddd;
          padding: 8px;
        }

        .docx-content table th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
