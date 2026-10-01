package com.education.lessonplanreview.dto.response;

import com.education.lessonplanreview.domain.LessonPlan;
import lombok.*;

import java.time.LocalDateTime;

/**
 * ResponseDTO for lesson plan details
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonPlanResponse {

    private String id;
    private String userId;
    private String title;
    private String subject;
    private String gradeLevel;
    private String schoolYear;
    private String originalFilename;
    private Long fileSize;
    private String mimeType;
    private LessonPlan.LessonPlanStatus status;
    private Integer currentVersion;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Review summary if available
    private ReviewSummary reviewSummary;

    @Getter
    @Setter
    @Builder
    public static class ReviewSummary {
        private String reviewResultId;
        private String ruleSetCode;
        private String ruleSetName;
        private Double overallScore;
        private Integer totalIssues;
        private Integer criticalIssues;
        private Integer errorIssues;
        private Integer warningIssues;
        private String reviewStatus;
        private LocalDateTime reviewedAt;
    }
}
