package com.education.lessonplanreview.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity representing overall review results for a lesson plan
 */
@Entity
@Table(name = "review_results", indexes = {
    @Index(name = "idx_lesson_plan_id", columnList = "lesson_plan_id"),
    @Index(name = "idx_rule_set_id", columnList = "rule_set_id"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_overall_score", columnList = "overall_score")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResult {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "lesson_plan_id", nullable = false, length = 36)
    private String lessonPlanId;

    @Column(name = "rule_set_id", nullable = false, length = 36)
    private String ruleSetId;

    @Column(name = "overall_score", precision = 5, scale = 2)
    private BigDecimal overallScore;

    @Column(name = "total_issues", nullable = false)
    private Integer totalIssues = 0;

    @Column(name = "critical_issues", nullable = false)
    private Integer criticalIssues = 0;

    @Column(name = "error_issues", nullable = false)
    private Integer errorIssues = 0;

    @Column(name = "warning_issues", nullable = false)
    private Integer warningIssues = 0;

    @Column(name = "info_issues", nullable = false)
    private Integer infoIssues = 0;

    @Column(columnDefinition = "JSON")
    private String strengths;

    @Column(columnDefinition = "JSON")
    private String weaknesses;

    @Column(name = "missing_content", columnDefinition = "JSON")
    private String missingContent;

    @Column(columnDefinition = "JSON")
    private String suggestions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReviewStatus status = ReviewStatus.DRAFT;

    @Column(name = "reviewed_by", length = 36)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = java.util.UUID.randomUUID().toString();
        }
    }

    public enum ReviewStatus {
        DRAFT,
        COMPLETED,
        ACCEPTED,
        REJECTED
    }
}
