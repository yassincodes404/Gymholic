package com.gymholic.payment;

import com.gymholic.common.enums.PaymentStatus;
import com.gymholic.payment.entity.Refund;
import com.gymholic.payment.provider.PaymentProvider;
import com.gymholic.settings.SettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/*!
 * Moves refund money through the gateway instead of only writing it down.
 *
 * A client cancelling inside the free window records a PENDING refund
 * (BookingService). This service then tries to push that refund back
 * through the original provider:
 *
 *   - possible (provider reachable + charge id known) → refund row flips
 *     to COMPLETED with the gateway's refund reference — money moves now;
 *   - not possible (no charge id yet, provider rejects, network error) →
 *     the row stays PENDING for the team to settle from the gateway
 *     dashboard (Admin → Bookings → Refunds, or bank transfer).
 *
 * The automatic path is governed by REFUNDS_AUTO_PROCESS_ENABLED so the
 * team can pause it and fall back to fully manual settlement.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefundService {

    private final RefundRepository refundRepository;
    private final SettingsService settingsService;
    private final List<PaymentProvider> paymentProviders;

    /** How a refund attempt ended — {@code processed} means money moved. */
    public record RefundOutcome(boolean processed, String message) {}

    /**
     * Tries the automatic gateway refund for a PENDING refund row.
     * Never throws — any failure is returned as the outcome so callers
     * (client cancellation, admin settle) can decide what to surface.
     */
    @Transactional
    public RefundOutcome attemptGatewayRefund(Refund refund) {
        if (refund.getStatus() == PaymentStatus.COMPLETED) {
            return new RefundOutcome(true, "Refund is already settled.");
        }

        var payment = refund.getPayment();
        PaymentProvider provider = payment != null ? providerByName(payment.getProviderName()) : null;
        String chargeId = payment != null ? payment.getProviderChargeId() : null;

        if (provider == null || chargeId == null || chargeId.isBlank()) {
            return new RefundOutcome(false,
                "No gateway charge reference on this payment — settle it manually from the "
                    + (payment != null ? payment.getProviderName() : "provider") + " dashboard.");
        }

        try {
            Map<String, String> result = provider.refund(chargeId, refund.getAmount());
            refund.setStatus(PaymentStatus.COMPLETED);
            refund.setProviderRefundId(result.get("refundId"));
            refundRepository.save(refund);
            log.info("Refund #{} processed automatically via {} (provider refund id {}, amount {})",
                refund.getId(), payment.getProviderName(), result.get("refundId"), refund.getAmount());
            return new RefundOutcome(true, "Refunded automatically via " + payment.getProviderName() + ".");
        } catch (Exception e) {
            // Leave the row PENDING — the team settles it manually.
            log.error("Automatic refund #{} failed, staying PENDING for manual settlement: {}",
                refund.getId(), e.getMessage());
            return new RefundOutcome(false, e.getMessage());
        }
    }

    /**
     * The client-cancellation path: when automatic processing is enabled,
     * push the refund to the gateway right away; otherwise (or on failure)
     * it simply stays PENDING in the admin queue.
     */
    @Transactional
    public void autoProcessAfterCancellation(Refund refund) {
        if (!settingsService.getBool("REFUNDS_AUTO_PROCESS_ENABLED", true)) {
            log.info("Refund #{} left PENDING — automatic processing is disabled", refund.getId());
            return;
        }
        attemptGatewayRefund(refund);
    }

    private PaymentProvider providerByName(String name) {
        return Optional.ofNullable(name)
            .flatMap(n -> paymentProviders.stream().filter(p -> p.getProviderName().equals(n)).findFirst())
            .orElse(null);
    }
}
