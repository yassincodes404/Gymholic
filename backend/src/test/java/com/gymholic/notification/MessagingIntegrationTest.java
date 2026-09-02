package com.gymholic.notification;

import com.gymholic.settings.SettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SMS + WhatsApp (Twilio) messaging: config round-trip with the encrypted
 * auth token, channel activation flags, and the guards that stop the test
 * send before it ever reaches Twilio's API (no network in tests).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MessagingIntegrationTest {

    @Autowired
    private MessagingConfigService messagingConfigService;

    @Autowired
    private MessagingService messagingService;

    @Autowired
    private SettingsService settingsService;

    @Test
    void savesAndReadsTwilioConfigWithEncryptedToken() {
        messagingConfigService.saveTwilioConfig(
            "ACTEST1234567890", "super-secret-token-value",
            "+15550001111", "+15550002222", true);

        var creds = messagingConfigService.getTwilioCredentials();
        assertThat(creds.accountSid()).isEqualTo("ACTEST1234567890");
        // The token decrypts back to exactly what was saved.
        assertThat(creds.authToken()).isEqualTo("super-secret-token-value");
        assertThat(creds.smsFrom()).isEqualTo("+15550001111");
        assertThat(creds.whatsappFrom()).isEqualTo("+15550002222");
        assertThat(creds.complete()).isTrue();

        // The token never sits in the settings table as plaintext.
        String stored = settingsService.getAllSettings().get(MessagingConfigService.KEY_AUTH_TOKEN);
        assertThat(stored).startsWith("enc:").doesNotContain("super-secret-token-value");

        // Masked form hides everything but the edges.
        String masked = messagingConfigService.maskedAuthToken();
        assertThat(masked).doesNotContain("super-secret-token-value");
        assertThat(masked).startsWith("super-").endsWith("alue").contains("…");

        assertThat(messagingConfigService.isEnabled()).isTrue();
        assertThat(messagingConfigService.isActive()).isTrue();
        assertThat(messagingConfigService.smsActive()).isTrue();
        assertThat(messagingConfigService.whatsappActive()).isTrue();
    }

    @Test
    void whatsappChannelStaysInactiveWithoutASender() {
        messagingConfigService.saveTwilioConfig(
            "ACTEST1234567890", "super-secret-token-value",
            "+15550001111", null, true);

        assertThat(messagingConfigService.smsActive()).isTrue();
        assertThat(messagingConfigService.whatsappActive()).isFalse();
        // One channel is enough for the config to be usable.
        assertThat(messagingConfigService.isActive()).isTrue();
    }

    @Test
    void blankSenderKeepsPreviouslyStoredValue() {
        messagingConfigService.saveTwilioConfig(
            "ACTEST1234567890", "super-secret-token-value", null, "+15550002222", true);
        // Null/blank SMS sender = "keep what's stored" (nothing) → SMS stays off.
        assertThat(messagingConfigService.smsActive()).isFalse();
        assertThat(messagingConfigService.whatsappActive()).isTrue();
    }

    @Test
    void disabledMessagingStopsTheTestSendBeforeTwilio() {
        messagingConfigService.saveTwilioConfig(
            "ACTEST1234567890", "super-secret-token-value",
            "+15550001111", null, false);

        String result = messagingService.sendMessageToNumber("+201234567890", "hello");
        assertThat(result).isEqualTo("Messaging is disabled in settings.");
    }

    @Test
    void incompleteCredentialsStopTheTestSend() {
        // Enabled but no senders at all → credentials incomplete.
        messagingConfigService.saveTwilioConfig(
            "ACTEST1234567890", "super-secret-token-value", null, null, true);

        String result = messagingService.sendMessageToNumber("+201234567890", "hello");
        assertThat(result).contains("incomplete");
    }

    @Test
    void blankDestinationIsRejectedBeforeSending() {
        messagingConfigService.saveTwilioConfig(
            "ACTEST1234567890", "super-secret-token-value",
            "+15550001111", null, true);

        String result = messagingService.sendMessageToNumber("   ", "hello");
        assertThat(result).contains("phone number is required");
    }
}
