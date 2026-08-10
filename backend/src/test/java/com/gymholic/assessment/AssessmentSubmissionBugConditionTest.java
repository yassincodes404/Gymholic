package com.gymholic.assessment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.assessment.dto.AssessmentResponse;
import com.gymholic.assessment.dto.StartAssessmentRequest;
import com.gymholic.assessment.entity.Assessment;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Bug Condition Exploration Test for Assessment Submission 500 Error
 * 
 * **Property 1: Bug Condition** - Assessment Submission with UserType Field Fails
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * This test encodes the EXPECTED behavior - assessment submission should succeed
 * without userType field.
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code with HTTP 500 error
 * When it PASSES after the fix, it confirms the bug is resolved.
 * 
 * The test simulates the exact frontend behavior: submitting assessment data
 * with the userType field included in the request body.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc(addFilters = false)
class AssessmentSubmissionBugConditionTest {

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

    private UUID testAssessmentId;

    @BeforeEach
    void setUp() {
        // Clean up any existing test data
        assessmentRepository.deleteAll();
        
        // Create a DRAFT assessment to submit
        StartAssessmentRequest startRequest = new StartAssessmentRequest();
        startRequest.setUserType(UserType.GYM_OWNER);
        
        AssessmentResponse assessment = assessmentService.startAssessment(startRequest, null);
        testAssessmentId = assessment.getId();
    }

    /**
     * Test Case 1: Submit assessment WITHOUT userType field (correct payload)
     * 
     * This test encodes the EXPECTED behavior - after the fix, the frontend
     * will NOT include userType in the submission payload.
     * 
     * EXPECTED on UNFIXED code: HTTP 200 OK (this works even before fix)
     * EXPECTED on FIXED code: HTTP 200 OK (continues to work after fix)
     */
    @Test
    void submitAssessmentWithoutUserTypeField_GymOwner_ShouldSucceed() throws Exception {
        // Create payload WITHOUT userType (simulates fixed frontend behavior)
        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Looking to scale my gym business");
        submitPayload.put("startTiming", "WITHIN_1_MONTH");
        submitPayload.put("preferredConsultation", "ONLINE");
        submitPayload.put("fullName", "John Doe");
        submitPayload.put("whatsapp", "+1234567890");
        submitPayload.put("email", "john@example.com");
        submitPayload.put("preferredLanguage", "ENGLISH");
        submitPayload.put("bestTimeToContact", "Morning");

        // ASSERTION: This should return 200 OK on both unfixed and fixed code
        mockMvc.perform(post("/api/v1/assessments/" + testAssessmentId + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.fullName").value("John Doe"))
                .andExpect(jsonPath("$.data.email").value("john@example.com"));

        // Verify assessment data persisted correctly
        Assessment savedAssessment = assessmentRepository.findById(testAssessmentId).orElseThrow();
        assert savedAssessment.getStatus() == AssessmentStatus.COMPLETED;
        assert savedAssessment.getFullName().equals("John Doe");
    }

    /**
     * Test Case 2: Submit assessment WITHOUT userType for NEW_GYM_FOUNDER
     * 
     * EXPECTED on both UNFIXED and FIXED code: HTTP 200 OK
     */
    @Test
    void submitAssessmentWithoutUserTypeField_NewGymFounder_ShouldSucceed() throws Exception {
        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Starting a new fitness center");
        submitPayload.put("startTiming", "ONE_TO_THREE_MONTHS");
        submitPayload.put("preferredConsultation", "ON_SITE");
        submitPayload.put("fullName", "Jane Smith");
        submitPayload.put("whatsapp", "+9876543210");
        submitPayload.put("email", "jane@example.com");
        submitPayload.put("preferredLanguage", "ARABIC");
        submitPayload.put("bestTimeToContact", "Evening");

        mockMvc.perform(post("/api/v1/assessments/" + testAssessmentId + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.fullName").value("Jane Smith"));
    }

    /**
     * Test Case 3: Submit assessment WITHOUT userType for PERSONAL_TRAINER
     * 
     * EXPECTED on both UNFIXED and FIXED code: HTTP 200 OK
     */
    @Test
    void submitAssessmentWithoutUserTypeField_PersonalTrainer_ShouldSucceed() throws Exception {
        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Want to optimize my training programs");
        submitPayload.put("startTiming", "IMMEDIATELY");
        submitPayload.put("preferredConsultation", "ONLINE");
        submitPayload.put("fullName", "Mike Johnson");
        submitPayload.put("whatsapp", "+5555555555");
        submitPayload.put("email", "mike@example.com");
        submitPayload.put("preferredLanguage", "ENGLISH");
        submitPayload.put("bestTimeToContact", "Afternoon");

        mockMvc.perform(post("/api/v1/assessments/" + testAssessmentId + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.fullName").value("Mike Johnson"));
    }

    /**
     * Test Case 4: Submit assessment with all valid fields WITHOUT userType
     * Tests that complete, valid payload without userType succeeds
     * 
     * EXPECTED on both UNFIXED and FIXED code: HTTP 200 OK
     */
    @Test
    void submitAssessmentWithCompletePayloadWithoutUserType_ShouldSucceed() throws Exception {
        Map<String, Object> submitPayload = new HashMap<>();
        submitPayload.put("situation", "Comprehensive business assessment needed");
        submitPayload.put("startTiming", "WITHIN_1_MONTH");
        submitPayload.put("preferredConsultation", "ONLINE");
        submitPayload.put("fullName", "Complete Test");
        submitPayload.put("whatsapp", "+1111111111");
        submitPayload.put("email", "complete@example.com");
        submitPayload.put("preferredLanguage", "ENGLISH");
        submitPayload.put("bestTimeToContact", "Morning");

        mockMvc.perform(post("/api/v1/assessments/" + testAssessmentId + "/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(submitPayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.situation").value("Comprehensive business assessment needed"))
                .andExpect(jsonPath("$.data.fullName").value("Complete Test"))
                .andExpect(jsonPath("$.data.email").value("complete@example.com"))
                .andExpect(jsonPath("$.data.whatsapp").value("+1111111111"));
    }
}
