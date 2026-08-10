package com.gymholic.assessment.dto;

import com.gymholic.assessment.enums.CurrentStage;
import com.gymholic.assessment.enums.UserType;
import lombok.Data;

import java.util.Map;

@Data
public class UpdateAssessmentRequest {
    private UserType userType;
    private CurrentStage currentStage;
    private Map<String, Object> details;
}
