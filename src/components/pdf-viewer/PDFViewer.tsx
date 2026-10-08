'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { DocumentIR, Paragraph } from '@/types/document';
import { Annotation } from '@/types/annotation';
import { Review } from '@/types/review';
import { pdfToScreen } from '@/lib/coordinate/mapper';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RotateCcw,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Sparkles,
  MessageSquare,
  X,
  Copy,
  Check,
  Target,
  ArrowRight,
} from 'lucide-react';

interface PDFViewerProps {
  document: DocumentIR;
  pdfData?: ArrayBuffer | null;
  annotations: Annotation[];
  reviews?: Review[];
  currentPage: number;
  selectedAnnotation: Annotation | null;
  hoveredReviewId?: string | null;
  onPageChange: (page: number) => void;
  onAnnotationClick: (annotation: Annotation) => void;
  onLoadSample?: () => void;
  onAskAI?: (context: { text: string; page: number; targetId: string; title?: string }) => void;
  onExport?: () => void;
  isExporting?: boolean;
}

export default function PDFViewer({
  document,
  pdfData,
  annotations,
  reviews = [],
  currentPage,
  selectedAnnotation,
  hoveredReviewId,
  onPageChange,
  onAnnotationClick,
  onLoadSample,
  onAskAI,
  onExport,
  isExporting = false,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const commentStreamRef = useRef<HTMLDivElement>(null);
  const commentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [copiedReviewId, setCopiedReviewId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReviewId(id);
    setTimeout(() => setCopiedReviewId(null), 2000);
  };

  const pageInfo =
    document.pages.find((p) => p.pageNumber === currentPage) ||
    document.pages[0] || { width: 595, height: 842, pageNumber: 1, rotation: 0 };

  const [scale, setScale] = useState(1.25);
  const [showHighlights, setShowHighlights] = useState(true);
  const [showMarginBubbles, setShowMarginBubbles] = useState(false);
  const [pageDimensions, setPageDimensions] = useState({
    width: (pageInfo?.width || 595) * 1.25,
    height: (pageInfo?.height || 842) * 1.25,
  });
  const [textContent, setTextContent] = useState<Paragraph[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<Annotation | null>(null);
  const [selectedParagraph, setSelectedParagraph] = useState<Paragraph | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isRenderingCanvas, setIsRenderingCanvas] = useState(false);

  // Map reviewId to 1-based index (#1, #2, ...)
  const reviewIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    reviews.forEach((r, idx) => map.set(r.reviewId, idx + 1));
    return map;
  }, [reviews]);

  // Load PDF document from pdfData
  useEffect(() => {
    if (!pdfData) {
      setPdfDoc(null);
      return;
    }

    const currentPdfData = pdfData;
    let isMounted = true;

    async function loadPdfDocument() {
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        }

        const bufferCopy = currentPdfData.slice(0);
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(bufferCopy),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });
        const loadedDoc = await loadingTask.promise;

        if (isMounted) {
          setPdfDoc(loadedDoc);
        }
      } catch (err) {
        console.warn('PDF Canvas loader error, attempting CDN worker fallback:', err);
        try {
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          const bufferCopy = currentPdfData.slice(0);
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bufferCopy) });
          const loadedDoc = await loadingTask.promise;
          if (isMounted) {
            setPdfDoc(loadedDoc);
          }
        } catch (cdnErr) {
          console.warn('PDF CDN loader fallback failed:', cdnErr);
        }
      }
    }

    loadPdfDocument();

    return () => {
      isMounted = false;
    };
  }, [pdfData]);

  // Render PDF to Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isMounted = true;

    async function renderPage() {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        setIsRenderingCanvas(true);
        const page = await pdfDoc.getPage(currentPage);
        if (!isMounted || !canvasRef.current) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Support Retina / High DPI displays for crisp rendering
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        const renderContext = {
          canvasContext: context,
          transform,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Canvas render error:', err);
        }
      } finally {
        if (isMounted) {
          setIsRenderingCanvas(false);
        }
      }
    }

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale]);

  // Update page dimensions and text content
  useEffect(() => {
    if (!pageInfo) return;

    setPageDimensions({
      width: pageInfo.width * scale,
      height: pageInfo.height * scale,
    });

    const pageParagraphs = document.paragraphs.filter((p) => p.page === currentPage);
    setTextContent(pageParagraphs);
    setActiveTooltip(null);
    setSelectedParagraph(null);
  }, [currentPage, pageInfo, document.paragraphs, scale]);

  // Sync active tooltip with selectedAnnotation and smooth scroll into view
  useEffect(() => {
    if (selectedAnnotation && selectedAnnotation.page === currentPage) {
      setActiveTooltip(selectedAnnotation);
      if (containerRef.current) {
        const screenPos = pdfToScreen(selectedAnnotation.bbox, pageInfo.height, scale);
        containerRef.current.scrollTo({
          top: Math.max(0, screenPos.y - 120),
          behavior: 'smooth',
        });
      }
    }
  }, [selectedAnnotation, currentPage, pageInfo.height, scale]);

  // Sync active tooltip with hoveredReviewId from outside
  useEffect(() => {
    if (hoveredReviewId) {
      const match = annotations.find((a) => a.reviewId === hoveredReviewId);
      if (match && match.page === currentPage) {
        setActiveTooltip(match);
      }
    }
  }, [hoveredReviewId, annotations, currentPage]);

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(Number((s + 0.2).toFixed(2)), 2.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(Number((s - 0.2).toFixed(2)), 0.6));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1.2);
  }, []);

  const handleFitWidth = useCallback(() => {
    if (!containerRef.current || !pageInfo) return;
    const containerWidth = containerRef.current.clientWidth - 64;
    const fitScale = containerWidth / pageInfo.width;
    setScale(Number(Math.min(Math.max(fitScale, 0.6), 2.0).toFixed(2)));
  }, [pageInfo]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < document.pages.length) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, document.pages.length, onPageChange]);

  const pageAnnotations = useMemo(
    () => annotations.filter((a) => a.page === currentPage),
    [annotations, currentPage]
  );

  // Precompute non-overlapping right-edge pin positions for this page
  const pinPositions = useMemo(() => {
    const sorted = [...pageAnnotations].sort((a, b) => {
      const posA = pdfToScreen(a.bbox, pageInfo.height, scale);
      const posB = pdfToScreen(b.bbox, pageInfo.height, scale);
      return posA.y - posB.y;
    });

    const positions = new Map<string, number>();
    let lastY = -999;
    const minPinGap = 26;

    for (const ann of sorted) {
      const pos = pdfToScreen(ann.bbox, pageInfo.height, scale);
      let targetY = pos.y + pos.height / 2;
      if (targetY < lastY + minPinGap) {
        targetY = lastY + minPinGap;
      }
      positions.set(ann.annotationId, targetY);
      lastY = targetY;
    }

    return positions;
  }, [pageAnnotations, pageInfo.height, scale]);

  // Precompute non-overlapping pill badge X-offsets for highlights on the same line/paragraph
  const badgeOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    const sorted = [...pageAnnotations].sort((a, b) => {
      const posA = pdfToScreen(a.bbox, pageInfo.height, scale);
      const posB = pdfToScreen(b.bbox, pageInfo.height, scale);
      if (Math.abs(posA.y - posB.y) < 18) {
        return posA.x - posB.x;
      }
      return posA.y - posB.y;
    });

    const groups: Annotation[][] = [];
    for (const ann of sorted) {
      const pos = pdfToScreen(ann.bbox, pageInfo.height, scale);
      let added = false;
      for (const group of groups) {
        const firstPos = pdfToScreen(group[0].bbox, pageInfo.height, scale);
        if (Math.abs(pos.y - firstPos.y) < 20) {
          group.push(ann);
          added = true;
          break;
        }
      }
      if (!added) {
        groups.push([ann]);
      }
    }

    for (const group of groups) {
      group.forEach((ann, index) => {
        offsets.set(ann.annotationId, index * 32);
      });
    }

    return offsets;
  }, [pageAnnotations, pageInfo.height, scale]);

  // Sync comment scroll when active tooltip / selected annotation changes
  useEffect(() => {
    const activeId = selectedAnnotation?.annotationId || activeTooltip?.annotationId;
    if (activeId && showMarginBubbles) {
      const el = commentRefs.current.get(activeId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeTooltip, selectedAnnotation, showMarginBubbles]);

  const isDocx = document.metadata.filename?.toLowerCase().endsWith('.docx');
  const isScannedPdf = !isDocx && document.paragraphs.length === 0;

  return (
    <div className="h-full flex flex-col bg-muted/30 select-none">
      {/* Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-card/90 backdrop-blur-md border-b border-border shadow-2xs z-10">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border/50">
            <span>Trang</span>
            <input
              type="number"
              min={1}
              max={document.pages.length}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= document.pages.length) {
                  onPageChange(val);
                }
              }}
              className="w-9 text-center bg-background border border-border rounded-md text-xs py-0.5 font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted-foreground">/ {document.pages.length}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= document.pages.length}
            className="p-1.5 rounded-lg text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Legend & Stats */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/60">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-2xs" />
            <span>Lỗi ({pageAnnotations.filter((a) => a.color.includes('FFEB') || a.color.includes('FFCD')).length})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-2xs" />
            <span>Cảnh báo ({pageAnnotations.filter((a) => a.color.includes('FFF3')).length})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary shadow-2xs" />
            <span>Gợi ý ({pageAnnotations.filter((a) => a.color.includes('E3F2')).length})</span>
          </span>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowHighlights(!showHighlights)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              showHighlights
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'
            }`}
            title={showHighlights ? 'Ẩn lớp đánh dấu' : 'Hiện lớp đánh dấu'}
          >
            {showHighlights ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Đánh dấu</span>
          </button>

          <button
            onClick={() => setShowMarginBubbles(!showMarginBubbles)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              showMarginBubbles
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                : 'bg-muted text-muted-foreground border-transparent hover:text-foreground'
            }`}
            title={showMarginBubbles ? 'Ẩn hộp thoại nhận xét lề' : 'Hiện hộp thoại nhận xét lề (Comment Balloons)'}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Hộp nhận xét ({pageAnnotations.length})</span>
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="inline-flex items-center bg-muted rounded-lg p-0.5 border border-border/50 text-xs">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
              title="Thu nhỏ (-20%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="font-semibold text-foreground px-2 min-w-[42px] text-center text-xs">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
              title="Phóng to (+20%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleFitWidth}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
              title="Vừa chiều rộng"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
              title="Đặt lại 100%"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Document Canvas View */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-6 md:p-8 flex flex-col items-center"
        onClick={() => {
          setActiveTooltip(null);
          setSelectedParagraph(null);
        }}
      >
        {/* Scanned PDF Warning Banner */}
        {isScannedPdf && (
          <div className="w-full max-w-2xl mb-4 p-4 bg-amber-50 border border-amber-300 rounded-2xl shadow-sm text-xs text-amber-900 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm text-amber-950">
                Tài liệu PDF Scan / Ảnh (Không có lớp văn bản)
              </p>
              <p className="mt-1 text-slate-600 leading-relaxed">
                File giáo án này được tạo từ ảnh chụp hoặc máy scan nên không chứa text để AI bóc tách các mục (Mục tiêu, Hoạt động GV, Hoạt động HS). Bản vẽ trang PDF gốc vẫn được hiển thị bên dưới. Để chấm điểm chi tiết 12 tiêu chí, vui lòng sử dụng file PDF xuất từ Word hoặc bấm thử mẫu chuẩn dưới đây:
              </p>
              {onLoadSample && (
                <button
                  onClick={onLoadSample}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  Dùng Thử Giáo Án Mẫu Có Text Chuẩn
                </button>
              )}
            </div>
          </div>
        )}

        {/* Document Canvas and Margin Speech Bubbles Stream */}
        <div className="flex items-start justify-center gap-6 w-full max-w-full">
          {/* Paper Sheet */}
          <div
            className="paper-sheet flex-shrink-0 mx-auto bg-white select-text relative shadow-lg rounded-md"
            style={{
              width: pageDimensions.width,
              height: pageDimensions.height,
              minHeight: pageDimensions.height,
            }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Subtle Page Watermark Header */}
          <div className="absolute top-2 left-4 right-4 flex items-center justify-between text-[10px] text-slate-300 pointer-events-none select-none border-b border-slate-100 pb-1 z-10">
            <span>{document.metadata.filename}</span>
            <span>Trang {currentPage} / {document.pages.length}</span>
          </div>

          {/* Actual PDF Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block rounded-md pointer-events-none z-0"
            style={{
              width: pageDimensions.width,
              height: pageDimensions.height,
            }}
          />

          {/* Canvas Rendering Spinner */}
          {isRenderingCanvas && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-xs z-10 pointer-events-none rounded-md">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 text-white text-xs font-medium shadow-lg">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Đang hiển thị trang PDF...</span>
              </div>
            </div>
          )}

          {/* Text Content Layer */}
          <div className="absolute inset-0 overflow-hidden z-5 select-text">
            {textContent.map((paragraph) => (
              <div
                key={paragraph.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedParagraph(paragraph);
                }}
                className={`absolute leading-relaxed rounded-xs cursor-pointer transition-colors ${
                  pdfDoc ? 'text-transparent hover:bg-indigo-50/30' : 'text-slate-800 hover:bg-blue-50/40'
                }`}
                style={{
                  left: paragraph.bbox.x * scale,
                  top: paragraph.bbox.y * scale,
                  width: Math.max(paragraph.bbox.width * scale, 120),
                  minHeight: Math.max(paragraph.bbox.height * scale, 14),
                  fontSize: Math.max((paragraph.style?.fontSize || 11) * scale, 9),
                  fontWeight:
                    paragraph.type.startsWith('heading') || paragraph.style?.fontWeight === 'bold'
                      ? '700'
                      : '400',
                  textAlign: paragraph.style?.textAlign || 'left',
                  fontFamily: '"Times New Roman", Times, Georgia, serif',
                  display: 'block',
                  padding: '1px 2px',
                }}
                title="Bấm vào để hỏi AI về đoạn văn bản này"
              >
                <span className="whitespace-pre-wrap break-words">
                  {paragraph.text}
                </span>
              </div>
            ))}
          </div>

          {/* Contextual Ask AI floating button for clicked paragraph */}
          {selectedParagraph && (
            <div
              className="absolute z-40 bg-white rounded-xl shadow-xl border border-indigo-200 p-2.5 max-w-xs transform -translate-y-full -translate-x-1/2 animate-in fade-in zoom-in-95 pointer-events-auto"
              style={{
                left: Math.min(
                  Math.max(selectedParagraph.bbox.x * scale + (selectedParagraph.bbox.width * scale) / 2, 120),
                  pageDimensions.width - 130
                ),
                top: Math.max(selectedParagraph.bbox.y * scale - 10, 30),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
                <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" /> Đoạn được chọn
                </span>
                <button
                  onClick={() => setSelectedParagraph(null)}
                  className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-slate-700 line-clamp-2 italic mb-2">
                &ldquo;{selectedParagraph.text}&rdquo;
              </p>
              <button
                onClick={() => {
                  onAskAI?.({
                    text: selectedParagraph.text,
                    page: selectedParagraph.page,
                    targetId: selectedParagraph.id,
                    title: `Đoạn trang ${selectedParagraph.page}`,
                  });
                  setSelectedParagraph(null);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Hỏi Trợ lý AI về đoạn này</span>
              </button>
            </div>
          )}

          {/* Annotation Highlight Layer */}
          {showHighlights && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {pageAnnotations.map((annotation) => {
                const review = reviews.find((r) => r.reviewId === annotation.reviewId);
                const isSelected = selectedAnnotation?.annotationId === annotation.annotationId;
                const isHoveredByPanel = hoveredReviewId === annotation.reviewId;
                const isHovered = activeTooltip?.annotationId === annotation.annotationId;
                const reviewNum = review ? reviewIndexMap.get(review.reviewId) || 1 : 1;

                const screenPos = pdfToScreen(
                  annotation.bbox,
                  pageInfo.height,
                  scale
                );

                const isRed = annotation.color.includes('FFEB') || annotation.color.includes('FFCD');
                const isOrange = annotation.color.includes('FFF3');
                const accentColor = isRed ? '#ef4444' : isOrange ? '#f59e0b' : '#3b82f6';
                const badgeBg = isRed ? '#dc2626' : isOrange ? '#d97706' : '#2563eb';

                // Non-overlapping vertical position for right margin pin marker
                const pinY = pinPositions.get(annotation.annotationId) ?? (screenPos.y + screenPos.height / 2);

                return (
                  <div key={annotation.annotationId}>
                    {/* Bounding Box Highlight with interactive hover */}
                    <div
                      className={`annotation-highlight ${
                        isSelected || isHoveredByPanel ? 'selected' : ''
                      }`}
                      style={{
                        left: Math.max(screenPos.x - 3, 0),
                        top: Math.max(screenPos.y - 2, 0),
                        width: screenPos.width + 6,
                        height: screenPos.height + 4,
                        backgroundColor: annotation.color,
                        opacity: isSelected || isHoveredByPanel ? 0.5 : isHovered ? 0.42 : 0.3,
                        border: `1.5px solid ${accentColor}`,
                        borderBottomWidth: '3px',
                      }}
                      onMouseEnter={() => setActiveTooltip(annotation)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTooltip(annotation);
                        onAnnotationClick(annotation);
                      }}
                      title={annotation.comments[0]?.content || review?.message || ''}
                    >
                      {/* Pinned Pill Badge `#1`, `#2` on the Highlight itself with calculated horizontal offset */}
                      <div
                        className="absolute -top-3.5 pointer-events-auto cursor-pointer transform transition-transform hover:scale-110 z-25"
                        style={{
                          backgroundColor: badgeBg,
                          left: badgeOffsets.get(annotation.annotationId) ?? 0,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTooltip(annotation);
                          onAnnotationClick(annotation);
                        }}
                      >
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold text-white shadow-xs flex items-center gap-0.5">
                          #{reviewNum}
                        </span>
                      </div>
                    </div>

                    {/* Right Margin Pin Marker with guaranteed non-overlapping Y */}
                    <div
                      className="absolute right-[-14px] pointer-events-auto cursor-pointer transform -translate-y-1/2 flex items-center justify-center transition-transform hover:scale-125 z-25"
                      style={{
                        top: pinY,
                      }}
                      onMouseEnter={() => setActiveTooltip(annotation)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTooltip(annotation);
                        onAnnotationClick(annotation);
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md text-[10px] font-bold ring-2 ring-white"
                        style={{ backgroundColor: accentColor }}
                        title={`Xem nhận xét #${reviewNum}`}
                      >
                        #{reviewNum}
                      </div>
                    </div>

                    {/* Interactive Popover Card with smart vertical flipping to avoid edge clipping */}
                    {(isSelected || isHovered) && (
                      <div
                        className="absolute z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 w-80 pointer-events-auto transform -translate-x-1/2 transition-all animate-in fade-in zoom-in-95"
                        style={{
                          left: Math.min(
                            Math.max(screenPos.x + screenPos.width / 2, 160),
                            pageDimensions.width - 170
                          ),
                          top:
                            screenPos.y > pageDimensions.height - 220
                              ? Math.max(screenPos.y - 190, 20)
                              : Math.max(screenPos.y + screenPos.height + 8, 20),
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Tooltip Header */}
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white"
                              style={{ backgroundColor: badgeBg }}
                            >
                              #{reviewNum}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800">
                              {isRed ? (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                              ) : isOrange ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <Info className="w-3.5 h-3.5 text-blue-500" />
                              )}
                              {review?.severity === 'CRITICAL'
                                ? 'Nghiêm trọng'
                                : review?.severity === 'ERROR'
                                ? 'Lỗi chuẩn'
                                : review?.severity === 'WARNING'
                                ? 'Cảnh báo'
                                : 'Gợi ý sư phạm'}
                            </span>
                          </div>
                          <button
                            onClick={() => setActiveTooltip(null)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Content */}
                        <p className="text-xs text-slate-800 leading-snug line-clamp-3">
                          {annotation.comments[0]?.content || review?.message}
                        </p>

                        {/* Suggestion if available */}
                        {review?.suggestion && (
                          <div className="mt-2 p-1.5 rounded-lg bg-amber-50/80 border border-amber-200/60 text-[10px] text-amber-900 leading-snug line-clamp-2">
                            <span className="font-semibold text-amber-800">💡 Đề xuất: </span>
                            {review.suggestion}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          <button
                            onClick={() => {
                              onAskAI?.({
                                text: `${review?.message || annotation.comments[0]?.content || ''}. ${
                                  review?.suggestion || ''
                                }`,
                                page: annotation.page,
                                targetId: annotation.targetId,
                                title: `Nhận xét #${reviewNum}`,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition-colors"
                            title="Hỏi Trợ lý AI cách chỉnh sửa mục này"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>Hỏi AI về mục này</span>
                          </button>

                          <button
                            onClick={() => onAnnotationClick(annotation)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5"
                          >
                            Chi tiết <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

          {/* Right Margin Speech Bubbles Stream (Hộp Thoại Nhận Xét Lề Chuẩn 5512) */}
          {showMarginBubbles && pageAnnotations.length > 0 && (
            <div
              ref={commentStreamRef}
              className="comment-stream hidden lg:flex flex-col gap-3 w-88 xl:w-96 flex-shrink-0 pt-1 pb-24"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-border text-xs font-bold text-foreground sticky top-0 bg-card/90 backdrop-blur-md py-1.5 z-10">
                <span className="flex items-center gap-1.5 text-primary">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Hộp Thoại Nhận Xét (Trang {currentPage})</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 shadow-2xs">
                  {pageAnnotations.length} ghi chú
                </span>
              </div>

              {pageAnnotations.map((annotation) => {
                const review = reviews.find((r) => r.reviewId === annotation.reviewId);
                const reviewNum = review ? reviewIndexMap.get(review.reviewId) || 1 : 1;
                const isSelected = selectedAnnotation?.annotationId === annotation.annotationId;
                const isHovered =
                  activeTooltip?.annotationId === annotation.annotationId ||
                  hoveredReviewId === annotation.reviewId;

                const isRed = annotation.color.includes('FFEB') || annotation.color.includes('FFCD');
                const isOrange = annotation.color.includes('FFF3');
                const badgeBg = isRed ? '#dc2626' : isOrange ? '#d97706' : 'var(--primary)';
                const cardBorder = isRed
                  ? 'border-l-rose-500'
                  : isOrange
                  ? 'border-l-amber-500'
                  : 'border-l-primary';

                return (
                  <div
                    key={annotation.annotationId}
                    ref={(el) => {
                      if (el) commentRefs.current.set(annotation.annotationId, el);
                    }}
                    onMouseEnter={() => setActiveTooltip(annotation)}
                    onClick={() => {
                      setActiveTooltip(annotation);
                      onAnnotationClick(annotation);
                    }}
                    className={`rounded-2xl p-4 bg-card border border-border border-l-4 ${cardBorder} transition-all cursor-pointer relative group ${
                      isSelected || isHovered
                        ? 'ring-4 ring-primary/20 shadow-lg border-primary bg-primary/5 scale-[1.01]'
                        : 'hover:border-border hover:shadow-xs'
                    }`}
                  >
                    {/* Left speech bubble pointer triangle */}
                    <div
                      className={`absolute -left-2 top-5 w-3.5 h-3.5 rotate-45 border-l border-b transition-colors ${
                        isSelected || isHovered
                          ? 'bg-primary/5 border-primary'
                          : 'bg-card border-border'
                      }`}
                    />

                    {/* Speech Bubble Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white shadow-2xs"
                          style={{ backgroundColor: badgeBg }}
                        >
                          #{reviewNum}
                        </span>
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                          {isRed ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          ) : isOrange ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <Info className="w-3.5 h-3.5 text-primary" />
                          )}
                          {isRed
                            ? 'Lỗi Sư Phạm (CV 5512)'
                            : isOrange
                            ? 'Cảnh Báo Sư Phạm'
                            : 'Gợi Ý Nâng Cao'}
                        </span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {review?.ruleId || annotation.targetId}
                      </span>
                    </div>

                    {/* Error Message */}
                    <h4 className="text-xs font-bold text-foreground leading-snug">
                      {review?.message || annotation.comments[0]?.content}
                    </h4>

                    {/* Quote block if available */}
                    {review?.quote && (
                      <div className="mt-2.5 p-2 rounded-xl bg-muted/50 border border-border/80 text-[11px] text-muted-foreground leading-relaxed">
                        <span className="not-italic font-bold text-muted-foreground text-[9px] block uppercase tracking-wider mb-0.5">
                          📄 Trích đoạn trong bài dạy:
                        </span>
                        <p className="italic text-foreground">&ldquo;{review.quote}&rdquo;</p>
                      </div>
                    )}

                    {/* Pedagogical mistake analysis */}
                    <div className="mt-2.5 p-2 rounded-xl bg-destructive/10 border border-destructive/20 text-[11px] text-destructive leading-relaxed">
                      <span className="font-bold text-destructive text-[10px] flex items-center gap-1 mb-0.5">
                        ⚠️ Sai lầm sư phạm:
                      </span>
                      <p>
                        {review?.errorDetail ||
                          'Chưa lượng hóa rõ ràng bằng động từ hành vi đo lường được theo hướng dẫn của Công văn 5512/BGDĐT.'}
                      </p>
                    </div>

                    {/* Suggestion / Rewrite Box */}
                    {review?.suggestion && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-950 dark:text-emerald-200 leading-relaxed">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[10px] flex items-center gap-1">
                            💡 Đề xuất sửa mẫu (Chuẩn 5512):
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(review.reviewId, review.suggestionExample || review.suggestion || '');
                            }}
                            className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20"
                            title="Sao chép mẫu câu sửa chuẩn"
                          >
                            {copiedReviewId === review.reviewId ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span className="font-bold">Đã chép!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5" />
                                <span>Sao chép mẫu</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="leading-relaxed">{review.suggestionExample || review.suggestion}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAskAI?.({
                            text: `${review?.message || ''}. ${review?.suggestion || ''}`,
                            page: annotation.page,
                            targetId: annotation.targetId,
                            title: `Nhận xét #${reviewNum}`,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[10px] transition-colors shadow-xs"
                        title="Hỏi AI cách chỉnh sửa mục này"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>Hỏi Trợ lý AI</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnnotationClick(annotation);
                        }}
                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 hover:underline"
                      >
                        <span>Đến vị trí</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
