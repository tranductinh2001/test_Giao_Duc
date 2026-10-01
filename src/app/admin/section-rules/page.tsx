"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Trash2,
  Save,
  Eye,
  Play,
  CheckCircle,
  XCircle,
  Target,
  Brain,
  Tag,
  Loader2,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X,
  Copy,
  RefreshCw,
  FileJson,
  ArrowRight,
  Zap,
  Code,
  AlignLeft,
  Hash,
  Gauge,
  Layers,
  EyeOff,
  Check,
  Clock,
  AlertCircle,
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
import { getDefaultModel } from "@/lib/ai-models";

// Types
interface SectionRule {
  id: string;
  title: string;
  sectionType: string;
  requirements: string;
  correctExample?: string;
  incorrectExample?: string;
  aiPrompt: string;
  priority: number;
  weight: number;
  level: number;
  order: number;
  isActive: boolean;
  parentId?: string;
  alias?: string;
  circularId?: string;
  circular?: {
    code: string;
    title: string;
  };
  parent?: {
    id: string;
    title: string;
  };
  children?: SectionRule[];
  _count?: {
    children: number;
  };
}

interface RuleFormData {
  title: string;
  sectionType: string;
  requirements: string;
  correctExample: string;
  incorrectExample: string;
  aiPrompt: string;
  priority: number;
  weight: number;
  level: number;
  isActive: boolean;
  parentId: string;
  alias: string;
}

interface WorkflowStep {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
  time: number;
}

interface LiveTestResult {
  detectedSection: string;
  detectedAliases: string[];
  matchedRules: {
    rule: string;
    alias: string;
    confidence: number;
  }[];
  aiPayload: {
    text: string;
    sectionType: string;
    rules: string[];
    aliases: string[];
  };
  aiResponse: string;
  score: number;
  workflow: WorkflowStep[];
  executionTime?: number;
  tokens?: number;
  estimatedCost?: number;
  annotations?: any[];
  suggestions?: any[];
  debug?: {
    parse?: any;
    validation?: any;
    fixes?: any;
    score?: any;
  };
}

// Tree Node Component - Professional styling matching Knowledge Center
function RuleTreeNode({
  rule,
  level,
  expandedNodes,
  onToggle,
  selectedRule,
  onSelect,
}: {
  rule: SectionRule;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  selectedRule: SectionRule | null;
  onSelect: (rule: SectionRule) => void;
}) {
  const hasChildren = rule.children && rule.children.length > 0;
  const isExpanded = expandedNodes.has(rule.id);
  const isSelected = selectedRule?.id === rule.id;

  const getSectionColor = (sectionType: string) => {
    switch (sectionType.toUpperCase()) {
      case "OBJECTIVE":
        return { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50 dark:bg-blue-950" };
      case "WARMUP":
        return { bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50 dark:bg-orange-950" };
      case "KNOWLEDGE":
        return { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50 dark:bg-emerald-950" };
      case "PRACTICE":
        return { bg: "bg-violet-500", text: "text-violet-600", light: "bg-violet-50 dark:bg-violet-950" };
      case "APPLICATION":
        return { bg: "bg-rose-500", text: "text-rose-600", light: "bg-rose-50 dark:bg-rose-950" };
      default:
        return { bg: "bg-zinc-500", text: "text-zinc-600", light: "bg-zinc-50 dark:bg-zinc-950" };
    }
  };

  const getSectionLabel = (sectionType: string) => {
    switch (sectionType.toUpperCase()) {
      case "OBJECTIVE": return "MT";
      case "WARMUP": return "KD";
      case "KNOWLEDGE": return "KT";
      case "PRACTICE": return "LT";
      case "APPLICATION": return "VD";
      default: return "??";
    }
  };

  const colors = getSectionColor(rule.sectionType);

  return (
    <div>
      <button
        onClick={() => {
          onSelect(rule);
          if (hasChildren) onToggle(rule.id);
        }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-all duration-150 ${
          isSelected
            ? `${colors.light} ${colors.text} font-medium`
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
          <span className="text-[10px] font-bold text-white">{getSectionLabel(rule.sectionType)}</span>
        </div>

        <span className="flex-1 truncate">{rule.title}</span>

        <span className="text-[10px] text-zinc-400 font-mono flex-shrink-0">#{rule.priority}</span>

        {hasChildren && (
          <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex-shrink-0">
            {rule.children?.length}
          </span>
        )}

        {!rule.isActive && (
          <EyeOff className="w-3 h-3 text-zinc-300 flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {rule.children?.map((child) => (
              <RuleTreeNode
                key={child.id}
                rule={child}
                level={level + 1}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                selectedRule={selectedRule}
                onSelect={onSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Rule Editor Panel - IDE-like styling
function RuleEditorPanel({
  rule,
  onSave,
  onDelete,
  onTest,
  isTesting,
  testResult,
  onTestWithRealApi,
}: {
  rule: SectionRule | null;
  onSave: (data: RuleFormData) => void;
  onDelete: (id: string) => void;
  onTest: (text: string) => void;
  isTesting: boolean;
  testResult: LiveTestResult | null;
  onTestWithRealApi?: (text: string) => void;
}) {
  const [formData, setFormData] = useState<RuleFormData>({
    title: "",
    sectionType: "KNOWLEDGE",
    requirements: "",
    correctExample: "",
    incorrectExample: "",
    aiPrompt: "",
    priority: 0,
    weight: 1.0,
    level: 3,
    isActive: true,
    parentId: "",
    alias: "",
  });

  const [originalData, setOriginalData] = useState<RuleFormData | null>(null);
  const [testText, setTestText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "test">("info");
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    if (rule) {
      const newData = {
        title: rule.title,
        sectionType: rule.sectionType,
        requirements: rule.requirements,
        correctExample: rule.correctExample || "",
        incorrectExample: rule.incorrectExample || "",
        aiPrompt: rule.aiPrompt,
        priority: rule.priority,
        weight: rule.weight,
        level: rule.level,
        isActive: rule.isActive,
        parentId: rule.parentId || "",
        alias: (rule as any).alias || "",
      };
      setFormData(newData);
      setOriginalData(newData);
    }
  }, [rule]);

  const changedFields = useMemo(() => {
    if (!originalData) return [];
    const changes: string[] = [];
    Object.keys(formData).forEach((key) => {
      if (formData[key as keyof RuleFormData] !== originalData[key as keyof RuleFormData]) {
        changes.push(key);
      }
    });
    return changes;
  }, [formData, originalData]);

  const hasUnsavedChanges = changedFields.length > 0;

  const handleSubmit = () => {
    onSave(formData);
    setOriginalData(formData);
  };

  const handleTest = () => {
    if (testText.trim()) {
      onTest(testText);
    }
  };

  if (!rule) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Target className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Chọn một Rule
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Chọn rule từ cây bên trái để chỉnh sửa hoặc tạo rule mới
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-zinc-400" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Rule Editor
              </h2>
              {rule.id && (
                <code className="text-xs text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                  {rule.id.slice(0, 8)}
                </code>
              )}
            </div>
            {hasUnsavedChanges && (
              <Badge variant="warning" className="text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5" />
                Unsaved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "test" && (
              <Button
                variant={debugMode ? "primary" : "ghost"}
                size="sm"
                onClick={() => setDebugMode(!debugMode)}
              >
                <Code className="w-4 h-4 mr-1.5" />
                Debug
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4 mr-1.5" />
              Preview
            </Button>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => onDelete(rule.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-3">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "info"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5 inline mr-1.5" />
            Thông tin
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "test"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Zap className="w-3.5 h-3.5 inline mr-1.5" />
            Live Test
          </button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === "info" ? (
          <div className="p-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                Tên Rule
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Section Type & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  Section Type
                </label>
                <Select
                  value={formData.sectionType}
                  onValueChange={(v) => setFormData({ ...formData, sectionType: v })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OBJECTIVE">🎯 Mục tiêu</SelectItem>
                    <SelectItem value="WARMUP">🔥 Khởi động</SelectItem>
                    <SelectItem value="KNOWLEDGE">💡 Hình thành kiến thức</SelectItem>
                    <SelectItem value="PRACTICE">✏️ Luyện tập</SelectItem>
                    <SelectItem value="APPLICATION">🚀 Vận dụng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Weight & Level */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  Weight
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 1.0 })}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                  Level
                </label>
                <input
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Alias */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                <Tag className="w-3 h-3 inline mr-1" />
                Alias
              </label>
              <input
                type="text"
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                placeholder="Ví dụ: khoi-dong, hinh-thanh-kien-thuc"
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                Requirements
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* AI Prompt */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                <Brain className="w-3 h-3 inline mr-1" />
                AI Prompt
              </label>
              <textarea
                value={formData.aiPrompt}
                onChange={(e) => setFormData({ ...formData, aiPrompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-950 text-zinc-100 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Examples */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1.5 uppercase tracking-wide">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Ví dụ đúng
                </label>
                <textarea
                  value={formData.correctExample}
                  onChange={(e) => setFormData({ ...formData, correctExample: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-red-600 dark:text-red-400 mb-1.5 uppercase tracking-wide">
                  <XCircle className="w-3 h-3 inline mr-1" />
                  Ví dụ sai
                </label>
                <textarea
                  value={formData.incorrectExample}
                  onChange={(e) => setFormData({ ...formData, incorrectExample: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-zinc-700 dark:text-zinc-300">
                Active
              </label>
            </div>

            {/* Save Button */}
            <Button
              variant={hasUnsavedChanges ? "primary" : "secondary"}
              className="w-full"
              onClick={handleSubmit}
            >
              <Save className="w-4 h-4 mr-2" />
              {hasUnsavedChanges ? "Lưu thay đổi" : "Lưu Rule"}
            </Button>
          </div>
        ) : (
          /* Live Test Tab */
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                <FileJson className="w-3 h-3 inline mr-1" />
                Nhập nội dung giáo án
              </label>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Paste đoạn giáo án để test rule matching..."
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="success"
                className="flex-1"
                onClick={handleTest}
                disabled={!testText.trim() || isTesting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run Test
                  </>
                )}
              </Button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className="space-y-4">
                {/* Workflow Steps */}
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Workflow
                    </h4>
                  </div>
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {testResult.workflow.map((step, i) => (
                      <div key={i} className="px-3 py-2 flex items-center gap-3">
                        {step.status === "completed" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        {step.status === "running" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                        {step.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-zinc-300" />}
                        {step.status === "failed" && <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">{step.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detected Section */}
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Section nhận diện</span>
                  <Badge variant="info">{testResult.detectedSection}</Badge>
                </div>

                {/* Detected Aliases */}
                {testResult.detectedAliases.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                      Aliases detected
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {testResult.detectedAliases.map((alias, i) => (
                        <span key={i} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono">
                          {alias}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Rules */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Rules matched
                  </label>
                  <div className="space-y-2">
                    {testResult.matchedRules.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{r.rule}</span>
                          {r.alias && (
                            <span className="ml-2 text-xs text-zinc-400 font-mono">@{r.alias}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${r.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 w-10 text-right">
                            {Math.round(r.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Payload */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                    <Code className="w-3 h-3 inline mr-1" />
                    AI Payload
                  </label>
                  <pre className="p-3 bg-zinc-900 dark:bg-zinc-950 text-zinc-100 text-xs font-mono rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(testResult.aiPayload, null, 2)}
                  </pre>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span className="text-xs text-zinc-500">Time</span>
                    </div>
                    <span className="text-sm font-semibold">{testResult.executionTime ? `${testResult.executionTime}ms` : "-"}</span>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Hash className="w-3 h-3 text-zinc-400" />
                      <span className="text-xs text-zinc-500">Tokens</span>
                    </div>
                    <span className="text-sm font-semibold">{testResult.tokens || "-"}</span>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3 text-zinc-400" />
                      <span className="text-xs text-zinc-500">Cost</span>
                    </div>
                    <span className="text-sm font-semibold">${testResult.estimatedCost?.toFixed(4) || "-"}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Score</span>
                    <p className="text-xs text-zinc-500">Đánh giá tổng thể</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{testResult.score}</span>
                    <span className="text-sm text-zinc-400">/100</span>
                  </div>
                </div>

                {/* Annotations */}
                {testResult.annotations && testResult.annotations.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Annotations ({testResult.annotations.length})
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {testResult.annotations.slice(0, 10).map((ann: any, i: number) => (
                        <div key={i} className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="warning" className="text-[10px]">{ann.severity}</Badge>
                            <span className="text-xs text-zinc-500">{ann.type}</span>
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300">{ann.message}</p>
                          {ann.suggestion && (
                            <p className="text-xs text-blue-600 mt-1">→ {ann.suggestion}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {testResult.suggestions && testResult.suggestions.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      Suggestions ({testResult.suggestions.length})
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {testResult.suggestions.slice(0, 10).map((sug: any, i: number) => (
                        <div key={i} className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-zinc-700 dark:text-zinc-300">{sug.instructions || sug.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Debug Mode */}
                {debugMode && testResult.debug && (
                  <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden mt-4">
                    <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800">
                      <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
                        <Code className="w-3 h-3 inline mr-1" />
                        Debug Mode - Raw API Response
                      </h4>
                    </div>
                    <div className="divide-y divide-red-200 dark:divide-red-800">
                      {/* Parse Output */}
                      {testResult.debug.parse && (
                        <div className="p-3">
                          <details className="group">
                            <summary className="text-xs font-medium text-zinc-500 cursor-pointer hover:text-zinc-700">
                              Parse Output ({testResult.debug.parse.sections?.length || 0} sections)
                            </summary>
                            <pre className="mt-2 p-2 bg-zinc-900 dark:bg-zinc-950 text-zinc-100 text-xs font-mono rounded overflow-x-auto max-h-40">
                              {JSON.stringify(testResult.debug.parse, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}

                      {/* Validation Output */}
                      {testResult.debug.validation && (
                        <div className="p-3">
                          <details className="group">
                            <summary className="text-xs font-medium text-zinc-500 cursor-pointer hover:text-zinc-700">
                              Validation ({testResult.debug.validation.structureIssues?.length || 0} structure, {testResult.debug.validation.contentIssues?.length || 0} content)
                            </summary>
                            <pre className="mt-2 p-2 bg-zinc-900 dark:bg-zinc-950 text-zinc-100 text-xs font-mono rounded overflow-x-auto max-h-40">
                              {JSON.stringify(testResult.debug.validation, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}

                      {/* Fixes Output */}
                      {testResult.debug.fixes && (
                        <div className="p-3">
                          <details className="group">
                            <summary className="text-xs font-medium text-zinc-500 cursor-pointer hover:text-zinc-700">
                              Fixes ({testResult.debug.fixes.appliedFixes?.length || 0} applied, {testResult.debug.fixes.rejectedFixes?.length || 0} suggested)
                            </summary>
                            <pre className="mt-2 p-2 bg-zinc-900 dark:bg-zinc-950 text-zinc-100 text-xs font-mono rounded overflow-x-auto max-h-40">
                              {JSON.stringify(testResult.debug.fixes, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}

                      {/* Score Output */}
                      {testResult.debug.score && (
                        <div className="p-3">
                          <details className="group">
                            <summary className="text-xs font-medium text-zinc-500 cursor-pointer hover:text-zinc-700">
                              Score Report ({testResult.debug.score.totalScore}/{testResult.debug.score.maxScore})
                            </summary>
                            <pre className="mt-2 p-2 bg-zinc-900 dark:bg-zinc-950 text-zinc-100 text-xs font-mono rounded overflow-x-auto max-h-40">
                              {JSON.stringify(testResult.debug.score, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent open={showPreview} onClose={() => setShowPreview(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rule Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-zinc-500 uppercase">Title</span>
                <p className="font-medium">{formData.title}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase">Section Type</span>
                <p className="font-medium">{formData.sectionType}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase">Priority</span>
                <p className="font-mono">{formData.priority}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase">Weight</span>
                <p className="font-mono">{formData.weight}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase">Requirements</span>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{formData.requirements}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase">AI Prompt</span>
              <pre className="mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                {formData.aiPrompt}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Main Page
export default function SectionRulesPage() {
  const [rules, setRules] = useState<SectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<SectionRule | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<LiveTestResult | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  // Resize handler
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.min(Math.max(e.clientX - 240, 280), 500);
        setLeftPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/section-rules?hierarchy=true");
      const data = await res.json();
      if (data.success) {
        setRules(data.data);
        // Auto expand first few nodes
        if (data.data.length > 0) {
          const firstRule = data.data[0];
          setExpandedNodes(new Set([firstRule.id]));
        }
      }
    } catch (error) {
      console.error("Error fetching rules:", error);
      toast.error("Lỗi khi tải rules");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSaveRule = async (formData: RuleFormData) => {
    try {
      const method = selectedRule?.id ? "PUT" : "POST";
      const body = selectedRule?.id ? { ...formData, id: selectedRule.id } : formData;

      const res = await fetch("/api/admin/section-rules", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Lưu rule thành công");
        fetchRules();
      } else {
        toast.error(data.message || "Lỗi khi lưu");
      }
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error("Lỗi khi lưu rule");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa rule này?")) return;

    try {
      const res = await fetch(`/api/admin/section-rules/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Xóa rule thành công");
        setSelectedRule(null);
        fetchRules();
      } else {
        toast.error(data.message || "Lỗi khi xóa");
      }
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Lỗi khi xóa rule");
    }
  };

  // Real API-based Live Test
  const handleTest = async (text: string) => {
    setIsTesting(true);
    setTestResult(null);

    const startTime = Date.now();

    // Initialize workflow steps
    setTestResult({
      detectedSection: "",
      detectedAliases: [],
      matchedRules: [],
      aiPayload: { text, sectionType: "", rules: [], aliases: [] },
      aiResponse: "",
      score: 0,
      workflow: [
        { step: "Parser", status: "running" as const, message: "Đang phân tích văn bản...", time: 0 },
        { step: "Section Detection", status: "pending" as const, message: "Chờ xử lý...", time: 0 },
        { step: "Knowledge Mapping", status: "pending" as const, message: "Chờ xử lý...", time: 0 },
        { step: "Review Context", status: "pending" as const, message: "Chờ xử lý...", time: 0 },
        { step: "AI Review", status: "pending" as const, message: "Chờ xử lý...", time: 0 },
        { step: "Fix Generation", status: "pending" as const, message: "Chờ xử lý...", time: 0 },
        { step: "Scoring", status: "pending" as const, message: "Chờ xử lý...", time: 0 },
      ],
    });

    try {
      // Call the real Rule Engine API
      const res = await fetch("/api/rule-engine/v2/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          config: {
            skipStructureValidation: false,
            skipContentReview: false,
            aiModel: getDefaultModel().id,
          },
        }),
      });

      const response = await res.json();
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      if (!response.success) {
        setTestResult(prev => prev ? {
          ...prev,
          workflow: prev.workflow.map(w => ({ ...w, status: "failed" as const, message: `Lỗi: ${response.message}` })),
        } : null);
        setIsTesting(false);
        toast.error(response.message || "Lỗi khi chạy Rule Engine");
        return;
      }

      const data = response.data;

      // Update workflow with real results
      setTestResult({
        detectedSection: data.parse?.sections?.[0]?.code || "UNKNOWN",
        detectedAliases: data.parse?.sections?.[0]?.aliases || [],
        matchedRules: data.parse?.sections?.map((s: any) => ({
          rule: s.name,
          alias: s.code?.toLowerCase().replace(/_/g, "-"),
          confidence: s.confidence || 0,
        })) || [],
        aiPayload: {
          text: text.slice(0, 200) + (text.length > 200 ? "..." : ""),
          sectionType: data.parse?.sections?.[0]?.code || "",
          rules: data.parse?.sections?.map((s: any) => s.name) || [],
          aliases: data.parse?.sections?.map((s: any) => s.code?.toLowerCase().replace(/_/g, "-")) || [],
        },
        aiResponse: JSON.stringify({
          issues: data.validation?.issues?.slice(0, 5) || [],
          fixes: data.fixes?.fixes?.slice(0, 5) || [],
        }, null, 2),
        score: data.score?.total || 0,
        workflow: [
          {
            step: "Parser",
            status: "completed" as const,
            message: `Đã parse ${data.parse?.sectionsFound || 0} sections`,
            time: data.metrics?.parseTime || 0,
          },
          {
            step: "Section Detection",
            status: "completed" as const,
            message: `Confidence: ${Math.round((data.parse?.sections?.[0]?.confidence || 0) * 100)}%`,
            time: 0,
          },
          {
            step: "Knowledge Mapping",
            status: "completed" as const,
            message: `Mapped ${data.parse?.sectionsFound || 0} knowledge items`,
            time: 0,
          },
          {
            step: "Review Context",
            status: "completed" as const,
            message: `Validation: ${data.validation?.structureIssues?.length + data.validation?.contentIssues?.length || 0} issues`,
            time: data.metrics?.validationTime || 0,
          },
          {
            step: "AI Review",
            status: "completed" as const,
            message: `AI calls: ${data.metrics?.totalAiCalls || 0}`,
            time: data.metrics?.validationTime || 0,
          },
          {
            step: "Fix Generation",
            status: "completed" as const,
            message: `${data.fixes?.applied || 0} applied, ${data.fixes?.suggested || 0} suggested`,
            time: data.metrics?.fixTime || 0,
          },
          {
            step: "Scoring",
            status: "completed" as const,
            message: `Score: ${data.score?.total || 0}/${data.score?.max || 100}`,
            time: 0,
          },
        ],
        executionTime: totalTime,
        tokens: data.metrics?.totalAiCalls ? data.metrics.totalAiCalls * 1000 : 0, // Estimate
        estimatedCost: data.metrics?.totalAiCalls ? data.metrics.totalAiCalls * 0.001 : 0, // Estimate
        annotations: data.validation?.issues || [],
        suggestions: data.fixes?.fixes || [],
        debug: {
          parse: data.parse,
          validation: data.validation,
          fixes: data.fixes,
          score: data.score,
        },
      });

    } catch (error) {
      console.error("Error running rule engine:", error);
      setTestResult(prev => prev ? {
        ...prev,
        workflow: prev.workflow.map(w => ({ ...w, status: "failed" as const, message: `Lỗi: ${error instanceof Error ? error.message : "Unknown error"}` })),
      } : null);
      toast.error("Lỗi khi chạy Rule Engine");
    } finally {
      setIsTesting(false);
    }
  };

  // Filter rules with search
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const matchesSearch = !searchQuery ||
        rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rule as any).alias?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || rule.sectionType === filterType;
      return matchesSearch && matchesType;
    });
  }, [rules, searchQuery, filterType]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: rules.length,
      objective: rules.filter((r) => r.sectionType === "OBJECTIVE").length,
      warmup: rules.filter((r) => r.sectionType === "WARMUP").length,
      knowledge: rules.filter((r) => r.sectionType === "KNOWLEDGE").length,
      practice: rules.filter((r) => r.sectionType === "PRACTICE").length,
      application: rules.filter((r) => r.sectionType === "APPLICATION").length,
    };
  }, [rules]);

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(false)}>
                <PanelLeftOpen className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Rule Engine</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Quản lý rules cho giáo án</p>
            </div>
          </div>

          {/* Stats - Compact */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <span className="text-xs text-zinc-500">Tổng:</span>
              <span className="text-xs font-semibold">{stats.total}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{stats.objective}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 dark:bg-orange-950/50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">{stats.warmup}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{stats.knowledge}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-violet-50 dark:bg-violet-950/50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span className="text-xs font-medium text-violet-700 dark:text-violet-300">{stats.practice}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 dark:bg-rose-950/50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-xs font-medium text-rose-700 dark:text-rose-300">{stats.application}</span>
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={() => setSelectedRule(null as any)}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Thêm Rule</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Rule Tree */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: leftPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full bg-white dark:bg-zinc-900 overflow-hidden flex flex-col relative"
              style={{ minWidth: 280, maxWidth: 500 }}
            >
              {/* Resize Handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-10"
                onMouseDown={handleMouseDown}
              />

              <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-400" />
                  <h2 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Rule Tree</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(true)}>
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </div>

              {/* Filters */}
              <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Lọc theo type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả types</SelectItem>
                    <SelectItem value="OBJECTIVE">🎯 Mục tiêu</SelectItem>
                    <SelectItem value="WARMUP">🔥 Khởi động</SelectItem>
                    <SelectItem value="KNOWLEDGE">💡 Kiến thức</SelectItem>
                    <SelectItem value="PRACTICE">✏️ Luyện tập</SelectItem>
                    <SelectItem value="APPLICATION">🚀 Vận dụng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tree */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {loading ? (
                    <div className="space-y-2">
                      {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : filteredRules.length === 0 ? (
                    <div className="text-center py-12">
                      <Target className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                      <p className="text-sm text-zinc-500">Không tìm thấy rule nào</p>
                    </div>
                  ) : (
                    filteredRules.map((rule) => (
                      <RuleTreeNode
                        key={rule.id}
                        rule={rule}
                        level={0}
                        expandedNodes={expandedNodes}
                        onToggle={handleToggle}
                        selectedRule={selectedRule}
                        onSelect={setSelectedRule}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Footer Stats */}
              <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 text-center">
                {filteredRules.length} / {rules.length} rules
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Panel - Rule Editor */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
          <RuleEditorPanel
            rule={selectedRule}
            onSave={handleSaveRule}
            onDelete={handleDeleteRule}
            onTest={handleTest}
            isTesting={isTesting}
            testResult={testResult}
          />
        </div>
      </div>
    </div>
  );
}
