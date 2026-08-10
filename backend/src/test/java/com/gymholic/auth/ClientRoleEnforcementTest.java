package com.gymholic.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.auth.dto.RegisterRequest;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests to ensure public registration ALWAYS creates CLIENT users.
 * Admin/Trainer users should only be created through protected mechanisms.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc(addFilters = false)
class ClientRoleEnforcementTest {

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
    void publicRegistration_WithoutRoleField_CreatesClientUser() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstName("John")
                .lastName("Doe")
                .email("john@example.com")
                .password("Password123!")
                .build(); // No role field

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.role").value("CLIENT"));

        // Verify in database
        User user = userRepository.findByEmail("john@example.com").orElseThrow();
        assertEquals(Role.CLIENT, user.getRole());
    }

    @Test
    void publicRegistration_WithRoleClient_CreatesClientUser() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstName("Jane")
                .lastName("Smith")
                .email("jane@example.com")
                .password("Password123!")
                .role(Role.CLIENT)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.role").value("CLIENT"));

        User user = userRepository.findByEmail("jane@example.com").orElseThrow();
        assertEquals(Role.CLIENT, user.getRole());
    }

    @Test
    void publicRegistration_WithRoleTrainer_StillCreatesClientUser() throws Exception {
        // Even if someone tries to send TRAINER role, it should be ignored
        RegisterRequest request = RegisterRequest.builder()
                .firstName("Trainer")
                .lastName("Test")
                .email("trainer@example.com")
                .password("Password123!")
                .role(Role.TRAINER) // Attempting to set TRAINER
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.role").value("CLIENT")); // Should be CLIENT

        User user = userRepository.findByEmail("trainer@example.com").orElseThrow();
        assertEquals(Role.CLIENT, user.getRole(), "Public registration should ignore role field and create CLIENT");
    }

    @Test
    void publicRegistration_WithRoleAdmin_StillCreatesClientUser() throws Exception {
        // Even if someone tries to send ADMIN role, it should be ignored
        RegisterRequest request = RegisterRequest.builder()
                .firstName("Admin")
                .lastName("Test")
                .email("admin@example.com")
                .password("Password123!")
                .role(Role.ADMIN) // Attempting to set ADMIN
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.role").value("CLIENT")); // Should be CLIENT

        User user = userRepository.findByEmail("admin@example.com").orElseThrow();
        assertEquals(Role.CLIENT, user.getRole(), "Public registration should ignore role field and create CLIENT");
    }

    @Test
    void registration_DuplicateEmail_ShouldFail() throws Exception {
        // Create first user
        User existingUser = User.builder()
                .email("existing@example.com")
                .password("encoded-password")
                .firstName("Existing")
                .lastName("User")
                .role(Role.CLIENT)
                .active(true)
                .build();
        userRepository.save(existingUser);

        // Try to register with same email
        RegisterRequest request = RegisterRequest.builder()
                .firstName("New")
                .lastName("User")
                .email("existing@example.com")
                .password("Password123!")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
