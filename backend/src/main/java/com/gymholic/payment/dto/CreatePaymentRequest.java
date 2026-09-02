package com.gymholic.payment.dto;

import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * A payment is for exactly one target: a consultation booking OR a store
 * order. The amount is resolved server-side either way; it travels here
 * only for request-shape symmetry with older clients.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentRequest {

    private Long bookingId;

    private Long orderId;

    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    @Builder.Default
    private String currency = "USD";

    @Builder.Default
    private String provider = "stripe";

    public boolean hasTarget() {
        return bookingId != null || orderId != null;
    }
}
