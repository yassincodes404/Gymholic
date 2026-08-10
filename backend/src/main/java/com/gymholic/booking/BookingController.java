package com.gymholic.booking;

import com.gymholic.booking.dto.BookingDto;
import com.gymholic.booking.dto.CreateBookingRequest;
import com.gymholic.booking.dto.RescheduleBookingRequest;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<ApiResponse<BookingDto>> createBooking(
            @Valid @RequestBody CreateBookingRequest request) {
        String email = SecurityUtils.getCurrentUserEmail();
        BookingDto booking = bookingService.createBooking(email, request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Booking created", booking));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingDto>> getBooking(@PathVariable Long id) {
        BookingDto booking = bookingService.getBookingById(id);
        return ResponseEntity.ok(ApiResponse.success(booking));
    }

    @GetMapping("/client/{clientId}")
    public ResponseEntity<ApiResponse<Page<BookingDto>>> getClientBookings(
            @PathVariable Long clientId, Pageable pageable) {
        Page<BookingDto> bookings = bookingService.getBookingsByClient(clientId, pageable);
        return ResponseEntity.ok(ApiResponse.success(bookings));
    }

    @GetMapping("/trainer/{trainerId}")
    public ResponseEntity<ApiResponse<Page<BookingDto>>> getTrainerBookings(
            @PathVariable Long trainerId, Pageable pageable) {
        Page<BookingDto> bookings = bookingService.getBookingsByTrainer(trainerId, pageable);
        return ResponseEntity.ok(ApiResponse.success(bookings));
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<BookingDto>> confirmBooking(@PathVariable Long id) {
        BookingDto booking = bookingService.confirmBooking(id);
        return ResponseEntity.ok(ApiResponse.success("Booking confirmed", booking));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingDto>> cancelBooking(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        BookingDto booking = bookingService.cancelBooking(id, reason);
        return ResponseEntity.ok(ApiResponse.success("Booking cancelled", booking));
    }

    @PutMapping("/{id}/reschedule")
    public ResponseEntity<ApiResponse<BookingDto>> rescheduleBooking(
            @PathVariable Long id,
            @Valid @RequestBody RescheduleBookingRequest request) {
        BookingDto booking = bookingService.rescheduleBooking(id, request);
        return ResponseEntity.ok(ApiResponse.success("Booking rescheduled", booking));
    }
}
