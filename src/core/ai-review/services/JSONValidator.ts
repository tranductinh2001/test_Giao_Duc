/**
 * JSON Validator Service
 *
 * Phase 4: Validates Gemini responses against expected schema
 */

import { ValidationResult, ReviewResponseSchema, ActivityReviewResult, ReviewIssue, IssueSeverity, ReviewScoreLevel } from "../types";

export interface ValidatorConfig {
  strictMode: boolean;
  allowExtraFields: boolean;
  validateScoreRange: boolean;
  minScore: number;
  maxScore: number;
}

const DEFAULT_VALIDATOR_CONFIG: ValidatorConfig = {
  strictMode: true,
  allowExtraFields: true,
  validateScoreRange: true,
  minScore: 0,
  maxScore: 100,
};

export class JSONValidator {
  private config: ValidatorConfig;

  constructor(config: Partial<ValidatorConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATOR_CONFIG, ...config };
  }

  /**
   * Validate and parse Gemini response
   */
  validate(responseText: string, activityId: string): {
    valid: boolean;
    result?: ActivityReviewResult;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Try to parse JSON
    let parsed: unknown;
    try {
      // Remove markdown code blocks if present
      const cleanText = this.removeMarkdownCodeBlocks(responseText);
      parsed = JSON.parse(cleanText);
    } catch (e) {
      return {
        valid: false,
        errors: [`Invalid JSON: ${e instanceof Error ? e.message : "Unknown error"}`],
        warnings: [],
      };
    }

    // Validate structure
    const structureResult = this.validateStructure(parsed, activityId);
    errors.push(...structureResult.errors);
    warnings.push(...structureResult.warnings);

    if (!structureResult.valid) {
      return { valid: false, errors, warnings };
    }

    // Validate content
    const contentResult = this.validateContent(parsed as ReviewResponseSchema);
    errors.push(...contentResult.errors);
    warnings.push(...contentResult.warnings);

    if (errors.length > 0 && this.config.strictMode) {
      return { valid: false, errors, warnings };
    }

    // Transform to ActivityReviewResult
    const result = this.transformToResult(parsed as ReviewResponseSchema);

    return {
      valid: errors.length === 0,
      result,
      errors,
      warnings,
    };
  }

  /**
   * Remove markdown code blocks
   */
  private removeMarkdownCodeBlocks(text: string): string {
    // Remove ```json and ``` markers
    let cleaned = text.replace(/^```json\s*/g, "");
    cleaned = cleaned.replace(/^```\s*/g, "");
    cleaned = cleaned.replace(/\s*```$/g, "");
    return cleaned.trim();
  }

  /**
   * Validate response structure
   */
  private validateStructure(
    parsed: unknown,
    activityId: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof parsed !== "object" || parsed === null) {
      errors.push("Response must be an object");
      return { valid: false, errors, warnings };
    }

    const obj = parsed as Record<string, unknown>;

    // Required fields
    if (!obj.activityId) {
      errors.push("Missing required field: activityId");
    } else if (typeof obj.activityId !== "string") {
      errors.push("activityId must be a string");
    }

    if (!obj.hasOwnProperty("score")) {
      errors.push("Missing required field: score");
    } else if (typeof obj.score !== "number") {
      errors.push("score must be a number");
    }

    if (!obj.hasOwnProperty("passed")) {
      errors.push("Missing required field: passed");
    } else if (typeof obj.passed !== "boolean") {
      errors.push("passed must be a boolean");
    }

    if (!obj.issues) {
      warnings.push("Missing optional field: issues");
    } else if (!Array.isArray(obj.issues)) {
      errors.push("issues must be an array");
    }

    // Extra fields warning
    if (!this.config.allowExtraFields) {
      const allowedFields = ["activityId", "score", "passed", "comments", "issues"];
      const extraFields = Object.keys(obj).filter((f) => !allowedFields.includes(f));
      if (extraFields.length > 0) {
        warnings.push(`Extra fields detected: ${extraFields.join(", ")}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate content values
   */
  private validateContent(response: ReviewResponseSchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate score range
    if (this.config.validateScoreRange) {
      if (response.score < this.config.minScore) {
        errors.push(`Score ${response.score} is below minimum ${this.config.minScore}`);
      }
      if (response.score > this.config.maxScore) {
        errors.push(`Score ${response.score} is above maximum ${this.config.maxScore}`);
      }
    }

    // Validate passed matches score
    if (response.passed && response.score < 60) {
      warnings.push("passed is true but score is below 60");
    }
    if (!response.passed && response.score >= 60) {
      warnings.push("passed is false but score is 60 or above");
    }

    // Validate issues
    if (Array.isArray(response.issues)) {
      for (let i = 0; i < response.issues.length; i++) {
        const issue = response.issues[i];
        const issueErrors = this.validateIssue(issue, i);
        errors.push(...issueErrors.errors);
        warnings.push(...issueErrors.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate single issue
   */
  private validateIssue(
    issue: ReviewResponseSchema["issues"][0],
    index: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const prefix = `Issue[${index}]`;

    if (!issue.ruleId || typeof issue.ruleId !== "string") {
      errors.push(`${prefix}: missing or invalid ruleId`);
    }

    if (!issue.title || typeof issue.title !== "string") {
      errors.push(`${prefix}: missing or invalid title`);
    }

    if (!issue.description || typeof issue.description !== "string") {
      errors.push(`${prefix}: missing or invalid description`);
    }

    if (!issue.reason || typeof issue.reason !== "string") {
      errors.push(`${prefix}: missing or invalid reason`);
    }

    if (!issue.severity) {
      errors.push(`${prefix}: missing severity`);
    } else if (!["ERROR", "WARNING", "INFO"].includes(issue.severity)) {
      errors.push(`${prefix}: invalid severity "${issue.severity}"`);
    }

    // Optional fields warnings
    if (!issue.suggestions || !Array.isArray(issue.suggestions)) {
      warnings.push(`${prefix}: missing suggestions array`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Transform to ActivityReviewResult
   */
  private transformToResult(response: ReviewResponseSchema): ActivityReviewResult {
    const issues: ReviewIssue[] = (response.issues || []).map((issue) => ({
      ruleId: issue.ruleId,
      title: issue.title,
      description: issue.description,
      reason: issue.reason,
      severity: issue.severity as IssueSeverity,
      paragraphIndex: issue.paragraphIndex,
      activityId: response.activityId,
      confidence: 100, // Default to high confidence for AI-generated
      suggestions: issue.suggestions,
    }));

    return {
      activityId: response.activityId,
      activityCode: response.activityId, // Fallback
      activityTitle: response.activityId, // Fallback
      score: response.score,
      scoreLevel: this.calculateScoreLevel(response.score),
      passed: response.passed,
      issues,
      reviewTime: 0, // Will be set by engine
      tokensUsed: 0, // Will be set by engine
    };
  }

  /**
   * Calculate score level
   */
  private calculateScoreLevel(score: number): ReviewScoreLevel {
    if (score >= 90) return ReviewScoreLevel.EXCELLENT;
    if (score >= 80) return ReviewScoreLevel.GOOD;
    if (score >= 60) return ReviewScoreLevel.NEEDS_IMPROVEMENT;
    return ReviewScoreLevel.FAIL;
  }

  /**
   * Validate raw JSON string
   */
  validateRaw(jsonString: string): ValidationResult {
    try {
      const parsed = JSON.parse(jsonString);
      return this.validateStructure(parsed, "unknown").valid
        ? { valid: true, errors: [], warnings: [] }
        : { valid: false, errors: ["Invalid structure"], warnings: [] };
    } catch (e) {
      return {
        valid: false,
        errors: [`JSON parse error: ${e instanceof Error ? e.message : "Unknown"}`],
        warnings: [],
      };
    }
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<ValidatorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const jsonValidator = new JSONValidator();
