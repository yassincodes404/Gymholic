package com.gymholic.assessment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.assessment.dto.AssessmentResponse;
import com.gymholic.assessment.dto.StartAssessmentRequest;
import com.gymholic.assessment.enums.AssessmentStatus;
import com.gymholic.assessment.enums.ConsultationType;
import com.gymholic.assessment.enums.PreferredLanguage;
import com.gymholic.assessment.enums.StartTiming;
import com.gymholic.assessment.enums.UserType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Preservation Tests for Assessment Submission Bugfix
 * 
 * **Property 2: Preservation** - Assessment Start and Validation Behavior Unchanged
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 * 
 * These tests observe and capture baseline behavior on UNFIXED code to ensure
 * the bug fix does not introduce regressions.
 * 
 * **EXPECTED OUTCOME**: All tests PASS on unfixed code AND continue to PASS after fix
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc(addFilters = false)
class AssessmentPreservationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AssessmentService assessmentService;

    @Autowired
    private AssessmentRepository assessmentRepository;

    @MockBean
    private org.springframework.mail.javamail.JavaMailSender javaMailSender;

    @BeforeEach
    void setUp() {
        // Clean up test data
        assessmentRepository.deleteAll();
    }

    /**
     * Preservation Test 1: Assessment start endpoint accepts and stores userType
     * 
     * **Validates: Requirement 3.1** - Assessment start with userType continues to work
     */
    @Test
    void assessmentStart_WithUserTypeGymOwner_ShouldReturn201AndStoreUserType() throws Exception {
        StartAssessmentRequest request = new StartAssessmentRequest();
        request.setUserType(UserType.GYM_OWNER);

        mockMvc.perform(post("/api/v1/assessments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.userType").value("GYM_OWNER"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    /**
     * Preservation Test 2: Assessment start with different userType values
     * 
     * **Validates: Requirement 3.1** - All userType values accepted by start endpoint
     */
    @Test
    void assessmentStart_WithUserTypeNewGymFounder_ShouldReturn201() throws Exception {
        StartAssessmentRequest request = new StartAssessmentRequest();
        request.setUserType(UserType.NEW_GYM_FOUNDER);

        mockMvc.perform(post("/api/v1/assessments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.userType").value("NEW_GYM_FOUNDER"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    @Test
    void assessmentStart_WithUserTypePersonalTrainer_ShouldReturn201() throws Exception {
        StartAssessmentRequest request = new StartAssessmentRequest();
        request.setUserType(UserType.PERSONAL_TRAINER);

        mockMvc.perform(post("/api/v1/assessments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.userType").value("PERSONAL_TRAINER"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    /**
     * Preservation Test 3: Submission validation for required fields
     * 
     * **Validates: Requirement 3.4** - Validation errors continue to work correctly
     */
    @Test
    void assessmentSubmit_WithMissingFullName_ShouldReturn400ValidationError() throws Exception {
        // Create a draft assessment first
        StartAssessmentRequest startRequest = new StartAssessmentRequest();
        startRequest.setUserType(UserType.GYM_OWNER);
        AssessmentResponse assessment = assessmentService.startAssessment(startRequest, null);

        // Submit without fullName (required field)
        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Test situation");
        submitPayload.put("startTiming", "WITHIN_1_MONTH");
        submitPayload.put("preferredConsultation", "ONLINE");
        // Missing fullName
        submitPayload.put("whatsapp", "+1234567890");
        submitPayload.put("email", "test@example.com");
        submitPayload.put("preferredLanguage", "ENGLISH");
        submitPayload.put("bestTimeToContact", "Morning");

        mockMvc.perform(post("/api/v1/assessments/" + assessment.getId() + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void assessmentSubmit_WithMissingEmail_ShouldReturn400ValidationError() throws Exception {
        StartAssessmentRequest startRequest = new StartAssessmentRequest();
        startRequest.setUserType(UserType.GYM_OWNER);
        AssessmentResponse assessment = assessmentService.startAssessment(startRequest, null);

        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Test situation");
        submitPayload.put("startTiming", "WITHIN_1_MONTH");
        submitPayload.put("preferredConsultation", "ONLINE");
        submitPayload.put("fullName", "Test User");
        submitPayload.put("whatsapp", "+1234567890");
        // Missing email
        submitPayload.put("preferredLanguage", "ENGLISH");
        submitPayload.put("bestTimeToContact", "Morning");

        mockMvc.perform(post("/api/v1/assessments/" + assessment.getId() + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void assessmentSubmit_WithMissingWhatsapp_ShouldReturn400ValidationError() throws Exception {
        StartAssessmentRequest startRequest = new StartAssessmentRequest();
        startRequest.setUserType(UserType.GYM_OWNER);
        AssessmentResponse assessment = assessmentService.startAssessment(startRequest, null);

        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Test situation");
        submitPayload.put("startTiming", "WITHIN_1_MONTH");
        submitPayload.put("preferredConsultation", "ONLINE");
        submitPayload.put("fullName", "Test User");
        // Missing whatsapp
        submitPayload.put("email", "test@example.com");
        submitPayload.put("preferredLanguage", "ENGLISH");
        submitPayload.put("bestTimeToContact", "Morning");

        mockMvc.perform(post("/api/v1/assessments/" + assessment.getId() + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void assessmentSubmit_WithMissingStartTiming_ShouldReturn400ValidationError() throws Exception {
        StartAssessmentRequest startRequest = new StartAssessmentRequest();
        startRequest.setUserType(UserType.GYM_OWNER);
        AssessmentResponse assessment = assessmentService.startAssessment(startRequest, null);

        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Test situation");
        // Missing startTiming
        submitPayload.put("preferredConsultation", "ONLINE");
        submitPayload.put("fullName", "Test User");
        submitPayload.put("whatsapp", "+1234567890");
        submitPayload.put("email", "test@example.com");
        submitPayload.put("preferredLanguage", "ENGLISH");
        submitPayload.put("bestTimeToContact", "Morning");

        mockMvc.perform(post("/api/v1/assessments/" + assessment.getId() + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void assessmentSubmit_WithMissingPreferredConsultation_ShouldReturn400ValidationError() throws Exception {
        StartAssessmentRequest startRequest = new StartAssessmentRequest();
        startRequest.setUserType(UserType.GYM_OWNER);
        AssessmentResponse assessment = assessmentService.startAssessment(startRequest, null);

        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Test situation");
        submitPayload.put("startTiming", "WITHIN_1_MONTH");
        // Missing preferredConsultation
        submitPayload.put("fullName", "Test User");
        submitPayload.put("whatsapp", "+1234567890");
        submitPayload.put("email", "test@example.com");
        submitPayload.put("preferredLanguage", "ENGLISH");
        submitPayload.put("bestTimeToContact", "Morning");

        mockMvc.perform(post("/api/v1/assessments/" + assessment.getId() + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isBadRequest());
    }

    /**
     * Preservation Test 4: Assessment retrieval includes userType
     * 
     * **Validates: Requirement 3.3** - UserType persists and is retrievable
     */
    @Test
    void assessmentGet_ShouldReturnCompleteDataIncludingUserType() throws Exception {
        // Create assessment with userType
        StartAssessmentRequest startRequest = new StartAssessmentRequest();
        startRequest.setUserType(UserType.GYM_OWNER);
        AssessmentResponse assessment = assessmentService.startAssessment(startRequest, null);

        // Retrieve and verify userType is included
        mockMvc.perform(get("/api/v1/assessments/" + assessment.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(assessment.getId().toString()))
                .andExpect(jsonPath("$.data.userType").value("GYM_OWNER"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    /**
     * Preservation Test 5: Successful assessment submission with valid fields (WITHOUT userType)
     * 
     * **Validates: Requirement 3.2, 3.3** - Valid submissions work correctly
     */
    @Test
    void assessmentSubmit_WithAllValidFieldsWithoutUserType_ShouldReturn200() throws Exception {
        // Create assessment
        StartAssessmentRequest startRequest = new StartAssessmentRequest();
        startRequest.setUserType(UserType.GYM_OWNER);
        AssessmentResponse assessment = assessmentService.startAssessment(startRequest, null);

        // Submit WITHOUT userType (this should work even on unfixed code)
        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Looking to expand my gym");
        submitPayload.put("startTiming", "WITHIN_1_MONTH");
        submitPayload.put("preferredConsultation", "ONLINE");
        submitPayload.put("fullName", "Valid User");
        submitPayload.put("whatsapp", "+9999999999");
        submitPayload.put("email", "valid@example.com");
        submitPayload.put("preferredLanguage", "ENGLISH");
        submitPayload.put("bestTimeToContact", "Morning");

        mockMvc.perform(post("/api/v1/assessments/" + assessment.getId() + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.fullName").value("Valid User"))
                .andExpect(jsonPath("$.data.email").value("valid@example.com"))
                .andExpect(jsonPath("$.data.userType").value("GYM_OWNER")); // UserType should persist from start
    }

    /**
     * Preservation Test 6: Assessment data persisted correctly after submission
     * 
     * **Validates: Requirement 3.3** - Submitted data is stored correctly
     */
    @Test
    void assessmentSubmit_ShouldPersistAllSubmittedFields() throws Exception {
        // Create assessment
        StartAssessmentRequest startRequest = new StartAssessmentRequest();
        startRequest.setUserType(UserType.NEW_GYM_FOUNDER);
        AssessmentResponse assessment = assessmentService.startAssessment(startRequest, null);

        // Submit
        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Specific situation details");
        submitPayload.put("startTiming", "ONE_TO_THREE_MONTHS");
        submitPayload.put("preferredConsultation", "ON_SITE");
        submitPayload.put("fullName", "Persistence Test");
        submitPayload.put("whatsapp", "+1111222333");
        submitPayload.put("email", "persist@example.com");
        submitPayload.put("preferredLanguage", "ARABIC");
        submitPayload.put("bestTimeToContact", "Evening");

        mockMvc.perform(post("/api/v1/assessments/" + assessment.getId() + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isOk());

        // Retrieve and verify all fields persisted
        mockMvc.perform(get("/api/v1/assessments/" + assessment.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.situation").value("Specific situation details"))
                .andExpect(jsonPath("$.data.startTiming").value("ONE_TO_THREE_MONTHS"))
                .andExpect(jsonPath("$.data.preferredConsultation").value("ON_SITE"))
                .andExpect(jsonPath("$.data.fullName").value("Persistence Test"))
                .andExpect(jsonPath("$.data.whatsapp").value("+1111222333"))
                .andExpect(jsonPath("$.data.email").value("persist@example.com"))
                .andExpect(jsonPath("$.data.preferredLanguage").value("ARABIC"))
                .andExpect(jsonPath("$.data.bestTimeToContact").value("Evening"))
                .andExpect(jsonPath("$.data.userType").value("NEW_GYM_FOUNDER"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }
}
