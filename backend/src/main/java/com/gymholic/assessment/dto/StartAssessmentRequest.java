package com.gymholic.assessment.dto;

import com.gymholic.assessment.enums.UserType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StartAssessmentRequest {
    @NotNull(message = "User type is required to start assessment")
    private UserType userType;
}
