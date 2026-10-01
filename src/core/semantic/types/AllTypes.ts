/**
 * All IR Types - Consolidated
 *
 * Supports:
 * - V1: Clean Architecture (single-label)
 * - V2: Graph Architecture (multi-label with relationships)
 *
 * Feature Flag: DOCUMENT_IR_V2_ENABLED=true
 */

import { SemanticTypeId } from '../SemanticOntology';

// ============================================================================
// V1: Clean Architecture Types (single-label)
// ============================================================================

export interface PageIR {
  id: string;
  pageNumber: number;
  width?: number;
  height?: number;
}

export type BlockType = 'text' | 'heading' | 'list' | 'table' | 'image' | 'formula';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BlockIR {
  id: string;
  type: BlockType;
  content: string;
  pageId: string;
  bbox?: BoundingBox;
  readingOrder: number;
  metadata?: Record<string, any>;
}

export interface HeadingIR {
  id: string;
  text: string;
  level: number;
  pageId: string;
  blockId: string;
  readingOrder: number;
  isActivityHeading: boolean;
  activityPattern?: string;
}

export interface ParagraphIR {
  id: string;
  content: string;
  type: 'text' | 'heading' | 'list' | 'table';
  pageId: string;
  blockId: string;
  sectionId?: string;
  lineNumber: number;
  readingOrder: number;
  headingLevel?: number;
  listItem?: string;
  tableData?: TableDataIR;
  metadata?: Record<string, any>;
}

export interface TableDataIR {
  id: string;
  rows: string[][];
  headers: string[];
  pageId: string;
}

export interface SectionIR {
  id: string;
  title: string;
  code: string;
  pageStart: number;
  pageEnd: number;
  order: number;
  paragraphIds: string[];
}

export interface LayoutIR {
  metadata: {
    title?: string;
    language: string;
    totalPages: number;
    totalSections: number;
    confidence: number;
  };
  pages: PageIR[];
  sections: SectionIR[];
  headings: HeadingIR[];
  blocks: BlockIR[];
}

export interface ActivityIR {
  id: string;
  title: string;
  type: ActivityTypeCode;
  order: number;
  paragraphIds: string[];
  sectionId?: string;
  startParagraphId: string;
  endParagraphId: string;
  confidence: number;
  detectionMethod: 'heading' | 'keyword' | 'numbering' | 'fallback';
  matchedPattern?: string;
}

export type ActivityTypeCode =
  | 'WARM_UP' | 'PRESENTATION' | 'EXPLORATION' | 'GUIDED_PRACTICE'
  | 'INDEPENDENT_PRACTICE' | 'APPLICATION' | 'CONSOLIDATION' | 'EXTENSION'
  | 'EVALUATION' | 'HOMEWORK' | 'CUSTOM';

export interface SemanticLabelIR {
  paragraphId: string;
  paragraphIndex: number;
  type: SemanticTypeId;
  confidence: number;
}

export interface LabeledActivityIR {
  activity: ActivityIR;
  teacherActionIds: string[];
  studentActionIds: string[];
  teachingMaterialIds: string[];
  learningOutcomeIds: string[];
  questionIds: string[];
  assessmentIds: string[];
  productIds: string[];
  objectiveIds: string[];
  instructionIds: string[];
  unknownIds: string[];
}

export interface CleanDocumentIR {
  metadata: {
    sourceFile: string;
    sourceType: 'pdf' | 'docx' | 'image';
    totalPages: number;
    totalParagraphs: number;
    totalActivities: number;
    processingTimeMs: number;
    extractedAt: string;
  };
  layout: LayoutIR;
  paragraphs: ParagraphIR[];
  activities: ActivityIR[];
  semanticLabels: SemanticLabelIR[];
  artifacts: Record<string, any>;
}

// ============================================================================
// V2: Graph Architecture Types (multi-label with relationships)
// ============================================================================

// Paragraph Anchor - cross-reference between paragraphs
export interface ParagraphAnchor {
  sourceParagraphId: string;
  targetParagraphId: string;
  anchorType: 'references' | 'prerequisite' | 'extends' | 'example_of';
  confidence: number;
}

// Position in document
export interface DocumentPosition {
  pageNumber: number;
  lineNumber: number;
  order: number;
}

// Graph Section
export interface GraphSectionIR {
  id: string;
  title: string;
  code: GraphSectionCode;
  type: GraphSectionType;
  pageStart: number;
  pageEnd: number;
  order: number;
  paragraphIds: string[];
  activityIds: string[];
  confidence: number;
  metadata?: Record<string, any>;
}

export type GraphSectionCode =
  | 'OBJECTIVE' | 'MATERIALS' | 'ACTIVITIES' | 'INTRODUCTION'
  | 'LEARNING' | 'PRACTICE' | 'APPLICATION' | 'CONSOLIDATION'
  | 'HOMEWORK' | 'EVALUATION' | 'YEU_CAU_CAN_DAT' | 'KIEN_THUC_KY_NANG'
  | 'NANG_LUC' | 'NANG_LUC_CHUNG' | 'NANG_LUC_DAC_THU'
  | 'OTHER';

export type GraphSectionType = 'OBJECTIVE' | 'MATERIALS' | 'ACTIVITIES' | 'OTHER';

// Knowledge Node
export interface KnowledgeNode {
  id: string;
  type: 'competency' | 'skill' | 'knowledge' | 'attitude';
  code: string;
  description: string;
  level?: 'required' | 'extended' | 'optional';
  sourceParagraphIds: string[];
  confidence: number;
}

// Semantic Node (V2 - can have relationships)
export interface SemanticNode {
  id: string;
  type: SemanticTypeId;
  label: string;
  description?: string;
  paragraphIds: string[];
  position: DocumentPosition;
  confidence: number;
  reason?: string;
  relatedNodeIds: string[];
  relationshipType?: SemanticRelationshipType;
  knowledgeNodeIds: string[];
  metadata?: Record<string, any>;
}

export type SemanticRelationshipType =
  | 'prerequisite'
  | 'supports'
  | 'contradicts'
  | 'extends'
  | 'example_of'
  | 'part_of'
  | 'similar_to';

// Relationship Graph
export interface RelationshipGraph {
  nodes: SemanticNode[];
  edges: RelationshipEdge[];
  metrics: {
    totalNodes: number;
    totalEdges: number;
    averageConnections: number;
    maxConnections: number;
  };
}

export interface RelationshipEdge {
  sourceNodeId: string;
  targetNodeId: string;
  relationship: SemanticRelationshipType;
  weight: number;
}

// Multi-label result
export interface MultiLabelSemanticResult {
  nodes: SemanticNode[];
  primaryNode?: SemanticNode;
  allLabels: Array<{
    type: SemanticTypeId;
    confidence: number;
    nodeId: string;
  }>;
  paragraphAnchors: ParagraphAnchor[];
}

// Graph Activity Node
export interface ActivityGraphNode {
  id: string;
  title: string;
  type: ActivityTypeCode;
  paragraphIds: string[];
  semanticNodeIds: string[];
  order: number;
  pageNumbers: number[];
  knowledgeNodeIds: string[];
  confidence: number;
  duration?: string;
}

// Graph Paragraph
export interface GraphParagraph {
  id: string;
  content: string;
  position: DocumentPosition;
  semanticNodeIds: string[];
  sectionId?: string;
  activityId?: string;
  anchorIds: string[];
  isHeading: boolean;
  headingLevel?: number;
  metadata?: Record<string, any>;
}

// Graph IR Metadata
export interface GraphIRMetadata {
  sourceFile: string;
  sourceType: 'pdf' | 'docx' | 'image';
  totalPages: number;
  totalParagraphs: number;
  totalSections: number;
  totalActivities: number;
  totalSemanticNodes: number;
  totalKnowledgeNodes: number;
  processingTimeMs: number;
  extractedAt: string;
  version: 'v1' | 'v2';
}

// Document Graph IR (V2)
export interface DocumentGraphIR {
  metadata: GraphIRMetadata;
  sections: GraphSectionIR[];
  activities: ActivityGraphNode[];
  paragraphs: GraphParagraph[];
  semanticGraph: RelationshipGraph;
  knowledgeNodes: KnowledgeNode[];
  anchors: ParagraphAnchor[];
  validation: GraphValidationResult;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationError[];
  warnings: GraphValidationWarning[];
}

export interface GraphValidationError {
  type: 'MISSING_REQUIRED' | 'INVALID_TYPE' | 'ISOLATED_NODE' | 'ORPHAN_PARAGRAPH';
  message: string;
  location?: string;
}

export interface GraphValidationWarning {
  type: 'LOW_COVERAGE' | 'MISSING_OPTIONAL' | 'AMBIGUOUS' | 'LOW_CONFIDENCE';
  message: string;
  location?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function createSemanticNode(
  id: string,
  type: SemanticTypeId,
  paragraphIds: string[],
  position: DocumentPosition,
  options?: {
    label?: string;
    description?: string;
    confidence?: number;
    reason?: string;
    relatedNodeIds?: string[];
    knowledgeNodeIds?: string[];
  }
): SemanticNode {
  return {
    id,
    type,
    label: options?.label || type,
    description: options?.description,
    paragraphIds,
    position,
    confidence: options?.confidence ?? 0.9,
    reason: options?.reason,
    relatedNodeIds: options?.relatedNodeIds || [],
    knowledgeNodeIds: options?.knowledgeNodeIds || [],
  };
}

export function createRelationshipEdge(
  sourceNodeId: string,
  targetNodeId: string,
  relationship: SemanticRelationshipType,
  weight: number = 1.0
): RelationshipEdge {
  return {
    sourceNodeId,
    targetNodeId,
    relationship,
    weight,
  };
}

export function addMultiLabelToParagraph(
  graph: DocumentGraphIR,
  paragraphId: string,
  nodes: SemanticNode[]
): DocumentGraphIR {
  const newNodes = [...graph.semanticGraph.nodes, ...nodes];

  const newParagraphs = graph.paragraphs.map(p => {
    if (p.id === paragraphId) {
      return {
        ...p,
        semanticNodeIds: [...p.semanticNodeIds, ...nodes.map(n => n.id)],
      };
    }
    return p;
  });

  const newEdges = [...graph.semanticGraph.edges];

  return {
    ...graph,
    paragraphs: newParagraphs,
    semanticGraph: {
      nodes: newNodes,
      edges: newEdges,
      metrics: calculateGraphMetrics(newNodes, newEdges),
    },
  };
}

function calculateGraphMetrics(
  nodes: SemanticNode[],
  edges: RelationshipEdge[]
): RelationshipGraph['metrics'] {
  const connectionCount = new Map<string, number>();

  for (const edge of edges) {
    connectionCount.set(edge.sourceNodeId, (connectionCount.get(edge.sourceNodeId) || 0) + 1);
    connectionCount.set(edge.targetNodeId, (connectionCount.get(edge.targetNodeId) || 0) + 1);
  }

  const counts = Array.from(connectionCount.values());
  const maxConnections = counts.length > 0 ? Math.max(...counts) : 0;
  const averageConnections = counts.length > 0
    ? counts.reduce((a, b) => a + b, 0) / counts.length
    : 0;

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    averageConnections,
    maxConnections,
  };
}
