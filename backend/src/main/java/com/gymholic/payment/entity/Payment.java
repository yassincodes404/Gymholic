package com.gymholic.payment.entity;

import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Set for consultation bookings (booking payments). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    /** Set for store orders (blueprints / Academy membership payments). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private com.gymholic.order.entity.Order order;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "provider_name", nullable = false)
    private String providerName;

    @Column(name = "provider_transaction_id")
    private String providerTransactionId;

    /**
     * The gateway's charge/transaction id, captured from the verified
     * webhook (Paymob's obj.id) — the id refunds are issued against. The
     * order id above identifies the payment for dedupe, not for refunds.
     */
    @Column(name = "provider_charge_id", length = 100)
    private String providerChargeId;

    @Column(name = "provider_checkout_url")
    private String providerCheckoutUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
