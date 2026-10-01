package com.education.lessonplanreview.dto.response;

import com.education.lessonplanreview.domain.ReviewResult;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for review results with detailed analysis
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResultResponse {

    private String id;
    private String lessonPlanId;
    private String ruleSetId;
    private String ruleSetName;
    private String ruleSetCode;
    private BigDecimal overallScore;

    private IssueSummary issueSummary;

    private List<String> strengths;
    private List<String> weaknesses;
    private List<String> missingContent;
    private List<String> suggestions;

    private ReviewResult.ReviewStatus status;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<SectionReview> sectionReviews;

    @Getter
    @Setter
    @Builder
    public static class IssueSummary {
        private Integer total;
        private Integer critical;
        private Integer error;
        private Integer warning;
        private Integer info;
    }

    @Getter
    @Setter
    @Builder
    public static class SectionReview {
        private String sectionId;
        private String sectionTitle;
        private String sectionType;
        private Integer annotationCount;
        private Integer criticalCount;
        private Integer errorCount;
        private Integer warningCount;
    }
}
