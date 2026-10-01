/**
 * Prompt Builder Service
 *
 * Phase 4: Generates prompts from ActivityPayload for Gemini
 */

import type { ActivityPayload, RulePayload } from "../types";

export interface PromptOptions {
  language?: "vi" | "en";
  includeExamples?: boolean;
  strictMode?: boolean;
  maxIssues?: number;
}

const DEFAULT_PROMPT_OPTIONS: PromptOptions = {
  language: "vi",
  includeExamples: false,
  strictMode: true,
  maxIssues: 50,
};

export class PromptBuilder {
  private options: PromptOptions;

  constructor(options: PromptOptions = {}) {
    this.options = { ...DEFAULT_PROMPT_OPTIONS, ...options };
  }

  /**
   * Build review prompt from activity payload
   */
  buildPrompt(payload: ActivityPayload): string {
    const { activityCode, activityTitle, sectionName, content, rules, metadata } = payload;

    const promptParts: string[] = [];

    // Header
    promptParts.push(this.buildHeader(activityCode, activityTitle, sectionName, metadata));

    // Content
    promptParts.push(this.buildContent(content));

    // Rules
    promptParts.push(this.buildRules(rules));

    // Instructions
    promptParts.push(this.buildInstructions(rules.length));

    // Output format
    promptParts.push(this.buildOutputFormat());

    return promptParts.join("\n\n");
  }

  /**
   * Build header section
   */
  private buildHeader(
    activityCode: string,
    activityTitle: string,
    sectionName: string,
    metadata: ActivityPayload["metadata"]
  ): string {
    const confidencePercent = Math.round(metadata.confidence);
    const matchedBy = metadata.matchedBy.join(", ");

    return `# Nhiệm vụ Đánh giá Hoạt động Giảng dạy

## Thông tin Hoạt động
- **Mã hoạt động**: ${activityCode}
- **Tên hoạt động**: ${activityTitle}
- **Tên phần**: ${sectionName}
- **Độ tin cậy khớp**: ${confidencePercent}% (${matchedBy})
${metadata.totalChunks && metadata.totalChunks > 1 ? `- **Phần chunk**: ${(metadata.chunkIndex ?? 0) + 1}/${metadata.totalChunks}` : ""}`;
  }

  /**
   * Build content section
   */
  private buildContent(content: ActivityPayload["content"]): string {
    const parts: string[] = [];

    // Paragraphs
    if (content.paragraphs && content.paragraphs.length > 0) {
      parts.push("## Nội dung Hoạt động\n");
      content.paragraphs.forEach((para, idx) => {
        parts.push(`${idx + 1}. ${para}`);
      });
    }

    // Knowledge
    if (content.knowledge) {
      parts.push(`\n## Kiến thức cần truyền tải\n${content.knowledge}`);
    }

    // Teaching intent
    if (content.teachingIntent) {
      parts.push(`\n## Mục đích giảng dạy\n${content.teachingIntent}`);
    }

    // Teacher actions
    if (content.expectedTeacherActions) {
      parts.push(`\n## Hành động của Giáo viên\n${content.expectedTeacherActions}`);
    }

    // Student actions
    if (content.expectedStudentActions) {
      parts.push(`\n## Hành động của Học sinh\n${content.expectedStudentActions}`);
    }

    // Expected outcome
    if (content.expectedOutcome) {
      parts.push(`\n## Kết quả mong đợi\n${content.expectedOutcome}`);
    }

    return parts.join("\n");
  }

  /**
   * Build rules section
   */
  private buildRules(rules: RulePayload[]): string {
    if (rules.length === 0) {
      return "## Quy tắc đánh giá\nKhông có quy tắc cụ thể cho hoạt động này.";
    }

    const parts: string[] = ["## Quy tắc đánh giá\n"];

    // Group rules by category
    const byCategory = new Map<string, RulePayload[]>();
    for (const rule of rules) {
      const cat = rule.category || "OTHER";
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(rule);
    }

    // Output by category
    for (const [category, categoryRules] of byCategory) {
      parts.push(`### ${this.translateCategory(category)}`);
      for (const rule of categoryRules) {
        const priority = rule.priority >= 8 ? "🔴 QUAN TRỌNG" : rule.priority >= 5 ? "🟡 Cần thiết" : "⚪ Tham khảo";
        parts.push(`\n**${rule.code}: ${rule.name}** [${priority}]
- ${rule.description}
- Mức độ nghiêm trọng: ${this.translateSeverity(rule.severity)}`);
        if (rule.message) {
          parts.push(`- Thông báo: ${rule.message}`);
        }
      }
    }

    return parts.join("\n");
  }

  /**
   * Build instructions section
   */
  private buildInstructions(ruleCount: number): string {
    return `## Hướng dẫn đánh giá

Bạn là một chuyên gia giáo dục có kinh nghiệm trong việc đánh giá kế hoạch giảng dạy. Hãy đánh giá hoạt động giảng dạy trên dựa trên các quy tắc đã cho.

**Nguyên tắc chung:**
1. Đọc kỹ nội dung hoạt động và các quy tắc đánh giá
2. Kiểm tra từng quy tắc một cách có hệ thống
3. Đưa ra đánh giá khách quan dựa trên nội dung thực tế
4. Cung cấp phản hồi cụ thể và hữu ích

**Lưu ý quan trọng:**
- CHỈ đánh giá, KHÔNG chỉnh sửa hay viết lại nội dung
- Chỉ đưa ra gợi ý cải thiện, không tự động sửa lỗi
- Đánh giá dựa trên nội dung THỰC TẾ của hoạt động
- Sử dụng thông tin từ mục đích giảng dạy và kết quả mong đợi làm tiêu chuẩn`;
  }

  /**
   * Build output format section
   */
  private buildOutputFormat(): string {
    return `## Định dạng kết quả

Trả về kết quả đánh giá theo định dạng JSON sau:

\`\`\`json
{
  "activityId": "${this.options.language === "vi" ? "ID của hoạt động" : "Activity ID"}",
  "score": ${this.options.language === "vi" ? "Điểm số từ 0-100" : "Score from 0-100"},
  "passed": ${this.options.language === "vi" ? "true nếu đạt yêu cầu (score >= 60)" : "true if passes (score >= 60)"},
  "comments": "${this.options.language === "vi" ? "Nhận xét tổng quan" : "Overall comments"}",
  "issues": [
    {
      "ruleId": "${this.options.language === "vi" ? "ID của quy tắc bị vi phạm" : "ID of violated rule"}",
      "title": "${this.options.language === "vi" ? "Tiêu đề vấn đề" : "Issue title"}",
      "description": "${this.options.language === "vi" ? "Mô tả vấn đề" : "Issue description"}",
      "reason": "${this.options.language === "vi" ? "Lý do cụ thể tại sao vi phạm" : "Specific reason for violation"}",
      "severity": "ERROR|WARNING|INFO",
      "paragraphIndex": ${this.options.language === "vi" ? "Số thứ tự đoạn văn (nếu có)" : "Paragraph index (if applicable)"},
      "suggestions": ["${this.options.language === "vi" ? "Gợi ý cải thiện 1" : "Improvement suggestion 1"}]
    }
  ]
}
\`\`\`

**Quy tắc tính điểm:**
- ERROR: Trừ 10-20 điểm mỗi lỗi
- WARNING: Trừ 5-10 điểm mỗi cảnh báo
- INFO: Trừ 0-3 điểm mỗi thông tin (không ảnh hưởng đáng kể)

Đảm bảo kết quả JSON hợp lệ và không có markdown code block trong trường string.`;
  }

  /**
   * Translate category to Vietnamese
   */
  private translateCategory(category: string): string {
    const translations: Record<string, string> = {
      CONTENT: "Nội dung",
      FORMAT: "Định dạng",
      STRUCTURE: "Cấu trúc",
      CLARITY: "Rõ ràng",
      ALIGNMENT: "Phù hợp",
      PEDAGOGY: "Phương pháp sư phạm",
      ASSESSMENT: "Đánh giá",
      TIME: "Thời gian",
      MATERIALS: "Tài liệu",
      OTHER: "Khác",
    };
    return translations[category] || category;
  }

  /**
   * Translate severity to Vietnamese
   */
  private translateSeverity(severity: string): string {
    const translations: Record<string, string> = {
      ERROR: "Lỗi nghiêm trọng",
      WARNING: "Cảnh báo",
      INFO: "Thông tin",
    };
    return translations[severity] || severity;
  }

  /**
   * Build system prompt
   */
  buildSystemPrompt(): string {
    return `Bạn là một chuyên gia đánh giá kế hoạch giảng dạy AI. Nhiệm vụ của bạn là:

1. Đánh giá chất lượng hoạt động giảng dạy dựa trên các quy tắc được cung cấp
2. Chỉ đưa ra đánh giá, KHÔNG chỉnh sửa hay viết lại nội dung
3. Cung cấp phản hồi khách quan và xây dựng
4. Trả về kết quả JSON hợp lệ

Nguyên tắc:
- Tập trung vào việc cải thiện chất lượng giảng dạy
- Đánh giá dựa trên nội dung thực tế, không phải mong đợi
- Đưa ra gợi ý cụ thể và có thể thực hiện được
- Giữ tính nhất quán trong đánh giá`;
  }

  /**
   * Build prompt for multiple payloads (batch)
   */
  buildBatchPrompt(payloads: ActivityPayload[]): string {
    return payloads.map((p, idx) => {
      return `\n### Hoạt động ${idx + 1}: ${p.activityCode}\n${this.buildPrompt(p)}`;
    }).join("\n\n---\n");
  }

  /**
   * Update options
   */
  setOptions(options: Partial<PromptOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): PromptOptions {
    return { ...this.options };
  }
}

export const promptBuilder = new PromptBuilder();
