package com.gymholic.order;

import com.gymholic.common.response.ApiResponse;
import com.gymholic.order.dto.OrderCheckoutDto;
import com.gymholic.order.dto.OrderDto;
import com.gymholic.payment.PaymentService;
import com.gymholic.payment.dto.PaymentDto;
import com.gymholic.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final PaymentService paymentService;

    /** Checks out the signed-in user's cart into a paid order (test payment mode). */
    @PostMapping
    public ResponseEntity<ApiResponse<OrderDto>> checkout() {
        OrderDto order = orderService.checkout(requireEmail());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Order completed", order));
    }

    /**
     * Real-gateway checkout: creates a PENDING order from the cart and
     * starts a payment intention for it (Paymob embedded checkout). The
     * HMAC-verified webhook flips the order to PAID and runs fulfilment.
     */
    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderCheckoutDto>> checkoutWithProvider(
            @RequestBody ProviderRequest request) {
        String provider = request != null && request.getProvider() != null ? request.getProvider() : "paymob";
        OrderDto order = orderService.createPendingOrder(requireEmail(), provider);
        PaymentDto payment = paymentService.createPayment(com.gymholic.payment.dto.CreatePaymentRequest.builder()
            .orderId(order.getId())
            .provider(provider)
            .build());
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Checkout started", OrderCheckoutDto.builder()
                .orderId(order.getId())
                .paymentId(payment.getId())
                .checkoutUrl(payment.getCheckoutUrl())
                .provider(provider)
                .status(payment.getStatus().name())
                .payableAmount(payment.getPayableAmount())
                .payableCurrency(payment.getPayableCurrency())
                .build()));
    }

    /** The signed-in user's product purchase history (courses, PDFs, physical goods). */
    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderDto>>> myOrders() {
        return ResponseEntity.ok(ApiResponse.success(orderService.getMyOrders(requireEmail())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderDto>> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
            orderService.getOrder(id, requireEmail(), SecurityUtils.hasRole("ADMIN"))));
    }

    private String requireEmail() {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) throw new IllegalStateException("Not authenticated");
        return email;
    }

    /** Tiny request body for POST /orders/checkout. */
    public static class ProviderRequest {
        private String provider;

        public String getProvider() {
            return provider;
        }

        public void setProvider(String provider) {
            this.provider = provider;
        }
    }
}
