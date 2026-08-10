package com.gymholic.assessment.dto;

import com.gymholic.assessment.enums.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
public class AssessmentResponse {
    private UUID id;
    private Long userId;
    private UserType userType;
    private CurrentStage currentStage;
    private String situation;
    private StartTiming startTiming;
    private ConsultationType preferredConsultation;
    private PreferredLanguage preferredLanguage;
    private String bestTimeToContact;
    private String fullName;
    private String whatsapp;
    private String email;
    private AssessmentStatus status;
    private Map<String, Object> details;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
