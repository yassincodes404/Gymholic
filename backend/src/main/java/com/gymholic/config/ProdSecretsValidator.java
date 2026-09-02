package com.gymholic.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;

/**
 * Production seatbelt: refuses to boot when the JWT or encryption secrets
 * are missing or still the well-known local-dev defaults. Forging an admin
 * JWT or decrypting the payment tokens in the DB both reduce to knowing
 * these secrets — a silent fallback would turn one missed env var into a
 * full compromise, so instead the deploy fails loudly at startup.
 */
@Slf4j
@Component
@Profile("prod")
public class ProdSecretsValidator {

    @Value("${app.jwt.secret:}")
    private String jwtSecret;

    @Value("${app.encryption.secret:}")
    private String encryptionSecret;

    @PostConstruct
    void validate() {
        List<String> problems = new ArrayList<>();
        if (isWeak(jwtSecret, "default-secret-for-local-dev-only")) {
            problems.add("JWT_SECRET is missing or still the local-dev default — set a long random value in the VPS .env.");
        }
        if (isWeak(encryptionSecret, "fallback_secret_must_change_in_prod")) {
            problems.add("ENCRYPTION_SECRET is missing or still the local-dev default — set a long random value in the VPS .env.");
        }
        if (!problems.isEmpty()) {
            String message = "Refusing to start in production:\n- " + String.join("\n- ", problems);
            log.error(message);
            throw new IllegalStateException(message);
        }
    }

    private static boolean isWeak(String value, String knownDefault) {
        return value == null || value.isBlank() || value.equals(knownDefault);
    }
}
