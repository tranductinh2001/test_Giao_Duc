package com.education.lessonplanreview.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Entity representing detailed annotations/comments on specific parts of the document
 */
@Entity
@Table(name = "annotations", indexes = {
    @Index(name = "idx_review_result_id", columnList = "review_result_id"),
    @Index(name = "idx_section_id", columnList = "section_id"),
    @Index(name = "idx_rule_id", columnList = "rule_id"),
    @Index(name = "idx_annotation_type", columnList = "annotation_type"),
    @Index(name = "idx_severity", columnList = "severity"),
    @Index(name = "idx_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Annotation {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "review_result_id", nullable = false, length = 36)
    private String reviewResultId;

    @Column(name = "section_id", nullable = false, length = 36)
    private String sectionId;

    @Column(name = "rule_id", length = 36)
    private String ruleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "annotation_type", nullable = false)
    private AnnotationType annotationType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Column(name = "start_position", nullable = false)
    private Integer startPosition;

    @Column(name = "end_position", nullable = false)
    private Integer endPosition;

    @Lob
    @Column(name = "highlighted_text", columnDefinition = "TEXT")
    private String highlightedText;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String suggestion;

    @Lob
    @Column(name = "proposed_content", columnDefinition = "TEXT")
    private String proposedContent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnnotationStatus status = AnnotationStatus.PENDING;

    @Column(name = "resolved_by", length = 36)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = java.util.UUID.randomUUID().toString();
        }
    }

    public enum AnnotationType {
        COMMENT,
        WARNING,
        SUGGESTION,
        ERROR,
        IMPROVEMENT
    }

    public enum Severity {
        INFO,
        WARNING,
        ERROR,
        CRITICAL
    }

    public enum AnnotationStatus {
        PENDING,
        ACCEPTED,
        REJECTED,
        RESOLVED
    }
}
