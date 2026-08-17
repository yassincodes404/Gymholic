package com.gymholic.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.auth.dto.RegisterRequest;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The email confirmation flow: register answers with a challenge instead of
 * tokens until the 6-digit code is confirmed, and only then is the account
 * marked verified and a session issued.
 */
@SpringBootTest(properties = "app.auth.email-verification-required=true")
@ActiveProfiles("test")
@AutoConfigureMockMvc(addFilters = false)
class EmailVerificationFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationCodeRepository codeRepository;

    @MockBean
    private org.springframework.mail.javamail.JavaMailSender javaMailSender;

    // Captures the emailed code so the test can submit it back.
    @MockBean
    private com.gymholic.notification.EmailService emailService;

    @BeforeEach
    void setUp() {
        codeRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void register_ReturnsChallengeInsteadOfTokens() throws Exception {
        doNothing().when(emailService).sendEmailNow(anyString(), anyString(), anyString(), any());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RegisterRequest.builder()
                                .firstName("Sara").lastName("Client")
                                .email("sara@example.com").password("Password123!").build())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.verificationRequired").value(true))
                .andExpect(jsonPath("$.data.email").value("sara@example.com"))
                .andExpect(jsonPath("$.data.accessToken").doesNotExist());

        assertFalse(userRepository.findByEmail("sara@example.com").orElseThrow().isEmailVerified());
        assertTrue(codeRepository.findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(
                userRepository.findByEmail("sara@example.com").orElseThrow().getId()).isPresent());
    }

    @Test
    void verifyEmail_WithEmailedCode_MarksVerifiedAndIssuesTokens() throws Exception {
        doNothing().when(emailService).sendEmailNow(anyString(), anyString(), anyString(), any());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RegisterRequest.builder()
                                .firstName("Omar").lastName("Client")
                                .email("omar@example.com").password("Password123!").build())))
                .andExpect(status().isCreated());

        // Grab the code the service emailed out.
        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Map<String, Object>> vars = ArgumentCaptor.forClass(java.util.Map.class);
        verify(emailService).sendEmailNow(anyString(), anyString(), anyString(), vars.capture());
        String code = (String) vars.getValue().get("code");

        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "email", "omar@example.com", "code", code))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationRequired").doesNotExist())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.emailVerified").value(true));

        assertTrue(userRepository.findByEmail("omar@example.com").orElseThrow().isEmailVerified());
    }

    @Test
    void verifyEmail_WithWrongCode_RejectsAndCountsAttempt() throws Exception {
        doNothing().when(emailService).sendEmailNow(anyString(), anyString(), anyString(), any());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RegisterRequest.builder()
                                .firstName("Laila").lastName("Client")
                                .email("laila@example.com").password("Password123!").build())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "email", "laila@example.com", "code", "000000"))))
                .andExpect(status().isBadRequest());

        EmailVerificationCode stored = codeRepository
                .findFirstByUserIdAndConsumedAtIsNullOrderByCreatedAtDesc(
                        userRepository.findByEmail("laila@example.com").orElseThrow().getId())
                .orElseThrow();
        assertEquals(1, stored.getAttempts());
        assertFalse(userRepository.findByEmail("laila@example.com").orElseThrow().isEmailVerified());
    }
}
