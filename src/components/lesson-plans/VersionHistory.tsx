"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Download,
  FileText,
  RotateCcw,
  GitBranch,
  User,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface Version {
  id: string;
  versionNumber: number;
  filePath: string;
  fileUrl: string;
  fileSize: bigint;
  fileHash: string;
  changeSummary: string | null;
  changesCount: number;
  commentsCount: number;
  createdBy: string;
  isPublished: boolean;
  createdAt: string;
  creator: {
    name: string;
    email: string;
  };
}

interface VersionHistoryProps {
  lessonPlanId: string;
  currentVersion?: number;
  onRestoreVersion?: (versionNumber: number) => void;
}

export default function VersionHistory({
  lessonPlanId,
  currentVersion,
  onRestoreVersion,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [lessonPlanId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lesson-plans/${lessonPlanId}/versions`);
      const data = await response.json();

      if (data.success) {
        setVersions(data.data);
      } else {
        toast.error(data.message || "Không thể tải lịch sử versions");
      }
    } catch (error) {
      console.error("Error loading versions:", error);
      toast.error("Lỗi khi tải lịch sử versions");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVersion = async (version: Version) => {
    try {
      const link = document.createElement("a");
      link.href = version.fileUrl;
      link.download = `lesson_v${version.versionNumber}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Đã tải version ${version.versionNumber}`);
    } catch (error) {
      console.error("Error downloading version:", error);
      toast.error("Lỗi khi tải file");
    }
  };

  const handleRestoreVersion = async (version: Version) => {
    if (!confirm(`Bạn có chắc muốn khôi phục về version ${version.versionNumber}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/lesson-plans/${lessonPlanId}/versions/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber: version.versionNumber }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Đã khôi phục version");
        onRestoreVersion?.(version.versionNumber);
        loadVersions();
      } else {
        toast.error(data.message || "Không thể khôi phục version");
      }
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Lỗi khi khôi phục version");
    }
  };

  const formatFileSize = (bytes: bigint): string => {
    const size = Number(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-12">
        <GitBranch className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Chưa có versions nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Lịch sử versions ({versions.length})
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý và khôi phục các versions của giáo án
          </p>
        </div>
        <Button onClick={loadVersions} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Version List */}
      <div className="space-y-3">
        {versions.map((version) => {
          const isCurrent = version.versionNumber === currentVersion;

          return (
            <div
              key={version.id}
              className={`p-4 rounded-xl border transition-all ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Version Number */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    v{version.versionNumber}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        {version.changeSummary || `Version ${version.versionNumber}`}
                        {isCurrent && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Hiện tại
                          </span>
                        )}
                        {version.isPublished && (
                          <CheckCircle className="w-4 h-4 text-success" />
                        )}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {version.creator.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(version.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {formatFileSize(version.fileSize)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs mb-3">
                    {version.changesCount > 0 && (
                      <span className="text-muted-foreground">
                        {version.changesCount} thay đổi
                      </span>
                    )}
                    {version.commentsCount > 0 && (
                      <span className="text-muted-foreground">
                        {version.commentsCount} comments
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleDownloadVersion(version)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Tải xuống
                    </Button>

                    {!isCurrent && (
                      <Button
                        onClick={() => handleRestoreVersion(version)}
                        variant="outline"
                        size="sm"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Khôi phục
                      </Button>
                    )}

                    <Button
                      onClick={() => setSelectedVersion(version)}
                      variant="ghost"
                      size="sm"
                    >
                      Xem chi tiết
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Version Details Modal */}
      {selectedVersion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Version {selectedVersion.versionNumber} - Chi tiết
              </h3>
              <button
                onClick={() => setSelectedVersion(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground">
                  Mô tả thay đổi
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedVersion.changeSummary || "Không có mô tả"}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground">
                  Người tạo
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedVersion.creator.name} ({selectedVersion.creator.email})
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground">
                  Thời gian tạo
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(selectedVersion.createdAt)}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground">
                  Kích thước file
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatFileSize(selectedVersion.fileSize)}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground">
                  File hash (MD5)
                </label>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {selectedVersion.fileHash}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Button
                  onClick={() => handleDownloadVersion(selectedVersion)}
                  variant="primary"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Tải xuống
                </Button>
                {selectedVersion.versionNumber !== currentVersion && (
                  <Button
                    onClick={() => {
                      handleRestoreVersion(selectedVersion);
                      setSelectedVersion(null);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Khôi phục version này
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedVersion(null)}
                  variant="ghost"
                  size="sm"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
