package com.gymholic.availability;

import com.gymholic.availability.dto.AvailabilityDto;
import com.gymholic.availability.dto.AvailableSlotDto;
import com.gymholic.availability.dto.CreateAvailabilityRequest;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
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

    /**
     * Get available consultation slots for a trainer on a specific date.
     * Slots are returned in the client's timezone with full context.
     * 
     * @param trainerId The trainer/expert ID
     * @param date The date to check (ISO format: yyyy-MM-dd)
     * @param clientTimezone Client's IANA timezone (e.g., "Asia/Dubai", "America/New_York")
     * @return List of available slots with timezone information
     */
    @GetMapping("/trainer/{trainerId}/slots")
    public ResponseEntity<ApiResponse<List<AvailableSlotDto>>> getAvailableSlots(
            @PathVariable Long trainerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam @NotBlank(message = "Client timezone is required") String clientTimezone) {
        List<AvailableSlotDto> slots = availabilityService.getAvailableSlots(trainerId, date, clientTimezone);
        return ResponseEntity.ok(ApiResponse.success(slots));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAvailability(@PathVariable Long id) {
        availabilityService.deleteAvailability(id);
        return ResponseEntity.ok(ApiResponse.success("Availability deleted", null));
    }
}
