package com.gymholic.notification;

import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.common.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReminderScheduler {

    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    /**
     * Runs every hour — sends reminders for sessions starting within the next 24 hours.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void sendUpcomingSessionReminders() {
        Instant now = Instant.now();
        Instant in24Hours = now.plus(24, ChronoUnit.HOURS);

        List<Booking> upcomingBookings = bookingRepository
            .findUpcomingByStatus(BookingStatus.CONFIRMED, now, in24Hours);

        for (Booking booking : upcomingBookings) {
            try {
                String dateTime = DateTimeUtils.formatForDisplay(booking.getStartTime());

                notificationService.sendBookingReminder(
                    booking.getClient().getEmail(),
                    booking.getClient().getFirstName(),
                    booking.getTrainer().getFirstName() + " " + booking.getTrainer().getLastName(),
                    dateTime,
                    booking.getMeetLink());

                log.info("Sent reminder for booking #{} to {}",
                    booking.getId(), booking.getClient().getEmail());
            } catch (Exception e) {
                log.error("Failed to send reminder for booking #{}: {}",
                    booking.getId(), e.getMessage());
            }
        }
    }
}
