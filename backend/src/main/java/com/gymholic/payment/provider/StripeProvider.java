package com.gymholic.payment.provider;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Stripe payment provider implementation.
 * TODO: Integrate with Stripe SDK when ready.
 */
@Component
public class StripeProvider implements PaymentProvider {

    @Override
    public String getProviderName() {
        return "stripe";
    }

    @Override
    public Map<String, String> createCheckout(BigDecimal amount, String currency,
                                               String description, Map<String, String> metadata) {
        // TODO: Implement Stripe Checkout Session creation
        throw new UnsupportedOperationException("Stripe integration not yet implemented");
    }

    @Override
    public Map<String, Object> verifyWebhook(String payload, String signature) {
        // TODO: Implement Stripe webhook signature verification
        throw new UnsupportedOperationException("Stripe webhook verification not yet implemented");
    }

    @Override
    public Map<String, String> refund(String transactionId, BigDecimal amount) {
        // TODO: Implement Stripe refund
        throw new UnsupportedOperationException("Stripe refund not yet implemented");
    }
}
