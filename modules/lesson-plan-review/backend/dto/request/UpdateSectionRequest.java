package com.education.lessonplanreview.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request DTO for updating section content
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateSectionRequest {

    @NotBlank(message = "Section ID is required")
    private String sectionId;

    @NotBlank(message = "Content is required")
    private String content;

    private String changeNote; // Optional note about the change
}
