'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  EvaluationPolicyConfig,
  SectionCriteriaConfig,
  SavedPolicyProfile,
  DEFAULT_EVALUATION_POLICY,
  POLICY_CV5512_STANDARD,
  POLICY_CV2345_TIEU_HOC,
  POLICY_TIENG_VIET_NGU_DIEU,
  POLICY_4_ACTIVITIES,
  POLICY_OBJECTIVES_ONLY,
  BUILT_IN_POLICY_PROFILES,
  DispatchType,
  loadSavedProfiles,
  saveProfilesToStorage,
  saveActivePolicyToStorage,
  loadPolicyForDispatch,
  savePolicyForDispatch,
  getActiveDispatchType,
  setActiveDispatchType,
  downloadPolicyJsonFile,
  validateAndParsePolicyJson,
} from '@/types/section-config';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Download,
  Upload,
  Save,
  Copy,
  Volume2,
  FolderOpen,
  FileCheck2,
  Scale,
  Bookmark,
  Check,
  GraduationCap,
  School,
} from 'lucide-react';

interface EvaluationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyConfig: EvaluationPolicyConfig;
  onSavePolicy: (newPolicy: EvaluationPolicyConfig, shouldReanalyze?: boolean) => void;
  detectedSectionsSummary?: Array<{
    key: string;
    title: string;
    isDetected: boolean;
    paragraphCount: number;
    activityCount: number;
    startPage: number;
    endPage: number;
  }>;
  hasDocument: boolean;
}

export default function EvaluationConfigModal({
  isOpen,
  onClose,
  policyConfig,
  onSavePolicy,
  detectedSectionsSummary = [],
  hasDocument,
}: EvaluationConfigModalProps) {
  // Working configuration draft
  const [config, setConfig] = useState<EvaluationPolicyConfig>(() => ({
    ...policyConfig,
    sections: policyConfig.sections.map((s) => ({
      ...s,
      criteriaChecklist: [...s.criteriaChecklist],
    })),
  }));

  // Profiles list loaded from storage
  const [profiles, setProfiles] = useState<SavedPolicyProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('profile_cv5512_standard');

  // UI States
  const [expandedSectionKey, setExpandedSectionKey] = useState<string | null>(null);
  const [newCriterionText, setNewCriterionText] = useState<{ [key: string]: string }>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modal dialog for "Save as new profile"
  const [showSaveProfileModal, setShowSaveProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');

  // Dialog for "Add new custom section"
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionLabel, setNewSectionLabel] = useState('');
  const [newSectionWeight, setNewSectionWeight] = useState(15);
  const [newSectionDesc, setNewSectionDesc] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when opened or policyConfig changes
  useEffect(() => {
    if (isOpen) {
      setConfig({
        ...policyConfig,
        sections: policyConfig.sections.map((s) => ({
          ...s,
          criteriaChecklist: [...s.criteriaChecklist],
        })),
      });
      const loaded = loadSavedProfiles();
      setProfiles(loaded);

      // Try matching active policy to a profile
      const matched = loaded.find((p) => p.policy.policyId === policyConfig.policyId);
      if (matched) {
        setSelectedProfileId(matched.id);
      } else {
        setSelectedProfileId(policyConfig.dispatchType === 'CV_2345' ? 'profile_cv2345_tieuhoc' : 'profile_cv5512_standard');
      }
    }
  }, [isOpen, policyConfig]);

  if (!isOpen) return null;

  const totalEnabledWeight = config.sections
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.weight, 0);

  const enabledCount = config.sections.filter((s) => s.enabled).length;

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // 1. Switch Dispatch (CV 5512 vs CV 2345)
  const handleSwitchDispatch = (type: 'CV_5512' | 'CV_2345') => {
    // Auto-save draft of current dispatch if applicable
    if (config.dispatchType === 'CV_5512' || config.dispatchType === 'CV_2345') {
      savePolicyForDispatch(config.dispatchType, config);
    }

    const targetPolicy = loadPolicyForDispatch(type);
    setConfig({
      ...targetPolicy,
      sections: targetPolicy.sections.map((s) => ({
        ...s,
        criteriaChecklist: [...s.criteriaChecklist],
      })),
    });
    setActiveDispatchType(type);
    setSelectedProfileId(type === 'CV_2345' ? 'profile_cv2345_tieuhoc' : 'profile_cv5512_standard');
    showToast(
      `Đã chuyển sang khung thẩm định: ${type === 'CV_2345' ? 'Công văn 2345 (Tiểu học)' : 'Công văn 5512 (THCS & THPT)'}`
    );
  };

  // 2. Reset to Official Dispatch Standard Preset
  const handleResetToDispatchStandard = (type: 'CV_5512' | 'CV_2345') => {
    const standard = type === 'CV_2345' ? POLICY_CV2345_TIEU_HOC : POLICY_CV5512_STANDARD;
    setConfig({
      ...standard,
      sections: standard.sections.map((s) => ({
        ...s,
        criteriaChecklist: [...s.criteriaChecklist],
      })),
    });
    savePolicyForDispatch(type, standard);
    showToast(
      `Đã khôi phục về cấu hình gốc chuẩn của ${type === 'CV_2345' ? 'Công văn 2345 (Cấp Tiểu học)' : 'Công văn 5512 (THCS & THPT)'}`
    );
  };

  // 3. Save Dedicated Dispatch Config
  const handleSaveDispatchConfig = (type: 'CV_5512' | 'CV_2345') => {
    savePolicyForDispatch(type, config);
    saveActivePolicyToStorage(config);
    showToast(
      `Đã lưu riêng cấu hình tùy chỉnh cho ${type === 'CV_2345' ? 'Công văn 2345' : 'Công văn 5512'}!`
    );
  };

  // 4. Toggle Section Enable/Disable
  const handleToggleSection = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)),
    }));
  };

  // 5. Weight Adjustment
  const handleWeightChange = (key: string, weight: number) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.key === key ? { ...s, weight: Math.max(1, weight) } : s)),
    }));
  };

  // 6. Prompt Instruction Change
  const handlePromptChange = (key: string, prompt: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.key === key ? { ...s, promptInstructions: prompt } : s)),
    }));
  };

  // 7. Criteria Management
  const handleRemoveCriterion = (sectionKey: string, index: number) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.key !== sectionKey) return s;
        const updated = [...s.criteriaChecklist];
        updated.splice(index, 1);
        return { ...s, criteriaChecklist: updated };
      }),
    }));
  };

  const handleAddCriterion = (sectionKey: string) => {
    const text = (newCriterionText[sectionKey] || '').trim();
    if (!text) return;

    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.key !== sectionKey) return s;
        return { ...s, criteriaChecklist: [...s.criteriaChecklist, text] };
      }),
    }));

    setNewCriterionText((prev) => ({ ...prev, [sectionKey]: '' }));
  };

  // 8. Delete Section
  const handleDeleteSection = (key: string) => {
    if (config.sections.length <= 1) {
      alert('Cần giữ lại ít nhất 1 phần đánh giá.');
      return;
    }
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.key !== key),
    }));
    showToast('Đã xóa phần đánh giá');
  };

  // 9. Auto-balance weights to 100 points
  const handleAutoBalanceWeights = () => {
    const enabled = config.sections.filter((s) => s.enabled);
    if (enabled.length === 0) return;

    const baseWeight = Math.floor(100 / enabled.length);
    const remainder = 100 - baseWeight * enabled.length;

    let remainderGiven = 0;
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (!s.enabled) return s;
        const bonus = remainderGiven < remainder ? 1 : 0;
        remainderGiven++;
        return { ...s, weight: baseWeight + bonus };
      }),
    }));
    showToast('Đã tự động cân bằng tổng điểm các phần về đúng 100đ');
  };

  // 10. Add Custom Section
  const handleAddCustomSection = () => {
    if (!newSectionTitle.trim()) return;

    const randomId = Math.random().toString(36).substring(2, 7);
    const key = `custom_${randomId}`;
    const newSection: SectionCriteriaConfig = {
      key,
      title: newSectionTitle.trim(),
      shortLabel: (newSectionLabel.trim() || newSectionTitle.trim()).substring(0, 20),
      enabled: true,
      weight: Math.max(1, newSectionWeight),
      description: newSectionDesc.trim() || 'Phần đánh giá bổ sung tùy chỉnh',
      criteriaChecklist: [
        'Đáp ứng đúng mục tiêu và yêu cầu sư phạm của phần này',
        'Có sản phẩm học tập hoặc kết quả cụ thể đo lường được',
      ],
      promptInstructions: `Thẩm định chuyên sâu phần "${newSectionTitle.trim()}". Bám sát các tiêu chí được giao và phát hiện lỗi sư phạm cụ thể.`,
      strictCv5512: false,
    };

    setConfig((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    setExpandedSectionKey(key);
    setShowAddSectionModal(false);
    setNewSectionTitle('');
    setNewSectionLabel('');
    setNewSectionDesc('');
    showToast(`Đã thêm phần đánh giá mới: "${newSection.title}"`);
  };

  // 11. Apply Preset from Profiles
  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    const found = profiles.find((p) => p.id === profileId);
    if (found) {
      setConfig({
        ...found.policy,
        sections: found.policy.sections.map((s) => ({
          ...s,
          criteriaChecklist: [...s.criteriaChecklist],
        })),
      });
      showToast(`Đã chuyển sang mẫu: "${found.name}"`);
    }
  };

  // 12. Save as New Named Profile
  const handleSaveAsNewProfile = () => {
    if (!newProfileName.trim()) return;

    const newProfile: SavedPolicyProfile = {
      id: `profile_custom_${Date.now()}`,
      name: newProfileName.trim(),
      description: newProfileDesc.trim() || 'Cấu hình tiêu chí do Thầy/Cô tùy chỉnh và lưu lại',
      dispatchType: config.dispatchType || 'CV_5512',
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      policy: {
        ...config,
        policyId: `policy_custom_${Date.now()}`,
        name: newProfileName.trim(),
        description: newProfileDesc.trim() || config.description,
        updatedAt: new Date().toISOString(),
      },
    };

    const updatedProfiles = [...profiles, newProfile];
    setProfiles(updatedProfiles);
    saveProfilesToStorage(updatedProfiles);
    setSelectedProfileId(newProfile.id);

    setShowSaveProfileModal(false);
    setNewProfileName('');
    setNewProfileDesc('');
    showToast(`Đã lưu thành công cấu hình mẫu mới: "${newProfile.name}"!`);
  };

  // 13. Update Current Profile
  const handleUpdateCurrentProfile = () => {
    const current = profiles.find((p) => p.id === selectedProfileId);
    if (!current) return;

    if (current.isBuiltIn) {
      setNewProfileName(`${current.name} (Tùy chỉnh cá nhân)`);
      setNewProfileDesc(current.description);
      setShowSaveProfileModal(true);
      return;
    }

    const updatedProfiles = profiles.map((p) =>
      p.id === selectedProfileId
        ? {
            ...p,
            updatedAt: new Date().toISOString(),
            policy: {
              ...config,
              updatedAt: new Date().toISOString(),
            },
          }
        : p
    );

    setProfiles(updatedProfiles);
    saveProfilesToStorage(updatedProfiles);
    showToast(`Đã cập nhật thay đổi vào cấu hình "${current.name}"`);
  };

  // 14. Delete Custom Profile
  const handleDeleteProfile = (profileId: string) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target || target.isBuiltIn) return;

    if (!confirm(`Thầy/Cô có chắc chắn muốn xóa mẫu cấu hình "${target.name}"?`)) return;

    const filtered = profiles.filter((p) => p.id !== profileId);
    setProfiles(filtered);
    saveProfilesToStorage(filtered);
    handleSelectProfile('profile_cv5512_standard');
    showToast(`Đã xóa cấu hình "${target.name}"`);
  };

  // 15. Export JSON File
  const handleExportJson = () => {
    downloadPolicyJsonFile(config);
    showToast('Đã tải xuống file cấu hình JSON thành công!');
  };

  // 16. Import JSON File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsedPolicy = validateAndParsePolicyJson(content);
      if (parsedPolicy) {
        setConfig(parsedPolicy);

        const importedProfile: SavedPolicyProfile = {
          id: `profile_imported_${Date.now()}`,
          name: parsedPolicy.name || `Cấu hình nhập từ file (${file.name.replace('.json', '')})`,
          description: parsedPolicy.description || 'Được nhập từ file cấu hình ngoài',
          dispatchType: parsedPolicy.dispatchType || 'CV_5512',
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          policy: parsedPolicy,
        };

        const updated = [...profiles, importedProfile];
        setProfiles(updated);
        saveProfilesToStorage(updated);
        setSelectedProfileId(importedProfile.id);

        showToast(`Đã nhập thành công cấu hình từ file "${file.name}"!`);
      } else {
        alert('File JSON không đúng cấu trúc cấu hình đánh giá KHBD.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 17. Apply & Save
  const handleSaveAndApply = (shouldReanalyze: boolean = true) => {
    if (config.dispatchType === 'CV_5512' || config.dispatchType === 'CV_2345') {
      savePolicyForDispatch(config.dispatchType, config);
      setActiveDispatchType(config.dispatchType);
    }
    saveActivePolicyToStorage(config);
    onSavePolicy(config, shouldReanalyze);
    onClose();
  };

  const isCV2345 = config.dispatchType === 'CV_2345';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[94vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Hidden File Input for JSON import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
        />

        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex items-center justify-between border-b border-indigo-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Trung Tâm Cấu Hình Đánh Giá Kế Hoạch Bài Dạy
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  isCV2345
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40'
                    : 'bg-blue-500/25 text-blue-300 border-blue-400/40'
                }`}>
                  {isCV2345 ? 'Chuẩn CV 2345 (Tiểu Học)' : 'Chuẩn CV 5512 (THCS & THPT)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Cấu hình đánh giá riêng biệt theo từng Công văn, thẩm định đa trang chuẩn xác và lưu trữ linh hoạt.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DUAL DISPATCH SELECTION BAR (CÔNG VĂN 5512 vs CÔNG VĂN 2345) */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">Khung thẩm định chuẩn:</span>
            <div className="inline-flex rounded-xl p-1 bg-slate-200/90 border border-slate-300 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSwitchDispatch('CV_5512')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                  !isCV2345
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Công văn 5512 (THCS & THPT)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchDispatch('CV_2345')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                  isCV2345
                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
                }`}
              >
                <School className="w-4 h-4" />
                <span>Công văn 2345 (Tiểu học)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleResetToDispatchStandard(isCV2345 ? 'CV_2345' : 'CV_5512')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
              title="Khôi phục lại toàn bộ tiêu chuẩn gốc ban hành của công văn này"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Khôi phục chuẩn gốc {isCV2345 ? '2345' : '5512'}</span>
            </button>
            <button
              onClick={() => handleSaveDispatchConfig(isCV2345 ? 'CV_2345' : 'CV_5512')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 transition-colors shadow-2xs"
              title="Lưu lại cấu hình tùy chỉnh riêng của công văn này vào bộ nhớ trình duyệt"
            >
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lưu riêng cấu hình {isCV2345 ? 'CV 2345' : 'CV 5512'}</span>
            </button>
          </div>
        </div>

        {/* Profile Switcher & Actions Toolbar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Profile Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              Mẫu nâng cao:
            </span>
            <select
              value={selectedProfileId}
              onChange={(e) => handleSelectProfile(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-800 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-w-[280px]"
            >
              <optgroup label="✨ Mẫu Chuẩn Có Sẵn">
                {profiles
                  .filter((p) => p.isBuiltIn)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
              {profiles.some((p) => !p.isBuiltIn) && (
                <optgroup label="💾 Cấu Hình Thầy/Cô Đã Lưu">
                  {profiles
                    .filter((p) => !p.isBuiltIn)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>

            <button
              onClick={() => {
                setNewProfileName(`${config.name} (Bản lưu mới)`);
                setNewProfileDesc(config.description);
                setShowSaveProfileModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold transition-colors"
              title="Lưu cấu hình hiện tại thành hồ sơ mẫu mới để tái sử dụng"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thành mẫu mới</span>
            </button>

            <button
              onClick={handleUpdateCurrentProfile}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium transition-colors"
              title="Cập nhật các chỉnh sửa vào mẫu đang chọn"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Ghi đè mẫu này</span>
            </button>

            {profiles.find((p) => p.id === selectedProfileId && !p.isBuiltIn) && (
              <button
                onClick={() => handleDeleteProfile(selectedProfileId)}
                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                title="Xóa mẫu cấu hình này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Import / Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-slate-300 hover:border-blue-300 font-semibold transition-colors shadow-2xs"
              title="Tải file cấu hình .json để lưu vào máy tính hoặc chia sẻ"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-300 hover:border-indigo-300 font-semibold transition-colors shadow-2xs"
              title="Nhập cấu hình từ file .json đã có"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập JSON</span>
            </button>
          </div>
        </div>

        {/* Global Options & Status Bar */}
        <div className="px-6 py-2 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Vietnamese Intonation & Tone Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none py-0.5 px-2 rounded-md hover:bg-blue-100/60 transition-colors">
              <input
                type="checkbox"
                checked={config.evaluateVietnameseIntonation ?? true}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    evaluateVietnameseIntonation: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                Thẩm định dấu ngữ điệu & chuẩn mực Tiếng Việt
              </span>
            </label>

            {/* Missing Section Warning Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none py-0.5 px-2 rounded-md hover:bg-blue-100/60 transition-colors">
              <input
                type="checkbox"
                checked={config.enableMissingSectionWarning}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    enableMissingSectionWarning: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-slate-700 font-medium">
                Cảnh báo khi thiếu các phần bắt buộc
              </span>
            </label>
          </div>

          {/* Points Balance & Add Section Action */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleAutoBalanceWeights}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 font-semibold text-slate-700 transition-colors shadow-2xs"
              title="Tự động phân bổ lại trọng số các phần đang bật sao cho vừa đúng 100 điểm"
            >
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>Cân bằng 100đ</span>
            </button>

            <button
              onClick={() => setShowAddSectionModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm phần mới</span>
            </button>

            <div
              className={`px-3 py-1 rounded-lg font-bold border ${
                totalEnabledWeight === 100
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              {enabledCount} phần bật • Tổng {totalEnabledWeight} / 100đ
            </div>
          </div>
        </div>

        {/* Status Toast Alert */}
        {statusMessage && (
          <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              {statusMessage}
            </span>
            <button onClick={() => setStatusMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Section List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
          {config.sections.map((section, sectionIdx) => {
            const isExpanded = expandedSectionKey === section.key;
            const detectedInfo = detectedSectionsSummary.find((s) => s.key === section.key);

            return (
              <div
                key={section.key}
                className={`rounded-xl border transition-all ${
                  section.enabled
                    ? 'bg-white border-slate-300 shadow-2xs'
                    : 'bg-slate-100/70 border-slate-200 opacity-65'
                }`}
              >
                {/* Section Header Card */}
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      id={`chk_${section.key}`}
                      checked={section.enabled}
                      onChange={() => handleToggleSection(String(section.key))}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label
                          htmlFor={`chk_${section.key}`}
                          className="font-bold text-sm text-slate-800 cursor-pointer select-none truncate"
                        >
                          {section.title}
                        </label>
                        {detectedInfo && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              detectedInfo.isDetected
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {detectedInfo.isDetected
                              ? `✓ Trang ${detectedInfo.startPage}-${detectedInfo.endPage} (${detectedInfo.paragraphCount} đoạn)`
                              : 'Chưa thấy trong bài'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Weight Input */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-600">Trọng số:</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        disabled={!section.enabled}
                        value={section.weight}
                        onChange={(e) =>
                          handleWeightChange(String(section.key), parseInt(e.target.value, 10) || 5)
                        }
                        className="w-12 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-center text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                      <span className="text-xs font-bold text-slate-700">đ</span>
                    </div>

                    <button
                      onClick={() =>
                        setExpandedSectionKey(isExpanded ? null : String(section.key))
                      }
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title={isExpanded ? 'Thu gọn' : 'Xem & chỉnh sửa chi tiết'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteSection(String(section.key))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa phần đánh giá này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Criteria Checklist & Prompt Instructions */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-4 text-xs bg-slate-50/50 rounded-b-xl">
                    {/* Criteria Checklist */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Tiêu chí thẩm định cụ thể ({section.criteriaChecklist.length} tiêu chí):
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Thầy/Cô có thể xóa bớt hoặc thêm tiêu chí riêng
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {section.criteriaChecklist.map((crit, critIdx) => (
                          <div
                            key={critIdx}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 group hover:border-blue-300 transition-colors"
                          >
                            <span className="text-slate-700 flex-1 leading-relaxed">
                              {crit}
                            </span>
                            <button
                              onClick={() => handleRemoveCriterion(String(section.key), critIdx)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                              title="Xóa tiêu chí này"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add Criterion Input */}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={newCriterionText[String(section.key)] || ''}
                          onChange={(e) =>
                            setNewCriterionText((prev) => ({
                              ...prev,
                              [String(section.key)]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCriterion(String(section.key));
                            }
                          }}
                          placeholder="Nhập thêm tiêu chí đánh giá cho phần này rồi nhấn Thêm..."
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleAddCriterion(String(section.key))}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm</span>
                        </button>
                      </div>
                    </div>

                    {/* AI Prompt Instruction */}
                    <div>
                      <span className="font-bold text-slate-700 block mb-1">
                        Chỉ đạo sư phạm cho AI khi thẩm định phần này:
                      </span>
                      <textarea
                        rows={2}
                        value={section.promptInstructions}
                        onChange={(e) =>
                          handlePromptChange(String(section.key), e.target.value)
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {hasDocument ? (
              <span>Cấu hình sẽ được áp dụng trực tiếp lên giáo án đang mở.</span>
            ) : (
              <span>Cấu hình sẽ tự động lưu và dùng cho các lần tải giáo án tiếp theo.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Đóng
            </button>

            <button
              onClick={() => handleSaveAndApply(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
            >
              Chỉ Lưu Cấu Hình
            </button>

            <button
              onClick={() => handleSaveAndApply(true)}
              className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-md shadow-indigo-500/25 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Áp Dụng & Thẩm Định Ngay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submodal: Save New Profile Dialog */}
      {showSaveProfileModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-600" />
                Lưu Thành Mẫu Cấu Hình Mới
              </h4>
              <button
                onClick={() => setShowSaveProfileModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên mẫu cấu hình:
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Ví dụ: Chuẩn Tổ Toán THPT / Chuẩn Tiếng Việt Lớp 3..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả tóm tắt:
                </label>
                <textarea
                  rows={2}
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  placeholder="Ghi chú về mục đích sử dụng mẫu cấu hình này..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveProfileModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveAsNewProfile}
                disabled={!newProfileName.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-sm"
              >
                Lưu mẫu này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submodal: Add New Section */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Thêm Phần Đánh Giá Mới
              </h4>
              <button
                onClick={() => setShowAddSectionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên phần đánh giá:
                </label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Ví dụ: Hoạt động Trải nghiệm / Dự án STEM..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nhãn ngắn gọn:
                  </label>
                  <input
                    type="text"
                    value={newSectionLabel}
                    onChange={(e) => setNewSectionLabel(e.target.value)}
                    placeholder="Ví dụ: HĐ STEM"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Trọng số điểm:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newSectionWeight}
                    onChange={(e) => setNewSectionWeight(parseInt(e.target.value, 10) || 10)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả tóm tắt:
                </label>
                <input
                  type="text"
                  value={newSectionDesc}
                  onChange={(e) => setNewSectionDesc(e.target.value)}
                  placeholder="Mục đích của phần đánh giá này..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddSectionModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleAddCustomSection}
                disabled={!newSectionTitle.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-sm"
              >
                Thêm phần này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
