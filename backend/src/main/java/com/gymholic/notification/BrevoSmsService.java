package com.gymholic.notification;

import com.gymholic.common.util.PhoneUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Transactional SMS over Brevo's HTTPS API — the text sibling of
 * EmailService (one Brevo account, one API key, two channels). Used for
 * phone-verification one-time codes (synchronous, the caller must know the
 * outcome) and fire-and-forget notifications. Failures are logged, never
 * thrown at callers that can't act on them.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BrevoSmsService {

    private static final String BREVO_SMS_API_URL = "https://api.brevo.com/v3/transactionalSMS/sms";
    /** A long text bills per segment and truncates badly — keep OTP sends short. */
    private static final int MAX_CONTENT_LENGTH = 640;

    private final BrevoConfigService brevoConfigService;

    /** True when the Brevo account is active AND an SMS sender is configured. */
    public boolean isSmsActive() {
        return brevoConfigService.isSmsActive();
    }

    /**
     * Synchronous send for flows that must know the outcome (verification
     * codes). Returns null on success, otherwise a short error description.
     *
     * @param to destination in E.164 form (+201234567890)
     */
    public String sendSmsNow(String to, String text) {
        if (!brevoConfigService.isBrevoEnabled()) {
            return "Brevo is disabled in settings.";
        }
        String apiKey = brevoConfigService.getBrevoCredentials().apiKey();
        if (apiKey == null || apiKey.isBlank()) {
            return "No Brevo API key configured.";
        }
        String sender = brevoConfigService.getSmsSender();
        if (sender == null || sender.isBlank()) {
            return "No SMS sender configured.";
        }
        String recipient = PhoneUtils.toE164(to);
        if (recipient == null) {
            return "A valid destination number is required.";
        }
        if (text == null || text.isBlank()) {
            return "Message text is required.";
        }
        String content = text.length() > MAX_CONTENT_LENGTH ? text.substring(0, MAX_CONTENT_LENGTH) : text;

        try {
            ResponseEntity<String> response = RestClient.create()
                .post()
                .uri(BREVO_SMS_API_URL)
                .header("api-key", apiKey)
                .header("accept", "application/json")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                    "sender", sender,
                    "recipient", recipient,
                    "content", content,
                    "type", "transactional"))
                .retrieve()
                .toEntity(String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("SMS sent via Brevo to {} (sender {})", PhoneUtils.mask(recipient), sender);
                return null;
            }
            return "HTTP " + response.getStatusCode();
        } catch (Exception e) {
            return e.getMessage();
        }
    }

    /** Fire-and-forget send used for notifications — never throws. */
    @Async
    public void sendSms(String to, String text) {
        try {
            String error = sendSmsNow(to, text);
            if (error != null) {
                log.warn("SMS delivery failed to {}: {}", PhoneUtils.mask(PhoneUtils.toE164(to)), error);
            }
        } catch (Exception e) {
            log.warn("SMS delivery failed: {}", e.getMessage());
        }
    }
}
