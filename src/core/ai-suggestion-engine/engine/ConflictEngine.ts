/**
 * Conflict Engine
 *
 * Phase 8: Detect and handle conflicts when user edits affect pending patches
 */

import {
  Conflict,
  ConflictType,
  Patch,
  ParagraphRef,
} from "../types";

export interface ConflictDetectionInput {
  patch: Patch;
  currentParagraphs: ParagraphRef[];
  userEditedParagraphIds: Set<string>;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflict?: Conflict;
}

export class ConflictEngine {
  /**
   * Detect if a patch conflicts with user's edits
   */
  detectConflict(input: ConflictDetectionInput): ConflictDetectionResult {
    const { patch, currentParagraphs, userEditedParagraphIds } = input;

    // Check if the paragraph was edited by user
    if (!userEditedParagraphIds.has(patch.paragraphId)) {
      return { hasConflict: false };
    }

    // Find the current paragraph
    const currentParagraph = currentParagraphs.find(
      (p) => p.paragraphId === patch.paragraphId
    );

    if (!currentParagraph) {
      // Paragraph was deleted
      const conflict = this.createConflict(
        patch,
        ConflictType.PARAGRAPH_DELETED,
        "Paragraph was deleted by user",
        patch.oldText,
        ""
      );
      return { hasConflict: true, conflict };
    }

    // Check if text has changed significantly
    if (this.hasSignificantChange(patch.oldText, currentParagraph.text)) {
      const conflict = this.createConflict(
        patch,
        ConflictType.CONTENT_CHANGED,
        "Paragraph content was modified by user",
        patch.oldText,
        currentParagraph.text
      );
      return { hasConflict: true, conflict };
    }

    return { hasConflict: false };
  }

  /**
   * Check if text change is significant enough to cause conflict
   */
  private hasSignificantChange(oldText: string, newText: string): boolean {
    if (!oldText || !newText) return true;

    // Calculate similarity
    const similarity = this.calculateSimilarity(oldText, newText);

    // If similarity is less than 80%, consider it a significant change
    return similarity < 0.8;
  }

  /**
   * Calculate text similarity using simple algorithm
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const normalized1 = text1.toLowerCase().trim();
    const normalized2 = text2.toLowerCase().trim();

    if (normalized1 === normalized2) return 1;
    if (!normalized1 || !normalized2) return 0;

    // Calculate Levenshtein-like similarity
    const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
    const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;

    if (longer.length === 0) return 1;

    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein edit distance
   */
  private calculateEditDistance(str1: string, str2: string): number {
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

  /**
   * Create a conflict object
   */
  private createConflict(
    patch: Patch,
    type: ConflictType,
    description: string,
    expectedText: string,
    currentText: string
  ): Conflict {
    return {
      conflictId: `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patchId: patch.patchId,
      sessionId: patch.sessionId,
      type,
      description,
      expectedParagraphId: patch.paragraphId,
      expectedText,
      currentParagraphId: patch.paragraphId,
      currentText,
      resolved: false,
      createdAt: new Date(),
    };
  }

  /**
   * Validate patch before application
   */
  validatePatch(
    patch: Patch,
    currentParagraphs: ParagraphRef[]
  ): { valid: boolean; error?: string } {
    // Check if paragraph exists
    const paragraph = currentParagraphs.find(
      (p) => p.paragraphId === patch.paragraphId
    );

    if (!paragraph) {
      return { valid: false, error: "Paragraph not found" };
    }

    // For replace operations, verify oldText matches
    if (patch.operation === "replace" && paragraph.text !== patch.oldText) {
      // Check if it's close enough (might be whitespace difference)
      if (!this.hasSignificantChange(patch.oldText, paragraph.text)) {
        return { valid: true };
      }
      return {
        valid: false,
        error: "Old text does not match current paragraph content",
      };
    }

    return { valid: true };
  }
}
