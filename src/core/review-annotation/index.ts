/**
 * Review Annotation Engine
 *
 * Phase 6: Converts Review Results to Annotations
 * Pipeline: Review Result → Annotation Builder → Annotation Collection → Frontend
 */

// Types
export {
  AnnotationSeverity,
  AnnotationStatus,
  AnnotationFilter,
  AnnotationGroupBy,
} from "./types";

export type {
  Annotation,
  AnnotationCollection,
  AnnotationGroup,
  AnnotationStatistics,
  AnnotationFilters,
  AnnotationNavigation,
  ParagraphMapping,
  DocumentParagraphs,
  SectionParagraphs,
  AnnotationEngineInput,
  ReviewSessionInput,
  ActivityReviewInput,
  IssueInput,
  AnnotationConfig,
  GetAnnotationsResponse,
  GetStatisticsResponse,
  GetNavigationResponse,
  GroupAnnotationsRequest,
  FilterAnnotationsRequest,
} from "./types";

export { DEFAULT_ANNOTATION_CONFIG } from "./types";

// Engine
export { ReviewAnnotationEngine, reviewAnnotationEngine } from "./engine/ReviewAnnotationEngine";
