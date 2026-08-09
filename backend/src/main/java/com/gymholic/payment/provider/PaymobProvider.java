package com.gymholic.payment.provider;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Paymob payment provider implementation.
 * TODO: Integrate with Paymob API when ready.
 */
@Component
public class PaymobProvider implements PaymentProvider {

    @Override
    public String getProviderName() {
        return "paymob";
    }

    @Override
    public Map<String, String> createCheckout(BigDecimal amount, String currency,
                                               String description, Map<String, String> metadata) {
        // TODO: Implement Paymob checkout creation
        throw new UnsupportedOperationException("Paymob integration not yet implemented");
    }

    @Override
    public Map<String, Object> verifyWebhook(String payload, String signature) {
        // TODO: Implement Paymob webhook/HMAC verification
        throw new UnsupportedOperationException("Paymob webhook verification not yet implemented");
    }

    @Override
    public Map<String, String> refund(String transactionId, BigDecimal amount) {
        // TODO: Implement Paymob refund
        throw new UnsupportedOperationException("Paymob refund not yet implemented");
    }
}
