package com.gymholic.notification;

import com.gymholic.calendar.util.EncryptionUtil;
import com.gymholic.settings.SettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Transactional email configuration, managed from Admin → Integrations.
 * Brevo is the production sender: the admin pastes an API key there, it is
 * AES-256-GCM encrypted (ENCRYPTION_SECRET) into the settings table and takes
 * precedence over the BREVO_* environment variables. With Brevo active the
 * app sends through Brevo's HTTPS API; otherwise it falls back to classic
 * SMTP (spring.mail.*).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BrevoConfigService {

    private static final String ENC_PREFIX = "enc:";

    public static final String KEY_API_KEY = "BREVO_API_KEY";
    public static final String KEY_SENDER_EMAIL = "BREVO_SENDER_EMAIL";
    public static final String KEY_SENDER_NAME = "BREVO_SENDER_NAME";
    public static final String KEY_SMS_SENDER = "BREVO_SMS_SENDER";
    public static final String KEY_ENABLED = "BREVO_ENABLED";

    /** Alphanumeric SMS senders are capped at 11 chars by Brevo/E.164 rules. */
    private static final int SMS_SENDER_MAX = 11;

    private final SettingsService settingsService;
    private final EncryptionUtil encryptionUtil;

    @Value("${app.brevo.api-key:}")
    private String envApiKey;

    @Value("${app.brevo.sender-email:}")
    private String envSenderEmail;

    @Value("${app.brevo.sender-name:Gymholic}")
    private String envSenderName;

    @Value("${app.brevo.sms-sender:Gymholic}")
    private String envSmsSender;

    public record BrevoCredentials(String apiKey, String senderEmail, String senderName) {
        public boolean complete() {
            return notBlank(apiKey) && notBlank(senderEmail);
        }
    }

    /** Credentials from admin settings (API key decrypted), falling back to env. */
    public BrevoCredentials getBrevoCredentials() {
        try {
            Map<String, String> all = settingsService.getAllSettings();
            return new BrevoCredentials(
                pick(decrypt(all.get(KEY_API_KEY)), envApiKey),
                pick(all.get(KEY_SENDER_EMAIL), envSenderEmail),
                pick(all.get(KEY_SENDER_NAME), envSenderName));
        } catch (Exception e) {
            log.warn("Could not read Brevo settings, using env values: {}", e.getMessage());
            return new BrevoCredentials(envApiKey, envSenderEmail, envSenderName);
        }
    }

    /** Brevo is the active sender only when enabled AND the key + sender are complete. */
    public boolean isBrevoActive() {
        if (!isBrevoEnabled()) return false;
        return getBrevoCredentials().complete();
    }

    public boolean isBrevoEnabled() {
        try {
            String value = settingsService.getAllSettings().get(KEY_ENABLED);
            if (value != null && !value.isBlank()) {
                return value.trim().equalsIgnoreCase("true");
            }
        } catch (Exception e) {
            log.warn("Could not read Brevo settings: {}", e.getMessage());
        }
        return notBlank(envApiKey); // deployments configured via env stay on
    }

    public boolean isBrevoConfigured() {
        return getBrevoCredentials().complete();
    }

    /**
     * The SMS sender name shown as the message origin (alphanumeric, ≤11
     * chars). Settings override the BREVO_SMS_SENDER env default.
     */
    public String getSmsSender() {
        try {
            String stored = settingsService.getAllSettings().get(KEY_SMS_SENDER);
            return sanitizeSmsSender(pick(stored, envSmsSender));
        } catch (Exception e) {
            log.warn("Could not read the Brevo SMS sender, using env value: {}", e.getMessage());
            return sanitizeSmsSender(envSmsSender);
        }
    }

    /** Brevo SMS is usable when the account is active AND a sender is set. */
    public boolean isSmsActive() {
        return isBrevoActive() && notBlank(getSmsSender());
    }

    /** Strips characters Brevo rejects in alphanumeric sender IDs and caps the length. */
    private static String sanitizeSmsSender(String sender) {
        if (sender == null) return "";
        String cleaned = sender.replaceAll("[^A-Za-z0-9 ]", "").trim();
        return cleaned.length() > SMS_SENDER_MAX ? cleaned.substring(0, SMS_SENDER_MAX) : cleaned;
    }

    /** Masked key for the admin UI, e.g. "xkeysib-…ab12". */
    public String maskedApiKey() {
        String key = getBrevoCredentials().apiKey();
        if (!notBlank(key)) return "";
        if (key.length() <= 8) return "••••";
        return key.substring(0, 6) + "…" + key.substring(key.length() - 4);
    }

    /** Saves the provided values; blank fields keep their stored value. */
    @Transactional
    public void saveBrevoConfig(String apiKey, String senderEmail, String senderName,
                                String smsSender, Boolean enabled) {
        if (notBlank(apiKey)) {
            try {
                settingsService.updateSetting(KEY_API_KEY, ENC_PREFIX + encryptionUtil.encrypt(apiKey.trim()));
            } catch (Exception e) {
                throw new IllegalStateException("Could not encrypt the Brevo key — check ENCRYPTION_SECRET.", e);
            }
        }
        if (notBlank(senderEmail)) settingsService.updateSetting(KEY_SENDER_EMAIL, senderEmail.trim());
        if (notBlank(senderName)) settingsService.updateSetting(KEY_SENDER_NAME, senderName.trim());
        if (notBlank(smsSender)) settingsService.updateSetting(KEY_SMS_SENDER, sanitizeSmsSender(smsSender));
        if (enabled != null) settingsService.updateSetting(KEY_ENABLED, enabled.toString());
    }

    private String decrypt(String stored) {
        if (stored == null || stored.isBlank()) return stored;
        if (!stored.startsWith(ENC_PREFIX)) return stored;
        try {
            return encryptionUtil.decrypt(stored.substring(ENC_PREFIX.length()));
        } catch (Exception e) {
            log.error("Stored Brevo key could not be decrypted (ENCRYPTION_SECRET changed?) — ignoring it");
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
