/**
 * Knowledge Mapping Engine Types
 *
 * Phase 2: Types for Knowledge Mapping
 */

// ============================================
// ENUMS
// ============================================

export enum MatchMethod {
  ALIAS = "ALIAS",
  KEYWORD = "KEYWORD",
  HEADING = "HEADING",
  ORDER = "ORDER",
  STRUCTURE = "STRUCTURE",
  PARAGRAPH_FEATURES = "PARAGRAPH_FEATURES",
  MULTIPLE = "MULTIPLE",
}

export enum ConfidenceLevel {
  HIGH = "HIGH",       // > 80%
  MEDIUM = "MEDIUM",   // 50-80%
  LOW = "LOW",         // < 50%
}

export enum ImportFormat {
  JSON = "JSON",
  DOCX = "DOCX",
  MARKDOWN = "MARKDOWN",
}

// ============================================
// DATA TRANSFER OBJECTS
// ============================================

export interface BookDTO {
  id?: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  order?: number;
}

export interface GradeDTO {
  id?: string;
  bookId: string;
  code: string;
  name: string;
  order?: number;
  isActive?: boolean;
}

export interface SubjectDTO {
  id?: string;
  gradeId: string;
  code: string;
  name: string;
  order?: number;
  isActive?: boolean;
}

export interface LessonDTO {
  id?: string;
  subjectId: string;
  code: string;
  title: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export interface LessonSectionDTO {
  id?: string;
  lessonId: string;
  code: string;
  name: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export interface LessonActivityDTO {
  id?: string;
  sectionId: string;
  code: string;
  title: string;
  order?: number;
  summary?: string;
  teachingIntent?: string;
  knowledge?: string;
  keywords?: string[];
  teachingMethod?: string;
  expectedTeacherActions?: string;
  expectedStudentActions?: string;
  expectedOutcome?: string;
  estimatedMinutes?: number;
  matchingPatterns?: Record<string, unknown>;
  aliases?: string[];
  matchWeight?: number;
  isActive?: boolean;
}

// ============================================
// MAPPING TYPES
// ============================================

export interface MatchScore {
  total: number;
  breakdown: {
    alias: number;
    keyword: number;
    heading: number;
    order: number;
    structure: number;
    paragraphFeatures: number;
  };
  weights: {
    alias: number;
    keyword: number;
    heading: number;
    order: number;
    structure: number;
    paragraphFeatures: number;
  };
}

export interface MatchResult {
  activityId: string;
  activityCode: string;
  activityTitle: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  matchedBy: MatchMethod[];
  score: MatchScore;
  isUnknown: boolean;
}

export interface SectionMatchResult {
  sectionCode: string;
  sectionTitle: string;
  matchedActivities: MatchResult[];
  overallConfidence: number;
}

export interface MappingResult {
  lessonPlanId: string;
  bookId?: string;
  gradeId?: string;
  subjectId?: string;
  lessonId?: string;
  sectionResults: SectionMatchResult[];
  unknownActivities: MatchResult[];
  overallConfidence: number;
  mappedAt: Date;
  errors: string[];
  warnings: string[];
}

// ============================================
// IMPORT TYPES
// ============================================

export interface ImportResult {
  success: boolean;
  imported: {
    books: number;
    grades: number;
    subjects: number;
    lessons: number;
    sections: number;
    activities: number;
  };
  errors: string[];
  warnings: string[];
}

export interface ImportRecord {
  book?: BookDTO;
  grade?: GradeDTO;
  subject?: SubjectDTO;
  lesson?: LessonDTO;
  section?: LessonSectionDTO;
  activities?: LessonActivityDTO[];
}

// ============================================
// CONFIGURATION
// ============================================

export interface MappingConfig {
  confidenceThreshold: number;
  fuzzyThreshold: number;
  enableCache: boolean;
  cacheTTL: number; // milliseconds
  weights: {
    alias: number;
    keyword: number;
    heading: number;
    order: number;
    structure: number;
    paragraphFeatures: number;
  };
}

export const DEFAULT_MAPPING_CONFIG: MappingConfig = {
  confidenceThreshold: 50,
  fuzzyThreshold: 0.8,
  enableCache: true,
  cacheTTL: 3600000, // 1 hour
  weights: {
    alias: 30,
    keyword: 25,
    heading: 20,
    order: 10,
    structure: 10,
    paragraphFeatures: 5,
  },
};

// ============================================
// CACHE TYPES
// ============================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}
