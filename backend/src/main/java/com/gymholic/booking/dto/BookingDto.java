package com.gymholic.booking.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.gymholic.common.enums.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;

/**
 * DTO for booking responses.
 * 
 * Contains:
 * - Absolute booking times as UTC instants
 * - Timezone context (expert/client/meeting)
 * - User and status information
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingDto {

    private Long id;
    private Long clientId;
    private String clientName;
    private Long trainerId;
    private String trainerName;
    
    /**
     * Absolute start time as UTC instant.
     * Frontend should convert to user's timezone for display.
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private Instant startTime;
    
    /**
     * Absolute end time as UTC instant.
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private Instant endTime;
    
    /**
     * Expert/trainer's timezone at booking time.
     */
    private String expertTimezone;
    
    /**
     * Client's timezone at booking time.
     */
    private String clientTimezone;
    
    /**
     * Agreed meeting timezone (typically matches expert timezone).
     */
    private String meetingTimezone;
    
    private BookingStatus status;
    private java.util.UUID assessmentId;
    private String notes;
    private String meetLink;
    private String externalEventId;
    private LocalDateTime createdAt;
}
