package com.gymholic.availability;

import com.gymholic.availability.dto.AvailabilityDto;
import com.gymholic.availability.dto.AvailableSlotDto;
import com.gymholic.availability.dto.BookingTrainerDto;
import com.gymholic.availability.dto.CalendarDayDto;
import com.gymholic.availability.dto.CreateAvailabilityRequest;
import com.gymholic.common.exception.BadRequestException;
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
import java.time.YearMonth;
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
     * Resolves which expert the public booking flow should book against
     * (the owner of the current working hours), so clients never depend on a
     * hard-coded trainer id.
     */
    @GetMapping("/booking-trainer")
    public ResponseEntity<ApiResponse<BookingTrainerDto>> getBookingTrainer() {
        return ResponseEntity.ok(ApiResponse.success(availabilityService.resolveBookingTrainer()));
    }

    /**
     * Get available consultation slots for a trainer on a specific date.
     * Slots are returned in the client's timezone with full context.
     *
     * @param trainerId The trainer/expert ID
     * @param date The date to check (ISO format: yyyy-MM-dd)
     * @param clientTimezone Client's IANA timezone (e.g., "Asia/Dubai", "America/New_York")
     * @param service Optional service type ("FREE_SESSION") — default is the
     *                standard 45-minute grid, so omitted params keep the
     *                historical behaviour.
     * @return List of available slots with timezone information
     */
    @GetMapping("/trainer/{trainerId}/slots")
    public ResponseEntity<ApiResponse<List<AvailableSlotDto>>> getAvailableSlots(
            @PathVariable Long trainerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam @NotBlank(message = "Client timezone is required") String clientTimezone,
            @RequestParam(required = false) String service) {
        List<AvailableSlotDto> slots = availabilityService.getAvailableSlots(trainerId, date, clientTimezone, service);
        return ResponseEntity.ok(ApiResponse.success(slots));
    }

    /**
     * Month calendar for the booking UI: per-day status (past, closed,
     * fully-booked, available — plus "booked" for FREE_SESSION days already
     * taken), computed with the same slot logic as the per-day endpoint.
     */
    @GetMapping("/trainer/{trainerId}/calendar")
    public ResponseEntity<ApiResponse<List<CalendarDayDto>>> getMonthCalendar(
            @PathVariable Long trainerId,
            @RequestParam @NotBlank(message = "Month is required") String month,
            @RequestParam @NotBlank(message = "Client timezone is required") String clientTimezone,
            @RequestParam(required = false) String service) {
        YearMonth parsed;
        try {
            parsed = YearMonth.parse(month);
        } catch (Exception e) {
            throw new BadRequestException("Invalid month format — expected YYYY-MM");
        }
        return ResponseEntity.ok(ApiResponse.success(
            availabilityService.getMonthCalendar(trainerId, parsed, clientTimezone, service)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAvailability(@PathVariable Long id) {
        availabilityService.deleteAvailability(id);
        return ResponseEntity.ok(ApiResponse.success("Availability deleted", null));
    }
}
