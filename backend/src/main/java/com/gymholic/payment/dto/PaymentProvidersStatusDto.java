package com.gymholic.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Payment-gateway status for Admin → Integrations. Secrets are never
 * returned in full — only masked hints so the admin can see what's saved.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentProvidersStatusDto {

    /** What checkout currently uses: "paymob", "mock" (dev) or "none". */
    private String activeProvider;

    private boolean mockAvailable;

    private PaymobStatus paymob;

    /** Stripe is on the roadmap — surfaced as coming-soon in the UI. */
    private Map<String, Object> stripe;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymobStatus {
        private boolean enabled;
        private boolean configured;
        private boolean active;
        private String apiKeyMasked;
        private String integrationId;
        private String iframeId;
        private String hmacSecretMasked;
    }
}
