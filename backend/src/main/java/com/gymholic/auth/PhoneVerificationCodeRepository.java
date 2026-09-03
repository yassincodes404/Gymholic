package com.gymholic.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface PhoneVerificationCodeRepository extends JpaRepository<PhoneVerificationCode, Long> {

    /** The user's live challenge, if any (throttle, verify and confirm all work on it). */
    Optional<PhoneVerificationCode> findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(Long userId);

    /** Retires any live challenge — used when the pending number changes. */
    @Modifying
    @Query("update PhoneVerificationCode c set c.consumedAt = :now " +
        "where c.user.id = :userId and c.consumedAt is null")
    void consumeAllByUserId(@Param("userId") Long userId, @Param("now") Instant now);
}
