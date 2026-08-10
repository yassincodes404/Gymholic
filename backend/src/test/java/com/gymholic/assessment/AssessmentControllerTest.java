package com.gymholic.assessment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gymholic.assessment.dto.StartAssessmentRequest;
import com.gymholic.assessment.dto.AssessmentResponse;
import com.gymholic.assessment.enums.UserType;
import com.gymholic.assessment.enums.AssessmentStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc(addFilters = false) // Disable security filters for simple controller test
class AssessmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AssessmentService assessmentService;
    
    @MockBean
    private org.springframework.mail.javamail.JavaMailSender javaMailSender;

    @Test
    void startAssessment_ShouldReturnCreatedStatus() throws Exception {
        StartAssessmentRequest request = new StartAssessmentRequest();
        request.setUserType(UserType.GYM_OWNER);

        AssessmentResponse response = new AssessmentResponse();
        response.setUserType(UserType.GYM_OWNER);
        response.setStatus(AssessmentStatus.DRAFT);

        when(assessmentService.startAssessment(any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/assessments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.userType").value("GYM_OWNER"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }
}
