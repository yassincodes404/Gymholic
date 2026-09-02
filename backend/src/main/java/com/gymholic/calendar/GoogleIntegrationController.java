package com.gymholic.calendar;

import com.gymholic.calendar.dto.GoogleConnectionStatusDto;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import com.gymholic.user.entity.User;
import com.gymholic.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/integrations/google")
@RequiredArgsConstructor
public class GoogleIntegrationController {

    private final GoogleOAuthService oAuthService;
    private final GoogleSecurityEventService securityEventService;
    private final UserRepository userRepository;

    private Long getCurrentUserId() {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) {
            throw new RuntimeException("User not authenticated");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    @GetMapping("/connect")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TRAINER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> connectGoogleCalendar() {
        Long currentUserId = getCurrentUserId();
        String authUrl = oAuthService.getAuthorizationUrl(currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Authorization URL generated", Map.of("url", authUrl)));
    }

    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private String frontendUrl;

    @GetMapping("/callback")
    public ResponseEntity<Void> oauthCallback(@RequestParam("code") String code, @RequestParam("state") String state) {
        String redirectBase = frontendUrl + "/admin/integrations";
        try {
            oAuthService.exchangeCodeForToken(code, state);
            // Browser-facing endpoint: land the user back on the admin integrations page.
            return ResponseEntity.status(302)
                .header("Location", redirectBase + "?google=connected")
                .build();
        } catch (Exception e) {
            String message = java.net.URLEncoder.encode(e.getMessage() == null ? "unknown error" : e.getMessage(),
                java.nio.charset.StandardCharsets.UTF_8);
            return ResponseEntity.status(302)
                .header("Location", redirectBase + "?google=error&message=" + message)
                .build();
        }
    }

    /**
     * Cross-Account Protection (RISC) receiver — Google pushes signed
     * security-event tokens here (endpoint registered in the Cloud console).
     * 202 = authentic token accepted; 400 = failed verification, so Google
     * retries and flags the delivery.
     */
    @PostMapping(value = "/risc", consumes = {"application/jwt", "text/plain", "application/*+jwt", "*/*"})
    public ResponseEntity<Void> securityEvent(@RequestBody(required = false) String setToken) {
        if (securityEventService.handleSecurityEventToken(setToken)) {
            return ResponseEntity.accepted().build();
        }
        return ResponseEntity.badRequest().build();
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TRAINER')")
    public ResponseEntity<ApiResponse<GoogleConnectionStatusDto>> getStatus() {
        Long currentUserId = getCurrentUserId();
        GoogleConnectionStatusDto status = oAuthService.getConnectionStatus(currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Status retrieved", status));
    }

    @DeleteMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TRAINER')")
    public ResponseEntity<ApiResponse<Void>> disconnect() {
        Long currentUserId = getCurrentUserId();
        oAuthService.disconnect(currentUserId);
        return ResponseEntity.ok(ApiResponse.success("Google Calendar disconnected successfully", null));
    }
}