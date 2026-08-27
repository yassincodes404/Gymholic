package com.gymholic.availability.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Identifies the expert customers book against, so clients don't need a
 * hard-coded trainer id. Resolved from availability ownership (newest row),
 * falling back to the first ADMIN/TRAINER account.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingTrainerDto {

    private Long trainerId;
    private String trainerName;
    private String timezone;
}
