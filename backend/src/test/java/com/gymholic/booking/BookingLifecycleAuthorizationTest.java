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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Booking lifecycle endpoints are scoped: bookings are visible to their
 * client, their trainer and admins; confirm is admin-only; cancel is
 * client/trainer/admin; reschedule is trainer/admin. Availability
 * creation/deletion is limited to admins and the owning trainer.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class BookingLifecycleAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private AvailabilityRepository availabilityRepository;

    private User client;
    private User stranger;
    private User trainer;
    private User admin;
    private Booking booking;

    @BeforeEach
    void setUp() {
        client = userRepository.save(User.builder()
                .email("owner@gymholic.com").firstName("Ow").lastName("Ner")
                .password("password").role(Role.CLIENT).timezone("UTC").active(true).build());
        stranger = userRepository.save(User.builder()
                .email("stranger@gymholic.com").firstName("Str").lastName("Anger")
                .password("password").role(Role.CLIENT).timezone("UTC").active(true).build());
        trainer = userRepository.save(User.builder()
                .email("trainer@gymholic.com").firstName("Tra").lastName("Iner")
                .password("password").role(Role.TRAINER).timezone("UTC").active(true).build());
        admin = userRepository.save(User.builder()
                .email("admin@gymholic.com").firstName("Ad").lastName("Min")
                .password("password").role(Role.ADMIN).timezone("UTC").active(true).build());

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
        ZonedDateTime start = ZonedDateTime.of(nextMonday, LocalTime.of(10, 0), ZoneId.of("UTC"));

        booking = bookingRepository.save(Booking.builder()
                .client(client)
                .trainer(trainer)
                .startTime(start.toInstant())
                .endTime(start.plus(45, ChronoUnit.MINUTES).toInstant())
                .expertTimezone("UTC")
                .clientTimezone("UTC")
                .meetingTimezone("UTC")
                .status(BookingStatus.PENDING)
                .build());
    }

    private String rescheduleBody(ZonedDateTime newStart) {
        return String.format("""
                {"newStartTime": "%s", "newEndTime": "%s"}
                """,
                newStart.toInstant().toString().replaceFirst("\\.\\d{3}", ""),
                newStart.plus(45, ChronoUnit.MINUTES).toInstant().toString().replaceFirst("\\.\\d{3}", ""));
    }

    @Test
    @WithMockUser(username = "owner@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void getBooking_AsOwnerClient_Allowed() throws Exception {
        mockMvc.perform(get("/api/bookings/{id}", booking.getId())).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "stranger@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void getBooking_AsOtherClient_Forbidden() throws Exception {
        mockMvc.perform(get("/api/bookings/{id}", booking.getId())).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "trainer@gymholic.com", authorities = {"ROLE_TRAINER", "EMAIL_VERIFIED"})
    void getBooking_AsBookingTrainer_Allowed() throws Exception {
        mockMvc.perform(get("/api/bookings/{id}", booking.getId())).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin@gymholic.com", authorities = {"ROLE_ADMIN", "EMAIL_VERIFIED"})
    void getBooking_AsAdmin_Allowed() throws Exception {
        mockMvc.perform(get("/api/bookings/{id}", booking.getId())).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "owner@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void getClientBookings_AsSelf_Allowed() throws Exception {
        mockMvc.perform(get("/api/bookings/client/{id}", client.getId())).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "stranger@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void getClientBookings_AsOtherClient_Forbidden() throws Exception {
        mockMvc.perform(get("/api/bookings/client/{id}", client.getId())).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@gymholic.com", authorities = {"ROLE_ADMIN", "EMAIL_VERIFIED"})
    void getClientBookings_AsAdmin_Allowed() throws Exception {
        mockMvc.perform(get("/api/bookings/client/{id}", client.getId())).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "trainer@gymholic.com", authorities = {"ROLE_TRAINER", "EMAIL_VERIFIED"})
    void getTrainerBookings_AsSelf_Allowed() throws Exception {
        mockMvc.perform(get("/api/bookings/trainer/{id}", trainer.getId())).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "stranger@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void getTrainerBookings_AsClient_Forbidden() throws Exception {
        mockMvc.perform(get("/api/bookings/trainer/{id}", trainer.getId())).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@gymholic.com", authorities = {"ROLE_ADMIN", "EMAIL_VERIFIED"})
    void getTrainerBookings_AsAdmin_Allowed() throws Exception {
        mockMvc.perform(get("/api/bookings/trainer/{id}", trainer.getId())).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "owner@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void confirmBooking_AsClient_Forbidden() throws Exception {
        mockMvc.perform(put("/api/bookings/{id}/confirm", booking.getId())).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "trainer@gymholic.com", authorities = {"ROLE_TRAINER", "EMAIL_VERIFIED"})
    void confirmBooking_AsTrainer_Forbidden() throws Exception {
        mockMvc.perform(put("/api/bookings/{id}/confirm", booking.getId())).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@gymholic.com", authorities = {"ROLE_ADMIN", "EMAIL_VERIFIED"})
    void confirmBooking_AsAdmin_Allowed() throws Exception {
        mockMvc.perform(put("/api/bookings/{id}/confirm", booking.getId())).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "owner@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void cancelBooking_AsOwnerClient_Allowed() throws Exception {
        mockMvc.perform(put("/api/bookings/{id}/cancel", booking.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "trainer@gymholic.com", authorities = {"ROLE_TRAINER", "EMAIL_VERIFIED"})
    void cancelBooking_AsBookingTrainer_Allowed() throws Exception {
        mockMvc.perform(put("/api/bookings/{id}/cancel", booking.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "stranger@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void cancelBooking_AsOtherClient_Forbidden() throws Exception {
        mockMvc.perform(put("/api/bookings/{id}/cancel", booking.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "owner@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void rescheduleBooking_AsClient_Forbidden() throws Exception {
        ZonedDateTime newStart = booking.getStartTime()
                .atZone(ZoneId.of("UTC"))
                .plusWeeks(1)
                .withHour(11).withMinute(0).withSecond(0).withNano(0);
        mockMvc.perform(put("/api/bookings/{id}/reschedule", booking.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(rescheduleBody(newStart)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "trainer@gymholic.com", authorities = {"ROLE_TRAINER", "EMAIL_VERIFIED"})
    void rescheduleBooking_AsBookingTrainer_Allowed() throws Exception {
        ZonedDateTime newStart = booking.getStartTime()
                .atZone(ZoneId.of("UTC"))
                .plusWeeks(1)
                .withHour(11).withMinute(0).withSecond(0).withNano(0);
        mockMvc.perform(put("/api/bookings/{id}/reschedule", booking.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(rescheduleBody(newStart)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "trainer@gymholic.com", authorities = {"ROLE_TRAINER", "EMAIL_VERIFIED"})
    void rescheduleBooking_ToPastTime_Rejected() throws Exception {
        ZonedDateTime pastStart = ZonedDateTime.now(ZoneId.of("UTC")).minusDays(1)
                .withHour(11).withMinute(0).withSecond(0).withNano(0);
        mockMvc.perform(put("/api/bookings/{id}/reschedule", booking.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(rescheduleBody(pastStart)))
                .andExpect(status().isBadRequest());
    }

    // ---- Availability creation/deletion role restrictions ----

    @Test
    @WithMockUser(username = "stranger@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void createAvailability_AsClient_Forbidden() throws Exception {
        mockMvc.perform(post("/api/availability")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recurring": true, "dayOfWeek": "TUESDAY", "startTime": "10:00:00", "endTime": "18:00:00"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "trainer@gymholic.com", authorities = {"ROLE_TRAINER", "EMAIL_VERIFIED"})
    void createAvailability_AsTrainer_Allowed() throws Exception {
        mockMvc.perform(post("/api/availability")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recurring": true, "dayOfWeek": "TUESDAY", "startTime": "10:00:00", "endTime": "18:00:00"}
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser(username = "stranger@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void deleteAvailability_AsClient_Forbidden() throws Exception {
        Availability window = availabilityRepository.save(Availability.builder()
                .trainer(trainer)
                .dayOfWeek(DayOfWeek.WEDNESDAY)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .recurring(true)
                .build());
        mockMvc.perform(delete("/api/availability/{id}", window.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "owner@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void deleteAvailability_AsNonOwnerTrainer_Forbidden() throws Exception {
        User otherTrainer = userRepository.save(User.builder()
                .email("othertrainer@gymholic.com").firstName("Oth").lastName("Er")
                .password("password").role(Role.TRAINER).timezone("UTC").active(true).build());
        Availability window = availabilityRepository.save(Availability.builder()
                .trainer(otherTrainer)
                .dayOfWeek(DayOfWeek.THURSDAY)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .recurring(true)
                .build());
        mockMvc.perform(delete("/api/availability/{id}", window.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "trainer@gymholic.com", authorities = {"ROLE_TRAINER", "EMAIL_VERIFIED"})
    void deleteAvailability_AsOwnerTrainer_Allowed() throws Exception {
        Availability window = availabilityRepository.save(Availability.builder()
                .trainer(trainer)
                .dayOfWeek(DayOfWeek.FRIDAY)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .recurring(true)
                .build());
        mockMvc.perform(delete("/api/availability/{id}", window.getId()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin@gymholic.com", authorities = {"ROLE_ADMIN", "EMAIL_VERIFIED"})
    void deleteAvailability_AsAdmin_Allowed() throws Exception {
        Availability window = availabilityRepository.save(Availability.builder()
                .trainer(trainer)
                .dayOfWeek(DayOfWeek.SATURDAY)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .recurring(true)
                .build());
        mockMvc.perform(delete("/api/availability/{id}", window.getId()))
                .andExpect(status().isOk());
    }
}
