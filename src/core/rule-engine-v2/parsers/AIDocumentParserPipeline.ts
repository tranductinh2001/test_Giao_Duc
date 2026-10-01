/**
 * AI Document Parser Pipeline - Semantic Extraction Engine
 *
 * Pipeline:
 * Upload -> Vision AI -> Vision JSON -> Semantic AI (Gemini) -> Semantic Labels -> Map to Vision JSON -> Semantic Tree
 *
 * IMPORTANT: Gemini returns SEMANTIC LABELS (indexes), NOT rewritten content.
 * Backend maps indexes back to Vision JSON to preserve 100% original content.
 */

import { BeekOneAIClient, type AIResult } from '@/lib/beekone-ai-client';
import * as path from 'path';

export interface AIDocumentParseResult {
  success: boolean;
  document?: AIDocument;
  sections?: any[];
  tree?: DocumentTree;
  pipelineMetrics?: PipelineMetrics;
  confidence: number;
  error?: string;
  debug?: {
    aiCalls: number;
    totalLatency: number;
    inputParagraphs: number;
    outputTeacherActions: number;
    outputStudentActions: number;
  };
}

export interface PipelineMetrics {
  semanticExtractionTime: number;
  totalTime: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  aiCalls: number;
}

export interface AIDocument {
  id: string;
  title: string;
  metadata: DocumentMetadata;
  sections: AISection[];
}

export interface DocumentMetadata {
  totalPages?: number;
  wordCount?: number;
  language?: string;
  hasTables?: boolean;
  hasImages?: boolean;
  confidence?: number;
}

export interface AISection {
  id: string;
  type: string;
  title: string;
  order: number;
  startLine?: number;
  endLine?: number;
  confidence?: number;
  activities?: any[];
}

export interface DocumentTree {
  sections: any[];
}

export interface AIDocumentParseRequest {
  visionData?: any;
  documentText?: any;  // Legacy support
  documentTitle?: string;
  context?: {
    subject?: string;
    gradeLevel?: string;
  };
}

/**
 * Semantic Label from AI - contains paragraph indexes, NOT rewritten content
 */
export interface SemanticLabels {
  sectionId: string;
  sectionTitle: string;
  activities: {
    activityId: string;
    activityTitle: string;
    teacherParagraphIndexes: number[];  // Index into visionData.paragraphs
    studentParagraphIndexes: number[];
    questionParagraphIndexes: number[];
    productParagraphIndexes: number[];
    assessmentParagraphIndexes: number[];
  }[];
}

// ============================================================
// SEMANTIC EXTRACTION PROMPT - IMPROVED v2 (with examples)
// ============================================================

const SEMANTIC_EXTRACTION_SYSTEM = `Bạn là chuyên gia PHÂN TÍCH NGỮ NGHĨA CHO GIÁO ÁN VIỆT NAM.

NHIỆM VỤ: Đọc các đoạn văn và XÁC ĐỊNH loại ngữ nghĩa cho từng đoạn.

⚠️ QUAN TRỌNG:
- MỖI đoạn phải thuộc ĐÚNG 1 loại
- Tìm keywords trong đoạn văn để phân loại
- KHÔNG được để trống tất cả các mảng!

📋 VÍ DỤ:
Input: "[0] GV hướng dẫn HS đọc bài" → Output: teacherActionIndexes: [0]
Input: "[1] HS thảo luận nhóm đôi" → Output: studentActionIndexes: [1]
Input: "[2] Sách giáo khoa Tiếng Việt" → Output: teachingMaterialIndexes: [2]

📋 11 LOẠI NGỮ NGHĨA:

1. TEACHER_ACTION - GV làm gì
   Tìm: GV, Giáo viên, cho HS, hướng dẫn, yêu cầu, hỏi, trình bày, nhận xét

2. STUDENT_ACTION - HS làm gì
   Tìm: HS, Học sinh, làm, thực hiện, trả lời, đọc, viết, thảo luận

3. TEACHING_MATERIAL - Học liệu
   Tìm: SGK, Sách giáo khoa, máy chiếu, video, đồ dùng

4. LEARNING_OUTCOME - Kết quả học tập
   Tìm: HS có thể, yêu cầu cần đạt, mục tiêu

5. QUESTION - Câu hỏi
   Tìm: ?, Câu hỏi, hỏi, em hãy

6. ASSESSMENT - Đánh giá
   Tìm: nhận xét, tuyên dương, đánh giá, kiểm tra

7. SECTION_HEADER - Tiêu đề
   Tìm: Hoạt động, phần, mục, I., II., 1., 2.

8. PRODUCT - Sản phẩm
   Tìm: sản phẩm, bài làm, vở bài tập

9. OBJECTIVE - Mục tiêu
   Tìm: mục tiêu, yêu cầu

10. INSTRUCTION - Hướng dẫn
    Tìm: hướng dẫn, cách, thực hiện

11. UNKNOWN - Không xác định (chỉ dùng khi không tìm được keyword nào)

📤 TRẢ VỀ JSON (bắt buộc phải điền ít nhất 1 index!):
{
  "activityId": "id",
  "activityTitle": "tên",
  "teacherActionIndexes": [0, 1],
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
- Đánh index bắt đầu từ 0`;

function buildSemanticPrompt(visionData: any, activity: any, allParagraphs: any[]): string {
  // Debug: Log input
  console.log(`[AIDocumentParser] Building prompt for activity: ${activity.title}`);
  console.log(`[AIDocumentParser] Paragraphs count (raw): ${allParagraphs.length}`);

  // Filter out empty paragraphs and format for AI
  const validParagraphs = allParagraphs
    .map((p, idx) => ({
      idx,
      content: p.content || ''
    }))
    .filter(p => p.content.trim().length > 0);

  console.log(`[AIDocumentParser] Paragraphs count (valid): ${validParagraphs.length}`);

  const paragraphsText = validParagraphs
    .map((p) => `[${p.idx}] ${p.content}`)
    .join('\n\n');

  return `Bạn là chuyên gia PHÂN TÍCH NGỮ NGHĨA CHO GIÁO ÁN VIỆT NAM.

NHIỆM VỤ: Đọc các đoạn văn dưới đây và XÁC ĐỊNH loại ngữ nghĩa cho từng đoạn.

⚠️ QUAN TRỌNG:
- Chỉ trả về INDEX (số), KHÔNG viết lại nội dung
- Mỗi paragraph phải thuộc ĐÚNG 1 loại

📋 11 LOẠI NGỮ NGHĨA:

1. TEACHER_ACTION - Hành động GV
   Keywords: GV, Giáo viên, Cho HS, Hướng dẫn, Yêu cầu, Hỏi, Trình bày, Nhận xét, Tuyên dương

2. STUDENT_ACTION - Hành động HS
   Keywords: HS, Học sinh, Làm, Thực hiện, Trả lời, Đọc, Viết, Thảo luận, Quan sát

3. TEACHING_MATERIAL - Học liệu
   Keywords: SGK, Sách giáo khoa, Máy chiếu, Video, Hình ảnh, Slide, Đồ dùng

4. LEARNING_OUTCOME - Kết quả học tập
   Keywords: HS có thể, Yêu cầu cần đạt, Mục tiêu

5. QUESTION - Câu hỏi
   Keywords: Câu hỏi, Hỏi, ?, Em hãy

6. ASSESSMENT - Đánh giá
   Keywords: Nhận xét, Tuyên dương, Đánh giá, Kiểm tra

7. SECTION_HEADER - Tiêu đề
   Keywords: Hoạt động, Phần, Mục, I., II., 1., 2.

8. PRODUCT - Sản phẩm
   Keywords: Sản phẩm, Bài làm, Vở bài tập, Hoàn thành

9. OBJECTIVE - Mục tiêu
   Keywords: Mục tiêu, Yêu cầu, Đạt được

10. INSTRUCTION - Hướng dẫn
    Keywords: Hướng dẫn, Cách, Thực hiện, Tiến hành

11. UNKNOWN - Không xác định

📝 HOẠT ĐỘNG: ${activity.title}

📄 CÁC ĐOẠN VĂN:
${paragraphsText}

🎯 NHIỆM VỤ:
- Đọc từng đoạn văn ở trên
- Tìm keywords trong mỗi đoạn để xác định loại
- Trả về JSON với index của các đoạn

📤 TRẢ VỀ JSON:
{
  "activityId": "${activity.id}",
  "activityTitle": "${activity.title}",
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

⚠️ LƯU Ý: Phải điền ÍT NHẤT 1 index vào một trong các mảng trên!`;
}

// ============================================================
// UNIFIED SEMANTIC RESPONSE PARSER
// ============================================================
// ENHANCED: 11 Semantic Types (matching Python Pipeline)
// ============================================================

interface SemanticActivityLabels {
  activityId: string;
  activityTitle?: string;
  // 11 types from Python Pipeline
  teacherActionIndexes: number[];      // TEACHER_ACTION
  studentActionIndexes: number[];      // STUDENT_ACTION
  teachingMaterialIndexes: number[];    // TEACHING_MATERIAL
  learningOutcomeIndexes: number[];    // LEARNING_OUTCOME
  questionIndexes: number[];           // QUESTION
  assessmentIndexes: number[];         // ASSESSMENT
  sectionHeaderIndexes: number[];     // SECTION_HEADER
  productIndexes: number[];            // PRODUCT
  objectiveIndexes: number[];          // OBJECTIVE
  instructionIndexes: number[];        // INSTRUCTION
  unknownIndexes: number[];            // UNKNOWN
  // Legacy support
  teacherParagraphIndexes?: number[];
  studentParagraphIndexes?: number[];
  questionParagraphIndexes?: number[];
  productParagraphIndexes?: number[];
  assessmentParagraphIndexes?: number[];
}

interface SemanticParseResult {
  activities: SemanticActivityLabels[];
  raw: any;
  schema: 'direct' | 'nested' | 'unknown';
}

/**
 * Parse AI semantic response with strict validation
 * Handles multiple schema formats:
 * 1. Direct array: [{ activityId, ... }]
 * 2. Nested object: { activities: [{ activityId, ... }] }
 * 3. Single object: { activityId, ... }
 */
function parseSemanticResponse(rawResponse: string, activityId: string): SemanticParseResult {
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
  } catch (e) {
    throw new Error(`JSON parse failed: ${e}. Raw: ${rawResponse.substring(0, 200)}`);
  }

  // Step 3: Extract activities array
  let activities: SemanticActivityLabels[] = [];
  let schema: 'direct' | 'nested' | 'unknown' = 'unknown';

  if (Array.isArray(parsed)) {
    // Schema: Direct array [{ activityId, ... }]
    activities = parsed;
    schema = 'direct';
  } else if (parsed.activities && Array.isArray(parsed.activities)) {
    // Schema: Nested object { activities: [...] }
    activities = parsed.activities;
    schema = 'nested';
  } else if (parsed.activityId) {
    // Schema: Single object { activityId, ... }
    activities = [parsed];
    schema = 'direct';
  } else {
    // Unknown schema - throw error
    throw new Error(
      `Unrecognized response schema. Expected { activities: [...] } or [...], got: ${JSON.stringify(parsed).substring(0, 200)}`
    );
  }

  // Step 4: Validate each activity (handle both old and new field names)
  const validated: SemanticActivityLabels[] = activities.map((act, idx) => {
    if (!act.activityId) {
      console.warn(`  WARNING: Activity ${idx} missing activityId, using fallback`);
      act.activityId = activityId;
    }

    // Handle both old field names (teacherParagraphIndexes) and new (teacherActionIndexes)
    const teacherAction = act.teacherActionIndexes || act.teacherParagraphIndexes || [];
    const studentAction = act.studentActionIndexes || act.studentParagraphIndexes || [];
    const question = act.questionIndexes || act.questionParagraphIndexes || [];
    const product = act.productIndexes || act.productParagraphIndexes || [];
    const assessment = act.assessmentIndexes || act.assessmentParagraphIndexes || [];

    return {
      activityId: act.activityId,
      activityTitle: act.activityTitle || '',
      // New 11-type format
      teacherActionIndexes: Array.isArray(teacherAction) ? teacherAction : [],
      studentActionIndexes: Array.isArray(studentAction) ? studentAction : [],
      teachingMaterialIndexes: Array.isArray(act.teachingMaterialIndexes) ? act.teachingMaterialIndexes : [],
      learningOutcomeIndexes: Array.isArray(act.learningOutcomeIndexes) ? act.learningOutcomeIndexes : [],
      questionIndexes: Array.isArray(question) ? question : [],
      assessmentIndexes: Array.isArray(assessment) ? assessment : [],
      sectionHeaderIndexes: Array.isArray(act.sectionHeaderIndexes) ? act.sectionHeaderIndexes : [],
      productIndexes: Array.isArray(product) ? product : [],
      objectiveIndexes: Array.isArray(act.objectiveIndexes) ? act.objectiveIndexes : [],
      instructionIndexes: Array.isArray(act.instructionIndexes) ? act.instructionIndexes : [],
      unknownIndexes: Array.isArray(act.unknownIndexes) ? act.unknownIndexes : [],
      // Legacy support
      teacherParagraphIndexes: teacherAction,
      studentParagraphIndexes: studentAction,
      questionParagraphIndexes: question,
      productParagraphIndexes: product,
      assessmentParagraphIndexes: assessment,
    };
  });

  return { activities: validated, raw: parsed, schema };
}

// Main parser class
export class AIDocumentParserPipeline {
  private aiClient: BeekOneAIClient;
  private enableCache: boolean = true;

  constructor(options?: { apiKey?: string; baseUrl?: string; model?: string; cache?: boolean }) {
    this.aiClient = new BeekOneAIClient(options);
    if (options?.cache !== undefined) {
      this.enableCache = options.cache;
    }
  }

  isAvailable(): boolean {
    return this.aiClient.isAvailable();
  }

  async parse(request: AIDocumentParseRequest): Promise<AIDocumentParseResult> {
    const startTime = Date.now();
    const metrics: PipelineMetrics = {
      semanticExtractionTime: 0,
      totalTime: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      aiCalls: 0,
    };

    // If we have Vision data, use semantic extraction
    if (request.visionData) {
      return this.semanticExtraction(request, metrics);
    }

    return {
      success: false,
      error: 'No visionData provided',
      confidence: 0,
    };
  }

  /**
   * SEMANTIC EXTRACTION - Main method
   *
   * 1. Receive Vision JSON
   * 2. For each activity, send to Gemini for semantic labeling
   * 3. Gemini returns paragraph INDEXES (not rewritten content)
   * 4. Map indexes back to Vision JSON paragraphs
   * 5. Generate Semantic Tree
   */
  private async semanticExtraction(
    request: AIDocumentParseRequest,
    metrics: PipelineMetrics
  ): Promise<AIDocumentParseResult> {
    const startTime = Date.now();
    const visionData = request.visionData;

    console.log('\n' + '='.repeat(60));
    console.log('===== SEMANTIC EXTRACTION ENGINE =====');
    console.log('='.repeat(60));

    // ============================================================
    // STEP 1: ANALYZE VISION DATA
    // ============================================================
    console.log('\n--- STEP 1: ANALYZE VISION DATA ---');

    // Collect all paragraphs from all activities
    const allActivities: any[] = [];
    const activityToSection: Map<string, string> = new Map();

    if (visionData?.sections) {
      for (const section of visionData.sections) {
        if (section.activities) {
          for (const activity of section.activities) {
            allActivities.push(activity);
            activityToSection.set(activity.id, section.title);
          }
        }
      }
    }

    // Also check visionData.activities (flat structure)
    if (visionData?.activities) {
      for (const activity of visionData.activities) {
        if (!allActivities.find(a => a.id === activity.id)) {
          allActivities.push(activity);
          activityToSection.set(activity.id, activity.sectionTitle || 'Unknown');
        }
      }
    }

    // Collect all paragraphs with their global indexes
    // Also extract from tableData if present
    const globalParagraphs: { paragraph: any; activityId: string; activityTitle: string; sectionTitle: string; globalIndex: number }[] = [];
    let globalIndex = 0;

    for (const activity of allActivities) {
      if (activity.paragraphs) {
        for (const para of activity.paragraphs) {
          // If paragraph has tableData, extract rows as separate paragraphs
          if (para.tableData && para.tableData.rows && para.tableData.rows.length > 0) {
            console.log(`[AIDocumentParser] Extracting ${para.tableData.rows.length} rows from table for activity ${activity.id}`);

            // Add each row as a separate paragraph
            for (let rowIdx = 0; rowIdx < para.tableData.rows.length; rowIdx++) {
              const row = para.tableData.rows[rowIdx];
              const rowContent = row.join(' | '); // Combine columns

              globalParagraphs.push({
                paragraph: {
                  ...para,
                  content: rowContent,
                  _fromTable: true,
                  _tableRowIndex: rowIdx
                },
                activityId: activity.id,
                activityTitle: activity.title,
                sectionTitle: activityToSection.get(activity.id) || 'Unknown',
                globalIndex: globalIndex++,
              });
            }
          } else if (para.content && para.content.trim()) {
            // Normal paragraph with content
            globalParagraphs.push({
              paragraph: para,
              activityId: activity.id,
              activityTitle: activity.title,
              sectionTitle: activityToSection.get(activity.id) || 'Unknown',
              globalIndex: globalIndex++,
            });
          }
        }
      }
    }

    console.log(`[AIDocumentParser] Total paragraphs after table extraction: ${globalParagraphs.length}`);

    console.log(`Input Sections: ${visionData?.sections?.length || 0}`);
    console.log(`Input Activities: ${allActivities.length}`);
    console.log(`Input Paragraphs: ${globalParagraphs.length}`);
    console.log(`Input TeacherActions: 0 (to be extracted)`);
    console.log(`Input StudentActions: 0 (to be extracted)`);

    // ============================================================
    // STEP 2: SEMANTIC EXTRACTION PER ACTIVITY
    // ============================================================
    console.log('\n--- STEP 2: SEMANTIC EXTRACTION PER ACTIVITY ---');

    const semanticResults: SemanticLabels[] = [];
    let totalLatency = 0;
    let aiCalls = 0;

    for (let i = 0; i < allActivities.length; i++) {
      const activity = allActivities[i];
      console.log(`\n[${i + 1}/${allActivities.length}] Processing: ${activity.title}`);

      // Build paragraph list for this activity
      const activityParagraphs = globalParagraphs
        .filter(p => p.activityId === activity.id)
        .map(p => p.paragraph);

      // Debug: Log paragraphs being sent to AI
      console.log(`  [DEBUG] Sending ${activityParagraphs.length} paragraphs to AI:`);
      activityParagraphs.slice(0, 5).forEach((p, idx) => {
        const content = p.content?.substring(0, 80) || '(empty)';
        console.log(`    [${idx}] ${content}...`);
      });
      if (activityParagraphs.length > 5) {
        console.log(`    ... and ${activityParagraphs.length - 5} more`);
      }

      if (activityParagraphs.length === 0) {
        console.log('  SKIP: No paragraphs');
        continue;
      }

      // Build prompt
      const prompt = buildSemanticPrompt(visionData, activity, activityParagraphs);

      // ============================================================
      // 1. LOG FULL AI REQUEST
      // ============================================================
      console.log('\n' + '='.repeat(80));
      console.log('================ AI REQUEST =================');
      console.log('='.repeat(80));
      console.log('Model: gemini-3.1-flash-lite');
      console.log('Temperature: 0.1');
      console.log('MaxTokens: 4000');
      console.log('Prompt length:', prompt.length, 'chars');
      console.log('Prompt tokens estimate:', Math.round(prompt.length / 4));
      console.log('\n========== FULL PROMPT ==========\n');
      console.log(prompt);
      console.log('\n========== END PROMPT ==========');

      // Save to file
      const fs = await import('fs');
      const debugDir = path.join(process.cwd(), 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(debugDir, `ai-request-${activity.id}.txt`),
        prompt
      );

      const callStart = Date.now();

      // ============================================================
      // 2. CALL AI
      // ============================================================
      console.log('\n  Calling AI...');
      console.log(`  Prompt size: ${prompt.length} chars`);

      const result = await this.aiClient.complete(prompt, {
        temperature: 0.1,
        maxTokens: 4000,
        systemPrompt: SEMANTIC_EXTRACTION_SYSTEM,
      });

      const latency = Date.now() - callStart;
      totalLatency += latency;
      aiCalls++;

      // ============================================================
      // 3. LOG RAW AI RESPONSE (BEFORE PARSE)
      // ============================================================
      console.log('\n' + '='.repeat(80));
      console.log('================ AI RAW RESPONSE ================');
      console.log('='.repeat(80));
      console.log('Status:', result.success ? 'SUCCESS' : 'FAILED');
      console.log('Latency:', latency, 'ms');
      console.log('Completion tokens:', result.metrics?.completionTokens || 'N/A');
      console.log('Raw response length:', result.data?.length || 0, 'chars');
      console.log('\n========== FULL RESPONSE ==========\n');
      console.log(result.data);
      console.log('\n========== END RESPONSE ==========');

      // Save raw response to file
      fs.writeFileSync(
        path.join(debugDir, `ai-response-${activity.id}.txt`),
        result.data || ''
      );

      if (!result.success) {
        console.error(`  ERROR: AI call failed: ${result.error}`);
        continue;
      }

      // ============================================================
      // 4. LOG JSON PARSE
      // ============================================================
      console.log('\n' + '='.repeat(80));
      console.log('================ JSON PARSE ================');
      console.log('='.repeat(80));

      // ============================================================
      // 3. PARSE WITH UNIFIED PARSER
      // ============================================================
      try {
        const parseResult = parseSemanticResponse(result.data || '', activity.id);

        console.log('Parse result:');
        console.log('  - Schema:', parseResult.schema);
        console.log('  - Activities:', parseResult.activities.length);

        // Count fields
        let teacherCount = 0;
        let studentCount = 0;
        let questionCount = 0;
        let productCount = 0;
        let assessmentCount = 0;

        for (const act of parseResult.activities) {
          teacherCount += act.teacherParagraphIndexes?.length || 0;
          studentCount += act.studentParagraphIndexes?.length || 0;
          questionCount += act.questionParagraphIndexes?.length || 0;
          productCount += act.productParagraphIndexes?.length || 0;
          assessmentCount += act.assessmentParagraphIndexes?.length || 0;
        }

        console.log('  - TeacherActions (indexes):', teacherCount);
        console.log('  - StudentActions (indexes):', studentCount);
        console.log('  - Questions (indexes):', questionCount);
        console.log('  - Products (indexes):', productCount);
        console.log('  - Assessments (indexes):', assessmentCount);

        // Save parsed result
        fs.writeFileSync(
          path.join(debugDir, `ai-parsed-${activity.id}.json`),
          JSON.stringify(parseResult.raw, null, 2)
        );

        console.log('\n========== PARSED JSON ==========\n');
        console.dir(parseResult.raw, { depth: null });
        console.log('\n========== END PARSED ==========');

        semanticResults.push({
          sectionId: activityToSection.get(activity.id) || 'unknown',
          sectionTitle: activityToSection.get(activity.id) || 'Unknown',
          activities: parseResult.activities.map((act: SemanticActivityLabels) => ({
            activityId: act.activityId,
            activityTitle: act.activityTitle || '',
            teacherParagraphIndexes: act.teacherParagraphIndexes || [],
            studentParagraphIndexes: act.studentParagraphIndexes || [],
            questionParagraphIndexes: act.questionParagraphIndexes || [],
            productParagraphIndexes: act.productParagraphIndexes || [],
            assessmentParagraphIndexes: act.assessmentParagraphIndexes || [],
          })),
        });

        // Debug: show what was extracted
        for (const act of parseResult.activities) {
          console.log(`  Teacher: ${act.teacherParagraphIndexes?.length || 0} paragraphs`);
          console.log(`  Student: ${act.studentParagraphIndexes?.length || 0} paragraphs`);
          console.log(`  Questions: ${act.questionParagraphIndexes?.length || 0} paragraphs`);
          console.log(`  Products: ${act.productParagraphIndexes?.length || 0} paragraphs`);
          console.log(`  Assessments: ${act.assessmentParagraphIndexes?.length || 0} paragraphs`);
        }

      } catch (e) {
        console.error(`  ERROR: Failed to parse AI response: ${e}`);
        console.error(`  Raw response: ${result.data?.substring(0, 500)}`);
      }
    }

    metrics.semanticExtractionTime = totalLatency;
    metrics.aiCalls = aiCalls;

    // ============================================================
    // STEP 3: MAP INDEXES BACK TO VISION JSON
    // ============================================================
    console.log('\n--- STEP 3: MAP INDEXES TO VISION JSON ---');

    // Build activity paragraph index map
    const activityParagraphMap: Map<string, { paragraph: any; localIndex: number }[]> = new Map();
    for (const activity of allActivities) {
      const paras = globalParagraphs
        .filter(p => p.activityId === activity.id)
        .map((p, idx) => ({ paragraph: p.paragraph, localIndex: idx }));
      activityParagraphMap.set(activity.id, paras);

      console.log(`\n=== Activity: ${activity.title} (${activity.id}) ===`);
      console.log(`Paragraphs in this activity: ${paras.length}`);
      for (const p of paras) {
        console.log(`  [${p.localIndex}] ${p.paragraph.content?.substring(0, 50)}...`);
      }
    }

    // Count extracted data
    let totalTeacherActions = 0;
    let totalStudentActions = 0;
    let totalQuestions = 0;
    let totalProducts = 0;
    let totalAssessments = 0;

    // Generate Semantic Tree with mapped paragraphs
    const semanticSections: any[] = [];

    // ============================================================
    // APPROACH 1: Process nested activities inside sections (if exists)
    // ============================================================
    for (const section of visionData?.sections || []) {
      console.log(`\n=== Section: ${section.title} ===`);

      const sectionActivities: any[] = [];

      if (section.activities) {
        for (const activity of section.activities) {
          // Find semantic labels for this activity
          const labels = semanticResults
            .flatMap(r => r.activities)
            .find(a => a.activityId === activity.id);

          console.log(`\n--- Mapping Activity: ${activity.title} (${activity.id}) ---`);

          // Get activity's paragraphs
          const activityParas = activityParagraphMap.get(activity.id) || [];
          console.log(`Activity paragraphs count: ${activityParas.length}`);

          // ============================================================
          // 4. LOG MAPPING DETAILS
          // ============================================================
          console.log('\n--- MAPPING DETAILS ---');
          console.log(`Activity: ${activity.title}`);
          console.log(`Teacher indexes from AI:`, labels?.teacherParagraphIndexes || []);
          console.log(`Student indexes from AI:`, labels?.studentParagraphIndexes || []);
          console.log(`Question indexes from AI:`, labels?.questionParagraphIndexes || []);
          console.log(`Product indexes from AI:`, labels?.productParagraphIndexes || []);
          console.log(`Assessment indexes from AI:`, labels?.assessmentParagraphIndexes || []);

          // Map indexes to actual paragraphs
          const teacherParagraphs = (labels?.teacherParagraphIndexes || [])
            .map(idx => activityParas[idx]?.paragraph)
            .filter(Boolean);

          const studentParagraphs = (labels?.studentParagraphIndexes || [])
            .map(idx => activityParas[idx]?.paragraph)
            .filter(Boolean);

          const questionParagraphs = (labels?.questionParagraphIndexes || [])
            .map(idx => activityParas[idx]?.paragraph)
            .filter(Boolean);

          const productParagraphs = (labels?.productParagraphIndexes || [])
            .map(idx => activityParas[idx]?.paragraph)
            .filter(Boolean);

          const assessmentParagraphs = (labels?.assessmentParagraphIndexes || [])
            .map(idx => activityParas[idx]?.paragraph)
            .filter(Boolean);

          console.log('\n--- MAPPED PARAGRAPHS ---');
          console.log(`Teacher paragraphs mapped: ${teacherParagraphs.length}`);
          for (const p of teacherParagraphs) {
            console.log(`  [TEACHER] ${p.content?.substring(0, 100)}...`);
          }

          console.log(`Student paragraphs mapped: ${studentParagraphs.length}`);
          for (const p of studentParagraphs) {
            console.log(`  [STUDENT] ${p.content?.substring(0, 100)}...`);
          }

          console.log(`Question paragraphs mapped: ${questionParagraphs.length}`);
          for (const p of questionParagraphs) {
            console.log(`  [QUESTION] ${p.content?.substring(0, 100)}...`);
          }

          console.log(`Product paragraphs mapped: ${productParagraphs.length}`);
          for (const p of productParagraphs) {
            console.log(`  [PRODUCT] ${p.content?.substring(0, 100)}...`);
          }

          console.log(`Assessment paragraphs mapped: ${assessmentParagraphs.length}`);
          for (const p of assessmentParagraphs) {
            console.log(`  [ASSESSMENT] ${p.content?.substring(0, 100)}...`);
          }

          totalTeacherActions += teacherParagraphs.length;
          totalStudentActions += studentParagraphs.length;
          totalQuestions += questionParagraphs.length;
          totalProducts += productParagraphs.length;
          totalAssessments += assessmentParagraphs.length;

          sectionActivities.push({
            id: activity.id,
            title: activity.title,
            type: activity.type || 'CUSTOM',
            goal: activity.goal || null,
            duration: activity.duration || null,
            order: activity.order || 1,
            confidence: 0.9,
            // Preserve original paragraphs from Vision JSON
            paragraphs: activity.paragraphs || [],
            // Map to TeacherActions
            teacherActions: teacherParagraphs.map((p, idx) => ({
              id: `ta-${activity.id}-${idx}`,
              action: p.content,  // Original content from Vision JSON
              order: idx + 1,
            })),
            // Map to StudentActions
            studentActions: studentParagraphs.map((p, idx) => ({
              id: `sa-${activity.id}-${idx}`,
              action: p.content,
              order: idx + 1,
            })),
            // Map to Questions
            questions: questionParagraphs.map((p, idx) => ({
              id: `q-${activity.id}-${idx}`,
              content: p.content,
              order: idx + 1,
            })),
            // Map to Products
            products: productParagraphs.map((p, idx) => ({
              id: `prod-${activity.id}-${idx}`,
              type: 'BÀI_LÀM',
              description: p.content,
            })),
            // Map to Assessments
            assessments: assessmentParagraphs.map((p, idx) => ({
              id: `asm-${activity.id}-${idx}`,
              type: 'QUAN_SAT',
              method: p.content,
              evidence: null,
              criteria: null,
            })),
          });
        }
      }

      semanticSections.push({
        id: section.id,
        type: section.type || section.code || 'CUSTOM',
        title: section.title,
        order: section.order || 1,
        confidence: 0.9,
        activities: sectionActivities,
      });
    }

    // Also process activities not in sections
    const orphanActivities = allActivities.filter(a => {
      return !visionData?.sections?.some((s: any) =>
        s.activities?.some((act: any) => act.id === a.id)
      );
    });

    if (orphanActivities.length > 0) {
      console.log(`\n--- Processing ${orphanActivities.length} orphan activities ---`);

      for (const activity of orphanActivities) {
        const labels = semanticResults
          .flatMap(r => r.activities)
          .find(a => a.activityId === activity.id);

        const activityParas = activityParagraphMap.get(activity.id) || [];

        const teacherParagraphs = (labels?.teacherParagraphIndexes || [])
          .map(idx => activityParas[idx]?.paragraph)
          .filter(Boolean);
        const studentParagraphs = (labels?.studentParagraphIndexes || [])
          .map(idx => activityParas[idx]?.paragraph)
          .filter(Boolean);
        const questionParagraphs = (labels?.questionParagraphIndexes || [])
          .map(idx => activityParas[idx]?.paragraph)
          .filter(Boolean);
        const productParagraphs = (labels?.productParagraphIndexes || [])
          .map(idx => activityParas[idx]?.paragraph)
          .filter(Boolean);
        const assessmentParagraphs = (labels?.assessmentParagraphIndexes || [])
          .map(idx => activityParas[idx]?.paragraph)
          .filter(Boolean);

        totalTeacherActions += teacherParagraphs.length;
        totalStudentActions += studentParagraphs.length;
        totalQuestions += questionParagraphs.length;
        totalProducts += productParagraphs.length;
        totalAssessments += assessmentParagraphs.length;

        semanticSections.push({
          id: activity.id,
          type: 'CUSTOM',
          title: activityToSection.get(activity.id) || 'Hoạt động',
          order: semanticSections.length + 1,
          confidence: 0.9,
          activities: [{
            id: activity.id,
            title: activity.title,
            type: 'CUSTOM',
            paragraphs: activity.paragraphs || [],
            teacherActions: teacherParagraphs.map((p, idx) => ({
              id: `ta-${activity.id}-${idx}`,
              action: p.content,
              order: idx + 1,
            })),
            studentActions: studentParagraphs.map((p, idx) => ({
              id: `sa-${activity.id}-${idx}`,
              action: p.content,
              order: idx + 1,
            })),
            questions: questionParagraphs.map((p, idx) => ({
              id: `q-${activity.id}-${idx}`,
              content: p.content,
              order: idx + 1,
            })),
            products: productParagraphs.map((p, idx) => ({
              id: `prod-${activity.id}-${idx}`,
              type: 'BÀI_LÀM',
              description: p.content,
            })),
            assessments: assessmentParagraphs.map((p, idx) => ({
              id: `asm-${activity.id}-${idx}`,
              type: 'QUAN_SAT',
              method: p.content,
              evidence: null,
              criteria: null,
            })),
          }],
        });
      }
    }

    metrics.totalTime = Date.now() - startTime;

    // ============================================================
    // STEP 4: FINAL OUTPUT
    // ============================================================
    console.log('\n--- STEP 4: FINAL OUTPUT ---');

    console.log('\n===== AI RESULT =====');
    console.log(`Sections: ${semanticSections.length}`);
    console.log(`Activities: ${semanticSections.reduce((sum, s) => sum + (s.activities?.length || 0), 0)}`);
    console.log(`TeacherActions: ${totalTeacherActions}`);
    console.log(`StudentActions: ${totalStudentActions}`);
    console.log(`Questions: ${totalQuestions}`);
    console.log(`Products: ${totalProducts}`);
    console.log(`Assessments: ${totalAssessments}`);
    console.log(`AI Calls: ${aiCalls}`);
    console.log(`Total Latency: ${totalLatency}ms`);

    // Verify data integrity
    console.log('\n===== DATABASE VALIDATION =====');
    console.log(`Expected TeacherActions: ${totalTeacherActions}`);
    console.log(`Expected StudentActions: ${totalStudentActions}`);
    console.log(`Expected Questions: ${totalQuestions}`);
    console.log(`Expected Products: ${totalProducts}`);
    console.log(`Expected Assessments: ${totalAssessments}`);

    // Build document
    const docId = 'doc-' + Date.now();
    const document: AIDocument = {
      id: docId,
      title: request.documentTitle || 'Untitled',
      metadata: {
        totalPages: visionData?.metadata?.totalPages,
        wordCount: visionData?.metadata?.wordCount || 0,
        language: 'vi',
      },
      sections: semanticSections,
    };

    const confidence = this.calculateConfidence(semanticSections);

    // ============================================================
    // 5. LOG FINAL SEMANTIC TREE
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('================ FINAL SEMANTIC TREE ================');
    console.log('='.repeat(80));

    console.log('\n========== FULL SEMANTIC TREE ==========\n');
    console.dir(semanticSections, { depth: null });
    console.log('\n========== END SEMANTIC TREE ==========');

    // Save to file
    const fs = await import('fs');
    const debugDir = path.join(process.cwd(), 'debug');
    fs.writeFileSync(
      path.join(debugDir, 'semantic-tree.json'),
      JSON.stringify(semanticSections, null, 2)
    );
    console.log('[DEBUG] Saved: debug/semantic-tree.json');

    console.log('\n===== PARSE RESULT =====');
    console.log(`Success: true`);
    console.log(`Sections: ${semanticSections.length}`);
    console.log(`Confidence: ${confidence}`);

    return {
      success: true,
      document,
      sections: semanticSections,
      tree: { sections: semanticSections } as DocumentTree,
      pipelineMetrics: metrics,
      confidence,
      debug: {
        aiCalls,
        totalLatency,
        inputParagraphs: globalParagraphs.length,
        outputTeacherActions: totalTeacherActions,
        outputStudentActions: totalStudentActions,
      },
    };
  }

  private calculateConfidence(sections: any[]): number {
    if (sections.length === 0) return 0;
    const totalConfidence = sections.reduce((sum, section) => {
      const sectionConf = section.confidence || 0.8;
      return sum + sectionConf;
    }, 0);
    return totalConfidence / sections.length;
  }
}

// Export singleton
export const aiDocumentParserPipeline = new AIDocumentParserPipeline();
