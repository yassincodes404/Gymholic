package com.gymholic.availability.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * DTO representing an available consultation slot with complete timezone context.
 * 
 * This DTO provides:
 * - The absolute UTC instant for the slot (startTime)
 * - Display time in client's timezone (displayTime)
 * - Display time in expert's timezone (expertDisplayTime)
 * - Both timezone IDs for transparency
 * 
 * Example:
 * - Expert in Cairo sets availability: 10:00-10:45
 * - Client in Dubai requests slots
 * - Response shows:
 *   - startTime: "2026-08-15T08:00:00Z" (UTC instant)
 *   - displayTime: "12:00" (Dubai local time)
 *   - expertDisplayTime: "10:00" (Cairo local time)
 *   - expertTimezone: "Africa/Cairo"
 *   - clientTimezone: "Asia/Dubai"
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailableSlotDto {
    
    /**
     * Absolute start time of the slot as UTC instant.
     * Format: ISO 8601 with Z suffix (e.g., "2026-08-15T08:00:00Z")
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private Instant startTime;
    
    /**
     * Absolute end time of the slot as UTC instant.
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    private Instant endTime;
    
    /**
     * Local time in client's timezone (HH:mm format).
     * Example: "12:00" for Dubai when expert's 10:00 Cairo = 12:00 Dubai
     */
    private String displayTime;
    
    /**
     * Local time in expert's timezone (HH:mm format).
     * Shown to client for reference.
     * Example: "10:00" for Cairo
     */
    private String expertDisplayTime;
    
    /**
     * Expert's IANA timezone ID.
     * Example: "Africa/Cairo", "Asia/Dubai"
     */
    private String expertTimezone;
    
    /**
     * Client's IANA timezone ID (from request).
     */
    private String clientTimezone;
}
