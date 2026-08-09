package com.gymholic.payment.provider;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Abstraction for payment gateway providers (Stripe, Paymob, etc.).
 */
public interface PaymentProvider {

    /**
     * Returns the provider name (e.g. "stripe", "paymob").
     */
    String getProviderName();

    /**
     * Creates a checkout session and returns a map containing at least:
     * - "checkoutUrl": the URL to redirect the user to
     * - "transactionId": the provider's transaction/session ID
     */
    Map<String, String> createCheckout(BigDecimal amount, String currency,
                                        String description, Map<String, String> metadata);

    /**
     * Verifies a webhook signature and returns the parsed payload.
     */
    Map<String, Object> verifyWebhook(String payload, String signature);

    /**
     * Initiates a refund.
     */
    Map<String, String> refund(String transactionId, BigDecimal amount);
}
