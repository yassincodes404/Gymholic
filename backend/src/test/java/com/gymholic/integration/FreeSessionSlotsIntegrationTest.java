package com.gymholic.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.availability.AvailabilityRepository;
import com.gymholic.availability.entity.Availability;
import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingServiceType;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.common.enums.Role;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Free-session slot generation + the month calendar endpoint: 3-hour blocks
 * on a 30-minute grid that must fit inside one window, one-per-day blocking
 * from the moment the day's free session is taken, and backward
 * compatibility for the standard 45-minute endpoint.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FreeSessionSlotsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AvailabilityRepository availabilityRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private User trainer;
    private User booker;

    @BeforeEach
    void setUp() {
        trainer = userRepository.save(User.builder()
                .email("freeslotexpert@gymholic.com").firstName("Free").lastName("Slots")
                .password("password").role(Role.TRAINER).timezone("UTC").active(true).build());
        booker = userRepository.save(User.builder()
                .email("freeslotbooker@gymholic.com").firstName("Book").lastName("Er")
                .password("password").role(Role.CLIENT).timezone("UTC").active(true).build());
    }

    private com.fasterxml.jackson.databind.JsonNode fetchSlots(Long trainerId, LocalDate date,
                                                               String clientTimezone, String service) throws Exception {
        StringBuilder url = new StringBuilder("/api/availability/trainer/{id}/slots")
                .append("?date=").append(date)
                .append("&clientTimezone=").append(clientTimezone);
        if (service != null) {
            url.append("&service=").append(service);
        }
        MvcResult result = mockMvc.perform(get(url.toString(), trainerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    private Map<String, String> fetchCalendar(Long trainerId, String month, String service) throws Exception {
        StringBuilder url = new StringBuilder("/api/availability/trainer/{id}/calendar")
                .append("?month=").append(month)
                .append("&clientTimezone=UTC");
        if (service != null) {
            url.append("&service=").append(service);
        }
        MvcResult result = mockMvc.perform(get(url.toString(), trainerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();
        Map<String, String> statuses = new HashMap<>();
        for (var node : objectMapper.readTree(result.getResponse().getContentAsString()).get("data")) {
            statuses.put(node.get("date").asText(), node.get("status").asText());
        }
        return statuses;
    }

    /** All test dates come from next month so every picked day is future AND inside one calendar month. */
    private static final java.time.YearMonth TARGET_MONTH = java.time.YearMonth.now().plusMonths(1);

    private LocalDate future(DayOfWeek dayOfWeek) {
        return TARGET_MONTH.atDay(1)
                .with(java.time.temporal.TemporalAdjusters.nextOrSame(dayOfWeek));
    }

    private void book(User client, ZonedDateTime start, long minutes, BookingServiceType serviceType) {
        bookingRepository.save(Booking.builder()
                .client(client)
                .trainer(trainer)
                .startTime(start.toInstant())
                .endTime(start.plus(minutes, ChronoUnit.MINUTES).toInstant())
                .expertTimezone("UTC")
                .clientTimezone("UTC")
                .meetingTimezone("UTC")
                .serviceType(serviceType)
                .status(BookingStatus.CONFIRMED)
                .build());
    }

    /** 09:00–13:00 UTC Monday window: free blocks 09:00, 09:30, 10:00 (each fits before 13:00). */
    @Test
    @WithMockUser(username = "client@example.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSlots_GeneratedOn30MinuteGrid_MustFitWindow() throws Exception {
        LocalDate monday = future(DayOfWeek.MONDAY);
        availabilityRepository.save(Availability.builder()
                .trainer(trainer).dayOfWeek(DayOfWeek.MONDAY)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(13, 0)).recurring(true).build());

        var slots = fetchSlots(trainer.getId(), monday, "UTC", "FREE_SESSION");

        List<String> starts = new ArrayList<>();
        slots.forEach(s -> starts.add(s.get("expertDisplayTime").asText()));
        assertEquals(List.of("09:00", "09:30", "10:00"), starts);
        // 180-minute slot length everywhere
        for (var slot : slots) {
            assertEquals(180, Duration.between(
                    java.time.Instant.parse(slot.get("startTime").asText()),
                    java.time.Instant.parse(slot.get("endTime").asText())).toMinutes());
        }
    }

    /** A window shorter than 3 hours can never fit a free block. */
    @Test
    @WithMockUser(username = "client@example.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSlots_WindowTooShort_NoSlots() throws Exception {
        LocalDate tuesday = future(DayOfWeek.TUESDAY);
        availabilityRepository.save(Availability.builder()
                .trainer(trainer).dayOfWeek(DayOfWeek.TUESDAY)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(11, 0)).recurring(true).build());

        assertEquals(0, fetchSlots(trainer.getId(), tuesday, "UTC", "FREE_SESSION").size());
        // The same window still serves the standard 45-minute grid.
        assertTrue(fetchSlots(trainer.getId(), tuesday, "UTC", null).size() > 0);
    }

    /** Once the day's free session is booked, the whole day blocks for FREE_SESSION. */
    @Test
    @WithMockUser(username = "client@example.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSlots_TakenDay_HidesAllFreeBlocks() throws Exception {
        LocalDate wednesday = future(DayOfWeek.WEDNESDAY);
        availabilityRepository.save(Availability.builder()
                .trainer(trainer).dayOfWeek(DayOfWeek.WEDNESDAY)
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(18, 0)).recurring(true).build());

        // Free session 08:00–11:00 — later 3-hour blocks would still "fit"…
        book(booker, ZonedDateTime.of(wednesday, LocalTime.of(8, 0), ZoneId.of("UTC")), 180, BookingServiceType.FREE_SESSION);

        // …but the one-per-day rule hides every FREE_SESSION slot on that day.
        assertEquals(0, fetchSlots(trainer.getId(), wednesday, "UTC", "FREE_SESSION").size());
    }

    /** A conflicting paid booking overlapping one block hides just that block. */
    @Test
    @WithMockUser(username = "client@example.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSlots_PaidConflict_BlocksOverlappingBlockOnly() throws Exception {
        LocalDate thursday = future(DayOfWeek.THURSDAY);
        availabilityRepository.save(Availability.builder()
                .trainer(trainer).dayOfWeek(DayOfWeek.THURSDAY)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(18, 0)).recurring(true).build());

        // Paid consultation 12:30–13:15 lands inside the 09:30–12:30 free block
        // (buffered), but not inside 09:00–12:00 (which only buffers to 12:05).
        book(booker, ZonedDateTime.of(thursday, LocalTime.of(12, 30), ZoneId.of("UTC")), 45, BookingServiceType.STRATEGY_CALL);

        List<String> starts = new ArrayList<>();
        fetchSlots(trainer.getId(), thursday, "UTC", "FREE_SESSION")
                .forEach(s -> starts.add(s.get("expertDisplayTime").asText()));
        assertTrue(starts.contains("09:00"), "Non-overlapping block must stay visible");
        assertFalse(starts.contains("09:30"), "Overlapping block must be hidden");
    }

    /** Default (no service param) keeps the historical 45-minute behaviour. */
    @Test
    @WithMockUser(username = "client@example.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void slots_WithoutServiceParam_Are45Minutes() throws Exception {
        LocalDate friday = future(DayOfWeek.FRIDAY);
        availabilityRepository.save(Availability.builder()
                .trainer(trainer).dayOfWeek(DayOfWeek.FRIDAY)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(11, 0)).recurring(true).build());

        var slots = fetchSlots(trainer.getId(), friday, "UTC", null);
        assertTrue(slots.size() > 0);
        for (var slot : slots) {
            assertEquals(45, Duration.between(
                    java.time.Instant.parse(slot.get("startTime").asText()),
                    java.time.Instant.parse(slot.get("endTime").asText())).toMinutes());
        }
    }

    /** Month calendar statuses: past / closed / available / booked / fully-booked. */
    @Test
    @WithMockUser(username = "client@example.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void calendar_ReportsPerDayStatuses() throws Exception {
        LocalDate monday = future(DayOfWeek.MONDAY);
        LocalDate wednesday = future(DayOfWeek.WEDNESDAY);
        // Only Mon + Wed have windows; everything else is closed.
        availabilityRepository.save(Availability.builder()
                .trainer(trainer).dayOfWeek(DayOfWeek.MONDAY)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(18, 0)).recurring(true).build());
        availabilityRepository.save(Availability.builder()
                .trainer(trainer).dayOfWeek(DayOfWeek.WEDNESDAY)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(18, 0)).recurring(true).build());

        String month = String.format("%04d-%02d", monday.getYear(), monday.getMonthValue());
        Map<String, String> statuses = fetchCalendar(trainer.getId(), month, "FREE_SESSION");

        assertEquals("closed", statuses.get(future(DayOfWeek.TUESDAY).toString()));
        assertEquals("available", statuses.get(monday.toString()));
        assertEquals("available", statuses.get(wednesday.toString()));

        // Take Wednesday's free session → the day flips to booked for FREE_SESSION…
        book(booker, ZonedDateTime.of(wednesday, LocalTime.of(9, 0), ZoneId.of("UTC")), 180, BookingServiceType.FREE_SESSION);
        statuses = fetchCalendar(trainer.getId(), month, "FREE_SESSION");
        assertEquals("booked", statuses.get(wednesday.toString()));

        // …while the standard 45-minute calendar keeps it bookable.
        statuses = fetchCalendar(trainer.getId(), month, null);
        assertEquals("available", statuses.get(wednesday.toString()));
    }

    /** A day whose single 45-minute slot is taken reports fully-booked on the standard calendar. */
    @Test
    @WithMockUser(username = "client@example.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void calendar_SingleSlotTaken_ReportsFullyBooked() throws Exception {
        LocalDate tuesday = future(DayOfWeek.TUESDAY);
        availabilityRepository.save(Availability.builder()
                .trainer(trainer).dayOfWeek(DayOfWeek.TUESDAY)
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(9, 45)).recurring(true).build());
        book(booker, ZonedDateTime.of(tuesday, LocalTime.of(9, 0), ZoneId.of("UTC")), 45, BookingServiceType.OPEN_SESSION);

        String month = String.format("%04d-%02d", tuesday.getYear(), tuesday.getMonthValue());
        Map<String, String> statuses = fetchCalendar(trainer.getId(), month, null);
        assertEquals("fully-booked", statuses.get(tuesday.toString()));
    }

    /** Slots for a client in a far offset never leak off the picked client date. */
    @Test
    @WithMockUser(username = "client@example.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSlots_AlwaysStartOnPickedClientDate() throws Exception {
        User auckland = userRepository.save(User.builder()
                .email("freeexpert@auckland.com").firstName("Auck").lastName("Land")
                .password("password").role(Role.TRAINER).timezone("Pacific/Auckland").active(true).build());
        for (DayOfWeek day : DayOfWeek.values()) {
            availabilityRepository.save(Availability.builder()
                    .trainer(auckland).dayOfWeek(day)
                    .startTime(LocalTime.of(6, 0)).endTime(LocalTime.of(22, 0)).recurring(true).build());
        }

        LocalDate picked = LocalDate.now().plusWeeks(3).with(DayOfWeek.MONDAY);
        var slots = fetchSlots(auckland.getId(), picked, "America/New_York", "FREE_SESSION");
        ZoneId clientZone = ZoneId.of("America/New_York");
        for (var slot : slots) {
            assertEquals(picked,
                    java.time.Instant.parse(slot.get("startTime").asText()).atZone(clientZone).toLocalDate(),
                    "Free slot must start on the client's picked calendar date");
        }
    }

    /** Bad month format fails with a clear 400. */
    @Test
    @WithMockUser(username = "client@example.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void calendar_InvalidMonth_400() throws Exception {
        mockMvc.perform(get("/api/availability/trainer/{id}/calendar?month=not-a-month&clientTimezone=UTC",
                        trainer.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("YYYY-MM")));
    }
}
