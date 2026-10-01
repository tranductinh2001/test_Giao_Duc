/**
 * Review Annotation Engine Types
 *
 * Phase 6: Types for converting Review Results to Annotations
 */

// ============================================
// ENUMS
// ============================================

export enum AnnotationSeverity {
  CRITICAL = "CRITICAL",   // Error - must fix
  HIGH = "HIGH",           // Serious warning
  MEDIUM = "MEDIUM",       // Warning
  LOW = "LOW",             // Suggestion/Info
}

export enum AnnotationStatus {
  OPEN = "OPEN",
  REVIEWED = "REVIEWED",
  DISMISSED = "DISMISSED",
  FIXED = "FIXED",
}

export enum AnnotationFilter {
  ALL = "ALL",
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  PASSED = "PASSED",
  UNKNOWN = "UNKNOWN",
}

export enum AnnotationGroupBy {
  SECTION = "SECTION",
  ACTIVITY = "ACTIVITY",
  SEVERITY = "SEVERITY",
  RULE = "RULE",
}

// ============================================
// CORE INTERFACES
// ============================================

export interface Annotation {
  annotationId: string;
  sessionId: string;
  activityId: string;
  activityCode: string;
  activityTitle: string;
  sectionId: string;
  sectionName: string;
  paragraphIndex: number;
  startOffset?: number;
  endOffset?: number;
  severity: AnnotationSeverity;
  ruleId: string;
  ruleName: string;
  title: string;
  description: string;
  reason: string;
  suggestions: string[];
  confidence: number;
  status: AnnotationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationCollection {
  sessionId: string;
  lessonPlanId: string;
  annotations: Annotation[];
  groups: AnnotationGroup[];
  statistics: AnnotationStatistics;
  filters: AnnotationFilters;
  navigation: AnnotationNavigation;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationGroup {
  key: string;
  label: string;
  type: "section" | "activity" | "severity" | "rule";
  annotations: Annotation[];
  count: number;
}

export interface AnnotationStatistics {
  totalAnnotations: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  passed: number;
  unknown: number;
  byActivity: Record<string, number>;
  bySection: Record<string, number>;
  byRule: Record<string, number>;
}

export interface AnnotationFilters {
  severities: AnnotationSeverity[];
  activities: string[];
  sections: string[];
  rules: string[];
  status: AnnotationStatus[];
  paragraphIndex?: number;
}

export interface AnnotationNavigation {
  currentIndex: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
  current: Annotation | null;
  previous: Annotation | null;
  next: Annotation | null;
  byIndex: (index: number) => Annotation | null;
}

// ============================================
// PARAGRAPH MAPPING
// ============================================

export interface ParagraphMapping {
  paragraphIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  activityId?: string;
  sectionId?: string;
}

export interface DocumentParagraphs {
  sessionId: string;
  sections: SectionParagraphs[];
}

export interface SectionParagraphs {
  sectionId: string;
  sectionCode: string;
  sectionName: string;
  paragraphs: ParagraphMapping[];
}

// ============================================
// INPUT TYPES
// ============================================

export interface AnnotationEngineInput {
  sessionId: string;
  lessonPlanId: string;
  reviewSession: ReviewSessionInput;
  paragraphs?: DocumentParagraphs;
}

export interface ReviewSessionInput {
  sessionId: string;
  activities: ActivityReviewInput[];
}

export interface ActivityReviewInput {
  activityId: string;
  activityCode: string;
  activityTitle: string;
  sectionName: string;
  score: number;
  passed: boolean;
  issues: IssueInput[];
}

export interface IssueInput {
  ruleId: string;
  ruleName?: string;
  title: string;
  description: string;
  reason: string;
  severity: "ERROR" | "WARNING" | "INFO";
  paragraphIndex?: number;
  suggestions?: string[];
  confidence: number;
}

// ============================================
// CONFIG
// ============================================

export interface AnnotationConfig {
  enableGrouping: boolean;
  enableStatistics: boolean;
  enableNavigation: boolean;
  defaultGroupBy: AnnotationGroupBy;
  defaultFilter: AnnotationFilter;
  maxAnnotations: number;
}

export const DEFAULT_ANNOTATION_CONFIG: AnnotationConfig = {
  enableGrouping: true,
  enableStatistics: true,
  enableNavigation: true,
  defaultGroupBy: AnnotationGroupBy.SECTION,
  defaultFilter: AnnotationFilter.ALL,
  maxAnnotations: 1000,
};

// ============================================
// DATABASE PRISMA MODEL (for reference)
// ============================================

/*
// Add to schema.prisma
model ReviewAnnotation {
  id              String   @id @default(uuid())
  sessionId       String
  activityId      String
  activityCode    String
  activityTitle   String
  sectionId       String
  sectionName     String
  paragraphIndex  Int
  startOffset     Int?
  endOffset      Int?
  severity        String   // CRITICAL, HIGH, MEDIUM, LOW
  ruleId          String
  ruleName        String
  title           String
  description     String
  reason          String
  suggestions     String[]
  confidence      Float
  status          String   @default("OPEN")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([sessionId])
  @@index([activityId])
  @@index([severity])
  @@index([ruleId])
}
*/

// ============================================
// API RESPONSE TYPES
// ============================================

export interface GetAnnotationsResponse {
  sessionId: string;
  annotations: Annotation[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GetStatisticsResponse {
  sessionId: string;
  statistics: AnnotationStatistics;
}

export interface GetNavigationResponse {
  sessionId: string;
  navigation: AnnotationNavigation;
}

export interface GroupAnnotationsRequest {
  groupBy: AnnotationGroupBy;
  filter?: AnnotationFilter;
}

export interface FilterAnnotationsRequest {
  severities?: AnnotationSeverity[];
  activities?: string[];
  sections?: string[];
  rules?: string[];
  status?: AnnotationStatus[];
  paragraphIndex?: number;
}
