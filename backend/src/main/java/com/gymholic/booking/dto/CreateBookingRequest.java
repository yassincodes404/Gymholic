package com.gymholic.booking.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Request DTO for creating a new booking.
 * 
 * IMPORTANT: Times must be sent as UTC instants (ISO 8601 with Z suffix).
 * Example: "2026-08-15T08:00:00Z"
 * 
 * The frontend should:
 * 1. Detect client's timezone
 * 2. Convert selected slot to UTC instant
 * 3. Send instant + timezone to backend
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookingRequest {

    @NotNull(message = "Trainer ID is required")
    private Long trainerId;

    /**
     * Absolute start time as UTC instant.
     * Format: "2026-08-15T08:00:00Z"
     */
    @NotNull(message = "Start time is required")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private Instant startTime;

    /**
     * Absolute end time as UTC instant.
     */
    @NotNull(message = "End time is required")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private Instant endTime;

    /**
     * Client's IANA timezone ID at booking time.
     * Example: "Asia/Dubai", "Africa/Cairo", "America/New_York"
     * 
     * Used to:
     * - Store client timezone context
     * - Display booking details to client in their timezone
     * - Send email notifications in client's timezone
     */
    @NotBlank(message = "Client timezone is required")
    @Size(max = 64, message = "Client timezone is too long")
    private String clientTimezone;

    private java.util.UUID assessmentId;

    /** Free-text context (contact details, topic, message) assembled by the client — capped, never parsed for pricing decisions beyond the legacy keyword match. */
    @Size(max = 2000, message = "Notes must be at most 2000 characters")
    private String notes;

    /**
     * Optional explicit service type (STRATEGY_CALL | IN_PERSON |
     * OPEN_SESSION | FREE_SESSION). When omitted the service is derived
     * from the notes using the historical matching rules.
     */
    @Size(max = 32, message = "Unknown service type")
    @Pattern(regexp = "[A-Za-z_]*", message = "Unknown service type")
    private String serviceType;
}
