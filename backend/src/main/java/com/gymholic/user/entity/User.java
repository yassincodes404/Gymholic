package com.gymholic.user.entity;

import com.gymholic.common.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "google_id", unique = true)
    private String googleId;

    @Column(nullable = false)
    private String password;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(columnDefinition = "TEXT")
    private String bio;

    /**
     * User's timezone (IANA timezone ID).
     * Examples: "Africa/Cairo", "Asia/Dubai", "America/New_York"
     * 
     * Used to:
     * - Interpret expert availability in their local timezone
     * - Display booking times in user's local timezone
     * - Generate correct Google Calendar events
     */
    @Builder.Default
    @Column(nullable = false, length = 64)
    private String timezone = "UTC";

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    /**
     * Whether the user confirmed ownership of their email address with a
     * one-time code (sign-up / sign-in confirmation). Payments and bookings
     * are blocked until this is true. Existing accounts were grandfathered
     * as verified when the feature shipped.
     */
    @Builder.Default
    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    /**
     * Whether the user confirmed ownership of their phone number with an
     * SMS one-time code. Cleared whenever the number changes — a new number
     * must re-verify before SMS/WhatsApp notifications trust it.
     */
    @Builder.Default
    @Column(name = "phone_verified", nullable = false)
    private boolean phoneVerified = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Helper method to get ZoneId from timezone string.
     * 
     * @return ZoneId representation of the user's timezone
     * @throws java.time.DateTimeException if timezone is invalid
     */
    public ZoneId getZoneId() {
        return ZoneId.of(timezone);
    }
}
