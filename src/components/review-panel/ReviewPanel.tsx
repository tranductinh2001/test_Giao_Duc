'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { DocumentIR } from '@/types/document';
import { Review, RubricEvaluation } from '@/types/review';
import { Annotation } from '@/types/annotation';
import { SemanticLabel } from '@/types/ai';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  Tag,
  Target,
  ArrowRight,
  Award,
  Layers,
  MessageSquare,
  Send,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  HelpCircle,
  X,
  BarChart3,
  CheckCheck,
  TrendingUp,
  FileCheck2,
  Clock,
  Users,
  Compass,
} from 'lucide-react';

export type ReviewPanelTab = 'rubric' | 'reviews' | 'chat' | 'semantics';

interface ReviewPanelProps {
  reviews: Review[];
  annotations: Annotation[];
  document: DocumentIR;
  semanticLabels?: SemanticLabel[];
  selectedAnnotation: Annotation | null;
  onReviewClick: (review: Review) => void;
  onAnnotationClick: (annotation: Annotation) => void;
  isLoading?: boolean;
  onRetry?: () => void;
  error?: string | null;
  onExport?: () => void;
  isExporting?: boolean;
  activeTab?: ReviewPanelTab;
  onTabChange?: (tab: ReviewPanelTab) => void;
  hoveredReviewId?: string | null;
  onHoverReview?: (reviewId: string | null) => void;
  chatContext?: { text: string; page: number; targetId: string; title?: string } | null;
  onClearChatContext?: () => void;
  onSelectContextForChat?: (context: { text: string; page: number; targetId: string; title?: string }) => void;
  rubricResult?: RubricEvaluation | null;
  totalScore?: number;
  maxTotalScore?: number;
  grade?: string;
  detectedSectionsSummary?: any[];
  sectionResults?: any[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Chào Thầy/Cô! Tôi là **Trợ Lý Sư Phạm AI**, sẵn sàng hỗ trợ Thầy/Cô thẩm định và nâng cấp Kế hoạch bài dạy theo chuẩn **Công văn 5512/BGDĐT**:
- 🎯 **Kiểm tra chuẩn hoá mục tiêu**: Năng lực đặc thù, năng lực chung và phẩm chất.
- 🔄 **Tối ưu tiến trình 4 hoạt động**: Khởi động, Khám phá, Luyện tập, Vận dụng.
- 👥 **Xây dựng 4 bước tổ chức dạy học**: Chuyển giao ➔ Thực hiện ➔ Thảo luận ➔ Kết luận.
- 📝 **Soạn phiếu bài tập, trò chơi & tiêu chí đánh giá (Rubric 100đ)**.

Thầy/Cô có thể bấm vào các gợi ý nhanh bên dưới hoặc nhấp vào bất kỳ đoạn nào trên trang PDF để cùng tôi hoàn thiện giáo án!`,
  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
};

const QUICK_PROMPTS = [
  '🎯 Mục tiêu bài này đã chuẩn CV 5512 chưa và cần sửa gì?',
  '🔄 Gợi ý hoạt động Khởi động sinh động trong 5 phút',
  '👥 Soạn lại Hoạt động Khám phá đủ 4 bước sư phạm chuẩn',
  '📝 Thiết kế phiếu học tập nhóm và bảng Rubric đánh giá',
  '⏱️ Tối ưu hóa thời lượng và tiến trình 45 phút',
];

export default function ReviewPanel({
  reviews,
  annotations,
  document,
  semanticLabels = [],
  selectedAnnotation,
  onReviewClick,
  onAnnotationClick,
  isLoading = false,
  onRetry,
  error = null,
  onExport,
  isExporting = false,
  activeTab: controlledTab,
  onTabChange,
  hoveredReviewId,
  onHoverReview,
  chatContext,
  onClearChatContext,
  onSelectContextForChat,
  rubricResult,
  totalScore: propTotalScore,
  maxTotalScore: propMaxTotalScore = 100,
  grade: propGrade,
  detectedSectionsSummary = [],
  sectionResults = [],
}: ReviewPanelProps) {
  const [internalTab, setInternalTab] = useState<ReviewPanelTab>('rubric');
  const activeTab = controlledTab ?? internalTab;

  const handleTabChange = (tab: ReviewPanelTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isChatLoading]);

  // Map reviewId to 1-based index (#1, #2, ...)
  const reviewIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    reviews.forEach((r, idx) => map.set(r.reviewId, idx + 1));
    return map;
  }, [reviews]);

  // Overall Rubric & Score Calculation
  const { effectiveScore, effectiveMaxScore, effectiveGrade, stats } = useMemo(() => {
    let criticalCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const r of reviews) {
      if (r.severity === 'CRITICAL') criticalCount++;
      else if (r.severity === 'ERROR') errorCount++;
      else if (r.severity === 'WARNING') warningCount++;
      else infoCount++;
    }

    const calculatedScore =
      typeof propTotalScore === 'number' && propTotalScore > 0
        ? propTotalScore
        : rubricResult?.totalScore ?? Math.max(100 - criticalCount * 15 - errorCount * 10 - warningCount * 5, 30);

    const calculatedMax = rubricResult?.maxTotalScore ?? propMaxTotalScore ?? 100;
    const gradeLetter =
      propGrade ||
      rubricResult?.grade ||
      (calculatedScore >= 85 ? 'A' : calculatedScore >= 70 ? 'B' : calculatedScore >= 55 ? 'C' : 'D');

    let gradeLabel = `Hạng ${gradeLetter} - Xuất Sắc`;
    let gradeColor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30';

    if (gradeLetter === 'B') {
      gradeLabel = `Hạng B - Đạt Chuẩn 5512`;
      gradeColor = 'text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/30';
    } else if (gradeLetter === 'C') {
      gradeLabel = `Hạng C - Cần Điều Chỉnh`;
      gradeColor = 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30';
    } else if (gradeLetter === 'D' || gradeLetter === 'F') {
      gradeLabel = `Hạng ${gradeLetter} - Chưa Đạt`;
      gradeColor = 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30';
    }

    return {
      effectiveScore: calculatedScore,
      effectiveMaxScore: calculatedMax,
      effectiveGrade: { letter: gradeLetter, label: gradeLabel, color: gradeColor },
      stats: {
        total: reviews.length,
        critical: criticalCount,
        error: errorCount,
        warning: warningCount,
        info: infoCount,
      },
    };
  }, [reviews, rubricResult, propTotalScore, propMaxTotalScore, propGrade]);

  // Rubric categories normalized
  const rubricCategories = useMemo(() => {
    const defaultCats = {
      muc_tieu: {
        name: '1. Mục tiêu bài dạy',
        score: Math.round(effectiveScore * 0.15),
        maxScore: 15,
        detail: 'Đủ 3 mặt (Kiến thức, Năng lực, Phẩm chất), đo lường được bằng động từ hành động.',
        icon: Target,
      },
      hoat_dong: {
        name: '2. Chuỗi các hoạt động học',
        score: Math.round(effectiveScore * 0.35),
        maxScore: 35,
        detail: 'Đủ các pha Khởi động, Khám phá, Luyện tập, Vận dụng; học sinh được hoạt động chủ động.',
        icon: Compass,
      },
      gv_action: {
        name: '3. Hoạt động của giáo viên',
        score: Math.round(effectiveScore * 0.15),
        maxScore: 15,
        detail: 'Chuyển giao nhiệm vụ rõ ràng, kỹ thuật đặt câu hỏi gợi mở, hướng dẫn cụ thể.',
        icon: Users,
      },
      hs_action: {
        name: '4. Hoạt động của học sinh',
        score: Math.round(effectiveScore * 0.15),
        maxScore: 15,
        detail: 'Học sinh tích cực thực hiện, thảo luận nhóm, tạo sản phẩm học tập cụ thể.',
        icon: TrendingUp,
      },
      phuong_tien: {
        name: '5. Thiết bị & Học liệu',
        score: Math.round(effectiveScore * 0.1),
        maxScore: 10,
        detail: 'Đầy đủ thiết bị, học liệu dạy học, tranh ảnh, phiếu bài tập phù hợp.',
        icon: Layers,
      },
      danh_gia: {
        name: '6. Kiểm tra & Đánh giá',
        score: Math.round(effectiveScore * 0.1),
        maxScore: 10,
        detail: 'Đa dạng phương pháp đánh giá thường xuyên, tiêu chí sản phẩm rõ ràng.',
        icon: CheckCheck,
      },
    };

    if (rubricResult?.categoryScores) {
      return {
        muc_tieu: {
          ...defaultCats.muc_tieu,
          ...rubricResult.categoryScores.muc_tieu,
          icon: Target,
        },
        hoat_dong: {
          ...defaultCats.hoat_dong,
          ...rubricResult.categoryScores.hoat_dong,
          icon: Compass,
        },
        gv_action: {
          ...defaultCats.gv_action,
          ...rubricResult.categoryScores.gv_action,
          icon: Users,
        },
        hs_action: {
          ...defaultCats.hs_action,
          ...rubricResult.categoryScores.hs_action,
          icon: TrendingUp,
        },
        phuong_tien: {
          ...defaultCats.phuong_tien,
          ...rubricResult.categoryScores.phuong_tien,
          icon: Layers,
        },
        danh_gia: {
          ...defaultCats.danh_gia,
          ...rubricResult.categoryScores.danh_gia,
          icon: CheckCheck,
        },
      };
    }

    return defaultCats;
  }, [rubricResult, effectiveScore]);

  // Strengths, Weaknesses, Suggestions
  const strengths = useMemo(() => {
    if (rubricResult?.strengths && rubricResult.strengths.length > 0) {
      return rubricResult.strengths;
    }
    return [
      `Cấu trúc giáo án chuẩn chỉ gồm ${document.pages.length} trang và ${document.activities.length} chuỗi hoạt động rõ ràng.`,
      'Phân bổ vai trò tương tác giữa Giáo viên và Học sinh theo định hướng phát triển năng lực.',
      'Đã xác định các yêu cầu cần đạt và học liệu hỗ trợ bài học.',
    ];
  }, [rubricResult, document]);

  const weaknesses = useMemo(() => {
    if (rubricResult?.weaknesses && rubricResult.weaknesses.length > 0) {
      return rubricResult.weaknesses;
    }
    return [
      'Một số mục tiêu bài dạy cần bổ sung động từ hành động cụ thể để thuận tiện kiểm tra, đo lường.',
      'Tiến trình các hoạt động cần thể hiện rõ hơn sản phẩm học tập dự kiến của học sinh theo 4 bước chuẩn 5512.',
      'Cần bổ sung tiêu chí đánh giá (Rubric hoặc bảng kiểm) cho hoạt động luyện tập và vận dụng.',
    ];
  }, [rubricResult]);

  const suggestions = useMemo(() => {
    if (rubricResult?.suggestions && rubricResult.suggestions.length > 0) {
      return rubricResult.suggestions;
    }
    return [
      'Chuẩn hóa cấu trúc 3 phần mục tiêu: Kiến thức - Năng lực (chung & đặc thù) - Phẩm chất.',
      'Tuân thủ triệt để 4 bước sư phạm: Chuyển giao ➔ Thực hiện ➔ Báo cáo/Thảo luận ➔ Kết luận/Nhận định.',
      'Bổ sung phiếu học tập và bảng rubric đánh giá mức độ hoàn thành nhiệm vụ của học sinh.',
    ];
  }, [rubricResult]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    if (filterSeverity === 'ALL') return reviews;
    if (filterSeverity === 'ERRORS') {
      return reviews.filter((r) => r.severity === 'CRITICAL' || r.severity === 'ERROR');
    }
    if (filterSeverity === 'WARNING') {
      return reviews.filter((r) => r.severity === 'WARNING');
    }
    if (filterSeverity === 'INFO') {
      return reviews.filter((r) => r.severity === 'INFO');
    }
    return reviews;
  }, [reviews, filterSeverity]);

  // Semantic labels grouped
  const groupedSemantics = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of semanticLabels) {
      map.set(s.label, (map.get(s.label) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [semanticLabels]);

  const getSeverityBadge = (severity: Review['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Nghiêm trọng
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Lỗi
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Cảnh báo
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <Info className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Gợi ý
          </span>
        );
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const messageToSend = (customPrompt || inputMessage).trim();
    if (!messageToSend || isChatLoading) return;

    setInputMessage('');
    setChatError(null);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          history: historyPayload,
          document,
          reviews,
          selectedContext: chatContext || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi gửi câu hỏi đến AI');
      }

      const assistantMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Không thể kết nối đến trợ lý AI');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAskAboutReview = (review: Review) => {
    const annotation = annotations.find((a) => a.reviewId === review.reviewId);
    const reviewNum = reviewIndexMap.get(review.reviewId) || 1;
    const context = {
      text: `${review.message}. ${review.suggestion || ''}`,
      page: annotation?.page || 1,
      targetId: review.targetId,
      title: `Nhận xét #${reviewNum} (${review.ruleId})`,
    };

    if (onSelectContextForChat) {
      onSelectContextForChat(context);
    }
    handleTabChange('chat');
    setInputMessage(`Gợi ý giúp tôi cách chỉnh sửa phần này sao cho chuẩn CV 5512: "${review.message}"`);
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border select-none">
      {/* Top Rubric Score Header */}
      <div
        onClick={() => handleTabChange('rubric')}
        className="p-4 bg-gradient-to-br from-primary/10 via-card to-card border-b border-border cursor-pointer group transition-all"
        title="Nhấp để xem bảng thẩm định chi tiết Rubric 100 điểm"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-primary" /> Thẩm Định Rubric 100đ
          </span>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${effectiveGrade.color}`}>
            {effectiveGrade.label}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors">
              {effectiveScore}
            </span>
            <span className="text-sm font-medium text-muted-foreground">/ {effectiveMaxScore}đ</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              {stats.critical + stats.error} lỗi
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {stats.warning} cảnh báo
            </span>
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {stats.info} gợi ý
            </span>
          </div>
        </div>

        {/* Score Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden p-0.5 border border-border/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              effectiveScore >= 85
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : effectiveScore >= 70
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                : 'bg-gradient-to-r from-rose-500 to-amber-500'
            }`}
            style={{ width: `${Math.min((effectiveScore / effectiveMaxScore) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Navigation Tabs (4 Tabs) - Modern Segmented Control */}
      <div className="p-1.5 bg-muted/60 border-b border-border flex items-center gap-1 text-xs">
        <button
          onClick={() => handleTabChange('rubric')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all font-medium text-xs whitespace-nowrap ${
            activeTab === 'rubric'
              ? 'bg-card text-foreground shadow-2xs font-bold border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-primary" />
          <span>Thẩm Định</span>
        </button>

        <button
          onClick={() => handleTabChange('reviews')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all font-medium text-xs whitespace-nowrap ${
            activeTab === 'reviews'
              ? 'bg-card text-foreground shadow-2xs font-bold border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Góp Ý</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-bold">
            {reviews.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('chat')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all font-medium text-xs relative whitespace-nowrap ${
            activeTab === 'chat'
              ? 'bg-card text-foreground shadow-2xs font-bold border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
          <span>Hỏi Đáp</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        </button>

        <button
          onClick={() => handleTabChange('semantics')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all font-medium text-xs whitespace-nowrap ${
            activeTab === 'semantics'
              ? 'bg-card text-foreground shadow-2xs font-bold border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          }`}
        >
          <Tag className="w-3.5 h-3.5 text-violet-500" />
          <span>Ngữ Nghĩa</span>
        </button>
      </div>

      {/* Tab 1: Rubric 100-Point Grading Tab (BEEKNOEE_AI_CONFIG.md) */}
      {activeTab === 'rubric' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Rubric Criteria Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary" />
                6 TIÊU CHÍ RUBRIC CHUẨN CV 5512 (100 ĐIỂM)
              </h4>
              <span className="text-[11px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                {effectiveScore} / {effectiveMaxScore}đ
              </span>
            </div>

            <div className="space-y-2.5">
              {Object.entries(rubricCategories).map(([key, cat]) => {
                const IconComponent = cat.icon || Target;
                const percentage = Math.min(Math.round((cat.score / cat.maxScore) * 100), 100);

                return (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-2xs transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-muted text-foreground border border-border">
                          <IconComponent className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-bold text-foreground text-xs">{cat.name}</span>
                      </div>
                      <span className="font-extrabold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {cat.score} / {cat.maxScore}đ
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentage >= 85
                            ? 'bg-emerald-500'
                            : percentage >= 70
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed italic bg-muted/40 p-2 rounded-lg border border-border/50">
                      {cat.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths Card */}
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <h5 className="font-bold text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              Điểm Mạnh Sư Phạm Nổi Bật:
            </h5>
            <ul className="space-y-1.5 text-[11px] text-foreground">
              {strengths.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses Card */}
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <h5 className="font-bold text-amber-700 dark:text-amber-400 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              Tồn Tại & Điểm Cần Khắc Phục:
            </h5>
            <ul className="space-y-1.5 text-[11px] text-foreground">
              {weaknesses.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Suggestions Card */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <h5 className="font-bold text-primary text-xs flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
              Khuyến Nghị Nâng Cao Chất Lượng Bài Dạy:
            </h5>
            <ul className="space-y-1.5 text-[11px] text-foreground">
              {suggestions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-primary font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section Breakdown if detected */}
          {detectedSectionsSummary.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <h5 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-primary" />
                Cấu Trúc Từng Phần Được Bóc Tách (CV 5512):
              </h5>
              <div className="space-y-1.5">
                {detectedSectionsSummary.map((sec: any) => (
                  <div
                    key={sec.key}
                    className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{sec.title}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {sec.isDetected
                          ? `${sec.paragraphCount} đoạn văn bản (trang ${sec.startPage}-${sec.endPage})`
                          : 'Chưa có trong bài soạn'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sec.isDetected
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                      }`}
                    >
                      {sec.isDetected ? 'ĐÃ CÓ' : 'THIẾU'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => handleTabChange('reviews')}
              className="w-full py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.99]"
            >
              <span>Xem {reviews.length} Góp Ý Sửa Mẫu Chuẩn 5512</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Reviews Tab */}
      {activeTab === 'reviews' && (
        <>
          {/* Quick Filter Chips */}
          <div className="p-2.5 border-b border-border bg-card flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setFilterSeverity('ALL')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterSeverity === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              Tất cả ({reviews.length})
            </button>
            <button
              onClick={() => setFilterSeverity('ERRORS')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterSeverity === 'ERRORS'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              Lỗi ({stats.critical + stats.error})
            </button>
            <button
              onClick={() => setFilterSeverity('WARNING')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterSeverity === 'WARNING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              Cảnh báo ({stats.warning})
            </button>
            <button
              onClick={() => setFilterSeverity('INFO')}
              className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                filterSeverity === 'INFO'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20'
              }`}
            >
              Gợi ý ({stats.info})
            </button>
          </div>

          {/* Review Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2.5 text-xs text-primary animate-pulse">
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
                  <span className="font-semibold">Đang thẩm định & đối soát chuẩn CV 5512...</span>
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3.5 bg-card border border-border rounded-xl animate-pulse space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 bg-muted rounded-full" />
                      <div className="h-4 w-12 bg-muted rounded-full" />
                    </div>
                    <div className="h-3 w-5/6 bg-muted rounded" />
                    <div className="h-3 w-4/6 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center text-muted-foreground flex flex-col items-center">
                <AlertCircle className="w-10 h-10 text-destructive mb-2" />
                <p className="text-xs font-bold text-destructive mb-1">Thẩm định chưa hoàn tất</p>
                <p className="text-[11px] text-muted-foreground mb-3">{error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors"
                  >
                    Thử Lại Thẩm Định
                  </button>
                )}
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm font-semibold text-foreground">
                  Không tìm thấy vấn đề nào!
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mb-3">
                  Mục tiêu và các hoạt động trong giáo án đều thỏa mãn các tiêu chí được lọc.
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-xs border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Thẩm Định Lại
                  </button>
                )}
              </div>
            ) : (
              filteredReviews.map((review) => {
                const annotation = annotations.find((a) => a.reviewId === review.reviewId);
                const isSelected = selectedAnnotation?.reviewId === review.reviewId;
                const isHovered = hoveredReviewId === review.reviewId;
                const reviewNumber = reviewIndexMap.get(review.reviewId) || 1;

                return (
                  <div
                    key={review.reviewId}
                    onClick={() => {
                      onReviewClick(review);
                      if (annotation) onAnnotationClick(annotation);
                    }}
                    onMouseEnter={() => onHoverReview && onHoverReview(review.reviewId)}
                    onMouseLeave={() => onHoverReview && onHoverReview(null)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                        : isHovered
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40 hover:shadow-2xs'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-foreground text-background font-extrabold text-[11px] flex items-center justify-center flex-shrink-0">
                          #{reviewNumber}
                        </span>
                        {getSeverityBadge(review.severity)}
                      </div>

                      {annotation?.page && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReviewClick(review);
                            if (annotation) onAnnotationClick(annotation);
                          }}
                          className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Bấm để chuyển ngay đến trang này trên bản PDF"
                        >
                          <Target className="w-2.5 h-2.5 text-primary" />
                          <span>Trang {annotation.page}</span>
                        </button>
                      )}
                    </div>

                    {/* Message */}
                    <p className="text-xs font-bold text-foreground leading-snug mb-2">
                      {review.message}
                    </p>

                    {/* Quote */}
                    {review.quote && (
                      <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-[11px] text-muted-foreground italic mb-2 leading-relaxed">
                        <span className="not-italic font-bold text-muted-foreground/70 text-[9px] uppercase tracking-wider block mb-0.5">
                          Trích dẫn gốc trong giáo án:
                        </span>
                        &ldquo;{review.quote}&rdquo;
                      </div>
                    )}

                    {/* Error detail / Pedagogical Impact */}
                    {review.errorDetail && (
                      <div className="text-[11px] text-rose-900 dark:text-rose-200 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg mb-2 leading-relaxed">
                        <span className="font-bold block text-[10px] text-rose-700 dark:text-rose-300 mb-0.5">
                          ⚠️ Tác động sư phạm khi lên lớp:
                        </span>
                        {review.errorDetail}
                      </div>
                    )}

                    {/* Suggestion & Rewrite Example */}
                    {review.suggestion && (
                      <div className="text-[11px] text-foreground bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg mb-2 leading-relaxed">
                        <span className="font-bold block text-[10px] text-emerald-700 dark:text-emerald-400 mb-0.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Hướng dẫn điều chỉnh:
                        </span>
                        {review.suggestion}

                        {review.suggestionExample && (
                          <div className="mt-2 pt-2 border-t border-emerald-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-[10px] text-emerald-700 dark:text-emerald-400 uppercase">
                                💡 Soạn mẫu chuẩn 5512:
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(review.reviewId, review.suggestionExample || '');
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-foreground hover:text-primary bg-card px-2 py-0.5 rounded border border-border shadow-2xs transition-colors"
                              >
                                {copiedId === review.reviewId ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>Đã sao chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5 text-muted-foreground" />
                                    <span>Sao chép mẫu</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="bg-card p-2.5 rounded-lg border border-border text-foreground text-[11px] font-mono leading-relaxed select-text whitespace-pre-wrap">
                              {review.suggestionExample}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReviewClick(review);
                          if (annotation) onAnnotationClick(annotation);
                        }}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold"
                        title="Chuyển đến vị trí đoạn này trên trang PDF"
                      >
                        <Target className="w-3 h-3" />
                        <span>Xem Trang {annotation?.page || 1}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskAboutReview(review);
                        }}
                        className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Hỏi AI về mục này</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Tab 3: Contextual AI Assistant Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          {/* Active Context Banner */}
          {chatContext && (
            <div className="p-2.5 bg-primary/10 border-b border-primary/20 flex items-center justify-between text-xs text-primary">
              <div className="flex items-center gap-2 overflow-hidden">
                <Target className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate">
                  Đang trao đổi về: <strong>{chatContext.title || `Trang ${chatContext.page}`}</strong>
                </span>
              </div>
              <button
                onClick={onClearChatContext}
                className="p-1 rounded-md text-primary/70 hover:text-primary hover:bg-primary/20 transition-colors"
                title="Bỏ ngữ cảnh chọn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {msg.role === 'user' ? 'Thầy/Cô' : 'Trợ Lý Sư Phạm AI'}
                  </span>
                  <span className="text-[9px] text-muted-foreground">• {msg.timestamp}</span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl max-w-[92%] text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-xs shadow-xs'
                      : 'bg-card border border-border text-foreground rounded-tl-xs shadow-2xs whitespace-pre-wrap'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2.5 bg-card rounded-xl border border-border w-fit shadow-2xs">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Trợ lý AI đang tư duy và soạn phản hồi...</span>
              </div>
            )}

            {chatError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-center justify-between">
                <span>{chatError}</span>
                <button
                  onClick={() => handleSendMessage()}
                  className="text-xs font-bold text-destructive underline ml-2"
                >
                  Thử lại
                </button>
              </div>
            )}

            <div ref={chatMessagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2 border-t border-border bg-card">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-[11px]">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isChatLoading}
                  className="px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground font-medium whitespace-nowrap transition-colors flex-shrink-0 disabled:opacity-50 border border-border/50 text-[11px]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  chatContext
                    ? `Hỏi AI về "${chatContext.title || 'mục đang chọn'}"...`
                    : 'Đặt câu hỏi hoặc yêu cầu soạn mẫu theo CV 5512...'
                }
                disabled={isChatLoading}
                className="flex-1 bg-muted/50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 transition-all"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isChatLoading}
                className="p-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl shadow-xs transition-all active:scale-95 disabled:cursor-not-allowed flex-shrink-0"
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Semantic Classification Tab */}
      {activeTab === 'semantics' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-foreground leading-relaxed">
            <p className="font-semibold mb-1 flex items-center gap-1 text-primary">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Tổng quan cấu trúc ngữ nghĩa
            </p>
            Hệ thống đã phân tích và gắn nhãn các thành phần trong giáo án để đối chiếu với yêu cầu sư phạm:
          </div>

          <div className="space-y-2">
            {groupedSemantics.map(([label, count]) => (
              <div
                key={label}
                className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs hover:border-primary/30 transition-all"
              >
                <div>
                  <span className="font-bold text-foreground">{label}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {label === 'OBJECTIVE'
                      ? 'Mục tiêu bài học (Kiến thức/Kỹ năng/Thái độ)'
                      : label === 'TEACHER_ACTION'
                      ? 'Hoạt động hướng dẫn của Giáo viên'
                      : label === 'STUDENT_ACTION'
                      ? 'Hoạt động học tập của Học sinh'
                      : label === 'TEACHING_MATERIAL'
                      ? 'Thiết bị & Đồ dùng dạy học'
                      : label === 'SECTION_HEADER'
                      ? 'Tiêu đề các phần / Hoạt động'
                      : label === 'HOMEWORK'
                      ? 'Vận dụng / Hướng dẫn về nhà'
                      : 'Nội dung bổ trợ'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-muted font-bold text-foreground border border-border">
                  {count} đoạn
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
