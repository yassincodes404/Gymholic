package com.gymholic.payment;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.payment.dto.CreatePaymentRequest;
import com.gymholic.payment.dto.PaymentDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    public ResponseEntity<ApiResponse<PaymentDto>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request) {
        PaymentDto payment = paymentService.createPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Payment initiated", payment));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PaymentDto>> getPayment(@PathVariable Long id) {
        PaymentDto payment = paymentService.getPaymentById(id);
        return ResponseEntity.ok(ApiResponse.success(payment));
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<ApiResponse<List<PaymentDto>>> getBookingPayments(
            @PathVariable Long bookingId) {
        List<PaymentDto> payments = paymentService.getPaymentsByBooking(bookingId);
        return ResponseEntity.ok(ApiResponse.success(payments));
    }
}
