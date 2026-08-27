package com.gymholic.booking;

import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.common.enums.Role;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Stale-pending expiry query semantics: PENDING bookings whose slot
 * already started or whose checkout was abandoned 2+ hours ago are
 * cancelled; fresh pending holds and confirmed sessions are untouched.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BookingExpiryIntegrationTest {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User client;
    private User trainer;

    @BeforeEach
    void setUp() {
        client = userRepository.save(User.builder()
                .email("expiryclient@gymholic.com").firstName("Ex").lastName("Piry")
                .password("password").role(Role.CLIENT).timezone("UTC").active(true).build());
        trainer = userRepository.save(User.builder()
                .email("expirytrainer@gymholic.com").firstName("Ex").lastName("Pert")
                .password("password").role(Role.TRAINER).timezone("UTC").active(true).build());
    }

    private Booking persistBooking(BookingStatus status, Instant start) {
        return bookingRepository.save(Booking.builder()
                .client(client)
                .trainer(trainer)
                .startTime(start)
                .endTime(start.plus(45, ChronoUnit.MINUTES))
                .expertTimezone("UTC")
                .clientTimezone("UTC")
                .meetingTimezone("UTC")
                .status(status)
                .build());
    }

    private void backdateCreation(Booking booking, LocalDateTime createdAt) {
        jdbcTemplate.update("UPDATE bookings SET created_at = ? WHERE id = ?",
                Timestamp.valueOf(createdAt), booking.getId());
    }

    @Test
    void expire_PendingWithPastStartTime_IsCancelled() {
        Booking stale = persistBooking(BookingStatus.PENDING, Instant.now().minus(Duration.ofHours(1)));

        bookingService.expireStalePendingBookings();

        Booking reloaded = bookingRepository.findById(stale.getId()).orElseThrow();
        assertEquals(BookingStatus.CANCELLED, reloaded.getStatus());
        assertNotNull(reloaded.getCancellationReason());
    }

    @Test
    void expire_PendingCreatedOverTwoHoursAgo_IsCancelled() {
        Booking abandoned = persistBooking(BookingStatus.PENDING,
                Instant.now().plus(Duration.ofDays(2)));
        backdateCreation(abandoned, LocalDateTime.now().minusHours(3));

        bookingService.expireStalePendingBookings();

        Booking reloaded = bookingRepository.findById(abandoned.getId()).orElseThrow();
        assertEquals(BookingStatus.CANCELLED, reloaded.getStatus());
    }

    @Test
    void expire_FreshPendingHold_IsKept() {
        Booking fresh = persistBooking(BookingStatus.PENDING,
                Instant.now().plus(Duration.ofDays(2)));

        bookingService.expireStalePendingBookings();

        Booking reloaded = bookingRepository.findById(fresh.getId()).orElseThrow();
        assertEquals(BookingStatus.PENDING, reloaded.getStatus());
        assertNull(reloaded.getCancellationReason());
    }

    @Test
    void expire_ConfirmedPastSession_IsKept() {
        Booking confirmed = persistBooking(BookingStatus.CONFIRMED,
                Instant.now().minus(Duration.ofHours(1)));

        bookingService.expireStalePendingBookings();

        Booking reloaded = bookingRepository.findById(confirmed.getId()).orElseThrow();
        assertEquals(BookingStatus.CONFIRMED, reloaded.getStatus());
    }
}
