/**
 * DocumentIR Pipeline - Multi-Stage Parser
 *
 * Stage 1: Layout Parser - Detect document hierarchy
 * Stage 2: Table Parser - Convert tables to structured data
 * Stage 3: Paragraph Extraction - Stable IDs, preserve original text
 * Stage 4: Activity Detection - Group paragraphs into activities
 * Stage 5: Semantic Classification - AI returns indexes only
 * Stage 6: Mapper - Map indexes back to DocumentIR
 */

import * as fs from 'fs';
import * as path from 'path';
import { BeekOneAIClient } from '@/lib/beekone-ai-client';

export interface DocumentIR {
  metadata: IRMetadata;
  layout: LayoutInfo;
  tables: TableInfo[];
  paragraphs: Paragraph[];
  sections: Section[];
  activities: Activity[];
  semanticLabels: SemanticLabel[];
  artifacts: Artifacts;
}

export interface IRMetadata {
  sourceFile: string;
  totalPages: number;
  totalParagraphs: number;
  processingTimeMs: number;
  extractedAt: string;
}

export interface LayoutInfo {
  sections: SectionLayout[];
  headings: Heading[];
  lists: ListInfo[];
  readingOrder: string[];
}

export interface SectionLayout {
  id: string;
  title: string;
  type: string;
  pageStart: number;
  pageEnd: number;
  order: number;
}

export interface Heading {
  id: string;
  text: string;
  level: number;
  pageNumber: number;
}

export interface ListInfo {
  id: string;
  type: 'ordered' | 'unordered';
  items: string[];
}

export interface TableInfo {
  id: string;
  rows: string[][];
  headers: string[];
  mergedCells: MergedCell[];
  sourceParagraphId: string;
}

export interface MergedCell {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export interface Paragraph {
  id: string;
  content: string;
  pageNumber: number;
  lineNumber: number;
  type: 'text' | 'heading' | 'list' | 'table';
  headingLevel?: number;
  listItem?: string;
  tableData?: TableInfo;
}

export interface Section {
  id: string;
  title: string;
  type: string;
  order: number;
  paragraphIds: string[];
}

export interface Activity {
  id: string;
  title: string;
  type: string;
  order: number;
  paragraphIds: string[];
}

export interface SemanticLabel {
  paragraphId: string;
  paragraphIndex: number;
  type: SemanticType;
  confidence: number;
}

export type SemanticType =
  | 'TEACHER_ACTION'
  | 'STUDENT_ACTION'
  | 'TEACHING_MATERIAL'
  | 'LEARNING_OUTCOME'
  | 'QUESTION'
  | 'ASSESSMENT'
  | 'SECTION_HEADER'
  | 'PRODUCT'
  | 'OBJECTIVE'
  | 'INSTRUCTION'
  | 'UNKNOWN';

export interface Artifacts {
  layout: any;
  tables: any;
  paragraphs: any;
  activities: any;
  semanticPrompt: string;
  semanticResponse: string;
  mapping: any;
  documentIR: any;
}

// ============================================================
// PIPELINE CONFIG
// ============================================================

export interface PipelineConfig {
  outputDir: string;
  debug: boolean;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_CONFIG: PipelineConfig = {
  outputDir: './outputs/document-ir',
  debug: true,
  temperature: 0.1,
  maxTokens: 4000,
};

// ============================================================
// PIPELINE STAGE 1: LAYOUT PARSER
// ============================================================

export async function stage1_LayoutParser(
  visionData: any,
  config: PipelineConfig
): Promise<{ layout: LayoutInfo; raw: any }> {
  console.log('\n[Stage 1] Layout Parser');

  const sections: SectionLayout[] = [];
  const headings: Heading[] = [];
  const lists: ListInfo[] = [];
  const readingOrder: string[] = [];

  // Extract from Vision data
  const visionSections = visionData?.sections || [];
  for (let i = 0; i < visionSections.length; i++) {
    const s = visionSections[i];
    sections.push({
      id: s.id || `section_${i}`,
      title: s.title || '',
      type: s.code || s.type || 'OTHER',
      pageStart: s.pageStart || 1,
      pageEnd: s.pageEnd || 1,
      order: i,
    });
    readingOrder.push(s.id || `section_${i}`);
  }

  // Extract headings from paragraphs
  const paragraphs = visionData?.pages?.flatMap((p: any) => p.elements || []) || [];
  let headingIndex = 0;
  for (const para of paragraphs) {
    if (para.type === 'heading') {
      headings.push({
        id: para.id || `heading_${headingIndex++}`,
        text: para.content || '',
        level: para.level || 1,
        pageNumber: para.pageNumber || 1,
      });
    }
  }

  const layout: LayoutInfo = {
    sections,
    headings,
    lists,
    readingOrder,
  };

  // Save artifact
  saveArtifact(config.outputDir, 'layout.json', layout);

  console.log(`[Stage 1] Found ${sections.length} sections, ${headings.length} headings`);

  return { layout, raw: visionData };
}

// ============================================================
// PIPELINE STAGE 2: TABLE PARSER
// ============================================================

export async function stage2_TableParser(
  visionData: any,
  config: PipelineConfig
): Promise<{ tables: TableInfo[] }> {
  console.log('\n[Stage 2] Table Parser');

  const tables: TableInfo[] = [];

  // Extract tables from Vision data
  const visionTables = visionData?.tables || [];

  for (let i = 0; i < visionTables.length; i++) {
    const t = visionTables[i];
    const table: TableInfo = {
      id: t.id || `table_${i}`,
      rows: t.rows || [],
      headers: t.headers || [],
      mergedCells: [],
      sourceParagraphId: '',
    };

    // Process merged cells
    if (t.mergedCells) {
      for (const mc of t.mergedCells) {
        table.mergedCells.push({
          row: mc.row || 0,
          col: mc.col || 0,
          rowSpan: mc.rowSpan || 1,
          colSpan: mc.colSpan || 1,
        });
      }
    }

    tables.push(table);
  }

  // Also extract tables from paragraph tableData
  const paragraphs = visionData?.pages?.flatMap((p: any) => p.elements || []) || [];
  for (const para of paragraphs) {
    if (para.tableData && para.tableData.rows) {
      const existingTable = tables.find(t => t.id === para.tableData?.id);
      if (!existingTable) {
        tables.push({
          id: para.tableData.id || `table_from_para_${para.id}`,
          rows: para.tableData.rows,
          headers: para.tableData.headers || [],
          mergedCells: [],
          sourceParagraphId: para.id,
        });
      }
    }
  }

  // Save artifact
  saveArtifact(config.outputDir, 'tables.json', tables);

  console.log(`[Stage 2] Found ${tables.length} tables`);

  return { tables };
}

// ============================================================
// PIPELINE STAGE 3: PARAGRAPH EXTRACTION
// ============================================================

export async function stage3_ParagraphExtraction(
  visionData: any,
  config: PipelineConfig
): Promise<{ paragraphs: Paragraph[] }> {
  console.log('\n[Stage 3] Paragraph Extraction');

  const paragraphs: Paragraph[] = [];
  let paraIndex = 0;

  // Extract from Vision pages
  const pages = visionData?.pages || [];
  for (let pageNum = 0; pageNum < pages.length; pageNum++) {
    const page = pages[pageNum];
    const elements = page.elements || [];

    for (const elem of elements) {
      if (elem.type === 'paragraph' && elem.content?.trim()) {
        paragraphs.push({
          id: elem.id || `para_${paraIndex}`,
          content: elem.content.trim(), // PRESERVE EXACT TEXT - NEVER REWRITE
          pageNumber: pageNum + 1,
          lineNumber: paraIndex,
          type: 'text',
        });
        paraIndex++;
      } else if (elem.type === 'heading' && elem.content?.trim()) {
        paragraphs.push({
          id: elem.id || `heading_${paraIndex}`,
          content: elem.content.trim(),
          pageNumber: pageNum + 1,
          lineNumber: paraIndex,
          type: 'heading',
          headingLevel: elem.level || 1,
        });
        paraIndex++;
      }
    }
  }

  // If no pages, try sections
  if (paragraphs.length === 0) {
    const sections = visionData?.sections || [];
    for (const section of sections) {
      if (section.elements) {
        for (const elem of section.elements) {
          if (elem.content?.trim()) {
            paragraphs.push({
              id: elem.id || `para_${paraIndex}`,
              content: elem.content.trim(),
              pageNumber: 1,
              lineNumber: paraIndex,
              type: elem.type === 'heading' ? 'heading' : 'text',
              headingLevel: elem.level,
            });
            paraIndex++;
          }
        }
      }
    }
  }

  // Save artifact
  saveArtifact(config.outputDir, 'paragraphs.json', paragraphs);

  console.log(`[Stage 3] Extracted ${paragraphs.length} paragraphs`);

  return { paragraphs };
}

// ============================================================
// PIPELINE STAGE 4: ACTIVITY DETECTION
// ============================================================

export async function stage4_ActivityDetection(
  layout: LayoutInfo,
  paragraphs: Paragraph[],
  config: PipelineConfig
): Promise<{ activities: Activity[]; sections: Section[] }> {
  console.log('\n[Stage 4] Activity Detection');

  const sections: Section[] = [];
  const activities: Activity[] = [];

  // Create sections from layout
  for (let i = 0; i < layout.sections.length; i++) {
    const ls = layout.sections[i];
    sections.push({
      id: ls.id,
      title: ls.title,
      type: ls.type,
      order: i,
      paragraphIds: [],
    });
  }

  // Detect activities based on headings
  let currentActivityIndex = 0;
  let currentSectionIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];

    // Check if this is a new activity (heading level 4-5 typically)
    if (para.type === 'heading' && para.headingLevel && para.headingLevel >= 4) {
      activities.push({
        id: para.id,
        title: para.content,
        type: 'CUSTOM',
        order: currentActivityIndex++,
        paragraphIds: [para.id],
      });

      // Assign to section
      if (sections[currentSectionIndex]) {
        sections[currentSectionIndex].paragraphIds.push(para.id);
      }
    } else {
      // Add to current activity
      if (activities.length > 0) {
        const lastActivity = activities[activities.length - 1];
        lastActivity.paragraphIds.push(para.id);
      }
    }

    // Check for section transition
    if (para.type === 'heading' && para.headingLevel === 3) {
      currentSectionIndex++;
    }
  }

  // If no activities detected, create one per section
  if (activities.length === 0) {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      activities.push({
        id: `activity_${i}`,
        title: section.title || `Activity ${i + 1}`,
        type: 'CUSTOM',
        order: i,
        paragraphIds: section.paragraphIds,
      });
    }
  }

  // Save artifact
  saveArtifact(config.outputDir, 'activities.json', {
    sections,
    activities,
  });

  console.log(`[Stage 4] Detected ${sections.length} sections, ${activities.length} activities`);

  return { activities, sections };
}

// ============================================================
// PIPELINE STAGE 5: SEMANTIC CLASSIFICATION (AI)
// ============================================================

const SEMANTIC_SYSTEM_PROMPT = `Bạn là chuyên gia PHÂN TÍCH NGỮ NGHĨA CHO GIÁO ÁN VIỆT NAM.

NHIỆM VỤ: Đọc các đoạn văn và XÁC ĐỊNH loại ngữ nghĩa cho từng đoạn.

⚠️ QUAN TRỌNG:
- CHỈ trả về INDEX (số), KHÔNG viết lại nội dung
- MỖI paragraph phải thuộc ĐÚNG 1 loại

📋 11 LOẠI NGỮ NGHĨA:
1. TEACHER_ACTION - GV làm gì (GV, Giáo viên, cho HS, hướng dẫn, yêu cầu)
2. STUDENT_ACTION - HS làm gì (HS, Học sinh, làm, thực hiện, trả lời, thảo luận)
3. TEACHING_MATERIAL - Học liệu (SGK, máy chiếu, video, đồ dùng)
4. LEARNING_OUTCOME - Kết quả (HS có thể, yêu cầu cần đạt)
5. QUESTION - Câu hỏi (?, Câu hỏi, hỏi)
6. ASSESSMENT - Đánh giá (nhận xét, tuyên dương, đánh giá)
7. SECTION_HEADER - Tiêu đề (Hoạt động, Phần, Mục, I., II.)
8. PRODUCT - Sản phẩm (sản phẩm, bài làm)
9. OBJECTIVE - Mục tiêu (mục tiêu, yêu cầu)
10. INSTRUCTION - Hướng dẫn (hướng dẫn, cách, thực hiện)
11. UNKNOWN - Không xác định

📤 TRẢ VỀ JSON:
{
  "activities": [
    {
      "activityId": "id",
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
    }
  ]
}`;

export async function stage5_SemanticClassification(
  activities: Activity[],
  paragraphs: Paragraph[],
  config: PipelineConfig,
  aiClient: BeekOneAIClient
): Promise<{ semanticLabels: SemanticLabel[] }> {
  console.log('\n[Stage 5] Semantic Classification');

  const allLabels: SemanticLabel[] = [];

  // Process each activity
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    console.log(`[Stage 5] Processing activity ${i + 1}/${activities.length}: ${activity.title}`);

    // Get paragraphs for this activity
    const activityParagraphs = paragraphs.filter(p => activity.paragraphIds.includes(p.id));

    if (activityParagraphs.length === 0) {
      console.log(`  Skipping - no paragraphs`);
      continue;
    }

    // Build prompt with EXACT original content - NEVER rewrite
    const paragraphsText = activityParagraphs
      .map((p, idx) => `[${idx}] ${p.content}`)
      .join('\n\n');

    const prompt = `${SEMANTIC_SYSTEM_PROMPT}

📝 HOẠT ĐỘNG: ${activity.title}

📄 CÁC ĐOẠN VĂN:
${paragraphsText}

🎯 NHIỆM VỤ:
- Đọc từng đoạn văn
- Tìm keywords để phân loại
- Trả về INDEX của các đoạn

📤 TRẢ VỀ JSON:
{
  "activityId": "${activity.id}",
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

    // Save prompt
    saveArtifact(config.outputDir, `semantic_prompt_${activity.id}.txt`, prompt);

    // Call AI
    try {
      const result = await aiClient.complete(prompt, {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      if (result.success && result.data) {
        // Save response
        saveArtifact(config.outputDir, `semantic_response_${activity.id}.txt`, result.data);

        // Parse response
        const labels = parseSemanticResponse(result.data, activity.id, activityParagraphs);
        allLabels.push(...labels);

        console.log(`  Found ${labels.length} labels`);
      }
    } catch (error) {
      console.error(`  Error: ${error}`);
    }
  }

  console.log(`[Stage 5] Total semantic labels: ${allLabels.length}`);

  return { semanticLabels: allLabels };
}

function parseSemanticResponse(
  response: string,
  activityId: string,
  paragraphs: Paragraph[]
): SemanticLabel[] {
  const labels: SemanticLabel[] = [];

  try {
    // Clean markdown
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const data = JSON.parse(jsonStr);

    // Extract indexes for each type
    const types: { key: SemanticType; indexes: number[] }[] = [
      { key: 'TEACHER_ACTION', indexes: data.teacherActionIndexes || [] },
      { key: 'STUDENT_ACTION', indexes: data.studentActionIndexes || [] },
      { key: 'TEACHING_MATERIAL', indexes: data.teachingMaterialIndexes || [] },
      { key: 'LEARNING_OUTCOME', indexes: data.learningOutcomeIndexes || [] },
      { key: 'QUESTION', indexes: data.questionIndexes || [] },
      { key: 'ASSESSMENT', indexes: data.assessmentIndexes || [] },
      { key: 'SECTION_HEADER', indexes: data.sectionHeaderIndexes || [] },
      { key: 'PRODUCT', indexes: data.productIndexes || [] },
      { key: 'OBJECTIVE', indexes: data.objectiveIndexes || [] },
      { key: 'INSTRUCTION', indexes: data.instructionIndexes || [] },
      { key: 'UNKNOWN', indexes: data.unknownIndexes || [] },
    ];

    for (const type of types) {
      for (const idx of type.indexes) {
        if (idx >= 0 && idx < paragraphs.length) {
          const para = paragraphs[idx];
          labels.push({
            paragraphId: para.id,
            paragraphIndex: idx,
            type: type.key,
            confidence: 0.9,
          });
        }
      }
    }
  } catch (error) {
    console.error(`[Stage 5] Parse error: ${error}`);
  }

  return labels;
}

// ============================================================
// PIPELINE STAGE 6: MAPPER (PRODUCE DOCUMENT IR)
// ============================================================

export async function stage6_Mapper(
  sections: Section[],
  activities: Activity[],
  paragraphs: Paragraph[],
  semanticLabels: SemanticLabel[],
  metadata: IRMetadata,
  config: PipelineConfig
): Promise<DocumentIR> {
  console.log('\n[Stage 6] Mapper - Producing DocumentIR');

  const documentIR: DocumentIR = {
    metadata,
    layout: {
      sections: sections.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type,
        pageStart: 1,
        pageEnd: 1,
        order: s.order,
      })),
      headings: [],
      lists: [],
      readingOrder: paragraphs.map(p => p.id),
    },
    tables: [],
    paragraphs,
    sections,
    activities,
    semanticLabels,
    artifacts: {
      layout: null,
      tables: null,
      paragraphs: null,
      activities: null,
      semanticPrompt: '',
      semanticResponse: '',
      mapping: null,
      documentIR: null,
    },
  };

  // Save mapping
  const mapping = {
    sections: sections.map(s => ({
      id: s.id,
      title: s.title,
      paragraphCount: s.paragraphIds.length,
    })),
    activities: activities.map(a => ({
      id: a.id,
      title: a.title,
      paragraphCount: a.paragraphIds.length,
    })),
    semanticLabels: semanticLabels.map(l => ({
      paragraphId: l.paragraphId,
      type: l.type,
    })),
  };

  saveArtifact(config.outputDir, 'mapping.json', mapping);

  // Save final DocumentIR
  saveArtifact(config.outputDir, 'document_ir.json', documentIR);

  console.log(`[Stage 6] DocumentIR created: ${paragraphs.length} paragraphs, ${activities.length} activities`);

  return documentIR;
}

// ============================================================
// MAIN PIPELINE
// ============================================================

export async function runDocumentIRPipeline(
  visionData: any,
  sourceFile: string,
  aiClient: BeekOneAIClient,
  config: Partial<PipelineConfig> = {}
): Promise<DocumentIR> {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Create output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  cfg.outputDir = path.join(cfg.outputDir, timestamp);
  if (!fs.existsSync(cfg.outputDir)) {
    fs.mkdirSync(cfg.outputDir, { recursive: true });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('DOCUMENT IR PIPELINE');
  console.log(`Output: ${cfg.outputDir}`);
  console.log('='.repeat(60));

  // Stage 1: Layout Parser
  const { layout } = await stage1_LayoutParser(visionData, cfg);

  // Stage 2: Table Parser
  const { tables } = await stage2_TableParser(visionData, cfg);

  // Stage 3: Paragraph Extraction
  const { paragraphs } = await stage3_ParagraphExtraction(visionData, cfg);

  // Stage 4: Activity Detection
  const { activities, sections } = await stage4_ActivityDetection(layout, paragraphs, cfg);

  // Stage 5: Semantic Classification
  const { semanticLabels } = await stage5_SemanticClassification(activities, paragraphs, cfg, aiClient);

  // Stage 6: Mapper
  const metadata: IRMetadata = {
    sourceFile,
    totalPages: visionData?.metadata?.totalPages || 1,
    totalParagraphs: paragraphs.length,
    processingTimeMs: Date.now() - startTime,
    extractedAt: new Date().toISOString(),
  };

  const documentIR = await stage6_Mapper(
    sections,
    activities,
    paragraphs,
    semanticLabels,
    metadata,
    cfg
  );

  console.log('\n' + '='.repeat(60));
  console.log('PIPELINE COMPLETE');
  console.log(`Total time: ${metadata.processingTimeMs}ms`);
  console.log('='.repeat(60));

  return documentIR;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function saveArtifact(outputDir: string, filename: string, data: any): void {
  try {
    const filepath = path.join(outputDir, filename);
    if (typeof data === 'string') {
      fs.writeFileSync(filepath, data, 'utf-8');
    } else {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    }
    console.log(`  [Saved] ${filename}`);
  } catch (error) {
    console.error(`  [Error] ${filename}: ${error}`);
  }
}
