/**
 * SemanticMapper Module
 *
 * Maps semantic labels back to original paragraphs.
 * Creates the semantic tree structure.
 */

import {
  DocumentIR,
  Paragraph,
  Section,
  Activity,
  SemanticLabel,
  SemanticTree,
  SemanticTypeId
} from './DocumentIR';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * Mapping Result
 */
export interface MappingResult {
  success: boolean;
  semanticLabels: SemanticLabel[];
  semanticTree: SemanticTree;
  unmappedParagraphs: string[];
  errors: string[];
}

/**
 * Map semantic labels to document paragraphs
 */
export function mapSemanticLabels(
  labels: SemanticLabel[],
  paragraphs: Paragraph[],
  activities: Activity[]
): MappingResult {
  logger.info(`[SemanticMapper] Mapping ${labels.length} labels to ${paragraphs.length} paragraphs`);

  const mappedLabels: SemanticLabel[] = [];
  const unmappedParagraphIds: string[] = [];
  const errors: string[] = [];

  // Create paragraph index map
  const paragraphIndexMap = new Map<string, number>();
  paragraphs.forEach((p, idx) => {
    paragraphIndexMap.set(p.id, idx);
  });

  // Map each label to paragraph
  labels.forEach(label => {
    // Try to find paragraph by ID or index
    let targetParagraph: Paragraph | undefined;

    if (label.paragraphId) {
      targetParagraph = paragraphs.find(p => p.id === label.paragraphId);
    }

    if (!targetParagraph && label.paragraphIndex >= 0) {
      targetParagraph = paragraphs[label.paragraphIndex];
    }

    if (targetParagraph) {
      mappedLabels.push({
        ...label,
        paragraphId: targetParagraph.id,
        paragraphIndex: paragraphIndexMap.get(targetParagraph.id) ?? label.paragraphIndex
      });
    } else {
      errors.push(`Label references non-existent paragraph: ${label.paragraphId || label.paragraphIndex}`);
      unmappedParagraphIds.push(label.paragraphId || `p${label.paragraphIndex}`);
    }
  });

  // Build semantic tree
  const semanticTree = buildSemanticTree(mappedLabels, activities);

  logger.info(`[SemanticMapper] Mapped ${mappedLabels.length} labels, ${unmappedParagraphIds.length} unmapped`);

  return {
    success: errors.length === 0,
    semanticLabels: mappedLabels,
    semanticTree,
    unmappedParagraphs: unmappedParagraphIds,
    errors
  };
}

/**
 * Build semantic tree from mapped labels
 */
function buildSemanticTree(
  labels: SemanticLabel[],
  activities: Activity[]
): SemanticTree {
  const tree: SemanticTree = { sections: [] };

  // Group labels by activity
  const activityLabelsMap = new Map<string, SemanticLabel[]>();

  // First, assign labels to activities based on paragraph positions
  activities.forEach(activity => {
    const activityLabels = labels.filter(label => {
      const labelParagraph = activity.paragraphIds.includes(label.paragraphId);
      return labelParagraph;
    });

    if (activityLabels.length > 0) {
      activityLabelsMap.set(activity.id, activityLabels);
    }
  });

  // Build tree structure (simplified - assumes single section for now)
  tree.sections = [{
    sectionId: 's0',
    sectionTitle: 'Document',
    activities: activities.map(activity => ({
      activityId: activity.id,
      activityTitle: activity.title,
      labels: activityLabelsMap.get(activity.id) || []
    }))
  }];

  return tree;
}

/**
 * Merge labels from multiple sources
 */
export function mergeLabels(
  primaryLabels: SemanticLabel[],
  fallbackLabels: SemanticLabel[]
): SemanticLabel[] {
  const merged = new Map<string, SemanticLabel>();

  // Add primary labels
  primaryLabels.forEach(label => {
    const key = `${label.paragraphId}-${label.type}`;
    merged.set(key, label);
  });

  // Add fallback labels for missing paragraphs
  const primaryParagraphIds = new Set(primaryLabels.map(l => l.paragraphId));

  fallbackLabels.forEach(label => {
    if (!primaryParagraphIds.has(label.paragraphId)) {
      const key = `${label.paragraphId}-${label.type}`;
      merged.set(key, label);
    }
  });

  return Array.from(merged.values());
}

/**
 * Get labels for specific paragraph
 */
export function getLabelsForParagraph(
  labels: SemanticLabel[],
  paragraphId: string
): SemanticLabel[] {
  return labels.filter(l => l.paragraphId === paragraphId);
}

/**
 * Get labels by type
 */
export function getLabelsByType(
  labels: SemanticLabel[],
  type: SemanticTypeId
): SemanticLabel[] {
  return labels.filter(l => l.type === type);
}

/**
 * Get paragraph IDs by type
 */
export function getParagraphIdsByType(
  labels: SemanticLabel[],
  type: SemanticTypeId
): string[] {
  return labels
    .filter(l => l.type === type)
    .map(l => l.paragraphId);
}

/**
 * Calculate label distribution
 */
export function calculateLabelDistribution(
  labels: SemanticLabel[]
): Record<SemanticTypeId, number> {
  const distribution: Record<string, number> = {};

  labels.forEach(label => {
    distribution[label.type] = (distribution[label.type] || 0) + 1;
  });

  return distribution as Record<SemanticTypeId, number>;
}
