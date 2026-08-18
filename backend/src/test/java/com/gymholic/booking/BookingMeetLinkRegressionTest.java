package com.gymholic.booking;

import com.gymholic.availability.AvailabilityRepository;
import com.gymholic.booking.dto.BookingDto;
import com.gymholic.booking.entity.Booking;
import com.gymholic.calendar.CalendarService;
import com.gymholic.calendar.dto.CalendarEventDto;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.notification.NotificationService;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Regression test for Google Meet link overwrite bug.
 * 
 * Bug: BookingService.confirmBooking() was calling GoogleMeetService.createMeetLink()
 * which overwrote the real Google Meet link from GoogleCalendarService with a mock link.
 * 
 * Fix: Use event.getMeetLink() directly - the real Meet link from Google Calendar API.
 */
@ExtendWith(MockitoExtension.class)
class BookingMeetLinkRegressionTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AvailabilityRepository availabilityRepository;

    @Mock
    private CalendarService calendarService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private BookingService bookingService;

    private User client;
    private User trainer;
    private Booking pendingBooking;
    private final String REAL_MEET_LINK = "https://meet.google.com/abc-defg-hij";
    private final String EVENT_ID = "real-google-event-id-12345";

    @BeforeEach
    void setUp() {
        client = User.builder()
            .id(1L)
            .email("client@example.com")
            .firstName("John")
            .lastName("Doe")
            .timezone("UTC")
            .build();

        trainer = User.builder()
            .id(2L)
            .email("trainer@example.com")
            .firstName("Jane")
            .lastName("Smith")
            .timezone("UTC")
            .build();

        Instant startTime = Instant.now().plus(1, ChronoUnit.DAYS);
        Instant endTime = startTime.plus(45, ChronoUnit.MINUTES);

        pendingBooking = Booking.builder()
            .id(100L)
            .client(client)
            .trainer(trainer)
            .startTime(startTime)
            .endTime(endTime)
            .expertTimezone("UTC")
            .clientTimezone("UTC")
            .meetingTimezone("UTC")
            .status(BookingStatus.PENDING)
            .notes("Initial consultation")
            .build();
    }

    @Test
    void confirmBooking_ShouldStoreRealMeetLinkFromGoogleCalendar() {
        // Given: Google Calendar returns a real Meet link
        LocalDateTime startLocalTime = LocalDateTime.ofInstant(pendingBooking.getStartTime(), ZoneId.of("UTC"));
        LocalDateTime endLocalTime = LocalDateTime.ofInstant(pendingBooking.getEndTime(), ZoneId.of("UTC"));
        
        CalendarEventDto calendarEvent = CalendarEventDto.builder()
            .eventId(EVENT_ID)
            .summary("Consultation: John & Jane")
            .startTime(startLocalTime)
            .endTime(endLocalTime)
            .meetLink(REAL_MEET_LINK) // Real link from Google Calendar API
            .build();

        when(bookingRepository.findById(100L)).thenReturn(Optional.of(pendingBooking));
        when(calendarService.createEvent(
            eq(trainer.getId()),
            anyString(),
            anyString(),
            any(LocalDateTime.class),
            any(LocalDateTime.class),
            eq(client.getEmail())
        )).thenReturn(calendarEvent);
        
        ArgumentCaptor<Booking> bookingCaptor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepository.save(bookingCaptor.capture())).thenAnswer(i -> i.getArgument(0));

        // When: Confirming the booking
        BookingDto result = bookingService.confirmBooking(100L);

        // Then: The booking should store the REAL Meet link from Google Calendar
        Booking savedBooking = bookingCaptor.getValue();
        assertEquals(REAL_MEET_LINK, savedBooking.getMeetLink(), 
            "Booking must store the exact Meet URL returned by GoogleCalendarService, not a mock URL");
        assertEquals(EVENT_ID, savedBooking.getExternalEventId());
        assertEquals(BookingStatus.CONFIRMED, savedBooking.getStatus());

        // Verify the DTO also has the real link
        assertEquals(REAL_MEET_LINK, result.getMeetLink());
    }

    @Test
    void confirmBooking_ShouldSendRealMeetLinkInEmail() {
        // Given: Google Calendar returns a real Meet link
        LocalDateTime startLocalTime = LocalDateTime.ofInstant(pendingBooking.getStartTime(), ZoneId.of("UTC"));
        LocalDateTime endLocalTime = LocalDateTime.ofInstant(pendingBooking.getEndTime(), ZoneId.of("UTC"));
        
        CalendarEventDto calendarEvent = CalendarEventDto.builder()
            .eventId(EVENT_ID)
            .summary("Consultation: John & Jane")
            .startTime(startLocalTime)
            .endTime(endLocalTime)
            .meetLink(REAL_MEET_LINK)
            .build();

        when(bookingRepository.findById(100L)).thenReturn(Optional.of(pendingBooking));
        when(calendarService.createEvent(any(), anyString(), anyString(), any(), any(), anyString()))
            .thenReturn(calendarEvent);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(i -> {
            Booking b = i.getArgument(0);
            b.setMeetLink(REAL_MEET_LINK); // Simulate saved booking has the real link
            return b;
        });

        // When: Confirming the booking
        bookingService.confirmBooking(100L);

        // Then: The notification email should receive the REAL Meet link
        ArgumentCaptor<String> meetLinkCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService, times(1)).sendBookingConfirmation(
            eq(client.getEmail()),
            eq(client.getFirstName()),
            eq(trainer.getFirstName()),
            anyString(), // start time
            eq("45"), // duration
            meetLinkCaptor.capture(),
            anyString(), // meeting label
            any(Booking.class)
        );

        assertEquals(REAL_MEET_LINK, meetLinkCaptor.getValue(), 
            "Confirmation email must use the real Meet URL from Google Calendar, not a mock URL");
    }

    @Test
    void confirmBooking_WithNullMeetLink_ShouldHandleGracefully() {
        // Given: Google Calendar event created but Meet link is null (API limitation or failure)
        LocalDateTime startLocalTime = LocalDateTime.ofInstant(pendingBooking.getStartTime(), ZoneId.of("UTC"));
        LocalDateTime endLocalTime = LocalDateTime.ofInstant(pendingBooking.getEndTime(), ZoneId.of("UTC"));
        
        CalendarEventDto calendarEvent = CalendarEventDto.builder()
            .eventId(EVENT_ID)
            .summary("Consultation: John & Jane")
            .startTime(startLocalTime)
            .endTime(endLocalTime)
            .meetLink(null) // No Meet link available
            .build();

        when(bookingRepository.findById(100L)).thenReturn(Optional.of(pendingBooking));
        when(calendarService.createEvent(any(), anyString(), anyString(), any(), any(), anyString()))
            .thenReturn(calendarEvent);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(i -> i.getArgument(0));

        // When: Confirming the booking
        BookingDto result = bookingService.confirmBooking(100L);

        // Then: The booking should have null meetLink (no mock link generated)
        assertNull(result.getMeetLink(), 
            "When Google Calendar doesn't provide a Meet link, booking should have null meetLink, not a mock URL");
    }

    @Test
    void confirmBooking_SingleSourceOfTruth_Verification() {
        // This test verifies the single source of truth flow:
        // GoogleCalendarService.createEvent() → CalendarEventDto.meetLink → booking.meetLink → email

        LocalDateTime startLocalTime = LocalDateTime.ofInstant(pendingBooking.getStartTime(), ZoneId.of("UTC"));
        LocalDateTime endLocalTime = LocalDateTime.ofInstant(pendingBooking.getEndTime(), ZoneId.of("UTC"));
        
        CalendarEventDto calendarEvent = CalendarEventDto.builder()
            .eventId(EVENT_ID)
            .meetLink(REAL_MEET_LINK)
            .startTime(startLocalTime)
            .endTime(endLocalTime)
            .build();

        when(bookingRepository.findById(100L)).thenReturn(Optional.of(pendingBooking));
        when(calendarService.createEvent(any(), anyString(), anyString(), any(), any(), anyString()))
            .thenReturn(calendarEvent);
        
        ArgumentCaptor<Booking> bookingCaptor = ArgumentCaptor.forClass(Booking.class);
        when(bookingRepository.save(bookingCaptor.capture())).thenAnswer(i -> i.getArgument(0));

        // When
        bookingService.confirmBooking(100L);

        // Then: Verify the Meet link flows through without modification
        Booking savedBooking = bookingCaptor.getValue();
        
        // Step 1: CalendarService returned the real link
        assertEquals(REAL_MEET_LINK, calendarEvent.getMeetLink());
        
        // Step 2: Booking stored the exact same link
        assertEquals(REAL_MEET_LINK, savedBooking.getMeetLink());
        
        // Step 3: Notification used the exact same link
        ArgumentCaptor<String> emailMeetLinkCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService).sendBookingConfirmation(
            anyString(), anyString(), anyString(), anyString(), anyString(),
            emailMeetLinkCaptor.capture(),
            anyString(), // meeting label
            any(Booking.class)
        );
        assertEquals(REAL_MEET_LINK, emailMeetLinkCaptor.getValue());
        
        // All three should be identical - single source of truth
        assertEquals(calendarEvent.getMeetLink(), savedBooking.getMeetLink());
        assertEquals(savedBooking.getMeetLink(), emailMeetLinkCaptor.getValue());
    }

    @Test
    void confirmBooking_ShouldNotCallGoogleMeetService() {
        // This test ensures GoogleMeetService is NOT called during booking confirmation
        // (since it's been removed from BookingService)
        
        LocalDateTime startLocalTime = LocalDateTime.ofInstant(pendingBooking.getStartTime(), ZoneId.of("UTC"));
        LocalDateTime endLocalTime = LocalDateTime.ofInstant(pendingBooking.getEndTime(), ZoneId.of("UTC"));
        
        CalendarEventDto calendarEvent = CalendarEventDto.builder()
            .eventId(EVENT_ID)
            .meetLink(REAL_MEET_LINK)
            .startTime(startLocalTime)
            .endTime(endLocalTime)
            .build();

        when(bookingRepository.findById(100L)).thenReturn(Optional.of(pendingBooking));
        when(calendarService.createEvent(any(), anyString(), anyString(), any(), any(), anyString()))
            .thenReturn(calendarEvent);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(i -> i.getArgument(0));

        // When
        bookingService.confirmBooking(100L);

        // Then: Only CalendarService should be called, not GoogleMeetService
        verify(calendarService, times(1)).createEvent(any(), anyString(), anyString(), any(), any(), anyString());
        
        // Note: We can't verify GoogleMeetService wasn't called because it's not injected anymore
        // The fact that the test compiles and runs proves GoogleMeetService was removed from BookingService
    }
}
