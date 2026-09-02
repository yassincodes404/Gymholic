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
 * SMS + WhatsApp configuration (Twilio), managed from Admin → Integrations
 * and mirroring the Brevo email setup: the admin pastes credentials, the
 * auth token is AES-256-GCM encrypted (ENCRYPTION_SECRET) into the settings
 * table and takes precedence over the TWILIO_* environment variables.
 *
 * One Twilio account carries both channels: SMS from a phone number (or
 * alphanumeric sender ID) and WhatsApp from a WhatsApp-enabled number.
 * Each channel can be toggled independently; messaging is fully off unless
 * enabled AND the credentials are complete.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessagingConfigService {

    private static final String ENC_PREFIX = "enc:";

    public static final String KEY_ACCOUNT_SID = "TWILIO_ACCOUNT_SID";
    public static final String KEY_AUTH_TOKEN = "TWILIO_AUTH_TOKEN";
    public static final String KEY_SMS_FROM = "TWILIO_SMS_FROM";
    public static final String KEY_WHATSAPP_FROM = "TWILIO_WHATSAPP_FROM";
    public static final String KEY_ENABLED = "MESSAGING_ENABLED";

    private final SettingsService settingsService;
    private final EncryptionUtil encryptionUtil;

    @Value("${app.twilio.account-sid:}")
    private String envAccountSid;

    @Value("${app.twilio.auth-token:}")
    private String envAuthToken;

    @Value("${app.twilio.sms-from:}")
    private String envSmsFrom;

    @Value("${app.twilio.whatsapp-from:}")
    private String envWhatsappFrom;

    public record TwilioCredentials(String accountSid, String authToken, String smsFrom, String whatsappFrom) {
        /** Messaging needs the account pair plus at least one channel sender. */
        public boolean complete() {
            return notBlank(accountSid) && notBlank(authToken)
                && (notBlank(smsFrom) || notBlank(whatsappFrom));
        }
    }

    /** Credentials from admin settings (auth token decrypted), falling back to env. */
    public TwilioCredentials getTwilioCredentials() {
        try {
            Map<String, String> all = settingsService.getAllSettings();
            return new TwilioCredentials(
                pick(all.get(KEY_ACCOUNT_SID), envAccountSid),
                pick(decrypt(all.get(KEY_AUTH_TOKEN)), envAuthToken),
                pick(all.get(KEY_SMS_FROM), envSmsFrom),
                pick(all.get(KEY_WHATSAPP_FROM), envWhatsappFrom));
        } catch (Exception e) {
            log.warn("Could not read Twilio settings, using env values: {}", e.getMessage());
            return new TwilioCredentials(envAccountSid, envAuthToken, envSmsFrom, envWhatsappFrom);
        }
    }

    public boolean isEnabled() {
        try {
            String value = settingsService.getAllSettings().get(KEY_ENABLED);
            if (value != null && !value.isBlank()) {
                return value.trim().equalsIgnoreCase("true");
            }
        } catch (Exception e) {
            log.warn("Could not read messaging settings: {}", e.getMessage());
        }
        return notBlank(envAccountSid) && notBlank(envAuthToken); // env-configured deployments stay on
    }

    public boolean isActive() {
        return isEnabled() && getTwilioCredentials().complete();
    }

    public boolean smsActive() {
        TwilioCredentials creds = getTwilioCredentials();
        return isActive() && notBlank(creds.smsFrom());
    }

    public boolean whatsappActive() {
        TwilioCredentials creds = getTwilioCredentials();
        return isActive() && notBlank(creds.whatsappFrom());
    }

    /** Masked token for the admin UI, e.g. "1a2b3c…9f". */
    public String maskedAuthToken() {
        String token = getTwilioCredentials().authToken();
        if (!notBlank(token)) return "";
        if (token.length() <= 8) return "••••";
        return token.substring(0, 6) + "…" + token.substring(token.length() - 4);
    }

    /** Saves the provided values; blank fields keep their stored value. */
    @Transactional
    public void saveTwilioConfig(String accountSid, String authToken,
                                 String smsFrom, String whatsappFrom, Boolean enabled) {
        if (notBlank(accountSid)) settingsService.updateSetting(KEY_ACCOUNT_SID, accountSid.trim());
        if (notBlank(authToken)) {
            try {
                settingsService.updateSetting(KEY_AUTH_TOKEN, ENC_PREFIX + encryptionUtil.encrypt(authToken.trim()));
            } catch (Exception e) {
                throw new IllegalStateException("Could not encrypt the Twilio auth token — check ENCRYPTION_SECRET.", e);
            }
        }
        if (smsFrom != null) settingsService.updateSetting(KEY_SMS_FROM, smsFrom.trim());
        if (whatsappFrom != null) settingsService.updateSetting(KEY_WHATSAPP_FROM, whatsappFrom.trim());
        if (enabled != null) settingsService.updateSetting(KEY_ENABLED, enabled.toString());
    }

    private String decrypt(String stored) {
        if (stored == null || stored.isBlank()) return stored;
        if (!stored.startsWith(ENC_PREFIX)) return stored;
        try {
            return encryptionUtil.decrypt(stored.substring(ENC_PREFIX.length()));
        } catch (Exception e) {
            log.error("Stored Twilio token could not be decrypted (ENCRYPTION_SECRET changed?) — ignoring it");
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
