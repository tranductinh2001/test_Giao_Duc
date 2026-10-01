"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  Upload,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Play,
  Eye,
  Share2,
  Edit,
  History,
  Download,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import type { LessonPlanStatus } from "@/types/lesson-plan";
import { getSectionTypeLabel } from "@/lib/section-type-labels";
import ShareModal from "@/components/lesson-plans/ShareModal";
import EditLessonPlanModal from "@/components/lesson-plans/EditLessonPlanModal";
import EditSectionModal from "@/components/lesson-plans/EditSectionModal";
import VersionHistoryModal from "@/components/lesson-plans/VersionHistoryModal";
import ModelSelectionModal from "@/components/lesson-plans/ModelSelectionModal";
import { getDefaultModel, type AIModelType } from "@/lib/ai-models";

interface Circular {
  id: string;
  code: string;
  title: string;
  type: string;
}

interface LessonPlan {
  id: string;
  title: string;
  subject: string | null;
  gradeLevel: string | null;
  schoolYear: string | null;
  status: LessonPlanStatus;
  filePath: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  circularId: string | null;
  circular: Circular | null;
  userPermission?: "OWNER" | "EDITOR" | "VIEWER" | "ADMIN";
}

interface Section {
  id: string;
  sectionType: string;
  sectionTitle: string;
  sectionOrder: number;
  wordCount: number;
  charCount: number;
  annotationCount: number;
}

export default function LessonPlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState<{
    current: number;
    total: number;
    sectionTitle?: string;
    status?: string;
  } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSectionModalOpen, setEditSectionModalOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [versionHistoryModalOpen, setVersionHistoryModalOpen] = useState(false);
  const [modelSelectionModalOpen, setModelSelectionModalOpen] = useState(false);
  const [modelSelectionOperation, setModelSelectionOperation] = useState<"parse" | "review">("parse");
  const [totalWordCount, setTotalWordCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchLessonPlan();
    }
  }, [id]);

  useEffect(() => {
    if (lessonPlan && lessonPlan.status !== "UPLOADED") {
      fetchSections();
    }
  }, [lessonPlan]);

  // BUG FIX: Auto-refetch when lesson plan status changes (e.g., after upload/parse)
  // This ensures teaching methods and other data refresh automatically
  useEffect(() => {
    if (lessonPlan?.status) {
      console.log(`[LessonPlan] Status changed to: ${lessonPlan.status}, refreshing data...`);
      // Refetch to get updated teachingMethodAnalysis
      fetchLessonPlan();
      // Also refetch sections if parsed
      if (lessonPlan.status !== "UPLOADED") {
        fetchSections();
      }
    }
  }, [lessonPlan?.status]);

  const fetchLessonPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lesson-plans/${id}`);
      const data = await res.json();

      if (data.success) {
        setLessonPlan(data.data);
      } else {
        toast.error(data.message || "Lỗi khi tải giáo án");
        router.push("/lesson-plans");
      }
    } catch (error) {
      console.error("Error fetching lesson plan:", error);
      toast.error("Lỗi khi tải giáo án");
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/sections`);
      const data = await res.json();

      if (data.success) {
        setSections(data.data);
        // Calculate total word count
        const total = data.data.reduce((sum: number, section: Section) => sum + section.wordCount, 0);
        setTotalWordCount(total);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const handleParse = async (model?: AIModelType) => {
    setParsing(true);
    try {
      // Use unified workflow API - single entry point
      const res = await fetch(`/api/workflow/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonPlanId: id,
          templateCode: "5STEP",
          aiModel: model || getDefaultModel().id,
          skipContentReview: true, // Parse only
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Bắt đầu parse...");
        // Poll for completion
        await pollWorkflowStatus(data.sessionId);
        fetchLessonPlan();
        fetchSections();
      } else {
        toast.error(data.message || "Lỗi khi parse");
      }
    } catch (error) {
      console.error("Error parsing:", error);
      toast.error("Lỗi khi parse");
    } finally {
      setParsing(false);
    }
  };

  // Poll workflow status until completion
  const pollWorkflowStatus = async (sessionId: string): Promise<boolean> => {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/workflow/stream?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success && data.data) {
          const workflow = data.data;
          if (workflow.status === "COMPLETED") {
            toast.success("Hoàn tất!");
            return true;
          } else if (workflow.status === "FAILED") {
            toast.error(workflow.error || "Lỗi khi xử lý");
            return true;
          }
        }
      } catch {
        // Continue polling
      }
    }
    return false;
  };

  const handleReview = async (model?: AIModelType) => {
    setReviewing(true);
    setReviewProgress({ current: 0, total: 1 });
    try {
      // Use unified workflow API - single entry point
      const res = await fetch(`/api/workflow/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonPlanId: id,
          templateCode: "5STEP",
          aiModel: model || getDefaultModel().id,
          skipStructureValidation: false,
          skipContentReview: false,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Bắt đầu workflow...");
        setReviewProgress({ current: 0, total: 1, status: "running" });
        // Poll for completion
        const done = await pollWorkflowForReview(data.sessionId);
        if (done) {
          fetchLessonPlan();
          fetchSections();
          router.push(`/lesson-plans/${id}/review`);
        }
      } else {
        toast.error(data.message || "Lỗi khi bắt đầu workflow");
      }
    } catch (error) {
      console.error("Error reviewing:", error);
      toast.error(error instanceof Error ? error.message : "Lỗi khi review");
    } finally {
      setReviewing(false);
    }
  };

  // Poll workflow status for review (redirects to review page)
  const pollWorkflowForReview = async (sessionId: string): Promise<boolean> => {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/workflow/stream?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success && data.data) {
          const workflow = data.data;
          if (workflow.status === "COMPLETED") {
            setReviewProgress({ current: 1, total: 1, status: "complete" });
            return true;
          } else if (workflow.status === "FAILED") {
            toast.error(workflow.error || "Lỗi khi xử lý");
            return true;
          } else if (workflow.status === "PARSING" || workflow.status === "MAPPING" || workflow.status === "AI_REVIEWING") {
            setReviewProgress({
              current: 0,
              total: 1,
              status: "running",
              sectionTitle: workflow.currentStep
            });
          }
        }
      } catch {
        // Continue polling
      }
    }
    return false;
  };

  const handleOpenModelSelection = (operation: "parse" | "review") => {
    setModelSelectionOperation(operation);
    setModelSelectionModalOpen(true);
  };

  const handleModelSelected = (model: AIModelType) => {
    if (modelSelectionOperation === "parse") {
      handleParse(model);
    } else {
      handleReview(model);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa giáo án này?")) {
      return;
    }

    try {
      const res = await fetch(`/api/lesson-plans/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Đã xóa giáo án");
        router.push("/lesson-plans");
      } else {
        toast.error(data.message || "Lỗi khi xóa");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Lỗi khi xóa");
    }
  };

  const getStatusInfo = (status: LessonPlanStatus) => {
    const statusMap = {
      UPLOADED: {
        label: "Đã tải lên",
        color: "bg-muted text-muted-foreground",
        icon: Upload,
      },
      PARSING: {
        label: "Đang phân tích",
        color: "bg-primary/10 text-primary",
        icon: Clock,
      },
      PARSED: {
        label: "Đã phân tích",
        color: "bg-info/10 text-info",
        icon: CheckCircle,
      },
      REVIEWING: {
        label: "Đang review",
        color: "bg-warning/10 text-warning",
        icon: Clock,
      },
      REVIEWED: {
        label: "Đã review",
        color: "bg-success/10 text-success",
        icon: CheckCircle,
      },
      EDITING: {
        label: "Đang chỉnh sửa",
        color: "bg-primary/10 text-primary",
        icon: Settings,
      },
      COMPLETED: {
        label: "Hoàn thành",
        color: "bg-success text-success-foreground",
        icon: CheckCircle,
      },
      FAILED: {
        label: "Lỗi",
        color: "bg-destructive/10 text-destructive",
        icon: AlertCircle,
      },
    };

    return statusMap[status];
  };

  if (loading || !lessonPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusInfo = getStatusInfo(lessonPlan.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-background px-3 sm:px-4 py-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <Link
            href="/lesson-plans"
            className="inline-flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2 -ml-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Danh sách giáo án</span>
            <span className="sm:hidden">Quay lại</span>
          </Link>
          <span className="text-muted-foreground hidden sm:inline">/</span>
          <span className="text-sm sm:text-base font-medium text-foreground">Chi tiết</span>
        </div>

        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-2 sm:mb-3 truncate">
                {lessonPlan.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                {lessonPlan.subject && (
                  <span>
                    <span className="font-medium">Môn:</span> {lessonPlan.subject}
                  </span>
                )}
                {lessonPlan.gradeLevel && (
                  <span>
                    <span className="font-medium">Lớp:</span> {lessonPlan.gradeLevel}
                  </span>
                )}
                {lessonPlan.schoolYear && (
                  <span>
                    <span className="font-medium">Năm:</span>{" "}
                    {lessonPlan.schoolYear}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.color}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  <span>{statusInfo.label.split(' ')[0]}</span>
                </span>
                {lessonPlan.userPermission && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      lessonPlan.userPermission === "OWNER"
                        ? "bg-primary/10 text-primary"
                        : lessonPlan.userPermission === "ADMIN"
                        ? "bg-destructive/10 text-destructive"
                        : lessonPlan.userPermission === "EDITOR"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {lessonPlan.userPermission === "OWNER"
                      ? "Chủ sở hữu"
                      : lessonPlan.userPermission === "ADMIN"
                      ? "Admin"
                      : lessonPlan.userPermission === "EDITOR"
                      ? "Editor"
                      : "View"}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {(lessonPlan.fileSize / 1024).toFixed(0)} KB
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(lessonPlan.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
            </div>

            {(lessonPlan.userPermission === "OWNER" ||
              lessonPlan.userPermission === "ADMIN") && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVersionHistoryModalOpen(true)}
                  className="h-9 px-2.5"
                  title="Lịch sử"
                >
                  <History className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  className="h-9 px-2.5"
                  title="Sửa"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="h-9 px-2.5 text-destructive hover:bg-destructive/10"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Circular Info Card */}
          {lessonPlan.circular ? (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {lessonPlan.circular.code}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      lessonPlan.circular.type === "CURRICULUM" ? "bg-primary/10 text-primary" :
                      lessonPlan.circular.type === "REGULATION" ? "bg-destructive/10 text-destructive" :
                      lessonPlan.circular.type === "GUIDELINE" ? "bg-success/10 text-success" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {lessonPlan.circular.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lessonPlan.circular.title}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Chưa chọn Công văn
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vui lòng chọn Công văn để có thể review giáo án. Liên hệ admin nếu chưa có Công văn phù hợp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t border-border">
            {lessonPlan.status === "UPLOADED" &&
              (lessonPlan.userPermission === "OWNER" ||
                lessonPlan.userPermission === "ADMIN" ||
                lessonPlan.userPermission === "EDITOR") && (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <Link href={`/lesson-plans/${id}/quick-view`}>
                    <Button variant="outline" className="w-full h-11">
                      <Eye className="w-4 h-4 mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">Xem file</span>
                      <span className="sm:hidden">Xem</span>
                    </Button>
                  </Link>
                  <Button
                    variant="primary"
                    onClick={() => handleParse()}
                    isLoading={parsing}
                    disabled={parsing}
                    className="w-full h-11"
                  >
                    <Play className="w-4 h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">{parsing ? "Đang parse..." : "Parse"}</span>
                    <span className="sm:hidden">{parsing ? "..." : "Parse"}</span>
                  </Button>
                </div>
              )}

            {(lessonPlan.status === "PARSED" ||
              lessonPlan.status === "REVIEWED") &&
              (lessonPlan.userPermission === "OWNER" ||
                lessonPlan.userPermission === "ADMIN" ||
                lessonPlan.userPermission === "EDITOR") && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                  <Button
                    variant="primary"
                    onClick={() => {
                      handleOpenModelSelection("review");
                    }}
                    isLoading={reviewing}
                    disabled={reviewing}
                    className="w-full h-11"
                  >
                    <Settings className="w-4 h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">{reviewing ? "Đang review..." : "Review AI"}</span>
                    <span className="sm:hidden">{reviewing ? "..." : "Review"}</span>
                  </Button>
                  {reviewProgress && (
                    <div className="text-xs text-muted-foreground text-center py-1">
                      {reviewProgress.current}/{reviewProgress.total}
                    </div>
                  )}
                </div>
              )}

            {(lessonPlan.status === "PARSED" ||
              lessonPlan.status === "REVIEWED") && (
              <div className="flex gap-2 flex-wrap">
                <Link href={`/lesson-plans/${id}/word-review`}>
                  <Button variant="primary" className="h-11">
                    <FileText className="w-4 h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Editor</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                </Link>
                {lessonPlan.status === "REVIEWED" && (
                  <Link href={`/lesson-plans/${id}/review`}>
                    <Button variant="outline" className="h-11">
                      <Eye className="w-4 h-4 mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">Báo cáo</span>
                      <span className="sm:hidden">Xem</span>
                    </Button>
                  </Link>
                )}
                <a href={`/api/lesson-plans/${id}/export?format=docx`} download>
                  <Button variant="outline" className="h-11">
                    <Download className="w-4 h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Tải</span>
                    <span className="sm:hidden">Tải</span>
                  </Button>
                </a>
              </div>
            )}

            {(lessonPlan.userPermission === "OWNER" ||
              lessonPlan.userPermission === "ADMIN") && (
              <Button
                variant="outline"
                onClick={() => setShareModalOpen(true)}
                className="h-11"
              >
                <Share2 className="w-4 h-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Chia sẻ</span>
                <span className="sm:hidden">Share</span>
              </Button>
            )}
          </div>
        </div>

        {/* Share Modal */}
        <ShareModal
          lessonPlanId={id}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          onCollaboratorAdded={() => fetchLessonPlan()}
        />

        {/* Edit Modal */}
        {lessonPlan && (
          <EditLessonPlanModal
            lessonPlanId={id}
            currentData={{
              title: lessonPlan.title,
              subject: lessonPlan.subject,
              gradeLevel: lessonPlan.gradeLevel,
              schoolYear: lessonPlan.schoolYear,
            }}
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSuccess={() => fetchLessonPlan()}
          />
        )}

        {/* Sections */}
        {sections.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">
              Các phần trong giáo án ({sections.length})
            </h2>

            <div className="space-y-2 sm:space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-muted text-muted-foreground">
                        {section.sectionOrder}
                      </span>
                      <h3 className="font-semibold text-foreground text-sm sm:text-base">
                        {section.sectionTitle}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        ({getSectionTypeLabel(section.sectionType)})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span>{section.wordCount} từ</span>
                      <span>{section.charCount} ký tự</span>
                      {section.annotationCount > 0 && (
                        <span className="text-warning font-medium">
                          {section.annotationCount} annotations
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit Button */}
                  {(lessonPlan?.userPermission === "OWNER" ||
                    lessonPlan?.userPermission === "ADMIN" ||
                    lessonPlan?.userPermission === "EDITOR") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSectionId(section.id);
                        setEditSectionModalOpen(true);
                      }}
                      className="min-h-[40px] self-start sm:self-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      <span className="sm:hidden">Sửa</span>
                      <span className="hidden sm:inline">Chỉnh sửa</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for sections */}
        {lessonPlan.status === "UPLOADED" && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Chưa parse giáo án
            </h3>
            <p className="text-muted-foreground mb-6">
              Parse giáo án để trích xuất các phần và nội dung
            </p>
            <Button variant="primary" onClick={() => handleOpenModelSelection("parse")} isLoading={parsing}>
              <Play className="w-5 h-5 mr-2" />
              Parse ngay
            </Button>
          </div>
        )}

        {/* Edit Section Modal */}
        {selectedSectionId && (
          <EditSectionModal
            lessonPlanId={id}
            sectionId={selectedSectionId}
            isOpen={editSectionModalOpen}
            onClose={() => {
              setEditSectionModalOpen(false);
              setSelectedSectionId("");
            }}
            onSuccess={() => {
              fetchSections();
              fetchLessonPlan();
            }}
          />
        )}

        {/* Version History Modal */}
        <VersionHistoryModal
          lessonPlanId={id}
          isOpen={versionHistoryModalOpen}
          onClose={() => setVersionHistoryModalOpen(false)}
        />

        {/* Model Selection Modal */}
        <ModelSelectionModal
          isOpen={modelSelectionModalOpen}
          onClose={() => setModelSelectionModalOpen(false)}
          onConfirm={handleModelSelected}
          wordCount={totalWordCount}
          operation={modelSelectionOperation}
        />
      </div>
    </div>
  );
}
