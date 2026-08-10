package com.gymholic.expert;

import com.gymholic.common.exception.BadRequestException;
import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.expert.dto.CreateExpertProfileRequest;
import com.gymholic.expert.dto.ExpertProfileDto;
import com.gymholic.expert.dto.UpdateExpertProfileRequest;
import com.gymholic.expert.entity.ExpertProfile;
import com.gymholic.user.UserRepository;
import com.gymholic.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ExpertProfileService {

    private final ExpertProfileRepository expertProfileRepository;
    private final UserRepository userRepository;

    @Transactional
    public ExpertProfileDto createProfile(Long userId, CreateExpertProfileRequest request) {
        // Check if user exists
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if profile already exists
        if (expertProfileRepository.existsByUserId(userId)) {
            throw new BadRequestException("Expert profile already exists for this user");
        }

        ExpertProfile profile = ExpertProfile.builder()
            .user(user)
            .businessType(request.getBusinessType())
            .businessName(request.getBusinessName())
            .description(request.getDescription())
            .yearsOfExperience(request.getYearsOfExperience())
            .specializations(request.getSpecializations())
            .certifications(request.getCertifications())
            .build();

        ExpertProfile savedProfile = expertProfileRepository.save(profile);
        return mapToDto(savedProfile);
    }

    @Transactional(readOnly = true)
    public ExpertProfileDto getProfileByUserId(Long userId) {
        ExpertProfile profile = expertProfileRepository.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Expert profile not found for user"));
        return mapToDto(profile);
    }

    @Transactional
    public ExpertProfileDto updateProfile(Long userId, UpdateExpertProfileRequest request) {
        ExpertProfile profile = expertProfileRepository.findByUserId(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Expert profile not found for user"));

        // Update only non-null fields
        if (request.getBusinessType() != null) {
            profile.setBusinessType(request.getBusinessType());
        }
        if (request.getBusinessName() != null) {
            profile.setBusinessName(request.getBusinessName());
        }
        if (request.getDescription() != null) {
            profile.setDescription(request.getDescription());
        }
        if (request.getYearsOfExperience() != null) {
            profile.setYearsOfExperience(request.getYearsOfExperience());
        }
        if (request.getSpecializations() != null) {
            profile.setSpecializations(request.getSpecializations());
        }
        if (request.getCertifications() != null) {
            profile.setCertifications(request.getCertifications());
        }

        ExpertProfile updatedProfile = expertProfileRepository.save(profile);
        return mapToDto(updatedProfile);
    }

    @Transactional(readOnly = true)
    public boolean hasProfile(Long userId) {
        return expertProfileRepository.existsByUserId(userId);
    }

    private ExpertProfileDto mapToDto(ExpertProfile profile) {
        return ExpertProfileDto.builder()
            .id(profile.getId())
            .userId(profile.getUser().getId())
            .businessType(profile.getBusinessType())
            .businessName(profile.getBusinessName())
            .description(profile.getDescription())
            .yearsOfExperience(profile.getYearsOfExperience())
            .specializations(profile.getSpecializations())
            .certifications(profile.getCertifications())
            .createdAt(profile.getCreatedAt())
            .updatedAt(profile.getUpdatedAt())
            .build();
    }
}
