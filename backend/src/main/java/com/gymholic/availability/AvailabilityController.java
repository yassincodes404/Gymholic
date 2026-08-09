package com.gymholic.availability;

import com.gymholic.availability.dto.AvailabilityDto;
import com.gymholic.availability.dto.CreateAvailabilityRequest;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/availability")
@RequiredArgsConstructor
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    @PostMapping
    public ResponseEntity<ApiResponse<AvailabilityDto>> createAvailability(
            @Valid @RequestBody CreateAvailabilityRequest request) {
        String email = SecurityUtils.getCurrentUserEmail();
        AvailabilityDto availability = availabilityService.createAvailability(email, request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Availability created", availability));
    }

    @GetMapping("/trainer/{trainerId}")
    public ResponseEntity<ApiResponse<List<AvailabilityDto>>> getTrainerAvailability(
            @PathVariable Long trainerId) {
        List<AvailabilityDto> slots = availabilityService.getTrainerAvailability(trainerId);
        return ResponseEntity.ok(ApiResponse.success(slots));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAvailability(@PathVariable Long id) {
        availabilityService.deleteAvailability(id);
        return ResponseEntity.ok(ApiResponse.success("Availability deleted", null));
    }
}
