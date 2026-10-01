/**
 * Document Editor Annotation Service
 *
 * Phase 7.1: Production-ready DocumentEditor
 * Handles all annotation-related API calls
 */

import {
  EditorAnnotation,
  AnnotationGroup,
  AnnotationStatistics,
  GetAnnotationsResponse,
  UpdateAnnotationStatusRequest,
  UpdateAnnotationStatusResponse,
  AnnotationFilterType,
  GroupByType,
} from "@/components/document-editor/types";

const API_BASE = "/api/workflow";

/**
 * Get annotations for a workflow session
 */
export async function getAnnotations(sessionId: string): Promise<GetAnnotationsResponse> {
  const response = await fetch(`${API_BASE}/${sessionId}/annotations`);

  if (!response.ok) {
    throw new Error("Failed to get annotations");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to get annotations");
  }

  return {
    sessionId: data.sessionId,
    annotations: data.annotations,
    statistics: data.statistics,
    groups: data.groups,
  };
}

/**
 * Update annotation status
 */
export async function updateAnnotationStatus(
  sessionId: string,
  request: UpdateAnnotationStatusRequest
): Promise<UpdateAnnotationStatusResponse> {
  const response = await fetch(`${API_BASE}/${sessionId}/annotations/${request.annotationId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: request.status }),
  });

  if (!response.ok) {
    throw new Error("Failed to update annotation status");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to update annotation status");
  }

  return {
    success: data.success,
    annotation: data.annotation,
  };
}

/**
 * Filter annotations by type
 */
export function filterAnnotations(
  annotations: EditorAnnotation[],
  filter: AnnotationFilterType
): EditorAnnotation[] {
  if (filter === "ALL") {
    return annotations;
  }

  if (filter === "PASSED") {
    return annotations.filter((a) => a.ruleId === "PASSED");
  }

  return annotations.filter((a) => a.severity === filter);
}

/**
 * Group annotations by type
 */
export function groupAnnotations(
  annotations: EditorAnnotation[],
  groupBy: GroupByType
): AnnotationGroup[] {
  if (groupBy === "NONE") {
    return [{
      key: "all",
      label: "Tất cả",
      type: "section",
      annotations,
      count: annotations.length,
    }];
  }

  const groupsMap = new Map<string, EditorAnnotation[]>();

  for (const annotation of annotations) {
    let key: string;

    switch (groupBy) {
      case "SECTION":
        key = annotation.sectionId;
        break;
      case "ACTIVITY":
        key = annotation.activityId;
        break;
      case "SEVERITY":
        key = annotation.severity;
        break;
      case "RULE":
        key = annotation.ruleId;
        break;
      default:
        key = annotation.sectionId;
    }

    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(annotation);
  }

  return Array.from(groupsMap.entries()).map(([key, groupAnnotations]) => ({
    key,
    label: groupAnnotations[0].sectionName || groupAnnotations[0].activityTitle || "Unknown",
    type: groupBy.toLowerCase() as "section" | "activity" | "severity" | "rule",
    annotations: groupAnnotations,
    count: groupAnnotations.length,
  }));
}

/**
 * Calculate annotation statistics
 */
export function calculateStatistics(annotations: EditorAnnotation[]): AnnotationStatistics {
  const stats: AnnotationStatistics = {
    totalAnnotations: annotations.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    passed: 0,
  };

  for (const annotation of annotations) {
    if (annotation.ruleId === "PASSED") {
      stats.passed++;
    } else {
      switch (annotation.severity) {
        case "CRITICAL":
          stats.critical++;
          break;
        case "HIGH":
          stats.high++;
          break;
        case "MEDIUM":
          stats.medium++;
          break;
        case "LOW":
          stats.low++;
          break;
      }
    }
  }

  return stats;
}

/**
 * Get severity label
 */
function getSeverityLabel(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "Lỗi nghiêm trọng";
    case "HIGH":
      return "Cao";
    case "MEDIUM":
      return "Trung bình";
    case "LOW":
      return "Thấp";
    default:
      return "Không xác định";
  }
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "text-red-600 bg-red-50 border-red-200";
    case "HIGH":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "MEDIUM":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "LOW":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "PASSED":
      return "text-green-600 bg-green-50 border-green-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

/**
 * Get severity priority (for sorting)
 */
export function getSeverityPriority(severity: string): number {
  switch (severity) {
    case "CRITICAL":
      return 1;
    case "HIGH":
      return 2;
    case "MEDIUM":
      return 3;
    case "LOW":
      return 4;
    case "PASSED":
      return 5;
    default:
      return 6;
  }
}

/**
 * Sort annotations by position and severity
 */
export function sortAnnotations(annotations: EditorAnnotation[]): EditorAnnotation[] {
  return [...annotations].sort((a, b) => {
    // First by section
    if (a.sectionId !== b.sectionId) {
      return a.sectionId.localeCompare(b.sectionId);
    }
    // Then by paragraph
    if (a.paragraphIndex !== b.paragraphIndex) {
      return a.paragraphIndex - b.paragraphIndex;
    }
    // Then by severity
    return getSeverityPriority(a.severity) - getSeverityPriority(b.severity);
  });
}
