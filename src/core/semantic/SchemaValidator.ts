/**
 * SchemaValidator Module
 *
 * Validates semantic response against expected schema.
 * Retries on invalid responses.
 */

import { SemanticLabel, SemanticTypeId } from './DocumentIR';
import { SEMANTIC_TYPES } from './SemanticOntology';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * Schema Validation Result
 */
export interface SchemaValidationResult {
  isValid: boolean;
  errors: SchemaError[];
  warnings: SchemaWarning[];
}

export interface SchemaError {
  type: 'MISSING_REQUIRED' | 'INVALID_TYPE' | 'OUT_OF_RANGE' | 'PARSE_ERROR' | 'SCHEMA_MISMATCH';
  message: string;
  location?: string;
  value?: any;
}

export interface SchemaWarning {
  type: 'LOW_CONFIDENCE' | 'AMBIGUOUS_TYPE' | 'MISSING_OPTIONAL';
  message: string;
  location?: string;
}

/**
 * Expected Schema Definition
 */
export interface SchemaDefinition {
  requiredFields?: string[];
  optionalFields?: string[];
  paragraphIndexRange?: { min: number; max: number };
  validTypes?: SemanticTypeId[];
  minLabelsPerActivity?: number;
  maxLabelsPerActivity?: number;
}

/**
 * Default schema definition
 */
const DEFAULT_SCHEMA: SchemaDefinition = {
  requiredFields: ['activityId', 'labels'],
  optionalFields: ['activityTitle', 'confidence'],
  validTypes: Object.keys(SEMANTIC_TYPES) as SemanticTypeId[],
  minLabelsPerActivity: 1,
  maxLabelsPerActivity: 50
};

/**
 * Validate semantic response against schema
 */
export function validateSchema(
  parsed: any,
  schema: SchemaDefinition = DEFAULT_SCHEMA
): SchemaValidationResult {
  const errors: SchemaError[] = [];
  const warnings: SchemaWarning[] = [];

  logger.info('[SchemaValidator] Validating schema...');

  // Check required fields
  if (schema.requiredFields) {
    for (const field of schema.requiredFields) {
      if (!(field in parsed)) {
        errors.push({
          type: 'MISSING_REQUIRED',
          message: `Missing required field: ${field}`,
          location: field
        });
      }
    }
  }

  // Validate labels array
  if (parsed.labels) {
    if (!Array.isArray(parsed.labels)) {
      errors.push({
        type: 'INVALID_TYPE',
        message: 'labels must be an array',
        location: 'labels'
      });
    } else {
      // Validate each label
      parsed.labels.forEach((label: any, idx: number) => {
        validateLabel(label, idx, schema, errors, warnings);
      });
    }
  }

  // Validate label counts
  if (parsed.labels && schema.minLabelsPerActivity) {
    if (parsed.labels.length < schema.minLabelsPerActivity) {
      warnings.push({
        type: 'MISSING_OPTIONAL',
        message: `Only ${parsed.labels.length} labels, expected at least ${schema.minLabelsPerActivity}`
      });
    }
  }

  const isValid = errors.length === 0;

  logger.info(`[SchemaValidator] Validation result: ${isValid ? 'VALID' : 'INVALID'}`);

  if (errors.length > 0) {
    logger.warn(`[SchemaValidator] Errors: ${errors.map(e => e.message).join(', ')}`);
  }

  return { isValid, errors, warnings };
}

/**
 * Validate single label
 */
function validateLabel(
  label: any,
  index: number,
  schema: SchemaDefinition,
  errors: SchemaError[],
  warnings: SchemaWarning[]
): void {
  // Check paragraphIndex
  if (label.paragraphIndex === undefined && label.paragraphId === undefined) {
    errors.push({
      type: 'MISSING_REQUIRED',
      message: `Label ${index}: missing both paragraphIndex and paragraphId`,
      location: `labels[${index}]`
    });
  }

  if (label.paragraphIndex !== undefined) {
    if (typeof label.paragraphIndex !== 'number') {
      errors.push({
        type: 'INVALID_TYPE',
        message: `Label ${index}: paragraphIndex must be a number`,
        location: `labels[${index}].paragraphIndex`,
        value: label.paragraphIndex
      });
    }

    if (schema.paragraphIndexRange) {
      if (label.paragraphIndex < schema.paragraphIndexRange.min ||
          label.paragraphIndex > schema.paragraphIndexRange.max) {
        errors.push({
          type: 'OUT_OF_RANGE',
          message: `Label ${index}: paragraphIndex ${label.paragraphIndex} out of range [${schema.paragraphIndexRange.min}, ${schema.paragraphIndexRange.max}]`,
          location: `labels[${index}].paragraphIndex`,
          value: label.paragraphIndex
        });
      }
    }
  }

  // Check type
  if (!label.type) {
    errors.push({
      type: 'MISSING_REQUIRED',
      message: `Label ${index}: missing type`,
      location: `labels[${index}].type`
    });
  } else if (schema.validTypes && !schema.validTypes.includes(label.type)) {
    errors.push({
      type: 'INVALID_TYPE',
      message: `Label ${index}: invalid type "${label.type}"`,
      location: `labels[${index}].type`,
      value: label.type
    });
  }

  // Check confidence
  if (label.confidence !== undefined) {
    if (typeof label.confidence !== 'number') {
      errors.push({
        type: 'INVALID_TYPE',
        message: `Label ${index}: confidence must be a number`,
        location: `labels[${index}].confidence`,
        value: label.confidence
      });
    } else if (label.confidence < 0 || label.confidence > 1) {
      warnings.push({
        type: 'LOW_CONFIDENCE',
        message: `Label ${index}: confidence ${label.confidence} is very low`,
        location: `labels[${index}].confidence`
      });
    }
  }
}

/**
 * Validate complete semantic response structure
 */
export function validateCompleteResponse(
  response: any,
  expectedActivityCount: number
): SchemaValidationResult {
  const errors: SchemaError[] = [];
  const warnings: SchemaWarning[] = [];

  // Check if it's wrapped in { activities: [...] }
  let activities = response.activities || (Array.isArray(response) ? response : [response]);

  if (!Array.isArray(activities)) {
    errors.push({
      type: 'SCHEMA_MISMATCH',
      message: 'Expected array of activities or object with activities field',
      value: typeof response
    });
    return { isValid: false, errors, warnings };
  }

  // Validate each activity
  activities.forEach((activity: any, idx: number) => {
    const validation = validateSchema(activity);
    errors.push(...validation.errors.map(e => ({
      ...e,
      location: `activities[${idx}].${e.location}`
    })));
    warnings.push(...validation.warnings.map(w => ({
      ...w,
      location: `activities[${idx}].${w.location}`
    })));
  });

  // Check activity count
  if (activities.length !== expectedActivityCount) {
    warnings.push({
      type: 'MISSING_OPTIONAL',
      message: `Expected ${expectedActivityCount} activities, got ${activities.length}`
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Retry validation with regeneration
 */
export async function validateWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<{ result: T | null; isValid: boolean; errors: SchemaError[] }> {
  let lastValidation: SchemaValidationResult | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.info(`[SchemaValidator] Validation attempt ${attempt}/${maxRetries}`);

    try {
      const result = await fn();

      // If result has labels, validate them
      if (result && typeof result === 'object' && 'labels' in result) {
        lastValidation = validateSchema(result);

        if (lastValidation.isValid) {
          return { result, isValid: true, errors: [] };
        }

        logger.warn(`[SchemaValidator] Attempt ${attempt} failed: ${lastValidation.errors.length} errors`);
      } else {
        // No labels to validate - consider valid
        return { result, isValid: true, errors: [] };
      }

    } catch (e: any) {
      logger.error(`[SchemaValidator] Attempt ${attempt} exception: ${e.message}`);
    }
  }

  return {
    result: null,
    isValid: false,
    errors: lastValidation?.errors || []
  };
}
