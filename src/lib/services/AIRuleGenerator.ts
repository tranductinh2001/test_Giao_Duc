/**
 * AI Rule Generator Service
 * Generates sample rules for circulars using BeekOne AI
 */

import { BeekOneAIClient } from "@/lib/beekone-ai-client";
import { getModelById, getDefaultModel, type AIModelConfig } from "@/lib/ai-models";

export interface GenerateRulesRequest {
  circularCode: string;
  circularTitle: string;
  count: number;
  detailLevel: "short" | "medium" | "detailed";
  language: "vi" | "en";
}

export interface GeneratedRule {
  nhomTieuChi: string;
  tenTieuChi: string;
  noiDungDanhGia: string;
  DieuKienDat: string;
  DieuKienChuaDat: string;
  promptAI: string;
  viDuDung: string;
  viDuSai: string;
  goiYNhanXet: string;
  diem: number;
  trongSo: number;
  batBuoc: boolean;
  ghiChu: string;
}

export interface GenerateRulesResult {
  success: boolean;
  rules: GeneratedRule[];
  error?: string;
}

const SECTION_TYPES = [
  "OBJECTIVES",
  "PREPARATION",
  "ACTIVITY",
  "EVALUATION",
  "MATERIALS",
  "HOMEWORK",
  "NOTES",
];

export class AIRuleGenerator {
  private client: BeekOneAIClient;
  private selectedModel: string;

  constructor(modelId?: string) {
    // Get model from single source of truth
    const model = modelId ? getModelById(modelId) : getDefaultModel();
    this.selectedModel = model?.id || getDefaultModel().id;

    this.client = new BeekOneAIClient();
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return this.client.isAvailable();
  }

  /**
   * Generate sample rules using AI
   */
  async generateRules(request: GenerateRulesRequest): Promise<GenerateRulesResult> {
    const { circularCode, circularTitle, count, detailLevel, language } = request;

    const detailInstructions: Record<string, string> = {
      short: language === "vi" ? "Ngắn gọn, súc tích, chỉ nêu điểm chính" : "Brief and concise, only main points",
      medium: language === "vi" ? "Cân bằng giữa chi tiết và ngắn gọn" : "Balanced between detail and brevity",
      detailed: language === "vi" ? "Rất chi tiết, đầy đủ ví dụ và giải thích" : "Very detailed, with full examples and explanations",
    };

    const prompt = this.buildPrompt(circularCode, circularTitle, count, detailInstructions[detailLevel], language);

    const result = await this.client.complete(prompt, {
      model: this.selectedModel,
      temperature: 0.7,
      maxTokens: 12000,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        rules: [],
        error: result.error || "Failed to generate rules",
      };
    }

    try {
      const rules = this.parseAIResponse(result.data, count);
      return {
        success: true,
        rules,
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return {
        success: false,
        rules: [],
        error: "Failed to parse AI response",
      };
    }
  }

  /**
   * Build the prompt for AI
   */
  private buildPrompt(
    circularCode: string,
    circularTitle: string,
    count: number,
    detailLevel: string,
    language: string
  ): string {
    const langLabel = language === "vi" ? "Tiếng Việt" : "English";
    const exampleNumbers = ["5512", "958", "2345"];

    return `Bạn là chuyên gia tạo tiêu chí đánh giá giáo án theo công văn giáo dục Việt Nam.

## Nhiệm vụ
Tạo ${count} tiêu chí đánh giá mẫu cho công văn: ${circularCode} - ${circularTitle}

## Yêu cầu chi tiết
- ${detailLevel}
- Ngôn ngữ: ${langLabel}
- Các tiêu chí phải phù hợp với thực tế giáo dục Việt Nam

## Các nhóm tiêu chí (chọn phù hợp):
${SECTION_TYPES.map((t, i) => `${i + 1}. ${t}`).join("\n")}

## Định dạng JSON (bắt buộc)
Trả về một mảng JSON với đúng ${count} phần tử, mỗi phần tử có format:

{
  "nhomTieuChi": "OBJECTIVES" | "PREPARATION" | "ACTIVITY" | "EVALUATION" | "MATERIALS" | "HOMEWORK" | "NOTES",
  "tenTieuChi": "tên tiêu chí ngắn gọn",
  "noiDungDanhGia": "mô tả chi tiết nội dung cần đánh giá",
  "DieuKienDat": "điều kiện để đạt tiêu chí",
  "DieuKienChuaDat": "điều kiện khi chưa đạt",
  "promptAI": "prompt cho AI (để trống nếu dùng mặc định)",
  "viDuDung": "ví dụ nội dung đúng",
  "viDuSai": "ví dụ nội dung sai",
  "goiYNhanXet": "gợi ý cách nhận xét cho giáo viên",
  "diem": số điểm (thường 5-15),
  "trongSo": trọng số (0.5-2.0),
  "batBuoc": true/false,
  "ghiChu": "ghi chú thêm (có thể để trống)"
}

## Ví dụ số công văn phổ biến để tham khảo cách đặt tiêu chí: ${exampleNumbers.join(", ")}

## Lưu ý quan trọng
- Phân bổ đều các nhóm tiêu chí
- Mỗi tiêu chí phải thực tế, có thể áp dụng được
- Điểm và trọng số hợp lý
- Ví dụ phải rõ ràng, dễ hiểu

Trả về JSON array, không giải thích thêm.`;
  }

  /**
   * Parse AI response to extract rules
   */
  private parseAIResponse(content: string, expectedCount: number): GeneratedRule[] {
    // Find JSON array in response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    // Validate and normalize each rule
    const rules: GeneratedRule[] = parsed.slice(0, expectedCount).map((rule: any, index: number) => ({
      nhomTieuChi: this.normalizeSectionType(rule.nhomTieuChi) || "OBJECTIVES",
      tenTieuChi: rule.tenTieuChi || `Tiêu chí ${index + 1}`,
      noiDungDanhGia: rule.noiDungDanhGia || rule.noiDung || "",
      DieuKienDat: rule.DieuKienDat || rule.dieuKienDat || "",
      DieuKienChuaDat: rule.DieuKienChuaDat || rule.dieuKienChuaDat || "",
      promptAI: rule.promptAI || rule.prompt || "",
      viDuDung: rule.viDuDung || rule.viDuDung || "",
      viDuSai: rule.viDuSai || rule.viDuSai || "",
      goiYNhanXet: rule.goiYNhanXet || rule.goiY || "",
      diem: Number(rule.diem) || 10,
      trongSo: Number(rule.trongSo) || 1.0,
      batBuoc: rule.batBuoc !== false,
      ghiChu: rule.ghiChu || "",
    }));

    return rules;
  }

  /**
   * Normalize section type to valid enum value
   */
  private normalizeSectionType(value: string): string {
    if (!value) return "OBJECTIVES";

    const normalized = value.toUpperCase().trim();
    if (SECTION_TYPES.includes(normalized as any)) {
      return normalized;
    }

    // Try to match by partial name
    const sectionMap: Record<string, string> = {
      "MUC TIÊU": "OBJECTIVES",
      "OBJECTIVE": "OBJECTIVES",
      "CHUẨN BỊ": "PREPARATION",
      "PREPARATION": "PREPARATION",
      "HOẠT ĐỘNG": "ACTIVITY",
      "ACTIVITY": "ACTIVITY",
      "ĐÁNH GIÁ": "EVALUATION",
      "EVALUATION": "EVALUATION",
      "TÀI LIỆU": "MATERIALS",
      "MATERIAL": "MATERIALS",
      "BÀI TẬP": "HOMEWORK",
      "HOMEWORK": "HOMEWORK",
      "GHI CHÚ": "NOTES",
      "NOTE": "NOTES",
    };

    for (const [key, sectionType] of Object.entries(sectionMap)) {
      if (normalized.includes(key)) {
        return sectionType;
      }
    }

    return "OBJECTIVES";
  }

  /**
   * Complete missing fields in a rule using AI
   */
  async completeRule(rule: Partial<GeneratedRule>): Promise<GeneratedRule> {
    const prompt = `Hoàn thiện tiêu chí đánh giá giáo án sau:

Tiêu chí: ${rule.tenTieuChi}
Nhóm: ${rule.nhomTieuChi}
Nội dung đánh giá: ${rule.noiDungDanhGia}

Trả về JSON với các trường còn thiếu:
{
  "DieuKienDat": "điều kiện để đạt",
  "DieuKienChuaDat": "điều kiện khi chưa đạt",
  "promptAI": "prompt cho AI (nếu cần)",
  "viDuDung": "ví dụ nội dung đúng",
  "viDuSai": "ví dụ nội dung sai",
  "goiYNhanXet": "gợi ý nhận xét"
}

Chỉ trả về JSON, không giải thích.`;

    const result = await this.client.complete(prompt, {
      model: this.selectedModel,
      temperature: 0.5,
      maxTokens: 2000,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to complete rule");
    }

    // Try multiple parsing strategies
    let completed: any = {};
    try {
      // First try direct JSON parse
      completed = JSON.parse(result.data);
    } catch {
      // Try to extract JSON from response
      const jsonMatch = result.data.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          completed = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
          throw new Error("Invalid response format - cannot parse JSON");
        }
      } else {
        // Try to find any JSON-like object
        const objMatch = result.data.match(/\{[\s\S]*\}/);
        if (objMatch) {
          try {
            completed = JSON.parse(objMatch[0]);
          } catch {
            throw new Error("Invalid response format - no valid JSON found");
          }
        } else {
          throw new Error("Invalid response format - no JSON found");
        }
      }
    }

    return {
      ...rule,
      DieuKienDat: completed.DieuKienDat || rule.DieuKienDat || "",
      DieuKienChuaDat: completed.DieuKienChuaDat || rule.DieuKienChuaDat || "",
      promptAI: completed.promptAI || rule.promptAI || "",
      viDuDung: completed.viDuDung || rule.viDuDung || "",
      viDuSai: completed.viDuSai || rule.viDuSai || "",
      goiYNhanXet: completed.goiYNhanXet || rule.goiYNhanXet || "",
    } as GeneratedRule;
  }
}

// Singleton instance
let ruleGenerator: AIRuleGenerator | null = null;

export function getAIRuleGenerator(model?: string): AIRuleGenerator {
  // Create new instance if model is specified (to use different model)
  if (model) {
    return new AIRuleGenerator(model);
  }
  if (!ruleGenerator) {
    ruleGenerator = new AIRuleGenerator();
  }
  return ruleGenerator;
}
