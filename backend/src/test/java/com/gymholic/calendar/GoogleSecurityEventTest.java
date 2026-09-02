package com.gymholic.calendar;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cross-Account Protection receiver: the endpoint is public (Google's
 * servers can't authenticate as a user) but must reject anything that
 * isn't a verifiable Google SET token — garbage, replayed junk and empty
 * bodies get a 400 so Google retries and flags bad delivery.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class GoogleSecurityEventTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void riscEndpointRejectsUnverifiableTokens() throws Exception {
        mockMvc.perform(post("/api/integrations/google/risc")
                .contentType("application/jwt")
                .content("not.a.realjwt"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void riscEndpointRejectsEmptyBody() throws Exception {
        mockMvc.perform(post("/api/integrations/google/risc")
                .contentType("application/jwt")
                .content(""))
            .andExpect(status().isBadRequest());
    }

    @Test
    void riscEndpointIsReachableWithoutAuth() throws Exception {
        // Authorization-free route check: an unauthenticated call must reach
        // the receiver (400 on content, never 401/403 from the filter chain).
        mockMvc.perform(post("/api/integrations/google/risc")
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isBadRequest());
    }
}
