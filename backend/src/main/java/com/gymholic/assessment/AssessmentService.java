package com.gymholic.assessment;

import com.gymholic.assessment.dto.*;
import com.gymholic.assessment.entity.Assessment;
import com.gymholic.assessment.enums.AssessmentStatus;
import com.gymholic.assessment.exception.AssessmentException;
import com.gymholic.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;

    @Transactional
    public AssessmentResponse startAssessment(StartAssessmentRequest request, Long userId) {
        Assessment assessment = Assessment.builder()
                .userType(request.getUserType())
                .status(AssessmentStatus.DRAFT)
                .userId(userId)
                .details(new HashMap<>())
                .build();
                
        Assessment saved = assessmentRepository.save(assessment);
        return mapToResponse(saved);
    }

    @Transactional
    public AssessmentResponse updateAssessment(UUID id, UpdateAssessmentRequest request) {
        Assessment assessment = getAssessmentById(id);
        
        if (assessment.getStatus() != AssessmentStatus.DRAFT) {
            throw new AssessmentException("Only DRAFT assessments can be updated.");
        }

        if (request.getUserType() != null) {
            assessment.setUserType(request.getUserType());
        }
        if (request.getCurrentStage() != null) {
            assessment.setCurrentStage(request.getCurrentStage());
        }
        if (request.getDetails() != null) {
            if (assessment.getDetails() == null) {
                assessment.setDetails(new HashMap<>());
            }
            // Merge details
            assessment.getDetails().putAll(request.getDetails());
        }

        Assessment updated = assessmentRepository.save(assessment);
        return mapToResponse(updated);
    }

    @Transactional
    public AssessmentResponse submitAssessment(UUID id, SubmitAssessmentRequest request) {
        Assessment assessment = getAssessmentById(id);
        
        if (assessment.getStatus() != AssessmentStatus.DRAFT) {
            throw new AssessmentException("Assessment is already submitted or abandoned.");
        }

        assessment.setSituation(request.getSituation());
        assessment.setStartTiming(request.getStartTiming());
        assessment.setPreferredConsultation(request.getPreferredConsultation());
        assessment.setFullName(request.getFullName());
        assessment.setWhatsapp(request.getWhatsapp());
        assessment.setEmail(request.getEmail());
        assessment.setPreferredLanguage(request.getPreferredLanguage());
        assessment.setBestTimeToContact(request.getBestTimeToContact());
        
        assessment.setStatus(AssessmentStatus.COMPLETED);

        Assessment updated = assessmentRepository.save(assessment);
        return mapToResponse(updated);
    }

    @Transactional(readOnly = true)
    public AssessmentResponse getAssessment(UUID id) {
        return mapToResponse(getAssessmentById(id));
    }
    
    @Transactional(readOnly = true)
    public Page<AssessmentResponse> getAllAssessments(Pageable pageable) {
        return assessmentRepository.findAll(pageable).map(this::mapToResponse);
    }

    private Assessment getAssessmentById(UUID id) {
        return assessmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment", "id", id));
    }

    private AssessmentResponse mapToResponse(Assessment assessment) {
        AssessmentResponse response = new AssessmentResponse();
        response.setId(assessment.getId());
        response.setUserId(assessment.getUserId());
        response.setUserType(assessment.getUserType());
        response.setCurrentStage(assessment.getCurrentStage());
        response.setSituation(assessment.getSituation());
        response.setStartTiming(assessment.getStartTiming());
        response.setPreferredConsultation(assessment.getPreferredConsultation());
        response.setPreferredLanguage(assessment.getPreferredLanguage());
        response.setBestTimeToContact(assessment.getBestTimeToContact());
        response.setFullName(assessment.getFullName());
        response.setWhatsapp(assessment.getWhatsapp());
        response.setEmail(assessment.getEmail());
        response.setStatus(assessment.getStatus());
        response.setDetails(assessment.getDetails());
        response.setCreatedAt(assessment.getCreatedAt());
        response.setUpdatedAt(assessment.getUpdatedAt());
        return response;
    }
}
