package com.gymholic.notification;

import com.gymholic.common.response.ApiResponse;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Admin → Integrations: transactional email settings (Brevo) plus a
 * send-a-test-email action so the admin can confirm delivery end to end.
 */
@RestController
@RequestMapping("/api/admin/email")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class EmailAdminController {

    private final BrevoConfigService brevoConfigService;
    private final EmailService emailService;

    public record SaveBrevoRequest(String apiKey, String senderEmail, String senderName, Boolean enabled) {}
    public record TestEmailRequest(@NotBlank String to) {}

    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> status() {
        BrevoConfigService.BrevoCredentials creds = brevoConfigService.getBrevoCredentials();
        return ApiResponse.success(Map.of(
            "activeProvider", brevoConfigService.isBrevoActive() ? "brevo" : "smtp",
            "brevo", Map.of(
                "enabled", brevoConfigService.isBrevoEnabled(),
                "configured", creds.complete(),
                "active", brevoConfigService.isBrevoActive(),
                "apiKeyMasked", brevoConfigService.maskedApiKey(),
                "senderEmail", creds.senderEmail() == null ? "" : creds.senderEmail(),
                "senderName", creds.senderName() == null ? "" : creds.senderName())));
    }

    @PutMapping("/brevo")
    public ApiResponse<Map<String, Object>> saveBrevo(@RequestBody SaveBrevoRequest request) {
        brevoConfigService.saveBrevoConfig(
            request.apiKey(), request.senderEmail(), request.senderName(), request.enabled());
        return ApiResponse.success("Brevo settings saved", status().getData());
    }

    /** Sends a test email through the currently active provider. */
    @PostMapping("/test")
    public ApiResponse<Void> sendTest(@RequestBody TestEmailRequest request) {
        String provider = brevoConfigService.isBrevoActive() ? "Brevo API" : "SMTP";
        String sentAt = ZonedDateTime.now(ZoneId.of("UTC"))
            .format(DateTimeFormatter.ofPattern("MMM d, yyyy 'at' HH:mm 'UTC'"));
        try {
            emailService.sendEmailNow(
                request.to(),
                "Gymholic test email — " + provider,
                "test-email",
                Map.of("name", "Admin", "provider", provider, "sentAt", sentAt));
        } catch (Exception e) {
            return ApiResponse.error("Test email failed: " + e.getMessage());
        }
        return ApiResponse.success("Test email sent to " + request.to() + " via " + provider, null);
    }
}
