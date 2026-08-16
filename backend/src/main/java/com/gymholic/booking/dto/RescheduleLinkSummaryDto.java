package com.gymholic.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** Public (token-protected) summary shown on the /reschedule page. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescheduleLinkSummaryDto {
    private Long bookingId;
    private String clientFirstName;
    private String trainerName;
    private Instant originalStartTime;
    private Instant rescheduleExpiresAt;
    private String clientTimezone;
    private Boolean expertAttended;
}
