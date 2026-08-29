package com.gymholic.store.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Public listing shape for a store product (Blueprint). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductSummaryDto {

    private Long id;
    private String slug;
    private String title;
    private String shortDescription;
    private BigDecimal price;
    private String currency;
    private Boolean isFree;
    private Boolean featured;
    private Boolean hasCover;
    private Boolean hasPdf;
    private CategoryRefDto category;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryRefDto {
        private String name;
        private String slug;
    }
}
