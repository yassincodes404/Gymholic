package com.gymholic.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentHistoryDto {
    private Long id;
    private Long bookingId;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String providerName;
    private String description;
    private Instant bookingStartTime;
    private LocalDateTime createdAt;
}
