package com.gymholic.payment;

import com.gymholic.payment.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RefundRepository extends JpaRepository<Refund, Long> {

    List<Refund> findByStatusOrderByCreatedAtDesc(com.gymholic.common.enums.PaymentStatus status);

    List<Refund> findAllByOrderByCreatedAtDesc();
}
