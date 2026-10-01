/**
 * Annotation Model
 *
 * Represents AI review comments and suggestions on the document
 */

import type { NodePosition, NodeRange } from "../document/types";

// ============================================================================
// Annotation Types
// ============================================================================

export enum AnnotationType {
  Comment = "comment",
  Suggestion = "suggestion",
  Issue = "issue",
  Highlight = "highlight",
}

export enum AnnotationSeverity {
  Info = "INFO",
  Warning = "WARNING",
  Error = "ERROR",
  Critical = "CRITICAL",
}

export enum AnnotationStatus {
  Pending = "PENDING",
  Accepted = "ACCEPTED",
  Rejected = "REJECTED",
  Resolved = "RESOLVED",
}

// ============================================================================
// Annotation Interface
// ============================================================================

export interface Annotation {
  /** Unique ID */
  id: string;

  /** Type of annotation */
  type: AnnotationType;

  /** Severity level */
  severity: AnnotationSeverity;

  /** Current status */
  status: AnnotationStatus;

  /** Range in document */
  range: NodeRange;

  /** Content */
  content: AnnotationContent;

  /** Metadata */
  metadata: AnnotationMetadata;
}

export interface AnnotationContent {
  /** Main message */
  message: string;

  /** Detailed explanation */
  explanation?: string;

  /** Suggestion text */
  suggestion?: string;

  /** Proposed replacement content */
  proposedContent?: string;

  /** Code or reference */
  code?: string;
}

export interface AnnotationMetadata {
  /** Which section this belongs to */
  sectionId?: string;

  /** Which rule triggered this */
  ruleId?: string;

  /** Rule code */
  ruleCode?: string;

  /** Created timestamp */
  createdAt: Date;

  /** Created by (AI provider, user, etc.) */
  createdBy: string;

  /** Updated timestamp */
  updatedAt?: Date;

  /** Additional data */
  [key: string]: any;
}

// ============================================================================
// Annotation Factory
// ============================================================================

export function createAnnotation(
  range: NodeRange,
  content: AnnotationContent,
  options: {
    id?: string;
    type?: AnnotationType;
    severity?: AnnotationSeverity;
    status?: AnnotationStatus;
    metadata?: Partial<AnnotationMetadata>;
  } = {}
): Annotation {
  return {
    id: options.id || `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: options.type || AnnotationType.Comment,
    severity: options.severity || AnnotationSeverity.Info,
    status: options.status || AnnotationStatus.Pending,
    range,
    content,
    metadata: {
      createdAt: new Date(),
      createdBy: "system",
      ...options.metadata,
    },
  };
}

// ============================================================================
// Annotation Registry
// ============================================================================

export class AnnotationRegistry {
  private annotations: Map<string, Annotation> = new Map();

  /**
   * Add annotation
   */
  add(annotation: Annotation): void {
    this.annotations.set(annotation.id, annotation);
  }

  /**
   * Remove annotation
   */
  remove(id: string): boolean {
    return this.annotations.delete(id);
  }

  /**
   * Get annotation by ID
   */
  get(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  /**
   * Get all annotations
   */
  getAll(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  /**
   * Update annotation
   */
  update(id: string, updates: Partial<Annotation>): boolean {
    const annotation = this.annotations.get(id);
    if (!annotation) {
      return false;
    }

    const updated: Annotation = {
      ...annotation,
      ...updates,
      metadata: {
        ...annotation.metadata,
        ...updates.metadata,
        updatedAt: new Date(),
      },
    };

    this.annotations.set(id, updated);
    return true;
  }

  /**
   * Update status
   */
  updateStatus(id: string, status: AnnotationStatus): boolean {
    return this.update(id, { status });
  }

  /**
   * Filter annotations
   */
  filter(predicate: (annotation: Annotation) => boolean): Annotation[] {
    return this.getAll().filter(predicate);
  }

  /**
   * Get by type
   */
  getByType(type: AnnotationType): Annotation[] {
    return this.filter((a) => a.type === type);
  }

  /**
   * Get by severity
   */
  getBySeverity(severity: AnnotationSeverity): Annotation[] {
    return this.filter((a) => a.severity === severity);
  }

  /**
   * Get by status
   */
  getByStatus(status: AnnotationStatus): Annotation[] {
    return this.filter((a) => a.status === status);
  }

  /**
   * Get by section
   */
  getBySection(sectionId: string): Annotation[] {
    return this.filter((a) => a.metadata.sectionId === sectionId);
  }

  /**
   * Count annotations
   */
  count(): number {
    return this.annotations.size;
  }

  /**
   * Count by severity
   */
  countBySeverity(): Record<AnnotationSeverity, number> {
    const counts = {
      [AnnotationSeverity.Info]: 0,
      [AnnotationSeverity.Warning]: 0,
      [AnnotationSeverity.Error]: 0,
      [AnnotationSeverity.Critical]: 0,
    };

    for (const annotation of this.annotations.values()) {
      counts[annotation.severity]++;
    }

    return counts;
  }

  /**
   * Count by status
   */
  countByStatus(): Record<AnnotationStatus, number> {
    const counts = {
      [AnnotationStatus.Pending]: 0,
      [AnnotationStatus.Accepted]: 0,
      [AnnotationStatus.Rejected]: 0,
      [AnnotationStatus.Resolved]: 0,
    };

    for (const annotation of this.annotations.values()) {
      counts[annotation.status]++;
    }

    return counts;
  }

  /**
   * Clear all
   */
  clear(): void {
    this.annotations.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    bySeverity: Record<AnnotationSeverity, number>;
    byStatus: Record<AnnotationStatus, number>;
    byType: Record<AnnotationType, number>;
  } {
    const byType = {
      [AnnotationType.Comment]: 0,
      [AnnotationType.Suggestion]: 0,
      [AnnotationType.Issue]: 0,
      [AnnotationType.Highlight]: 0,
    };

    for (const annotation of this.annotations.values()) {
      byType[annotation.type]++;
    }

    return {
      total: this.count(),
      bySeverity: this.countBySeverity(),
      byStatus: this.countByStatus(),
      byType,
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.getAll(), (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  }

  /**
   * Load from JSON
   */
  static fromJSON(json: string): AnnotationRegistry {
    const registry = new AnnotationRegistry();
    const annotations = JSON.parse(json, (key, value) => {
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value);
      }
      return value;
    });

    for (const annotation of annotations) {
      registry.add(annotation);
    }

    return registry;
  }
}
