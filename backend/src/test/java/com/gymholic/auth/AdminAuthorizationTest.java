package com.gymholic.auth;

import com.gymholic.common.enums.Role;
import com.gymholic.security.JwtService;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.http.MediaType;

/**
 * Tests for role-based authorization on expert endpoints.
 * Validates that expert profile endpoints allow ADMIN/TRAINER and reject CLIENT users.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc // Keep filters enabled to test authorization
class AdminAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @MockBean
    private org.springframework.mail.javamail.JavaMailSender javaMailSender;

    private String adminToken;
    private String trainerToken;
    private String clientToken;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        // Create ADMIN user and token
        User admin = User.builder()
                .email("admin@test.com")
                .password(passwordEncoder.encode("password"))
                .firstName("Admin")
                .lastName("User")
                .role(Role.ADMIN)
                .active(true)
                .build();
        userRepository.save(admin);
        UserDetails adminDetails = userDetailsService.loadUserByUsername(admin.getEmail());
        adminToken = jwtService.generateToken(adminDetails);

        // Create TRAINER user and token
        User trainer = User.builder()
                .email("trainer@test.com")
                .password(passwordEncoder.encode("password"))
                .firstName("Trainer")
                .lastName("User")
                .role(Role.TRAINER)
                .active(true)
                .build();
        userRepository.save(trainer);
        UserDetails trainerDetails = userDetailsService.loadUserByUsername(trainer.getEmail());
        trainerToken = jwtService.generateToken(trainerDetails);

        // Create CLIENT user and token
        User client = User.builder()
                .email("client@test.com")
                .password(passwordEncoder.encode("password"))
                .firstName("Client")
                .lastName("User")
                .role(Role.CLIENT)
                .active(true)
                .build();
        userRepository.save(client);
        UserDetails clientDetails = userDetailsService.loadUserByUsername(client.getEmail());
        clientToken = jwtService.generateToken(clientDetails);
    }

    @Test
    void adminEndpoint_WithAdminToken_ShouldAllow() throws Exception {
        mockMvc.perform(get("/api/expert-profiles/me")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound()); // 404 because profile doesn't exist, but auth passed
    }

    @Test
    void adminEndpoint_WithTrainerToken_ShouldAllow() throws Exception {
        mockMvc.perform(get("/api/expert-profiles/me")
                        .header("Authorization", "Bearer " + trainerToken))
                .andExpect(status().isNotFound()); // 404 because profile doesn't exist, but auth passed
    }

    @Test
    void adminEndpoint_WithClientToken_ShouldDeny() throws Exception {
        mockMvc.perform(get("/api/expert-profiles/me")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden()); // 403 Forbidden - insufficient privileges
    }

    @Test
    void adminEndpoint_WithoutToken_ShouldDeny() throws Exception {
        mockMvc.perform(get("/api/expert-profiles/me"))
                .andExpect(status().isUnauthorized()); // 401 Unauthorized - no token provided
    }

    @Test
    void adminEndpoint_WithInvalidToken_ShouldDeny() throws Exception {
        mockMvc.perform(get("/api/expert-profiles/me")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    /**
     * Public endpoints should still be accessible without authentication
     */
    @Test
    void publicEndpoint_WithoutToken_ShouldAllow() throws Exception {
        // Use POST /api/v1/assessments (start assessment) which is truly public
        String requestBody = """
                {
                    "userType": "GYM_OWNER"
                }
                """;
        
        mockMvc.perform(post("/api/v1/assessments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated()); // Public assessment creation endpoint
    }
}
