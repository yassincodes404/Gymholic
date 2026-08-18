package com.gymholic.auth;

import com.gymholic.common.exception.BadRequestException;
import com.gymholic.notification.NotificationService;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

/**
 * Forgot-password / reset-password. The emailed link carries a 64-hex-char
 * random token; only its SHA-256 is stored. Tokens expire after 30 minutes
 * and a reset invalidates every other outstanding token for the account.
 * The "request" path always reports success so it can't be used to discover
 * which emails have accounts.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Duration TOKEN_TTL = Duration.ofMinutes(30);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Transactional
    public void requestReset(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Enter your email address.");
        }
        userRepository.findByEmail(email.trim())
            .filter(User::isActive)
            .ifPresent(this::issueResetLink);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Reset token is missing.");
        }
        PasswordResetToken entity = tokenRepository.findByTokenHash(sha256(token))
            .orElseThrow(() -> new BadRequestException("This reset link is invalid or has expired."));

        if (entity.isUsed()) {
            throw new BadRequestException("This reset link has already been used.");
        }
        if (entity.isExpired()) {
            throw new BadRequestException("This reset link has expired — request a new one.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters.");
        }

        entity.setUsedAt(Instant.now());
        tokenRepository.save(entity);

        User user = entity.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        User saved = userRepository.save(user);

        // Any other outstanding link for this account is now dead.
        invalidateOutstandingTokens(saved);

        notificationService.sendPasswordChanged(saved.getEmail(), saved.getFirstName());
        log.info("Password reset completed for user {}", saved.getId());
    }

    private void issueResetLink(User user) {
        // One live link at a time.
        invalidateOutstandingTokens(user);

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);

        PasswordResetToken entity = PasswordResetToken.builder()
            .user(user)
            .tokenHash(sha256(token))
            .expiresAt(Instant.now().plus(TOKEN_TTL))
            .build();
        tokenRepository.save(entity);

        String resetLink = frontendUrl() + "/reset-password?token=" + token;
        notificationService.sendPasswordReset(user.getEmail(), user.getFirstName(), resetLink);
    }

    private void invalidateOutstandingTokens(User user) {
        List<PasswordResetToken> open = tokenRepository.findAllByUserIdAndUsedAtIsNull(user.getId());
        open.forEach(t -> t.setUsedAt(Instant.now()));
        tokenRepository.saveAll(open);
    }

    private String frontendUrl() {
        return allowedOrigins.split(",")[0].trim();
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
