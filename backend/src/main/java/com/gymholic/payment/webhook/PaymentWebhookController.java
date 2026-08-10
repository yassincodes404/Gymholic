package com.gymholic.payment.webhook;

import com.gymholic.booking.BookingService;
import com.gymholic.payment.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/payments/webhook")
@RequiredArgsConstructor
public class PaymentWebhookController {

    private final PaymentService paymentService;

    @PostMapping("/stripe")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        log.info("Received Stripe webhook");
        // TODO: Verify signature and process payment event
        return ResponseEntity.ok("OK");
    }

    @PostMapping("/paymob")
    public ResponseEntity<String> handlePaymobWebhook(
            @RequestParam(required = false) String hmac,
            @RequestBody String payload) {
        log.info("Received Paymob webhook");
        
        try {
            paymentService.handlePaymobWebhook(payload, hmac);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("Failed to process Paymob webhook", e);
            return ResponseEntity.badRequest().body("Webhook processing failed");
        }
    }
}
