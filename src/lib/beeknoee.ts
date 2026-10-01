import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { AI_MODELS, getModelById, getDefaultModel, type AIModelConfig } from "@/lib/ai-models";

// Beeknoee API Configuration
const BEE_API_KEY = process.env.BEE_API_KEY || "";
const BEE_BASE_URL = process.env.BEE_BASE_URL || "https://platform.beeknoee.com/api/v1";
const DEFAULT_MODEL = process.env.AI_MODEL || getDefaultModel().id;

/**
 * Knowledge Context - Single source of truth for all knowledge inputs
 * This is built ONCE in the workflow and passed to all review modules
 */
export interface KnowledgeContext {
  /** Lesson plan being reviewed */
  lessonPlan: {
    id: string;
    title: string;
    subject: string | null;
    gradeLevel: string | null;
    schoolYear: string | null;
  };
  /** Circular document context */
  circular: {
    id: string;
    code: string;
    title: string;
    type: string;
  } | null;
  /** Section rules for evaluation */
  rules: SectionRule[];
  /** Teaching methods for pedagogy analysis */
  teachingMethods: Array<{
    id: string;
    name: string;
    description: string | null;
    objectives: string | null;
    process: string | null;
    advantages: string | null;
    limitations: string | null;
  }>;
  /** Textbook context if linked */
  textbook: {
    id: string;
    name: string;
    subject: string | null;
  } | null;
}

/**
 * Activity Context - Single activity being reviewed
 * Contains both the activity content and relevant knowledge
 */
export interface ActivityContext {
  /** Activity/Section being reviewed */
  section: {
    id: string;
    sectionType: string;
    sectionTitle: string;
    sectionOrder: number;
    rawContent: string;
  };
  /** Whether this is an activity section requiring pedagogy analysis */
  isActivitySection: boolean;
}

export interface TeachingMethodAnalysis {
  currentMethod: {
    name: string;
    description: string;
    confidence: number;
  };
  recommendedMethods: Array<{
    name: string;
    reason: string;
    advantages: string[];
    disadvantages: string[];
    suitabilityScore: number;
  }>;
  alternativeMethods: Array<{
    name: string;
    reason: string;
  }>;
  pedagogyScore: number;
  overallRecommendation: string;
}

export interface SectionRule {
  id: string;
  circularId: string | null;
  sectionType: string;
  title: string;
  requirements: string;
  correctExample?: string | null;
  incorrectExample?: string | null;
  aiPrompt: string;
  priority: number;
  weight: number;
  level: number;
  order: number;
  isActive: boolean;
}

export interface SectionReviewResult {
  sectionAnalysis: {
    hasRequiredComponents: boolean;
    missingComponents: string[];
    structureScore: number;
    contentScore: number;
    formatScore: number;
  };
  findings: Array<{
    ruleCode: string;
    severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
    position: { startChar: number; endChar: number };
    highlightedText: string;
    issue: string;
    explanation: string;
    suggestion: string;
    proposedContent: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  overallScore: number;
  teachingMethodAnalysis?: {
    currentMethod: {
      name: string;
      description: string;
      confidence: number;
    };
    recommendedMethods: Array<{
      name: string;
      reason: string;
      advantages: string[];
      disadvantages: string[];
      suitabilityScore: number;
    }>;
    alternativeMethods: Array<{
      name: string;
      reason: string;
    }>;
    pedagogyScore: number;
    overallRecommendation: string;
  };
}

/**
 * Get Beeknoee provider model ID
 * Uses the id directly from ai-models.ts (already in Beeknoee format)
 */
function getProviderModelId(modelId: string): string {
  // Model IDs in ai-models.ts are already in correct format
  // e.g., "gemini-2.5-flash-lite" or "google/gemini-2.5-flash-lite"
  return modelId;
}

/**
 * Call Beeknoee Chat Completions API
 */
async function callBeeknoeeAPI(
  prompt: string,
  modelName: string = DEFAULT_MODEL
): Promise<string> {
  if (!BEE_API_KEY) {
    throw new Error("BEE_API_KEY is not configured");
  }

  // Convert to Beeknoee format (e.g., google/gemini-3.1-flash-lite)
  const providerModelId = getProviderModelId(modelName);

  const response = await fetch(`${BEE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${BEE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: providerModelId,
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia đánh giá giáo án theo chuẩn Bộ Giáo dục Việt Nam. Nhiệm vụ của bạn là phân tích chi tiết nội dung giáo án và đưa ra nhận xét, góp ý cụ thể dưới dạng JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 8192,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Beeknoee API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Always read from response.choices[0].message.content
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Invalid response format from Beeknoee API");
  }

  return content;
}

/**
 * Review a lesson plan section using Beeknoee AI
 * Optionally include teaching methods for combined analysis
 */
/**
 * Review a section/activity using the Knowledge Context pattern
 * All knowledge sources are passed in, no database queries
 */
export async function reviewSection(
  activityContext: ActivityContext,
  knowledgeContext: KnowledgeContext,
  modelName: string = DEFAULT_MODEL
): Promise<SectionReviewResult> {
  try {
    const { section } = activityContext;
    const { rules, teachingMethods } = knowledgeContext;

    // Get rules for this section type
    const sectionRules = rules.filter(r => r.sectionType === section.sectionType);

    // Build teaching methods context for activity sections
    const teachingMethodsContext = teachingMethods.length > 0
      ? {
          allMethods: teachingMethods,
          isActivitySection: activityContext.isActivitySection,
        }
      : undefined;

    // Build prompt with knowledge context
    const prompt = buildReviewPrompt(
      section.rawContent,
      section.sectionType,
      sectionRules,
      teachingMethodsContext
    );

    // Check cache first
    const cacheKey = crypto
      .createHash("md5")
      .update(prompt + activityContext.section.id + modelName)
      .digest("hex");

    const cached = await checkCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Call Beeknoee API with specified model
    const responseText = await callBeeknoeeAPI(prompt, modelName);

    // Parse JSON response (remove markdown code blocks if present)
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    const reviewResult = JSON.parse(cleanedResponse) as SectionReviewResult;

    // Cache the result
    await cacheResult(cacheKey, cleanedResponse, activityContext.section.id);

    return reviewResult;
  } catch (error) {
    console.error("Error reviewing section with Beeknoee:", error);
    throw new Error(
      `Lỗi khi review section: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Build review prompt based on section type and rules
 * Optionally include teaching methods context for combined analysis
 */
function buildReviewPrompt(
  content: string,
  sectionType: string,
  sectionRules: SectionRule[],
  teachingMethodsContext?: {
    allMethods: Array<{
      id: string;
      name: string;
      description: string | null;
      objectives: string | null;
      process: string | null;
      advantages: string | null;
      limitations: string | null;
    }>;
    isActivitySection: boolean;
  }
): string {
  // ONLY use prompts from rules - no hardcoded guidelines
  if (!sectionRules || sectionRules.length === 0) {
    throw new Error(`Không có rules để review cho section type: ${sectionType}`);
  }

  const rulesPrompt = sectionRules.map((rule, idx) => `
${idx + 1}. ${rule.title} (Độ ưu tiên: ${rule.priority || 0}, Trọng số: ${rule.weight || 1.0})

YÊU CẦU:
${rule.requirements}

HƯỚNG DẪN ĐÁNH GIÁ:
${rule.aiPrompt || "Đánh giá theo yêu cầu trên"}

${rule.correctExample ? `✅ VÍ DỤ ĐẠT YÊU CẦU:\n${rule.correctExample}\n` : ""}
${rule.incorrectExample ? `❌ VÍ DỤ CHƯA ĐẠT YÊU CẦU:\n${rule.incorrectExample}\n` : ""}
`).join("\n" + "=".repeat(80) + "\n");

  // Build teaching methods context if provided
  let teachingMethodsSection = "";
  let jsonOutputFields = "";

  if (teachingMethodsContext && teachingMethodsContext.allMethods.length > 0) {
    const methodsInfo = teachingMethodsContext.allMethods.map((m) => `
## ${m.name}
- Mô tả: ${m.description || "Không có"}
- Mục tiêu: ${m.objectives || "Không có"}
- Quy trình: ${m.process || "Không có"}
- Ưu điểm: ${m.advantages || "Không có"}
- Hạn chế: ${m.limitations || "Không có"}
`).join("\n");

    const tmInstruction = teachingMethodsContext.isActivitySection
      ? `
## PHÂN TÍCH PHƯƠNG PHÁP GIẢNG DẠY CHO HOẠT ĐỘNG
Ngoài việc đánh giá nội dung section, hãy PHÂN TÍCH PHƯƠNG PHÁP GIẢNG DẠY được sử dụng trong hoạt động này:

1. **Phương pháp hiện tại**: Phương pháp nào đang được sử dụng trong hoạt động?
2. **Đánh giá phù hợp**: Phương pháp có phù hợp với nội dung hoạt động không?
3. **Đề xuất cải thiện**: Nếu có phương pháp tốt hơn, đề xuất và giải thích lý do
4. **Điểm số phương pháp**: Cho điểm phù hợp (0-100)

CÁC PHƯƠNG PHÁP GIẢNG DẠY CÓ SẴN:
${methodsInfo}`
      : `
## NGỮ CẢNH PHƯƠNG PHÁP GIẢNG DẠY
Thông tin các phương pháp giảng dạy (tham khảo cho các section khác):
${methodsInfo}`;

    teachingMethodsSection = tmInstruction;

    // Add teaching method fields to JSON output
    jsonOutputFields = teachingMethodsContext.isActivitySection ? `,
  "teachingMethodAnalysis": {
    "currentMethod": {
      "name": string (phương pháp hiện tại),
      "description": string (mô tả),
      "confidence": number (0-100)
    },
    "recommendedMethods": [
      {
        "name": string,
        "reason": string,
        "advantages": string[],
        "disadvantages": string[],
        "suitabilityScore": number (0-100)
      }
    ],
    "alternativeMethods": [
      {
        "name": string,
        "reason": string
      }
    ],
    "pedagogyScore": number (0-100),
    "overallRecommendation": string
  }` : "";
  }

  return `
BẠN LÀ CHUYÊN GIA ĐÁNH GIÁ GIÁO ÁN THEO CHUẨN BỘ GIÁO DỤC VIỆT NAM

NHIỆM VỤ: Phân tích và đánh giá phần "${sectionType}" của giáo án dưới đây

CÁC TIÊU CHÍ ĐÁNH GIÁ:
${rulesPrompt}
${teachingMethodsSection}

NỘI DUNG CẦN ĐÁNH GIÁ:
${"=".repeat(80)}
${content}
${"=".repeat(80)}

YÊU CẦU ĐẦU RA (STRICT JSON):
{
  "sectionAnalysis": {
    "hasRequiredComponents": boolean,
    "missingComponents": string[],
    "structureScore": number (0-100),
    "contentScore": number (0-100),
    "formatScore": number (0-100)
  },
  "findings": [
    {
      "ruleCode": string (tên rule bị vi phạm),
      "severity": "INFO" | "WARNING" | "ERROR" | "CRITICAL",
      "position": { "startChar": number, "endChar": number },
      "highlightedText": string (đoạn text có vấn đề),
      "issue": string (mô tả vấn đề ngắn gọn),
      "explanation": string (giải thích chi tiết),
      "suggestion": string (đề xuất cách sửa),
      "proposedContent": string (nội dung đề xuất thay thế)
    }
  ],
  "strengths": string[] (điểm mạnh),
  "weaknesses": string[] (điểm yếu),
  "overallScore": number (0-100, điểm tổng thể)${jsonOutputFields}
}

LƯU Ý QUAN TRỌNG:
1. Trả về CHÍNH XÁC JSON, không có markdown code blocks, không có giải thích thêm
2. position phải chính xác vị trí ký tự trong content
3. highlightedText phải là đoạn text chính xác từ content
4. Mỗi finding phải cụ thể, rõ ràng, có thể hành động được
5. proposedContent phải là đề xuất cải thiện cụ thể
6. Kiểm tra KỸ LƯỠNG từng rule, mỗi rule có thể phát hiện nhiều lỗi
7. Severity: INFO (gợi ý), WARNING (cảnh báo), ERROR (lỗi), CRITICAL (nghiêm trọng)
${teachingMethodsContext?.isActivitySection ? "8. Phân tích kỹ phương pháp giảng dạy cho hoạt động" : ""}

BẮT ĐẦU PHÂN TÍCH:
`.trim();
}

/**
 * Check if cached result exists
 */
async function checkCache(cacheKey: string): Promise<string | null> {
  try {
    // Find AIRequest by cacheKey, then get its response
    const request = await prisma.aIRequest.findFirst({
      where: { cacheKey },
      select: {
        response: {
          select: { responseData: true, createdAt: true },
        },
      },
    });

    if (!request?.response) return null;

    // Cache valid for 7 days
    const cacheAge = Date.now() - new Date(request.response.createdAt).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (cacheAge > maxAge) {
      return null;
    }

    return JSON.stringify(request.response.responseData);
  } catch (error) {
    console.error("Error checking cache:", error);
    return null;
  }
}

/**
 * Cache the AI response
 */
async function cacheResult(
  cacheKey: string,
  responseText: string,
  relatedEntityId: string
): Promise<void> {
  try {
    // Create AIRequest first
    const aiRequest = await prisma.aIRequest.create({
      data: {
        requestType: "REVIEW",
        modelName: "beeknoee",
        inputTokens: 0,
        cacheKey,
        lessonPlanId: relatedEntityId,
        prompt: "",
      },
    });

    // Create AIResponse linked to request
    const parsedResponse = JSON.parse(responseText);
    await prisma.aIResponse.create({
      data: {
        requestId: aiRequest.id,
        responseData: parsedResponse,
        outputTokens: 0,
      },
    });
  } catch (error) {
    console.error("Error caching result:", error);
  }
}
