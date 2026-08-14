package com.gymholic.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.auth.dto.LoginRequest;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests for admin authentication.
 * Validates that only ADMIN users can access admin login.
 * CLIENT users are rejected from admin login.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc(addFilters = false) // Disable security filters for easier testing
class AdminAuthTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private org.springframework.mail.javamail.JavaMailSender javaMailSender;

    private static final String ADMIN_EMAIL = "admin@test.com";
    private static final String TRAINER_EMAIL = "trainer@test.com";
    private static final String CLIENT_EMAIL = "client@test.com";
    private static final String PASSWORD = "TestPassword123!";

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        // Create ADMIN user
        User admin = User.builder()
                .email(ADMIN_EMAIL)
                .password(passwordEncoder.encode(PASSWORD))
                .firstName("Admin")
                .lastName("User")
                .role(Role.ADMIN)
                .active(true)
                .build();
        userRepository.save(admin);

        // Create TRAINER user
        User trainer = User.builder()
                .email(TRAINER_EMAIL)
                .password(passwordEncoder.encode(PASSWORD))
                .firstName("Trainer")
                .lastName("User")
                .role(Role.TRAINER)
                .active(true)
                .build();
        userRepository.save(trainer);

        // Create CLIENT user
        User client = User.builder()
                .email(CLIENT_EMAIL)
                .password(passwordEncoder.encode(PASSWORD))
                .firstName("Client")
                .lastName("User")
                .role(Role.CLIENT)
                .active(true)
                .build();
        userRepository.save(client);
    }

    @Test
    void adminLogin_WithValidAdminCredentials_ShouldSucceed() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail(ADMIN_EMAIL);
        request.setPassword(PASSWORD);

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value(ADMIN_EMAIL))
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(jsonPath("$.data.refreshToken").exists());
    }

    @Test
    void adminLogin_WithValidTrainerCredentials_ShouldBeRejected() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail(TRAINER_EMAIL);
        request.setPassword(PASSWORD);

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Access denied. Admin privileges required."));
    }

    @Test
    void adminLogin_WithClientUser_ShouldBeRejected() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail(CLIENT_EMAIL);
        request.setPassword(PASSWORD);

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Access denied. Admin privileges required."));
    }

    @Test
    void adminLogin_WithInvalidPassword_ShouldFail() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail(ADMIN_EMAIL);
        request.setPassword("WrongPassword123!");

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized()); // Spring Security returns 401 for auth failure
    }

    @Test
    void adminLogin_WithNonexistentAccount_ShouldFail() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("nonexistent@test.com");
        request.setPassword(PASSWORD);

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminLogin_WithMissingEmail_ShouldReturnValidationError() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setPassword(PASSWORD);
        // email is null

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminLogin_WithMissingPassword_ShouldReturnValidationError() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail(ADMIN_EMAIL);
        // password is null

        mockMvc.perform(post("/api/admin/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    /**
     * Test that CLIENT users can still use regular /api/auth/login
     */
    @Test
    void clientLogin_ThroughRegularEndpoint_ShouldStillWork() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail(CLIENT_EMAIL);
        request.setPassword(PASSWORD);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("CLIENT"));
    }

    /**
     * Test that ADMIN can also use regular /api/auth/login (not exclusive)
     */
    @Test
    void adminLogin_ThroughRegularEndpoint_ShouldAlsoWork() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail(ADMIN_EMAIL);
        request.setPassword(PASSWORD);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("ADMIN"));
    }
}
