package com.education.lessonplanreview.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Entity for tracking AI review requests
 */
@Entity
@Table(name = "ai_requests", indexes = {
    @Index(name = "idx_lesson_plan_id", columnList = "lesson_plan_id"),
    @Index(name = "idx_section_id", columnList = "section_id"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_cache_key", columnList = "cache_key"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIRequest {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "lesson_plan_id", nullable = false, length = 36)
    private String lessonPlanId;

    @Column(name = "section_id", length = 36)
    private String sectionId;

    @Column(name = "rule_set_id", nullable = false, length = 36)
    private String ruleSetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false)
    private RequestType requestType;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String prompt;

    @Column(name = "input_tokens")
    private Integer inputTokens;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName = "gemini-1.5-pro";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.PENDING;

    @Lob
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "cache_key", length = 64)
    private String cacheKey;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = java.util.UUID.randomUUID().toString();
        }
    }

    public enum RequestType {
        PARSE,
        REVIEW,
        ANNOTATE,
        SUGGEST
    }

    public enum RequestStatus {
        PENDING,
        PROCESSING,
        COMPLETED,
        FAILED,
        CACHED
    }
}
