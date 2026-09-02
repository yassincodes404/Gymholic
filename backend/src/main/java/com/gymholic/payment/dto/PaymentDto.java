package com.gymholic.payment.dto;

import com.gymholic.common.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentDto {

    private Long id;
    private Long bookingId;
    private Long orderId;
    private BigDecimal amount;
    private String currency;
    /** What the gateway will actually collect (converted when it can't
     *  charge the order currency — e.g. USD orders paid in EGP). */
    private BigDecimal payableAmount;
    private String payableCurrency;
    private PaymentStatus status;
    private String providerName;
    private String checkoutUrl;
    private LocalDateTime createdAt;
}
