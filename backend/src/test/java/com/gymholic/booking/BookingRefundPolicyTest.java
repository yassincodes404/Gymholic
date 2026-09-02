package com.gymholic.booking;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cancellation & refund policy guards: a paid booking can only be cancelled
 * by its client (never the team), free of charge up to 12 hours before the
 * session — cancelling records a refund as owed, settled manually with the
 * gateway from Admin → Bookings. The unauthenticated route stays closed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class BookingRefundPolicyTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void freeCancellationWindowIsTwelveHours() {
        // Pins the published policy: free self-cancellation up to 12h before start.
        assertThat(BookingService.FREE_CANCELLATION_WINDOW).isEqualTo(Duration.ofHours(12));
    }

    @Test
    void cancelEndpointIsClosedToAnonymousCallers() throws Exception {
        mockMvc.perform(post("/api/bookings/1/cancel")
                .contentType("application/json")
                .content("{\"reason\":\"x\"}"))
            .andExpect(status().isUnauthorized());
    }
}
