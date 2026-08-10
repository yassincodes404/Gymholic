package com.gymholic.assessment.dto;

import com.gymholic.assessment.enums.ConsultationType;
import com.gymholic.assessment.enums.PreferredLanguage;
import com.gymholic.assessment.enums.StartTiming;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SubmitAssessmentRequest {
    
    @Size(max = 500, message = "Situation description must not exceed 500 characters")
    private String situation;

    @NotNull(message = "Start timing is required")
    private StartTiming startTiming;

    @NotNull(message = "Preferred consultation type is required")
    private ConsultationType preferredConsultation;

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "WhatsApp number is required")
    private String whatsapp;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private PreferredLanguage preferredLanguage;
    private String bestTimeToContact;
}
