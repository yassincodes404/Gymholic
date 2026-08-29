package com.gymholic.store.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** One item of the signed-in user's library: free products + purchases. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LibraryItemDto {

    private String slug;
    private String title;
    private String shortDescription;
    private BigDecimal price;
    private String currency;
    private Boolean isFree;
    private Boolean featured;
    private Boolean hasCover;
    private Boolean hasPdf;
    private ProductSummaryDto.CategoryRefDto category;
    /** True when this product was bought by the user (a PAID order item). */
    private Boolean owned;
}
