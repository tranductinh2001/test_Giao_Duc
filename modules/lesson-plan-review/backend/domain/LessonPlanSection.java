package com.education.lessonplanreview.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entity representing parsed sections from a lesson plan document
 */
@Entity
@Table(name = "lesson_plan_sections", indexes = {
    @Index(name = "idx_lesson_plan_id", columnList = "lesson_plan_id"),
    @Index(name = "idx_section_type", columnList = "section_type"),
    @Index(name = "idx_section_order", columnList = "section_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonPlanSection {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "lesson_plan_id", nullable = false, length = 36)
    private String lessonPlanId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "section_type", nullable = false, length = 100)
    private String sectionType;

    @Column(name = "section_title")
    private String sectionTitle;

    @Column(name = "section_order", nullable = false)
    private Integer sectionOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false)
    private ContentType contentType = ContentType.TEXT;

    @Lob
    @Column(name = "raw_content", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String rawContent;

    @Column(name = "parsed_content", columnDefinition = "JSON")
    private String parsedContent;

    @Column(name = "word_count")
    private Integer wordCount;

    @Column(name = "char_count")
    private Integer charCount;

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

    public enum ContentType {
        TEXT,
        TABLE,
        LIST,
        IMAGE
    }
}
