/**
 * SemanticPipelineOrchestrator
 *
 * Main orchestrator that ties together all semantic analysis modules.
 * Integrates with existing pipeline while using Python-validated architecture.
 */

import { BeekOneAIClient, type AIResult } from '@/lib/beekone-ai-client';

import {
  DocumentIR,
  Paragraph,
  Section,
  Activity,
  SemanticLabel,
  SemanticTree,
  CoverageReport,
  createEmptyDocumentIR,
  createSemanticLabel
} from './DocumentIR';

import {
  parseVisionResponse,
  buildVisionPrompt,
  toDocumentIR,
  validateVisionResult,
  type VisionParseResult
} from './VisionParser';

import {
  buildSemanticPrompt,
  buildBatchSemanticPrompt
} from './SemanticPromptBuilder';

import {
  parseSemanticResponse,
  validateSemanticResponse,
  parseSemanticResponseWithRetry
} from './SemanticResponseParser';

import {
  mapSemanticLabels,
  calculateLabelDistribution
} from './SemanticMapper';

import {
  validateSchema,
  validateCompleteResponse
} from './SchemaValidator';

import {
  calculateCoverage,
  validateCoverage,
  printCoverageSummary
} from './CoverageValidator';

import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * SemanticPipelineConfig
 */
export interface SemanticPipelineConfig {
  visionModel?: string;
  semanticModel?: string;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
  minCoveragePercent?: number;
  useBatchSemantic?: boolean;
}

/**
 * SemanticPipelineResult
 */
export interface SemanticPipelineResult {
  success: boolean;
  documentIR: DocumentIR;
  metrics: PipelineMetrics;
  errors: string[];
  warnings: string[];
}

export interface PipelineMetrics {
  visionTimeMs: number;
  semanticTimeMs: number;
  totalTimeMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  visionCalls: number;
  semanticCalls: number;
}

/**
 * Default config
 */
const DEFAULT_CONFIG: SemanticPipelineConfig = {
  visionModel: 'gemini-2.5-flash-lite',
  semanticModel: 'gemini-2.5-flash-lite',
  temperature: 0.1,
  maxTokens: 4000,
  maxRetries: 3,
  minCoveragePercent: 80,
  useBatchSemantic: false
};

/**
 * Main orchestrator function
 */
export async function runSemanticPipeline(
  documentContent: string | Buffer,
  sourceFile: string,
  sourceType: 'pdf' | 'docx' | 'text',
  config: SemanticPipelineConfig = {}
): Promise<SemanticPipelineResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  logger.info('[SemanticPipeline] Starting semantic pipeline...');
  logger.info(`[SemanticPipeline] Source: ${sourceFile}, Type: ${sourceType}`);

  const docIR = createEmptyDocumentIR();
  const metrics: PipelineMetrics = {
    visionTimeMs: 0,
    semanticTimeMs: 0,
    totalTimeMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    visionCalls: 0,
    semanticCalls: 0
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  // ============================================================
  // STEP 1: Vision AI - Extract Document Structure
  // ============================================================
  logger.info('[SemanticPipeline] Step 1: Vision AI - Extracting document structure...');
  const visionStartTime = Date.now();

  try {
    // Build prompt
    const { system: visionSystem, user: visionUser } = buildVisionPrompt(
      typeof documentContent === 'string' ? documentContent : undefined
    );

    // Call Vision AI
    const aiClient = new BeekOneAIClient();
    const visionResult = await aiClient.chat.completions(
      visionSystem,
      visionUser,
      {
        model: cfg.visionModel!,
        temperature: cfg.temperature!,
        max_tokens: cfg.maxTokens!
      }
    );

    metrics.visionCalls = 1;
    metrics.visionTimeMs = Date.now() - visionStartTime;

    // Save artifacts
    docIR.artifacts.visionPrompt = visionUser;
    docIR.artifacts.visionRaw = visionResult;

    if (!visionResult.success) {
      throw new Error(`Vision AI failed: ${visionResult.error}`);
    }

    // Parse Vision response
    const parsedVision = parseVisionResponse(visionResult.data || '', cfg.visionModel);

    if (!parsedVision.success) {
      throw new Error(`Vision parsing failed: ${parsedVision.error}`);
    }

    // Validate Vision result
    const visionValidation = validateVisionResult(parsedVision);
    if (!visionValidation.isValid) {
      errors.push(...visionValidation.errors);
    }
    warnings.push(...visionValidation.warnings);

    // Convert to DocumentIR
    Object.assign(docIR, toDocumentIR(
      parsedVision,
      sourceFile,
      sourceType,
      metrics.visionTimeMs
    ));

    logger.info(`[SemanticPipeline] Vision extracted: ${docIR.paragraphs.length} paragraphs, ${docIR.sections.length} sections`);

  } catch (error: any) {
    logger.error(`[SemanticPipeline] Vision step failed: ${error.message}`);
    errors.push(`Vision failed: ${error.message}`);
    return {
      success: false,
      documentIR: docIR,
      metrics,
      errors,
      warnings
    };
  }

  // ============================================================
  // STEP 2: Semantic AI - Label paragraphs
  // ============================================================
  logger.info('[SemanticPipeline] Step 2: Semantic AI - Labeling paragraphs...');
  const semanticStartTime = Date.now();

  try {
    const allLabels: SemanticLabel[] = [];

    if (cfg.useBatchSemantic && docIR.activities.length > 0) {
      // Batch mode: process all activities at once
      const { system: semanticSystem, user: semanticUser } = buildBatchSemanticPrompt(
        docIR.paragraphs,
        docIR.activities
      );

      docIR.artifacts.semanticPrompt = semanticUser;

      const aiClient = new BeekOneAIClient();
      const semanticResult = await aiClient.chat.completions(
        semanticSystem,
        semanticUser,
        {
          model: cfg.semanticModel!,
          temperature: cfg.temperature!,
          max_tokens: cfg.maxTokens!
        }
      );

      metrics.semanticCalls = 1;

      if (!semanticResult.success) {
        throw new Error(`Semantic AI failed: ${semanticResult.error}`);
      }

      docIR.artifacts.semanticRaw = semanticResult.data || '';

      // Parse response
      const parsed = parseSemanticResponse(semanticResult.data || '');
      const validation = validateSemanticResponse(parsed, docIR.paragraphs.length);

      if (!validation.isValid) {
        warnings.push(...validation.errors);
      }
      warnings.push(...validation.warnings);

      // Map labels
      const mappingResult = mapSemanticLabels(parsed.labels || [], docIR.paragraphs, docIR.activities);
      allLabels.push(...mappingResult.semanticLabels);

    } else {
      // Per-activity mode: process each activity separately
      for (const activity of docIR.activities) {
        const { system: semanticSystem, user: semanticUser } = buildSemanticPrompt(
          docIR.paragraphs,
          activity
        );

        if (docIR.artifacts.semanticPrompt === '') {
          docIR.artifacts.semanticPrompt = semanticUser;
        }

        const aiClient = new BeekOneAIClient();

        let semanticResult: AIResult<string>;
        let attempt = 0;

        // Retry loop
        while (attempt < (cfg.maxRetries || 3)) {
          attempt++;

          semanticResult = await aiClient.chat.completions(
            semanticSystem,
            semanticUser,
            {
              model: cfg.semanticModel!,
              temperature: cfg.temperature!,
              max_tokens: cfg.maxTokens!
            }
          );

          metrics.semanticCalls++;

          if (semanticResult.success) {
            break;
          }

          logger.warn(`[SemanticPipeline] Semantic attempt ${attempt} failed, retrying...`);
        }

        if (!semanticResult.success) {
          errors.push(`Semantic AI failed for activity ${activity.id}: ${semanticResult.error}`);
          continue;
        }

        // Parse response with retry
        const parsed = parseSemanticResponseWithRetry(
          semanticResult.data || '',
          activity.id,
          cfg.maxRetries
        );

        const validation = validateSemanticResponse(parsed, docIR.paragraphs.length);
        if (!validation.isValid) {
          warnings.push(...validation.errors);
        }
        warnings.push(...validation.warnings);

        // Map labels
        const mappingResult = mapSemanticLabels(parsed.labels || [], docIR.paragraphs, [activity]);
        allLabels.push(...mappingResult.semanticLabels);

        if (attempt > 1) {
          warnings.push(`Activity ${activity.id} required ${attempt} attempts`);
        }
      }
    }

    metrics.semanticTimeMs = Date.now() - semanticStartTime;

    // Set semantic labels
    docIR.semanticLabels = allLabels;

    // Calculate coverage
    const coverage = calculateCoverage(allLabels, docIR.paragraphs);
    docIR.coverage = coverage;

    logger.info(`[SemanticPipeline] Semantic analysis complete: ${allLabels.length} labels`);
    logger.info(printCoverageSummary(coverage));

    // Validate coverage
    const coverageValidation = validateCoverage(coverage, cfg.minCoveragePercent);
    if (!coverageValidation.isValid) {
      warnings.push(...coverageValidation.issues.map(i => i.message));
    }

  } catch (error: any) {
    logger.error(`[SemanticPipeline] Semantic step failed: ${error.message}`);
    errors.push(`Semantic failed: ${error.message}`);
  }

  // ============================================================
  // STEP 3: Final validation
  // ============================================================
  logger.info('[SemanticPipeline] Step 3: Final validation...');

  metrics.totalTimeMs = Date.now() - startTime;

  // Calculate final validation
  const finalCoverage = calculateCoverage(docIR.semanticLabels, docIR.paragraphs);
  docIR.coverage = finalCoverage;

  docIR.validation = {
    isValid: errors.length === 0 && finalCoverage.coveragePercent >= (cfg.minCoveragePercent || 80),
    errors: errors.map(e => ({ type: 'MISSING_REQUIRED', message: e })),
    warnings: warnings.map(w => ({ type: 'AMBIGUOUS', message: w }))
  };

  logger.info(`[SemanticPipeline] Pipeline complete in ${metrics.totalTimeMs}ms`);
  logger.info(`[SemanticPipeline] Errors: ${errors.length}, Warnings: ${warnings.length}`);

  return {
    success: errors.length === 0,
    documentIR: docIR,
    metrics,
    errors,
    warnings
  };
}

/**
 * Quick parse - for simple text input
 */
export async function quickSemanticParse(
  text: string,
  config: SemanticPipelineConfig = {}
): Promise<SemanticPipelineResult> {
  return runSemanticPipeline(text, 'input.txt', 'text', config);
}
