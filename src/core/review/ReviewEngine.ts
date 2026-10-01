/**
 * Review Engine
 *
 * Manages document review workflow with AI integration
 */

import type { DocumentTree } from "../document/DocumentTree";
import type { SectionNode } from "../document/types";
import type {
  Annotation,
  AnnotationContent,
  AnnotationSeverity,
  AnnotationType,
} from "../annotations/Annotation";
import {
  AnnotationRegistry,
  AnnotationStatus,
  createAnnotation,
} from "../annotations/Annotation";

// ============================================================================
// Review Types
// ============================================================================

export enum ReviewStatus {
  NotStarted = "NOT_STARTED",
  InProgress = "IN_PROGRESS",
  Complete = "COMPLETE",
  Failed = "FAILED",
}

export interface ReviewResult {
  status: ReviewStatus;
  overallScore?: number;
  annotations: Annotation[];
  sectionScores?: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface ReviewProgress {
  total: number;
  completed: number;
  current?: string;
  percentage: number;
}

// ============================================================================
// AI Provider Interface
// ============================================================================

export interface AIProvider {
  name: string;
  analyze(
    section: SectionNode,
    rules: ReviewRule[]
  ): Promise<AIAnalysisResult>;
}

export interface ReviewRule {
  id: string;
  code: string;
  name: string;
  description: string;
  severity: AnnotationSeverity;
  aiPrompt: string;
  sectionTypes?: string[];
}

export interface AIAnalysisResult {
  score: number;
  annotations: Array<{
    type: AnnotationType;
    severity: AnnotationSeverity;
    message: string;
    explanation?: string;
    suggestion?: string;
    proposedContent?: string;
    ruleCode?: string;
    position?: {
      start: number;
      end: number;
    };
  }>;
}

// ============================================================================
// Review Engine
// ============================================================================

export class ReviewEngine {
  private annotationRegistry: AnnotationRegistry;
  private aiProvider?: AIProvider;
  private status: ReviewStatus = ReviewStatus.NotStarted;
  private progress: ReviewProgress = {
    total: 0,
    completed: 0,
    percentage: 0,
  };

  constructor(options: { aiProvider?: AIProvider } = {}) {
    this.annotationRegistry = new AnnotationRegistry();
    this.aiProvider = options.aiProvider;
  }

  /**
   * Start review of document
   */
  async review(
    tree: DocumentTree,
    rules: ReviewRule[],
    options: {
      onProgress?: (progress: ReviewProgress) => void;
      onSectionComplete?: (sectionId: string, annotations: Annotation[]) => void;
    } = {}
  ): Promise<ReviewResult> {
    this.status = ReviewStatus.InProgress;
    this.annotationRegistry.clear();

    try {
      // Get all sections
      const sections = tree.findAll(
        (node) => node.type === "section"
      ) as Array<{ node: SectionNode; path: number[] }>;

      this.progress = {
        total: sections.length,
        completed: 0,
        percentage: 0,
      };

      const sectionScores: Record<string, number> = {};

      // Review each section
      for (const { node: section } of sections) {
        const sectionAttrs = section.attrs as { title?: string; sectionType?: string };
        this.progress.current = sectionAttrs?.title || "Untitled";
        options.onProgress?.(this.progress);

        // Filter rules applicable to this section
        const applicableRules = rules.filter((rule) => {
          if (!rule.sectionTypes || rule.sectionTypes.length === 0) {
            return true;
          }
          return rule.sectionTypes.includes(sectionAttrs?.sectionType || "");
        });

        if (applicableRules.length === 0) {
          this.progress.completed++;
          this.progress.percentage = (this.progress.completed / this.progress.total) * 100;
          continue;
        }

        // Analyze with AI
        if (this.aiProvider) {
          const result = await this.aiProvider.analyze(section, applicableRules);

          sectionScores[section.id] = result.score;

          // Create annotations
          const annotations: Annotation[] = [];
          for (const aiAnnotation of result.annotations) {
            const annotation = createAnnotation(
              {
                from: { path: [0], offset: aiAnnotation.position?.start || 0 },
                to: { path: [0], offset: aiAnnotation.position?.end || 0 },
              },
              {
                message: aiAnnotation.message,
                explanation: aiAnnotation.explanation,
                suggestion: aiAnnotation.suggestion,
                proposedContent: aiAnnotation.proposedContent,
                code: aiAnnotation.ruleCode,
              },
              {
                type: aiAnnotation.type,
                severity: aiAnnotation.severity,
                metadata: {
                  sectionId: section.id,
                  ruleCode: aiAnnotation.ruleCode,
                  createdBy: this.aiProvider.name,
                },
              }
            );

            this.annotationRegistry.add(annotation);
            annotations.push(annotation);
          }

          options.onSectionComplete?.(section.id, annotations);
        }

        this.progress.completed++;
        this.progress.percentage = (this.progress.completed / this.progress.total) * 100;
        options.onProgress?.(this.progress);
      }

      // Calculate overall score
      const scores = Object.values(sectionScores);
      const overallScore =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      this.status = ReviewStatus.Complete;

      return {
        status: ReviewStatus.Complete,
        overallScore,
        annotations: this.annotationRegistry.getAll(),
        sectionScores,
        metadata: {
          totalSections: sections.length,
          reviewedSections: this.progress.completed,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.status = ReviewStatus.Failed;
      return {
        status: ReviewStatus.Failed,
        annotations: [],
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Accept annotation
   */
  acceptAnnotation(annotationId: string): boolean {
    return this.annotationRegistry.updateStatus(annotationId, AnnotationStatus.Accepted);
  }

  /**
   * Reject annotation
   */
  rejectAnnotation(annotationId: string): boolean {
    return this.annotationRegistry.updateStatus(annotationId, AnnotationStatus.Rejected);
  }

  /**
   * Resolve annotation
   */
  resolveAnnotation(annotationId: string): boolean {
    return this.annotationRegistry.updateStatus(annotationId, AnnotationStatus.Resolved);
  }

  /**
   * Get annotations
   */
  getAnnotations(): Annotation[] {
    return this.annotationRegistry.getAll();
  }

  /**
   * Get annotation by ID
   */
  getAnnotation(id: string): Annotation | undefined {
    return this.annotationRegistry.get(id);
  }

  /**
   * Get review status
   */
  getStatus(): ReviewStatus {
    return this.status;
  }

  /**
   * Get progress
   */
  getProgress(): ReviewProgress {
    return { ...this.progress };
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.annotationRegistry.getStats();
  }

  /**
   * Set AI provider
   */
  setAIProvider(provider: AIProvider): void {
    this.aiProvider = provider;
  }

  /**
   * Clear all annotations
   */
  clear(): void {
    this.annotationRegistry.clear();
    this.status = ReviewStatus.NotStarted;
    this.progress = {
      total: 0,
      completed: 0,
      percentage: 0,
    };
  }
}
