package com.gymholic.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, Long> {

    /** Newest unconsumed code for a user (one active code per user). */
    Optional<EmailVerificationCode> findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(Long userId);
}
