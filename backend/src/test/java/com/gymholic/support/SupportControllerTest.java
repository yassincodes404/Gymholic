package com.gymholic.support;

import com.gymholic.security.RateLimitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The support channel is public (a frustrated client must never hit a
 * login wall to complain) yet hardened: validated input, per-IP rate
 * limiting, and an inbox that only admins can read.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SupportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RateLimitService rateLimitService;

    @BeforeEach
    void clearRateLimit() {
        // The limiter is in-memory and shared across the whole context;
        // each test starts from a clean slate so counts are predictable.
        rateLimitService.reset();
    }

    private static String body(String email) {
        return """
            {
              "name": "Test Client",
              "email": "%s",
              "category": "PAYMENT",
              "subject": "Payment question",
              "message": "I have a question about my last payment."
            }
            """.formatted(email);
    }

    @Test
    void submissionIsPublicAndPersisted() throws Exception {
        mockMvc.perform(post("/api/support")
                .contentType("application/json")
                .content(body("client@example.com")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.email").value("client@example.com"))
            .andExpect(jsonPath("$.data.status").value("NEW"));
    }

    @Test
    void invalidSubmissionIsRejected() throws Exception {
        mockMvc.perform(post("/api/support")
                .contentType("application/json")
                .content("{\"name\":\"x\",\"email\":\"not-an-email\",\"category\":\"OTHER\",\"subject\":\"s\",\"message\":\"too short\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void inboxIsAdminOnly() throws Exception {
        mockMvc.perform(get("/api/support"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void floodingTheFormIsRateLimited() throws Exception {
        // The per-IP window allows 5 submissions per hour; the 6th is rejected.
        for (int i = 1; i <= 5; i++) {
            mockMvc.perform(post("/api/support")
                    .contentType("application/json")
                    .content(body("flood" + i + "@example.com")))
                .andExpect(status().isCreated());
        }
        mockMvc.perform(post("/api/support")
                .contentType("application/json")
                .content(body("flood6@example.com")))
            .andExpect(status().isBadRequest());
    }
}
