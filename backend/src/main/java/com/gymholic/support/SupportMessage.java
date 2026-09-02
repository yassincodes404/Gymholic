package com.gymholic.support;

import jakarta.persistence.*;
import lombok.*;

import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A client support request from the /contact form (or an in-app entry
 * point). Persisted first — the email notification is best-effort, the
 * record is the source of truth — so a complaint can never be lost.
 */
@Entity
@Table(name = "support_messages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(nullable = false)
    private String email;

    /** Signed-in author, when the message was sent from an account. */
    @Column(name = "user_id")
    private Long userId;

    /** BOOKING | PAYMENT | DIGITAL_PRODUCT | ACCOUNT | OTHER */
    @Column(nullable = false, length = 32)
    private String category;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /** NEW until an admin marks it handled. */
    @Builder.Default
    @Column(nullable = false, length = 16)
    private String status = "NEW";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
