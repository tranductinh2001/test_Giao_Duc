/**
 * SemanticPipelineAdapter
 *
 * Backward-compatible adapter that converts new DocumentIR format
 * to legacy format expected by current workflow.
 */

import {
  DocumentIR,
  Paragraph,
  Section,
  Activity,
  SemanticLabel,
  SemanticTree,
  CoverageReport
} from './DocumentIR';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

// ============================================================
// Legacy Format Types (from existing pipeline)
// ============================================================

export interface LegacyActivity {
  activityId: string;
  activityTitle: string;
  teacherActionIndexes: number[];
  studentActionIndexes: number[];
  teachingMaterialIndexes: number[];
  learningOutcomeIndexes: number[];
  questionIndexes: number[];
  assessmentIndexes: number[];
  sectionHeaderIndexes: number[];
  unknownIndexes: number[];
  // Extended fields for new pipeline
  learningMaterialIndexes?: number[];
  productIndexes?: number[];
  objectiveIndexes?: number[];
  instructionIndexes?: number[];
}

export interface LegacySection {
  id: string;
  title: string;
  type: string;
  order: number;
  paragraphIds: string[];
}

export interface LegacyDocument {
  id: string;
  title: string;
  metadata: LegacyMetadata;
  sections: LegacySection[];
  activities: LegacyActivity[];
}

export interface LegacyMetadata {
  totalPages: number;
  wordCount: number;
  language: string;
  hasTables: boolean;
  hasImages: boolean;
  confidence: number;
}

export interface LegacyReviewResult {
  success: boolean;
  document?: LegacyDocument;
  sections?: LegacySection[];
  tree?: LegacyDocumentTree;
  confidence: number;
  error?: string;
}

export interface LegacyDocumentTree {
  sections: any[];
}

/**
 * Convert DocumentIR to Legacy Format
 */
export function documentIRToLegacy(docIR: DocumentIR): LegacyDocument {
  logger.info('[SemanticPipelineAdapter] Converting DocumentIR to legacy format...');

  // Convert sections
  const legacySections: LegacySection[] = docIR.sections.map(s => ({
    id: s.id,
    title: s.title,
    type: s.type,
    order: s.order,
    paragraphIds: s.paragraphIds
  }));

  // Convert activities with semantic labels
  const legacyActivities = convertActivitiesToLegacy(docIR);

  return {
    id: 'doc-' + Date.now(),
    title: docIR.metadata.sourceFile || 'Untitled',
    metadata: {
      totalPages: docIR.metadata.totalPages,
      wordCount: docIR.paragraphs.reduce((sum, p) => sum + p.content.split(/\s+/).length, 0),
      language: 'vi',
      hasTables: false,  // Could be inferred from content
      hasImages: false,
      confidence: docIR.coverage.coveragePercent / 100
    },
    sections: legacySections,
    activities: legacyActivities
  };
}

/**
 * Convert activities to legacy format with semantic labels
 */
function convertActivitiesToLegacy(docIR: DocumentIR): LegacyActivity[] {
  const activities: LegacyActivity[] = [];

  // Create paragraph index map
  const paragraphIndexMap = new Map<string, number>();
  docIR.paragraphs.forEach((p, idx) => {
    paragraphIndexMap.set(p.id, idx);
  });

  // Group labels by activity
  const activityLabelsMap = new Map<string, SemanticLabel[]>();

  docIR.semanticLabels.forEach(label => {
    // Find which activity this label belongs to
    for (const activity of docIR.activities) {
      if (activity.paragraphIds.includes(label.paragraphId)) {
        if (!activityLabelsMap.has(activity.id)) {
          activityLabelsMap.set(activity.id, []);
        }
        activityLabelsMap.get(activity.id)!.push(label);
        break;
      }
    }
  });

  // Convert each activity
  for (const activity of docIR.activities) {
    const labels = activityLabelsMap.get(activity.id) || [];

    const legacyActivity: LegacyActivity = {
      activityId: activity.id,
      activityTitle: activity.title,
      teacherActionIndexes: [],
      studentActionIndexes: [],
      teachingMaterialIndexes: [],
      learningOutcomeIndexes: [],
      questionIndexes: [],
      assessmentIndexes: [],
      sectionHeaderIndexes: [],
      unknownIndexes: [],
      // Extended
      learningMaterialIndexes: [],
      productIndexes: [],
      objectiveIndexes: [],
      instructionIndexes: []
    };

    // Assign labels to appropriate indexes
    labels.forEach(label => {
      const paraIdx = paragraphIndexMap.get(label.paragraphId);
      if (paraIdx === undefined) return;

      switch (label.type) {
        case 'TEACHER_ACTION':
          legacyActivity.teacherActionIndexes.push(paraIdx);
          break;
        case 'STUDENT_ACTION':
          legacyActivity.studentActionIndexes.push(paraIdx);
          break;
        case 'TEACHING_MATERIAL':
          legacyActivity.teachingMaterialIndexes.push(paraIdx);
          break;
        case 'LEARNING_OUTCOME':
          legacyActivity.learningOutcomeIndexes.push(paraIdx);
          break;
        case 'QUESTION':
          legacyActivity.questionIndexes.push(paraIdx);
          break;
        case 'ASSESSMENT':
          legacyActivity.assessmentIndexes.push(paraIdx);
          break;
        case 'SECTION_HEADER':
          legacyActivity.sectionHeaderIndexes.push(paraIdx);
          break;
        case 'PRODUCT':
          legacyActivity.productIndexes = legacyActivity.productIndexes || [];
          legacyActivity.productIndexes.push(paraIdx);
          break;
        case 'OBJECTIVE':
          legacyActivity.objectiveIndexes = legacyActivity.objectiveIndexes || [];
          legacyActivity.objectiveIndexes.push(paraIdx);
          break;
        case 'INSTRUCTION':
          legacyActivity.instructionIndexes = legacyActivity.instructionIndexes || [];
          legacyActivity.instructionIndexes.push(paraIdx);
          break;
        default:
          legacyActivity.unknownIndexes.push(paraIdx);
      }
    });

    activities.push(legacyActivity);
  }

  return activities;
}

/**
 * Convert Legacy Format to DocumentIR
 */
export function legacyToDocumentIR(legacy: LegacyDocument): DocumentIR {
  logger.info('[SemanticPipelineAdapter] Converting legacy format to DocumentIR...');

  const docIR: DocumentIR = {
    metadata: {
      sourceFile: legacy.title,
      sourceType: 'text',
      totalPages: legacy.metadata.totalPages,
      totalParagraphs: legacy.activities.reduce((sum, a) =>
        sum + a.teacherActionIndexes.length + a.studentActionIndexes.length, 0),
      processingTimeMs: 0,
      extractedAt: new Date().toISOString()
    },
    paragraphs: [],
    sections: [],
    activities: [],
    semanticLabels: [],
    semanticTree: { sections: [] },
    validation: { isValid: true, errors: [], warnings: [] },
    coverage: {
      totalParagraphs: 0,
      labeledParagraphs: 0,
      unlabeledParagraphs: 0,
      coveragePercent: 0,
      typeDistribution: {},
      unlabeledIndexes: []
    },
    artifacts: {
      visionRaw: null,
      visionPrompt: '',
      semanticPrompt: '',
      semanticRaw: '',
      mappingResult: null,
      validationReport: null
    }
  };

  // This is a simplified conversion - full implementation would
  // need to extract paragraphs from activities

  return docIR;
}

/**
 * Get semantic labels in legacy format for a specific activity
 */
export function getLegacyActivityLabels(
  docIR: DocumentIR,
  activityId: string
): LegacyActivity | undefined {
  const legacyDoc = documentIRToLegacy(docIR);
  return legacyDoc.activities.find(a => a.activityId === activityId);
}

/**
 * Convert coverage report to legacy format
 */
export function coverageToLegacy(coverage: CoverageReport): any {
  return {
    totalParagraphs: coverage.totalParagraphs,
    labeledParagraphs: coverage.labeledParagraphs,
    unlabeledParagraphs: coverage.unlabeledParagraphs,
    coveragePercent: coverage.coveragePercent,
    typeDistribution: coverage.typeDistribution
  };
}
