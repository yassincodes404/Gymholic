package com.gymholic.notification;

import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Optional;

/**
 * SMS + WhatsApp sender over Twilio's REST API — the messaging sibling of
 * EmailService. One send() fans out to every active channel (SMS and/or
 * WhatsApp); failures are logged and swallowed because a text must never
 * break a booking or payment flow. Messages are deliberately short (SMS
 * bills per segment): who, what, when, link.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessagingService {

    private final MessagingConfigService configService;
    private final UserRepository userRepository;

    /**
     * Fire-and-forget message to a user by email — resolves the phone from
     * the account (no phone on file → silently skipped). Never throws.
     */
    @Async
    public void sendUserMessage(String toEmail, String text) {
        try {
            if (toEmail == null || toEmail.isBlank()) return;
            Optional<User> user = userRepository.findByEmail(toEmail);
            if (user.isEmpty()) return;
            String phone = user.get().getPhone();
            if (phone == null || phone.isBlank()) {
                log.debug("No phone on file for {} — SMS/WhatsApp skipped", toEmail);
                return;
            }
            sendToNumber(phone, text);
        } catch (Exception e) {
            log.warn("Could not send the message to {}: {}", toEmail, e.getMessage());
        }
    }

    /** Explicit-number send (admin test). Returns an error string or null on success. */
    public String sendMessageToNumber(String to, String text) {
        MessagingConfigService.TwilioCredentials creds = configService.getTwilioCredentials();
        if (!configService.isEnabled()) return "Messaging is disabled in settings.";
        if (!creds.complete()) return "Twilio credentials are incomplete.";
        if (to == null || to.isBlank()) return "A destination phone number is required.";

        String e164 = normalize(to);
        StringBuilder outcome = new StringBuilder();
        boolean sentAny = false;

        if (configService.smsActive()) {
            String error = twilioSend(creds, creds.smsFrom(), e164, text);
            if (error == null) sentAny = true; else outcome.append("SMS failed: ").append(error).append(" ");
        }
        if (configService.whatsappActive()) {
            String error = twilioSend(creds, "whatsapp:" + creds.whatsappFrom(), "whatsapp:" + e164, text);
            if (error == null) sentAny = true; else outcome.append("WhatsApp failed: ").append(error);
        }
        if (!sentAny && outcome.isEmpty()) {
            return "No messaging channel is active — add an SMS or WhatsApp sender and enable the channel.";
        }
        return sentAny && outcome.isEmpty() ? null : outcome.toString().trim();
    }

    /** Sends over every active channel to the given number. Never throws. */
    private void sendToNumber(String phone, String text) {
        MessagingConfigService.TwilioCredentials creds = configService.getTwilioCredentials();
        if (!configService.isActive()) return;
        String e164 = normalize(phone);
        if (e164 == null) {
            log.warn("Phone number on file is not a valid destination — message skipped");
            return;
        }
        if (configService.smsActive()) {
            String error = twilioSend(creds, creds.smsFrom(), e164, text);
            if (error != null) log.warn("SMS delivery failed: {}", error);
        }
        if (configService.whatsappActive()) {
            String error = twilioSend(creds, "whatsapp:" + creds.whatsappFrom(), "whatsapp:" + e164, text);
            if (error != null) log.warn("WhatsApp delivery failed: {}", error);
        }
    }

    /**
     * One Twilio REST call. Returns null on success, otherwise a short
     * error description for logs and the admin test action.
     */
    private String twilioSend(MessagingConfigService.TwilioCredentials creds,
                              String from, String to, String body) {
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("To", to);
            form.add("From", from);
            form.add("Body", body);

            RestClient client = RestClient.builder()
                .baseUrl("https://api.twilio.com/2010-04-01/Accounts/" + creds.accountSid())
                .defaultHeaders(h -> h.setBasicAuth(creds.accountSid(), creds.authToken()))
                .build();

            ResponseEntity<String> response = client.post()
                .uri("/Messages.json")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .toEntity(String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Message sent via Twilio to {} (channel: {})", to, from.startsWith("whatsapp:") ? "whatsapp" : "sms");
                return null;
            }
            return "HTTP " + response.getStatusCode();
        } catch (Exception e) {
            return e.getMessage();
        }
    }

    /**
     * Keeps digits only and prefixes "+" unless the caller already included
     * it — profile phones are free-form, Twilio wants E.164.
     */
    private static String normalize(String raw) {
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.length() < 8 || digits.length() > 15) return null;
        return "+" + digits;
    }
}
