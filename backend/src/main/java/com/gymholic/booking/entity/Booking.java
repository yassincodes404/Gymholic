package com.gymholic.booking.entity;

import com.gymholic.common.enums.BookingStatus;
import com.gymholic.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trainer_id", nullable = false)
    private User trainer;

    /**
     * Absolute start time of the booking (UTC instant).
     * This represents the exact moment the booking starts, unambiguous across timezones.
     */
    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    /**
     * Absolute end time of the booking (UTC instant).
     */
    @Column(name = "end_time", nullable = false)
    private Instant endTime;

    /**
     * Expert/trainer's timezone at booking time (IANA timezone ID).
     * Example: "Africa/Cairo", "Asia/Dubai"
     */
    @Column(name = "expert_timezone", length = 64)
    private String expertTimezone;

    /**
     * Client's timezone at booking time (IANA timezone ID).
     */
    @Column(name = "client_timezone", length = 64)
    private String clientTimezone;

    /**
     * Agreed meeting timezone (typically matches expert timezone).
     * This satisfies the spec requirement: "booking record should contain meeting timezone"
     */
    @Column(name = "meeting_timezone", length = 64)
    private String meetingTimezone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "meet_link")
    private String meetLink;

    @Column(name = "external_event_id")
    private String externalEventId;

    @Column(name = "assessment_id")
    private java.util.UUID assessmentId;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    /**
     * One-time token emailed to the client after a no-show, letting them
     * pick a new time from /reschedule?token=... without signing in.
     */
    @Column(name = "reschedule_token", length = 64)
    private String rescheduleToken;

    @Column(name = "reschedule_expires_at")
    private Instant rescheduleExpiresAt;

    @Column(name = "no_show_note", columnDefinition = "TEXT")
    private String noShowNote;

    /** Whether the expert joined the missed session (recorded at no-show marking). */
    @Column(name = "expert_attended")
    private Boolean expertAttended;

    /** How many times this booking has been moved to a new time. */
    @Builder.Default
    @Column(name = "reschedule_count", nullable = false)
    private int rescheduleCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
