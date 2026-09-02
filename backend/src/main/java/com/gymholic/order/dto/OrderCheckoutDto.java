package com.gymholic.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Real-gateway order checkout: a PENDING order was created and a payment
 * intention started — the browser opens checkoutUrl (embedded) and the
 * webhook flips the order to PAID.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderCheckoutDto {
    private Long orderId;
    private Long paymentId;
    private String checkoutUrl;
    private String provider;
    private String status;
    /** What the gateway will actually collect (converted when needed). */
    private java.math.BigDecimal payableAmount;
    private String payableCurrency;
}
