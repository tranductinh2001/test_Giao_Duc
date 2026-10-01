/**
 * Activity Detector Module (Clean Architecture)
 *
 * Builds ActivityIR from ParagraphIR + HeadingIR
 *
 * Algorithm:
 * 1. Heading opens Activity
 * 2. Gather ALL paragraphs until next Heading
 * 3. Create ActivityIR with heading + all paragraphs
 *
 * Does NOT depend on OCR vendor - only works with IR types.
 */

import {
  ParagraphIR,
  HeadingIR,
  ActivityIR,
  LayoutIR,
} from './types';

/**
 * Activity Detection Options
 */
export interface ActivityDetectorOptions {
  enableSubActivityDetection: boolean;
  minParagraphsForActivity: number;
  includeEmptyActivities: boolean;
}

/**
 * Activity Detection Result
 */
export interface ActivityDetectionResult {
  activities: ActivityIR[];
  sections: {
    id: string;
    title: string;
    activityIds: string[];
  }[];
  unmappedParagraphs: string[];
}

/**
 * Activity Detector
 *
 * Receives ParagraphIR + HeadingIR, outputs ActivityIR
 */
export class ActivityDetector {
  private options: ActivityDetectorOptions;

  constructor(options: Partial<ActivityDetectorOptions> = {}) {
    this.options = {
      enableSubActivityDetection: true,
      minParagraphsForActivity: 1,
      includeEmptyActivities: true,
      ...options,
    };
  }

  /**
   * Detect activities from paragraphs and headings
   *
   * @param paragraphs - All paragraphs in document order
   * @param headings - All headings detected
   * @param layout - Optional layout info for section mapping
   */
  detect(
    paragraphs: ParagraphIR[],
    headings: HeadingIR[],
    layout?: LayoutIR
  ): ActivityDetectionResult {
    console.log('\n[ActivityDetector] Starting detection...');
    console.log(`  Paragraphs: ${paragraphs.length}`);
    console.log(`  Headings: ${headings.length}`);

    const activities: ActivityIR[] = [];
    const sections: ActivityDetectionResult['sections'] = [];
    const unmappedParagraphs: string[] = [];

    // Sort paragraphs by reading order
    const sortedParagraphs = [...paragraphs].sort((a, b) => a.readingOrder - b.readingOrder);

    // Sort headings by reading order
    const sortedHeadings = [...headings].sort((a, b) => a.readingOrder - b.readingOrder);

    // Create heading map for quick lookup
    const headingMap = new Map<number, HeadingIR>();
    for (const heading of sortedHeadings) {
      headingMap.set(heading.readingOrder, heading);
    }

    // Build sections from layout if available
    if (layout?.sections) {
      for (const section of layout.sections) {
        sections.push({
          id: section.id,
          title: section.title,
          activityIds: [],
        });
      }
    }

    // === ALGORITHM: Heading opens Activity, gather all paragraphs until next Heading ===
    // Special handling: If two headings are consecutive, MERGE them into single activity
    let currentActivity: ActivityIR | null = null;
    let activityIndex = 0;
    let currentHeading: HeadingIR | null = null;
    let lastParaWasHeading = false;

    for (let i = 0; i < sortedParagraphs.length; i++) {
      const para = sortedParagraphs[i];

      // Check if this paragraph is a heading
      const isHeading = para.type === 'heading' || para.headingLevel !== undefined;
      const heading = headingMap.get(para.readingOrder);

      if (isHeading || heading) {
        // === NEW HEADING DETECTED ===
        console.log(`\n  [ActivityDetector] Heading detected: ${para.content?.substring(0, 30)}...`);

        if (lastParaWasHeading) {
          // CONSECUTIVE HEADINGS - MERGE into current activity
          console.log(`    → Consecutive heading - MERGING into current activity`);

          // Add this heading to current activity (don't create new one)
          if (currentActivity) {
            currentActivity.paragraphIds.push(para.id);
            // Update title to the latest heading
            currentActivity.title = para.content || currentActivity.title;
            currentActivity.endParagraphId = para.id;
          }
          lastParaWasHeading = true;
          continue;
        }

        // Save previous activity if exists
        if (currentActivity) {
          // Set end paragraph
          const prevPara = sortedParagraphs[i - 1];
          currentActivity.endParagraphId = prevPara.id;

          // Only add if has paragraphs or empty activities enabled
          if (currentActivity.paragraphIds.length >= this.options.minParagraphsForActivity || this.options.includeEmptyActivities) {
            activities.push(currentActivity);
            console.log(`    → Saved activity "${currentActivity.title}" with ${currentActivity.paragraphIds.length} paragraphs`);
          }
        }

        // Start new activity
        currentHeading = heading || {
          id: `heading_${activityIndex}`,
          text: para.content,
          level: para.headingLevel || 1,
          pageId: para.pageId,
          blockId: para.blockId,
          readingOrder: para.readingOrder,
          isActivityHeading: this.isActivityHeading(para.content),
        };

        currentActivity = {
          id: `activity_${activityIndex}`,
          title: currentHeading.text,
          type: this.detectActivityType(currentHeading.text),
          order: activityIndex,
          paragraphIds: [],
          startParagraphId: para.id,
          endParagraphId: '', // Will be set when next heading found
          confidence: currentHeading.isActivityHeading ? 0.9 : 0.7,
          detectionMethod: currentHeading.isActivityHeading ? 'heading' : 'fallback',
          matchedPattern: currentHeading.activityPattern,
        };

        // Add heading to activity
        currentActivity.paragraphIds.push(para.id);

        activityIndex++;
        lastParaWasHeading = true;

        console.log(`    → Started new activity: ${currentActivity.title}`);
      } else {
        // === REGULAR PARAGRAPH ===
        lastParaWasHeading = false;

        if (currentActivity) {
          // Add to current activity
          currentActivity.paragraphIds.push(para.id);
        } else {
          // No activity yet - this paragraph is unmapped
          unmappedParagraphs.push(para.id);
          console.log(`    ⚠️ Unmapped paragraph: ${para.content?.substring(0, 30)}...`);
        }
      }
    }

    // Don't forget last activity
    if (currentActivity) {
      const lastPara = sortedParagraphs[sortedParagraphs.length - 1];
      currentActivity.endParagraphId = lastPara.id;

      if (currentActivity.paragraphIds.length >= this.options.minParagraphsForActivity || this.options.includeEmptyActivities) {
        activities.push(currentActivity);
        console.log(`\n  [ActivityDetector] Saved final activity: "${currentActivity.title}" with ${currentActivity.paragraphIds.length} paragraphs`);
      }
    }

    // Build section → activity mapping
    for (const activity of activities) {
      // Find which section this activity belongs to
      const firstPara = paragraphs.find(p => p.id === activity.startParagraphId);
      if (firstPara?.sectionId) {
        const section = sections.find(s => s.id === firstPara.sectionId);
        if (section) {
          section.activityIds.push(activity.id);
        }
      }
    }

    // === VALIDATION ===
    console.log('\n[ActivityDetector] Validation:');
    console.log(`  Total activities: ${activities.length}`);
    console.log(`  Activities with 1 paragraph: ${activities.filter(a => a.paragraphIds.length === 1).length}`);
    console.log(`  Activities with 2+ paragraphs: ${activities.filter(a => a.paragraphIds.length >= 2).length}`);
    console.log(`  Unmapped paragraphs: ${unmappedParagraphs.length}`);

    // Check for critical issues
    const singleParaActivities = activities.filter(a => a.paragraphIds.length === 1);
    if (singleParaActivities.length > 0) {
      console.log('\n  ⚠️  WARNING: Activities with only 1 paragraph:');
      for (const a of singleParaActivities.slice(0, 5)) {
        console.log(`    - ${a.title}: ${a.paragraphIds.length} paragraph`);
      }
    }

    return {
      activities,
      sections,
      unmappedParagraphs,
    };
  }

  /**
   * Check if heading is an activity heading
   */
  private isActivityHeading(text: string): boolean {
    const trimmed = text.trim();

    // Pattern 1: "Hoạt động 1:", "Hoạt động 1", "HĐ 1", etc.
    if (/^(hoạt động|hoat dong|hd|hđ)\s*(\d+)[\s:.]/i.test(trimmed)) {
      return true;
    }

    // Pattern 2: "Hoạt động của giáo viên", "Hoạt động của học sinh"
    if (/^(hoạt động\s+(của\s+)?(giáo viên|học sinh))/i.test(trimmed)) {
      return true;
    }

    // Pattern 3: Numbered sub-sections: 1.1, 1.2, 2.1, etc.
    if (/^(\d+\.\d+)[\s.]/.test(trimmed) && trimmed.length < 60) {
      return true;
    }

    return false;
  }

  /**
   * Detect activity type from title
   */
  private detectActivityType(title: string): ActivityIR['type'] {
    const lower = title.toLowerCase();

    if (lower.includes('khởi động') || lower.includes('warm up')) return 'WARM_UP';
    if (lower.includes('giới thiệu') || lower.includes('presentation')) return 'PRESENTATION';
    if (lower.includes('khám phá') || lower.includes('exploration')) return 'EXPLORATION';
    if (lower.includes('luyện tập') || lower.includes('guided')) return 'GUIDED_PRACTICE';
    if (lower.includes('thực hành') || lower.includes('independent')) return 'INDEPENDENT_PRACTICE';
    if (lower.includes('ứng dụng') || lower.includes('application')) return 'APPLICATION';
    if (lower.includes('củng cố') || lower.includes('consolidation')) return 'CONSOLIDATION';
    if (lower.includes('mở rộng') || lower.includes('extension')) return 'EXTENSION';
    if (lower.includes('đánh giá') || lower.includes('evaluation')) return 'EVALUATION';
    if (lower.includes('về nhà') || lower.includes('homework')) return 'HOMEWORK';

    return 'CUSTOM';
  }

  /**
   * Validate activity detection result
   */
  validate(result: ActivityDetectionResult, totalParagraphs: number = 0): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for activities with single paragraph
    const singleParaActivities = result.activities.filter(a => a.paragraphIds.length === 1);
    if (result.activities.length > 0 && singleParaActivities.length > result.activities.length * 0.5) {
      errors.push(`Too many activities with single paragraph: ${singleParaActivities.length}/${result.activities.length}`);
    }

    // Check for unmapped paragraphs
    if (totalParagraphs > 0 && result.unmappedParagraphs.length > totalParagraphs * 0.1) {
      warnings.push(`High number of unmapped paragraphs: ${result.unmappedParagraphs.length}`);
    }

    // Check for empty activities
    const emptyActivities = result.activities.filter(a => a.paragraphIds.length === 0);
    if (emptyActivities.length > 0) {
      warnings.push(`Empty activities: ${emptyActivities.length}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Create ActivityDetector instance
 */
export function createActivityDetector(options?: Partial<ActivityDetectorOptions>): ActivityDetector {
  return new ActivityDetector(options);
}
