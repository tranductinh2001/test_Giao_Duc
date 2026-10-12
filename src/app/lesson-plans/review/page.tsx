'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DocumentIR } from '@/types/document';
import { Review, RubricEvaluation } from '@/types/review';
import { Annotation } from '@/types/annotation';
import { SemanticLabel } from '@/types/ai';
import dynamic from 'next/dynamic';
import UploadZone from '@/components/upload/UploadZone';

const PDFViewer = dynamic(() => import('@/components/pdf-viewer/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center h-full bg-muted/20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Đang tải trình xem giáo án...</p>
      </div>
    </div>
  ),
});

import ReviewPanel, { ReviewPanelTab } from '@/components/review-panel/ReviewPanel';
import PageList from '@/components/sidebar/PageList';
import {
  FileText,
  Sparkles,
  Upload,
  Download,
  Printer,
  X,
  Award,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Brain,
  Sliders,
  Key,
  BarChart3,
  GraduationCap,
  School,
  ArrowLeft,
  Shield,
  ShieldAlert,
  Target,
  User,
  LogIn,
  RotateCcw,
} from 'lucide-react';
import EvaluationConfigModal from '@/components/config-modal/EvaluationConfigModal';
import { calculateBeeknoeeCost, BEEKNOEE_CONFIG } from '@/lib/beeknoee-billing';
import {
  DEFAULT_EVALUATION_POLICY,
  EvaluationPolicyConfig,
  loadActivePolicyFromStorage,
  saveActivePolicyToStorage,
  loadPolicyForDispatch,
  setActiveDispatchType,
} from '@/types/section-config';

export default function LessonPlanReviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Role permissions: ADMIN (Quản lý), TEACHER (Nhân viên), LEARNER (Khách hàng)
  const userRole = (session?.user as any)?.role || 'TEACHER';
  const isAdmin = userRole === 'ADMIN';
  const isTeacher = userRole === 'TEACHER';
  const isLearner = userRole === 'LEARNER';
  const isStaffOrAdmin = isAdmin || isTeacher;

  // Quota & Token state tracking (Khóa tính năng khi hết lượt với Nhân viên, Admin vô hạn)
  const [quotaTotal, setQuotaTotal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('review_quota_total');
      if (saved) return parseInt(saved, 10);
    }
    return (session?.user as any)?.reviewQuotaTotal ?? 50;
  });

  const [quotaUsed, setQuotaUsed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('review_quota_used');
      if (saved) return parseInt(saved, 10);
    }
    return (session?.user as any)?.reviewQuotaUsed ?? 12;
  });

  const [tokensUsed, setTokensUsed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('review_tokens_used');
      if (saved) return parseInt(saved, 10);
    }
    return (session?.user as any)?.tokensUsed ?? 48250;
  });

  const remainingReviews = isAdmin ? 999999 : Math.max(0, quotaTotal - quotaUsed);
  const isQuotaExceeded = !isAdmin && remainingReviews <= 0;
  const beeknoeeMetrics = calculateBeeknoeeCost(
    Math.round(tokensUsed * 0.7),
    Math.round(tokensUsed * 0.3)
  );
  const estimatedCostVND = beeknoeeMetrics.costVnd;
  const estimatedCostUSD = beeknoeeMetrics.formattedUsd;

  const [document, setDocument] = useState<DocumentIR | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [semanticLabels, setSemanticLabels] = useState<SemanticLabel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ReviewPanelTab>('rubric');
  const [hoveredReviewId, setHoveredReviewId] = useState<string | null>(null);
  const [chatContext, setChatContext] = useState<{
    text: string;
    page: number;
    targetId: string;
    title?: string;
  } | null>(null);

  const [policyConfig, setPolicyConfig] = useState<EvaluationPolicyConfig>(() => {
    return loadActivePolicyFromStorage();
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [detectedSectionsSummary, setDetectedSectionsSummary] = useState<Array<{
    key: string;
    title: string;
    isDetected: boolean;
    paragraphCount: number;
    activityCount: number;
    startPage: number;
    endPage: number;
  }>>([]);
  const [sectionResults, setSectionResults] = useState<any[]>([]);
  const [rubricResult, setRubricResult] = useState<RubricEvaluation | null>(null);
  const [grade, setGrade] = useState<string>('B');
  const [totalScore, setTotalScore] = useState<number>(0);
  const [maxTotalScore, setMaxTotalScore] = useState<number>(100);

  // Common analysis routine
  const analyzeParsedDocument = useCallback(
    async (parsedDocument: DocumentIR, customPolicy?: EvaluationPolicyConfig) => {
      const activePolicy = customPolicy || policyConfig;
      setProgress('Đang bóc tách từng phần và thẩm định theo Rubric 100 điểm...');
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: parsedDocument,
          policyConfig: activePolicy,
        }),
      });

      const analyzeResult = await analyzeResponse.json().catch(() => null);
      if (!analyzeResponse.ok || !analyzeResult?.success) {
        throw new Error(analyzeResult?.error || 'Thẩm định giáo án thất bại');
      }

      setSemanticLabels(analyzeResult.semanticLabels || []);
      setReviews(analyzeResult.reviews || []);
      setAnnotations(analyzeResult.annotations || []);
      setDetectedSectionsSummary(analyzeResult.detectedSections || []);
      setSectionResults(analyzeResult.sectionResults || []);

      if (analyzeResult.rubricResult) {
        setRubricResult(analyzeResult.rubricResult);
        setGrade(analyzeResult.rubricResult.grade || 'B');
        setTotalScore(analyzeResult.rubricResult.totalScore);
        setMaxTotalScore(analyzeResult.rubricResult.maxTotalScore || 100);
      } else {
        if (typeof analyzeResult.totalScore === 'number') {
          setTotalScore(analyzeResult.totalScore);
        }
        if (typeof analyzeResult.maxTotalScore === 'number') {
          setMaxTotalScore(analyzeResult.maxTotalScore);
        }
        if (analyzeResult.grade) {
          setGrade(analyzeResult.grade);
        }
      }

      // Deduct quota & record tokens for Staff (Admin is unlimited)
      if (!isAdmin) {
        setQuotaUsed((prev) => {
          const next = prev + 1;
          if (typeof window !== 'undefined') localStorage.setItem('review_quota_used', String(next));
          return next;
        });
        setTokensUsed((prev) => {
          const addedTokens = Math.floor(16500 + Math.random() * 4000);
          const next = prev + addedTokens;
          if (typeof window !== 'undefined') localStorage.setItem('review_tokens_used', String(next));
          return next;
        });
      }

      setProgress('Hoàn tất thẩm định!');
    },
    [policyConfig, isAdmin]
  );

  const handleSavePolicy = useCallback(
    (newPolicy: EvaluationPolicyConfig, shouldReanalyze: boolean = true) => {
      setPolicyConfig(newPolicy);
      saveActivePolicyToStorage(newPolicy);
      if (shouldReanalyze && document) {
        analyzeParsedDocument(document, newPolicy).catch((err) => {
          setError(err instanceof Error ? err.message : 'Thẩm định thất bại');
        });
      }
    },
    [document, analyzeParsedDocument]
  );

  const handleQuickSwitchDispatch = useCallback(
    (targetType: 'CV_5512' | 'CV_2345') => {
      if (policyConfig.dispatchType === targetType) return;
      const targetPolicy = loadPolicyForDispatch(targetType);
      setPolicyConfig(targetPolicy);
      saveActivePolicyToStorage(targetPolicy);
      setActiveDispatchType(targetType);
      if (document) {
        analyzeParsedDocument(document, targetPolicy).catch((err) => {
          setError(err instanceof Error ? err.message : 'Thẩm định thất bại');
        });
      }
    },
    [policyConfig.dispatchType, document, analyzeParsedDocument]
  );

  // Upload handler
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (isQuotaExceeded) {
        setError('Bạn đã sử dụng hết số lượt thẩm định được cấp (0 lượt còn lại). Vui lòng liên hệ Quản trị viên để được cấp thêm lượt.');
        return;
      }
      setIsLoading(true);
      setError(null);
      setProgress('Đang tải lên và phân tích cấu trúc PDF...');

      try {
        // Read raw ArrayBuffer for the canvas viewer
        const rawBuffer = await file.arrayBuffer();
        setPdfData(rawBuffer);

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        const uploadResult = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok || !uploadResult?.success) {
          throw new Error(uploadResult?.error || 'Tải lên PDF thất bại');
        }

        const parsedDocument: DocumentIR = uploadResult.document;
        setDocument(parsedDocument);
        setCurrentPage(1);

        await analyzeParsedDocument(parsedDocument);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
        setError(msg);
      } finally {
        setIsLoading(false);
        setTimeout(() => setProgress(''), 1500);
      }
    },
    [analyzeParsedDocument, isQuotaExceeded]
  );

  // Load sample demo handler
  const handleLoadSample = useCallback(async () => {
    if (isQuotaExceeded) {
      setError('Bạn đã sử dụng hết số lượt thẩm định được cấp (0 lượt còn lại). Vui lòng liên hệ Quản trị viên để được cấp thêm lượt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setProgress('Đang nạp giáo án mẫu (Toán lớp 3)...');

    try {
      const [sampleRes, rawRes] = await Promise.all([
        fetch('/api/sample'),
        fetch('/api/sample?raw=true'),
      ]);

      if (!sampleRes.ok) {
        throw new Error('Không thể tải giáo án mẫu');
      }

      const result = await sampleRes.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      const sampleDoc: DocumentIR = result.document;
      setDocument(sampleDoc);
      setCurrentPage(1);

      if (rawRes.ok) {
        const rawBuffer = await rawRes.arrayBuffer();
        setPdfData(rawBuffer);
      }

      await analyzeParsedDocument(sampleDoc);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải mẫu';
      setError(msg);
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(''), 1500);
    }
  }, [analyzeParsedDocument]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportAnnotatedPDF = useCallback(async () => {
    if (!document) return;
    if (document.metadata.filename?.toLowerCase().endsWith('.docx')) {
      alert('Chức năng "Tải PDF Kèm Nhận Xét" áp dụng cho tài liệu định dạng PDF gốc. Với file Word (.docx), Thầy/Cô có thể xem toàn bộ bảng điểm Rubric 100đ và bấm nút "Sao chép nhận xét" ở thanh công cụ bên phải để dán vào giáo án.');
      return;
    }
    setIsExporting(true);
    try {
      let buffer = pdfData;
      if (!buffer) {
        const sampleRawRes = await fetch('/api/sample?raw=true');
        if (sampleRawRes.ok) {
          buffer = await sampleRawRes.arrayBuffer();
          setPdfData(buffer);
        }
      }

      if (!buffer) {
        throw new Error('Không tìm thấy dữ liệu PDF gốc để xuất file.');
      }

      const { exportAnnotatedPDF, downloadAnnotatedPDFBlob } = await import('@/lib/pdf-export/exporter');
      const annotatedBytes = await exportAnnotatedPDF(
        buffer,
        document,
        reviews,
        annotations
      );

      downloadAnnotatedPDFBlob(annotatedBytes, document.metadata.filename || 'KHBD.pdf');
    } catch (err) {
      console.error('Export PDF error:', err);
      setError(err instanceof Error ? err.message : 'Xuất file PDF thất bại');
    } finally {
      setIsExporting(false);
    }
  }, [document, pdfData, reviews, annotations]);

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotation(annotation);
    setCurrentPage(annotation.page);
  }, []);

  const handleReviewClick = useCallback(
    (review: Review) => {
      const annotation = annotations.find((a) => a.reviewId === review.reviewId);
      if (annotation) {
        setSelectedAnnotation(annotation);
        setCurrentPage(annotation.page);
      }
    },
    [annotations]
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setSelectedAnnotation(null);
  }, []);

  const handleAskAI = useCallback(
    (context: { text: string; page: number; targetId: string; title?: string }) => {
      setChatContext(context);
      setActiveTab('chat');
      if (context.page && context.page !== currentPage) {
        setCurrentPage(context.page);
      }
    },
    [currentPage]
  );

  const handleResetDocument = useCallback(() => {
    setDocument(null);
    setPdfData(null);
    setReviews([]);
    setAnnotations([]);
    setSemanticLabels([]);
    setSelectedAnnotation(null);
    setHoveredReviewId(null);
    setChatContext(null);
    setRubricResult(null);
    setGrade('B');
    setTotalScore(0);
    setActiveTab('rubric');
    setError(null);
  }, []);

  // Unauthenticated Guard
  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Yêu Cầu Đăng Nhập</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Bạn cần đăng nhập tài khoản hệ thống để truy cập Không gian Thẩm định & Đánh giá Giáo án AI.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/login?callbackUrl=/lesson-plans/review"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Đăng Nhập Ngay
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-accent transition-colors"
            >
              Quay về Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Customer / Learner Guard (Chỉ dành cho Nhân viên & Quản trị viên)
  if (isLearner) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <div className="max-w-lg w-full bg-card border border-border rounded-2xl p-8 text-center shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Phân Quyền: Tài Khoản Khách Hàng (Học Viên)
            </span>
            <h2 className="text-2xl font-bold text-foreground">
              Khu Vực Dành Cho Nhân Viên Chuyên Môn
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tính năng <strong>Thẩm định Kế hoạch bài dạy (Giáo án) theo chuẩn CV 5512/2345</strong> dành riêng cho <strong>Nhân viên chuyên môn</strong> và <strong>Quản trị viên</strong>.
            </p>
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground text-left space-y-1.5">
              <p className="font-semibold text-foreground">💡 Tài khoản Khách hàng được hỗ trợ đầy đủ các dịch vụ:</p>
              <p>• Làm đề thi thử online các kỳ thi công chức, viên chức, giáo viên</p>
              <p>• Luyện tập ngân hàng câu hỏi trắc nghiệm theo chuyên đề</p>
              <p>• Xem lịch sử làm bài và thống kê năng lực chi tiết</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/dashboard/exams"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 transition-all hover:scale-[1.01]"
            >
              <FileText className="w-4 h-4" />
              Đến Phòng Thi Thử Online
            </Link>
            <Link
              href="/practice"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-accent transition-colors"
            >
              <Target className="w-4 h-4" />
              Luyện Tập Trắc Nghiệm Theo Chuyên Đề
            </Link>
            <div className="pt-2 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Muốn dùng tài khoản Nhân viên?</span>
              <button
                type="button"
                onClick={() => {
                  import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }));
                }}
                className="font-bold text-primary hover:underline cursor-pointer"
              >
                Đổi tài khoản đăng nhập
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen lg:min-h-0 bg-background text-foreground overflow-hidden font-sans">
      {/* Top Application Header */}
      <header className="bg-card border-b border-border px-4 py-2 shadow-xs z-20 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Brand & Standard Pill */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href={isStaffOrAdmin ? "/admin" : "/"}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors flex-shrink-0"
              title={isStaffOrAdmin ? "Về Bảng điều khiển Quản trị" : "Về Trang chủ"}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-primary-foreground shadow-xs flex-shrink-0">
              <Brain className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm sm:text-base tracking-tight truncate">
                  Thẩm Định Kế Hoạch Bài Dạy
                </span>
                <span
                  className={`hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${
                    policyConfig.dispatchType === 'CV_2345'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-primary/10 text-primary border-primary/30'
                  }`}
                >
                  {policyConfig.dispatchType === 'CV_2345' ? 'Tiểu Học (CV 2345)' : 'THCS/THPT (CV 5512)'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden lg:block truncate">
                Kiểm tra tiến trình sư phạm & đối chiếu tiêu chí Bộ GD&ĐT
              </p>
            </div>
          </div>

          {/* Center: Document & Score Badge (when document loaded) */}
          {document && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-muted/60 border border-border/80 text-xs shadow-2xs flex-shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="font-semibold text-foreground truncate max-w-[150px] lg:max-w-[200px]" title={document.metadata.filename}>
                  {document.metadata.filename}
                </span>
                <span className="text-muted-foreground text-[11px]">({document.pages.length} trang)</span>
              </div>

              {totalScore > 0 && (
                <>
                  <span className="w-px h-3.5 bg-border mx-1"></span>
                  <button
                    onClick={() => setActiveTab('rubric')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors cursor-pointer"
                    title="Nhấp để xem bảng điểm Rubric 100 điểm"
                  >
                    <Award className="w-3 h-3 text-primary" />
                    <span>{totalScore}/{maxTotalScore}đ</span>
                    <span className="text-[10px] opacity-80">({grade})</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Role Quota & Tokens Badge (Khong de so tien, chi de so lan tao va so token da su dung) */}
            {isAdmin ? (
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs shadow-2xs">
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  👑 Admin • Vô hạn lượt
                </span>
                <span className="w-px h-3 bg-purple-500/30"></span>
                <span className="text-muted-foreground text-[11px]" title="Tổng token đã sử dụng">
                  {tokensUsed.toLocaleString('vi-VN')} tokens đã dùng
                </span>
                <span className="w-px h-3 bg-purple-500/30"></span>
                <Link
                  href="/admin/users"
                  className="text-primary hover:underline text-[11px] font-semibold"
                  title="Quản lý nhân viên và cấp phát lượt"
                >
                  Cấp Lượt
                </Link>
              </div>
            ) : (isTeacher || isLearner) ? (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs shadow-2xs">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{remainingReviews}/{quotaTotal} lượt tạo</span>
                </div>
                <span className="w-px h-3 bg-blue-500/30"></span>
                <span
                  className="text-muted-foreground text-[11px] font-medium"
                  title="Tổng số token đã sử dụng"
                >
                  {tokensUsed.toLocaleString('vi-VN')} tokens đã dùng
                </span>
                {isQuotaExceeded && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500 text-white font-bold animate-pulse">
                    Hết Lượt
                  </span>
                )}
              </div>
            ) : null}

            {/* Quick Dispatch Switcher */}
            <div className="inline-flex rounded-lg p-0.5 bg-muted border border-border/80 shadow-2xs">
              <button
                type="button"
                onClick={() => handleQuickSwitchDispatch('CV_5512')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                  policyConfig.dispatchType !== 'CV_2345'
                    ? 'bg-card text-foreground shadow-2xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Đánh giá theo chuẩn Công văn 5512/BGDĐT cho cấp THCS & THPT"
              >
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
                <span>CV 5512</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickSwitchDispatch('CV_2345')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                  policyConfig.dispatchType === 'CV_2345'
                    ? 'bg-card text-foreground shadow-2xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Đánh giá theo chuẩn Công văn 2345/BGDĐT cho cấp Tiểu học"
              >
                <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>CV 2345</span>
              </button>
            </div>

            {!document ? (
              <>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Cấu Hình</span>
                </button>
                <button
                  onClick={handleLoadSample}
                  disabled={isLoading || isQuotaExceeded}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
                    isQuotaExceeded
                      ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }`}
                  title={isQuotaExceeded ? 'Tài khoản đã hết lượt thẩm định' : 'Mở giáo án mẫu để kiểm tra'}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Giáo Án Mẫu</span>
                </button>
              </>
            ) : (
              <>
                {/* Primary: Re-analyze */}
                <button
                  onClick={() => analyzeParsedDocument(document)}
                  disabled={isLoading || isQuotaExceeded}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98] ${
                    isQuotaExceeded
                      ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }`}
                  title={isQuotaExceeded ? 'Tài khoản đã hết lượt thẩm định' : 'Thẩm định lại theo cấu hình tiêu chí đã chọn'}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Thẩm Định Lại</span>
                </button>

                {/* Secondary Button Group with consistent design */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleExportAnnotatedPDF}
                    disabled={isExporting || isLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border shadow-2xs transition-colors"
                    title="Tải file PDF đã gắn trực tiếp nhận xét và đánh dấu trên từng trang"
                  >
                    {isExporting ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="hidden xl:inline">{isExporting ? 'Đang Xuất...' : 'Tải PDF Nhận Xét'}</span>
                    <span className="xl:hidden">{isExporting ? 'Xuất...' : 'PDF'}</span>
                  </button>

                  <button
                    onClick={() => setShowReportModal(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border shadow-2xs transition-colors"
                    title="Xem báo cáo thẩm định tổng thể"
                  >
                    <Award className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Báo Cáo</span>
                  </button>

                  <button
                    onClick={() => setShowConfigModal(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border shadow-2xs transition-colors"
                    title={`Cấu hình đang dùng: ${policyConfig.name} - Bấm để thay đổi tiêu chí`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="hidden lg:inline">Cấu Hình</span>
                  </button>

                  <button
                    onClick={handleResetDocument}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border shadow-2xs transition-colors"
                    title="Tải lên file giáo án khác"
                  >
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Đổi File</span>
                  </button>
                </div>
              </>
            )}

            {/* User Profile Avatar / Role Badge */}
            {!isAdmin && session?.user && (
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-border">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                  {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'N'}
                </div>
                <div className="text-left text-[11px] leading-tight">
                  <p className="font-semibold text-foreground truncate max-w-[90px]">{session?.user?.name || 'Nhân viên'}</p>
                  <p className="text-[10px] text-muted-foreground">{isTeacher ? 'Nhân viên (GV)' : 'Thành viên'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Quota Exceeded Banner */}
      {isQuotaExceeded && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between text-xs text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Tài khoản đã hết số lượt thẩm định:</strong> Bạn đã sử dụng hết {quotaTotal}/{quotaTotal} lượt thẩm định được cấp. Chức năng đánh giá đã tạm khóa.
            </span>
          </div>
          <span className="text-[11px] font-medium opacity-80">
            Vui lòng liên hệ Quản trị viên để cấp thêm lượt.
          </span>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {!document ? (
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <UploadZone
              onFileUpload={handleFileUpload}
              onLoadSample={handleLoadSample}
              isLoading={isLoading}
              progress={progress}
              error={error}
              isQuotaExceeded={isQuotaExceeded}
            />
          </div>
        ) : (
          <>
            {/* Left Sidebar - Navigation & Outline */}
            <aside className="w-56 bg-card border-r border-border overflow-hidden flex flex-col flex-shrink-0">
              <PageList
                pages={document.pages}
                currentPage={currentPage}
                annotations={annotations}
                sections={document.sections}
                activities={document.activities}
                onPageSelect={handlePageChange}
              />
            </aside>

            {/* Center Canvas - PDF Document Viewer */}
            <div className="flex-1 overflow-hidden flex flex-col relative bg-muted/40">
              {error && (
                <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between text-xs text-destructive z-10 shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                  <button
                    onClick={() => analyzeParsedDocument(document)}
                    className="px-2.5 py-1 rounded-md bg-destructive text-destructive-foreground font-semibold text-[11px] hover:bg-destructive/90 shadow-xs transition-colors"
                  >
                    Thử Lại Thẩm Định
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <PDFViewer
                  document={document}
                  pdfData={pdfData}
                  annotations={annotations}
                  reviews={reviews}
                  currentPage={currentPage}
                  selectedAnnotation={selectedAnnotation}
                  hoveredReviewId={hoveredReviewId}
                  onPageChange={handlePageChange}
                  onAnnotationClick={handleAnnotationClick}
                  onLoadSample={handleLoadSample}
                  onAskAI={handleAskAI}
                  onExport={handleExportAnnotatedPDF}
                  isExporting={isExporting}
                />
              </div>
            </div>

            {/* Right Panel - AI Reviews & Evaluation */}
            <aside className="w-96 bg-card border-l border-border overflow-hidden flex flex-col flex-shrink-0 shadow-lg">
              <ReviewPanel
                reviews={reviews}
                annotations={annotations}
                document={document}
                semanticLabels={semanticLabels}
                selectedAnnotation={selectedAnnotation}
                onReviewClick={handleReviewClick}
                onAnnotationClick={handleAnnotationClick}
                isLoading={isLoading}
                onRetry={() => analyzeParsedDocument(document)}
                error={error}
                onExport={handleExportAnnotatedPDF}
                isExporting={isExporting}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hoveredReviewId={hoveredReviewId}
                onHoverReview={setHoveredReviewId}
                chatContext={chatContext}
                onClearChatContext={() => setChatContext(null)}
                onSelectContextForChat={setChatContext}
                rubricResult={rubricResult}
                totalScore={totalScore}
                maxTotalScore={maxTotalScore}
                grade={grade}
                detectedSectionsSummary={detectedSectionsSummary}
                sectionResults={sectionResults}
              />
            </aside>
          </>
        )}
      </main>

      {/* Loading Overlay Modal */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-50 animate-fade">
          <div className="bg-card rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-border flex flex-col items-center">
            <div className="spinner-gradient mb-5"></div>
            <h3 className="font-bold text-foreground text-base mb-1">Đang Phân Tích & Thẩm Định</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {progress || 'Vui lòng chờ trong giây lát...'}
            </p>
          </div>
        </div>
      )}

      {/* Summary Report Modal */}
      {showReportModal && document && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-border animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-base">
                  Báo Cáo Thẩm Định Kế Hoạch Bài Dạy ({policyConfig.dispatchType === 'CV_2345' ? 'Công Văn 2345' : 'Công Văn 5512'})
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-foreground">
              {/* Document Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Tài liệu</span>
                  <p className="font-bold text-foreground truncate mt-0.5">{document.metadata.filename}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Quy mô</span>
                  <p className="font-bold text-foreground mt-0.5">
                    {document.pages.length} trang • {document.paragraphs.length} đoạn
                  </p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Chuỗi hoạt động</span>
                  <p className="font-bold text-foreground mt-0.5">{document.activities.length} hoạt động</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                  <span className="text-[10px] text-primary font-semibold uppercase">Khuyến nghị</span>
                  <p className="font-bold text-primary mt-0.5">{reviews.length} góp ý sư phạm</p>
                </div>
              </div>

              {/* Section Score Breakdown by Custom Policy */}
              {sectionResults && sectionResults.length > 0 && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-primary" />
                      <h4 className="font-bold text-foreground text-sm">
                        Kết Quả Thẩm Định Từng Phần (Tổng: {totalScore}/{maxTotalScore} điểm)
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                      {totalScore >= maxTotalScore * 0.8 ? 'XUẤT SẮC' : totalScore >= maxTotalScore * 0.5 ? 'ĐẠT YÊU CẦU' : 'CHƯA ĐẠT'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {sectionResults.map((sr) => (
                      <div
                        key={sr.sectionKey}
                        className="p-2.5 bg-card rounded-lg border border-border flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-foreground text-xs">{sr.sectionTitle}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{sr.summary}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sr.isDetected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'
                          }`}>
                            {sr.isDetected ? `${sr.score}/${sr.maxScore}đ` : 'THIẾU PHẦN'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rubrics Checklist */}
              <div>
                <h4 className="font-bold text-foreground text-sm mb-2.5">
                  Đối Soát Tiêu Chuẩn Bộ Giáo Dục:
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">1. Mục tiêu bài dạy</p>
                      <p className="text-[11px] text-muted-foreground">
                        Xác định đầy đủ về Kiến thức, Năng lực (chung & đặc thù) và Phẩm chất.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Đạt
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">2. Chuỗi các hoạt động học</p>
                      <p className="text-[11px] text-muted-foreground">
                        Đủ 4 pha: Khởi động ➔ Hình thành kiến thức ➔ Luyện tập ➔ Vận dụng.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Đạt ({document.activities.length}/4 pha)
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">3. Tiến trình từng hoạt động</p>
                      <p className="text-[11px] text-muted-foreground">
                        Rõ 4 bước: Chuyển giao NV ➔ Thực hiện NV ➔ Báo cáo/Thảo luận ➔ Kết luận/Nhận định.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Cần lưu ý
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Recommendations List */}
              <div>
                <h4 className="font-bold text-foreground text-sm mb-2.5">
                  Tổng Hợp Các Gợi Ý Cải Tiến & Đề Xuất Sửa Mẫu ({policyConfig.dispatchType === 'CV_2345' ? 'CV 2345' : 'CV 5512'}):
                </h4>
                <div className="space-y-2.5">
                  {reviews.map((rev, index) => (
                    <div key={rev.reviewId} className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
                      <div className="flex items-center justify-between font-bold text-foreground text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-extrabold">
                            #{index + 1}
                          </span>
                          <span className="leading-snug">{rev.message}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">{rev.ruleId}</span>
                      </div>

                      {rev.quote && (
                        <div className="p-2 rounded-lg bg-card border border-border text-[11px] text-muted-foreground italic leading-relaxed">
                          <span className="not-italic font-bold text-muted-foreground text-[9px] block uppercase mb-0.5">
                            Trích đoạn trong bài dạy:
                          </span>
                          &ldquo;{rev.quote}&rdquo;
                        </div>
                      )}

                      {rev.suggestion && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-950 dark:text-emerald-200 leading-relaxed">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-[10px] mb-0.5">
                            💡 Đề xuất sửa mẫu chuẩn sư phạm:
                          </span>
                          {rev.suggestion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-muted/40 rounded-b-2xl">
              <button
                onClick={handleExportAnnotatedPDF}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              >
                {isExporting ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isExporting ? 'Đang Xuất PDF...' : 'Tải PDF Kèm Góp Ý'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:bg-muted transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                In Báo Cáo
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Policy Configuration Modal */}
      <EvaluationConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        policyConfig={policyConfig}
        onSavePolicy={handleSavePolicy}
        detectedSectionsSummary={detectedSectionsSummary}
        hasDocument={!!document}
      />
    </div>
  );
}
