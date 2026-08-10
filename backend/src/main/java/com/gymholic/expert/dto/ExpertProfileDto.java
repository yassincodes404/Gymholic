package com.gymholic.expert.dto;

import com.gymholic.assessment.enums.UserType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpertProfileDto {
    private Long id;
    private Long userId;
    private UserType businessType;
    private String businessName;
    private String description;
    private Integer yearsOfExperience;
    private String specializations;
    private String certifications;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
