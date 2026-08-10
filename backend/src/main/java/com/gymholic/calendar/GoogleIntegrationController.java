package com.gymholic.calendar;

import com.gymholic.calendar.dto.GoogleConnectionStatusDto;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import com.gymholic.user.entity.User;
import com.gymholic.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/integrations/google")
@RequiredArgsConstructor
public class GoogleIntegrationController {

    private final GoogleOAuthService oAuthService;
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

    @GetMapping("/callback")
    public ResponseEntity<ApiResponse<String>> oauthCallback(@RequestParam("code") String code, @RequestParam("state") String state) {
        oAuthService.exchangeCodeForToken(code, state);
        return ResponseEntity.ok(ApiResponse.success("Google Calendar connected successfully", null));
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