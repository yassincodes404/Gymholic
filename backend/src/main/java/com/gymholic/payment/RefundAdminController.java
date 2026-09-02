package com.gymholic.payment;

import com.gymholic.common.enums.PaymentStatus;
import com.gymholic.common.exception.BadRequestException;
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
 * window records a PENDING refund here. Settling first tries the automatic
 * gateway refund (money moves via Paymob); if that isn't possible the team
 * settles manually (Paymob dashboard / bank transfer) and records it —
 * the queue is the paper trail either way.
 */
@RestController
@RequestMapping("/api/admin/refunds")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class RefundAdminController {

    private final RefundRepository refundRepository;
    private final RefundService refundService;

    public record SettleRefundRequest(String providerRefundId) {}

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(
            @RequestParam(defaultValue = "PENDING") String status) {
        List<Refund> refunds = "ALL".equalsIgnoreCase(status)
            ? refundRepository.findAllByOrderByCreatedAtDesc()
            : refundRepository.findByStatusOrderByCreatedAtDesc(parseStatus(status));
        return ApiResponse.success(refunds.stream().map(this::toMap).toList());
    }

    /**
     * Settles a refund: attempts the automatic gateway refund first. A
     * manually-typed {@code providerRefundId} records a manual settlement
     * (dashboard/bank transfer); {@code ?force=true} marks it settled even
     * when the gateway attempt isn't possible.
     */
    @PutMapping("/{id}/settle")
    @Transactional
    public ApiResponse<Map<String, Object>> settle(
            @PathVariable Long id, @RequestBody(required = false) SettleRefundRequest request,
            @RequestParam(defaultValue = "false") boolean force) {
        Refund refund = refundRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Refund", "id", id));
        if (refund.getStatus() == PaymentStatus.COMPLETED) {
            throw new BadRequestException("This refund is already settled.");
        }

        // Manual settlement — the admin already moved the money elsewhere.
        if (request != null && request.providerRefundId() != null && !request.providerRefundId().isBlank()) {
            refund.setStatus(PaymentStatus.COMPLETED);
            refund.setProviderRefundId(request.providerRefundId().trim());
            refundRepository.save(refund);
            return ApiResponse.success("Refund marked as manually settled", toMap(refund));
        }

        // Automatic settlement — push it back through the gateway.
        RefundService.RefundOutcome outcome = refundService.attemptGatewayRefund(refund);
        if (outcome.processed()) {
            return ApiResponse.success(outcome.message(), toMap(refund));
        }
        if (force) {
            refund.setStatus(PaymentStatus.COMPLETED);
            refundRepository.save(refund);
            return ApiResponse.success("Refund marked as settled without a gateway attempt", toMap(refund));
        }
        throw new BadRequestException(
            outcome.message() + " Pass providerRefundId to record a manual settlement, or retry with &force=true.");
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
