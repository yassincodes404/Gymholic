package com.gymholic.store.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Full product detail plus related products for the storefront page. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDetailDto {

    private Long id;
    private String slug;
    private String title;
    private String shortDescription;
    private String description;
    private java.math.BigDecimal price;
    private String currency;
    private Boolean isFree;
    private Boolean featured;
    private Boolean hasCover;
    private Boolean hasPdf;
    private ProductSummaryDto.CategoryRefDto category;
    private List<ProductSummaryDto> related;
}
