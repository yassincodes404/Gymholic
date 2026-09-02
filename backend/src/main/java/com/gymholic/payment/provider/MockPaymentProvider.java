package com.gymholic.payment.provider;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Development-only payment provider. Lets the booking -> payment -> confirmation
 * pipeline (emails, Google Calendar, Meet) be exercised without Paymob credentials.
 * Enable with app.payments.mock-enabled=true (set in the dev profile).
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.payments.mock-enabled", havingValue = "true")
public class MockPaymentProvider implements PaymentProvider {

    @Override
    public String getProviderName() {
        return "mock";
    }

    @Override
    public Map<String, String> createCheckout(BigDecimal amount, String currency, String description, Map<String, String> metadata) {
        String transactionId = "mock-" + UUID.randomUUID();
        log.info("[MOCK PAYMENT] checkout created: tx={} amount={} {} booking={}",
            transactionId, amount, currency, metadata.get("bookingId"));

        Map<String, String> result = new HashMap<>();
        result.put("transactionId", transactionId);
        result.put("checkoutUrl", "mock://checkout/" + transactionId);
        return result;
    }

    @Override
    public Map<String, Object> verifyWebhook(String payload, String signature) {
        // No real signature to verify in mock mode.
        return Map.of("success", true, "pending", false, "orderId", "unknown");
    }

    @Override
    public Map<String, String> refund(String transactionId, BigDecimal amount) {
        log.info("[MOCK PAYMENT] refund issued: tx={} amount={}", transactionId, amount);
        return Map.of("refundId", "mock-refund-" + UUID.randomUUID());
    }
}
