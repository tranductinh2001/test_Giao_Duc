"use client";

import { useEffect, useState, useCallback } from "react";
import { getSeverityLabel, getSeverityColor, type SeverityType } from "@/lib/severity-labels";

import { ProcessingIndicator, type ProcessingStatus } from "@/lib/processing-status";

interface Annotation {
  id: string;
  sectionId: string;
  severity: SeverityType;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  startPosition: number;
  endPosition: number;
  highlightedText: string;
  message: string;
  explanation: string | null;
  suggestion: string | null;
  proposedContent: string | null;
}

interface Section {
  id: string;
  sectionType: string;
  sectionTitle: string | null;
  sectionOrder: number;
  rawContent: string;
}

interface FullDocumentViewerProps {
  lessonPlanId: string;
  sections: Section[];
  annotations: Annotation[];
  onAnnotationAction?: (annotationId: string, action: "accept" | "reject") => void;
  streamingEnabled?: boolean;
}

export default function FullDocumentViewer({
  lessonPlanId,
  sections,
  annotations: initialAnnotations,
  onAnnotationAction,
  streamingEnabled = false,
}: FullDocumentViewerProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());
  const [processingSections, setProcessingSections] = useState<Map<string, ProcessingStatus>>(new Map());

  // Update annotations when props change
  useEffect(() => {
    console.log("[FullDocumentViewer] Annotations updated:", initialAnnotations.length);
    setAnnotations(initialAnnotations);
  }, [initialAnnotations]);

  useEffect(() => {
    console.log("[FullDocumentViewer] Sections:", sections.length);
    console.log("[FullDocumentViewer] Current annotations:", annotations.length);
  }, [sections, annotations]);

  // Add new annotation from stream
  const addStreamingAnnotation = useCallback((newAnnotation: Annotation) => {
    setAnnotations(prev => [...prev, newAnnotation]);
    // Remove processing state for this section
    setProcessingSections(prev => {
      const next = new Map(prev);
      next.delete(newAnnotation.sectionId);
      return next;
    });
  }, []);

  // Set section processing status
  const setProcessing = useCallback((sectionId: string, status: ProcessingStatus | null) => {
    setProcessingSections(prev => {
      const next = new Map(prev);
      if (status) {
        next.set(sectionId, status);
      } else {
        next.delete(sectionId);
      }
      return next;
    });
  }, []);

  // Expose methods for parent component
  useEffect(() => {
    if (streamingEnabled) {
      (window as any).__documentViewerAPI = {
        addAnnotation: addStreamingAnnotation,
        setProcessing,
      };
    }
    return () => {
      delete (window as any).__documentViewerAPI;
    };
  }, [streamingEnabled, addStreamingAnnotation, setProcessing]);

  const toggleAnnotation = useCallback((annotationId: string) => {
    setExpandedAnnotations(prev => {
      const next = new Set(prev);
      if (next.has(annotationId)) {
        next.delete(annotationId);
      } else {
        next.add(annotationId);
      }
      return next;
    });
  }, []);

  const renderSectionWithAnnotations = (section: Section) => {
    const sectionAnnotations = annotations.filter(a => a.sectionId === section.id);
    const processingStatus = processingSections.get(section.id);

    if (sectionAnnotations.length === 0 && !processingStatus) {
      // Không có annotations, hiển thị nguyên bản
      return (
        <div key={section.id} className="section-content" id={`section-${section.id}`}>
          {section.sectionTitle && (
            <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">
              {section.sectionTitle}
            </h3>
          )}
          <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {section.rawContent}
          </div>
        </div>
      );
    }

    // Có annotations - cần highlight
    const content = section.rawContent;
    const segments: Array<{ text: string; annotation?: Annotation }> = [];

    // Sort annotations by position
    const sortedAnnotations = [...sectionAnnotations].sort((a, b) => a.startPosition - b.startPosition);

    let lastIndex = 0;

    sortedAnnotations.forEach(ann => {
      // Text trước annotation
      if (ann.startPosition > lastIndex) {
        segments.push({ text: content.slice(lastIndex, ann.startPosition) });
      }

      // Text được highlight
      segments.push({
        text: content.slice(ann.startPosition, ann.endPosition),
        annotation: ann,
      });

      lastIndex = ann.endPosition;
    });

    // Text còn lại
    if (lastIndex < content.length) {
      segments.push({ text: content.slice(lastIndex) });
    }

    return (
      <div key={section.id} className="section-content" id={`section-${section.id}`}>
        {section.sectionTitle && (
          <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2 flex items-center gap-2">
            {section.sectionTitle}
            {processingStatus && <ProcessingIndicator status={processingStatus} />}
          </h3>
        )}

        <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
          {segments.map((seg, idx) => {
            if (!seg.annotation) {
              return <span key={idx}>{seg.text}</span>;
            }

            const ann = seg.annotation;
            const color = getSeverityColor(ann.severity);
            const isExpanded = expandedAnnotations.has(ann.id);

            return (
              <span key={idx} className="relative inline">
                <span
                  className={`cursor-pointer ${color.bg} ${color.text} px-1 rounded border-b-2 ${color.border} hover:opacity-80 transition-opacity`}
                  onClick={() => toggleAnnotation(ann.id)}
                  title={`${getSeverityLabel(ann.severity)}: ${ann.message}`}
                >
                  {seg.text}
                </span>

                {isExpanded && (
                  <div className={`absolute z-10 mt-1 p-3 rounded-lg shadow-lg border ${color.border} ${color.bg} min-w-[300px] max-w-[500px]`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold ${color.badge} px-2 py-1 rounded`}>
                        {getSeverityLabel(ann.severity)}
                      </span>
                      <button
                        onClick={() => toggleAnnotation(ann.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-sm font-semibold mb-1">{ann.message}</p>

                    {ann.explanation && (
                      <p className="text-xs text-gray-600 mb-2">{ann.explanation}</p>
                    )}

                    {ann.suggestion && (
                      <div className="text-xs mt-2 p-2 bg-white rounded border">
                        <strong>💡 Đề xuất:</strong> {ann.suggestion}
                      </div>
                    )}

                    {ann.proposedContent && (
                      <div className="text-xs mt-2 p-2 bg-green-50 rounded border border-green-200">
                        <strong>✏️ Nội dung đề xuất:</strong>
                        <pre className="whitespace-pre-wrap mt-1">{ann.proposedContent}</pre>
                      </div>
                    )}

                    {ann.status === "PENDING" && onAnnotationAction && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => onAnnotationAction(ann.id, "accept")}
                          className="flex-1 text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        >
                          Chấp nhận
                        </button>
                        <button
                          onClick={() => onAnnotationAction(ann.id, "reject")}
                          className="flex-1 text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="full-document-viewer bg-white rounded-lg shadow-sm p-6 space-y-6">
      {sections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">Không có nội dung để hiển thị</p>
          <p className="text-sm">Vui lòng parse giáo án trước khi review</p>
        </div>
      ) : (
        sections.map(section => renderSectionWithAnnotations(section))
      )}
    </div>
  );
}
