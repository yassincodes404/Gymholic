package com.gymholic.auth;

import com.gymholic.auth.dto.AuthResponse;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.notification.EmailService;
import com.gymholic.security.JwtService;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Email confirmation codes (OTP) for sign-up and sign-in. Users receive a
 * 6-digit code at their address and must enter it before tokens are issued;
 * after one successful confirmation the account is trusted for good.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final Duration CODE_TTL = Duration.ofMinutes(10);
    private static final Duration RESEND_THROTTLE = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationCodeRepository codeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final AdminBootstrapService adminBootstrapService;

    /** Kill switch for the whole flow (emergency rollback / local dev). */
    @Value("${app.auth.email-verification-required:true}")
    private boolean verificationRequired;

    public boolean isVerificationRequired() {
        return verificationRequired;
    }

    /**
     * Emails a fresh code to the user and returns the challenge response the
     * auth endpoints send back instead of tokens. Re-sends are throttled.
     */
    @Transactional
    public AuthResponse issueChallenge(User user, String purpose) {
        EmailVerificationCode active = codeRepository
            .findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())
            .orElse(null);

        if (active != null && !active.isExpired()
                && active.getCreatedAt().isAfter(Instant.now().minus(RESEND_THROTTLE))) {
            // Fresh code already on its way — don't spam the inbox.
            return challengeResponse(user);
        }

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        EmailVerificationCode entity = EmailVerificationCode.builder()
            .user(user)
            .codeHash(passwordEncoder.encode(code))
            .expiresAt(Instant.now().plus(CODE_TTL))
            .build();
        codeRepository.save(entity);

        // Dev convenience: without a mail sink (MailHog/Brevo) the code is
        // still recoverable from the logs.
        log.info("Issuing email verification code for {} ({})", user.getEmail(), purpose);

        try {
            emailService.sendEmailNow(
                user.getEmail(),
                "Your Gymholic confirmation code",
                "email-verification-code",
                Map.of(
                    "name", user.getFirstName(),
                    "code", code,
                    "expiresMinutes", CODE_TTL.toMinutes()));
        } catch (Exception e) {
            // The user can retry via the resend endpoint once the mail
            // provider is reachable; never fail the auth request itself.
            log.error("Could not send verification code to {}: {}", user.getEmail(), e.getMessage());
        }

        return challengeResponse(user);
    }

    /**
     * Validates the entered code, marks the account verified, issues tokens.
     * Deliberately not one big transaction: a rejected code must still commit
     * its attempt counter, which a rolled-back throwing transaction would undo.
     */
    public AuthResponse verify(String email, String code) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));

        if (code == null || !code.trim().matches("\\d{6}")) {
            throw new BadRequestException("Enter the 6-digit code from your email.");
        }

        EmailVerificationCode entity = codeRepository
            .findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())
            .orElseThrow(() -> new BadRequestException("No active code — please request a new one."));

        if (entity.isConsumed() || entity.isExpired()) {
            throw new BadRequestException("This code has expired — please request a new one.");
        }
        if (entity.getAttempts() >= MAX_ATTEMPTS) {
            throw new BadRequestException("Too many incorrect attempts — please request a new code.");
        }

        if (!passwordEncoder.matches(code.trim(), entity.getCodeHash())) {
            entity.setAttempts(entity.getAttempts() + 1);
            codeRepository.save(entity);
            int left = MAX_ATTEMPTS - entity.getAttempts();
            throw new BadRequestException(left > 0
                ? "Incorrect code. " + left + " attempt" + (left == 1 ? "" : "s") + " left."
                : "Too many incorrect attempts — please request a new code.");
        }

        entity.setConsumedAt(Instant.now());
        codeRepository.save(entity);

        user.setEmailVerified(true);
        User saved = userRepository.save(user);
        adminBootstrapService.promoteIfBootstrapEmail(saved.getEmail());

        UserDetails userDetails = userDetailsService.loadUserByUsername(saved.getEmail());
        return AuthResponse.builder()
            .accessToken(jwtService.generateToken(userDetails))
            .refreshToken(jwtService.generateRefreshToken(userDetails))
            .tokenType("Bearer")
            .userId(saved.getId())
            .email(saved.getEmail())
            .firstName(saved.getFirstName())
            .lastName(saved.getLastName())
            .role(saved.getRole())
            .emailVerified(true)
            .build();
    }

    /** Re-sends the code (throttled) for a user that is not verified yet. */
    @Transactional
    public AuthResponse resend(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        if (user.isEmailVerified()) {
            throw new BadRequestException("This account is already verified — please sign in.");
        }
        return issueChallenge(user, "resend");
    }

    private AuthResponse challengeResponse(User user) {
        return AuthResponse.builder()
            .verificationRequired(true)
            .email(user.getEmail())
            .emailVerified(false)
            .build();
    }
}
