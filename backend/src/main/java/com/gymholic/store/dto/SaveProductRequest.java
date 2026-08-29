package com.gymholic.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Create/update payload for a store product (admin). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveProductRequest {

    @NotBlank(message = "Title is required")
    private String title;

    /** Optional — derived from the title when blank. */
    private String slug;

    private String shortDescription;

    private String description;

    @NotNull(message = "Category is required")
    private Long categoryId;

    @NotNull(message = "Price is required")
    private BigDecimal price;

    @Builder.Default
    private Boolean isFree = false;

    @Builder.Default
    private Boolean featured = false;

    @Builder.Default
    private Boolean active = true;
}
