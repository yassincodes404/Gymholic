package com.gymholic.auth;

import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.util.PhoneUtils;
import com.gymholic.notification.BrevoSmsService;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

/**
 * Phone-number verification over Brevo SMS, mirroring the email code flow:
 * a 6-digit code is texted to the NEW number; only after it checks out does
 * the number land on the account (with the verified flag). Codes are stored
 * hashed, expire after 10 minutes, lock after 5 wrong attempts and re-sends
 * are throttled to one per minute.
 *
 * Also owns the mandatory-verification policy: when
 * {@code app.auth.phone-verification-required} is on (the default), booking
 * and order flows call {@link #requireVerifiedPhone(User)} and are refused
 * until the account owns a verified number.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PhoneVerificationService {

    private static final Duration CODE_TTL = Duration.ofMinutes(10);
    private static final Duration RESEND_THROTTLE = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PhoneVerificationCodeRepository codeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BrevoSmsService smsService;

    /**
     * Kill switch for the mandatory gate (emergency rollback / Brevo SMS out
     * of credits). Defaults ON — verification is mandatory unless explicitly
     * disabled with PHONE_VERIFICATION_REQUIRED=false.
     */
    @Value("${app.auth.phone-verification-required:true}")
    private boolean phoneVerificationRequired;

    public boolean isRequired() {
        return phoneVerificationRequired;
    }

    /**
     * Hard gate for money/booking flows: the account must own a verified
     * phone number when the policy requires it.
     */
    public void requireVerifiedPhone(User user) {
        if (!phoneVerificationRequired || user.isPhoneVerified()) {
            return;
        }
        if (!smsService.isSmsActive()) {
            throw new BadRequestException(
                "Phone verification is currently unavailable on our side — please try again shortly.");
        }
        throw new BadRequestException(user.getPhone() == null
            ? "Add and verify your phone number to continue — open Account → Profile and confirm the SMS code."
            : "Verify your phone number to continue — open Account → Profile and confirm the code we texted you.");
    }

    /**
     * Step 1: texts a code to the new number. The account is untouched until
     * {@link #confirmPhoneChange}. Returns the masked number for UI display.
     *
     * Deliberately not transactional end-to-end: the SMS goes out before the
     * request returns, so a failure surfaces to the user immediately.
     */
    public String requestPhoneChange(String email, String rawPhone) {
        User user = requireUser(email);
        if (rawPhone == null || rawPhone.trim().isEmpty()) {
            throw new BadRequestException("Enter your phone number.");
        }
        if (!PhoneUtils.isPlausiblePhone(rawPhone)) {
            throw new BadRequestException(
                "Enter a valid phone number with country code, e.g. +20 100 000 0000.");
        }
        String e164 = PhoneUtils.toE164(rawPhone);
        if (e164.equals(PhoneUtils.toE164(user.getPhone())) && user.isPhoneVerified()) {
            throw new BadRequestException("That number is already verified on your account.");
        }
        if (userRepository.existsByPhoneAndIdNot(e164, user.getId())) {
            throw new BadRequestException("That number is already linked to another account.");
        }
        if (!smsService.isSmsActive()) {
            throw new BadRequestException(
                "SMS verification is temporarily unavailable — please try again later.");
        }

        // Throttle only an identical re-send of the same challenge; a number
        // change retires the old code and sends a fresh one straight away.
        PhoneVerificationCode live = codeRepository
            .findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())
            .orElse(null);
        if (live != null && live.getPhone().equals(e164) && !live.isExpired()
            && live.getCreatedAt().isAfter(Instant.now().minus(RESEND_THROTTLE))) {
            return PhoneUtils.mask(e164);
        }
        codeRepository.consumeAllByUserId(user.getId(), Instant.now());

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        codeRepository.save(PhoneVerificationCode.builder()
            .user(user)
            .phone(e164)
            .codeHash(passwordEncoder.encode(code))
            .expiresAt(Instant.now().plus(CODE_TTL))
            .build());

        String error = smsService.sendSmsNow(e164,
            "Gymholic: your verification code is " + code
                + ". It expires in " + CODE_TTL.toMinutes() + " minutes. Don't share it.");
        if (error != null) {
            log.error("Phone verification SMS to {} failed: {}", PhoneUtils.mask(e164), error);
            throw new BadRequestException(
                "Could not send the verification SMS — check the number and try again.");
        }
        log.info("Phone verification code issued for user {} → {}", user.getId(), PhoneUtils.mask(e164));
        return PhoneUtils.mask(e164);
    }

    /**
     * Step 2: applies the pending number once the code checks out. The
     * attempt counter must survive a rejected code, so — like the email
     * flow — this is not one big transaction that would roll it back.
     */
    public User confirmPhoneChange(String email, String code) {
        User user = requireUser(email);
        if (code == null || !code.trim().matches("\\d{6}")) {
            throw new BadRequestException("Enter the 6-digit code we texted you.");
        }
        PhoneVerificationCode entity = codeRepository
            .findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(user.getId())
            .orElseThrow(() -> new BadRequestException("No active code — request a new one first."));
        if (entity.isExpired()) {
            throw new BadRequestException("This code has expired — request a new one.");
        }
        if (entity.getAttempts() >= MAX_ATTEMPTS) {
            throw new BadRequestException("Too many incorrect attempts — request a new code.");
        }
        if (!passwordEncoder.matches(code.trim(), entity.getCodeHash())) {
            entity.setAttempts(entity.getAttempts() + 1);
            codeRepository.save(entity);
            int left = MAX_ATTEMPTS - entity.getAttempts();
            throw new BadRequestException(left > 0
                ? "Incorrect code. " + left + " attempt" + (left == 1 ? "" : "s") + " left."
                : "Too many incorrect attempts — request a new code.");
        }

        entity.setConsumedAt(Instant.now());
        codeRepository.save(entity);

        user.setPhone(entity.getPhone());
        user.setPhoneVerified(true);
        User saved = userRepository.save(user);
        log.info("Phone verified for user {} → {}", saved.getId(), PhoneUtils.mask(saved.getPhone()));
        return saved;
    }

    private User requireUser(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Sign in first.");
        }
        return userRepository.findByEmail(email.trim())
            .orElseThrow(() -> new BadRequestException("Sign in first."));
    }
}
