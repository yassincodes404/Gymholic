package com.gymholic.config;

import com.gymholic.common.enums.Role;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Seeds initial admin/trainer users for development and testing.
 * Uses environment variables for credentials - NEVER hardcoded.
 * 
 * Environment variables:
 * - ADMIN_EMAIL: Email for the admin user
 * - ADMIN_PASSWORD: Password for the admin user
 * - ADMIN_FIRST_NAME: First name (optional, defaults to "Admin")
 * - ADMIN_LAST_NAME: Last name (optional, defaults to "User")
 * 
 * If environment variables are not set, no admin user is created.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminUserSeeder {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.email:}")
    private String adminEmail;

    @Value("${admin.password:}")
    private String adminPassword;

    @Value("${admin.first-name:Admin}")
    private String adminFirstName;

    @Value("${admin.last-name:User}")
    private String adminLastName;

    @Bean
    public CommandLineRunner seedAdminUser() {
        return args -> {
            // Only seed if credentials are provided via environment
            if (adminEmail == null || adminEmail.isBlank() || 
                adminPassword == null || adminPassword.isBlank()) {
                log.info("Admin credentials not provided in environment. Skipping admin user seed.");
                return;
            }

            // Check if admin already exists
            if (userRepository.existsByEmail(adminEmail)) {
                log.info("Admin user already exists: {}", adminEmail);
                return;
            }

            // Create admin user
            User admin = User.builder()
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .firstName(adminFirstName)
                    .lastName(adminLastName)
                    .role(Role.ADMIN)
                    .active(true)
                    .build();

            userRepository.save(admin);
            log.info("✓ Admin user created successfully: {} ({})", adminEmail, Role.ADMIN);
            log.warn("⚠ Remember to change the default admin password in production!");
        };
    }
}
