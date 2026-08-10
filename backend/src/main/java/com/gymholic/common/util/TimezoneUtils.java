package com.gymholic.common.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.*;

/**
 * Utility class for timezone operations in the booking system.
 * 
 * This class provides timezone conversion and validation methods to support
 * the requirement that booking times are stored in UTC and displayed in
 * each user's local timezone.
 * 
 * Key Principles:
 * - Availability expressed in expert's timezone (LocalTime)
 * - Bookings stored as absolute UTC instants
 * - Display times converted to user's timezone
 * - IANA timezone IDs used for DST handling
 * 
 * @author GymHolic Dev Team
 * @since 1.0.0
 */
@Component
@Slf4j
public class TimezoneUtils {
    
    /**
     * Validates if a timezone ID is valid according to IANA timezone database.
     * 
     * Valid examples: "Africa/Cairo", "Asia/Dubai", "America/New_York"
     * Invalid examples: "PST", "EST", "GMT+2" (abbreviations not allowed)
     * 
     * @param timezone the IANA timezone ID to validate
     * @return true if timezone is valid, false otherwise
     */
    public static boolean isValidTimezone(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return false;
        }
        
        try {
            ZoneId.of(timezone);
            return true;
        } catch (DateTimeException e) {
            log.warn("Invalid timezone ID: {}", timezone);
            return false;
        }
    }
    
    /**
     * Converts a local date and time in a specific timezone to an absolute instant (UTC).
     * 
     * Example:
     * - date: 2026-08-15
     * - time: 10:00
     * - timezone: Africa/Cairo (UTC+2)
     * - Result: 2026-08-15T08:00:00Z (UTC instant)
     * 
     * @param date the local date
     * @param time the local time
     * @param timezone the timezone in which the date/time is expressed
     * @return the absolute instant in UTC
     * @throws DateTimeException if the local date-time is invalid for the timezone
     */
    public static Instant toInstant(LocalDate date, LocalTime time, ZoneId timezone) {
        ZonedDateTime zonedDateTime = ZonedDateTime.of(date, time, timezone);
        return zonedDateTime.toInstant();
    }
    
    /**
     * Converts an absolute instant (UTC) to a zoned date-time in a specific timezone.
     * 
     * Example:
     * - instant: 2026-08-15T08:00:00Z (UTC)
     * - timezone: Asia/Dubai (UTC+4)
     * - Result: 2026-08-15T12:00:00+04:00[Asia/Dubai]
     * 
     * @param instant the absolute instant in UTC
     * @param timezone the target timezone
     * @return the instant expressed in the target timezone
     */
    public static ZonedDateTime toZonedDateTime(Instant instant, ZoneId timezone) {
        return instant.atZone(timezone);
    }
    
    /**
     * Checks if a local date-time exists in the given timezone.
     * 
     * This is important for DST transitions where certain times don't exist.
     * Example: On March 10, 2024 in America/New_York, clocks spring forward from
     * 2:00 AM to 3:00 AM, so 2:30 AM doesn't exist.
     * 
     * @param date the local date
     * @param time the local time
     * @param timezone the timezone to check
     * @return true if the time exists, false if it's in a DST gap
     */
    public static boolean timeExists(LocalDate date, LocalTime time, ZoneId timezone) {
        try {
            ZonedDateTime zdt = ZonedDateTime.of(date, time, timezone);
            // Check if the local time was preserved (not shifted by DST)
            return zdt.toLocalDate().equals(date) && zdt.toLocalTime().equals(time);
        } catch (DateTimeException e) {
            log.warn("Time {}T{} does not exist in timezone {} (DST gap)", date, time, timezone);
            return false;
        }
    }
    
    /**
     * Checks if a local date-time is ambiguous in the given timezone.
     * 
     * This occurs during DST fall-back when clocks move backward and the same
     * local time occurs twice.
     * Example: On November 3, 2024 in America/New_York, clocks fall back from
     * 2:00 AM to 1:00 AM, so 1:30 AM occurs twice (once in EDT, once in EST).
     * 
     * @param date the local date
     * @param time the local time
     * @param timezone the timezone to check
     * @return true if the time is ambiguous (occurs twice), false otherwise
     */
    public static boolean timeIsAmbiguous(LocalDate date, LocalTime time, ZoneId timezone) {
        try {
            ZonedDateTime zdt = ZonedDateTime.of(date, time, timezone);
            
            // Check if an hour earlier has the same local time (DST overlap)
            ZonedDateTime hourEarlier = zdt.minusHours(1);
            LocalTime hourEarlierLocal = hourEarlier.toLocalTime();
            
            // If hour-earlier has same hour value, we're in DST overlap
            return hourEarlierLocal.getHour() == time.getHour();
        } catch (DateTimeException e) {
            return false;
        }
    }
    
    /**
     * Formats an instant as a human-readable string in the specified timezone.
     * 
     * @param instant the instant to format
     * @param timezone the timezone for display
     * @return formatted string (e.g., "10:00 AM Cairo time")
     */
    public static String formatInstant(Instant instant, ZoneId timezone) {
        ZonedDateTime zdt = instant.atZone(timezone);
        return String.format("%s %s", 
            zdt.toLocalDateTime().toString(), 
            timezone.getId().replace("_", " ")
        );
    }
}
