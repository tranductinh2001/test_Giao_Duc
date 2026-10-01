/**
 * Clean Pipeline Orchestrator (Clean Architecture)
 *
 * Pipeline stages:
 * 1. Vision → VisionData
 * 2. LayoutParser → LayoutIR + ParagraphIR + HeadingIR
 * 3. ActivityDetector → ActivityIR
 * 4. Semantic Classification → Semantic Labels
 * 5. Mapper → DocumentIR
 *
 * Feature flag support for backward compatibility.
 */

import { BeekOneAIClient } from '@/lib/beekone-ai-client';
import {
  LayoutIR,
  ParagraphIR,
  HeadingIR,
  ActivityIR,
  SemanticLabelIR,
  CleanDocumentIR,
} from './types';
import { LayoutParser, createLayoutParser } from './LayoutParser';
import { ActivityDetector, createActivityDetector } from './ActivityDetector';

/**
 * Pipeline Configuration
 */
export interface CleanPipelineConfig {
  enableFeature: boolean; // Feature flag to enable new pipeline
  outputDir: string;
  debug: boolean;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_CONFIG: CleanPipelineConfig = {
  enableFeature: process.env.DOCUMENT_IR_ENABLED === 'true',
  outputDir: './outputs/clean-pipeline',
  debug: true,
  temperature: 0.1,
  maxTokens: 4000,
};

/**
 * Pipeline Stage Results
 */
export interface PipelineStages {
  vision: any;
  layout: LayoutIR;
  paragraphs: ParagraphIR[];
  headings: HeadingIR[];
  activities: ActivityIR[];
  semanticLabels: SemanticLabelIR[];
  documentIR: CleanDocumentIR;
}

/**
 * Clean Pipeline Orchestrator
 *
 * Uses Clean Architecture IR types:
 * - LayoutParser: Vision → LayoutIR + ParagraphIR + HeadingIR
 * - ActivityDetector: ParagraphIR + HeadingIR → ActivityIR
 * - Semantic Classification: ActivityIR → Semantic Labels
 * - Mapper: → DocumentIR
 */
export class CleanPipelineOrchestrator {
  private config: CleanPipelineConfig;
  private layoutParser: LayoutParser;
  private activityDetector: ActivityDetector;

  constructor(config: Partial<CleanPipelineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.layoutParser = createLayoutParser();
    this.activityDetector = createActivityDetector();
  }

  /**
   * Run clean pipeline
   */
  async run(
    visionData: any,
    sourceFile: string,
    aiClient: BeekOneAIClient
  ): Promise<CleanDocumentIR> {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(80)}`);
    console.log('CLEAN PIPELINE ORCHESTRATOR');
    console.log(`Feature enabled: ${this.config.enableFeature}`);
    console.log('='.repeat(80));

    // Stage 1: Layout Parser
    console.log('\n[Stage 1] Layout Parser');
    const stage1Start = Date.now();
    const { layout, paragraphs, headings } = this.layoutParser.parse(visionData, sourceFile);
    console.log(`  Layout parsed: ${paragraphs.length} paragraphs, ${headings.length} headings`);
    console.log(`  Time: ${Date.now() - stage1Start}ms`);

    // Stage 2: Activity Detection
    console.log('\n[Stage 2] Activity Detection');
    const stage2Start = Date.now();
    const activityResult = this.activityDetector.detect(paragraphs, headings, layout);
    console.log(`  Activities detected: ${activityResult.activities.length}`);
    console.log(`  Time: ${Date.now() - stage2Start}ms`);

    // Validate activity detection
    const validation = this.activityDetector.validate(activityResult, paragraphs.length);
    if (!validation.valid) {
      console.log(`  ⚠️  Validation errors: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.log(`  ⚠️  Warnings: ${validation.warnings.join(', ')}`);
    }

    // Stage 3: Semantic Classification (placeholder - uses existing AI)
    console.log('\n[Stage 3] Semantic Classification');
    const stage3Start = Date.now();
    const semanticLabels = await this.runSemanticClassification(
      activityResult.activities,
      paragraphs,
      aiClient
    );
    console.log(`  Labels: ${semanticLabels.length}`);
    console.log(`  Time: ${Date.now() - stage3Start}ms`);

    // Stage 4: Build DocumentIR
    console.log('\n[Stage 4] Build DocumentIR');
    const documentIR = this.buildDocumentIR(
      sourceFile,
      layout,
      paragraphs,
      activityResult.activities,
      semanticLabels,
      startTime
    );

    console.log(`\n${'='.repeat(80)}`);
    console.log('CLEAN PIPELINE COMPLETE');
    console.log(`Total time: ${documentIR.metadata.processingTimeMs}ms`);
    console.log('='.repeat(80));

    return documentIR;
  }

  /**
   * Run semantic classification
   * Uses existing AI but with new IR structure
   */
  private async runSemanticClassification(
    activities: ActivityIR[],
    paragraphs: ParagraphIR[],
    aiClient: BeekOneAIClient
  ): Promise<SemanticLabelIR[]> {
    const labels: SemanticLabelIR[] = [];

    // Build prompt for each activity
    for (const activity of activities) {
      const activityParagraphs = paragraphs.filter(p =>
        activity.paragraphIds.includes(p.id)
      );

      if (activityParagraphs.length === 0) continue;

      const prompt = this.buildSemanticPrompt(activity, activityParagraphs);

      try {
        const result = await aiClient.complete(prompt, {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });

        if (result.success && result.data) {
          const activityLabels = this.parseSemanticResponse(result.data, activity, paragraphs);
          labels.push(...activityLabels);
        }
      } catch (error) {
        console.error(`  Error classifying activity ${activity.id}:`, error);
      }
    }

    return labels;
  }

  /**
   * Build semantic prompt
   */
  private buildSemanticPrompt(activity: ActivityIR, paragraphs: ParagraphIR[]): string {
    const paragraphsText = paragraphs
      .map((p, idx) => `[${idx}] ${p.content}`)
      .join('\n\n');

    return `Bạn là chuyên gia PHÂN TÍCH NGỮ NGHĨA CHO GIÁO ÁN VIỆT NAM.

NHIỆM VỤ: Đọc các đoạn văn và XÁC ĐỊNH loại ngữ nghĩa cho từng đoạn.

⚠️ QUAN TRỌNG:
- CHỈ trả về INDEX (số), KHÔNG viết lại nội dung
- MỖI paragraph phải thuộc ĐÚNG 1 loại

📋 11 LOẠI NGỮ NGHĨA:
1. TEACHER_ACTION - GV làm gì
2. STUDENT_ACTION - HS làm gì
3. TEACHING_MATERIAL - Học liệu
4. LEARNING_OUTCOME - Kết quả
5. QUESTION - Câu hỏi
6. ASSESSMENT - Đánh giá
7. SECTION_HEADER - Tiêu đề
8. PRODUCT - Sản phẩm
9. OBJECTIVE - Mục tiêu
10. INSTRUCTION - Hướng dẫn
11. UNKNOWN - Không xác định

📝 HOẠT ĐỘNG: ${activity.title}

📄 CÁC ĐOẠN VĂN:
${paragraphsText}

📤 TRẢ VỀ JSON:
{
  "teacherActionIndexes": [],
  "studentActionIndexes": [],
  "teachingMaterialIndexes": [],
  "learningOutcomeIndexes": [],
  "questionIndexes": [],
  "assessmentIndexes": [],
  "sectionHeaderIndexes": [],
  "productIndexes": [],
  "objectiveIndexes": [],
  "instructionIndexes": [],
  "unknownIndexes": []
}`;
  }

  /**
   * Parse semantic response
   */
  private parseSemanticResponse(
    response: string,
    activity: ActivityIR,
    allParagraphs: ParagraphIR[]
  ): SemanticLabelIR[] {
    const labels: SemanticLabelIR[] = [];

    try {
      // Clean markdown
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      jsonStr = jsonStr.trim();

      const data = JSON.parse(jsonStr);

      // Get activity paragraphs
      const activityParagraphs = allParagraphs.filter(p =>
        activity.paragraphIds.includes(p.id)
      );

      // Map indexes to paragraph IDs
      const typeMaps: { key: keyof typeof data; type: string }[] = [
        { key: 'teacherActionIndexes', type: 'TEACHER_ACTION' },
        { key: 'studentActionIndexes', type: 'STUDENT_ACTION' },
        { key: 'teachingMaterialIndexes', type: 'TEACHING_MATERIAL' },
        { key: 'learningOutcomeIndexes', type: 'LEARNING_OUTCOME' },
        { key: 'questionIndexes', type: 'QUESTION' },
        { key: 'assessmentIndexes', type: 'ASSESSMENT' },
        { key: 'sectionHeaderIndexes', type: 'SECTION_HEADER' },
        { key: 'productIndexes', type: 'PRODUCT' },
        { key: 'objectiveIndexes', type: 'OBJECTIVE' },
        { key: 'instructionIndexes', type: 'INSTRUCTION' },
        { key: 'unknownIndexes', type: 'UNKNOWN' },
      ];

      for (const { key, type } of typeMaps) {
        const indexes = data[key] || [];
        for (const idx of indexes) {
          if (idx >= 0 && idx < activityParagraphs.length) {
            const para = activityParagraphs[idx];
            labels.push({
              paragraphId: para.id,
              paragraphIndex: idx,
              type,
              confidence: 0.9,
            });
          }
        }
      }
    } catch (error) {
      console.error('  Error parsing semantic response:', error);
    }

    return labels;
  }

  /**
   * Build final DocumentIR
   */
  private buildDocumentIR(
    sourceFile: string,
    layout: LayoutIR,
    paragraphs: ParagraphIR[],
    activities: ActivityIR[],
    semanticLabels: SemanticLabelIR[],
    startTime: number
  ): CleanDocumentIR {
    return {
      metadata: {
        sourceFile,
        sourceType: 'pdf',
        totalPages: layout.metadata.totalPages,
        totalParagraphs: paragraphs.length,
        totalActivities: activities.length,
        processingTimeMs: Date.now() - startTime,
        extractedAt: new Date().toISOString(),
      },
      layout,
      paragraphs,
      activities,
      semanticLabels,
      artifacts: {},
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
 * Create CleanPipelineOrchestrator instance
 */
export function createCleanPipelineOrchestrator(
  config?: Partial<CleanPipelineConfig>
): CleanPipelineOrchestrator {
  return new CleanPipelineOrchestrator(config);
}
