package com.gymholic.store.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Create/update payload for a store category (admin). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveCategoryRequest {

    @NotBlank(message = "Category name is required")
    private String name;

    /** Optional — derived from the name when blank. */
    private String slug;

    private String description;

    private Integer sortOrder;

    @Builder.Default
    private Boolean active = true;
}
