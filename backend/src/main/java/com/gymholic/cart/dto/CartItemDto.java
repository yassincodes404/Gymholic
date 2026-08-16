package com.gymholic.cart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemDto {
    private Long id;
    private String productId;
    private String productType;
    private String title;
    private BigDecimal price;
    private String currency;
    private int quantity;
}
