"use client";

import { useState, useEffect } from "react";
import { X, History, Download, Clock, User } from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface VersionHistoryModalProps {
  lessonPlanId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Version {
  id: string;
  versionNumber: number;
  filePath: string;
  fileSize: number;
  changeSummary: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export default function VersionHistoryModal({
  lessonPlanId,
  isOpen,
  onClose,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lesson-plans/${lessonPlanId}/versions`);
      const data = await res.json();

      if (data.success) {
        setVersions(data.data);
      } else {
        toast.error(data.message || "Lỗi khi tải lịch sử versions");
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
      toast.error("Lỗi khi tải lịch sử versions");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Lịch sử phiên bản
              </h2>
              <p className="text-sm text-muted-foreground">
                Xem các phiên bản đã lưu của giáo án
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Chưa có phiên bản nào
              </h3>
              <p className="text-sm text-muted-foreground">
                Các phiên bản sẽ được tạo khi bạn chỉnh sửa giáo án
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                          index === 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        v{version.versionNumber}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Phiên bản {version.versionNumber}
                          {index === 0 && (
                            <span className="ml-2 text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                              Hiện tại
                            </span>
                          )}
                        </h3>
                        {version.changeSummary && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.changeSummary}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Download functionality can be implemented
                        toast("Chức năng tải xuống đang được phát triển");
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(version.createdAt)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {version.createdBy.name}
                    </div>
                    <div>{formatFileSize(version.fileSize)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <Button variant="outline" onClick={onClose} className="w-full">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
