package com.education.lessonplanreview.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Entity for tracking review activity history
 */
@Entity
@Table(name = "review_history", indexes = {
    @Index(name = "idx_lesson_plan_id", columnList = "lesson_plan_id"),
    @Index(name = "idx_review_result_id", columnList = "review_result_id"),
    @Index(name = "idx_action_type", columnList = "action_type"),
    @Index(name = "idx_performed_by", columnList = "performed_by"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewHistory {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "lesson_plan_id", nullable = false, length = 36)
    private String lessonPlanId;

    @Column(name = "review_result_id", length = 36)
    private String reviewResultId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false)
    private ActionType actionType;

    @Column(name = "action_data", columnDefinition = "JSON")
    private String actionData;

    @Column(name = "performed_by", nullable = false, length = 36)
    private String performedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = java.util.UUID.randomUUID().toString();
        }
    }

    public enum ActionType {
        CREATED,
        PARSED,
        REVIEWED,
        EDITED,
        ANNOTATION_ADDED,
        ANNOTATION_ACCEPTED,
        ANNOTATION_REJECTED,
        EXPORTED,
        COMPLETED
    }
}
