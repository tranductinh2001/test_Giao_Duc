package com.education.lessonplanreview.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Entity for tracking export history
 */
@Entity
@Table(name = "export_history", indexes = {
    @Index(name = "idx_lesson_plan_id", columnList = "lesson_plan_id"),
    @Index(name = "idx_review_result_id", columnList = "review_result_id"),
    @Index(name = "idx_exported_by", columnList = "exported_by"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExportHistory {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "lesson_plan_id", nullable = false, length = 36)
    private String lessonPlanId;

    @Column(name = "review_result_id", length = 36)
    private String reviewResultId;

    @Enumerated(EnumType.STRING)
    @Column(name = "export_format", nullable = false)
    private ExportFormat exportFormat;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "include_annotations", nullable = false)
    private Boolean includeAnnotations = true;

    @Column(name = "include_track_changes", nullable = false)
    private Boolean includeTrackChanges = true;

    @Column(name = "exported_by", nullable = false, length = 36)
    private String exportedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = java.util.UUID.randomUUID().toString();
        }
    }

    public enum ExportFormat {
        DOCX,
        PDF
    }
}
