package com.education.lessonplanreview.dto.response;

import com.education.lessonplanreview.domain.Annotation;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Response DTO for annotation details
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnotationResponse {

    private String id;
    private String reviewResultId;
    private String sectionId;
    private String ruleId;
    private String ruleCode;
    private String ruleName;

    private Annotation.AnnotationType annotationType;
    private Annotation.Severity severity;

    private PositionInfo position;

    private String highlightedText;
    private String message;
    private String explanation;
    private String suggestion;
    private String proposedContent;

    private Annotation.AnnotationStatus status;
    private String resolvedBy;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;

    @Getter
    @Setter
    @Builder
    public static class PositionInfo {
        private Integer startPosition;
        private Integer endPosition;
        private Integer lineNumber;
    }
}
