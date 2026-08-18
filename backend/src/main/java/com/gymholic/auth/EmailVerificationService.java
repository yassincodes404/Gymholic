package com.gymholic.auth;

import com.gymholic.auth.dto.AuthResponse;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.notification.EmailService;
import com.gymholic.notification.LoginNotificationService;
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
 * One-time 6-digit email codes, shared by three flows:
 * VERIFY (confirm an address on sign-up / first sign-in), LOGIN
 * (passwordless sign-in) and EMAIL_CHANGE (confirm a new address).
 * Codes are stored hashed, expire after 10 minutes and lock after 5 wrong
 * attempts. A successful LOGIN code also marks the address verified —
 * receiving it proves inbox ownership.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    public static final String PURPOSE_VERIFY = "VERIFY";
    public static final String PURPOSE_LOGIN = "LOGIN";
    public static final String PURPOSE_EMAIL_CHANGE = "EMAIL_CHANGE";

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
    private final LoginNotificationService loginNotificationService;

    /** Kill switch for the whole flow (emergency rollback / local dev). */
    @Value("${app.auth.email-verification-required:true}")
    private boolean verificationRequired;

    public boolean isVerificationRequired() {
        return verificationRequired;
    }

    /**
     * Emails a fresh verification code to the user and returns the challenge
     * response the auth endpoints send back instead of tokens. Re-sends are
     * throttled.
     */
    @Transactional
    public AuthResponse issueChallenge(User user, String purpose) {
        issueCode(user, PURPOSE_VERIFY, null, "email-verification-code",
            "Your Gymholic confirmation code");
        return challengeResponse(user);
    }

    /**
     * Passwordless sign-in step 1: emails a login code when the address
     * belongs to an active account. Always behaves the same for unknown
     * addresses so the endpoint can't be used to enumerate accounts.
     */
    public void requestLoginCode(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Enter your email address.");
        }
        userRepository.findByEmail(email.trim())
            .filter(User::isActive)
            .ifPresent(user -> issueCode(user, PURPOSE_LOGIN, null, "otp-login-code",
                "Your Gymholic sign-in code"));
    }

    /** Passwordless sign-in step 2: validates the code and issues tokens. */
    public AuthResponse verifyLoginCode(String email, String code) {
        User user = requireUser(email);
        EmailVerificationCode entity = requireActiveCode(user, PURPOSE_LOGIN);
        checkCode(user, entity, code);

        entity.setConsumedAt(Instant.now());
        codeRepository.save(entity);

        boolean firstVerification = !user.isEmailVerified();
        user.setEmailVerified(true); // receiving the code proves inbox ownership
        User saved = userRepository.save(user);
        adminBootstrapService.promoteIfBootstrapEmail(saved.getEmail());

        if (firstVerification) {
            sendWelcome(saved);
        }
        loginNotificationService.notifyNewLoginIfNeeded(saved, "email sign-in code");
        return buildTokenResponse(saved);
    }

    /** Starts an email change: codes the NEW address before anything moves. */
    public void requestEmailChange(User user, String newEmail) {
        if (newEmail == null || newEmail.isBlank()) {
            throw new BadRequestException("Enter the new email address.");
        }
        String normalized = newEmail.trim();
        if (normalized.equalsIgnoreCase(user.getEmail())) {
            throw new BadRequestException("That is already your email address.");
        }
        if (userRepository.existsByEmail(normalized)) {
            throw new BadRequestException("That email is already registered to an account.");
        }
        issueCode(user, PURPOSE_EMAIL_CHANGE, normalized, "email-verification-code",
            "Confirm your new Gymholic email");
    }

    /** Completes an email change after the code sent to the new address. */
    @Transactional
    public User confirmEmailChange(String currentEmail, String code) {
        User user = requireUser(currentEmail);
        EmailVerificationCode entity = requireActiveCode(user, PURPOSE_EMAIL_CHANGE);
        checkCode(user, entity, code);

        String newEmail = entity.getTargetEmail();
        if (newEmail == null || userRepository.existsByEmail(newEmail)) {
            throw new BadRequestException("This change request is no longer valid — please start again.");
        }
        if (newEmail.equalsIgnoreCase(user.getEmail())) {
            entity.setConsumedAt(Instant.now());
            codeRepository.save(entity);
            return user; // already on this address — nothing to do
        }

        entity.setConsumedAt(Instant.now());
        codeRepository.save(entity);

        String oldEmail = user.getEmail();
        user.setEmail(newEmail);
        user.setEmailVerified(true); // the new address just proved itself
        User saved = userRepository.save(user);

        emailService.sendEmail(oldEmail, "Your Gymholic email address was changed", "email-changed",
            Map.of("name", firstName(saved), "oldEmail", oldEmail, "newEmail", newEmail));
        emailService.sendEmail(newEmail, "Your Gymholic email address was changed", "email-changed",
            Map.of("name", firstName(saved), "oldEmail", oldEmail, "newEmail", newEmail));
        return saved;
    }

    /**
     * Validates the entered code, marks the account verified, issues tokens.
     * Deliberately not one big transaction: a rejected code must still commit
     * its attempt counter, which a rolled-back throwing transaction would undo.
     */
    public AuthResponse verify(String email, String code) {
        User user = requireUser(email);

        if (code == null || !code.trim().matches("\\d{6}")) {
            throw new BadRequestException("Enter the 6-digit code from your email.");
        }

        EmailVerificationCode entity = requireActiveCode(user, PURPOSE_VERIFY);
        checkCode(user, entity, code);

        entity.setConsumedAt(Instant.now());
        codeRepository.save(entity);

        boolean firstVerification = !user.isEmailVerified();
        user.setEmailVerified(true);
        User saved = userRepository.save(user);
        adminBootstrapService.promoteIfBootstrapEmail(saved.getEmail());

        if (firstVerification) {
            sendWelcome(saved);
        }
        loginNotificationService.notifyNewLoginIfNeeded(saved, "email confirmation code");
        return buildTokenResponse(saved);
    }

    /** Re-sends the verification code (throttled) for a user that is not verified yet. */
    @Transactional
    public AuthResponse resend(String email) {
        User user = requireUser(email);
        if (user.isEmailVerified()) {
            throw new BadRequestException("This account is already verified — please sign in.");
        }
        return issueChallenge(user, "resend");
    }

    // ------------------------------------------------------------------
    // internals
    // ------------------------------------------------------------------

    private void issueCode(User user, String purpose, String targetEmail,
                           String template, String subject) {
        EmailVerificationCode active = codeRepository
            .findFirstByUserIdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId(), purpose)
            .orElse(null);

        if (active != null && !active.isExpired()
                && active.getCreatedAt().isAfter(Instant.now().minus(RESEND_THROTTLE))) {
            // Fresh code already on its way — don't spam the inbox.
            return;
        }

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        EmailVerificationCode entity = EmailVerificationCode.builder()
            .user(user)
            .codeHash(passwordEncoder.encode(code))
            .purpose(purpose)
            .targetEmail(targetEmail)
            .expiresAt(Instant.now().plus(CODE_TTL))
            .build();
        codeRepository.save(entity);

        // Dev convenience: without a mail sink (MailHog/Brevo) the code is
        // still recoverable from the logs.
        log.info("Issuing {} code for {}", purpose, user.getEmail());

        try {
            emailService.sendEmailNow(
                targetEmail != null ? targetEmail : user.getEmail(),
                subject,
                template,
                Map.of(
                    "name", firstName(user),
                    "code", code,
                    "expiresMinutes", CODE_TTL.toMinutes()));
        } catch (Exception e) {
            // The user can retry via the resend endpoint once the mail
            // provider is reachable; never fail the auth request itself.
            log.error("Could not send code to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    private EmailVerificationCode requireActiveCode(User user, String purpose) {
        EmailVerificationCode entity = codeRepository
            .findFirstByUserIdAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId(), purpose)
            .orElseThrow(() -> new BadRequestException("No active code — please request a new one."));
        if (entity.isConsumed() || entity.isExpired()) {
            throw new BadRequestException("This code has expired — please request a new one.");
        }
        if (entity.getAttempts() >= MAX_ATTEMPTS) {
            throw new BadRequestException("Too many incorrect attempts — please request a new code.");
        }
        return entity;
    }

    private void checkCode(User user, EmailVerificationCode entity, String code) {
        if (code == null || !code.trim().matches("\\d{6}")) {
            throw new BadRequestException("Enter the 6-digit code from your email.");
        }
        if (!passwordEncoder.matches(code.trim(), entity.getCodeHash())) {
            entity.setAttempts(entity.getAttempts() + 1);
            codeRepository.save(entity);
            int left = MAX_ATTEMPTS - entity.getAttempts();
            throw new BadRequestException(left > 0
                ? "Incorrect code. " + left + " attempt" + (left == 1 ? "" : "s") + " left."
                : "Too many incorrect attempts — please request a new code.");
        }
    }

    private void sendWelcome(User user) {
        emailService.sendEmail(
            user.getEmail(),
            "Welcome to Gymholic",
            "welcome",
            Map.of("name", firstName(user)));
    }

    private User requireUser(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required.");
        }
        return userRepository.findByEmail(email.trim())
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private AuthResponse buildTokenResponse(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        return AuthResponse.builder()
            .accessToken(jwtService.generateToken(userDetails))
            .refreshToken(jwtService.generateRefreshToken(userDetails))
            .tokenType("Bearer")
            .userId(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .role(user.getRole())
            .emailVerified(true)
            .build();
    }

    private AuthResponse challengeResponse(User user) {
        return AuthResponse.builder()
            .verificationRequired(true)
            .email(user.getEmail())
            .emailVerified(false)
            .build();
    }

    private String firstName(User user) {
        return user.getFirstName() != null ? user.getFirstName() : "there";
    }
}
