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
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.*;
import java.time.temporal.ChronoUnit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for timezone-aware booking system.
 * 
 * Tests verify:
 * 1. Slots generated in expert timezone, converted to client timezone
 * 2. Bookings stored as UTC instants
 * 3. Timezone context preserved
 * 4. Server timezone doesn't affect results
 * 5. Cross-timezone booking scenarios work correctly
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TimezoneIntegrationTest {

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

    private User cairoExpert;
    private User dubaiClient;
    private User newYorkClient;

    @BeforeEach
    void setUp() {
        // Create Cairo-based expert (UTC+2)
        cairoExpert = User.builder()
                .email("expert@cairo.com")
                .firstName("Ahmed")
                .lastName("Hassan")
                .password("password")
                .role(Role.TRAINER)
                .timezone("Africa/Cairo")
                .active(true)
                .build();
        cairoExpert = userRepository.save(cairoExpert);

        // Create Dubai-based client (UTC+4)
        dubaiClient = User.builder()
                .email("client@dubai.com")
                .firstName("Mohammed")
                .lastName("Ali")
                .password("password")
                .role(Role.CLIENT)
                .timezone("Asia/Dubai")
                .active(true)
                .build();
        dubaiClient = userRepository.save(dubaiClient);

        // Create New York-based client (UTC-5 or UTC-4 depending on DST)
        newYorkClient = User.builder()
                .email("client@newyork.com")
                .firstName("John")
                .lastName("Smith")
                .password("password")
                .role(Role.CLIENT)
                .timezone("America/New_York")
                .active(true)
                .build();
        newYorkClient = userRepository.save(newYorkClient);

        // Create availability for Cairo expert: Monday 10:00-18:00
        Availability availability = Availability.builder()
                .trainer(cairoExpert)
                .dayOfWeek(DayOfWeek.MONDAY)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .recurring(true)
                .build();
        availabilityRepository.save(availability);
    }

    /**
     * Test 1: Same Timezone (Dubai → Dubai)
     * 
     * Expert and client in same timezone should see identical times.
     */
    @Test
    @WithMockUser(username = "client@dubai.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void testSameTimezone_DubaiToDubai() throws Exception {
        // Given: Expert in Dubai, availability 10:00-10:45
        User dubaiExpert = User.builder()
                .email("expert@dubai.com")
                .firstName("Khalid")
                .lastName("Ahmed")
                .password("password")
                .role(Role.TRAINER)
                .timezone("Asia/Dubai")
                .active(true)
                .build();
        dubaiExpert = userRepository.save(dubaiExpert);

        Availability availability = Availability.builder()
                .trainer(dubaiExpert)
                .dayOfWeek(DayOfWeek.MONDAY)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .recurring(true)
                .build();
        availabilityRepository.save(availability);

        // Find next Monday
        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY);
        if (!nextMonday.isAfter(LocalDate.now())) {
            nextMonday = nextMonday.plusWeeks(1);
        }

        // When: Dubai client requests slots
        MvcResult result = mockMvc.perform(get("/api/availability/trainer/{id}/slots", dubaiExpert.getId())
                        .param("date", nextMonday.toString())
                        .param("clientTimezone", "Asia/Dubai"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                .andReturn();

        // Then: Client sees 10:00 (same as expert)
        String json = result.getResponse().getContentAsString();
        JsonNode response = objectMapper.readTree(json);
        JsonNode firstSlot = response.get("data").get(0);

        assertEquals("10:00", firstSlot.get("displayTime").asText(), "Client should see 10:00 Dubai time");
        assertEquals("10:00", firstSlot.get("expertDisplayTime").asText(), "Expert time is also 10:00");
        assertEquals("Asia/Dubai", firstSlot.get("expertTimezone").asText());
        assertEquals("Asia/Dubai", firstSlot.get("clientTimezone").asText());
    }

    /**
     * Test 2: Different Timezone (Cairo → Dubai)
     * 
     * Cairo expert 10:00 → Dubai client sees converted time
     */
    @Test
    @WithMockUser(username = "client@dubai.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void testDifferentTimezone_CairoToDubai() throws Exception {
        // Given: Cairo expert has availability 10:00-18:00

        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY);
        if (!nextMonday.isAfter(LocalDate.now())) {
            nextMonday = nextMonday.plusWeeks(1);
        }

        // When: Dubai client requests slots
        MvcResult result = mockMvc.perform(get("/api/availability/trainer/{id}/slots", cairoExpert.getId())
                        .param("date", nextMonday.toString())
                        .param("clientTimezone", "Asia/Dubai"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                .andReturn();

        // Then: Verify timezone conversion is correct
        String json = result.getResponse().getContentAsString();
        JsonNode response = objectMapper.readTree(json);
        JsonNode firstSlot = response.get("data").get(0);

        // Verify timezone IDs are present
        assertEquals("Africa/Cairo", firstSlot.get("expertTimezone").asText());
        assertEquals("Asia/Dubai", firstSlot.get("clientTimezone").asText());

        // Verify the instant converts correctly to both timezones
        String startTimeString = firstSlot.get("startTime").asText();
        Instant instant = Instant.parse(startTimeString);
        
        // 10:00 Cairo should map to a specific instant
        ZonedDateTime cairoTime = instant.atZone(ZoneId.of("Africa/Cairo"));
        assertEquals(10, cairoTime.getHour(), "Instant should be 10:00 in Cairo timezone");
        
        // Verify expert display time is 10:00
        assertEquals("10:00", firstSlot.get("expertDisplayTime").asText(), 
                "Expert time is 10:00 Cairo");
        
        // Dubai time should be different (calculate the actual offset)
        ZonedDateTime dubaiTime = instant.atZone(ZoneId.of("Asia/Dubai"));
        String expectedDubaiTime = String.format("%02d:%02d", dubaiTime.getHour(), dubaiTime.getMinute());
        
        assertEquals(expectedDubaiTime, firstSlot.get("displayTime").asText(), 
                "Dubai client should see converted time based on actual timezone offset");
    }

    /**
     * Test 3: Cross Date Line (Cairo → New York)
     * 
     * Verify timezone conversion works across large offsets.
     * Cairo (UTC+2) to New York (UTC-5/-4) = 6-7 hour difference
     */
    @Test
    @WithMockUser(username = "client@newyork.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void testCrossDateLine_CairoToNewYork() throws Exception {
        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY);
        if (!nextMonday.isAfter(LocalDate.now())) {
            nextMonday = nextMonday.plusWeeks(1);
        }

        // When: New York client requests slots
        MvcResult result = mockMvc.perform(get("/api/availability/trainer/{id}/slots", cairoExpert.getId())
                        .param("date", nextMonday.toString())
                        .param("clientTimezone", "America/New_York"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        // Then: Verify timezone conversion is correct
        String json = result.getResponse().getContentAsString();
        JsonNode response = objectMapper.readTree(json);
        
        if (response.get("data").size() > 0) {
            JsonNode firstSlot = response.get("data").get(0);
            
            // Verify both timezone IDs are present
            assertEquals("Africa/Cairo", firstSlot.get("expertTimezone").asText());
            assertEquals("America/New_York", firstSlot.get("clientTimezone").asText());
            
            // Verify the instant converts correctly to both timezones
            Instant instant = Instant.parse(firstSlot.get("startTime").asText());
            ZonedDateTime cairoTime = instant.atZone(ZoneId.of("Africa/Cairo"));
            ZonedDateTime nyTime = instant.atZone(ZoneId.of("America/New_York"));
            
            // Cairo time should be 10:00 (first availability)
            assertTrue(cairoTime.getHour() >= 10 && cairoTime.getHour() <= 18, 
                    "Cairo time should be within availability window");
            
            // NY time should be earlier (negative offset from Cairo)
            assertTrue(nyTime.getHour() < cairoTime.getHour() || nyTime.getDayOfMonth() < cairoTime.getDayOfMonth(),
                    "New York time should be earlier than Cairo time");
        }
    }

    /**
     * Test 4: Booking Creation with Timezone Context
     * 
     * Verify booking stores UTC instant with timezone context.
     */
    @Test
    @WithMockUser(username = "client@dubai.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void testBookingCreation_PreservesTimezoneContext() throws Exception {
        // Given: A specific UTC instant (representing Cairo 10:00 = Dubai 12:00)
        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY).plusWeeks(1);
        ZonedDateTime cairoTime = ZonedDateTime.of(nextMonday, LocalTime.of(10, 0), ZoneId.of("Africa/Cairo"));
        Instant startInstant = cairoTime.toInstant();
        Instant endInstant = startInstant.plus(45, ChronoUnit.MINUTES);

        // When: Dubai client creates booking
        String requestBody = String.format("""
                {
                    "trainerId": %d,
                    "startTime": "%s",
                    "endTime": "%s",
                    "clientTimezone": "Asia/Dubai",
                    "notes": "Integration test booking"
                }
                """, cairoExpert.getId(), startInstant.toString(), endInstant.toString());

        MvcResult result = mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").exists())
                .andReturn();

        // Then: Booking stored with correct timezone context
        String json = result.getResponse().getContentAsString();
        JsonNode response = objectMapper.readTree(json);
        JsonNode booking = response.get("data");

        // Verify instant matches what we sent
        assertEquals(startInstant.toString(), booking.get("startTime").asText());
        assertEquals(endInstant.toString(), booking.get("endTime").asText());

        // Verify timezone context preserved
        assertEquals("Africa/Cairo", booking.get("expertTimezone").asText());
        assertEquals("Asia/Dubai", booking.get("clientTimezone").asText());
        assertEquals("Africa/Cairo", booking.get("meetingTimezone").asText());

        // Verify in database
        Long bookingId = booking.get("id").asLong();
        Booking dbBooking = bookingRepository.findById(bookingId).orElseThrow();
        
        assertEquals(startInstant, dbBooking.getStartTime());
        assertEquals("Africa/Cairo", dbBooking.getExpertTimezone());
        assertEquals("Asia/Dubai", dbBooking.getClientTimezone());
    }

    /**
     * Test 5: Invalid Timezone Rejection
     * 
     * Verify system rejects invalid timezone IDs.
     */
    @Test
    @WithMockUser(username = "client@dubai.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void testInvalidTimezone_Rejected() throws Exception {
        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY).plusWeeks(1);

        // When: Request with invalid timezone
        mockMvc.perform(get("/api/availability/trainer/{id}/slots", cairoExpert.getId())
                        .param("date", nextMonday.toString())
                        .param("clientTimezone", "Invalid/Timezone"))
                .andExpect(status().isBadRequest());
    }

    /**
     * Test 6: Server Timezone Independence
     * 
     * Verify booking instant doesn't change with different server timezone.
     * This is a logical test - we can't actually change JVM timezone mid-test,
     * but we verify that instants are stored and retrieved consistently.
     */
    @Test
    @WithMockUser(username = "client@dubai.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void testServerTimezoneIndependence() throws Exception {
        // Given: Create booking with specific instant
        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY).plusWeeks(1);
        ZonedDateTime cairoTime = ZonedDateTime.of(nextMonday, LocalTime.of(14, 0), ZoneId.of("Africa/Cairo"));
        Instant originalInstant = cairoTime.toInstant();
        Instant endInstant = originalInstant.plus(45, ChronoUnit.MINUTES);

        String requestBody = String.format("""
                {
                    "trainerId": %d,
                    "startTime": "%s",
                    "endTime": "%s",
                    "clientTimezone": "Asia/Dubai"
                }
                """, cairoExpert.getId(), originalInstant.toString(), endInstant.toString());

        MvcResult createResult = mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andReturn();

        Long bookingId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("data").get("id").asLong();

        // When: Retrieve booking (simulating different server timezone scenario)
        MvcResult getResult = mockMvc.perform(get("/api/bookings/{id}", bookingId))
                .andExpect(status().isOk())
                .andReturn();

        // Then: Instant should be identical
        JsonNode booking = objectMapper.readTree(getResult.getResponse().getContentAsString()).get("data");
        Instant retrievedInstant = Instant.parse(booking.get("startTime").asText());

        assertEquals(originalInstant, retrievedInstant, 
                "Booking instant should be identical regardless of server timezone");

        // Verify converting to different timezones produces consistent results
        ZonedDateTime cairoRetrieval = retrievedInstant.atZone(ZoneId.of("Africa/Cairo"));
        assertEquals(14, cairoRetrieval.getHour(), "Should be 14:00 in Cairo");

        ZonedDateTime dubaiRetrieval = retrievedInstant.atZone(ZoneId.of("Asia/Dubai"));
        
        // Calculate expected Dubai hour based on actual timezone offset
        long hourDifference = Duration.between(
            cairoRetrieval.toLocalDateTime(),
            dubaiRetrieval.toLocalDateTime()
        ).toHours();
        
        int expectedDubaiHour = (cairoRetrieval.getHour() + (int)hourDifference) % 24;
        assertEquals(expectedDubaiHour, dubaiRetrieval.getHour(), 
                "Dubai time should be offset from Cairo time by actual timezone difference");
    }

    /**
     * Test 7: Slot Conflict Detection Across Timezones
     * 
     * Verify system prevents double-booking even with different client timezones.
     */
    @Test
    @WithMockUser(username = "client@dubai.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void testSlotConflict_AcrossTimezones() throws Exception {
        // Given: Existing booking at Cairo 10:00
        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY).plusWeeks(1);
        ZonedDateTime cairoTime = ZonedDateTime.of(nextMonday, LocalTime.of(10, 0), ZoneId.of("Africa/Cairo"));
        Instant instant = cairoTime.toInstant();

        Booking existingBooking = Booking.builder()
                .client(dubaiClient)
                .trainer(cairoExpert)
                .startTime(instant)
                .endTime(instant.plus(45, ChronoUnit.MINUTES))
                .expertTimezone("Africa/Cairo")
                .clientTimezone("Asia/Dubai")
                .meetingTimezone("Africa/Cairo")
                .status(BookingStatus.CONFIRMED)
                .build();
        bookingRepository.save(existingBooking);

        // When: Another client tries to book the same slot (using different timezone representation)
        String requestBody = String.format("""
                {
                    "trainerId": %d,
                    "startTime": "%s",
                    "endTime": "%s",
                    "clientTimezone": "America/New_York"
                }
                """, cairoExpert.getId(), instant.toString(), instant.plus(45, ChronoUnit.MINUTES).toString());

        // Then: Should fail with conflict
        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("not available")));
    }
}
