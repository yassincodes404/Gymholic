package com.gymholic.booking.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Request DTO for rescheduling an existing booking.
 * 
 * Times must be sent as UTC instants.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescheduleBookingRequest {

    /**
     * New absolute start time as UTC instant.
     */
    @NotNull(message = "New start time is required")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private Instant newStartTime;

    /**
     * New absolute end time as UTC instant.
     */
    @NotNull(message = "New end time is required")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private Instant newEndTime;
}
