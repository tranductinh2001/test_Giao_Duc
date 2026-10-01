/**
 * SemanticResponseParser Module
 *
 * Parses AI semantic response to extract semantic labels.
 * Validates schema and returns labeled data.
 */

import { SemanticLabel, SemanticTypeId } from './DocumentIR';
import { SEMANTIC_TYPES } from './SemanticOntology';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * Parsed Semantic Result
 */
export interface ParsedSemanticLabels {
  activityId: string;
  activityTitle: string;
  labels: SemanticLabel[];
  schema: 'direct' | 'nested' | 'unknown';
}

/**
 * Parse AI semantic response
 */
export function parseSemanticResponse(
  rawResponse: string,
  activityId?: string
): ParsedSemanticLabels {
  logger.info('[SemanticResponseParser] Parsing semantic response...');

  try {
    // Step 1: Clean markdown
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    // Step 2: Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e: any) {
      throw new Error(`JSON parse failed: ${e.message}`);
    }

    // Step 3: Extract labels
    let labels: SemanticLabel[] = [];
    let extractedActivityId = activityId || '';
    let extractedActivityTitle = '';
    let schema: 'direct' | 'nested' | 'unknown' = 'unknown';

    if (Array.isArray(parsed)) {
      // Schema: Direct array
      schema = 'direct';
      // Assume it's labels array
      labels = parseLabelsArray(parsed);
    } else if (parsed.labels && Array.isArray(parsed.labels)) {
      // Schema: { labels: [...] }
      schema = 'nested';
      extractedActivityId = parsed.activityId || activityId || '';
      extractedActivityTitle = parsed.activityTitle || '';
      labels = parsed.labels.map((l: any) => parseLabel(l));
    } else if (parsed.activities && Array.isArray(parsed.activities)) {
      // Schema: { activities: [...] }
      schema = 'nested';
      // Get first activity
      const firstActivity = parsed.activities[0];
      if (firstActivity) {
        extractedActivityId = firstActivity.activityId || activityId || '';
        extractedActivityTitle = firstActivity.activityTitle || '';
        labels = parseLabelsFromActivity(firstActivity);
      }
    } else {
      // Try to find any array of labels
      const found = findLabelsArray(parsed);
      if (found) {
        labels = parseLabelsArray(found);
        schema = 'nested';
      }
    }

    logger.info(`[SemanticResponseParser] Parsed ${labels.length} labels (schema: ${schema})`);

    return {
      activityId: extractedActivityId,
      activityTitle: extractedActivityTitle,
      labels,
      schema
    };

  } catch (error: any) {
    logger.error(`[SemanticResponseParser] Parse error: ${error.message}`);
    throw error;
  }
}

/**
 * Parse labels from activity object
 */
function parseLabelsFromActivity(activity: any): SemanticLabel[] {
  const labels: SemanticLabel[] = [];

  // Try different field names
  const fields = ['labels', 'semanticLabels', 'classifications', 'results'];

  for (const field of fields) {
    if (activity[field] && Array.isArray(activity[field])) {
      return activity[field].map((l: any) => parseLabel(l));
    }
  }

  // Try index fields
  const indexFields = [
    'teacherActionIndexes',
    'studentActionIndexes',
    'teachingMaterialIndexes',
    'learningOutcomeIndexes',
    'questionIndexes',
    'assessmentIndexes',
    'productIndexes'
  ];

  const typeMap: Record<string, SemanticTypeId> = {
    'teacherActionIndexes': 'TEACHER_ACTION',
    'studentActionIndexes': 'STUDENT_ACTION',
    'teachingMaterialIndexes': 'TEACHING_MATERIAL',
    'learningOutcomeIndexes': 'LEARNING_OUTCOME',
    'questionIndexes': 'QUESTION',
    'assessmentIndexes': 'ASSESSMENT',
    'productIndexes': 'PRODUCT'
  };

  for (const field of indexFields) {
    if (activity[field] && Array.isArray(activity[field])) {
      const type = typeMap[field] || 'UNKNOWN';
      for (const idx of activity[field]) {
        labels.push({
          paragraphId: `p${idx}`,
          paragraphIndex: idx,
          type,
          confidence: 0.9
        });
      }
    }
  }

  return labels;
}

/**
 * Parse single label
 */
function parseLabel(label: any): SemanticLabel {
  // Validate type
  let type: SemanticTypeId = 'UNKNOWN';
  if (label.type && typeof label.type === 'string') {
    const upperType = label.type.toUpperCase() as SemanticTypeId;
    if (SEMANTIC_TYPES[upperType]) {
      type = upperType;
    }
  }

  return {
    paragraphId: label.paragraphId || `p${label.paragraphIndex || 0}`,
    paragraphIndex: label.paragraphIndex ?? 0,
    type,
    confidence: typeof label.confidence === 'number' ? label.confidence : 0.9
  };
}

/**
 * Parse array of labels
 */
function parseLabelsArray(arr: any[]): SemanticLabel[] {
  return arr.map(parseLabel);
}

/**
 * Find labels array in object
 */
function findLabelsArray(obj: any): any[] | null {
  if (!obj || typeof obj !== 'object') return null;

  const candidates = ['labels', 'semanticLabels', 'classifications', 'items', 'results'];

  for (const key of candidates) {
    if (obj[key] && Array.isArray(obj[key])) {
      return obj[key];
    }
  }

  // Search recursively
  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) {
      return obj[key];
    }
  }

  return null;
}

/**
 * Validate semantic response schema
 */
export function validateSemanticResponse(
  parsed: ParsedSemanticLabels,
  expectedParagraphCount: number
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!parsed.activityId) {
    warnings.push('Missing activityId');
  }

  if (!parsed.labels || parsed.labels.length === 0) {
    errors.push('No labels found in response');
  }

  // Check paragraph indexes are valid
  if (parsed.labels.length > 0) {
    const maxIndex = Math.max(...parsed.labels.map(l => l.paragraphIndex));
    if (maxIndex >= expectedParagraphCount) {
      errors.push(`Paragraph index ${maxIndex} exceeds expected count ${expectedParagraphCount}`);
    }
  }

  // Check for unknown types
  const unknownCount = parsed.labels.filter(l => l.type === 'UNKNOWN').length;
  if (unknownCount > parsed.labels.length * 0.5) {
    warnings.push(`${unknownCount} labels have UNKNOWN type - may need prompt refinement`);
  }

  // Check coverage
  const coveredIndexes = new Set(parsed.labels.map(l => l.paragraphIndex));
  if (coveredIndexes.size < expectedParagraphCount) {
    warnings.push(`Only ${coveredIndexes.size}/${expectedParagraphCount} paragraphs labeled`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Retry with different parsing strategy
 */
export function parseSemanticResponseWithRetry(
  rawResponse: string,
  activityId?: string,
  maxRetries: number = 3
): ParsedSemanticLabels {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[SemanticResponseParser] Attempt ${attempt}/${maxRetries}`);

      // Try different cleaning strategies
      let cleaned = rawResponse.trim();

      if (attempt === 2) {
        // Try removing all markdown
        cleaned = cleaned.replace(/```[\s\S]*?```/g, '').replace(/`/g, '').trim();
      }

      if (attempt === 3) {
        // Try extracting JSON between { and }
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) cleaned = match[0];
      }

      return parseSemanticResponse(cleaned, activityId);

    } catch (e: any) {
      lastError = e;
      logger.warn(`[SemanticResponseParser] Attempt ${attempt} failed: ${e.message}`);
    }
  }

  throw lastError || new Error('All parsing attempts failed');
}
