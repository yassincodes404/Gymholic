package com.gymholic.booking;

import com.gymholic.availability.AvailabilityRepository;
import com.gymholic.booking.entity.Booking;
import com.gymholic.calendar.CalendarService;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.notification.NotificationService;
import com.gymholic.payment.PaymentRepository;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import com.gymholic.availability.entity.Availability;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Stale PENDING holds (abandoned checkouts) are auto-cancelled with the
 * internal reason, the client is emailed, and no calendar event is touched
 * (PENDING bookings never have one).
 */
@ExtendWith(MockitoExtension.class)
class BookingServiceStalePendingTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AvailabilityRepository availabilityRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private com.gymholic.settings.SettingsService settingsService;

    @Mock
    private CalendarService calendarService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private com.gymholic.calendar.ZoomService zoomService;

    @InjectMocks
    private BookingService bookingService;

    private User client;
    private User trainer;
    private Booking stalePending;

    @BeforeEach
    void setUp() {
        client = User.builder()
            .id(1L).email("client@example.com").firstName("John").lastName("Doe")
            .password("x").timezone("UTC").build();
        trainer = User.builder()
            .id(2L).email("trainer@example.com").firstName("Jane").lastName("Smith")
            .password("x").timezone("UTC").build();

        Instant startTime = Instant.now().plus(1, ChronoUnit.DAYS);
        stalePending = Booking.builder()
            .id(100L)
            .client(client)
            .trainer(trainer)
            .startTime(startTime)
            .endTime(startTime.plus(45, ChronoUnit.MINUTES))
            .expertTimezone("UTC")
            .clientTimezone("UTC")
            .meetingTimezone("UTC")
            .status(BookingStatus.PENDING)
            .build();
    }

    @Test
    void expireStalePendingBookings_CancelsWithInternalReasonAndNotifiesClient() {
        when(bookingRepository.findStalePendingBookings(any(Instant.class), any(LocalDateTime.class)))
            .thenReturn(List.of(stalePending));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(i -> i.getArgument(0));

        bookingService.expireStalePendingBookings();

        ArgumentCaptor<Booking> captor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository, times(1)).save(captor.capture());
        assertEquals(BookingStatus.CANCELLED, captor.getValue().getStatus());
        assertEquals("Automatically cancelled — payment not completed",
            captor.getValue().getCancellationReason());

        verify(notificationService, times(1)).sendBookingExpired(
            eq(client.getEmail()), eq(client.getFirstName()), anyString());
        verifyNoInteractions(calendarService);
    }

    @Test
    void expireStalePendingBookings_NothingStale_IsNoOp() {
        when(bookingRepository.findStalePendingBookings(any(Instant.class), any(LocalDateTime.class)))
            .thenReturn(List.of());

        bookingService.expireStalePendingBookings();

        verify(bookingRepository, never()).save(any());
        verifyNoInteractions(notificationService);
        verifyNoInteractions(calendarService);
    }
}
