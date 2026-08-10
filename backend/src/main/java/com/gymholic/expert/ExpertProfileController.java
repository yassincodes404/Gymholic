package com.gymholic.expert;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.expert.dto.CreateExpertProfileRequest;
import com.gymholic.expert.dto.ExpertProfileDto;
import com.gymholic.expert.dto.UpdateExpertProfileRequest;
import com.gymholic.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/expert-profiles")
@RequiredArgsConstructor
public class ExpertProfileController {

    private final ExpertProfileService expertProfileService;

    @PostMapping
    @PreAuthorize("hasAnyRole('TRAINER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ExpertProfileDto>> createProfile(
            @Valid @RequestBody CreateExpertProfileRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        ExpertProfileDto profile = expertProfileService.createProfile(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Expert profile created successfully", profile));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('TRAINER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ExpertProfileDto>> getMyProfile() {
        Long userId = SecurityUtils.getCurrentUserId();
        ExpertProfileDto profile = expertProfileService.getProfileByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", profile));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<ExpertProfileDto>> getProfileByUserId(@PathVariable Long userId) {
        ExpertProfileDto profile = expertProfileService.getProfileByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", profile));
    }

    @PutMapping("/me")
    @PreAuthorize("hasAnyRole('TRAINER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ExpertProfileDto>> updateMyProfile(
            @Valid @RequestBody UpdateExpertProfileRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        ExpertProfileDto profile = expertProfileService.updateProfile(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", profile));
    }

    @GetMapping("/me/exists")
    @PreAuthorize("hasAnyRole('TRAINER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Boolean>> checkProfileExists() {
        Long userId = SecurityUtils.getCurrentUserId();
        boolean exists = expertProfileService.hasProfile(userId);
        return ResponseEntity.ok(ApiResponse.success("Profile existence checked", exists));
    }
}
