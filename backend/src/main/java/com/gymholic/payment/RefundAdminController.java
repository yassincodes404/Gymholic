package com.gymholic.payment;

import com.gymholic.common.enums.PaymentStatus;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.payment.entity.Refund;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Admin → Bookings: the refund queue. A client cancelling inside the free
 * window records a PENDING refund here; the team settles it with the
 * gateway (Paymob dashboard / bank transfer) and marks it done. Money is
 * never moved by this endpoint — it is the paper trail.
 */
@RestController
@RequestMapping("/api/admin/refunds")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class RefundAdminController {

    private final RefundRepository refundRepository;

    public record SettleRefundRequest(String providerRefundId) {}

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(
            @RequestParam(defaultValue = "PENDING") String status) {
        List<Refund> refunds = "ALL".equalsIgnoreCase(status)
            ? refundRepository.findAllByOrderByCreatedAtDesc()
            : refundRepository.findByStatusOrderByCreatedAtDesc(parseStatus(status));
        return ApiResponse.success(refunds.stream().map(this::toMap).toList());
    }

    /** Marks a refund as settled with the gateway. */
    @PutMapping("/{id}/settle")
    @Transactional
    public ApiResponse<Map<String, Object>> settle(
            @PathVariable Long id, @RequestBody(required = false) SettleRefundRequest request) {
        Refund refund = refundRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Refund", "id", id));
        refund.setStatus(PaymentStatus.COMPLETED);
        if (request != null && request.providerRefundId() != null && !request.providerRefundId().isBlank()) {
            refund.setProviderRefundId(request.providerRefundId().trim());
        }
        refundRepository.save(refund);
        return ApiResponse.success("Refund marked as settled", toMap(refund));
    }

    private Map<String, Object> toMap(Refund refund) {
        var payment = refund.getPayment();
        var booking = payment != null ? payment.getBooking() : null;
        var client = booking != null ? booking.getClient() : null;
        return Map.of(
            "id", refund.getId(),
            "amount", refund.getAmount(),
            "reason", refund.getReason() == null ? "" : refund.getReason(),
            "status", refund.getStatus().name(),
            "providerRefundId", refund.getProviderRefundId() == null ? "" : refund.getProviderRefundId(),
            "createdAt", refund.getCreatedAt() == null ? LocalDateTime.now().toString() : refund.getCreatedAt().toString(),
            "bookingId", booking == null ? 0 : booking.getId(),
            "clientName", client == null ? "" : client.getFirstName() + " " + client.getLastName(),
            "clientEmail", client == null ? "" : client.getEmail());
    }

    private PaymentStatus parseStatus(String raw) {
        try {
            return PaymentStatus.valueOf(raw.toUpperCase());
        } catch (Exception e) {
            return PaymentStatus.PENDING;
        }
    }
}
