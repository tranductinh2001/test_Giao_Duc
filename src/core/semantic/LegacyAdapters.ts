/**
 * LegacyToDocumentIRAdapter
 *
 * Converts legacy pipeline output to DocumentIR format.
 * Used when importing from existing data or migrating.
 */

import {
  DocumentIR,
  Paragraph,
  Section,
  Activity,
  SemanticLabel,
  createEmptyDocumentIR,
  createParagraph,
  createSection,
  createActivity,
  createSemanticLabel
} from './DocumentIR';
import { SemanticTypeId } from './SemanticOntology';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * Legacy format interfaces
 */
export interface LegacyParagraph {
  id?: string;
  content: string;
  pageNumber?: number;
  lineNumber?: number;
}

export interface LegacySection {
  id: string;
  title: string;
  type: string;
  order: number;
  startLine?: number;
  endLine?: number;
}

export interface LegacyActivity {
  id: string;
  title: string;
  type?: string;
  duration?: string;
  paragraphs?: LegacyParagraph[];
}

export interface LegacySemanticLabel {
  paragraphIndex: number;
  type: string;
  confidence?: number;
}

/**
 * Convert legacy output to DocumentIR
 */
export function convertLegacyToDocumentIR(legacy: {
  sections?: LegacySection[];
  activities?: LegacyActivity[];
  paragraphs?: LegacyParagraph[];
  labels?: LegacySemanticLabel[];
  metadata?: any;
}): DocumentIR {
  logger.info('[LegacyToDocumentIRAdapter] Converting legacy format to DocumentIR...');

  const docIR = createEmptyDocumentIR();

  // Extract paragraphs from activities
  const paragraphs: Paragraph[] = [];
  const sectionMap = new Map<string, Section>();
  const activityMap = new Map<string, Activity>();

  // Process sections
  if (legacy.sections) {
    legacy.sections.forEach((s, idx) => {
      const section = createSection(
        s.title,
        normalizeSectionType(s.type),
        [],
        s.order
      );
      sectionMap.set(s.id, section);
      docIR.sections.push(section);
    });
  }

  // Process activities
  if (legacy.activities) {
    let globalOrder = 0;

    legacy.activities.forEach((a, idx) => {
      const activityParagraphs: string[] = [];

      // Extract paragraphs from activity
      if (a.paragraphs) {
        a.paragraphs.forEach((p) => {
          const paragraph = createParagraph(
            p.content || '',
            globalOrder++,
            p.pageNumber || 1,
            p.lineNumber || globalOrder
          );
          paragraphs.push(paragraph);
          activityParagraphs.push(paragraph.id);
        });
      }

      const activity = createActivity(
        a.title,
        normalizeActivityType(a.type),
        activityParagraphs,
        idx,
        a.duration
      );
      activityMap.set(a.id, activity);
      docIR.activities.push(activity);
    });
  }

  // If no paragraphs from activities, use legacy.paragraphs
  if (paragraphs.length === 0 && legacy.paragraphs) {
    legacy.paragraphs.forEach((p, idx) => {
      paragraphs.push(createParagraph(
        p.content || '',
        idx,
        p.pageNumber || 1,
        p.lineNumber || idx
      ));
    });
  }

  docIR.paragraphs = paragraphs;

  // Process semantic labels
  if (legacy.labels) {
    const labels: SemanticLabel[] = legacy.labels.map(l => {
      const type = normalizeSemanticType(l.type);
      return createSemanticLabel(
        `p${l.paragraphIndex}`,
        l.paragraphIndex,
        type,
        l.confidence || 0.9
      );
    });
    docIR.semanticLabels = labels;
  }

  // Set metadata
  if (legacy.metadata) {
    docIR.metadata.totalPages = legacy.metadata.totalPages || 1;
    docIR.metadata.totalParagraphs = paragraphs.length;
  }

  logger.info(`[LegacyToDocumentIRAdapter] Converted: ${paragraphs.length} paragraphs, ${docIR.sections.length} sections, ${docIR.activities.length} activities`);

  return docIR;
}

/**
 * Normalize section type
 */
function normalizeSectionType(type: string | undefined): any {
  if (!type) return 'OTHER';
  const upper = type.toUpperCase();
  const valid = ['OBJECTIVE', 'MATERIALS', 'ACTIVITIES', 'INTRODUCTION', 'LEARNING', 'PRACTICE', 'APPLICATION', 'CONSOLIDATION', 'HOMEWORK', 'EVALUATION', 'OTHER'];
  return valid.includes(upper) ? upper : 'OTHER';
}

/**
 * Normalize activity type
 */
function normalizeActivityType(type: string | undefined): any {
  if (!type) return 'OTHER';
  const upper = type.toUpperCase();
  const valid = ['WARM_UP', 'PRESENTATION', 'EXPLORATION', 'GUIDED_PRACTICE', 'INDEPENDENT_PRACTICE', 'APPLICATION', 'CONSOLIDATION', 'EXTENSION', 'EVALUATION', 'HOMEWORK', 'OTHER'];
  return valid.includes(upper) ? upper : 'OTHER';
}

/**
 * Normalize semantic type
 */
function normalizeSemanticType(type: string): SemanticTypeId {
  const upper = type.toUpperCase();
  const validTypes: SemanticTypeId[] = [
    'TEACHER_ACTION', 'STUDENT_ACTION', 'TEACHING_MATERIAL',
    'LEARNING_OUTCOME', 'QUESTION', 'ASSESSMENT',
    'SECTION_HEADER', 'PRODUCT', 'OBJECTIVE',
    'INSTRUCTION', 'UNKNOWN'
  ];
  return validTypes.includes(upper as SemanticTypeId) ? upper as SemanticTypeId : 'UNKNOWN';
}
