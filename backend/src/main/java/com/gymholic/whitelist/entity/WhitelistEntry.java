package com.gymholic.whitelist.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "whitelist_entries",
       uniqueConstraints = @UniqueConstraint(name = "uq_whitelist_email_source",
                                             columnNames = {"email", "source"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhitelistEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    private String name;

    @Column(nullable = false)
    private String source;

    @Builder.Default
    @Column(nullable = false)
    private boolean notified = false;

    /** Linked user account, when the signup email matches a registered user. */
    @Column(name = "user_id")
    private Long userId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
