package com.gymholic.availability.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * One day of the month booking calendar. Statuses:
 * past | closed | fully-booked | available (+ booked for FREE_SESSION days
 * whose one-per-day free session is already taken).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarDayDto {

    private LocalDate date;
    private String status;
}
