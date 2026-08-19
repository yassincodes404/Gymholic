package com.gymholic.auth;

import com.gymholic.auth.dto.AuthResponse;
import com.gymholic.auth.dto.LoginRequest;
import com.gymholic.common.enums.Role;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.AdminGateCookie;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Admin authentication controller.
 * Separate from public client authentication.
 * Only ADMIN users can authenticate here.
 */
@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> adminLogin(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = adminAuthService.adminLogin(request);
        if (response.getRole() == Role.ADMIN) {
            return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, AdminGateCookie.setCookieValue())
                .body(ApiResponse.success("Admin login successful", response));
        }
        return ResponseEntity.ok(ApiResponse.success("Admin login successful", response));
    }
}
