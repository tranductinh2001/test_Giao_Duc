package com.education.lessonplanreview.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Request DTO for starting a review process
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StartReviewRequest {

    @NotBlank(message = "Lesson plan ID is required")
    private String lessonPlanId;

    @NotBlank(message = "Rule set ID is required")
    private String ruleSetId;

    private Boolean forceReview = false; // Force re-review even if cached
}
