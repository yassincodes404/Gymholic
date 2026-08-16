package com.gymholic.payment;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.payment.dto.PaymentDto;
import com.gymholic.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Dev-only endpoints for exercising the payment -> confirmation pipeline
 * without a real payment provider. Never active outside the dev profile.
 */
@RestController
@RequestMapping("/api/payments/mock")
@Profile("dev")
@RequiredArgsConstructor
public class DevPaymentController {

    private final PaymentService paymentService;

    @PostMapping("/{paymentId}/complete")
    public ResponseEntity<ApiResponse<PaymentDto>> completeMockPayment(@PathVariable Long paymentId) {
        String email = SecurityUtils.getCurrentUserEmail();
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        PaymentDto payment = paymentService.completeMockPayment(paymentId, email, isAdmin);
        return ResponseEntity.ok(ApiResponse.success("Test payment completed", payment));
    }
}
