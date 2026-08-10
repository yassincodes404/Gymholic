package com.gymholic.common.util;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public final class DateTimeUtils {

    private DateTimeUtils() {
        // Utility class — no instantiation
    }

    private static final DateTimeFormatter DISPLAY_FORMAT =
        DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' hh:mm a");

    private static final DateTimeFormatter ISO_FORMAT =
        DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static String formatForDisplay(LocalDateTime dateTime) {
        return dateTime.format(DISPLAY_FORMAT);
    }

    public static String formatForDisplay(Instant instant) {
        ZonedDateTime zdt = instant.atZone(ZoneId.of("UTC"));
        return zdt.format(DISPLAY_FORMAT.withZone(ZoneId.of("UTC")));
    }

    public static String formatISO(LocalDateTime dateTime) {
        return dateTime.format(ISO_FORMAT);
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZoneId.of("UTC"));
    }
}
