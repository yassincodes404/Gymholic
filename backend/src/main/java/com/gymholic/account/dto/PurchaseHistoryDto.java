package com.gymholic.account.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * One row of the client's payment history: a paid consultation, a free open
 * consultation, or a product order (blueprints, Academy membership, future
 * courses). Everything the client ever "bought", in one list.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseHistoryDto {

    /** CONSULTATION_PAYMENT | FREE_CONSULTATION | ORDER */
    private String kind;

    /** Stable row key for UI lists, e.g. "payment-12". */
    private String key;

    private Long refId;

    private String title;

    private BigDecimal amount;

    private String currency;

    /** Payment/booking/order status as text. */
    private String status;

    private String providerName;

    private LocalDateTime occurredAt;
}
