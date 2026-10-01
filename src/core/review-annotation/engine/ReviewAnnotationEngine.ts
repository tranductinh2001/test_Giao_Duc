/**
 * Review Annotation Engine
 *
 * Phase 6: Converts Review Results to Annotations
 * Pipeline: Review Result → Annotation Builder → Annotation Collection → Frontend
 */

import {
  AnnotationSeverity,
  AnnotationStatus,
  AnnotationFilter,
  AnnotationGroupBy,
  Annotation,
  AnnotationCollection,
  AnnotationGroup,
  AnnotationStatistics,
  AnnotationFilters,
  AnnotationNavigation,
  DocumentParagraphs,
  ParagraphMapping,
  AnnotationEngineInput,
  ActivityReviewInput,
  IssueInput,
  AnnotationConfig,
  DEFAULT_ANNOTATION_CONFIG,
} from "../types";

export class ReviewAnnotationEngine {
  private config: AnnotationConfig;
  private annotations: Map<string, Annotation> = new Map();
  private paragraphMappings: Map<string, ParagraphMapping> = new Map();

  constructor(config: Partial<AnnotationConfig> = {}) {
    this.config = { ...DEFAULT_ANNOTATION_CONFIG, ...config };
  }

  /**
   * Build annotation collection from review results
   */
  build(input: AnnotationEngineInput): AnnotationCollection {
    const { sessionId, lessonPlanId, reviewSession, paragraphs } = input;

    // Clear previous annotations
    this.annotations.clear();
    this.paragraphMappings.clear();

    // Build paragraph mappings
    if (paragraphs) {
      this.buildParagraphMappings(paragraphs);
    }

    // Create annotations from review results
    const annotations: Annotation[] = [];

    for (const activity of reviewSession.activities) {
      const activityAnnotations = this.createAnnotationsForActivity(
        sessionId,
        lessonPlanId,
        activity
      );
      annotations.push(...activityAnnotations);
    }

    // Sort by position
    annotations.sort((a, b) => {
      if (a.sectionId !== b.sectionId) {
        return a.sectionId.localeCompare(b.sectionId);
      }
      if (a.paragraphIndex !== b.paragraphIndex) {
        return a.paragraphIndex - b.paragraphIndex;
      }
      return this.getSeverityOrder(a.severity) - this.getSeverityOrder(b.severity);
    });

    // Store annotations
    for (const annotation of annotations) {
      this.annotations.set(annotation.annotationId, annotation);
    }

    // Build collection
    return this.buildCollection(sessionId, lessonPlanId, annotations);
  }

  /**
   * Build paragraph mappings for quick lookup
   */
  private buildParagraphMappings(paragraphs: DocumentParagraphs): void {
    for (const section of paragraphs.sections) {
      for (const para of section.paragraphs) {
        const key = `${section.sectionId}:${para.paragraphIndex}`;
        this.paragraphMappings.set(key, para);
      }
    }
  }

  /**
   * Create annotations for a single activity
   */
  private createAnnotationsForActivity(
    sessionId: string,
    lessonPlanId: string,
    activity: ActivityReviewInput
  ): Annotation[] {
    const annotations: Annotation[] = [];

    // If activity passed, create PASSED annotation
    if (activity.passed) {
      annotations.push(this.createPassedAnnotation(sessionId, activity));
      return annotations;
    }

    // Create annotations for each issue
    for (const issue of activity.issues) {
      const annotation = this.createAnnotationFromIssue(
        sessionId,
        lessonPlanId,
        activity,
        issue
      );
      annotations.push(annotation);
    }

    return annotations;
  }

  /**
   * Create annotation from issue
   */
  private createAnnotationFromIssue(
    sessionId: string,
    lessonPlanId: string,
    activity: ActivityReviewInput,
    issue: IssueInput
  ): Annotation {
    // Determine offset from paragraph mapping
    const offset = this.getParagraphOffset(
      activity.sectionName,
      issue.paragraphIndex
    );

    // Map severity
    const severity = this.mapSeverity(issue.severity);

    const annotation: Annotation = {
      annotationId: this.generateId(),
      sessionId,
      activityId: activity.activityId,
      activityCode: activity.activityCode,
      activityTitle: activity.activityTitle,
      sectionId: this.getSectionId(activity.sectionName),
      sectionName: activity.sectionName,
      paragraphIndex: issue.paragraphIndex ?? 0,
      startOffset: offset?.startOffset,
      endOffset: offset?.endOffset,
      severity,
      ruleId: issue.ruleId,
      ruleName: issue.ruleName || issue.ruleId,
      title: issue.title,
      description: issue.description,
      reason: issue.reason,
      suggestions: issue.suggestions || [],
      confidence: issue.confidence,
      status: AnnotationStatus.OPEN,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return annotation;
  }

  /**
   * Create PASSED annotation for activity
   */
  private createPassedAnnotation(
    sessionId: string,
    activity: ActivityReviewInput
  ): Annotation {
    return {
      annotationId: this.generateId(),
      sessionId,
      activityId: activity.activityId,
      activityCode: activity.activityCode,
      activityTitle: activity.activityTitle,
      sectionId: this.getSectionId(activity.sectionName),
      sectionName: activity.sectionName,
      paragraphIndex: 0,
      severity: AnnotationSeverity.LOW, // Passed is lowest severity
      ruleId: "PASSED",
      ruleName: "Passed",
      title: "Hoạt động đạt yêu cầu",
      description: `Hoạt động ${activity.activityTitle} đã đạt yêu cầu với điểm số ${activity.score}.`,
      reason: "Tất cả quy tắc đã được đáp ứng",
      suggestions: [],
      confidence: 100,
      status: AnnotationStatus.REVIEWED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get paragraph offset from mapping
   */
  private getParagraphOffset(
    sectionId: string,
    paragraphIndex?: number
  ): ParagraphMapping | null {
    if (paragraphIndex === undefined) return null;

    const key = `${sectionId}:${paragraphIndex}`;
    return this.paragraphMappings.get(key) || null;
  }

  /**
   * Map issue severity to annotation severity
   */
  private mapSeverity(severity: string): AnnotationSeverity {
    switch (severity.toUpperCase()) {
      case "ERROR":
        return AnnotationSeverity.CRITICAL;
      case "WARNING":
        return AnnotationSeverity.MEDIUM;
      case "INFO":
        return AnnotationSeverity.LOW;
      default:
        return AnnotationSeverity.MEDIUM;
    }
  }

  /**
   * Get severity order for sorting
   */
  private getSeverityOrder(severity: AnnotationSeverity): number {
    switch (severity) {
      case AnnotationSeverity.CRITICAL:
        return 1;
      case AnnotationSeverity.HIGH:
        return 2;
      case AnnotationSeverity.MEDIUM:
        return 3;
      case AnnotationSeverity.LOW:
        return 4;
      default:
        return 5;
    }
  }

  /**
   * Get section ID from section name
   */
  private getSectionId(sectionName: string): string {
    return sectionName.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  }

  /**
   * Build complete collection with groups and statistics
   */
  private buildCollection(
    sessionId: string,
    lessonPlanId: string,
    annotations: Annotation[]
  ): AnnotationCollection {
    const filters = this.buildFilters(annotations);
    const statistics = this.buildStatistics(annotations);
    const groups = this.config.enableGrouping
      ? this.buildGroups(annotations, AnnotationGroupBy.SECTION)
      : [];

    const navigation = this.config.enableNavigation
      ? this.buildNavigation(annotations)
      : this.buildEmptyNavigation();

    return {
      sessionId,
      lessonPlanId,
      annotations,
      groups,
      statistics,
      filters,
      navigation,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Build statistics
   */
  private buildStatistics(annotations: Annotation[]): AnnotationStatistics {
    const stats: AnnotationStatistics = {
      totalAnnotations: annotations.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      passed: 0,
      unknown: 0,
      byActivity: {},
      bySection: {},
      byRule: {},
    };

    for (const annotation of annotations) {
      // Count by severity
      switch (annotation.severity) {
        case AnnotationSeverity.CRITICAL:
          stats.critical++;
          break;
        case AnnotationSeverity.HIGH:
          stats.high++;
          break;
        case AnnotationSeverity.MEDIUM:
          stats.medium++;
          break;
        case AnnotationSeverity.LOW:
          if (annotation.ruleId === "PASSED") {
            stats.passed++;
          } else {
            stats.low++;
          }
          break;
        default:
          stats.unknown++;
      }

      // Count by activity
      stats.byActivity[annotation.activityId] =
        (stats.byActivity[annotation.activityId] || 0) + 1;

      // Count by section
      stats.bySection[annotation.sectionId] =
        (stats.bySection[annotation.sectionId] || 0) + 1;

      // Count by rule
      stats.byRule[annotation.ruleId] =
        (stats.byRule[annotation.ruleId] || 0) + 1;
    }

    return stats;
  }

  /**
   * Build filters
   */
  private buildFilters(annotations: Annotation[]): AnnotationFilters {
    const severities = Array.from(new Set(annotations.map((a) => a.severity)));
    const activities = Array.from(new Set(annotations.map((a) => a.activityId)));
    const sections = Array.from(new Set(annotations.map((a) => a.sectionId)));
    const rules = Array.from(new Set(annotations.map((a) => a.ruleId)));
    const statuses = Array.from(new Set(annotations.map((a) => a.status)));

    return {
      severities,
      activities,
      sections,
      rules,
      status: statuses,
    };
  }

  /**
   * Build groups
   */
  private buildGroups(
    annotations: Annotation[],
    groupBy: AnnotationGroupBy
  ): AnnotationGroup[] {
    const groups: Map<string, AnnotationGroup> = new Map();

    for (const annotation of annotations) {
      let key: string;
      let label: string;
      let type: "section" | "activity" | "severity" | "rule";

      switch (groupBy) {
        case AnnotationGroupBy.SECTION:
          key = annotation.sectionId;
          label = annotation.sectionName;
          type = "section";
          break;
        case AnnotationGroupBy.ACTIVITY:
          key = annotation.activityId;
          label = annotation.activityTitle;
          type = "activity";
          break;
        case AnnotationGroupBy.SEVERITY:
          key = annotation.severity;
          label = this.getSeverityLabel(annotation.severity);
          type = "severity";
          break;
        case AnnotationGroupBy.RULE:
          key = annotation.ruleId;
          label = annotation.ruleName;
          type = "rule";
          break;
        default:
          key = annotation.sectionId;
          label = annotation.sectionName;
          type = "section";
      }

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label,
          type,
          annotations: [],
          count: 0,
        });
      }

      const group = groups.get(key)!;
      group.annotations.push(annotation);
      group.count++;
    }

    return Array.from(groups.values());
  }

  /**
   * Get severity label
   */
  private getSeverityLabel(severity: AnnotationSeverity): string {
    switch (severity) {
      case AnnotationSeverity.CRITICAL:
        return "Lỗi nghiêm trọng";
      case AnnotationSeverity.HIGH:
        return "Cảnh báo cao";
      case AnnotationSeverity.MEDIUM:
        return "Cảnh báo";
      case AnnotationSeverity.LOW:
        return "Gợi ý";
      default:
        return "Không xác định";
    }
  }

  /**
   * Build navigation
   */
  private buildNavigation(annotations: Annotation[]): AnnotationNavigation {
    const totalCount = annotations.length;

    if (totalCount === 0) {
      return this.buildEmptyNavigation();
    }

    const buildNav = (index: number): AnnotationNavigation => {
      const hasNext = index < totalCount - 1;
      const hasPrevious = index > 0;

      return {
        currentIndex: index,
        totalCount,
        hasNext,
        hasPrevious,
        current: annotations[index] || null,
        previous: hasPrevious ? annotations[index - 1] : null,
        next: hasNext ? annotations[index + 1] : null,
        byIndex: (i: number) => (i >= 0 && i < totalCount ? annotations[i] : null),
      };
    };

    return buildNav(0);
  }

  /**
   * Build empty navigation
   */
  private buildEmptyNavigation(): AnnotationNavigation {
    return {
      currentIndex: 0,
      totalCount: 0,
      hasNext: false,
      hasPrevious: false,
      current: null,
      previous: null,
      next: null,
      byIndex: () => null,
    };
  }

  /**
   * Filter annotations
   */
  filter(annotations: Annotation[], filter: AnnotationFilter): Annotation[] {
    switch (filter) {
      case AnnotationFilter.CRITICAL:
        return annotations.filter((a) => a.severity === AnnotationSeverity.CRITICAL);
      case AnnotationFilter.HIGH:
        return annotations.filter((a) => a.severity === AnnotationSeverity.HIGH);
      case AnnotationFilter.MEDIUM:
        return annotations.filter((a) => a.severity === AnnotationSeverity.MEDIUM);
      case AnnotationFilter.LOW:
        return annotations.filter(
          (a) =>
            a.severity === AnnotationSeverity.LOW && a.ruleId !== "PASSED"
        );
      case AnnotationFilter.PASSED:
        return annotations.filter((a) => a.ruleId === "PASSED");
      case AnnotationFilter.UNKNOWN:
        return annotations.filter(
          (a) =>
            a.severity !== AnnotationSeverity.CRITICAL &&
            a.severity !== AnnotationSeverity.HIGH &&
            a.severity !== AnnotationSeverity.MEDIUM &&
            a.severity !== AnnotationSeverity.LOW
        );
      default:
        return annotations;
    }
  }

  /**
   * Group annotations
   */
  group(
    annotations: Annotation[],
    groupBy: AnnotationGroupBy
  ): AnnotationGroup[] {
    return this.buildGroups(annotations, groupBy);
  }

  /**
   * Navigate to annotation by index
   */
  navigate(annotations: Annotation[], index: number): AnnotationNavigation {
    const totalCount = annotations.length;

    if (totalCount === 0 || index < 0 || index >= totalCount) {
      return this.buildEmptyNavigation();
    }

    return {
      currentIndex: index,
      totalCount,
      hasNext: index < totalCount - 1,
      hasPrevious: index > 0,
      current: annotations[index],
      previous: index > 0 ? annotations[index - 1] : null,
      next: index < totalCount - 1 ? annotations[index + 1] : null,
      byIndex: (i: number) => (i >= 0 && i < totalCount ? annotations[i] : null),
    };
  }

  /**
   * Get annotation by ID
   */
  getById(annotationId: string): Annotation | null {
    return this.annotations.get(annotationId) || null;
  }

  /**
   * Get annotations for activity
   */
  getByActivity(activityId: string): Annotation[] {
    return Array.from(this.annotations.values()).filter(
      (a) => a.activityId === activityId
    );
  }

  /**
   * Get annotations for section
   */
  getBySection(sectionId: string): Annotation[] {
    return Array.from(this.annotations.values()).filter(
      (a) => a.sectionId === sectionId
    );
  }

  /**
   * Update annotation status
   */
  updateStatus(
    annotationId: string,
    status: AnnotationStatus
  ): Annotation | null {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) return null;

    annotation.status = status;
    annotation.updatedAt = new Date();

    return annotation;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return "ann-" + "xxxxxxxx".replace(/x/g, () =>
      ((Math.random() * 16) | 0).toString(16)
    );
  }

  /**
   * Get config
   */
  getConfig(): AnnotationConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<AnnotationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const reviewAnnotationEngine = new ReviewAnnotationEngine();
