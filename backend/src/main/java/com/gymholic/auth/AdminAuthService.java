package com.gymholic.auth;

import com.gymholic.auth.dto.AuthResponse;
import com.gymholic.auth.dto.LoginRequest;
import com.gymholic.common.enums.Role;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.notification.LoginNotificationService;
import com.gymholic.security.JwtService;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

/**
 * Admin authentication service.
 * Only allows ADMIN users to authenticate through the admin portal.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final LoginNotificationService loginNotificationService;

    public AuthResponse adminLogin(LoginRequest request) {
        log.info("Admin login attempt for email: {}", request.getEmail());
        
        // Authenticate credentials
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()));

        // Load user and verify role
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new BadRequestException("User not found"));

        if (user.getRole() != Role.ADMIN) {
            log.warn("Non-admin user attempted admin login: {}", request.getEmail());
            throw new BadRequestException("Access denied. Admin privileges required.");
        }

        log.info("Admin login successful for {} with role {}", request.getEmail(), user.getRole());

        // Generate JWT tokens
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
        String accessToken = jwtService.generateToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        loginNotificationService.notifyNewLoginIfNeeded(user, "admin dashboard");
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .build();
    }
}
