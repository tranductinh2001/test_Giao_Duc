package com.education.lessonplanreview.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entity representing individual review rules within a rule set
 */
@Entity
@Table(name = "review_rules",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_rule_code", columnNames = {"rule_set_id", "rule_code"})
    },
    indexes = {
        @Index(name = "idx_rule_set_id", columnList = "rule_set_id"),
        @Index(name = "idx_category", columnList = "category"),
        @Index(name = "idx_severity", columnList = "severity"),
        @Index(name = "idx_priority", columnList = "priority"),
        @Index(name = "idx_is_active", columnList = "is_active")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewRule {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "rule_set_id", nullable = false, length = 36)
    private String ruleSetId;

    @Column(name = "rule_code", nullable = false, length = 100)
    private String ruleCode;

    @Column(name = "rule_name", nullable = false)
    private String ruleName;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity = Severity.WARNING;

    @Column(nullable = false)
    private Integer priority = 0;

    @Column(name = "applicable_sections", columnDefinition = "JSON")
    private String applicableSections;

    @Lob
    @Column(name = "ai_prompt", nullable = false, columnDefinition = "TEXT")
    private String aiPrompt;

    @Column(name = "validation_criteria", columnDefinition = "JSON")
    private String validationCriteria;

    @Lob
    @Column(name = "correct_examples", columnDefinition = "TEXT")
    private String correctExamples;

    @Lob
    @Column(name = "incorrect_examples", columnDefinition = "TEXT")
    private String incorrectExamples;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

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

    public enum Severity {
        INFO,
        WARNING,
        ERROR,
        CRITICAL
    }
}
