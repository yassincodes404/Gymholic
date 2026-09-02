package com.gymholic.payment;

import com.gymholic.payment.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByBookingId(Long bookingId);

    List<Payment> findByOrderId(Long orderId);

    Optional<Payment> findByProviderTransactionId(String providerTransactionId);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = :status")
    java.util.Optional<BigDecimal> sumAmountByStatus(@org.springframework.data.repository.query.Param("status") com.gymholic.common.enums.PaymentStatus status);

    @org.springframework.data.jpa.repository.Query(
        "SELECT FUNCTION('DATE', p.createdAt) AS day, SUM(p.amount) FROM Payment p " +
        "WHERE p.status = 'COMPLETED' AND p.createdAt >= :since GROUP BY FUNCTION('DATE', p.createdAt) ORDER BY day ASC")
    java.util.List<Object[]> sumCompletedRevenueByDay(@org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since);

    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Payment p WHERE p.booking.client.id = :clientId ORDER BY p.createdAt DESC")
    java.util.List<Payment> findByBookingClientId(@org.springframework.data.repository.query.Param("clientId") Long clientId);
}
