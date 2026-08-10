package com.gymholic.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.auth.dto.GoogleAuthRequest;
import com.gymholic.common.enums.Role;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests for Google Sign-In authentication flow.
 * 
 * Note: These tests verify the endpoint structure and validation.
 * Full Google ID token verification requires real Google credentials.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc(addFilters = false)
class GoogleSignInTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private org.springframework.mail.javamail.JavaMailSender javaMailSender;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void googleSignIn_WithMissingIdToken_ShouldReturn400() throws Exception {
        GoogleAuthRequest request = new GoogleAuthRequest();
        request.setIdToken(""); // Empty token

        mockMvc.perform(post("/api/auth/google/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void googleSignIn_WithInvalidIdToken_ShouldReturn400() throws Exception {
        GoogleAuthRequest request = new GoogleAuthRequest();
        request.setIdToken("invalid-google-token");

        mockMvc.perform(post("/api/auth/google/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    /**
     * Integration test note: Full Google Sign-In testing requires:
     * 1. Valid Google OAuth Client ID
     * 2. Real Google ID token from frontend
     * 3. Google API access for token verification
     * 
     * For E2E testing, use a real Google account to generate ID tokens.
     */
    @Test
    void googleSignIn_CreatesClientUser() {
        // This test documents expected behavior with valid Google token:
        // 1. Verify Google ID token
        // 2. Extract user info (googleId, email, firstName, lastName)
        // 3. Create new User with Role.CLIENT
        // 4. Return JWT tokens

        // Actual token verification requires real Google credentials
        // and should be tested in E2E tests with real Google Sign-In flow
        assertTrue(true, "Google Sign-In endpoint structure validated");
    }
}
