/**
 * Activity Detector Module
 *
 * Phase 1: Detect activities within a section
 */

import type { DetectedActivity, ParsedParagraph } from "../types";

export interface ActivityDetectionOptions {
  enableSubActivityDetection: boolean;
  minParagraphsForActivity: number;
}

/**
 * Detect activities within a section's content
 */
export class ActivityDetector {
  private options: ActivityDetectionOptions;

  constructor(options: Partial<ActivityDetectionOptions> = {}) {
    this.options = {
      enableSubActivityDetection: true,
      minParagraphsForActivity: 1,
      ...options,
    };
  }

  /**
   * Detect activities from paragraphs within a section
   */
  detect(
    paragraphs: ParsedParagraph[],
    sectionTitle: string,
    sectionConfidence: number
  ): DetectedActivity[] {
    const activities: DetectedActivity[] = [];

    if (paragraphs.length === 0) {
      // No paragraphs - return single default activity
      return [
        {
          activityIndex: 0,
          title: sectionTitle,
          paragraphs: [],
          confidence: sectionConfidence,
          detectionMethod: "fallback",
        },
      ];
    }

    // Try to split by activity headings
    let currentActivity: DetectedActivity | null = null;
    let activityIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      const isActivityHeading = this.isActivityHeading(para.text);

      if (isActivityHeading) {
        // Save previous activity
        if (currentActivity && currentActivity.paragraphs.length >= this.options.minParagraphsForActivity) {
          activities.push(currentActivity);
        }

        // Start new activity
        currentActivity = {
          activityIndex: activityIndex++,
          title: para.text,
          paragraphs: [],
          confidence: isActivityHeading.confidence,
          detectionMethod: isActivityHeading.method,
          matchedPattern: isActivityHeading.pattern,
        };
      } else if (currentActivity) {
        // Add to current activity
        currentActivity.paragraphs.push(para);
      } else {
        // No activity yet - create first one
        currentActivity = {
          activityIndex: activityIndex++,
          title: sectionTitle,
          paragraphs: [para],
          confidence: sectionConfidence,
          detectionMethod: "fallback",
        };
      }
    }

    // Don't forget last activity
    if (currentActivity) {
      if (currentActivity.paragraphs.length >= this.options.minParagraphsForActivity) {
        activities.push(currentActivity);
      } else if (activities.length === 0) {
        // If no valid activities, use the content as single activity
        activities.push(currentActivity);
      }
    }

    // If no activities detected (all paragraphs went to one), ensure at least one
    if (activities.length === 0) {
      activities.push({
        activityIndex: 0,
        title: sectionTitle,
        paragraphs,
        confidence: sectionConfidence,
        detectionMethod: "fallback",
      });
    }

    return activities;
  }

  /**
   * Check if paragraph is an activity heading
   */
  private isActivityHeading(
    text: string
  ): {
    isHeading: boolean;
    confidence: number;
    method: "heading" | "keyword" | "numbering";
    pattern?: string;
  } | null {
    const trimmed = text.trim();

    // Pattern 1: "Hoạt động 1:", "Hoạt động 1", "HĐ 1", etc.
    const hoatDongMatch = trimmed.match(
      /^(hoạt động|hoat dong|hd|hđ)\s*(\d+)[\s:.]/i
    );

    if (hoatDongMatch) {
      return {
        isHeading: true,
        confidence: 0.95,
        method: "heading",
        pattern: hoatDongMatch[0],
      };
    }

    // Pattern 2: "Hoạt động của giáo viên", "Hoạt động của học sinh"
    const hoatDongTypeMatch = trimmed.match(
      /^(hoạt động\s+(của\s+)?(giáo viên|học sinh))/i
    );

    if (hoatDongTypeMatch) {
      return {
        isHeading: true,
        confidence: 0.9,
        method: "keyword",
        pattern: hoatDongTypeMatch[0],
      };
    }

    // Pattern 3: Numbered sub-sections: 1.1, 1.2, 2.1, etc.
    const subNumberMatch = trimmed.match(/^(\d+\.\d+)[\s.]/);

    if (subNumberMatch && trimmed.length < 60) {
      return {
        isHeading: true,
        confidence: 0.85,
        method: "numbering",
        pattern: subNumberMatch[0],
      };
    }

    // Pattern 4: Time-based activities: "Thời gian: 5 phút"
    const timeMatch = trimmed.match(/^thời gian\s*:\s*\d+/i);

    if (timeMatch) {
      return {
        isHeading: true,
        confidence: 0.8,
        method: "keyword",
        pattern: timeMatch[0],
      };
    }

    // Pattern 5: Bold text that looks like a heading (if we had style info)
    // This would require style information from DOCX

    return null;
  }
}

/**
 * Detect sub-activities within an activity
 */
export class SubActivityDetector {
  /**
   * Detect sub-activities (like teacher activity, student activity)
   */
  detect(paragraphs: ParsedParagraph[]): Array<{
    type: "teacher" | "student" | "general";
    paragraphs: ParsedParagraph[];
  }> {
    const result: Array<{
      type: "teacher" | "student" | "general";
      paragraphs: ParsedParagraph[];
    }> = [];

    let currentType: "teacher" | "student" | "general" = "general";
    let currentParagraphs: ParsedParagraph[] = [];

    for (const para of paragraphs) {
      const typeMatch = this.detectType(para.text);

      if (typeMatch && typeMatch !== currentType) {
        // Save previous type
        if (currentParagraphs.length > 0) {
          result.push({
            type: currentType,
            paragraphs: currentParagraphs,
          });
        }

        // Start new type
        currentType = typeMatch;
        currentParagraphs = [para];
      } else {
        currentParagraphs.push(para);
      }
    }

    // Don't forget last
    if (currentParagraphs.length > 0) {
      result.push({
        type: currentType,
        paragraphs: currentParagraphs,
      });
    }

    // If no split happened, return all as general
    if (result.length === 0) {
      result.push({
        type: "general",
        paragraphs,
      });
    }

    return result;
  }

  /**
   * Detect if text indicates teacher or student activity
   */
  private detectType(text: string): "teacher" | "student" | null {
    const lower = text.toLowerCase().trim();

    // Teacher indicators
    const teacherPatterns = [
      /^(giáo viên|gv|gv:)\s*/i,
      /hoạt động\s+của\s+giáo viên/i,
      /giáo viên\s+(hướng dẫn|làm mẫu|giải thích|trình bày|yêu cầu)/i,
    ];

    for (const pattern of teacherPatterns) {
      if (pattern.test(lower)) {
        return "teacher";
      }
    }

    // Student indicators
    const studentPatterns = [
      /^(học sinh|hs|hs:)\s*/i,
      /hoạt động\s+của\s+học sinh/i,
      /học sinh\s+(quan sát|thảo luận|làm|thực hiện|trình bày|trả lời)/i,
    ];

    for (const pattern of studentPatterns) {
      if (pattern.test(lower)) {
        return "student";
      }
    }

    return null;
  }
}
