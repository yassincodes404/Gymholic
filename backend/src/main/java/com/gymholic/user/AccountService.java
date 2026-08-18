package com.gymholic.user;

import com.gymholic.auth.EmailVerificationService;
import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.notification.NotificationService;
import com.gymholic.user.dto.UserDto;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Account self-service (password change, email change, deletion) and the
 * admin activate/deactivate actions. Every mutation emails the owner —
 * see the account templates in resources/templates.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final EmailVerificationService emailVerificationService;

    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        User user = requireUser(email);
        if (currentPassword == null || user.getPassword() == null
                || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Your current password is incorrect.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new BadRequestException("New password must be at least 8 characters.");
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestException("The new password must be different from the current one.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        notificationService.sendPasswordChanged(user.getEmail(), user.getFirstName());
    }

    /** Step 1 of an email change — emails a confirmation code to the new address. */
    public void requestEmailChange(String email, String newEmail) {
        User user = requireUser(email);
        emailVerificationService.requestEmailChange(user, newEmail);
    }

    /** Step 2 — consumes the code and moves the account to the new address. */
    @Transactional
    public void confirmEmailChange(String currentEmail, String code) {
        emailVerificationService.confirmEmailChange(currentEmail, code);
    }

    /**
     * Soft-deletes the account: personal data is wiped and the address is
     * anonymised so login becomes impossible, while booking/payment records
     * keep their referential integrity. Emails the confirmation first.
     */
    @Transactional
    public void deleteAccount(String email, String password) {
        User user = requireUser(email);
        if (password == null || user.getPassword() == null
                || !passwordEncoder.matches(password, user.getPassword())) {
            throw new BadRequestException("Password is incorrect.");
        }

        String originalEmail = user.getEmail();
        notificationService.sendAccountDeleted(originalEmail, user.getFirstName());

        user.setActive(false);
        user.setEmailVerified(false);
        user.setEmail("deleted+" + user.getId() + "+" + Instant.now().toEpochMilli() + "@gymholic.invalid");
        user.setFirstName("Deleted");
        user.setLastName("User");
        user.setPhone(null);
        user.setBio(null);
        user.setProfileImageUrl(null);
        user.setGoogleId(null);
        userRepository.save(user);

        log.info("Account {} self-deleted (anonymised as {})", originalEmail, user.getEmail());
    }

    /** Admin action — re-enables or suspends an account and notifies the owner. */
    @Transactional
    public UserDto setUserActive(Long userId, boolean active, String actingAdminEmail) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (active == user.isActive()) {
            return mapToDto(user); // idempotent
        }
        if (active && user.getEmail().endsWith("@gymholic.invalid")) {
            throw new BadRequestException("This account was deleted and cannot be reactivated.");
        }
        if (user.getEmail().equals(actingAdminEmail)) {
            throw new BadRequestException("You cannot deactivate your own account.");
        }

        user.setActive(active);
        User saved = userRepository.save(user);

        if (active) {
            notificationService.sendAccountActivated(saved.getEmail(), saved.getFirstName());
        } else {
            notificationService.sendAccountDeactivated(saved.getEmail(), saved.getFirstName());
        }
        return mapToDto(saved);
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private UserDto mapToDto(User user) {
        return UserDto.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .phone(user.getPhone())
            .role(user.getRole())
            .profileImageUrl(user.getProfileImageUrl())
            .bio(user.getBio())
            .active(user.isActive())
            .createdAt(user.getCreatedAt())
            .build();
    }
}
