package com.gymholic.assessment;

import com.gymholic.assessment.dto.AssessmentResponse;
import com.gymholic.assessment.dto.StartAssessmentRequest;
import com.gymholic.assessment.dto.SubmitAssessmentRequest;
import com.gymholic.assessment.dto.UpdateAssessmentRequest;
import com.gymholic.assessment.entity.Assessment;
import com.gymholic.assessment.enums.AssessmentStatus;
import com.gymholic.assessment.enums.ConsultationType;
import com.gymholic.assessment.enums.StartTiming;
import com.gymholic.assessment.enums.UserType;
import com.gymholic.assessment.exception.AssessmentException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssessmentServiceTest {

    @Mock
    private AssessmentRepository assessmentRepository;

    @InjectMocks
    private AssessmentService assessmentService;

    private Assessment assessment;
    private UUID assessmentId;

    @BeforeEach
    void setUp() {
        assessmentId = UUID.randomUUID();
        assessment = new Assessment();
        assessment.setId(assessmentId);
        assessment.setUserType(UserType.GYM_OWNER);
        assessment.setStatus(AssessmentStatus.DRAFT);
        assessment.setDetails(new HashMap<>());
    }

    @Test
    void startAssessment_ShouldReturnDraftAssessment() {
        StartAssessmentRequest request = new StartAssessmentRequest();
        request.setUserType(UserType.GYM_OWNER);

        when(assessmentRepository.save(any(Assessment.class))).thenReturn(assessment);

        AssessmentResponse response = assessmentService.startAssessment(request, null);

        assertNotNull(response);
        assertEquals(UserType.GYM_OWNER, response.getUserType());
        assertEquals(AssessmentStatus.DRAFT, response.getStatus());
        verify(assessmentRepository, times(1)).save(any(Assessment.class));
    }

    @Test
    void updateAssessment_ShouldUpdateDetails() {
        UpdateAssessmentRequest request = new UpdateAssessmentRequest();
        HashMap<String, Object> details = new HashMap<>();
        details.put("facilityType", "MIXED");
        request.setDetails(details);

        when(assessmentRepository.findById(assessmentId)).thenReturn(Optional.of(assessment));
        when(assessmentRepository.save(any(Assessment.class))).thenReturn(assessment);

        AssessmentResponse response = assessmentService.updateAssessment(assessmentId, request);

        assertNotNull(response);
        assertTrue(response.getDetails().containsKey("facilityType"));
        assertEquals("MIXED", response.getDetails().get("facilityType"));
    }

    @Test
    void submitAssessment_ShouldChangeStatusToCompleted() {
        SubmitAssessmentRequest request = new SubmitAssessmentRequest();
        request.setFullName("John Doe");
        request.setEmail("john@example.com");
        request.setWhatsapp("+1234567890");
        request.setStartTiming(StartTiming.IMMEDIATELY);
        request.setPreferredConsultation(ConsultationType.ONLINE);
        request.setSituation("Test situation");

        when(assessmentRepository.findById(assessmentId)).thenReturn(Optional.of(assessment));
        when(assessmentRepository.save(any(Assessment.class))).thenReturn(assessment);

        AssessmentResponse response = assessmentService.submitAssessment(assessmentId, request);

        assertNotNull(response);
        assertEquals(AssessmentStatus.COMPLETED, response.getStatus());
        assertEquals("John Doe", response.getFullName());
    }

    @Test
    void submitAssessment_WhenAlreadySubmitted_ShouldThrowException() {
        assessment.setStatus(AssessmentStatus.COMPLETED);
        SubmitAssessmentRequest request = new SubmitAssessmentRequest();

        when(assessmentRepository.findById(assessmentId)).thenReturn(Optional.of(assessment));

        assertThrows(AssessmentException.class, () -> assessmentService.submitAssessment(assessmentId, request));
    }
}
