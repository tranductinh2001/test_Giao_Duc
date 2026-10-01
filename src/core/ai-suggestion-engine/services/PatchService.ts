/**
 * Patch Service
 *
 * Phase 8: Handle patch operations (apply, reject, regenerate)
 */

import { Patch, PatchOperation, ParagraphRef, SuggestionStatus } from "../types";
import { ConflictEngine } from "../engine/ConflictEngine";

export interface ApplyPatchInput {
  patch: Patch;
  currentParagraphs: ParagraphRef[];
  userEditedParagraphIds: Set<string>;
}

export interface ApplyPatchResult {
  success: boolean;
  error?: string;
  conflictDetected?: boolean;
}

export interface RevertPatchInput {
  patchId: string;
}

export class PatchService {
  private conflictEngine: ConflictEngine;

  constructor() {
    this.conflictEngine = new ConflictEngine();
  }

  /**
   * Apply a patch to the document
   */
  async applyPatch(input: ApplyPatchInput): Promise<ApplyPatchResult> {
    const { patch, currentParagraphs, userEditedParagraphIds } = input;

    // Check for conflicts first
    const conflictResult = this.conflictEngine.detectConflict({
      patch,
      currentParagraphs,
      userEditedParagraphIds,
    });

    if (conflictResult.hasConflict) {
      return {
        success: false,
        error: conflictResult.conflict?.description || "Conflict detected",
        conflictDetected: true,
      };
    }

    // Validate patch
    const validation = this.conflictEngine.validatePatch(patch, currentParagraphs);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Apply the operation
    try {
      const result = this.applyOperation(patch, currentParagraphs);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Apply the specific operation
   */
  private applyOperation(
    patch: Patch,
    paragraphs: ParagraphRef[]
  ): ParagraphRef[] {
    const result = [...paragraphs];
    const targetIndex = result.findIndex((p) => p.paragraphId === patch.paragraphId);

    switch (patch.operation) {
      case PatchOperation.REPLACE:
        if (targetIndex >= 0) {
          result[targetIndex] = {
            ...result[targetIndex],
            text: patch.newText,
          };
        }
        break;

      case PatchOperation.INSERT_BEFORE:
        if (targetIndex >= 0) {
          result.splice(targetIndex, 0, {
            paragraphId: this.generateParagraphId(),
            activityId: patch.activityId,
            sectionId: patch.sectionId,
            index: targetIndex,
            text: patch.newText,
          });
          // Update indices
          for (let i = targetIndex + 1; i < result.length; i++) {
            result[i].index = i;
          }
        }
        break;

      case PatchOperation.INSERT_AFTER:
        if (targetIndex >= 0) {
          result.splice(targetIndex + 1, 0, {
            paragraphId: this.generateParagraphId(),
            activityId: patch.activityId,
            sectionId: patch.sectionId,
            index: targetIndex + 1,
            text: patch.newText,
          });
          // Update indices
          for (let i = targetIndex + 2; i < result.length; i++) {
            result[i].index = i;
          }
        }
        break;

      case PatchOperation.DELETE:
        if (targetIndex >= 0) {
          result.splice(targetIndex, 1);
          // Update indices
          for (let i = targetIndex; i < result.length; i++) {
            result[i].index = i;
          }
        }
        break;

      case PatchOperation.SPLIT_PARAGRAPH:
        if (targetIndex >= 0) {
          const text = result[targetIndex].text;
          const sentences = text.split(/(?<=[.!?])\s+/);

          if (sentences.length > 1) {
            result.splice(targetIndex, 1);
            let currentIndex = targetIndex;
            for (const sentence of sentences) {
              result.splice(currentIndex, 0, {
                paragraphId: this.generateParagraphId(),
                activityId: patch.activityId,
                sectionId: patch.sectionId,
                index: currentIndex,
                text: sentence.trim(),
              });
              currentIndex++;
            }
          }
        }
        break;

      case PatchOperation.MERGE_PARAGRAPH:
        if (targetIndex >= 0 && targetIndex < result.length - 1) {
          const mergedText =
            result[targetIndex].text + " " + result[targetIndex + 1].text;
          result[targetIndex].text = mergedText;
          result.splice(targetIndex + 1, 1);
          // Update indices
          for (let i = targetIndex + 1; i < result.length; i++) {
            result[i].index = i;
          }
        }
        break;
    }

    return result;
  }

  /**
   * Reject a patch
   */
  async rejectPatch(patchId: string): Promise<{ success: boolean }> {
    // In a real implementation, this would update the database
    return { success: true };
  }

  /**
   * Generate a unique paragraph ID
   */
  private generateParagraphId(): string {
    return `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
