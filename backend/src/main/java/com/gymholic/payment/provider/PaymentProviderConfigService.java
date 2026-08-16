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
    public static final String KEY_PAYMOB_ENABLED = "PAYMOB_ENABLED";

    private final SettingsService settingsService;
    private final EncryptionUtil encryptionUtil;

    // Environment fallbacks (what the deployment was configured with).
    @Value("${app.paymob.api-key:}")
    private String envApiKey;

    @Value("${app.paymob.integration-id:}")
    private String envIntegrationId;

    @Value("${app.paymob.iframe-id:}")
    private String envIframeId;

    @Value("${app.paymob.hmac-secret:}")
    private String envHmacSecret;

    @Value("${app.payments.mock-enabled:false}")
    private boolean mockEnabled;

    public record PaymobCredentials(String apiKey, String integrationId, String iframeId, String hmacSecret) {
        public boolean complete() {
            return notBlank(apiKey) && notBlank(integrationId) && notBlank(iframeId) && notBlank(hmacSecret);
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
                pick(decrypt(all.get(KEY_HMAC_SECRET)), envHmacSecret));
        } catch (Exception e) {
            log.warn("Could not read Paymob settings, using env values: {}", e.getMessage());
            return new PaymobCredentials(envApiKey, envIntegrationId, envIframeId, envHmacSecret);
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
        return notBlank(envApiKey) && notBlank(envIntegrationId)
            && notBlank(envIframeId) && notBlank(envHmacSecret);
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
     * Saves any provided credential / toggle (blank fields keep their stored
     * value). The two secrets are encrypted before they touch the database;
     * the integration/iframe IDs are identifiers and stay readable.
     */
    @Transactional
    public void savePaymobConfig(String apiKey, String integrationId, String iframeId,
                                 String hmacSecret, Boolean enabled) {
        if (notBlank(apiKey)) settingsService.updateSetting(KEY_API_KEY, encrypt(apiKey.trim()));
        if (notBlank(integrationId)) settingsService.updateSetting(KEY_INTEGRATION_ID, integrationId.trim());
        if (notBlank(iframeId)) settingsService.updateSetting(KEY_IFRAME_ID, iframeId.trim());
        if (notBlank(hmacSecret)) settingsService.updateSetting(KEY_HMAC_SECRET, encrypt(hmacSecret.trim()));
        if (enabled != null) settingsService.updateSetting(KEY_PAYMOB_ENABLED, enabled.toString());
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
