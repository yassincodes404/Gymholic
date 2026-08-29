package com.gymholic.integration;

import com.gymholic.availability.AvailabilityRepository;
import com.gymholic.availability.entity.Availability;
import com.gymholic.booking.BookingRepository;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import com.gymholic.common.enums.Role;
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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Slot generation semantics: slots must fall on the CLIENT's picked
 * calendar date, never start in the past, skip DST-gap local times, and
 * be blocked by the same overlap rule booking creation uses.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SlotGenerationIntegrationTest {

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

    @BeforeEach
    void setUp() {
        trainer = User.builder()
                .email("slotexpert@gymholic.com")
                .firstName("Slot")
                .lastName("Expert")
                .password("password")
                .role(Role.TRAINER)
                .timezone("UTC")
                .active(true)
                .build();
        trainer = userRepository.save(trainer);
    }

    private JsonNode fetchSlots(Long trainerId, LocalDate date, String clientTimezone) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/availability/trainer/{id}/slots", trainerId)
                        .param("date", date.toString())
                        .param("clientTimezone", clientTimezone))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }

    /**
     * A big offset between the expert and the client must not leak slots
     * onto a different client-calendar day: every returned slot has to
     * start on the picked date in the client's own zone.
     */
    @Test
    @WithMockUser(username = "client@newyork.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void slots_AlwaysFallOnPickedClientDate() throws Exception {
        // Expert in Auckland (UTC+13 in southern summer) with an all-day window
        User aucklandExpert = userRepository.save(User.builder()
                .email("expert@auckland.com")
                .firstName("Auck")
                .lastName("Land")
                .password("password")
                .role(Role.TRAINER)
                .timezone("Pacific/Auckland")
                .active(true)
                .build());
        for (DayOfWeek day : DayOfWeek.values()) {
            availabilityRepository.save(Availability.builder()
                    .trainer(aucklandExpert)
                    .dayOfWeek(day)
                    .startTime(LocalTime.of(6, 0))
                    .endTime(LocalTime.of(22, 0))
                    .recurring(true)
                    .build());
        }

        // A January Monday: Auckland (UTC+13) is 17-18h ahead of New York (UTC-5),
        // so the NY Monday spans deep into the Auckland Tuesday.
        LocalDate pickedDate = LocalDate.of(2027, 1, 11);
        assertEquals(DayOfWeek.MONDAY, pickedDate.getDayOfWeek());

        JsonNode slots = fetchSlots(aucklandExpert.getId(), pickedDate, "America/New_York");

        assertTrue(slots.size() > 0, "Expected slots for the picked client date");
        ZoneId clientZone = ZoneId.of("America/New_York");
        for (JsonNode slot : slots) {
            Instant start = Instant.parse(slot.get("startTime").asText());
            assertEquals(pickedDate, start.atZone(clientZone).toLocalDate(),
                    "Slot must start on the client's picked calendar date");
        }
    }

    /** No slot may start in the past — a request for yesterday always comes back empty. */
    @Test
    @WithMockUser(username = "client@newyork.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void slots_PastDate_ReturnsNone() throws Exception {
        // "Yesterday" must be computed in the zone the query runs in: with a
        // JVM default zone ahead of UTC (e.g. Africa/Cairo), LocalDate.now()
        // can already be on tomorrow's date and minusDays(1) still has
        // unstarted — correctly offered — UTC slots.
        LocalDate yesterday = LocalDate.now(ZoneOffset.UTC).minusDays(1);
        availabilityRepository.save(Availability.builder()
                .trainer(trainer)
                .dayOfWeek(yesterday.getDayOfWeek())
                .startTime(LocalTime.of(0, 0))
                .endTime(LocalTime.of(23, 59))
                .recurring(true)
                .build());

        JsonNode slots = fetchSlots(trainer.getId(), yesterday, "UTC");
        assertEquals(0, slots.size(), "Past dates must not offer any slots");
    }

    /** Same rule for today: whatever comes back must still be in the future. */
    @Test
    @WithMockUser(username = "client@newyork.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void slots_Today_NeverStartInThePast() throws Exception {
        availabilityRepository.save(Availability.builder()
                .trainer(trainer)
                .dayOfWeek(LocalDate.now().getDayOfWeek())
                .startTime(LocalTime.of(0, 0))
                .endTime(LocalTime.of(23, 59))
                .recurring(true)
                .build());

        JsonNode slots = fetchSlots(trainer.getId(), LocalDate.now(), "UTC");
        Instant now = Instant.now();
        for (JsonNode slot : slots) {
            assertFalse(Instant.parse(slot.get("startTime").asText()).isBefore(now),
                    "Slots starting today must not be in the past");
        }
    }

    /**
     * Listing conflict rule must match creation: a booking overlapping a
     * slot by any amount (±5-minute buffer) hides it — not just bookings
     * starting within 45 minutes of the slot.
     */
    @Test
    @WithMockUser(username = "client@newyork.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void slots_BookingOverlappingMidSlot_BlocksIt() throws Exception {
        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY);
        if (!nextMonday.isAfter(LocalDate.now())) {
            nextMonday = nextMonday.plusWeeks(1);
        }
        availabilityRepository.save(Availability.builder()
                .trainer(trainer)
                .dayOfWeek(DayOfWeek.MONDAY)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .recurring(true)
                .build());

        // Booking 11:35-12:20 UTC: grid slots are 10:00, 10:50, 11:40, ...
        // 10:50-11:35 touches the booking start (buffered) but the old
        // |start-distance| heuristic would have kept it visible.
        ZonedDateTime start = ZonedDateTime.of(nextMonday, LocalTime.of(11, 35), ZoneId.of("UTC"));
        User booker = userRepository.save(User.builder()
                .email("booker@gymholic.com")
                .firstName("Book")
                .lastName("Er")
                .password("password")
                .role(Role.CLIENT)
                .timezone("UTC")
                .active(true)
                .build());
        bookingRepository.save(Booking.builder()
                .client(booker)
                .trainer(trainer)
                .startTime(start.toInstant())
                .endTime(start.plus(45, ChronoUnit.MINUTES).toInstant())
                .expertTimezone("UTC")
                .clientTimezone("UTC")
                .meetingTimezone("UTC")
                .status(BookingStatus.CONFIRMED)
                .build());

        JsonNode slots = fetchSlots(trainer.getId(), nextMonday, "UTC");
        List<String> times = new ArrayList<>();
        for (JsonNode slot : slots) {
            times.add(slot.get("expertDisplayTime").asText());
        }
        assertTrue(times.contains("10:00"), "Untouched slot must stay visible");
        assertFalse(times.contains("10:50"), "Slot overlapping the booking start must be hidden");
        assertFalse(times.contains("11:40"), "Slot overlapping the booking end must be hidden");
    }

    /** DST gap: expert-local times that don't exist (spring-forward hour) are skipped, not shifted. */
    @Test
    @WithMockUser(username = "client@newyork.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void slots_DstGapTimes_AreSkipped() throws Exception {
        User nyExpert = userRepository.save(User.builder()
                .email("expert@newyork.com")
                .firstName("New")
                .lastName("York")
                .password("password")
                .role(Role.TRAINER)
                .timezone("America/New_York")
                .active(true)
                .build());
        // 2027-03-14: US spring forward, 02:00-03:00 doesn't exist in New York.
        availabilityRepository.save(Availability.builder()
                .trainer(nyExpert)
                .startTime(LocalTime.of(1, 30))
                .endTime(LocalTime.of(4, 0))
                .recurring(false)
                .specificDate(LocalDate.of(2027, 3, 14))
                .build());

        JsonNode slots = fetchSlots(nyExpert.getId(), LocalDate.of(2027, 3, 14), "America/New_York");
        List<String> times = new ArrayList<>();
        for (JsonNode slot : slots) {
            times.add(slot.get("expertDisplayTime").asText());
        }
        assertTrue(times.contains("01:30"), "Valid pre-gap slot must exist");
        assertFalse(times.contains("02:20"), "DST-gap local time must be skipped");
        assertTrue(times.contains("03:10"), "Valid post-gap slot must exist");
    }
}
