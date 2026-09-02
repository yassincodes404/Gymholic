package com.gymholic.booking;

import com.gymholic.availability.AvailabilityRepository;
import com.gymholic.availability.entity.Availability;
import com.gymholic.payment.PaymentRepository;
import com.gymholic.settings.SettingsService;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Free Time Session semantics: a PAID 3-hour session (its own admin-managed
 * price, BOOKING_PRICE_FREE_SESSION) that flows through checkout like every
 * other service, limited to ONE per trainer per expert-local day (enforced
 * under the trainer row lock taken at creation).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FreeSessionBookingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AvailabilityRepository availabilityRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private SettingsService settingsService;

    @Autowired
    private com.gymholic.payment.PaymentService paymentService;

    private User client;
    private User trainer;
    private ZonedDateTime freeSlotStart;

    @BeforeEach
    void setUp() {
        client = userRepository.save(User.builder()
                .email("freesessionclient@gymholic.com").firstName("Free").lastName("Client")
                .password("password").role(Role.CLIENT).timezone("UTC").active(true).build());
        trainer = userRepository.save(User.builder()
                .email("freesessiontrainer@gymholic.com").firstName("Free").lastName("Trainer")
                .password("password").role(Role.TRAINER).timezone("UTC").active(true).build());

        availabilityRepository.save(Availability.builder()
                .trainer(trainer)
                .dayOfWeek(DayOfWeek.MONDAY)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0))
                .recurring(true)
                .build());
        availabilityRepository.save(Availability.builder()
                .trainer(trainer)
                .dayOfWeek(DayOfWeek.WEDNESDAY)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0))
                .recurring(true)
                .build());

        settingsService.updateSetting("FREE_SESSION_ENABLED", "true");

        LocalDate nextMonday = LocalDate.now().with(DayOfWeek.MONDAY);
        if (!nextMonday.isAfter(LocalDate.now().plusWeeks(1))) {
            nextMonday = nextMonday.plusWeeks(2);
        }
        freeSlotStart = ZonedDateTime.of(nextMonday, LocalTime.of(9, 0), ZoneId.of("UTC"));
    }

    private String bookingBody(ZonedDateTime start, long minutes, String serviceType) {
        String serviceField = serviceType == null ? "" : ", \"serviceType\": \"" + serviceType + "\"";
        return String.format("""
                {"trainerId": %d, "startTime": "%s", "endTime": "%s", "clientTimezone": "UTC"%s}
                """,
                trainer.getId(),
                start.toInstant().toString(),
                start.plus(minutes, ChronoUnit.MINUTES).toInstant().toString(),
                serviceField);
    }

    @Test
    @WithMockUser(username = "freesessionclient@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSession_CreatedPending_ThenConfirmedAfterPayment() throws Exception {
        long paymentsBefore = paymentRepository.count();

        String created = mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(freeSlotStart, 180, "FREE_SESSION")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.serviceType").value("FREE_SESSION"))
                .andReturn().getResponse().getContentAsString();
        long bookingId = com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
                .readTree(created).path("data").path("id").asLong();

        // No payment row until checkout starts.
        assertThat(paymentRepository.count()).isEqualTo(paymentsBefore);

        String payment = mockMvc.perform(post("/api/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format(
                                "{\"bookingId\": %d, \"amount\": 300, \"currency\": \"USD\", \"provider\": \"mock\"}",
                                bookingId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.amount").value(300.0))
                .andReturn().getResponse().getContentAsString();
        long paymentId = com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
                .readTree(payment).path("data").path("id").asLong();

        // Completing the payment runs the standard confirm pipeline.
        paymentService.completeMockPayment(paymentId, "freesessionclient@gymholic.com", false);
        assertThat(bookingRepository.findById(bookingId).orElseThrow().getStatus())
                .isEqualTo(com.gymholic.common.enums.BookingStatus.CONFIRMED);
    }

    @Test
    @WithMockUser(username = "freesessionclient@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSession_WrongDuration_Rejected() throws Exception {
        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(freeSlotStart, 45, "FREE_SESSION")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("3 hours")));
    }

    @Test
    @WithMockUser(username = "freesessionclient@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void paidServices_StillRequire45Minutes() throws Exception {
        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(freeSlotStart, 180, "STRATEGY_CALL")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("exactly 45 minutes")));
    }

    @Test
    @WithMockUser(username = "freesessionclient@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSession_SecondSameDay_Rejected_DifferentDay_Ok() throws Exception {
        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(freeSlotStart, 180, "FREE_SESSION")))
                .andExpect(status().isCreated());

        // A second free session on the same expert-local day is refused…
        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(freeSlotStart.plusHours(4), 180, "FREE_SESSION")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("already been booked")));

        // …while another day is still open.
        LocalDate nextWednesday = freeSlotStart.toLocalDate().plusDays(2);
        ZonedDateTime wednesdayStart = ZonedDateTime.of(nextWednesday, LocalTime.of(9, 0), ZoneId.of("UTC"));
        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(wednesdayStart, 180, "FREE_SESSION")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    @WithMockUser(username = "freesessionclient@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSession_DisabledViaSettings_Rejected() throws Exception {
        settingsService.updateSetting("FREE_SESSION_ENABLED", "false");

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(freeSlotStart, 180, "FREE_SESSION")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("disabled")));

        settingsService.updateSetting("FREE_SESSION_ENABLED", "true");
    }

    @Test
    @WithMockUser(username = "freesessionclient@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSession_PaymentResolvesConfiguredPrice() throws Exception {
        settingsService.updateSetting("BOOKING_PRICE_FREE_SESSION", "250");
        try {
            String created = mockMvc.perform(post("/api/bookings")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(bookingBody(freeSlotStart, 180, "FREE_SESSION")))
                    .andExpect(status().isCreated())
                    .andReturn().getResponse().getContentAsString();
            long bookingId = com.fasterxml.jackson.databind.json.JsonMapper.builder().build()
                    .readTree(created).path("data").path("id").asLong();

            // The amount is resolved server-side from the admin setting —
            // the client-suggested number is ignored.
            mockMvc.perform(post("/api/payments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(String.format(
                                    "{\"bookingId\": %d, \"amount\": 1, \"currency\": \"USD\", \"provider\": \"mock\"}",
                                    bookingId)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.amount").value(250.0));
        } finally {
            settingsService.updateSetting("BOOKING_PRICE_FREE_SESSION", "300");
        }
    }

    @Test
    @WithMockUser(username = "freesessionclient@gymholic.com", authorities = {"ROLE_CLIENT", "EMAIL_VERIFIED"})
    void freeSession_ConflictingBooking_BlocksCreation() throws Exception {
        // Someone else's confirmed consultation 11:30–12:15 overlaps the
        // 09:00–12:00 block's buffered tail, so the free block can't be booked.
        User other = userRepository.save(User.builder()
                .email("freesessionother@gymholic.com").firstName("Oth").lastName("Er")
                .password("password").role(Role.CLIENT).timezone("UTC").active(true).build());
        bookingRepository.save(com.gymholic.booking.entity.Booking.builder()
                .client(other)
                .trainer(trainer)
                .startTime(ZonedDateTime.of(freeSlotStart.toLocalDate(), LocalTime.of(11, 30), ZoneId.of("UTC")).toInstant())
                .endTime(ZonedDateTime.of(freeSlotStart.toLocalDate(), LocalTime.of(12, 15), ZoneId.of("UTC")).toInstant())
                .expertTimezone("UTC")
                .clientTimezone("UTC")
                .meetingTimezone("UTC")
                .status(com.gymholic.common.enums.BookingStatus.CONFIRMED)
                .build());

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(freeSlotStart, 180, "FREE_SESSION")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("not available")));
    }
}
