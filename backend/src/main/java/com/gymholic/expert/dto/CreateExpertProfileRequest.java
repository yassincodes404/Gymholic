package com.gymholic.expert.dto;

import com.gymholic.assessment.enums.UserType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateExpertProfileRequest {

    @NotNull(message = "Business type is required")
    private UserType businessType;

    @Size(max = 255, message = "Business name must not exceed 255 characters")
    private String businessName;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    private Integer yearsOfExperience;

    private String specializations;

    private String certifications;
}
