package com.gymholic.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Paymob credentials entered in Admin → Integrations. Blank fields keep
 * their stored value, so the admin can update just one credential.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavePaymobConfigRequest {
    private String apiKey;
    private String integrationId;
    private String iframeId;
    private String hmacSecret;
    private String publicKey;
    private Boolean enabled;
    /** Local currency this Paymob account collects (e.g. "EGP"); blank = order currency (USD). */
    private String currency;
    /** EGP per USD — converts USD amounts when the currency above differs. */
    private String egpUsdRate;
}
