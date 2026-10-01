/**
 * Graph-based Pipeline Orchestrator (V2)
 *
 * Uses Graph Architecture:
 * - Multi-label semantic (one paragraph → multiple SemanticNodes)
 * - Relationship Graph between nodes
 * - Knowledge Nodes
 * - Paragraph Anchors
 *
 * Feature Flag: DOCUMENT_IR_V2_ENABLED=true
 */

import { BeekOneAIClient } from '@/lib/beekone-ai-client';
import {
  DocumentGraphIR,
  GraphSectionIR,
  ActivityGraphNode,
  GraphParagraph,
  SemanticNode,
  RelationshipGraph,
  KnowledgeNode,
  ParagraphAnchor,
  GraphValidationResult,
  RelationshipEdge,
  createSemanticNode,
  createRelationshipEdge,
  DocumentPosition,
} from './types';
import { LayoutParser, createLayoutParser } from './LayoutParser';
import { ActivityDetector, createActivityDetector } from './ActivityDetector';

/**
 * Pipeline Configuration
 */
export interface GraphPipelineConfig {
  enableFeature: boolean; // Feature flag
  outputDir: string;
  debug: boolean;
  temperature: number;
  maxTokens: number;
  enableMultiLabel: boolean;
  enableKnowledgeExtraction: boolean;
  enableRelationshipDetection: boolean;
}

const DEFAULT_CONFIG: GraphPipelineConfig = {
  enableFeature: process.env.DOCUMENT_IR_V2_ENABLED === 'true',
  outputDir: './outputs/graph-pipeline',
  debug: true,
  temperature: 0.1,
  maxTokens: 4000,
  enableMultiLabel: true,
  enableKnowledgeExtraction: true,
  enableRelationshipDetection: true,
};

/**
 * Graph Pipeline Orchestrator
 */
export class GraphPipelineOrchestrator {
  private config: GraphPipelineConfig;
  private layoutParser: LayoutParser;
  private activityDetector: ActivityDetector;

  constructor(config: Partial<GraphPipelineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.layoutParser = createLayoutParser();
    this.activityDetector = createActivityDetector();
  }

  /**
   * Run Graph Pipeline
   */
  async run(
    visionData: any,
    sourceFile: string,
    aiClient: BeekOneAIClient
  ): Promise<DocumentGraphIR> {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(80)}`);
    console.log('GRAPH PIPELINE ORCHESTRATOR (V2)');
    console.log(`Feature enabled: ${this.config.enableFeature}`);
    console.log(`Multi-label: ${this.config.enableMultiLabel}`);
    console.log('='.repeat(80));

    // Stage 1: Layout Parser
    console.log('\n[Stage 1] Layout Parser');
    const { layout, paragraphs, headings } = this.layoutParser.parse(visionData, sourceFile);
    console.log(`  Paragraphs: ${paragraphs.length}`);

    // Stage 2: Activity Detection
    console.log('\n[Stage 2] Activity Detection');
    const activityResult = this.activityDetector.detect(paragraphs, headings, layout);
    console.log(`  Activities: ${activityResult.activities.length}`);

    // Convert to Graph format
    const graphParagraphs = this.buildGraphParagraphs(paragraphs, layout);
    const graphSections = this.buildGraphSections(layout);
    const graphActivities = this.buildGraphActivities(activityResult.activities);

    // Stage 3: Multi-label Semantic Classification
    console.log('\n[Stage 3] Multi-label Semantic Classification');
    const { semanticNodes, anchors } = await this.runMultiLabelSemantic(
      graphParagraphs,
      graphActivities,
      aiClient
    );
    console.log(`  Semantic Nodes: ${semanticNodes.length}`);
    console.log(`  Anchors: ${anchors.length}`);

    // Stage 4: Knowledge Extraction
    let knowledgeNodes: KnowledgeNode[] = [];
    if (this.config.enableKnowledgeExtraction) {
      console.log('\n[Stage 4] Knowledge Extraction');
      knowledgeNodes = await this.extractKnowledgeNodes(semanticNodes, aiClient);
      console.log(`  Knowledge Nodes: ${knowledgeNodes.length}`);
    }

    // Stage 5: Relationship Detection
    let relationshipEdges: RelationshipEdge[] = [];
    if (this.config.enableRelationshipDetection) {
      console.log('\n[Stage 5] Relationship Detection');
      relationshipEdges = this.detectRelationships(semanticNodes);
      console.log(`  Edges: ${relationshipEdges.length}`);
    }

    // Build Semantic Graph
    const semanticGraph: RelationshipGraph = {
      nodes: semanticNodes,
      edges: relationshipEdges,
      metrics: {
        totalNodes: semanticNodes.length,
        totalEdges: relationshipEdges.length,
        averageConnections: relationshipEdges.length / Math.max(semanticNodes.length, 1),
        maxConnections: this.calculateMaxConnections(relationshipEdges),
      },
    };

    // Validate
    const validation = this.validateGraph(graphParagraphs, semanticNodes, graphSections);

    // Build final DocumentGraphIR
    const documentGraphIR: DocumentGraphIR = {
      metadata: {
        sourceFile,
        sourceType: 'pdf',
        totalPages: layout.metadata.totalPages,
        totalParagraphs: graphParagraphs.length,
        totalSections: graphSections.length,
        totalActivities: graphActivities.length,
        totalSemanticNodes: semanticNodes.length,
        totalKnowledgeNodes: knowledgeNodes.length,
        processingTimeMs: Date.now() - startTime,
        extractedAt: new Date().toISOString(),
        version: 'v2',
      },
      sections: graphSections,
      activities: graphActivities,
      paragraphs: graphParagraphs,
      semanticGraph,
      knowledgeNodes,
      anchors,
      validation,
    };

    console.log(`\n${'='.repeat(80)}`);
    console.log('GRAPH PIPELINE COMPLETE');
    console.log(`Total time: ${documentGraphIR.metadata.processingTimeMs}ms`);
    console.log('='.repeat(80));

    return documentGraphIR;
  }

  /**
   * Convert ParagraphIR to GraphParagraph
   */
  private buildGraphParagraphs(paragraphs: any[], layout: any): GraphParagraph[] {
    return paragraphs.map((p, idx) => ({
      id: p.id,
      content: p.content,
      position: {
        pageNumber: parseInt(p.pageId?.replace('page_', '')) || 1,
        lineNumber: p.lineNumber || idx,
        order: p.readingOrder || idx,
      },
      semanticNodeIds: [],
      sectionId: undefined,
      activityId: undefined,
      anchorIds: [],
      isHeading: p.type === 'heading',
      headingLevel: p.headingLevel,
    }));
  }

  /**
   * Convert Layout to Graph Sections
   */
  private buildGraphSections(layout: any): GraphSectionIR[] {
    return (layout.sections || []).map((s: any, idx: number) => ({
      id: s.id,
      title: s.title,
      code: s.code || 'OTHER',
      type: 'OTHER',
      pageStart: s.pageStart || 1,
      pageEnd: s.pageEnd || 1,
      order: s.order || idx,
      paragraphIds: [],
      activityIds: [],
      confidence: 0.9,
    }));
  }

  /**
   * Convert ActivityIR to Graph Activity
   */
  private buildGraphActivities(activities: any[]): ActivityGraphNode[] {
    return activities.map((a, idx) => ({
      id: a.id,
      title: a.title,
      type: a.type || 'CUSTOM',
      paragraphIds: a.paragraphIds || [],
      semanticNodeIds: [],
      order: a.order || idx,
      pageNumbers: [],
      knowledgeNodeIds: [],
      confidence: a.confidence || 0.9,
      duration: a.duration,
    }));
  }

  /**
   * Run Multi-label Semantic Classification
   *
   * KEY: One paragraph can have MULTIPLE semantic labels
   */
  private async runMultiLabelSemantic(
    paragraphs: GraphParagraph[],
    activities: ActivityGraphNode[],
    aiClient: BeekOneAIClient
  ): Promise<{ semanticNodes: SemanticNode[]; anchors: ParagraphAnchor[] }> {
    const semanticNodes: SemanticNode[] = [];
    const anchors: ParagraphAnchor[] = [];

    // Group paragraphs by activity
    const activityParagraphs = new Map<string, GraphParagraph[]>();
    for (const para of paragraphs) {
      const activityId = para.activityId || 'default';
      if (!activityParagraphs.has(activityId)) {
        activityParagraphs.set(activityId, []);
      }
      activityParagraphs.get(activityId)!.push(para);
    }

    // Process each activity
    for (const activity of activities) {
      const activityParas = paragraphs.filter(p =>
        (activity.paragraphIds as string[]).includes(p.id)
      );

      if (activityParas.length === 0) continue;

      // Build prompt for multi-label classification
      const prompt = this.buildMultiLabelPrompt(activityParas, activity);

      try {
        const result = await aiClient.complete(prompt, {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });

        if (result.success && result.data) {
          const nodes = this.parseMultiLabelResponse(result.data, activityParas, semanticNodes.length);
          semanticNodes.push(...nodes);
        }
      } catch (error) {
        console.error(`  Error in semantic classification:`, error);
      }
    }

    return { semanticNodes, anchors };
  }

  /**
   * Build prompt for multi-label classification
   */
  private buildMultiLabelPrompt(paragraphs: GraphParagraph[], activity: ActivityGraphNode): string {
    const paragraphsText = paragraphs
      .map((p, idx) => `[${idx}] ${p.content}`)
      .join('\n\n');

    return `Bạn là chuyên gia PHÂN TÍCH NGỮ NGHĨA CHO GIÁO ÁN VIỆT NAM.

NHIỆM VỤ: Đọc các đoạn văn và XÁC ĐỊNH TẤT CẢ các loại ngữ nghĩa cho từng đoạn.

⚠️ QUAN TRỌNG:
- MỘI paragraph có thể thuộc NHIỀU loại ngữ nghĩa
- Trả về tất cả các loại cho mỗi paragraph
- Chỉ trả về INDEX (số), KHÔNG viết lại nội dung

📋 11 LOẠI NGỮ NGHĨA:
1. TEACHER_ACTION - GV làm gì
2. STUDENT_ACTION - HS làm gì
3. TEACHING_MATERIAL - Học liệu
4. LEARNING_OUTCOME - Kết quả/Mục tiêu
5. QUESTION - Câu hỏi
6. ASSESSMENT - Đánh giá
7. SECTION_HEADER - Tiêu đề
8. PRODUCT - Sản phẩm
9. OBJECTIVE - Mục tiêu cụ thể
10. INSTRUCTION - Hướng dẫn
11. UNKNOWN - Không xác định

📝 HOẠT ĐỘNG: ${activity.title}

📄 CÁC ĐOẠN VĂN:
${paragraphsText}

📤 TRẢ VỀ JSON (multi-label):
{
  "labels": [
    {
      "paragraphIndex": 0,
      "types": ["TEACHER_ACTION", "QUESTION"],
      "confidence": 0.95
    }
  ]
}`;
  }

  /**
   * Parse multi-label response
   */
  private parseMultiLabelResponse(
    response: string,
    paragraphs: GraphParagraph[],
    startNodeId: number
  ): SemanticNode[] {
    const nodes: SemanticNode[] = [];

    try {
      // Clean markdown
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      jsonStr = jsonStr.trim();

      const data = JSON.parse(jsonStr);
      const labels = data.labels || [];

      for (const label of labels) {
        const paraIdx = label.paragraphIndex;
        const types = label.types || [];
        const confidence = label.confidence || 0.9;

        if (paraIdx >= 0 && paraIdx < paragraphs.length) {
          const para = paragraphs[paraIdx];

          // Create a node for EACH type
          for (const type of types) {
            const nodeId = `node_${startNodeId + nodes.length}`;
            const node = createSemanticNode(
              nodeId,
              type as any,
              [para.id],
              para.position,
              {
                confidence,
                reason: `Classified as ${type}`,
              }
            );
            nodes.push(node);
          }
        }
      }
    } catch (error) {
      console.error('  Error parsing multi-label response:', error);
    }

    return nodes;
  }

  /**
   * Extract knowledge nodes from semantic nodes
   */
  private async extractKnowledgeNodes(
    semanticNodes: SemanticNode[],
    aiClient: BeekOneAIClient
  ): Promise<KnowledgeNode[]> {
    const knowledgeNodes: KnowledgeNode[] = [];

    // Extract from LEARNING_OUTCOME and OBJECTIVE nodes
    const outcomeNodes = semanticNodes.filter(n =>
      n.type === 'LEARNING_OUTCOME' || n.type === 'OBJECTIVE'
    );

    for (const node of outcomeNodes) {
      knowledgeNodes.push({
        id: `knowledge_${knowledgeNodes.length}`,
        type: 'knowledge',
        code: node.type,
        description: node.description || node.label,
        level: 'required',
        sourceParagraphIds: node.paragraphIds,
        confidence: node.confidence,
      });
    }

    return knowledgeNodes;
  }

  /**
   * Detect relationships between semantic nodes
   */
  private detectRelationships(nodes: SemanticNode[]): RelationshipEdge[] {
    const edges: RelationshipEdge[] = [];

    // Group by paragraph
    const byParagraph = new Map<string, SemanticNode[]>();
    for (const node of nodes) {
      for (const paraId of node.paragraphIds) {
        if (!byParagraph.has(paraId)) {
          byParagraph.set(paraId, []);
        }
        byParagraph.get(paraId)!.push(node);
      }
    }

    // Create edges for nodes on same paragraph
    byParagraph.forEach((paragraphNodes) => {
      if (paragraphNodes.length > 1) {
        // Create edges between all nodes on same paragraph
        for (let i = 0; i < paragraphNodes.length; i++) {
          for (let j = i + 1; j < paragraphNodes.length; j++) {
            edges.push(createRelationshipEdge(
              paragraphNodes[i].id,
              paragraphNodes[j].id,
              'similar_to',
              0.8
            ));
          }
        }
      }
    });

    return edges;
  }

  /**
   * Calculate max connections for a node
   */
  private calculateMaxConnections(edges: RelationshipEdge[]): number {
    const counts = new Map<string, number>();
    for (const edge of edges) {
      counts.set(edge.sourceNodeId, (counts.get(edge.sourceNodeId) || 0) + 1);
      counts.set(edge.targetNodeId, (counts.get(edge.targetNodeId) || 0) + 1);
    }
    return Math.max(0, ...Array.from(counts.values()));
  }

  /**
   * Validate Graph
   */
  private validateGraph(
    paragraphs: GraphParagraph[],
    nodes: SemanticNode[],
    sections: GraphSectionIR[]
  ): GraphValidationResult {
    const errors: GraphValidationResult['errors'] = [];
    const warnings: GraphValidationResult['warnings'] = [];

    // Check for orphan paragraphs (no semantic nodes)
    const orphanParagraphs = paragraphs.filter(p => p.semanticNodeIds.length === 0);
    if (orphanParagraphs.length > paragraphs.length * 0.5) {
      warnings.push({
        type: 'LOW_COVERAGE',
        message: `${orphanParagraphs.length} paragraphs have no semantic labels`,
      });
    }

    // Check for isolated nodes
    const connectedNodes = new Set<string>();
    for (const node of nodes) {
      if (node.relatedNodeIds.length > 0) {
        connectedNodes.add(node.id);
      }
    }
    const isolatedNodes = nodes.filter(n => !connectedNodes.has(n.id));
    if (isolatedNodes.length > nodes.length * 0.5) {
      warnings.push({
        type: 'LOW_CONFIDENCE',
        message: `${isolatedNodes.length} semantic nodes have no relationships`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(): boolean {
    return this.config.enableFeature;
  }
}

/**
 * Create GraphPipelineOrchestrator instance
 */
export function createGraphPipelineOrchestrator(
  config?: Partial<GraphPipelineConfig>
): GraphPipelineOrchestrator {
  return new GraphPipelineOrchestrator(config);
}
