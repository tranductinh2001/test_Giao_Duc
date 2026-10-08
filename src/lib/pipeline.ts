// Pipeline - Main orchestration

import { DocumentIR, SemanticLabel } from '@/types/document';
import { Review } from '@/types/review';
import { Annotation } from '@/types/annotation';
import { Rule } from '@/types/rule';
import { parsePDF, extractTables } from '@/lib/pdf-parser';
import { getBeekOneClient } from '@/lib/ai/client';
import { classifyParagraphs } from '@/lib/ai/classifier';
import { generateReview } from '@/lib/ai/reviewer';
import { resolveTarget } from '@/lib/coordinate/mapper';
import { getEnabledRules } from '@/lib/rules/registry';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logger';

export interface PipelineResult {
  document: DocumentIR;
  semanticLabels: SemanticLabel[];
  reviews: Review[];
  annotations: Annotation[];
  errors: string[];
}

export interface PipelineOptions {
  classify?: boolean;
  review?: boolean;
  rules?: Rule[];
  saveArtifacts?: boolean;
}

export async function runPipeline(
  arrayBuffer: ArrayBuffer,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const errors: string[] = [];

  const {
    classify = true,
    review = true,
    rules = getEnabledRules(),
    saveArtifacts = true,
  } = options;

  logger.info('Starting pipeline', { options });

  // Step 1: Parse PDF
  logger.info('Step 1: Parsing PDF');
  let parseResult;
  try {
    parseResult = await parsePDF(arrayBuffer);
  } catch (error) {
    logger.error('PDF parsing failed', error);
    throw new Error(`PDF parsing failed: ${(error as Error).message}`);
  }

  let document = parseResult.document;
  logger.info(`Parsed ${document.paragraphs.length} paragraphs from ${document.pages.length} pages`);

  // Step 2: Extract tables
  logger.info('Step 2: Extracting tables');
  try {
    const tables = extractTables(parseResult.textItems);
    document.tables = tables;
    logger.info(`Extracted ${tables.length} tables`);
  } catch (error) {
    logger.error('Table extraction failed', error);
    errors.push(`Table extraction: ${(error as Error).message}`);
  }

  // Step 3: Semantic classification
  let semanticLabels: SemanticLabel[] = [];
  if (classify) {
    logger.info('Step 3: Semantic classification');
    try {
      const client = getBeekOneClient();
      semanticLabels = await classifyParagraphs(
        client,
        document.paragraphs.map((p) => ({
          id: p.id,
          text: p.text,
          page: p.page,
          type: p.type,
        }))
      );
      document.semanticLabels = semanticLabels;
      logger.info(`Classified ${semanticLabels.length} paragraphs`);
    } catch (error) {
      logger.error('Semantic classification failed', error);
      errors.push(`Semantic classification: ${(error as Error).message}`);
      // Fallback: assign UNKNOWN to all
      semanticLabels = document.paragraphs.map((p) => ({
        id: uuidv4(),
        targetId: p.id,
        targetType: 'paragraph' as const,
        label: 'UNKNOWN' as const,
        confidence: 0,
        source: 'ai' as const,
      }));
      document.semanticLabels = semanticLabels;
    }
  }

  // Step 4: Generate reviews
  let reviews: Review[] = [];
  if (review) {
    logger.info('Step 4: AI review');
    try {
      const client = getBeekOneClient();
      const reviewResult = await generateReview(
        client,
        {
          document,
          paragraphs: document.paragraphs,
          tables: document.tables,
          activities: document.activities,
          semanticLabels,
        },
        rules
      );
      reviews = reviewResult.reviews;
      logger.info(`Generated ${reviews.length} reviews`);
    } catch (error) {
      logger.error('AI review failed', error);
      errors.push(`AI review: ${(error as Error).message}`);
    }
  }

  // Step 5: Map reviews to annotations
  logger.info('Step 5: Mapping reviews to annotations');
  const annotations = mapReviewsToAnnotations(reviews, document);
  document.reviews = reviews;
  document.annotations = annotations;
  logger.info(`Created ${annotations.length} annotations`);

  // Update timestamp
  document.updatedAt = new Date().toISOString();

  // Log summary
  logger.info('Pipeline completed', {
    paragraphs: document.paragraphs.length,
    tables: document.tables.length,
    activities: document.activities.length,
    semanticLabels: semanticLabels.length,
    reviews: reviews.length,
    annotations: annotations.length,
    errors: errors.length,
  });

  return {
    document,
    semanticLabels,
    reviews,
    annotations,
    errors,
  };
}

function mapReviewsToAnnotations(reviews: Review[], document: DocumentIR): Annotation[] {
  const annotations: Annotation[] = [];

  for (const review of reviews) {
    const resolved = resolveTarget(review.targetId, document);

    if (!resolved.found || !resolved.page || !resolved.bbox) {
      logger.warn(`Could not resolve target: ${review.targetId}`);
      continue;
    }

    const annotation: Annotation = {
      annotationId: `anno_${uuidv4().substring(0, 8)}`,
      type: 'highlight',
      reviewId: review.reviewId,
      targetId: review.targetId,
      targetType: review.targetType,
      page: resolved.page,
      bbox: resolved.bbox,
      color: getSeverityColor(review.severity),
      opacity: 0.3,
      comments: [
        {
          id: `comment_${uuidv4().substring(0, 8)}`,
          author: 'AI Reviewer',
          content: review.message,
          createdAt: new Date().toISOString(),
        },
      ],
      resolved: false,
    };

    annotations.push(annotation);
  }

  return annotations;
}

function getSeverityColor(severity: Review['severity']): string {
  switch (severity) {
    case 'INFO':
      return '#E3F2FD'; // Light blue
    case 'WARNING':
      return '#FFF3E0'; // Light orange
    case 'ERROR':
      return '#FFEBEE'; // Light red
    case 'CRITICAL':
      return '#FFCDD2'; // Darker red
    default:
      return '#FFF9C4'; // Light yellow
  }
}
