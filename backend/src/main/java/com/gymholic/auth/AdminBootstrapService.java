package com.gymholic.auth;

import com.gymholic.common.enums.Role;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;

/**
 * Promotes trusted emails to ADMIN on any successful sign-in (password or Google).
 * Controlled by app.admin.bootstrap-emails (env: ADMIN_BOOTSTRAP_EMAILS).
 * This is how the owner/expert keeps admin access on any deployment (dev or VPS):
 * put your email in the env list — the first time you sign in, you get ADMIN.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrapService {

    private final UserRepository userRepository;

    @Value("${app.admin.bootstrap-emails:}")
    private String bootstrapEmails;

    @Transactional
    public void promoteIfBootstrapEmail(String email) {
        if (email == null || bootstrapEmails == null || bootstrapEmails.isBlank()) {
            return;
        }
        boolean listed = Arrays.stream(bootstrapEmails.split(","))
            .map(String::trim)
            .anyMatch(candidate -> !candidate.isEmpty() && candidate.equalsIgnoreCase(email));
        if (!listed) {
            return;
        }
        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.getRole() != Role.ADMIN) {
                user.setRole(Role.ADMIN);
                userRepository.save(user);
                log.info("✓ Promoted bootstrap email {} to ADMIN", email);
            }
        });
    }
}
