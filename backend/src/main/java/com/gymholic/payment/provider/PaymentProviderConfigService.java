package com.gymholic.payment.provider;

import com.gymholic.calendar.util.EncryptionUtil;
import com.gymholic.settings.SettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Payment-gateway credentials, managed from Admin → Integrations.
 * Values entered in the admin UI are stored in the settings table —
 * secrets (API key, HMAC) AES-256-GCM encrypted with the ENCRYPTION_SECRET
 * env key, the same scheme as the stored Google refresh tokens — and take
 * precedence over the PAYMOB_* environment variables. Because they live in
 * the database, they survive redeploys and app updates untouched.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentProviderConfigService {

    /** Marks a settings value as encrypted ("enc:<base64 iv+ciphertext>"). */
    private static final String ENC_PREFIX = "enc:";

    public static final String KEY_API_KEY = "PAYMOB_API_KEY";
    public static final String KEY_INTEGRATION_ID = "PAYMOB_INTEGRATION_ID";
    public static final String KEY_IFRAME_ID = "PAYMOB_IFRAME_ID";
    public static final String KEY_HMAC_SECRET = "PAYMOB_HMAC_SECRET";
    public static final String KEY_PUBLIC_KEY = "PAYMOB_PUBLIC_KEY";
    public static final String KEY_PAYMOB_ENABLED = "PAYMOB_ENABLED";
    public static final String KEY_EGP_USD_RATE = "PAYMOB_EGP_USD_RATE";

    private final SettingsService settingsService;
    private final EncryptionUtil encryptionUtil;
    private final com.gymholic.payment.FxRateService fxRateService;

    // Environment fallbacks (what the deployment was configured with).
    @Value("${app.paymob.api-key:}")
    private String envApiKey;

    @Value("${app.paymob.integration-id:}")
    private String envIntegrationId;

    @Value("${app.paymob.iframe-id:}")
    private String envIframeId;

    @Value("${app.paymob.hmac-secret:}")
    private String envHmacSecret;

    @Value("${app.paymob.public-key:}")
    private String envPublicKey;

    @Value("${app.payments.mock-enabled:false}")
    private boolean mockEnabled;

    /** Optional currency override for Paymob accounts that cannot collect USD. */
    @Value("${app.payments.currency:}")
    private String envCurrencyOverride;

    /** EGP per USD — used to CONVERT amounts when the override is active. */
    @Value("${app.payments.egp-usd-rate:48.0}")
    private String envEgpUsdRate;

    public record PaymobCredentials(String apiKey, String integrationId, String iframeId,
                                    String hmacSecret, String publicKey) {
        /** New Paymob accounts (egy_* keys) use the Intention API: secret
         *  key + integration id + public key + HMAC are the required set;
         *  the iframe id only matters for legacy accept-api configs. */
        public boolean complete() {
            return notBlank(apiKey) && notBlank(integrationId) && notBlank(hmacSecret);
        }
        private static boolean notBlank(String s) { return s != null && !s.isBlank(); }
    }

    /** Credentials from the admin settings (secrets decrypted), falling back to env vars. */
    public PaymobCredentials getPaymobCredentials() {
        try {
            Map<String, String> all = settingsService.getAllSettings();
            return new PaymobCredentials(
                pick(decrypt(all.get(KEY_API_KEY)), envApiKey),
                pick(decrypt(all.get(KEY_INTEGRATION_ID)), envIntegrationId),
                pick(decrypt(all.get(KEY_IFRAME_ID)), envIframeId),
                pick(decrypt(all.get(KEY_HMAC_SECRET)), envHmacSecret),
                pick(decrypt(all.get(KEY_PUBLIC_KEY)), envPublicKey));
        } catch (Exception e) {
            log.warn("Could not read Paymob settings, using env values: {}", e.getMessage());
            return new PaymobCredentials(envApiKey, envIntegrationId, envIframeId, envHmacSecret, envPublicKey);
        }
    }

    /**
     * The enable toggle from the admin UI. When no explicit value is stored,
     * deployments configured through the PAYMOB_* env variables stay enabled
     * (previous behavior); with neither, Paymob is off.
     */
    public boolean isPaymobEnabled() {
        try {
            String value = settingsService.getAllSettings().get(KEY_PAYMOB_ENABLED);
            if (value != null && !value.isBlank()) {
                return value.trim().equalsIgnoreCase("true");
            }
        } catch (Exception e) {
            log.warn("Could not read Paymob settings: {}", e.getMessage());
        }
        return envConfigured();
    }

    private boolean envConfigured() {
        return notBlank(envApiKey) && notBlank(envIntegrationId) && notBlank(envHmacSecret);
    }

    public boolean isPaymobConfigured() {
        return getPaymobCredentials().complete();
    }

    /** Paymob is live only when the admin enabled it AND the credentials are complete. */
    public boolean isPaymobActive() {
        return isPaymobEnabled() && isPaymobConfigured();
    }

    /**
     * The gateway the website's checkout should use: paymob when the admin
     * enabled it with complete credentials, otherwise the mock provider when
     * it is available (dev), otherwise none.
     */
    public String getActiveProvider() {
        if (isPaymobActive()) return "paymob";
        if (mockEnabled) return "mock";
        return "none";
    }

    public boolean isMockAvailable() {
        return mockEnabled;
    }

    /**
     * The local currency Paymob should collect instead of USD (e.g. "EGP"
     * for Egyptian accounts that can't collect USD), or blank when the
     * gateway collects the order currency as-is. Settings table
     * PAYMOB_CURRENCY wins over the env variable.
     */
    public String getPaymobCurrencyOverride() {
        try {
            String stored = settingsService.getAllSettings().get("PAYMOB_CURRENCY");
            if (stored != null && !stored.isBlank()) return stored.trim().toUpperCase();
        } catch (Exception e) {
            log.warn("Could not read Paymob currency setting: {}", e.getMessage());
        }
        return envCurrencyOverride == null ? "" : envCurrencyOverride.trim().toUpperCase();
    }

    /**
     * EGP per USD — used to CONVERT USD amounts whenever the currency
     * override is active, so a $49 order charges the correct EGP value.
     * Delegates to {@link com.gymholic.payment.FxRateService}: the admin
     * setting pins it when present, otherwise the live daily market rate
     * applies (48.0 only as a last-resort fallback).
     */
    public java.math.BigDecimal getEgpUsdRate() {
        return fxRateService.getEgpUsdRate();
    }

    /**
     * Saves any provided credential / toggle (blank fields keep their stored
     * value). The two secrets are encrypted before they touch the database;
     * the integration/iframe IDs are identifiers and stay readable.
     */
    @Transactional
    public void savePaymobConfig(String apiKey, String integrationId, String iframeId,
                                 String hmacSecret, String publicKey, Boolean enabled,
                                 String currency, String egpUsdRate) {
        if (notBlank(apiKey)) settingsService.updateSetting(KEY_API_KEY, encrypt(apiKey.trim()));
        if (notBlank(integrationId)) settingsService.updateSetting(KEY_INTEGRATION_ID, integrationId.trim());
        if (notBlank(iframeId)) settingsService.updateSetting(KEY_IFRAME_ID, iframeId.trim());
        if (notBlank(hmacSecret)) settingsService.updateSetting(KEY_HMAC_SECRET, encrypt(hmacSecret.trim()));
        if (notBlank(publicKey)) settingsService.updateSetting(KEY_PUBLIC_KEY, publicKey.trim());
        if (enabled != null) settingsService.updateSetting(KEY_PAYMOB_ENABLED, enabled.toString());
        // Egypt configuration: the currency the account collects (EGP) and
        // the EGP/USD conversion rate applied to USD order totals.
        if (currency != null) {
            settingsService.updateSetting("PAYMOB_CURRENCY", currency.trim().toUpperCase());
        }
        if (notBlank(egpUsdRate)) {
            try {
                java.math.BigDecimal rate = new java.math.BigDecimal(egpUsdRate.trim());
                if (rate.compareTo(java.math.BigDecimal.ZERO) > 0) {
                    settingsService.updateSetting(KEY_EGP_USD_RATE, rate.toPlainString());
                }
            } catch (NumberFormatException e) {
                log.warn("Ignored invalid EGP rate '{}'", egpUsdRate);
            }
        }
    }

    private String encrypt(String plain) {
        try {
            return ENC_PREFIX + encryptionUtil.encrypt(plain);
        } catch (Exception e) {
            throw new IllegalStateException("Could not encrypt the payment secret — check ENCRYPTION_SECRET.", e);
        }
    }

    /** Decrypts "enc:..." values; anything else (legacy plaintext) is returned as-is. */
    private String decrypt(String stored) {
        if (stored == null || stored.isBlank()) return stored;
        if (!stored.startsWith(ENC_PREFIX)) return stored;
        try {
            return encryptionUtil.decrypt(stored.substring(ENC_PREFIX.length()));
        } catch (Exception e) {
            log.error("Stored payment secret could not be decrypted (ENCRYPTION_SECRET changed?) — ignoring it");
            return "";
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static String pick(String settingsValue, String envValue) {
        return notBlank(settingsValue) ? settingsValue.trim() : (envValue == null ? "" : envValue.trim());
    }
}
