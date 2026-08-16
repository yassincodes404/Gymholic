package com.gymholic.payment;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.payment.dto.CreatePaymentRequest;
import com.gymholic.payment.dto.PaymentDto;
import com.gymholic.payment.dto.PaymentHistoryDto;
import com.gymholic.security.SecurityUtils;
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
    private final com.gymholic.user.UserRepository userRepository;
    private final com.gymholic.payment.provider.PaymentProviderConfigService providerConfigService;

    /**
     * The gateway the website checkout should use ("paymob", "mock" in dev,
     * or "none"). Public so the booking flow can pick the right payment UI.
     */
    @GetMapping("/active-provider")
    @org.springframework.security.access.prepost.PreAuthorize("permitAll()")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> activeProvider() {
        return ResponseEntity.ok(ApiResponse.success(
            java.util.Map.of("provider", providerConfigService.getActiveProvider())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PaymentDto>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request) {
        PaymentDto payment = paymentService.createPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Payment initiated", payment));
    }

    /** The signed-in user's own payment history (consultations). */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<PaymentHistoryDto>>> myPayments() {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) throw new IllegalStateException("Not authenticated");
        Long userId = userRepository.findByEmail(email)
            .orElseThrow(() -> new com.gymholic.common.exception.ResourceNotFoundException("User", "email", email))
            .getId();
        return ResponseEntity.ok(ApiResponse.success(paymentService.getMyPayments(userId)));
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
