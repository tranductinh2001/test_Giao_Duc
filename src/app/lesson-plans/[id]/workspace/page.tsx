"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  FileText,
  Layers,
  List,
  AlignLeft,
  RefreshCw,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Clock,
  DollarSign,
  Hash,
  BookOpen,
  GraduationCap,
  Brain,
  Target,
  Filter,
  ArrowUpDown,
  X,
  Minus,
  Plus,
  Menu,
  Settings,
  Download,
  History,
  GraduationCap as TeachingMethodIcon,
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
interface Section {
  id: string;
  title: string;
  order: number;
  activities: Activity[];
}

interface TeacherAction {
  id: string;
  action: string;
  order: number;
}

interface StudentAction {
  id: string;
  action: string;
  order: number;
}

interface Question {
  id: string;
  content: string;
  order: number;
}

interface Product {
  id: string;
  type: string;
  description: string;
}

interface Assessment {
  id: string;
  type: string;
  method: string;
  evidence?: string;
  criteria?: string;
}

interface Activity {
  id: string;
  title: string;
  order: number;
  paragraphs: Paragraph[];
  // Full Semantic Tree fields
  teacherActions?: TeacherAction[];
  studentActions?: StudentAction[];
  questions?: Question[];
  products?: Product[];
  assessments?: Assessment[];
  goal?: string;
  duration?: number;
  activityType?: string;
  confidence?: number;
}

interface Paragraph {
  id: string;
  content: string;
  order: number;
  isHeading?: boolean;
  headingLevel?: number;
  tableData?: any;
}

interface Annotation {
  id: string;
  severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  ruleTitle: string;
  ruleId: string;
  suggestion: string;
  reason: string;
  explanation?: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: string;
  startOffset?: number;
  endOffset?: number;
  confidence: number;
  proposedContent?: string;
  highlightedText?: string;
}

interface LessonPlan {
  id: string;
  title: string;
  status: string;
  bookName?: string;
  lessonName?: string;
  aiModel?: string;
  createdAt: string;
}

interface WorkflowLog {
  id: string;
  step: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  message: string;
  timestamp: string;
}

interface WorkspaceStats {
  totalAnnotations: number;
  critical: number;
  error: number;
  warning: number;
  info: number;
  accepted: number;
  rejected: number;
  pending: number;
  cost?: number;
  tokens?: number;
  teachingMethodScore?: number;
}

interface TeachingMethodAnalysis {
  currentMethod: {
    name: string;
    description: string;
    confidence: number;
  };
  recommendedMethods: Array<{
    name: string;
    reason: string;
    advantages: string[];
    disadvantages: string[];
    suitabilityScore: number;
  }>;
  alternativeMethods: Array<{
    name: string;
    reason: string;
  }>;
  pedagogyScore: number;
  overallRecommendation: string;
  perSectionAnalysis?: Array<{
    sectionId: string;
    sectionTitle: string;
    currentMethod: {
      name: string;
      description: string;
      confidence: number;
    };
    pedagogyScore: number;
    recommendedMethods: Array<{
      name: string;
      reason: string;
      advantages: string[];
      disadvantages: string[];
      suitabilityScore: number;
    }>;
  }>;
}

// Left Panel - Document Structure
function DocumentStructurePanel({
  sections,
  selectedItem,
  onSelectItem,
  searchQuery,
  onSearchChange,
  collapsed,
  onToggleCollapse,
}: {
  sections: Section[];
  selectedItem: { type: string; id: string } | null;
  onSelectItem: (type: string, id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const toggleActivity = (id: string) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedActivities(newExpanded);
  };

  const filteredSections = sections.filter((section) =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.activities.some((a) => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "bg-red-500";
      case "ERROR": return "bg-orange-500";
      case "WARNING": return "bg-yellow-500";
      case "INFO": return "bg-blue-500";
      default: return "bg-zinc-500";
    }
  };

  if (collapsed) {
    return (
      <div className="w-12 h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center py-4">
        <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
          <PanelLeftOpen className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col w-72 flex-shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Cấu trúc giáo án</h2>
        <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
          <PanelLeftClose className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-md"
          />
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredSections.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Chưa có cấu trúc
            </div>
          ) : (
            filteredSections.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    selectedItem?.type === "section" && selectedItem?.id === section.id
                      ? "bg-blue-100 dark:bg-blue-900/30"
                      : ""
                  }`}
                >
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span className="flex-1 truncate">{section.title}</span>
                  <span className="text-xs text-zinc-400">{section.activities.length}</span>
                </button>

                <AnimatePresence>
                  {expandedSections.has(section.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-4"
                    >
                      {section.activities.map((activity) => (
                        <div key={activity.id}>
                          <button
                            onClick={() => toggleActivity(activity.id)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                              selectedItem?.type === "activity" && selectedItem?.id === activity.id
                                ? "bg-blue-100 dark:bg-blue-900/30"
                                : ""
                            }`}
                          >
                            {expandedActivities.has(activity.id) ? (
                              <ChevronDown className="w-3 h-3 text-zinc-400" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-zinc-400" />
                            )}
                            <List className="w-3 h-3 text-green-500" />
                            <span className="flex-1 truncate text-xs">{activity.title}</span>
                            <span className="text-xs text-zinc-400">
                              {(activity.teacherActions?.length || 0) + (activity.studentActions?.length || 0) > 0
                                ? `${activity.teacherActions?.length || 0}TA/${activity.studentActions?.length || 0}SA`
                                : `${activity.paragraphs.length}p`}
                            </span>
                          </button>

                          {expandedActivities.has(activity.id) && (
                            <div className="ml-6 space-y-2">
                              {/* Teacher Actions */}
                              {activity.teacherActions && activity.teacherActions.length > 0 && (
                                <div className="border-l-2 border-blue-500 pl-2">
                                  <div className="text-xs font-medium text-blue-600 mb-1">
                                    Hoạt động GV ({activity.teacherActions.length})
                                  </div>
                                  {activity.teacherActions.map((ta: TeacherAction) => (
                                    <div key={ta.id} className="text-xs text-zinc-600 dark:text-zinc-400 py-0.5">
                                      • {ta.action.substring(0, 50)}{ta.action.length > 50 ? '...' : ''}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Student Actions */}
                              {activity.studentActions && activity.studentActions.length > 0 && (
                                <div className="border-l-2 border-purple-500 pl-2">
                                  <div className="text-xs font-medium text-purple-600 mb-1">
                                    Hoạt động HS ({activity.studentActions.length})
                                  </div>
                                  {activity.studentActions.map((sa: StudentAction) => (
                                    <div key={sa.id} className="text-xs text-zinc-600 dark:text-zinc-400 py-0.5">
                                      • {sa.action.substring(0, 50)}{sa.action.length > 50 ? '...' : ''}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Products */}
                              {activity.products && activity.products.length > 0 && (
                                <div className="border-l-2 border-green-500 pl-2">
                                  <div className="text-xs font-medium text-green-600 mb-1">
                                    Sản phẩm ({activity.products.length})
                                  </div>
                                  {activity.products.map((p: Product) => (
                                    <div key={p.id} className="text-xs text-zinc-600 dark:text-zinc-400 py-0.5">
                                      • {p.type}: {p.description?.substring(0, 40)}{p.description?.length > 40 ? '...' : ''}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Assessments */}
                              {activity.assessments && activity.assessments.length > 0 && (
                                <div className="border-l-2 border-red-500 pl-2">
                                  <div className="text-xs font-medium text-red-600 mb-1">
                                    Đánh giá ({activity.assessments.length})
                                  </div>
                                  {activity.assessments.map((a: Assessment) => (
                                    <div key={a.id} className="text-xs text-zinc-600 dark:text-zinc-400 py-0.5">
                                      • {a.type}: {a.method?.substring(0, 40)}{a.method?.length > 40 ? '...' : ''}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Questions */}
                              {activity.questions && activity.questions.length > 0 && (
                                <div className="border-l-2 border-yellow-500 pl-2">
                                  <div className="text-xs font-medium text-yellow-600 mb-1">
                                    Câu hỏi ({activity.questions.length})
                                  </div>
                                  {activity.questions.map((q: Question) => (
                                    <div key={q.id} className="text-xs text-zinc-600 dark:text-zinc-400 py-0.5">
                                      • {q.content?.substring(0, 50)}{q.content?.length > 50 ? '...' : ''}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Paragraphs */}
                              {activity.paragraphs.map((paragraph) => (
                                <button
                                  key={paragraph.id}
                                  onClick={() => onSelectItem("paragraph", paragraph.id)}
                                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                                    selectedItem?.type === "paragraph" && selectedItem?.id === paragraph.id
                                      ? "bg-blue-100 dark:bg-blue-900/30"
                                      : ""
                                  }`}
                                >
                                  <AlignLeft className="w-3 h-3 text-orange-500" />
                                  <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400">
                                    {paragraph.content.substring(0, 30)}...
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Center Panel - Section Content Viewer
function SectionContentViewer({
  section,
  annotations,
}: {
  section?: Section;
  annotations: Annotation[];
}) {
  if (!section) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <p className="text-sm text-zinc-500">Không tìm thấy phần nội dung</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Section Header */}
      <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {section.title}
          </h2>
          <span className="text-sm text-zinc-500">
            ({section.activities.length} hoạt động)
          </span>
        </div>
        {/* Annotation summary for this section */}
        {annotations.length > 0 && (
          <div className="mt-2 flex gap-2">
            {annotations.filter(a => a.severity === "CRITICAL").length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                {annotations.filter(a => a.severity === "CRITICAL").length} CRITICAL
              </span>
            )}
            {annotations.filter(a => a.severity === "ERROR").length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                {annotations.filter(a => a.severity === "ERROR").length} Lỗi
              </span>
            )}
            {annotations.filter(a => a.severity === "WARNING").length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                {annotations.filter(a => a.severity === "WARNING").length} Cảnh báo
              </span>
            )}
            {annotations.filter(a => a.severity === "INFO").length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                {annotations.filter(a => a.severity === "INFO").length} Thông tin
              </span>
            )}
          </div>
        )}
      </div>

      {/* Activities and Paragraphs */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {section.activities.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              Chưa có nội dung cho phần này
            </div>
          ) : (
            section.activities.map((activity, actIdx) => (
              <div key={activity.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                {/* Activity Header */}
                <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-green-500" />
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                      {activity.title}
                    </h3>
                  </div>
                </div>

                {/* Paragraphs */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {activity.paragraphs.map((para, paraIdx) => (
                    <div
                      key={para.id}
                      className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {para.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Right Panel - Unified Review Results (Rule Analysis + Teaching Method Analysis)
function AIReviewPanel({
  annotations,
  stats,
  selectedAnnotation,
  onSelectAnnotation,
  groupBy,
  onGroupByChange,
  filter,
  onFilterChange,
  collapsed,
  onToggleCollapse,
  isAnalyzing,
  onAccept,
  onReject,
  onRegenerate,
  teachingMethodAnalysis,
}: {
  annotations: Annotation[];
  stats: WorkspaceStats;
  selectedAnnotation: Annotation | null;
  onSelectAnnotation: (a: Annotation | null) => void;
  groupBy: string;
  onGroupByChange: (g: string) => void;
  filter: string;
  onFilterChange: (f: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isAnalyzing: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onRegenerate: (id: string) => void;
  teachingMethodAnalysis: TeachingMethodAnalysis | null;
}) {
  const groupedAnnotations = annotations.reduce((acc, ann) => {
    const key = groupBy === "section" ? ann.sectionTitle : groupBy === "severity" ? ann.severity : ann.ruleTitle;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ann);
    return acc;
  }, {} as Record<string, Annotation[]>);

  const filteredAnnotations = annotations.filter((ann) => {
    if (filter === "all") return true;
    if (filter === "pending") return ann.status === "PENDING";
    if (filter === "accepted") return ann.status === "ACCEPTED";
    if (filter === "rejected") return ann.status === "REJECTED";
    return true;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "ERROR": return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "WARNING": return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "INFO": return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACCEPTED": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "REJECTED": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  if (collapsed) {
    return (
      <div className="w-12 h-full border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center py-4">
        <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
          <PanelRightOpen className="w-4 h-4" />
        </Button>
        {stats.totalAnnotations > 0 && (
          <Badge variant="danger" className="mt-2">{stats.totalAnnotations}</Badge>
        )}
      </div>
    );
  }

  return (
    <div className="h-full border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col w-80 flex-shrink-0">
      {/* Header - Unified Title */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Kết quả Review
            </h2>
            {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
          <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
            <PanelRightClose className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Row - Combined Scores */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
        {/* Rule Analysis Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-red-500">{stats.critical}</div>
            <div className="text-[10px] text-zinc-500">Critical</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-500">{stats.error}</div>
            <div className="text-[10px] text-zinc-500">Error</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-500">{stats.warning}</div>
            <div className="text-[10px] text-zinc-500">Warning</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-500">{stats.info}</div>
            <div className="text-[10px] text-zinc-500">Info</div>
          </div>
        </div>

        {/* Teaching Method Score - Inline */}
        {teachingMethodAnalysis && (
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-zinc-500">Điểm PPGD:</span>
            </div>
            <span className={`text-sm font-bold ${
              (teachingMethodAnalysis?.pedagogyScore ?? 0) >= 80 ? "text-green-500" :
              (teachingMethodAnalysis?.pedagogyScore ?? 0) >= 60 ? "text-yellow-500" : "text-red-500"
            }`}>
              {(teachingMethodAnalysis?.pedagogyScore ?? 0).toFixed(1)}
            </span>
          </div>
        )}

        {stats.cost !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Chi phí:</span>
            <span className="font-medium">${stats.cost.toFixed(4)}</span>
          </div>
        )}
      </div>

      {/* Teaching Method Summary - Collapsed inline */}
      {teachingMethodAnalysis && (
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TeachingMethodIcon className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">PPGD: {teachingMethodAnalysis.currentMethod?.name || "Chưa xác định"}</span>
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {teachingMethodAnalysis.recommendedMethods?.[0] ? `→ ${teachingMethodAnalysis.recommendedMethods[0].name}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Unified Content - Rule Analysis + Teaching Methods */}
      {teachingMethodAnalysis && (
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <details className="group" open>
            <summary className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <Sparkles className="w-3.5 h-3.5 text-green-500" />
              Phân tích Phương pháp GD
              <ChevronDown className="w-3.5 h-3.5 ml-auto group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-2 space-y-2 text-xs">
              {teachingMethodAnalysis.currentMethod?.name && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Hiện tại:</span>
                  <span className="font-medium text-blue-600">{teachingMethodAnalysis.currentMethod.name}</span>
                </div>
              )}
              {teachingMethodAnalysis.recommendedMethods?.[0] && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Đề xuất:</span>
                  <span className="font-medium text-green-600">{teachingMethodAnalysis.recommendedMethods[0].name}</span>
                </div>
              )}
              {teachingMethodAnalysis.overallRecommendation && (
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">{teachingMethodAnalysis.overallRecommendation}</p>
              )}
            </div>
          </details>
        </div>
      )}

      {/* Content - Rule Analysis */}
      {/* Filters */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
        <Select value={groupBy} onValueChange={onGroupByChange}>
          <SelectTrigger className="h-8 text-xs">
            <ArrowUpDown className="w-3 h-3 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="section">Group by Section</SelectItem>
            <SelectItem value="severity">Group by Severity</SelectItem>
            <SelectItem value="rule">Group by Rule</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="h-8 text-xs">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Annotations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {annotations.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Chưa có annotation
            </div>
          ) : Object.entries(groupedAnnotations).map(([group, anns]) => (
            <div key={group}>
              <div className="text-xs font-medium text-zinc-500 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">
                {group} ({anns.length})
              </div>
              {anns.map((ann) => (
                <button
                  key={ann.id}
                  onClick={() => onSelectAnnotation(ann)}
                  className={`w-full p-2 rounded-lg text-left mt-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    selectedAnnotation?.id === ann.id ? "bg-blue-100 dark:bg-blue-900/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(ann.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {ann.ruleTitle}
                        </p>
                        {(ann.sectionType === "HOAT_DONG" || ann.sectionType === "ACTIVITIES" || ann.sectionType.toLowerCase().includes("activity")) && (
                          <span title="Hoạt động - Phương pháp giảng dạy">
                            <Sparkles className="w-3 h-3 text-purple-500 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">
                        {ann.suggestion}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(ann.status)}
                        <span className="text-[10px] text-zinc-400">
                          {Math.round(ann.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Selected Annotation Actions - Always show when annotation selected */}
      {selectedAnnotation && (
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <p className="text-xs font-medium text-zinc-500">Hành động</p>
          <div className="flex gap-2">
            <Button
              variant="success"
              size="sm"
              className="flex-1"
              onClick={() => onAccept(selectedAnnotation.id)}
              disabled={selectedAnnotation.status !== "PENDING"}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Accept
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={() => onReject(selectedAnnotation.id)}
              disabled={selectedAnnotation.status !== "PENDING"}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onRegenerate(selectedAnnotation.id)}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}

// Main Workspace Component
export default function AIWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // State
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [stats, setStats] = useState<WorkspaceStats>({
    totalAnnotations: 0,
    critical: 0,
    error: 0,
    warning: 0,
    info: 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
  });
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachingMethodAnalysis, setTeachingMethodAnalysis] = useState<TeachingMethodAnalysis | null>(null);

  // UI State
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: string; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState("section");
  const [filter, setFilter] = useState("all");
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);

  // Editor State (mock for now - will integrate with Syncfusion)
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Fetch data on mount
  useEffect(() => {
    if (id) {
      fetchLessonPlan();
      fetchSections();
      fetchAnnotations();
      fetchWorkflowLogs();
      fetchTeachingMethodAnalysis();
    }
  }, [id]);

  // Auto-scroll to section when annotation is selected
  useEffect(() => {
    if (selectedAnnotation && selectedAnnotation.sectionId) {
      // Select the section in left panel - the panel should handle expansion
      setSelectedItem({ type: "section", id: selectedAnnotation.sectionId });
    }
  }, [selectedAnnotation, setSelectedItem]);

  const fetchLessonPlan = async () => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}`);
      const data = await res.json();
      if (data.success) {
        setLessonPlan(data.data);
      }
    } catch (error) {
      console.error("Error fetching lesson plan:", error);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/sections`);
      const data = await res.json();
      if (data.success) {
        // Transform API sections to workspace format with activities and paragraphs
        const transformed: Section[] = data.data.map((s: any) => {
          // Parse the parsedContent to extract activities and paragraphs
          let activities: Activity[] = [];

          if (s.parsedContent && typeof s.parsedContent === 'object') {
            // If parsedContent is an object with activities
            if (Array.isArray(s.parsedContent.activities)) {
              activities = s.parsedContent.activities.map((act: any, actIdx: number) => ({
                id: act.id || `act-${actIdx}`,
                title: act.title || act.name || `Hoạt động ${actIdx + 1}`,
                order: act.order || actIdx + 1,
                // Full Semantic Tree preserved
                paragraphs: Array.isArray(act.paragraphs)
                  ? act.paragraphs.map((p: any, pIdx: number) => ({
                      id: p.id || `para-${pIdx}`,
                      content: p.content || p.text || '',
                      order: p.order || pIdx,
                      isHeading: p.isHeading,
                      headingLevel: p.headingLevel,
                      tableData: p.tableData,
                    }))
                  : [],
                // Teacher Actions
                teacherActions: Array.isArray(act.teacherActions)
                  ? act.teacherActions.map((ta: any) => ({
                      id: ta.id || crypto.randomUUID(),
                      action: ta.action || ta.content || '',
                      order: ta.order || 0,
                    }))
                  : [],
                // Student Actions
                studentActions: Array.isArray(act.studentActions)
                  ? act.studentActions.map((sa: any) => ({
                      id: sa.id || crypto.randomUUID(),
                      action: sa.action || sa.content || '',
                      order: sa.order || 0,
                    }))
                  : [],
                // Questions
                questions: Array.isArray(act.questions)
                  ? act.questions.map((q: any) => ({
                      id: q.id || crypto.randomUUID(),
                      content: q.content || q.text || '',
                      order: q.order || 0,
                    }))
                  : [],
                // Products/Learning Outcomes
                products: Array.isArray(act.products)
                  ? act.products.map((p: any) => ({
                      id: p.id || crypto.randomUUID(),
                      type: p.type || 'BÀI_LÀM',
                      description: p.description || p.content || '',
                    }))
                  : [],
                // Assessments
                assessments: Array.isArray(act.assessments)
                  ? act.assessments.map((a: any) => ({
                      id: a.id || crypto.randomUUID(),
                      type: a.type || 'QUAN_SAT',
                      method: a.method || '',
                      evidence: a.evidence,
                      criteria: a.criteria,
                    }))
                  : [],
                // Activity metadata
                goal: act.goal || null,
                duration: act.duration || null,
                activityType: act.type || act.activityType || null,
                confidence: act.confidence || null,
              }));
            } else if (Array.isArray(s.parsedContent)) {
              // If parsedContent is an array of paragraphs
              activities = [{
                id: 'default-activity',
                title: 'Nội dung',
                order: 1,
                paragraphs: s.parsedContent.map((p: any, pIdx: number) => ({
                  id: p.id || `para-${pIdx}`,
                  content: p.content || p.text || '',
                  order: p.order || pIdx,
                })),
              }];
            }
          } else if (s.rawContent) {
            // Fallback to rawContent - split by paragraphs
            const paragraphs = s.rawContent
              .split('\n')
              .filter((p: string) => p.trim())
              .map((p: string, pIdx: number) => ({
                id: `para-${pIdx}`,
                content: p.trim(),
                order: pIdx,
              }));

            if (paragraphs.length > 0) {
              activities = [{
                id: 'default-activity',
                title: 'Nội dung',
                order: 1,
                paragraphs,
              }];
            }
          }

          return {
            id: s.id,
            title: s.sectionTitle || s.sectionType || 'Nội dung',
            order: s.sectionOrder || 0,
            activities,
          };
        });
        // Debug: Log data preservation
        let totalTeacherActions = 0;
        let totalStudentActions = 0;
        let totalProducts = 0;
        let totalAssessments = 0;
        let totalQuestions = 0;

        for (const section of transformed) {
          for (const activity of section.activities || []) {
            totalTeacherActions += activity.teacherActions?.length || 0;
            totalStudentActions += activity.studentActions?.length || 0;
            totalProducts += activity.products?.length || 0;
            totalAssessments += activity.assessments?.length || 0;
            totalQuestions += activity.questions?.length || 0;
          }
        }

        console.log('[Workspace] DEBUG - Frontend Data Preserved:');
        console.log('[Workspace]   - Total Sections:', transformed.length);
        console.log('[Workspace]   - Total TeacherActions:', totalTeacherActions);
        console.log('[Workspace]   - Total StudentActions:', totalStudentActions);
        console.log('[Workspace]   - Total Products:', totalProducts);
        console.log('[Workspace]   - Total Assessments:', totalAssessments);
        console.log('[Workspace]   - Total Questions:', totalQuestions);

        setSections(transformed);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnotations = async () => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/annotations`);
      const data = await res.json();
      if (data.success) {
        // Transform annotations with proper rule and section data
        const transformed: Annotation[] = data.data.map((a: any) => ({
          id: a.id,
          severity: a.severity || "WARNING",
          status: a.status || "PENDING",
          ruleTitle: a.rule?.ruleName || "Unknown Rule",
          ruleId: a.ruleId,
          suggestion: a.suggestion || a.message || "",
          reason: a.reason || "",
          sectionId: a.sectionId,
          sectionTitle: a.section?.sectionTitle || "Unknown Section",
          sectionType: a.section?.sectionType || "UNKNOWN",
          startOffset: a.startPosition,
          endOffset: a.endPosition,
          confidence: a.confidence || 0.8,
          proposedContent: a.proposedContent,
          highlightedText: a.highlightedText,
        }));
        setAnnotations(transformed);

        // Calculate stats
        setStats({
          totalAnnotations: transformed.length,
          critical: transformed.filter((a) => a.severity === "CRITICAL").length,
          error: transformed.filter((a) => a.severity === "ERROR").length,
          warning: transformed.filter((a) => a.severity === "WARNING").length,
          info: transformed.filter((a) => a.severity === "INFO").length,
          accepted: transformed.filter((a) => a.status === "ACCEPTED").length,
          rejected: transformed.filter((a) => a.status === "REJECTED").length,
          pending: transformed.filter((a) => a.status === "PENDING").length,
        });
      }
    } catch (error) {
      console.error("Error fetching annotations:", error);
    }
  };

  const fetchWorkflowLogs = async () => {
    // Mock workflow logs - in real app, fetch from API
    setWorkflowLogs([
      { id: "1", step: "Parser", status: "COMPLETED", message: "Parse document successfully", timestamp: new Date().toISOString() },
      { id: "2", step: "Mapping", status: "COMPLETED", message: "Map to curriculum", timestamp: new Date().toISOString() },
      { id: "3", step: "Review", status: "RUNNING", message: "AI analyzing...", timestamp: new Date().toISOString() },
    ]);
  };

  const fetchTeachingMethodAnalysis = async () => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/review-data`);
      const data = await res.json();
      if (data.success && data.data.teachingMethodAnalysis) {
        setTeachingMethodAnalysis(data.data.teachingMethodAnalysis);
        setStats((prev) => ({
          ...prev,
          teachingMethodScore: data.data.teachingMethodScore,
        }));
      }
    } catch (error) {
      console.error("Error fetching teaching method analysis:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
    setIsModified(false);
    toast.success("Đã lưu");
  };

  const handleAccept = async (annotationId: string) => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/annotations/${annotationId}/accept`, {
        method: "POST",
      });
      if (res.ok) {
        setAnnotations((prev) =>
          prev.map((a) => (a.id === annotationId ? { ...a, status: "ACCEPTED" } : a))
        );
        toast.success("Accepted");
      }
    } catch (error) {
      console.error("Error accepting annotation:", error);
    }
  };

  const handleReject = async (annotationId: string) => {
    try {
      const res = await fetch(`/api/lesson-plans/${id}/annotations/${annotationId}/reject`, {
        method: "POST",
      });
      if (res.ok) {
        setAnnotations((prev) =>
          prev.map((a) => (a.id === annotationId ? { ...a, status: "REJECTED" } : a))
        );
        toast.success("Rejected");
      }
    } catch (error) {
      console.error("Error rejecting annotation:", error);
    }
  };

  const handleRegenerate = async (annotationId: string) => {
    toast.loading("Regenerating...", { duration: 2000 });
    // Mock regenerate
    setTimeout(() => {
      toast.success("Regenerated");
    }, 2000);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-zinc-500">Đang tải workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* HEADER + BLOCK 1: Input Info Card */}
      <header className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        {/* Title Row */}
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/lesson-plans">
              <Button variant="ghost" size="sm" className="min-h-[40px]">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {lessonPlan?.title || "AI Lesson Workspace"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isAnalyzing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">AI đang phân tích...</span>
              </div>
            )}
            {isModified && <Badge variant="warning">Chưa lưu</Badge>}
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!isModified || isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </div>

        {/* BLOCK 1: Input Info - All in one card */}
        <div className="px-4 pb-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Circular */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-medium text-blue-700 dark:text-blue-300">CV: {lessonPlan?.title ? "Đã chọn" : "Chưa chọn"}</span>
            </div>
            {/* Textbook */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <BookOpen className="w-3.5 h-3.5 text-green-500" />
              <span className="font-medium text-green-700 dark:text-green-300">SGK: {lessonPlan?.bookName || "Chưa chọn"}</span>
            </div>
            {/* Lesson */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
              <span className="font-medium text-purple-700 dark:text-purple-300">Bài: {lessonPlan?.lessonName || "Chưa chọn"}</span>
            </div>
            {/* Teaching Method */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <Target className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-medium text-amber-700 dark:text-amber-300">PP: {teachingMethodAnalysis?.currentMethod?.name || "Chưa xác định"}</span>
            </div>
            {/* Divider */}
            <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-600" />
            {/* Parser Status */}
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Parser: <span className="text-green-600 font-medium">Hoàn tất</span></span>
            </div>
            {/* AI Status */}
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-zinc-600 dark:text-zinc-400">AI: <span className="text-purple-600 font-medium">{annotations.length > 0 ? "Hoàn tất" : "Chờ xử lý"}</span></span>
            </div>
            {/* Review Status */}
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Review: <span className="text-amber-600 font-medium">{stats.totalAnnotations > 0 ? `${stats.totalAnnotations} issues` : "Chưa chạy"}</span></span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="h-10 px-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled><Undo2 className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" disabled><Redo2 className="w-4 h-4" /></Button>
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700" />
          <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(50, z - 10))}><ZoomOut className="w-4 h-4" /></Button>
          <span className="text-xs text-zinc-500 w-12 text-center">{zoom}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(200, z + 10))}><ZoomIn className="w-4 h-4" /></Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm"><Maximize2 className="w-4 h-4" /></Button>
        </div>
      </header>

      {/* Main Content - BLOCK 2 + BLOCK 3 */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Document Structure */}
        {!leftPanelCollapsed && (
          <DocumentStructurePanel
            sections={sections}
            selectedItem={selectedItem}
            onSelectItem={(type, itemId) => setSelectedItem({ type, id: itemId })}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            collapsed={leftPanelCollapsed}
            onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          />
        )}

        {/* BLOCK 2: Lesson Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {selectedItem?.type === "section" ? (
            <SectionContentViewer
              section={sections.find(s => s.id === selectedItem.id)}
              annotations={annotations.filter(a => a.sectionId === selectedItem.id)}
            />
          ) : selectedItem?.type === "activity" ? (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    Hoạt động đang được chọn - Nội dung chi tiết sẽ hiển thị tại đây
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-zinc-300 dark:text-zinc-600" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Chọn một phần để xem nội dung
                </h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Chọn mục từ cây thư mục bên trái để xem nội dung chi tiết
                </p>
                <p className="text-xs text-zinc-400">
                  File: {lessonPlan?.title || "document.docx"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - AI Review (Block 3: Review Results) */}
        <AIReviewPanel
          annotations={annotations}
          stats={stats}
          selectedAnnotation={selectedAnnotation}
          onSelectAnnotation={setSelectedAnnotation}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          filter={filter}
          onFilterChange={setFilter}
          collapsed={rightPanelCollapsed}
          onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          isAnalyzing={isAnalyzing}
          onAccept={handleAccept}
          onReject={handleReject}
          onRegenerate={handleRegenerate}
          teachingMethodAnalysis={teachingMethodAnalysis}
        />
      </div>

      {/* BLOCK 4: History & Actions */}
      <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <details className="group" open>
          <summary className="px-4 py-2 flex items-center gap-2 cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <History className="w-4 h-4" />
            Lịch sử & Hành động
            <ChevronDown className="w-4 h-4 ml-auto group-open:rotate-180 transition-transform" />
          </summary>
          <div className="px-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Review History */}
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-500">Review: <span className="font-medium text-zinc-700 dark:text-zinc-300">3 phiên bản</span></span>
              </div>

              {/* Last Review */}
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="text-zinc-500">Cuối: <span className="font-medium text-zinc-700 dark:text-zinc-300">2 giờ trước</span></span>
              </div>

              {/* Divider */}
              <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600" />

              {/* Actions */}
              <Button variant="outline" size="sm" className="text-xs h-8">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Chạy lại Review
              </Button>

              <Button variant="outline" size="sm" className="text-xs h-8">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export PDF
              </Button>

              <Button variant="outline" size="sm" className="text-xs h-8">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Export Word
              </Button>

              <Button variant="ghost" size="sm" className="text-xs h-8">
                <Settings className="w-3.5 h-3.5 mr-1.5" />
                Cài đặt
              </Button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
