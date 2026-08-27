package com.gymholic.booking;

import com.gymholic.availability.AvailabilityRepository;
import com.gymholic.availability.entity.Availability;
import com.gymholic.booking.entity.Booking;
import com.gymholic.common.enums.BookingStatus;
import com.gymholic.common.enums.Role;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Creation conflict semantics: a client's own unpaid PENDING hold must not
 * block their fresh booking attempt for the same slot, while everyone
 * else's PENDING/CONFIRMED bookings still do.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class BookingCreationConflictIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AvailabilityRepository availabilityRepository;

    @Autowired
    private BookingRepository bookingRepository;

    private User client;
    private User otherClient;
    private User trainer;
    private ZonedDateTime slotStart;

    @BeforeEach
    void setUp() {
        client = userRepository.save(User.builder()
                .email("retryclient@gymholic.com").firstName("Re").lastName("Try")
                .password("password").role(Role.CLIENT).timezone("UTC").active(true).build());
        otherClient = userRepository.save(User.builder()
                .email("otherclient@gymholic.com").firstName("Oth").lastName("Er")
                .password("password").role(Role.CLIENT).timezone("UTC").active(true).build());
        trainer = userRepository.save(User.builder()
                .email("conflicttrainer@gymholic.com").firstName("Con").lastName("Flict")
                .password("password").role(Role.TRAINER).timezone("UTC").active(true).build());

        availabilityRepository.save(Availability.builder()
                .trainer(trainer)
                .dayOfWeek(DayOfWeek.MONDAY)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .recurring(true)
                .build());

        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY);
        if (!nextMonday.isAfter(LocalDate.now().plusWeeks(1))) {
            nextMonday = nextMonday.plusWeeks(2);
        }
        slotStart = ZonedDateTime.of(nextMonday, LocalTime.of(10, 0), ZoneId.of("UTC"));
    }

    private String bookingBody(ZonedDateTime start) {
        return String.format("""
                {"trainerId": %d, "startTime": "%s", "endTime": "%s", "clientTimezone": "UTC"}
                """,
                trainer.getId(),
                start.toInstant().toString(),
                start.plus(45, ChronoUnit.MINUTES).toInstant().toString());
    }

    @Test
    @WithMockUser(username = "retryclient@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void createBooking_SameClientOwnPendingHold_DoesNotBlock() throws Exception {
        bookingRepository.save(Booking.builder()
                .client(client)
                .trainer(trainer)
                .startTime(slotStart.toInstant())
                .endTime(slotStart.plus(45, ChronoUnit.MINUTES).toInstant())
                .expertTimezone("UTC")
                .clientTimezone("UTC")
                .meetingTimezone("UTC")
                .status(BookingStatus.PENDING)
                .build());

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(slotStart)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    @WithMockUser(username = "otherclient@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void createBooking_SomeoneElsePendingHold_StillBlocks() throws Exception {
        bookingRepository.save(Booking.builder()
                .client(client)
                .trainer(trainer)
                .startTime(slotStart.toInstant())
                .endTime(slotStart.plus(45, ChronoUnit.MINUTES).toInstant())
                .expertTimezone("UTC")
                .clientTimezone("UTC")
                .meetingTimezone("UTC")
                .status(BookingStatus.PENDING)
                .build());

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(slotStart)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("not available")));
    }
}
