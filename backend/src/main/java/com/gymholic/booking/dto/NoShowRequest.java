package com.gymholic.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Admin request when marking a booking as a no-show. Whether the expert
 * attended decides which policy email the client receives.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoShowRequest {

    @Builder.Default
    private boolean expertAttended = true;

    private String note;
}
