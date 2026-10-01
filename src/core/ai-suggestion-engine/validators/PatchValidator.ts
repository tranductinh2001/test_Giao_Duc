/**
 * Patch Validator
 *
 * Phase 8: Validate patches before application
 */

import { Patch, ParagraphRef, PatchValidationResult, PatchOperation } from "../types";

export class PatchValidator {
  /**
   * Validate a patch
   */
  validate(patch: Patch, currentParagraphs: ParagraphRef[]): PatchValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check paragraph exists
    const targetParagraph = currentParagraphs.find(
      (p) => p.paragraphId === patch.paragraphId
    );

    if (!targetParagraph) {
      errors.push(`Paragraph ${patch.paragraphId} not found`);
      return {
        valid: false,
        isValid: false,
        canApply: false,
        errors,
        warnings,
        patch,
      };
    }

    // Validate based on operation type
    switch (patch.operation) {
      case PatchOperation.REPLACE:
        this.validateReplace(patch, targetParagraph, errors, warnings);
        break;
      case PatchOperation.INSERT_BEFORE:
      case PatchOperation.INSERT_AFTER:
        this.validateInsert(patch, errors, warnings);
        break;
      case PatchOperation.DELETE:
        this.validateDelete(patch, targetParagraph, errors, warnings);
        break;
      case PatchOperation.SPLIT_PARAGRAPH:
        this.validateSplit(patch, targetParagraph, errors, warnings);
        break;
      case PatchOperation.MERGE_PARAGRAPH:
        this.validateMerge(patch, currentParagraphs, errors, warnings);
        break;
    }

    // Check confidence threshold
    if (patch.confidence < 0.5) {
      warnings.push("Low confidence patch - may need manual review");
    }

    // Check oldText exists in paragraph
    if (patch.oldText && targetParagraph.text !== patch.oldText) {
      const similarity = this.calculateSimilarity(patch.oldText, targetParagraph.text);
      if (similarity < 0.8) {
        errors.push("Old text does not match current paragraph content");
      } else {
        warnings.push("Minor text difference detected - may need review");
      }
    }

    return {
      valid: errors.length === 0,
      isValid: errors.length === 0,
      canApply: errors.length === 0 && warnings.length === 0,
      errors,
      warnings,
      patch,
    };
  }

  /**
   * Validate replace operation
   */
  private validateReplace(
    patch: Patch,
    paragraph: ParagraphRef,
    errors: string[],
    warnings: string[]
  ): void {
    if (!patch.newText || patch.newText.trim().length === 0) {
      errors.push("New text cannot be empty for replace operation");
    }

    if (patch.newText === patch.oldText) {
      warnings.push("New text is identical to old text - no change will be made");
    }
  }

  /**
   * Validate insert operations
   */
  private validateInsert(
    patch: Patch,
    errors: string[],
    warnings: string[]
  ): void {
    if (!patch.newText || patch.newText.trim().length === 0) {
      errors.push("Inserted text cannot be empty");
    }
  }

  /**
   * Validate delete operation
   */
  private validateDelete(
    patch: Patch,
    paragraph: ParagraphRef,
    errors: string[],
    warnings: string[]
  ): void {
    if (paragraph.text.length < 10) {
      warnings.push("Deleting very short paragraph");
    }
  }

  /**
   * Validate split operation
   */
  private validateSplit(
    patch: Patch,
    paragraph: ParagraphRef,
    errors: string[],
    warnings: string[]
  ): void {
    // Check if paragraph has sentences to split
    const sentences = paragraph.text.split(/[.!?]+/).filter((s) => s.trim());
    if (sentences.length < 2) {
      warnings.push("Paragraph may not have enough content to split");
    }
  }

  /**
   * Validate merge operation
   */
  private validateMerge(
    patch: Patch,
    paragraphs: ParagraphRef[],
    errors: string[],
    warnings: string[]
  ): void {
    const targetIndex = paragraphs.findIndex(
      (p) => p.paragraphId === patch.paragraphId
    );

    if (targetIndex < 0 || targetIndex >= paragraphs.length - 1) {
      errors.push("No paragraph available to merge with");
    }
  }

  /**
   * Calculate text similarity
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const normalized1 = text1.toLowerCase().trim();
    const normalized2 = text2.toLowerCase().trim();

    if (normalized1 === normalized2) return 1;
    if (!normalized1 || !normalized2) return 0;

    const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
    const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
