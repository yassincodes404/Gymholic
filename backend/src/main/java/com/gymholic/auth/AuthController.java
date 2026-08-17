package com.gymholic.auth;

import com.gymholic.auth.dto.AuthResponse;
import com.gymholic.auth.dto.GoogleAuthRequest;
import com.gymholic.auth.dto.LoginRequest;
import com.gymholic.auth.dto.RegisterRequest;
import com.gymholic.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GoogleSignInService googleSignInService;
    private final EmailVerificationService emailVerificationService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Registration successful", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/google/signin")
    public ResponseEntity<ApiResponse<AuthResponse>> googleSignIn(
            @Valid @RequestBody GoogleAuthRequest request) {
        AuthResponse response = googleSignInService.authenticateWithGoogle(request.getIdToken());
        return ResponseEntity.ok(ApiResponse.success("Google sign-in successful", response));
    }

    /**
     * Confirms sign-up/sign-in with the 6-digit code that was emailed.
     * Marks the account verified and returns the auth tokens.
     */
    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyEmail(
            @RequestBody Map<String, String> request) {
        AuthResponse response = emailVerificationService.verify(
            request.get("email"), request.get("code"));
        return ResponseEntity.ok(ApiResponse.success("Email verified", response));
    }

    /** Re-sends the confirmation code (rate-limited to once a minute). */
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<AuthResponse>> resendVerification(
            @RequestBody Map<String, String> request) {
        AuthResponse response = emailVerificationService.resend(request.get("email"));
        return ResponseEntity.ok(ApiResponse.success("Verification code re-sent", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        AuthResponse response = authService.refreshToken(refreshToken);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed", response));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @RequestBody Map<String, String> request) {
        // TODO: Implement password reset email
        return ResponseEntity.ok(ApiResponse.success("Password reset email sent", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @RequestBody Map<String, String> request) {
        // TODO: Implement password reset
        return ResponseEntity.ok(ApiResponse.success("Password reset successful", null));
    }
}
