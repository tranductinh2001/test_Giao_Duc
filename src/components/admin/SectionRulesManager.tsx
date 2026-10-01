"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight, AlertCircle, Layers, Globe, Link2 } from "lucide-react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import toast from "react-hot-toast";

interface Circular {
  id: string;
  code: string;
  title: string;
  type: string;
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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string; email: string };
  circular?: Circular | null;
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  HEADER: "Thong tin chung",
  OBJECTIVES: "Muc tieu",
  PREPARATION: "Chuan bi",
  TEACHING_EQUIPMENT: "Thiet bi day hoc",
  LEARNING_MATERIALS: "Hoc lieu",
  WARM_UP: "Khoi dong",
  KNOWLEDGE_FORMATION: "Hinh thanh kien thuc",
  PRACTICE: "Luyen tap",
  APPLICATION: "Van dung",
  EVALUATION: "Danh gia",
  HOMEWORK: "Dan dong",
  TEACHING_PROCESS: "Tien trinh day hoc",
  APPENDIX: "Phu luc",
  OTHER: "Khac",
};

const SECTION_TYPES = Object.keys(SECTION_TYPE_LABELS);

const defaultForm = {
  sectionType: "OBJECTIVES",
  title: "",
  requirements: "",
  correctExample: "",
  incorrectExample: "",
  aiPrompt: "",
  priority: 0,
  weight: 1.0,
  level: 3,
  order: 0,
  circularId: null as string | null,
  parentId: null as string | null,
  isActive: true,
};

type FormData = typeof defaultForm;

type TabType = "all" | "global" | "circular";

export default function SectionRulesManager() {
  const [rules, setRules] = useState<SectionRule[]>([]);
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [circularFilter, setCircularFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sectionFilter !== "ALL") params.append("sectionType", sectionFilter);
      params.append("includeGlobal", "true");
      const res = await fetch(`/api/admin/section-rules?${params}`);
      const data = await res.json();
      if (data.success) setRules(data.data);
      else toast.error(data.message || "Loi khi tai rules");
    } catch {
      toast.error("Loi khi tai danh sach rules");
    } finally {
      setLoading(false);
    }
  }, [sectionFilter]);

  const fetchCirculars = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/circulars");
      const data = await res.json();
      if (data.success) setCirculars(data.data);
    } catch (error) {
      console.error("Error fetching circulars:", error);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchCirculars();
  }, [fetchRules, fetchCirculars]);

  // Filter rules by tab
  const filteredRules = rules.filter((rule) => {
    if (activeTab === "global") return rule.circularId === null;
    if (activeTab === "circular") return rule.circularId !== null;
    return true;
  }).filter((rule) => {
    if (circularFilter !== "ALL") return rule.circularId === circularFilter;
    return true;
  });

  const groupedRules = filteredRules.reduce<Record<string, SectionRule[]>>((acc, rule) => {
    if (!acc[rule.sectionType]) acc[rule.sectionType] = [];
    acc[rule.sectionType].push(rule);
    return acc;
  }, {});

  const sortedGroups = Object.entries(groupedRules).sort(
    ([a], [b]) => SECTION_TYPES.indexOf(a) - SECTION_TYPES.indexOf(b)
  );

  const filteredSearch = searchTerm
    ? filteredRules.filter((r) =>
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.requirements.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;

  const stats = {
    total: rules.length,
    global: rules.filter((r) => r.circularId === null).length,
    circular: rules.filter((r) => r.circularId !== null).length,
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEdit = (rule: SectionRule) => {
    setEditingId(rule.id);
    setForm({
      sectionType: rule.sectionType,
      title: rule.title,
      requirements: rule.requirements,
      correctExample: rule.correctExample || "",
      incorrectExample: rule.incorrectExample || "",
      aiPrompt: rule.aiPrompt,
      priority: rule.priority,
      weight: rule.weight,
      level: rule.level || 3,
      order: rule.order || 0,
      circularId: rule.circularId,
      parentId: rule.parentId || null,
      isActive: rule.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.requirements.trim() || !form.aiPrompt.trim()) {
      toast.error("Vui long nhap day du: Tieu de, Noi dung yeu cau, Prompt AI");
      return;
    }
    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/section-rules/${editingId}`
        : "/api/admin/section-rules";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? "Cap nhat rule thanh cong" : "Tao rule thanh cong");
        setShowModal(false);
        fetchRules();
      } else {
        toast.error(data.message || "Loi khi luu rule");
      }
    } catch {
      toast.error("Loi khi luu rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ban co chac muon xoa rule nay?")) return;
    try {
      const res = await fetch(`/api/admin/section-rules/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Da xoa rule");
        fetchRules();
      } else {
        toast.error(data.message || "Loi khi xoa");
      }
    } catch {
      toast.error("Loi khi xoa rule");
    }
  };

  const handleToggleActive = async (rule: SectionRule) => {
    try {
      const res = await fetch(`/api/admin/section-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(rule.isActive ? "Da tat rule" : "Da bat rule");
        fetchRules();
      }
    } catch {
      toast.error("Loi khi cap nhat");
    }
  };

  const displayRules = filteredSearch ?? filteredRules;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Quan ly Section Rules
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Xay dung bo yeu cau (Rule) theo tung phan giao an de AI phan tich
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="w-5 h-5 mr-2" />
          Them Rule moi
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Tong so Rules</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-globe transition-all" onClick={() => setActiveTab("global")}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${activeTab === "global" ? "bg-success/10" : "bg-muted"} flex items-center justify-center`}>
              <Globe className={`w-5 h-5 ${activeTab === "global" ? "text-success" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.global}</p>
              <p className="text-sm text-muted-foreground">Global Rules</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-link transition-all" onClick={() => setActiveTab("circular")}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${activeTab === "circular" ? "bg-info/10" : "bg-muted"} flex items-center justify-center`}>
              <Link2 className={`w-5 h-5 ${activeTab === "circular" ? "text-info" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.circular}</p>
              <p className="text-sm text-muted-foreground">Circular Rules</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Tat ca
        </button>
        <button
          onClick={() => setActiveTab("global")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "global"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="w-4 h-4" />
          Global
        </button>
        <button
          onClick={() => setActiveTab("circular")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "circular"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link2 className="w-4 h-4" />
          Theo Cong van
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tim theo tieu de hoac noi dung yeu cau..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
          <select
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); }}
            className="h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none min-w-[200px]"
          >
            <option value="ALL">Tat ca phan giao an</option>
            {SECTION_TYPES.map((st) => (
              <option key={st} value={st}>{SECTION_TYPE_LABELS[st]}</option>
            ))}
          </select>
          {activeTab === "circular" && (
            <select
              value={circularFilter}
              onChange={(e) => { setCircularFilter(e.target.value); }}
              className="h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none min-w-[200px]"
            >
              <option value="ALL">Tat ca Cong van</option>
              {circulars.map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayRules.length === 0 ? (
        <Card variant="flat" className="p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {searchTerm ? "Khong tim thay ket qua" : "Chua co Rule nao"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm
              ? "Thu thay doi tu khoa tim kiem"
              : "Tao Rule dau tien de AI co the phan tich giao an theo yeu cau cua ban"}
          </p>
          {!searchTerm && (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="w-5 h-5 mr-2" />
              Tao Rule dau tien
            </Button>
          )}
        </Card>
      ) : searchTerm ? (
        <div className="space-y-4">
          {displayRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              circulars={circulars}
              onEdit={() => openEdit(rule)}
              onDelete={() => handleDelete(rule.id)}
              onToggleActive={() => handleToggleActive(rule)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(([sectionType, sectionRules]) => (
            <div key={sectionType}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <h2 className="text-lg font-bold text-foreground px-4 py-1 bg-primary/5 border border-primary/20 rounded-full">
                  {SECTION_TYPE_LABELS[sectionType] || sectionType}
                </h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-4">
                {sectionRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    circulars={circulars}
                    onEdit={() => openEdit(rule)}
                    onDelete={() => handleDelete(rule.id)}
                    onToggleActive={() => handleToggleActive(rule)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-lifted w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                {editingId ? "Chinh sua Rule" : "Them Rule moi"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                X
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Circular Selection */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Cong van ap dung
                </label>
                <select
                  value={form.circularId || ""}
                  onChange={(e) => setForm({ ...form, circularId: e.target.value || null })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                >
                  <option value="">Global (Ap dung cho tat ca)</option>
                  {circulars.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Chon "Global" de ap dung cho tat ca cac giao an. Chon cong van cu the de chi ap dung cho cong van do.
                </p>
              </div>

              {/* Section Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Phan giao an <span className="text-destructive">*</span>
                </label>
                <select
                  value={form.sectionType}
                  onChange={(e) => setForm({ ...form, sectionType: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                >
                  {SECTION_TYPES.map((st) => (
                    <option key={st} value={st}>{SECTION_TYPE_LABELS[st] || st}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Tieu de <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Muc tieu phai co du 3 thanh phan"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Noi dung yeu cau <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  rows={3}
                  placeholder="Mo ta chi tiet yeu cau cho phan nay..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-y"
                />
              </div>

              {/* Correct / Incorrect Examples */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Vi du dung
                  </label>
                  <textarea
                    value={form.correctExample}
                    onChange={(e) => setForm({ ...form, correctExample: e.target.value })}
                    rows={3}
                    placeholder="Mo ta vi du dat yeu cau..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Vi du sai
                  </label>
                  <textarea
                    value={form.incorrectExample}
                    onChange={(e) => setForm({ ...form, incorrectExample: e.target.value })}
                    rows={3}
                    placeholder="Mo ta vi du khong dat yeu cau..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-y"
                  />
                </div>
              </div>

              {/* AI Prompt */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Prompt AI <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={form.aiPrompt}
                  onChange={(e) => setForm({ ...form, aiPrompt: e.target.value })}
                  rows={4}
                  placeholder="Huong dan AI cach phan tich va danh gia phan nay..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-y font-mono text-xs"
                />
              </div>

              {/* Priority, Weight, Level, Order */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Do uu tien
                  </label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Trong so diem
                  </label>
                  <input
                    type="number"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 1 })}
                    min={0}
                    max={10}
                    step={0.1}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Cap bac (Level)
                  </label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) })}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  >
                    <option value="1">1 - Muc lon</option>
                    <option value="2">2 - Muc nho</option>
                    <option value="3">3 - Section</option>
                    <option value="4">4 - Subsection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Thu tu
                  </label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Trang thai
                </label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                    form.isActive
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {form.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {form.isActive ? "Dang kich hoat" : "Da tat"}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Huy
              </Button>
              <Button variant="primary" onClick={handleSave} isLoading={saving}>
                {editingId ? "Cap nhat" : "Tao moi"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RuleCard({
  rule,
  circulars,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  rule: SectionRule;
  circulars: Circular[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const circular = rule.circularId ? circulars.find((c) => c.id === rule.circularId) : null;

  return (
    <Card variant="default" className={`p-5 ${!rule.isActive ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-bold text-foreground truncate">
              {rule.title}
            </h3>
            {/* Circular Badge */}
            {rule.circularId ? (
              <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded bg-info/10 text-info border border-info/20">
                {circular?.code || "Circular"}
              </span>
            ) : (
              <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded bg-success/10 text-success border border-success/20">
                Global
              </span>
            )}
            {rule.priority > 0 && (
              <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                P{rule.priority}
              </span>
            )}
            {rule.weight !== 1.0 && (
              <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-info/10 text-info border border-info/20">
                x{rule.weight}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {rule.requirements}
          </p>
          {rule.aiPrompt && (
            <details className="group">
              <summary className="text-xs text-primary font-semibold cursor-pointer hover:text-primary/80 transition-colors">
                Xem Prompt AI
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-muted text-xs text-foreground whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
                {rule.aiPrompt}
              </pre>
            </details>
          )}
          {(rule.correctExample || rule.incorrectExample) && (
            <details className="group mt-2">
              <summary className="text-xs text-muted-foreground font-semibold cursor-pointer hover:text-foreground transition-colors">
                Xem vi du
              </summary>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {rule.correctExample && (
                  <div className="p-2 rounded-lg bg-success/5 border border-success/20">
                    <p className="text-xs font-semibold text-success mb-1">Dung</p>
                    <p className="text-xs text-foreground">{rule.correctExample}</p>
                  </div>
                )}
                {rule.incorrectExample && (
                  <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-xs font-semibold text-destructive mb-1">Sai</p>
                    <p className="text-xs text-foreground">{rule.incorrectExample}</p>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggleActive}
            className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all ${
              rule.isActive
                ? "border-success/30 bg-success/10 text-success hover:bg-success/20"
                : "border-border bg-muted text-muted-foreground hover:bg-accent"
            }`}
            title={rule.isActive ? "Tat rule" : "Bat rule"}
          >
            {rule.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={onEdit}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
            title="Chinh sua"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
            title="Xoa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
