package com.gymholic.auth;

import com.gymholic.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

/**
 * One-time 6-digit code emailed to a user to confirm their identity on
 * sign-up / sign-in. Only the hash is stored. A code is single-use, expires
 * after {@code CODE_TTL}, and locks after too many wrong attempts.
 */
@Entity
@Table(name = "email_verification_codes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailVerificationCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @Column(name = "code_hash", nullable = false, length = 100)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Builder.Default
    @Column(nullable = false)
    private int attempts = 0;

    /** What the code unlocks: VERIFY (sign-up/login confirmation), LOGIN
     *  (passwordless sign-in), EMAIL_CHANGE (confirm a new address). */
    @Builder.Default
    @Column(nullable = false, length = 32)
    private String purpose = "VERIFY";

    /** Pending new address while purpose = EMAIL_CHANGE. */
    @Column(name = "target_email", length = 255)
    private String targetEmail;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public boolean isConsumed() {
        return consumedAt != null;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
