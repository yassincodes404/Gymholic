package com.gymholic.booking;

import com.gymholic.availability.AvailabilityService;
import com.gymholic.availability.dto.AvailableSlotDto;
import com.gymholic.booking.dto.BookingDto;
import com.gymholic.booking.dto.CreateBookingRequest;
import com.gymholic.booking.dto.NoShowRequest;
import com.gymholic.booking.dto.RescheduleBookingRequest;
import com.gymholic.booking.dto.RescheduleLinkSummaryDto;
import com.gymholic.common.response.ApiResponse;
import com.gymholic.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final AvailabilityService availabilityService;

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

    /** Admin action: close a confirmed session as delivered/ended. */
    @PutMapping("/{id}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BookingDto>> completeSession(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
            "Session marked as completed", bookingService.completeSession(id)));
    }

    /**
     * Admin action: decline a pending booking. The client is emailed the
     * reason; any captured payment is refunded manually when appropriate.
     */
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BookingDto>> rejectBooking(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> request) {
        String reason = request != null ? request.get("reason") : null;
        BookingDto booking = bookingService.rejectBooking(id, reason);
        return ResponseEntity.ok(ApiResponse.success(
            "Booking rejected — the client has been notified", booking));
    }

    /**
     * Marks a session as a no-show (admin action). Emails the client a
     * one-time reschedule link — or a refund/rebook offer when the expert
     * missed the session too.
     */
    @PutMapping("/{id}/no-show")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BookingDto>> markNoShow(
            @PathVariable Long id,
            @RequestBody(required = false) NoShowRequest request) {
        boolean expertAttended = request == null || request.isExpertAttended();
        String note = request != null ? request.getNote() : null;
        BookingDto booking = bookingService.markNoShow(id, expertAttended, note);
        return ResponseEntity.ok(ApiResponse.success(
            "Marked as no-show — the client has been emailed a reschedule link", booking));
    }

    // ---- Public, token-protected client reschedule (from the emailed link) ----

    @GetMapping("/reschedule/{token}")
    @PreAuthorize("permitAll()")
    public ResponseEntity<ApiResponse<RescheduleLinkSummaryDto>> getRescheduleLink(
            @PathVariable String token) {
        return ResponseEntity.ok(ApiResponse.success(bookingService.getRescheduleLink(token)));
    }

    @GetMapping("/reschedule/{token}/slots")
    @PreAuthorize("permitAll()")
    public ResponseEntity<ApiResponse<List<AvailableSlotDto>>> getRescheduleSlots(
            @PathVariable String token,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String timezone) {
        RescheduleLinkSummaryDto summary = bookingService.getRescheduleLink(token);
        String clientTimezone = (timezone == null || timezone.isBlank())
            ? summary.getClientTimezone() : timezone;
        List<AvailableSlotDto> slots = availabilityService.getAvailableSlots(
            bookingService.getTrainerIdForRescheduleToken(token), date, clientTimezone);
        return ResponseEntity.ok(ApiResponse.success(slots));
    }

    @PutMapping("/reschedule/{token}")
    @PreAuthorize("permitAll()")
    public ResponseEntity<ApiResponse<BookingDto>> rescheduleByToken(
            @PathVariable String token,
            @Valid @RequestBody RescheduleBookingRequest request) {
        BookingDto booking = bookingService.rescheduleByToken(token, request);
        return ResponseEntity.ok(ApiResponse.success("Your new time is confirmed", booking));
    }
}
