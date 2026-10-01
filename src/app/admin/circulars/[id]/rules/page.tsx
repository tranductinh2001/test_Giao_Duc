"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Settings,
  FileText,
  Layers,
  Download,
  Upload,
  FileSpreadsheet,
  Sparkles,
  Wand2,
  Brain,
} from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Circular {
  id: string;
  code: string;
  title: string;
  type: string;
  isActive: boolean;
}

interface SectionRule {
  id: string;
  circularId: string | null;
  sectionType: string;
  title: string;
  requirements: string;
  correctExample: string | null;
  incorrectExample: string | null;
  aiPrompt: string;
  priority: number;
  weight: number;
  level: number;
  order: number;
  isActive: boolean;
  parentId: string | null;
  parent?: { id: string; title: string };
  circular?: { id: string; code: string; title: string };
  children: SectionRule[];
  _count?: { children: number };
}

interface SectionRuleFormData {
  id?: string;
  sectionType: string;
  title: string;
  requirements: string;
  correctExample: string;
  incorrectExample: string;
  aiPrompt: string;
  priority: number;
  weight: number;
  level: number;
  order: number;
  parentId: string | null;
  isActive: boolean;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Muc lon",
  2: "Muc nho",
  3: "Section",
  4: "Subsection",
};

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-primary/10 text-primary border-primary/20",
  2: "bg-success/10 text-success border-success/20",
  3: "bg-info/10 text-info border-info/20",
  4: "bg-warning/10 text-warning border-warning/20",
};

export default function CircularRulesPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [circular, setCircular] = useState<Circular | null>(null);
  const [rules, setRules] = useState<SectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Excel import/export states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importStats, setImportStats] = useState({ newCount: 0, updateCount: 0, errorCount: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // AI Generate states
  const [aiGenerateModalOpen, setAiGenerateModalOpen] = useState(false);
  const [aiGenerateLoading, setAiGenerateLoading] = useState(false);
  const [aiGenerateCount, setAiGenerateCount] = useState(10);
  const [aiGenerateDetail, setAiGenerateDetail] = useState<"short" | "medium" | "detailed">("medium");
  const [aiGenerateLanguage, setAiGenerateLanguage] = useState<"vi" | "en">("vi");
  const [aiGeneratedRules, setAiGeneratedRules] = useState<any[]>([]);

  // Model selection for AI
  const [aiModels, setAiModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.1-flash-lite");
  const [aiAvailable, setAiAvailable] = useState(true);
  const [generateMode, setGenerateMode] = useState<"template" | "document">("document");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SectionRule | null>(null);
  const [formData, setFormData] = useState<SectionRuleFormData>({
    sectionType: "",
    title: "",
    requirements: "",
    correctExample: "",
    incorrectExample: "",
    aiPrompt: "",
    priority: 0,
    weight: 1.0,
    level: 3,
    order: 0,
    parentId: null,
    isActive: true,
  });

  // Fetch circular and rules
  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/circulars/${id}/rules?hierarchy=true`);
      const data = await res.json();
      if (data.success) {
        setCircular(data.data.circular);
        setRules(data.data.rules);
      } else {
        toast.error(data.message || "Loi tai du lieu");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Loi khi tai du lieu");
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI models and status
  const fetchAIModels = async () => {
    try {
      const res = await fetch("/api/admin/rule-generator?action=documents");
      const data = await res.json();
      if (data.success) {
        setAiModels(data.data.models || []);
        setAiAvailable(data.data.aiAvailable ?? true);
      }
    } catch (error) {
      console.error("Error fetching AI models:", error);
      setAiAvailable(false);
    }
  };

  // Open modal and fetch models
  const handleOpenAIGenerateModal = () => {
    fetchAIModels();
    setAiGenerateModalOpen(true);
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`/api/admin/circulars/${id}/rules/excel?action=template`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-${circular?.code || 'rules'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Tai mau thanh cong');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Loi khi tai mau');
    }
  };

  // Export rules
  const handleExportRules = async () => {
    try {
      const res = await fetch(`/api/admin/circulars/${id}/rules/excel?action=export`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rules-${circular?.code || 'export'}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Xuat rules thanh cong');
    } catch (error) {
      console.error('Error exporting rules:', error);
      toast.error('Loi khi xuat rules');
    }
  };

  // Preview import
  const handlePreviewImport = async (file: File) => {
    setSelectedFile(file);
    setImportLoading(true);
    setImportErrors([]);
    setImportPreview([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/admin/circulars/${id}/rules/excel`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setImportPreview(data.data.preview || []);
        setImportStats({
          newCount: data.data.newCount || 0,
          updateCount: data.data.updateCount || 0,
          errorCount: data.data.errorCount || 0,
        });
        setImportErrors(data.data.errors || []);
      } else {
        toast.error(data.message || 'Loi khi doc file');
      }
    } catch (error) {
      console.error('Error previewing import:', error);
      toast.error('Loi khi doc file Excel');
    } finally {
      setImportLoading(false);
    }
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) {
      toast.error('Khong co du lieu de import');
      return;
    }

    setImportLoading(true);
    try {
      const res = await fetch(`/api/admin/circulars/${id}/rules/excel/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: importPreview }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Import thanh cong');
        setImportModalOpen(false);
        setImportPreview([]);
        setSelectedFile(null);
        fetchData();
      } else {
        toast.error(data.message || 'Loi khi import');
      }
    } catch (error) {
      console.error('Error confirming import:', error);
      toast.error('Loi khi luu du lieu');
    } finally {
      setImportLoading(false);
    }
  };

  // AI Generate handlers
  const handleAIGenerate = async () => {
    setAiGenerateLoading(true);
    try {
      if (generateMode === "document") {
        // Use rule-generator to extract rules from document
        const res = await fetch("/api/admin/rule-generator", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: id,
            model: selectedModel,
            forceRegenerate: true,
          }),
        });

        const data = await res.json();

        if (data.success) {
          // Convert ExtractedRule format to GeneratedRule format for UI
          const extractedRules = data.data.rules || [];
          const convertedRules = extractedRules.map((rule: any) => ({
            nhomTieuChi: rule.category || rule.section || "OBJECTIVES",
            tenTieuChi: rule.name || "",
            noiDungDanhGia: rule.description || rule.prompt || "",
            DieuKienDat: rule.positiveExample || "",
            DieuKienChuaDat: rule.negativeExample || "",
            promptAI: rule.prompt || "",
            viDuDung: rule.positiveExample || "",
            viDuSai: rule.negativeExample || "",
            goiYNhanXet: rule.suggestion || "",
            diem: rule.score || 1,
            trongSo: rule.weight || 1,
            batBuoc: rule.required ?? true,
            ghiChu: rule.reference || "",
          }));
          setAiGeneratedRules(convertedRules);
          toast.success(data.message || `Da sinh ${convertedRules.length} rules tu van ban`);
        } else {
          toast.error(data.message || 'Loi khi sinh rules tu van ban');
        }
      } else {
        // Use template generator (existing functionality)
        const res = await fetch(`/api/admin/circulars/${id}/rules/ai-generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: aiGenerateCount,
            detailLevel: aiGenerateDetail,
            language: aiGenerateLanguage,
            model: selectedModel,
          }),
        });

        const data = await res.json();

        if (data.success) {
          setAiGeneratedRules(data.data.rules || []);
          toast.success(data.message || 'Da sinh rules mau');
        } else {
          toast.error(data.message || 'Loi khi sinh rules');
        }
      }
    } catch (error) {
      console.error('Error generating rules:', error);
      toast.error('Loi khi sinh rules bang AI');
    } finally {
      setAiGenerateLoading(false);
    }
  };

  const handleAISaveGenerated = async () => {
    if (aiGeneratedRules.length === 0) {
      toast.error('Khong co rules de luu');
      return;
    }

    setAiGenerateLoading(true);
    try {
      const res = await fetch(`/api/admin/circulars/${id}/rules/excel/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: aiGeneratedRules }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Luu rules thanh cong');
        setAiGenerateModalOpen(false);
        setAiGeneratedRules([]);
        fetchData();
      } else {
        toast.error(data.message || 'Loi khi luu rules');
      }
    } catch (error) {
      console.error('Error saving generated rules:', error);
      toast.error('Loi khi luu rules');
    } finally {
      setAiGenerateLoading(false);
    }
  };

  const handleAICompleteRule = async (index: number) => {
    const rule = aiGeneratedRules[index];
    if (!rule) return;

    try {
      const res = await fetch(`/api/admin/circulars/${id}/rules/ai-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule }),
      });

      const data = await res.json();

      if (data.success) {
        const updated = [...aiGeneratedRules];
        updated[index] = data.data.rule;
        setAiGeneratedRules(updated);
        toast.success('Hoan thien rule');
      } else {
        toast.error(data.message || 'Loi khi hoan thien');
      }
    } catch (error) {
      console.error('Error completing rule:', error);
      toast.error('Loi khi hoan thien bang AI');
    }
  };

  const handleAICompleteAll = async () => {
    setAiGenerateLoading(true);
    try {
      for (let i = 0; i < aiGeneratedRules.length; i++) {
        const rule = aiGeneratedRules[i];
        const res = await fetch(`/api/admin/circulars/${id}/rules/ai-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rule }),
        });

        const data = await res.json();
        if (data.success) {
          const updated = [...aiGeneratedRules];
          updated[i] = data.data.rule;
          setAiGeneratedRules(updated);
        }
      }
      toast.success('Hoan thien tat ca rules');
    } catch (error) {
      console.error('Error completing all rules:', error);
      toast.error('Loi khi hoan thien tat ca');
    } finally {
      setAiGenerateLoading(false);
    }
  };

  const handleDeleteGeneratedRule = (index: number) => {
    setAiGeneratedRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateGeneratedRule = (index: number, field: string, value: any) => {
    setAiGeneratedRules(prev => prev.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    ));
  };

  // Get flat list of parent rules for dropdown
  const getParentOptions = () => {
    const options: SectionRule[] = [];
    const flatten = (ruleList: SectionRule[], depth = 0) => {
      ruleList.forEach(rule => {
        if (rule.id !== editingRule?.id) {
          options.push(rule);
        }
        if (rule.children?.length > 0) {
          flatten(rule.children, depth + 1);
        }
      });
    };
    flatten(rules);
    return options;
  };

  // Open modal for create/edit
  const openModal = (rule?: SectionRule, parentId?: string | null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        id: rule.id,
        sectionType: rule.sectionType,
        title: rule.title,
        requirements: rule.requirements,
        correctExample: rule.correctExample || "",
        incorrectExample: rule.incorrectExample || "",
        aiPrompt: rule.aiPrompt,
        priority: rule.priority,
        weight: rule.weight,
        level: rule.level,
        order: rule.order,
        parentId: rule.parentId,
        isActive: rule.isActive,
      });
    } else {
      setEditingRule(null);
      setFormData({
        sectionType: "",
        title: "",
        requirements: "",
        correctExample: "",
        incorrectExample: "",
        aiPrompt: "",
        priority: 0,
        weight: 1.0,
        level: 3,
        order: rules.length,
        parentId: parentId || null,
        isActive: true,
      });
    }
    setModalOpen(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!formData.sectionType || !formData.title || !formData.requirements) {
      toast.error("Vui long dien day du thong tin");
      return;
    }

    setSaving(true);
    try {
      const url = editingRule
        ? `/api/admin/section-rules/${editingRule.id}`
        : `/api/admin/circulars/${id}/rules`;

      const method = editingRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          circularId: id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editingRule ? "Cap nhat rule thanh cong" : "Tao rule thanh cong");
        setModalOpen(false);
        fetchData();
      } else {
        toast.error(data.message || "Loi khi luu rule");
      }
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error("Loi khi luu rule");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (ruleId: string) => {
    if (!confirm("Ban co chac muon xoa rule nay?")) return;

    try {
      const res = await fetch(`/api/admin/section-rules/${ruleId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Xoa rule thanh cong");
        fetchData();
      } else {
        toast.error(data.message || "Loi khi xoa rule");
      }
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Loi khi xoa rule");
    }
  };

  // Toggle active status
  const toggleActive = async (rule: SectionRule) => {
    try {
      const res = await fetch(`/api/admin/section-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`${rule.isActive ? "Vo hieu hoa" : "Kich hoat"} rule thanh cong`);
        fetchData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Loi khi cap nhat trang thai");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!circular) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-warning" />
          <h2 className="text-xl font-semibold mb-2">Khong tim thay Cong van</h2>
          <Link href="/admin/circulars">
            <Button variant="outline">Quay lai</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 overflow-x-auto">
          <Link
            href="/admin/circulars"
            className="inline-flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Quan ly Cong van</span>
            <span className="sm:hidden">Cong van</span>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium whitespace-nowrap">{circular.code}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground whitespace-nowrap">Rules</span>
        </div>

        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold truncate">Rules: {circular.code}</h1>
                <p className="text-sm text-muted-foreground truncate">{circular.title}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} title="Tai mau Excel">
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Tai Mau</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)} title="Import tu Excel">
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportRules} title="Xuat Rule mau">
                <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Xuat Mau</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={handleOpenAIGenerateModal} title="Sinh Rule bang AI" disabled={!aiAvailable}>
                <Sparkles className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">AI Sinh</span>
              </Button>
              <Button variant="primary" onClick={() => openModal()} size="sm">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Them Rule</span>
                <span className="sm:hidden">Them</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Rules List */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold">
              Danh sach Rules ({rules.length})
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${LEVEL_COLORS[1]}`} />
                <span className="hidden sm:inline">Muc lon</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${LEVEL_COLORS[2]}`} />
                <span className="hidden sm:inline">Muc nho</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${LEVEL_COLORS[3]}`} />
                <span className="hidden sm:inline">Section</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-3 h-3 rounded ${LEVEL_COLORS[4]}`} />
                <span className="hidden sm:inline">Subsection</span>
              </span>
            </div>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Chua co rules nao</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => openModal()}
              >
                <Plus className="w-5 h-5 mr-2" />
                Tao rule dau tien
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <RuleList
                rules={rules}
                onEdit={openModal}
                onDelete={handleDelete}
                onToggleActive={toggleActive}
                onAddChild={openModal}
                levelLabels={LEVEL_LABELS}
                levelColors={LEVEL_COLORS}
              />
            </div>
          )}
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl sm:max-h-[90vh] max-h-[95vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
                <h2 className="text-lg sm:text-xl font-semibold">
                  {editingRule ? "Sua Rule" : "Tao Rule moi"}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
                {/* Section Type */}
                <div>
                  <label
                    className="block text-sm font-semibold mb-1.5 cursor-help"
                    title="Nhom tiêu chí mà rule này thuộc về"
                  >
                    Nhóm tiêu chí <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.sectionType}
                    onChange={(e) => setFormData({ ...formData, sectionType: e.target.value })}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="">-- Chọn nhóm tiêu chí --</option>
                    <option value="OBJECTIVES">Mục tiêu (OBJECTIVES) - Mục tiêu bài học, kết quả mong đợi</option>
                    <option value="PREPARATION">Chuẩn bị (PREPARATION) - Chuẩn bị của giáo viên, học sinh</option>
                    <option value="ACTIVITY">Hoạt động (ACTIVITY) - Các hoạt dạy và học</option>
                    <option value="EVALUATION">Đánh giá (EVALUATION) - Tiêu chí đánh giá</option>
                    <option value="MATERIALS">Phương tiện (MATERIALS) - Thiết bị, đồ dùng dạy học</option>
                    <option value="HOMEWORK">Về nhà (HOMEWORK) - Bài tập về nhà</option>
                    <option value="NOTES">Ghi chú (NOTES) - Lưu ý, bổ sung</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chọn nhóm mà rule này thuộc về để phân loại và tìm kiếm
                  </p>
                </div>

                {/* Level */}
                <div>
                  <label
                    className="block text-sm font-semibold mb-1.5 cursor-help"
                    title="Cấp độ của rule trong cấu trúc phân cấp"
                  >
                    Cấp độ <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="1">1 - Mục lớn (Chapter/Phần lớn)</option>
                    <option value="2">2 - Mục nhỏ (Section/Phần con)</option>
                    <option value="3">3 - Section (Tiểu mục)</option>
                    <option value="4">4 - Subsection (Chi tiết)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cấp độ 1 = Mục lớn nhất, Cấp độ 4 = Chi tiết nhất
                  </p>
                </div>

                {/* Title */}
                <div>
                  <label
                    className="block text-sm font-semibold mb-1.5 cursor-help"
                    title="Tên ngắn gọn mô tả rule"
                  >
                    Tiêu đề Rule <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Mục tiêu bài học phải rõ ràng, cụ thể và đo lường được"
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tên ngắn gọn, dễ hiểu, mô tả ngắn gọn yêu cầu cần kiểm tra
                  </p>
                </div>

                {/* Requirements */}
                <div>
                  <label
                    className="block text-sm font-semibold mb-1.5 cursor-help"
                    title="Mô tả chi tiết yêu cầu cần đánh giá"
                  >
                    Yêu cầu <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder="VD: Mục tiêu bài học phải: (1) Rõ ràng, cụ thể; (2) Phù hợp với nội dung bài học; (3) Có thể đo lường được qua sản phẩm/hành vi học sinh; (4) Phân hóa được theo năng lực học sinh"
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mô tả chi tiết các tiêu chí cần kiểm tra, có thể liệt kê các điều kiện cụ thể
                  </p>
                </div>

                {/* AI Prompt */}
                <div>
                  <label
                    className="block text-sm font-semibold mb-1.5 cursor-help"
                    title="Hướng dẫn riêng cho AI khi đánh giá rule này"
                  >
                    Prompt AI <span className="text-muted-foreground">(tùy chọn)</span>
                  </label>
                  <textarea
                    value={formData.aiPrompt}
                    onChange={(e) => setFormData({ ...formData, aiPrompt: e.target.value })}
                    placeholder="VD: Khi đánh giá mục tiêu, hãy chú ý: (1) Mục tiêu phải có động từ hành động; (2) Phải nêu rõ tiêu chuẩn đạt; (3) Phân biệt được các mức độ"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Để trống = dùng prompt mặc định của hệ thống. Nhập hướng dẫn riêng để AI đánh giá chính xác hơn
                  </p>
                </div>

                {/* Correct Example & Incorrect Example */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5 cursor-help"
                      title="Ví dụ về nội dung đạt yêu cầu"
                    >
                      Ví dụ đúng <span className="text-muted-foreground">(tùy chọn)</span>
                    </label>
                    <textarea
                      value={formData.correctExample}
                      onChange={(e) => setFormData({ ...formData, correctExample: e.target.value })}
                      placeholder="VD: 'Hs làm được các phép tính cộng, trừ trong phạm vi 100' - Mục tiêu có động từ 'làm được', có tiêu chuẩn 'trong phạm vi 100'"
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background resize-none text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ví dụ về nội dung đạt yêu cầu, giúp người dùng hiểu rõ hơn
                    </p>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5 cursor-help"
                      title="Ví dụ về nội dung chưa đạt yêu cầu"
                    >
                      Ví dụ sai <span className="text-muted-foreground">(tùy chọn)</span>
                    </label>
                    <textarea
                      value={formData.incorrectExample}
                      onChange={(e) => setFormData({ ...formData, incorrectExample: e.target.value })}
                      placeholder="VD: 'Hs nắm vững kiến thức' - Mục tiêu không rõ ràng, không đo lường được, không có tiêu chuẩn cụ thể"
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background resize-none text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ví dụ về nội dung chưa đạt yêu cầu, tránh nhầm lẫn
                    </p>
                  </div>
                </div>

                {/* Priority, Weight, Order */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5 cursor-help"
                      title="Số cao hơn = ưu tiên hơn khi đánh giá"
                    >
                      Độ ưu tiên <span className="text-muted-foreground">(mặc định: 0)</span>
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      placeholder="0, 10, 20..."
                      className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Số cao hơn = ưu tiên hơn khi đánh giá
                    </p>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5 cursor-help"
                      title="Tỷ trọng điểm của rule này trong tổng điểm"
                    >
                      Trọng số <span className="text-muted-foreground">(mặc định: 1.0)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 1.0 })}
                      placeholder="0.5, 1.0, 2.0..."
                      className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tỷ trọng điểm (1.0 = bình thường)
                    </p>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-semibold mb-1.5 cursor-help"
                      title="Thứ tự hiển thị trong danh sách"
                    >
                      Thứ tự <span className="text-muted-foreground">(mặc định: 0)</span>
                    </label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      placeholder="1, 2, 3..."
                      className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Số thứ tự hiển thị (nhỏ đứng trước)
                    </p>
                  </div>
                </div>

                {/* Parent Rule */}
                <div>
                  <label
                    className="block text-sm font-semibold mb-1.5 cursor-help"
                    title="Chọn rule cha nếu rule này là rule con"
                  >
                    Rule cha <span className="text-muted-foreground">(tùy chọn)</span>
                  </label>
                  <select
                    value={formData.parentId || ""}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="">-- Không có (Root level) --</option>
                    {getParentOptions().map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {"  ".repeat(rule.level - 1)}[{LEVEL_LABELS[rule.level]}] {rule.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chọn rule cha nếu có. Rule con sẽ hiển thị bên dưới rule cha
                  </p>
                </div>

                {/* isActive */}
                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm cursor-pointer">
                    <span className="font-semibold">Kích hoạt rule này</span>
                    <span className="text-muted-foreground"> - Rule sẽ được sử dụng khi đánh giá nếu được kích hoạt</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-border flex-shrink-0 bg-white dark:bg-zinc-900">
                <Button variant="outline" onClick={() => setModalOpen(false)} size="sm">
                  Huy
                </Button>
                <Button variant="primary" onClick={handleSave} isLoading={saving} size="sm">
                  <Save className="w-4 h-4 mr-1.5" />
                  Luu
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-4xl sm:max-h-[90vh] max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-semibold">Import Rules tu Excel</h2>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setImportPreview([]);
                  setImportErrors([]);
                  setSelectedFile(null);
                }}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {!selectedFile && (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="mb-4">Chon file Excel de import</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePreviewImport(file);
                    }}
                    className="hidden"
                    id="excel-import"
                  />
                  <label
                    htmlFor="excel-import"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Chon File
                  </label>
                </div>
              )}

              {importLoading && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p>Dang xu ly...</p>
                </div>
              )}

              {selectedFile && !importLoading && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-success">{importStats.newCount}</p>
                      <p className="text-xs text-muted-foreground">Moi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{importStats.updateCount}</p>
                      <p className="text-xs text-muted-foreground">Cap nhat</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-destructive">{importStats.errorCount}</p>
                      <p className="text-xs text-muted-foreground">Loi</p>
                    </div>
                    <div className="ml-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setImportPreview([]);
                          setImportErrors([]);
                        }}
                      >
                        Chon file khac
                      </Button>
                    </div>
                  </div>

                  {importErrors.length > 0 && (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <h4 className="font-semibold text-destructive mb-2">Cac loi can sua:</h4>
                      <ul className="text-sm text-destructive space-y-1 max-h-32 overflow-y-auto">
                        {importErrors.slice(0, 10).map((err, idx) => (
                          <li key={idx}>Dong {err.row}: {err.field} - {err.message}</li>
                        ))}
                        {importErrors.length > 10 && <li>... va {importErrors.length - 10} loi khac</li>}
                      </ul>
                    </div>
                  )}

                  {importPreview.length > 0 && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/30 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left">STT</th>
                              <th className="px-3 py-2 text-left">Nhom</th>
                              <th className="px-3 py-2 text-left">Ten Rule</th>
                              <th className="px-3 py-2 text-left">Ma Rule</th>
                              <th className="px-3 py-2 text-left">Yeu cau</th>
                              <th className="px-3 py-2 text-left">Diem</th>
                              <th className="px-3 py-2 text-left">Trang thai</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.slice(0, 20).map((row, idx) => (
                              <tr key={idx} className="border-t border-border">
                                <td className="px-3 py-2">{row.stt}</td>
                                <td className="px-3 py-2">{row.nhomTieuChi}</td>
                                <td className="px-3 py-2">{row.tenRule}</td>
                                <td className="px-3 py-2 font-mono text-xs">{row.maRule}</td>
                                <td className="px-3 py-2 max-w-xs truncate">{row.yeuCau}</td>
                                <td className="px-3 py-2">{row.diem}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${row.trangThai ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                    {row.trangThai ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {importPreview.length > 20 && (
                        <p className="p-2 text-xs text-muted-foreground text-center border-t border-border">
                          Hien thi 20/{importPreview.length} dong
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-t border-border flex-shrink-0 bg-white dark:bg-zinc-900">
              <p className="text-sm text-muted-foreground">
                {importPreview.length > 0 ? `${importPreview.length} rules san sang` : 'Chua chon file'}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportPreview([]);
                    setImportErrors([]);
                    setSelectedFile(null);
                  }}
                  size="sm"
                >
                  Huy
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmImport}
                  disabled={importLoading || importPreview.length === 0 || importErrors.length > 0}
                  isLoading={importLoading}
                  size="sm"
                >
                  Xac Nhan Import
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {aiGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold">
                  {generateMode === "document" ? "Sinh Rule từ văn bản" : "Sinh Rule mẫu bằng AI"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setAiGenerateModalOpen(false);
                  setAiGeneratedRules([]);
                }}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* AI Status & Model Selection */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className={`w-5 h-5 ${aiAvailable ? "text-green-500" : "text-red-500"}`} />
                  <span className="text-sm font-medium">
                    AI: {aiAvailable ? "Sẵn sàng" : "Không khả dụng"}
                  </span>
                </div>

                {/* Mode Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Chế độ sinh rule</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGenerateMode("document")}
                      className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        generateMode === "document"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <FileText className="w-4 h-4 mx-auto mb-1" />
                      Từ văn bản
                    </button>
                    <button
                      onClick={() => setGenerateMode("template")}
                      className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        generateMode === "template"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Wand2 className="w-4 h-4 mx-auto mb-1" />
                      Mẫu template
                    </button>
                  </div>
                </div>

                {/* Model Selection - Show for both modes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Chọn Model AI</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn model AI" />
                    </SelectTrigger>
                    <SelectContent>
                      {aiModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-muted-foreground">
                  {generateMode === "document"
                    ? "AI sẽ phân tích văn bản công văn và trích xuất các tiêu chí đánh giá."
                    : "AI sẽ sinh các tiêu chí đánh giá mẫu dựa trên cấu trúc giáo án chuẩn."}
                </p>
              </div>

              {/* Generator Settings */}
              {aiGeneratedRules.length === 0 && (
                <div className="max-w-md mx-auto space-y-6">
                  {generateMode === "template" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Số lượng Rule</label>
                        <select
                          value={aiGenerateCount}
                          onChange={(e) => setAiGenerateCount(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        >
                          <option value={10}>10 rules</option>
                          <option value={20}>20 rules</option>
                          <option value={30}>30 rules</option>
                          <option value={50}>50 rules</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Độ chi tiết</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: "short", label: "Ngắn" },
                            { value: "medium", label: "Trung bình" },
                            { value: "detailed", label: "Chi tiết" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setAiGenerateDetail(opt.value as any)}
                              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                aiGenerateDetail === opt.value
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Ngôn ngữ</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setAiGenerateLanguage("vi")}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          aiGenerateLanguage === "vi"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        Tiếng Việt
                      </button>
                      <button
                        onClick={() => setAiGenerateLanguage("en")}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          aiGenerateLanguage === "en"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleAIGenerate}
                    isLoading={aiGenerateLoading}
                    disabled={!circular}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    {generateMode === "document" ? "Sinh Rule từ văn bản" : "Sinh Rule mẫu"}
                  </Button>
                </div>
              )}

              {/* Generated Rules Preview */}
              {aiGeneratedRules.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {aiGeneratedRules.length} rules đã sinh - có thể chỉnh sửa trước khi lưu
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleAICompleteAll} isLoading={aiGenerateLoading}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Hoàn thiện tất cả
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setAiGeneratedRules([])}>
                        Sinh lại
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {aiGeneratedRules.map((rule, index) => (
                      <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Nhóm tiêu chí</label>
                              <select
                                value={rule.nhomTieuChi}
                                onChange={(e) => handleUpdateGeneratedRule(index, "nhomTieuChi", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                              >
                                <option value="OBJECTIVES">OBJECTIVES</option>
                                <option value="PREPARATION">PREPARATION</option>
                                <option value="ACTIVITY">ACTIVITY</option>
                                <option value="EVALUATION">EVALUATION</option>
                                <option value="MATERIALS">MATERIALS</option>
                                <option value="HOMEWORK">HOMEWORK</option>
                                <option value="NOTES">NOTES</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Tên tiêu chí</label>
                              <input
                                type="text"
                                value={rule.tenTieuChi}
                                onChange={(e) => handleUpdateGeneratedRule(index, "tenTieuChi", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs text-muted-foreground mb-1">Nội dung đánh giá</label>
                              <textarea
                                value={rule.noiDungDanhGia}
                                onChange={(e) => handleUpdateGeneratedRule(index, "noiDungDanhGia", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Điều kiện đạt</label>
                              <textarea
                                value={rule.DieuKienDat}
                                onChange={(e) => handleUpdateGeneratedRule(index, "DieuKienDat", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Điều kiện chưa đạt</label>
                              <textarea
                                value={rule.DieuKienChuaDat}
                                onChange={(e) => handleUpdateGeneratedRule(index, "DieuKienChuaDat", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Ví dụ đúng</label>
                              <textarea
                                value={rule.viDuDung}
                                onChange={(e) => handleUpdateGeneratedRule(index, "viDuDung", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Ví dụ sai</label>
                              <textarea
                                value={rule.viDuSai}
                                onChange={(e) => handleUpdateGeneratedRule(index, "viDuSai", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                                rows={2}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs text-muted-foreground mb-1">Gợi ý nhận xét</label>
                              <textarea
                                value={rule.goiYNhanXet}
                                onChange={(e) => handleUpdateGeneratedRule(index, "goiYNhanXet", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Điểm</label>
                              <input
                                type="number"
                                value={rule.diem}
                                onChange={(e) => handleUpdateGeneratedRule(index, "diem", Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">Trọng số</label>
                              <input
                                type="number"
                                step="0.1"
                                value={rule.trongSo}
                                onChange={(e) => handleUpdateGeneratedRule(index, "trongSo", Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteGeneratedRule(index)}
                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAICompleteRule(index)}
                            className="text-xs flex items-center gap-1 text-primary hover:underline"
                          >
                            <Sparkles className="w-3 h-3" />
                            AI hoàn thiện
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-t border-border flex-shrink-0 bg-white dark:bg-zinc-900">
              <p className="text-sm text-muted-foreground">
                {aiGeneratedRules.length > 0 ? `${aiGeneratedRules.length} rules sẵn sàng` : 'Cấu hình và sinh rules'}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAiGenerateModalOpen(false);
                    setAiGeneratedRules([]);
                  }}
                  size="sm"
                >
                  Huy
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAISaveGenerated}
                  isLoading={aiGenerateLoading}
                  disabled={aiGeneratedRules.length === 0}
                  size="sm"
                >
                  Luu {aiGeneratedRules.length} Rules
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Recursive Rule List Component
interface RuleListProps {
  rules: SectionRule[];
  onEdit: (rule: SectionRule) => void;
  onDelete: (id: string) => void;
  onToggleActive: (rule: SectionRule) => void;
  onAddChild: (rule: undefined, parentId: string | null) => void;
  levelLabels: Record<number, string>;
  levelColors: Record<number, string>;
  depth?: number;
}

function RuleList({
  rules,
  onEdit,
  onDelete,
  onToggleActive,
  onAddChild,
  levelLabels,
  levelColors,
  depth = 0,
}: RuleListProps) {
  return (
    <>
      {rules.map((rule) => (
        <div key={rule.id}>
          <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border gap-3 ${
              rule.isActive
                ? "bg-background border-border hover:border-primary/50"
                : "bg-muted/30 border-muted"
            }`}
            style={{ marginLeft: depth * 16 }}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0 w-full sm:w-auto">
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${levelColors[rule.level]}`}>
                    {levelLabels[rule.level]}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded bg-muted`}>
                    {rule.sectionType}
                  </span>
                  {!rule.isActive && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                      Vo hieu hoa
                    </span>
                  )}
                </div>
                <h3 className={`font-medium text-sm sm:text-base ${!rule.isActive ? "text-muted-foreground line-through" : ""}`}>
                  {rule.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2 mt-1">
                  {rule.requirements}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddChild(undefined, rule.id)}
                title="Them child rule"
                className="min-w-[36px] min-h-[36px]"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleActive(rule)}
                title={rule.isActive ? "Vo hieu hoa" : "Kich hoat"}
                className="min-w-[36px] min-h-[36px]"
              >
                {rule.isActive ? (
                  <X className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(rule)}
                className="min-w-[36px] min-h-[36px]"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(rule.id)}
                className="text-destructive hover:text-destructive min-w-[36px] min-h-[36px]"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {rule.children && rule.children.length > 0 && (
            <RuleList
              rules={rule.children}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              onAddChild={onAddChild}
              levelLabels={levelLabels}
              levelColors={levelColors}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </>
  );
}
