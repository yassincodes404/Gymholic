package com.gymholic.notification;

import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.common.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReminderScheduler {

    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;
    private final StringRedisTemplate redisTemplate;
    private final com.gymholic.settings.SettingsService settingsService;

    private static final String REMINDER_FLAG_PREFIX = "booking_reminder_sent:";
    private static final String SOON_FLAG_PREFIX = "booking_reminder_1h_sent:";

    /**
     * Runs every hour — sends reminders for sessions starting within the next 24 hours.
     * Can be switched off with the REMINDER_24H_ENABLED admin setting.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void sendUpcomingSessionReminders() {
        if (!settingsService.getBool("REMINDER_24H_ENABLED", true)) {
            return;
        }
        Instant now = Instant.now();
        Instant in24Hours = now.plus(24, ChronoUnit.HOURS);

        List<Booking> upcomingBookings = bookingRepository
            .findUpcomingByStatus(BookingStatus.CONFIRMED, now, in24Hours);

        for (Booking booking : upcomingBookings) {
            try {
                String flagKey = REMINDER_FLAG_PREFIX + booking.getId();
                Boolean first = redisTemplate.opsForValue().setIfAbsent(flagKey, "1", Duration.ofHours(25));
                if (Boolean.FALSE.equals(first)) {
                    continue; // already reminded for this booking
                }

                sendReminder(booking, "in about 24 hours");
                log.info("Sent 24h reminder for booking #{} to client {} and expert {}",
                    booking.getId(), booking.getClient().getEmail(), booking.getTrainer().getEmail());
            } catch (Exception e) {
                log.error("Failed to send reminder for booking #{}: {}",
                    booking.getId(), e.getMessage());
            }
        }
    }

    /**
     * Runs every 15 minutes — sends a final reminder for sessions starting
     * within the next hour, to both the client and the expert. Can be
     * switched off with the REMINDER_1H_ENABLED admin setting.
     */
    @Scheduled(cron = "0 */15 * * * *")
    public void sendUpcomingSessionRemindersSoon() {
        if (!settingsService.getBool("REMINDER_1H_ENABLED", true)) {
            return;
        }
        Instant now = Instant.now();
        Instant in1Hour = now.plus(1, ChronoUnit.HOURS);

        List<Booking> upcomingBookings = bookingRepository
            .findUpcomingByStatus(BookingStatus.CONFIRMED, now, in1Hour);

        for (Booking booking : upcomingBookings) {
            try {
                String flagKey = SOON_FLAG_PREFIX + booking.getId();
                Boolean first = redisTemplate.opsForValue().setIfAbsent(flagKey, "1", Duration.ofHours(2));
                if (Boolean.FALSE.equals(first)) {
                    continue; // already sent the final reminder
                }

                sendReminder(booking, "in less than an hour");
                log.info("Sent 1h reminder for booking #{} to client {} and expert {}",
                    booking.getId(), booking.getClient().getEmail(), booking.getTrainer().getEmail());
            } catch (Exception e) {
                log.error("Failed to send 1h reminder for booking #{}: {}",
                    booking.getId(), e.getMessage());
            }
        }
    }

    /**
     * Runs every 15 minutes — sessions whose end time passed 30+ minutes ago
     * while still CONFIRMED are closed as COMPLETED (bookkeeping only, no
     * email). The admin can override a session to NO_SHOW afterwards, which
     * emails the client a reschedule link.
     */
    @Scheduled(cron = "0 5/15 * * * *")
    public void autoCompletePastSessions() {
        Instant cutoff = Instant.now().minus(Duration.ofMinutes(30));
        List<Booking> past = bookingRepository.findByStatusAndEndTimeBefore(BookingStatus.CONFIRMED, cutoff);
        for (Booking booking : past) {
            try {
                booking.setStatus(BookingStatus.COMPLETED);
                bookingRepository.save(booking);
                log.info("Auto-completed past session booking #{}", booking.getId());
            } catch (Exception e) {
                log.error("Failed to auto-complete booking #{}: {}", booking.getId(), e.getMessage());
            }
        }
    }

    private void sendReminder(Booking booking, String whenNote) {
        String clientDateTime = displayInZone(booking.getStartTime(), booking.getClientTimezone())
            + " (" + whenNote + ")";
        String expertDateTime = displayInZone(booking.getStartTime(), booking.getTrainer().getTimezone())
            + " (" + whenNote + ")";
        String trainerName = booking.getTrainer().getFirstName() + " " + booking.getTrainer().getLastName();

        notificationService.sendBookingReminder(
            booking.getClient().getEmail(),
            booking.getClient().getFirstName(),
            trainerName,
            clientDateTime,
            booking.getMeetLink());

        // The expert gets a reminder too (in their own timezone)
        notificationService.sendBookingReminder(
            booking.getTrainer().getEmail(),
            booking.getTrainer().getFirstName(),
            booking.getClient().getFirstName() + " " + booking.getClient().getLastName(),
            expertDateTime,
            booking.getMeetLink());
    }

    private String displayInZone(Instant time, String timezone) {
        try {
            return DateTimeUtils.formatForDisplay(time, java.time.ZoneId.of(timezone));
        } catch (Exception e) {
            return DateTimeUtils.formatForDisplay(time);
        }
    }
}
