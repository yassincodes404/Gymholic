package com.gymholic.notification;

import com.gymholic.booking.entity.Booking;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Builds RFC 5545 calendar invitations (.ics) for booking emails, so the
 * client can add the session to any calendar — not just Google. Times are
 * always emitted in UTC; the display timezone lives in the email body.
 */
@Service
public class IcsService {

    private static final DateTimeFormatter UTC_BASIC =
        DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    public EmailService.EmailAttachment bookingInvite(Booking booking) {
        String summary = "Gymholic consultation: "
            + booking.getClient().getFirstName() + " & " + booking.getTrainer().getFirstName();

        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR\r\n");
        sb.append("VERSION:2.0\r\n");
        sb.append("PRODID:-//Gymholic//Bookings//EN\r\n");
        sb.append("CALSCALE:GREGORIAN\r\n");
        sb.append("METHOD:REQUEST\r\n");
        sb.append("BEGIN:VEVENT\r\n");
        sb.append("UID:booking-").append(booking.getId()).append("@gymholic.ae\r\n");
        sb.append("DTSTAMP:").append(UTC_BASIC.format(Instant.now())).append("\r\n");
        sb.append("DTSTART:").append(UTC_BASIC.format(booking.getStartTime())).append("\r\n");
        sb.append("DTEND:").append(UTC_BASIC.format(booking.getEndTime())).append("\r\n");
        sb.append("SUMMARY:").append(escape(summary)).append("\r\n");
        if (booking.getNotes() != null && !booking.getNotes().isBlank()) {
            sb.append("DESCRIPTION:").append(escape(booking.getNotes())).append("\r\n");
        }
        if (booking.getMeetLink() != null && !booking.getMeetLink().isBlank()) {
            sb.append("LOCATION:").append(escape(booking.getMeetLink())).append("\r\n");
        }
        sb.append("STATUS:CONFIRMED\r\n");
        sb.append("ORGANIZER;CN=").append(escape(booking.getTrainer().getFirstName()
                + " " + booking.getTrainer().getLastName()))
            .append(":mailto:").append(booking.getTrainer().getEmail()).append("\r\n");
        sb.append("ATTENDEE;CN=").append(escape(booking.getClient().getFirstName()
                + " " + booking.getClient().getLastName()))
            .append(";ROLE=REQ-PARTICIPANT:mailto:").append(booking.getClient().getEmail()).append("\r\n");
        sb.append("END:VEVENT\r\n");
        sb.append("END:VCALENDAR\r\n");

        return new EmailService.EmailAttachment(
            "gymholic-session.ics", "text/calendar; charset=utf-8",
            sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    private String escape(String value) {
        return value
            .replace("\\", "\\\\")
            .replace(";", "\\;")
            .replace(",", "\\,")
            .replace("\n", "\\n")
            .replace("\r", "");
    }
}
