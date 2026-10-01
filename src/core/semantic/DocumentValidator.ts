/**
 * Document IR Validator
 *
 * Validates DocumentIR structure and semantic coverage.
 */

import { DocumentIR, SemanticType } from './DocumentIRPipeline';

export interface ValidationResult {
  valid: boolean;
  stage: 'layout' | 'paragraph' | 'mapping' | 'semantic' | 'coverage';
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: ValidationMetrics;
}

export interface ValidationError {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationMetrics {
  layout: {
    sections: number;
    headings: number;
    activities: number;
  };
  paragraph: {
    total: number;
    mapped: number;
    unmapped: number;
    mappingPercent: number;
  };
  semantic: {
    teacherActions: number;
    studentActions: number;
    questions: number;
    assessments: number;
    teachingMaterials: number;
    learningOutcomes: number;
    products: number;
    objectives: number;
    instructions: number;
    unknowns: number;
    total: number;
    coveragePercent: number;
  };
}

export interface SemanticDistribution {
  type: SemanticType;
  count: number;
  percent: number;
}

/**
 * Validation thresholds
 */
const THRESHOLDS = {
  MIN_COVERAGE_PERCENT: 95,
  MAX_UNKNOWN_PERCENT: 10,
  MIN_TEACHER_ACTIONS: 0,  // Can be 0 for some activities
  MIN_STUDENT_ACTIONS: 0,   // Can be 0 for some activities
  MIN_MAPPED_PERCENT: 95,
};

/**
 * Document IR Validator
 */
export class DocumentIRValidator {
  /**
   * Validate complete DocumentIR
   */
  validate(docIR: DocumentIR): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Stage 1: Layout validation
    const layoutErrors = this.validateLayout(docIR);
    errors.push(...layoutErrors.errors);
    warnings.push(...layoutErrors.warnings);

    // Stage 2: Paragraph validation
    const paragraphErrors = this.validateParagraphs(docIR);
    errors.push(...paragraphErrors.errors);
    warnings.push(...paragraphErrors.warnings);

    // Stage 3: Mapping validation
    const mappingErrors = this.validateMapping(docIR);
    errors.push(...mappingErrors.errors);
    warnings.push(...mappingErrors.warnings);

    // Stage 4: Semantic validation
    const semanticErrors = this.validateSemantic(docIR);
    errors.push(...semanticErrors.errors);
    warnings.push(...semanticErrors.warnings);

    // Stage 5: Coverage validation
    const coverageErrors = this.validateCoverage(docIR);
    errors.push(...coverageErrors.errors);
    warnings.push(...coverageErrors.warnings);

    // Build metrics
    const metrics = this.buildMetrics(docIR);

    return {
      valid: errors.length === 0,
      stage: errors.length > 0 ? 'semantic' : 'coverage',
      errors,
      warnings,
      metrics,
    };
  }

  /**
   * Validate layout structure
   */
  validateLayout(docIR: DocumentIR): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check sections
    if (!docIR.sections || docIR.sections.length === 0) {
      errors.push({
        code: 'LAYOUT_NO_SECTIONS',
        message: 'Document has no sections',
      });
    }

    // Check activities
    if (!docIR.activities || docIR.activities.length === 0) {
      errors.push({
        code: 'LAYOUT_NO_ACTIVITIES',
        message: 'Document has no activities',
      });
    }

    // Check headings
    if (!docIR.layout?.headings || docIR.layout.headings.length === 0) {
      warnings.push({
        code: 'LAYOUT_NO_HEADINGS',
        message: 'Document has no headings detected',
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate paragraphs
   */
  validateParagraphs(docIR: DocumentIR): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check paragraphs exist
    if (!docIR.paragraphs || docIR.paragraphs.length === 0) {
      errors.push({
        code: 'PARAGRAPH_EMPTY',
        message: 'Document has no paragraphs',
      });
      return { errors, warnings };
    }

    // Check for empty paragraphs
    const emptyParagraphs = docIR.paragraphs.filter(p => !p.content || p.content.trim().length === 0);
    if (emptyParagraphs.length > 0) {
      warnings.push({
        code: 'PARAGRAPH_EMPTY_COUNT',
        message: `${emptyParagraphs.length} paragraphs are empty`,
        details: { count: emptyParagraphs.length },
      });
    }

    // Check for duplicate IDs
    const ids = docIR.paragraphs.map(p => p.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      errors.push({
        code: 'PARAGRAPH_DUPLICATE_IDS',
        message: 'Duplicate paragraph IDs found',
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate mapping
   */
  validateMapping(docIR: DocumentIR): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get all paragraph IDs
    const paragraphIds = new Set(docIR.paragraphs.map(p => p.id));

    // Check activities reference valid paragraphs
    for (const activity of docIR.activities) {
      if (!activity.paragraphIds || activity.paragraphIds.length === 0) {
        warnings.push({
          code: 'MAPPING_EMPTY_ACTIVITY',
          message: `Activity "${activity.title}" has no paragraphs`,
          details: { activityId: activity.id },
        });
        continue;
      }

      for (const paraId of activity.paragraphIds) {
        if (!paragraphIds.has(paraId)) {
          errors.push({
            code: 'MAPPING_INVALID_PARAGRAPH',
            message: `Activity references invalid paragraph: ${paraId}`,
            details: { activityId: activity.id, paragraphId: paraId },
          });
        }
      }
    }

    // Check sections reference valid paragraphs
    for (const section of docIR.sections) {
      if (section.paragraphIds) {
        for (const paraId of section.paragraphIds) {
          if (!paragraphIds.has(paraId)) {
            errors.push({
              code: 'MAPPING_INVALID_SECTION_PARAGRAPH',
              message: `Section references invalid paragraph: ${paraId}`,
              details: { sectionId: section.id, paragraphId: paraId },
            });
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate semantic labels
   */
  validateSemantic(docIR: DocumentIR): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!docIR.semanticLabels || docIR.semanticLabels.length === 0) {
      warnings.push({
        code: 'SEMANTIC_EMPTY',
        message: 'No semantic labels found',
      });
      return { errors, warnings };
    }

    // Count by type
    const typeCount = this.countSemanticTypes(docIR.semanticLabels);

    // Check for zero teacher/student actions (warning only)
    if (typeCount.teacherActions === 0 && typeCount.studentActions === 0) {
      warnings.push({
        code: 'SEMANTIC_NO_TEACHER_STUDENT',
        message: 'No teacher or student actions found',
      });
    }

    // Check for high unknown rate
    const total = typeCount.total;
    const unknownPercent = total > 0 ? (typeCount.unknowns / total) * 100 : 0;

    if (unknownPercent > THRESHOLDS.MAX_UNKNOWN_PERCENT) {
      warnings.push({
        code: 'SEMANTIC_HIGH_UNKNOWN',
        message: `Unknown rate too high: ${unknownPercent.toFixed(1)}%`,
        details: { unknownPercent, threshold: THRESHOLDS.MAX_UNKNOWN_PERCENT },
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate coverage
   */
  validateCoverage(docIR: DocumentIR): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const totalParagraphs = docIR.paragraphs?.length || 0;
    const labeledParagraphs = docIR.semanticLabels?.length || 0;

    const coveragePercent = totalParagraphs > 0
      ? (labeledParagraphs / totalParagraphs) * 100
      : 0;

    if (coveragePercent < THRESHOLDS.MIN_COVERAGE_PERCENT) {
      errors.push({
        code: 'COVERAGE_TOO_LOW',
        message: `Coverage ${coveragePercent.toFixed(1)}% is below ${THRESHOLDS.MIN_COVERAGE_PERCENT}%`,
        details: {
          coveragePercent,
          threshold: THRESHOLDS.MIN_COVERAGE_PERCENT,
          total: totalParagraphs,
          labeled: labeledParagraphs,
        },
      });
    }

    return { errors, warnings };
  }

  /**
   * Count semantic types
   */
  private countSemanticTypes(labels: any[]): Record<string, number> {
    const counts: Record<string, number> = {
      teacherActions: 0,
      studentActions: 0,
      questions: 0,
      assessments: 0,
      teachingMaterials: 0,
      learningOutcomes: 0,
      products: 0,
      objectives: 0,
      instructions: 0,
      unknowns: 0,
      total: labels.length,
    };

    for (const label of labels) {
      switch (label.type) {
        case 'TEACHER_ACTION':
          counts.teacherActions++;
          break;
        case 'STUDENT_ACTION':
          counts.studentActions++;
          break;
        case 'QUESTION':
          counts.questions++;
          break;
        case 'ASSESSMENT':
          counts.assessments++;
          break;
        case 'TEACHING_MATERIAL':
          counts.teachingMaterials++;
          break;
        case 'LEARNING_OUTCOME':
          counts.learningOutcomes++;
          break;
        case 'PRODUCT':
          counts.products++;
          break;
        case 'OBJECTIVE':
          counts.objectives++;
          break;
        case 'INSTRUCTION':
          counts.instructions++;
          break;
        case 'UNKNOWN':
          counts.unknowns++;
          break;
      }
    }

    return counts;
  }

  /**
   * Build validation metrics
   */
  buildMetrics(docIR: DocumentIR): ValidationMetrics {
    const paragraphs = docIR.paragraphs || [];
    const labels = docIR.semanticLabels || [];

    // Count mapped paragraphs
    const mappedParagraphIds = new Set(labels.map(l => l.paragraphId));
    const mapped = mappedParagraphIds.size;

    // Semantic counts
    const typeCount = this.countSemanticTypes(labels);
    const total = typeCount.total;
    const coveragePercent = paragraphs.length > 0
      ? (mapped / paragraphs.length) * 100
      : 0;

    return {
      layout: {
        sections: docIR.sections?.length || 0,
        headings: docIR.layout?.headings?.length || 0,
        activities: docIR.activities?.length || 0,
      },
      paragraph: {
        total: paragraphs.length,
        mapped,
        unmapped: paragraphs.length - mapped,
        mappingPercent: coveragePercent,
      },
      semantic: {
        ...typeCount,
        coveragePercent,
      },
    };
  }

  /**
   * Get semantic distribution
   */
  getSemanticDistribution(docIR: DocumentIR): SemanticDistribution[] {
    const labels = docIR.semanticLabels || [];
    const total = labels.length;

    if (total === 0) return [];

    const typeCount = this.countSemanticTypes(labels);

    const distribution: SemanticDistribution[] = [
      { type: 'TEACHER_ACTION', count: typeCount.teacherActions, percent: (typeCount.teacherActions / total) * 100 },
      { type: 'STUDENT_ACTION', count: typeCount.studentActions, percent: (typeCount.studentActions / total) * 100 },
      { type: 'QUESTION', count: typeCount.questions, percent: (typeCount.questions / total) * 100 },
      { type: 'ASSESSMENT', count: typeCount.assessments, percent: (typeCount.assessments / total) * 100 },
      { type: 'TEACHING_MATERIAL', count: typeCount.teachingMaterials, percent: (typeCount.teachingMaterials / total) * 100 },
      { type: 'LEARNING_OUTCOME', count: typeCount.learningOutcomes, percent: (typeCount.learningOutcomes / total) * 100 },
      { type: 'PRODUCT', count: typeCount.products, percent: (typeCount.products / total) * 100 },
      { type: 'OBJECTIVE', count: typeCount.objectives, percent: (typeCount.objectives / total) * 100 },
      { type: 'INSTRUCTION', count: typeCount.instructions, percent: (typeCount.instructions / total) * 100 },
      { type: 'UNKNOWN', count: typeCount.unknowns, percent: (typeCount.unknowns / total) * 100 },
    ];

    return distribution.sort((a, b) => b.count - a.count);
  }
}

/**
 * Create validator
 */
export function createDocumentValidator(): DocumentIRValidator {
  return new DocumentIRValidator();
}
