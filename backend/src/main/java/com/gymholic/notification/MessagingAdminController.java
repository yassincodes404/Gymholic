package com.gymholic.notification;

import com.gymholic.common.response.ApiResponse;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin → Integrations: SMS + WhatsApp settings (Twilio) plus a send-a-test
 * action, mirroring the email (Brevo) screen. One Twilio account, two
 * channels, each toggleable.
 */
@RestController
@RequestMapping("/api/admin/messaging")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class MessagingAdminController {

    private final MessagingConfigService messagingConfigService;
    private final MessagingService messagingService;

    public record SaveTwilioRequest(String accountSid, String authToken,
                                    String smsFrom, String whatsappFrom, Boolean enabled) {}
    public record TestMessageRequest(@NotBlank String to) {}

    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> status() {
        MessagingConfigService.TwilioCredentials creds = messagingConfigService.getTwilioCredentials();
        return ApiResponse.success(Map.of(
            "enabled", messagingConfigService.isEnabled(),
            "configured", creds.complete(),
            "active", messagingConfigService.isActive(),
            "smsActive", messagingConfigService.smsActive(),
            "whatsappActive", messagingConfigService.whatsappActive(),
            "twilio", Map.of(
                "accountSid", creds.accountSid() == null ? "" : creds.accountSid(),
                "authTokenMasked", messagingConfigService.maskedAuthToken(),
                "smsFrom", creds.smsFrom() == null ? "" : creds.smsFrom(),
                "whatsappFrom", creds.whatsappFrom() == null ? "" : creds.whatsappFrom())));
    }

    @PutMapping("/twilio")
    public ApiResponse<Map<String, Object>> saveTwilio(@RequestBody SaveTwilioRequest request) {
        messagingConfigService.saveTwilioConfig(
            request.accountSid(), request.authToken(),
            request.smsFrom(), request.whatsappFrom(), request.enabled());
        return ApiResponse.success("Messaging settings saved", status().getData());
    }

    /** Sends a test message (SMS and WhatsApp, wherever active) to the given number. */
    @PostMapping("/test")
    public ApiResponse<Void> sendTest(@RequestBody TestMessageRequest request) {
        try {
            String error = messagingService.sendMessageToNumber(
                request.to(),
                "Gymholic test message — SMS & WhatsApp messaging is working.");
            if (error != null) {
                return ApiResponse.error("Test message failed: " + error);
            }
        } catch (Exception e) {
            return ApiResponse.error("Test message failed: " + e.getMessage());
        }
        return ApiResponse.success("Test message sent to " + request.to(), null);
    }
}
